<script setup lang="ts">
/**
 * Component for showing AI-generated results related to the current tools search query, such as suggested tools based on the query.
 *
 * WIP:
 * - Needs to not fetch at all if the query is weird (has ANY filter?), or too short even etc.
 * - These results need to be cached per query or something otherwise these would pile up.
 * - Maybe no need to emit tool IDs, somehow just show tools within here by just using `ChatMessageCell`?
 */

import { faFilter, faMagic } from "@fortawesome/free-solid-svg-icons";
import { ref, watch } from "vue";

import { GalaxyApi } from "@/api";
import { useMarkdown } from "@/composables/markdown";

import GCard from "../Common/GCard.vue";
import LoadingSpan from "../LoadingSpan.vue";

interface Props {
    query: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: "apply-ai-suggestions", toolIds: string[]): void;
}>();

const aiResults = ref<string | null>(null);
const aiLoading = ref(false);
const aiResultsExpanded = ref(false);
const aiToolIdSuggestions = ref<string[] | null>(null);
const { renderMarkdown } = useMarkdown({ openLinksInNewPage: true, removeNewlinesAfterList: true });

async function fetchAiResults(query: string) {
    aiResults.value = null;
    aiLoading.value = true;
    aiResultsExpanded.value = false;
    aiToolIdSuggestions.value = null;

    const { data: aiData } = await GalaxyApi().POST("/api/chat", {
        params: { query: { agent_type: "tool_recommendation" } },
        body: { query, context: null, exchange_id: null, entity_context: null },
    });

    aiLoading.value = false;
    aiResults.value = aiData?.response ?? null;
    const agentResponse = aiData?.agent_response;
    if (agentResponse?.suggestions) {
        aiToolIdSuggestions.value = agentResponse.suggestions
            .filter((suggestion: any) => suggestion.action_type === "tool_run")
            .map((suggestion: any) => {
                const toolId = suggestion.parameters?.tool_id;
                return typeof toolId === "string" ? toolId : null;
            })
            .filter((toolId: string | null): toolId is string => toolId !== null);
    }
}

function applyAiToolIdSuggestions() {
    if (aiToolIdSuggestions.value && aiToolIdSuggestions.value.length > 0) {
        emit("apply-ai-suggestions", aiToolIdSuggestions.value);
    }
}

watch(
    () => props.query,
    (newQuery) => {
        if (newQuery) {
            fetchAiResults(newQuery);
        }
    },
    { immediate: true },
);
</script>

<template>
    <!-- eslint-disable vue/no-v-html -->
    <GCard
        v-if="aiResults || aiLoading"
        current
        title="Galaxy AI Results"
        :title-icon="{ icon: faMagic }"
        :primary-actions="
            aiToolIdSuggestions?.length
                ? [
                      {
                          id: 'filter-by-ai-results',
                          label: 'Filter by AI-suggested tools',
                          title: 'Show only tools suggested by the AI',
                          icon: faFilter,
                          handler: applyAiToolIdSuggestions,
                      },
                  ]
                : []
        ">
        <template v-slot:description>
            <LoadingSpan v-if="aiLoading" message="Generating AI suggestions" />
            <template v-else-if="aiResults">
                <div
                    class="response-content"
                    :class="{ 'response-collapsed': !aiResultsExpanded }"
                    v-html="renderMarkdown(aiResults)" />
            </template>
        </template>
        <template v-slot:update-time>
            <button class="response-toggle-btn" @click="aiResultsExpanded = !aiResultsExpanded">
                {{ aiResultsExpanded ? "Show less" : "Show more" }}
            </button>
        </template>
    </GCard>
</template>

<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";

.response-content {
    overflow: hidden;

    &.response-collapsed {
        max-height: 8rem;
        position: relative;

        &::after {
            background: linear-gradient(to bottom, transparent, $brand-light);
            bottom: 0;
            content: "";
            height: 2.5rem;
            left: 0;
            pointer-events: none;
            position: absolute;
            right: 0;
        }
    }
}

.response-toggle-btn {
    background: none;
    border: none;
    color: var(--color-blue-600);
    cursor: pointer;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    padding: 0;

    &:hover {
        text-decoration: underline;
    }
}
</style>
