<script setup lang="ts">
import { library } from "@fortawesome/fontawesome-svg-core";
import { faChevronCircleLeft, faChevronCircleRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";
import { useRouter } from "vue-router/composables";

import TextShort from "@/components/Common/TextShort.vue";
import Popper from "@/components/Popper/Popper.vue";

library.add(faChevronCircleLeft, faChevronCircleRight);

const router = useRouter();

interface Option {
    name: string;
    value: string;
}

export interface Props {
    id: string;
    title?: string;
    icon?: string | object;
    indicator?: number;
    isActive?: boolean;
    sideBarActive?: boolean;
    tooltip?: string;
    tooltipPlacement?: string;
    progressPercentage?: number;
    progressStatus?: string;
    options?: Option[];
    to?: string;
    type?: 'default' | 'panel' | 'split';
}

const props = withDefaults(defineProps<Props>(), {
    title: undefined,
    icon: "question",
    indicator: 0,
    isActive: false,
    options: undefined,
    progressPercentage: 0,
    progressStatus: undefined,
    to: undefined,
    tooltip: undefined,
    tooltipPlacement: "right",
    type: "default",
});

const emit = defineEmits<{
    (e: "click"): void;
}>();

const hasRightButton = computed(() => props.type === 'panel' || props.type === 'split');

function onClick(evt: MouseEvent): void {
    if (props.type === 'default' || props.type === 'panel') {
        emit("click");
        if (props.to) {
            router.push(props.to);
        }
    }
}

function onClickLeft(evt: MouseEvent): void {
    if (props.type === 'split') {
        if (props.to) {
            router.push(props.to);
        }
    }
}

function onClickRight(evt: MouseEvent): void {
    if (props.type === 'split') {
        emit("click");
    }
}
</script>

<template>
    <Popper reference-is="span" popper-is="span" :placement="tooltipPlacement">
        <template v-slot:reference>
            <div :id="id" class="activity-item" @click="onClick">
                <b-nav-item
                    class="position-relative my-1 p-2"
                    :class="{ 'nav-item-active': isActive, 'split-button': props.type === 'split' }"
                    :aria-label="title | l">
                    <span v-if="progressStatus" class="progress">
                        <div
                            class="progress-bar notransition"
                            :class="{
                                'bg-danger': progressStatus === 'danger',
                                'bg-success': progressStatus === 'success',
                            }"
                            :style="{
                                width: `${Math.round(progressPercentage)}%`,
                            }" />
                    </span>
                    <div class="d-flex align-items-center">
                        <div class="position-relative router-opener" @click="onClickLeft">
                            <div class="nav-icon">
                                <span v-if="indicator > 0" class="nav-indicator" data-description="activity indicator">
                                    {{ Math.min(indicator, 99) }}
                                </span>
                                <FontAwesomeIcon :icon="icon" />
                            </div>
                            <TextShort v-if="title" :text="title" class="nav-title" />
                            
                        </div>
                        <div v-if="hasRightButton" class="panel-opener h-100" @click="onClickRight">
                            <FontAwesomeIcon v-if="!props.sideBarActive" :icon="faChevronCircleRight" />
                            <FontAwesomeIcon v-else :icon="faChevronCircleLeft" />
                        </div>
                    </div>
                </b-nav-item>
            </div>
        </template>
        <div class="text-center px-2 py-1">
            <small v-if="tooltip">{{ tooltip | l }}</small>
            <small v-else>No tooltip available for this item</small>
            <div v-if="options" class="nav-options p-1">
                <router-link v-for="(option, index) in options" :key="index" :to="option.value">
                    <b-button size="sm" variant="outline-primary" class="w-100 my-1 text-break text-light">
                        {{ option.name }}
                    </b-button>
                </router-link>
            </div>
        </div>
    </Popper>
</template>

<style scoped lang="scss">
@import "theme/blue.scss";

.nav-icon {
    @extend .nav-item;
    font-size: 1rem;
}

.nav-indicator {
    align-items: center;
    background: $brand-danger;
    border-radius: 50%;
    color: $brand-light;
    display: flex;
    font-size: 0.7rem;
    justify-content: center;
    left: 2.2rem;
    height: 1.2rem;
    position: absolute;
    top: -0.3rem;
    width: 1.2rem;
}

.nav-item {
    display: flex;
    align-items: center;
    align-content: center;
    justify-content: center;

    &.split-button {
        .router-opener {
            border-top-left-radius: $border-radius-extralarge;
            border-bottom-left-radius: $border-radius-extralarge;
        }
        .panel-opener {
            &:hover {
                background: $brand-primary;
            }
        }        
    }
    &:not(.split-button) {
        .router-opener {
            border-radius: $border-radius-extralarge;
        }
    }

    // .router-opener {
    //     &:hover {
    //         background: $gray-300;
    //     }
    // }

    .panel-opener {
        position: absolute;
        right: 0;
        display: grid;
        place-items: center;
        border-top-right-radius: $border-radius-extralarge;
        border-bottom-right-radius: $border-radius-extralarge;
    }
}

.nav-item-active {
    border-radius: $border-radius-extralarge;
    background: $gray-300;
}

.nav-link {
    padding: 0;
}

.nav-options {
    overflow-x: hidden;
    overflow-y: auto;
}

.nav-title {
    @extend .nav-item;
    width: 4rem;
    margin-top: 0.5rem;
    font-size: 0.7rem;
}

.progress {
    background: transparent;
    border-radius: $border-radius-extralarge;
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
}

.notransition {
    -webkit-transition: none;
    -moz-transition: none;
    -ms-transition: none;
    -o-transition: none;
    transition: none;
}
</style>
