<script setup lang="ts">
import axios, { type AxiosError } from "axios";
import { computed, ref, watch } from "vue";

import { fromSimple } from "@/components/Workflow/Editor/modules/model";
import { useDatatypesMapper } from "@/composables/datatypesMapper";
import { provideScopedWorkflowStores } from "@/composables/workflowStores";
import type { Workflow } from "@/stores/workflowStore";
import { withPrefix } from "@/utils/redirect";

import LoadingSpan from "@/components/LoadingSpan.vue";
import WorkflowGraph from "@/components/Workflow/Editor/WorkflowGraph.vue";

const TERMINAL_JOB_STATES = ["ok", "error", "deleted", "paused"];

type Outputs = {
    [key: string]: {
        id: string;
        src: "hda" | "ldda" | "hdca" | "hdas" | "lddas" | "hdcas" | "dataset" | "dataset_collection";
        uuid: string;
    };
};

type WfOutputs = {
    extensions: string[];
    name: string;
    optional: boolean;
    collection?: boolean;
    collection_type?: string;
    type?: string;
}[];

type InputConnection = {
    id: number;
    output_name: string;
    input_type: string;
};

type Step = {
    id: number;
    name: string;
    position: {
        left: number;
        top: number;
    };
    inputs: unknown[];
    input_connections: Record<string, InputConnection[]>;
    outputs: WfOutputs;
    state: string;
    jobs: unknown[];
    type: string;
    label: string;
};

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    invocation: {
        type: Object,
        required: true,
    },
    zoom: {
        type: Number,
        default: 0.75,
    },
    showMinimap: {
        type: Boolean,
        default: true,
    },
    showZoomControls: {
        type: Boolean,
        default: true,
    },
    initialX: {
        type: Number,
        default: -20,
    },
    initialY: {
        type: Number,
        default: -20,
    },
});

const workflow = ref<Workflow | null>(null);

const loading = ref(true);
const errored = ref(false);
const errorMessage = ref("");
const steps = ref<Record<string, Step>>({});

const { datatypesMapper } = useDatatypesMapper();

const storeId = computed(() => `invocation-${props.invocation.id}`);

const { stateStore } = provideScopedWorkflowStores(storeId);

watch(
    () => props.zoom,
    () => stateStore.setScale(props.zoom),
    { immediate: true }
);

