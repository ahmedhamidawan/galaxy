/*
    galaxy upload utilities - requires FormData and XMLHttpRequest
*/

import axios from "axios";
import { getAppRoot } from "onload/loadConfig";
import * as tus from "tus-js-client";

import { uploadPayload } from "@/utils/uploadpayload.js";

function buildFingerprint(cnf) {
    return async (file) => {
        return ["tus-br", file.name, file.type, file.size, file.lastModified, cnf.data.history_id].join("-");
    };
}

function submitPayload(payload, cnf) {
    axios
        .post(`${getAppRoot()}api/tools/fetch`, payload)
        .then((response) => {
            cnf.success(response.data);
        })
        .catch((error) => {
            cnf.error(error.response?.data.err_msg || "Request failed.");
        });
}

function tusUpload(uploadables, index, data, tusEndpoint, cnf) {
    // uploadables must be an array of files or blobs with a name property
    const startTime = performance.now();
    const chunkSize = cnf.chunkSize;
    const uploadable = uploadables[index];
    if (!uploadable) {
        // We've uploaded all files or blobs; delete files from data and submit fetch payload
        delete data["files"];
        return submitPayload(data, cnf);
    }
    console.debug(`Starting chunked upload for ${uploadable.name} [chunkSize=${chunkSize}].`);
    const upload = new tus.Upload(uploadable, {
        endpoint: tusEndpoint,
        retryDelays: [0, 3000, 10000],
        fingerprint: buildFingerprint(cnf),
        chunkSize: chunkSize,
        metadata: data.payload,
        onError: function (err) {
            const status = err.originalResponse?.getStatus();
            if (status == 403) {
                console.error(`Failed because of missing authorization: ${err}`);
                cnf.error(err);
            } else {
                // 🎵 Never gonna give you up 🎵
                console.log(`Failed because: ${err}\n, will retry in 10 seconds`);
                setTimeout(() => tusUploadStart(upload), 10000);
            }
        },
        onChunkComplete: function (chunkSize, bytesAccepted, bytesTotal) {
            const percentage = ((bytesAccepted / bytesTotal) * 100).toFixed(2);
            console.log(bytesAccepted, bytesTotal, percentage + "%");
            cnf.progress(Math.round(percentage));
        },
        onSuccess: function () {
            console.log(
                `Upload of ${uploadable.name} to ${upload.url} took ${(performance.now() - startTime) / 1000} seconds`
            );
            data[`files_${index}|file_data`] = {
                session_id: upload.url.split("/").at(-1),
                name: uploadable.name,
            };
            tusUpload(uploadables, index + 1, data, tusEndpoint, cnf);
        },
    });
    tusUploadStart(upload);
}

function tusUploadStart(upload) {
    // Check if there are any previous uploads to continue.
    upload.findPreviousUploads().then(function (previousUploads) {
        // Found previous uploads so we select the first one.
        if (previousUploads.length) {
            console.log("previous Upload", previousUploads);
            upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        // Start the upload
        upload.start();
    });
}

// Posts chunked files to the API.
export function submitUpload(config) {
    // set options
    const cnf = {
        data: {},
        success: () => {},
        error: () => {},
        warning: () => {},
        progress: () => {},
        attempts: 70000,
        timeout: 5000,
        error_file: "File not provided.",
        error_attempt: "Maximum number of attempts reached.",
        error_tool: "Tool submission failed.",
        chunkSize: 10485760,
        isComposite: false,
        ...config,
    };
    // initial validation
    var data = cnf.data;
    if (data.error_message) {
        cnf.error(data.error_message);
        return;
    }
    // execute upload
    const tusEndpoint = `${getAppRoot()}api/upload/resumable_upload/`;
    if (data.files.length || cnf.isComposite) {
        return tusUpload(data.files, 0, data, tusEndpoint, cnf);
    } else {
        if (data.targets.length && data.targets[0].elements.length) {
            const pasted = data.targets[0].elements[0];
            if (pasted.src == "url") {
                return submitPayload(data, cnf);
            } else {
                const blob = new Blob([pasted.paste_content]);
                blob.name = data.targets[0].elements[0].name || "default";
                return tusUpload([blob], 0, data, tusEndpoint, cnf);
            }
        }
    }
}

export class UploadQueue {
    constructor(options) {
        this.opts = {
            announce: (d) => {},
            get: (d) => {},
            progress: (d, m) => {},
            success: (d, m) => {},
            warning: (d, m) => {},
            error: (d, m) => {
                alert(m);
            },
            complete: () => {},
            multiple: true,
            ...options,
        };
        this.queue = new Map(); // items stored by key (referred to as index)
        this.nextIndex = 0;
        this.fileSet = new Set(); // Used for fast duplicate checking
        this.isRunning = false;
        this.isPaused = false;
    }

    // Add new files to upload queue
    add(files) {
        if (files && files.length && !this.isRunning) {
            files.forEach((file) => {
                const fileSetKey = file.name + file.size; // Concat name and size to create a "file signature".
                if (file.mode === "new" || !this.fileSet.has(fileSetKey)) {
                    this.fileSet.add(fileSetKey);
                    const index = String(this.nextIndex++);
                    this.queue.set(index, file);
                    this.opts.announce(index, file);
                }
            });
        }
    }

    // Set options
    configure(options) {
        this.opts = Object.assign(this.opts, options);
        return this.opts;
    }

    // Remove file from queue and file set by index
    remove(index) {
        const file = this.queue.get(index);
        const fileSetKey = file.name + file.size;
        this.queue.delete(index) && this.fileSet.delete(fileSetKey);
    }

    // Remove all entries from queue
    reset() {
        this.queue.clear();
        this.fileSet.clear();
    }

    // Returns queue size
    get size() {
        return this.queue.size;
    }

    // Initiate upload process
    start(ftpBatch = false) {
        if (ftpBatch) {
            // package ftp files separately, and remove them from queue
            const list = [];
            Object.entries(this.queue).forEach(([key, model]) => {
                if (model.status === "queued" && model.fileMode === "ftp") {
                    this.queue.remove(model.id);
                    list.push(this.opts.get(key));
                }
            });
            if (list.length > 0) {
                const data = uploadPayload(list, this.opts.historyId);
                axios
                    .post(`${getAppRoot()}api/tools/fetch`, data)
                    .then((message) => {
                        list.forEach((model) => {
                            this.opts.success(model.id, message);
                        });
                    })
                    .catch((message) => {
                        list.forEach((model) => {
                            this.opts.error(model.id, message);
                        });
                    });
            }
        }
        if (!this.isRunning) {
            this.isRunning = true;
            this._process();
        }
    }

    // Pause upload process
    stop() {
        this.isPaused = true;
    }

    // Process an upload, recursive
    _process() {
        if (this.size === 0 || this.isPaused) {
            this.isRunning = false;
            this.isPaused = false;
            this.opts.complete();
            return;
        } else {
            this.isRunning = true;
        }
        // Return index to first item in queue (in FIFO order).
        const index = this.queue.keys().next().value;
        // Collect upload request data
        const data = uploadPayload([this.opts.get(index)], this.opts.historyId);
        // Remove item from queue
        this.remove(index);
        // Submit request data
        submitUpload({
            data: data,
            success: (message) => {
                this.opts.success(index, message);
                this._process();
            },
            warning: (message) => {
                this.opts.warning(index, message);
            },
            error: (message) => {
                this.opts.error(index, message);
                this._process();
            },
            progress: (percentage) => {
                this.opts.progress(index, percentage);
            },
        });
    }
}
