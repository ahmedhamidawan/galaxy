<script setup lang="ts">
import axios from "axios";
import { BTable } from "bootstrap-vue";
import { computed, onMounted, ref } from "vue";

import { getAppRoot } from "@/onload/loadConfig";

import SwitchToHistoryLink from "../History/SwitchToHistoryLink.vue";
import UtcDate from "../UtcDate.vue";

const jobs = ref<any[]>([]);

const jobCount = computed(() => jobs.value.length);

const fields = [
    { key: "id" },
    { key: "history_id" },
    { key: "state" },
    { key: "create_time", label: "Created" },
    { key: "update_time", label: "Updated" },
    { key: "invocation_id" },
];

onMounted(async () => {
    const path = `${getAppRoot()}api/jobs?view=list`;
    try {
        const response = await axios.get(path);
        console.log(`${response.data.length} jobs loaded.`);
        jobs.value = response.data;
    } catch (error) {
        console.error(error);
    }
});

function rowClass(row: any) {
    return row.state === "error" ? "table-danger" : "";
}
</script>

<template>
    <div>
        <h1>Jobs</h1>
        <p>{{ jobCount }} jobs loaded.</p>

        <BTable striped :items="jobs" :fields="fields" :tbody-tr-class="rowClass">
            <template v-slot:cell(id)="data">
                <router-link :to="`/jobs/${data.value}/view`">{{ data.value }}</router-link>
            </template>
            <template v-slot:cell(history_id)="data">
                <SwitchToHistoryLink :history-id="data.value" />
            </template>
            <template v-slot:cell(create_time)="data">
                <UtcDate :date="data.value" mode="elapsed" />
            </template>
            <template v-slot:cell(update_time)="data">
                {{ new Date(data.value).toLocaleString() }}
            </template>
            <template v-slot:cell(invocation_id)="data">
                <router-link :to="`/workflows/invocations/${data.value}`">{{ data.value }}</router-link>
            </template>
        </BTable>
    </div>
</template>
