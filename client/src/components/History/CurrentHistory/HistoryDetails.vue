<template>
    <DetailsLayout
        :name="history.name"
        :annotation="history.annotation"
        :tags="history.tags"
        :writeable="writeable"
        :summarized="summarized"
        :update-time="history.update_time"
        @save="onSave">
        <template v-slot:name>
            <!-- eslint-disable-next-line vuejs-accessibility/heading-has-content -->
            <h3 v-if="!summarized" v-short="history.name || 'History'" data-description="name display" class="my-2" />
            <TextSummary
                v-else
                :description="history.name"
                data-description="name display"
                class="my-2"
                component="h3"
                one-line-summary
                no-expand />
        </template>
        <template v-if="summarized" v-slot:update-time>
            <b-badge v-b-tooltip pill>
                <span v-localize>last edited </span>
                <UtcDate v-if="history.update_time" :date="history.update_time" mode="elapsed" />
            </b-badge>
        </template>
    </DetailsLayout>
</template>

<script>
import { mapActions } from "pinia";

import short from "@/components/plugins/short.js";
import { useHistoryStore } from "@/stores/historyStore";

import TextSummary from "@/components/Common/TextSummary.vue";
import DetailsLayout from "@/components/History/Layout/DetailsLayout.vue";
import UtcDate from "@/components/UtcDate.vue";

export default {
    components: {
        DetailsLayout,
        TextSummary,
        UtcDate,
    },
    directives: {
        short,
    },
    props: {
        history: { type: Object, required: true },
        writeable: { type: Boolean, default: true },
        summarized: { type: Boolean, default: false },
    },
    methods: {
        ...mapActions(useHistoryStore, ["updateHistory"]),
        onSave(newDetails) {
            const id = this.history.id;
            this.updateHistory({ ...newDetails, id });
        },
    },
};
</script>
