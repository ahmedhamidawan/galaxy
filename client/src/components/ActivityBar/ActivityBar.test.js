import { createTestingPinia } from "@pinia/testing";
import { shallowMount } from "@vue/test-utils";
import { PiniaVuePlugin } from "pinia";
import { getLocalVue } from "tests/jest/helpers";

import { useConfig } from "@/composables/config";
import { useActivityStore } from "@/stores/activityStore";
import { useEventStore } from "@/stores/eventStore";

import mountTarget from "./ActivityBar.vue";

jest.mock("composables/config");
useConfig.mockReturnValue({
    config: {},
    isLoaded: true,
});

jest.mock("vue-router/composables", () => ({
    useRoute: jest.fn(() => ({})),
}));

const localVue = getLocalVue();
localVue.use(PiniaVuePlugin);

function testActivity(id, newOptions = {}) {
    const defaultOptions = {
        id: `test-${id}`,
        description: "test-description",
        icon: "test-icon",
        mutable: true,
        optional: false,
        title: "test-title",
        to: "test-to",
        tooltip: "test-tooltip",
        visible: true,
    };
    return { ...defaultOptions, ...newOptions };
}

const createBubbledEvent = (type, props = {}) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, props);
    return event;
};

describe("ActivityBar", () => {
    let activityStore;
    let eventStore;
    let wrapper;

    beforeEach(async () => {
        const pinia = createTestingPinia({ stubActions: false });
        activityStore = useActivityStore();
        eventStore = useEventStore();
        wrapper = shallowMount(mountTarget, {
            localVue,
            pinia,
        });
    });

    it("rendering", async () => {
        activityStore.setAll([testActivity("1"), testActivity("2"), testActivity("3")]);
        await wrapper.vm.$nextTick();
        const items = wrapper.findAll("[title='test-title']");
        expect(items.length).toBe(3);
    });

    it("drag start", async () => {
        activityStore.setAll([testActivity("1"), testActivity("2"), testActivity("3")]);
        eventStore.setDragData({
            id: "workflow-id",
            description: "workflow-description",
            model_class: "StoredWorkflow",
            name: "workflow-name",
        });
        const bar = wrapper.find("[data-description='activity bar']");
        bar.element.dispatchEvent(createBubbledEvent("dragenter", { clientX: 0, clientY: 0 }));
        const emittedEvent = wrapper.emitted()["dragstart"][0][0];
        expect(emittedEvent.to).toBe("/workflows/run?id=workflow-id");
    });
});
