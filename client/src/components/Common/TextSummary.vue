<script setup lang="ts">
import { library } from "@fortawesome/fontawesome-svg-core";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";

const props = defineProps({
    /** The text to summarize */
    description: {
        type: String,
        required: true,
    },
    /** If `true`, doesn't let unexpanded text go beyond height of one line */
    oneLineSummary: {
        type: Boolean,
        default: false,
    },
    /** If `true`, doesn't show expand/collapse buttons */
    noExpand: {
        type: Boolean,
        default: false,
    },
    /** The component to use for the summary, default = `<p>` */
    component: {
        type: String,
        default: "p",
    },
    /** Used as the toggle for expanding summary */
    showDetails: {
        type: Boolean,
        default: false,
    },
    /** The maximum length of the unexpanded text / summary */
    maxLength: {
        type: Number,
        default: 150,
    },
});

const emit = defineEmits<{
    (e: "update:show-details", showDetails: boolean): void;
}>();

const propShowDetails = computed({
    get: () => {
        return props.showDetails;
    },
    set: (val) => {
        emit("update:show-details", val);
    },
});

library.add(faChevronUp, faChevronDown);
const collapsedEnableIcon = "fas fa-chevron-down";
const collapsedDisableIcon = "fas fa-chevron-up";

// summarized length
const x = Math.round(props.maxLength - props.maxLength / 2);

const summary = computed(() => props.description.length > props.maxLength);
const text = computed(() =>
    props.description.length > props.maxLength ? props.description.slice(0, x) : props.description
);
</script>

<template>
    <div>
        <component :is="props.component" v-if="props.oneLineSummary" class="one-line-summary">{{
            props.description
        }}</component>
        <span v-else>{{ text }}</span>
        <span v-if="!noExpand && summary">
            <a
                v-if="!propShowDetails"
                class="text-summary-expand"
                href="javascript:void(0)"
                @click.stop="propShowDetails = true">
                ... <FontAwesomeIcon :icon="collapsedEnableIcon" />
            </a>
            <a v-else href="javascript:void(0)" @click.stop="propShowDetails = false">
                ... <FontAwesomeIcon :icon="collapsedDisableIcon" />
            </a>
        </span>
    </div>
</template>

<style scoped>
.one-line-summary {
    max-height: 2em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
