<script setup lang="ts">
interface Props {
    title: string;
    goToAllTitle?: string | string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: "goToAll", index?: number): void;
}>();
</script>

<template>
    <div class="activity-panel" :data-description="props.title" aria-labelledby="activity-panel-heading">
        <div class="activity-panel-header">
            <nav unselectable="on" class="activity-panel-header-top">
                <h2 id="activity-panel-heading" v-localize class="activity-panel-heading h-sm">{{ props.title }}</h2>

                <slot name="header-buttons" />
            </nav>

            <slot name="header" class="activity-panel-header-description" />
        </div>

        <div class="activity-panel-body">
            <slot />
        </div>

        <BButton
            v-if="props.goToAllTitle && !Array.isArray(props.goToAllTitle)"
            class="activity-panel-footer"
            variant="primary"
            :data-description="`props.mainButtonText button`"
            @click="emit('goToAll')">
            {{ props.goToAllTitle }}
        </BButton>
        <BButtonGroup v-else-if="props.goToAllTitle" class="activity-panel-footer">
            <BButton
                v-for="(goToTitle, index) in props.goToAllTitle"
                :key="index"
                variant="primary"
                :data-description="`props.mainButtonText button ${index}`"
                @click="emit('goToAll', index)">
                {{ goToTitle }}
            </BButton>
        </BButtonGroup>
    </div>
</template>

<style lang="scss" scoped>
@import "theme/blue.scss";

.activity-panel {
    height: 100%;
    display: flex;
    flex-flow: column;
    background-color: $brand-light;

    .activity-panel-header {
        padding-bottom: 0.5rem;
        padding-left: 1rem;
        padding-right: 1rem;

        .activity-panel-header-top {
            height: 2.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;

            .activity-panel-heading {
                margin: 0 !important;
            }
        }
    }

    .activity-panel-body {
        flex-grow: 1;
        height: 100%;
        overflow-y: auto;
    }

    .activity-panel-footer {
        margin-top: 0.5rem;

        .btn {
            width: 100%;
        }
    }
}
</style>
