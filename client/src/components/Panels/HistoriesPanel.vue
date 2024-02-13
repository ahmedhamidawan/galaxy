<script setup lang="ts">
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPlus, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router/composables";

import { HistoriesFilters } from "@/components/History/HistoriesFilters";
import { useHistoryStore } from "@/stores/historyStore";
import { useUserStore } from "@/stores/userStore";
import { withPrefix } from "@/utils/redirect";

import FilterMenu from "@/components/Common/FilterMenu.vue";
import HistoryList from "@/components/History/HistoryScrollList.vue";
import ActivityPanel from "@/components/Panels/ActivityPanel.vue";

const router = useRouter();

// @ts-ignore bad library types
library.add(faPlus, faUpload);

const filter = ref("");
const showAdvanced = ref(false);
const loading = ref(false);

const isAnonymous = computed(() => useUserStore().isAnonymous);
const historyStore = useHistoryStore();
const { historiesLoading } = storeToRefs(historyStore);

function setFilter(newFilter: string, newValue: string) {
    filter.value = HistoriesFilters.setFilterValue(filter.value, newFilter, newValue);
}

function userTitle(title: string) {
    if (isAnonymous.value == true) {
        return `Log in to ${title}`;
    } else {
        return title;
    }
}
</script>

<template>
    <ActivityPanel title="Histories" go-to-all-title="All histories" @goToAll="router.push('/histories/list')">
        <template v-slot:header-buttons>
            <BButtonGroup>
                <BButton
                    v-b-tooltip.bottom.hover
                    data-description="create new history from histories panel"
                    size="sm"
                    variant="link"
                    :title="userTitle('Create new history')"
                    :disabled="isAnonymous"
                    @click="historyStore.createNewHistory()">
                    <FontAwesomeIcon :icon="faPlus" fixed-width />
                </BButton>
                <BButton
                    v-b-tooltip.bottom.hover
                    data-description="import new history from histories panel"
                    size="sm"
                    variant="link"
                    :title="userTitle('Import history')"
                    :disabled="isAnonymous"
                    @click="router.push('/histories/import')">
                    <FontAwesomeIcon :icon="faUpload" fixed-width />
                </BButton>
            </BButtonGroup>
        </template>

        <template v-slot:header>
            <FilterMenu
                name="Histories"
                placeholder="search histories"
                :filter-class="HistoriesFilters"
                :filter-text.sync="filter"
                :loading="historiesLoading || loading"
                :show-advanced.sync="showAdvanced" />
        </template>

        <div v-if="isAnonymous">
            <b-badge class="alert-info w-100 mx-2">
                Please <a :href="withPrefix('/login')">log in or register</a> to create multiple histories.
            </b-badge>
        </div>

        <HistoryList v-show="!showAdvanced" in-panel :filter="filter" :loading.sync="loading" :additional-options="['center', 'multi']" @setFilter="setFilter" />
    </ActivityPanel>
</template>