watch(
    () => props.id,
    async (id: string) => {
        loading.value = true;
        errored.value = false;
        errorMessage.value = "";

        try {
            const { data: fullWorkflow } = await axios.get(withPrefix(`/workflow/load_workflow?_=true&id=${id}`));
            workflow.value = fullWorkflow;

            // console.log("WORKFLOW", fullWorkflow.steps);

            const originalSteps = { ...fullWorkflow.steps } as Record<string, Step>;
            console.log("ORIGINAL", originalSteps);

            /** a mapping from an original WF step index to a graph step index
             * and a list of children graph step indices
             */
            const wfStepToGraphStep: Record<number, { newIndex: number, children: number[] }> = {};

            let counter = 0;
            for (let i = 0; i < Object.keys(originalSteps).length; i++) {
                const currOriginalWfStep = originalSteps[i];

                /** a step in the graph that is a WF step (not an INV output) */
                const currWfGraphStepIndex = counter;
                wfStepToGraphStep[i] = { newIndex: currWfGraphStepIndex, children: [] };

                console.log("awan curr", currOriginalWfStep?.name, i);

                const wfStepInputConnections = currOriginalWfStep?.input_connections;
                // update input connections to correspond to new graph step index
                if (wfStepInputConnections) {
                    Object.entries(wfStepInputConnections).forEach(([inputName, outputArray]) => {
                        if (outputArray === undefined) {
                            return;
                        }
                        if (!Array.isArray(outputArray)) {
                            outputArray = [outputArray];
                        }

                        console.log("awan be4", JSON.stringify(outputArray));

                        const updatedOutputs: any[] = [];
                        outputArray.forEach((output: any) => {
                            // output.id = wfStepToGraphStep[output.id]?.newIndex;
                            const copiedOutput = { ...output };
                            const changedIds = wfStepToGraphStep[output.id]?.children || [];
                            changedIds.forEach((id) => {
                                updatedOutputs.push({
                                    ...copiedOutput,
                                    id: id,
                                });
                            });
                        });
                        outputArray = updatedOutputs;
                        wfStepInputConnections[inputName] = outputArray;

                        console.log("awan atr", JSON.stringify(outputArray));

                    });
                }
                console.log("awan curr_ic", JSON.stringify(wfStepInputConnections));

                const left = i * 300;
                // create graph step that is the current original workflow step
                const currWfStep = Object.freeze({
                    ...currOriginalWfStep,
                    id: currWfGraphStepIndex,
                    position: {
                        left: left,
                        top: 0,
                    },
                    label: `Step ${i+1}: ${currOriginalWfStep?.name}`,
                }) as Step;
                steps.value[`${counter}`] = currWfStep;
                counter++;

                if (props.invocation.steps[i]) {
                    /** There is an invocation step for this workflow step */

                    // get full invocation step
                    const { data: invocationStep } = await axios.get(withPrefix(`/api/invocations/any/steps/${props.invocation.steps[i].id}`));
                    console.log("BEFORE", invocationStep);

                    if (["scheduled", "cancelled", "failed"].includes(invocationStep.state) && invocationStep.jobs.every((job: any) => TERMINAL_JOB_STATES.includes(job.state))) {
                        invocationStep.state = "terminal";
                    }

                    currOriginalWfStep?.outputs.forEach((output, outputIndex) => {
                        let currInvOutput;
                        if (output.collection) {
                            currInvOutput = invocationStep.output_collections[output.name];
                        } else {
                            currInvOutput = invocationStep.outputs[output.name];
                        }
                        // const currInvOutput = invocationStep.outputs[output.name];

                        // if (output.optional) // TODO: deal with this case

                        console.log("maybe here: ", output, invocationStep);
                        if (currInvOutput) {
                            // copy an original wf step and replace its data with the
                            // current step's invocation output(s)
                            const copiedWfStep: Step = { ...currWfStep };
                            copiedWfStep.id = counter;
                            wfStepToGraphStep[i]?.children.push(counter);
                            copiedWfStep.position = {
                                left: left,
                                top: (outputIndex + 1) * 300,
                            };
                            copiedWfStep.name = currInvOutput.id;
                            copiedWfStep.label = "Output File"; // TODO: output ds/dsc etc.
                            copiedWfStep.type = "history_item";

                            copiedWfStep.input_connections = {};
                            copiedWfStep.input_connections[`input${outputIndex+1}`] = [{
                                id: currWfStep.id, // should correspond to input
                                output_name: output.name,
                                input_type: currInvOutput.src === "hda" ? "dataset" : "dataset_collection",
                            }];

                            console.log("curr", copiedWfStep.name, outputIndex);
                            console.log("curr_ic", copiedWfStep.input_connections);

                            copiedWfStep.outputs = currOriginalWfStep?.outputs || [];
                            copiedWfStep.inputs = [{
                                extensions: ["input"],
                                input_type: currInvOutput.src === "hda" ? "dataset" : "dataset_collection",
                                label: currInvOutput.src === "hda" ? "Dataset" : "Dataset Collection",
                                multiple: false, // TODO
                                name: `input${outputIndex+1}`,
                            }];

                            steps.value[`${counter}`] = copiedWfStep;
                            counter++;
                        }
                    });

                } else {
                    /** There is no invocation step for this workflow step,
                     * so create an errored step
                     */

                    console.log("I think we done...", currWfStep);
                }

                
            }

            const fullInvocation = {
                steps: steps.value as any,
                comments: [],
            };
            await fromSimple(storeId.value, fullInvocation);

            console.log("awan AFTER", steps.value);
        } catch (e) {
            const error = e as AxiosError<{ err_msg?: string }>;
            console.error(e);

            if (error.response?.data.err_msg) {
                errorMessage.value = error.response.data.err_msg;
            } else {
                errorMessage.value = e as string;
            }

            errored.value = true;
        } finally {
            loading.value = false;
        }
    },
    {
        immediate: true,
    }
);

const initialPosition = computed(() => ({
    x: -props.initialX * props.zoom,
    y: -props.initialY * props.zoom,
}));
</script>

<template>
    <div id="center" class="container-root m-3 w-100 overflow-auto d-flex flex-column">
        <b-alert v-if="loading" show variant="info">
            <LoadingSpan message="Loading Invocation Graph" />
        </b-alert>
        <div v-else-if="errored">
            <b-alert v-if="errorMessage" show variant="danger">
                {{ errorMessage }}
            </b-alert>
            <b-alert v-else show variant="danger"> Unknown Error </b-alert>
        </div>
        <div v-else-if="workflow && datatypesMapper" class="workflow-invocation">
            <div class="workflow-preview d-flex flex-column">
                <b-card class="workflow-card">
                    <WorkflowGraph
                        :steps="steps"
                        :datatypes-mapper="datatypesMapper"
                        :initial-position="initialPosition"
                        :show-minimap="props.showMinimap"
                        :show-zoom-controls="props.showZoomControls"
                        invocation
                        readonly />
                </b-card>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
@import "theme/blue.scss";

.container-root {
    container-type: inline-size;
}

.workflow-invocation {
    display: flex;
    flex-grow: 1;
    gap: 1rem;
    height: 100%;

    .workflow-preview {
        flex-grow: 1;

        .workflow-card {
            flex-grow: 1;
        }
    }
}

@container (max-width: 900px) {
    .workflow-invocation {
        flex-direction: column;
        height: unset;

        .workflow-preview {
            height: 450px;
        }
    }
}
</style>
