import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import DelayedInput from "./DelayedInput.vue";

const SELECTORS = {
    CLEAR_SEARCH: "[data-description='reset query']",
    INPUT_COMPONENT: "[data-description='filter text input']",
};

const localVue = getLocalVue();

function mountDelayedInput(props = {}) {
    return mount(DelayedInput as object, {
        localVue,
        propsData: {
            value: "test query",
            ...props,
        },
    });
}

describe("DelayedInput.vue", () => {
    it("clears search and refocuses without error", async () => {
        const wrapper = mountDelayedInput();

        await wrapper.find(SELECTORS.CLEAR_SEARCH).trigger("click");
        await nextTick();

        expect(wrapper.find(SELECTORS.INPUT_COMPONENT).exists()).toBe(true);
        expect((wrapper.find(SELECTORS.INPUT_COMPONENT).find("input").element as HTMLInputElement).value).toBe("");
    });

    it("emits 'input' and 'change' immediately when value is cleared", async () => {
        const wrapper = mountDelayedInput({ delay: 1000 });
        const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

        await input.setValue("");

        expect(wrapper.emitted("input")?.[0]).toEqual([""]);
        expect(wrapper.emitted("change")?.[0]).toEqual([""]);
    });

    describe("hasSearchButton mode", () => {
        it("does not emit while typing", async () => {
            const wrapper = mountDelayedInput({ value: "", hasSearchButton: true });
            const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

            await input.setValue("galaxy");

            expect(wrapper.emitted("input")).toBeFalsy();
            expect(wrapper.emitted("change")).toBeFalsy();
        });

        it("emits on Enter key", async () => {
            const wrapper = mountDelayedInput({ value: "", hasSearchButton: true });
            const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

            await input.setValue("galaxy");
            await input.trigger("keydown", { key: "Enter" });

            expect(wrapper.emitted("input")?.[0]).toEqual(["galaxy"]);
            expect(wrapper.emitted("change")?.[0]).toEqual(["galaxy"]);
        });

        it("emits on search icon click", async () => {
            const wrapper = mountDelayedInput({ value: "", hasSearchButton: true });
            const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

            await input.setValue("galaxy");
            await wrapper.find(".search-icon").trigger("click");

            expect(wrapper.emitted("input")?.[0]).toEqual(["galaxy"]);
            expect(wrapper.emitted("change")?.[0]).toEqual(["galaxy"]);
        });

        it("does not emit on Escape, only clears the input", async () => {
            const wrapper = mountDelayedInput({ value: "", hasSearchButton: true });
            const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

            await input.setValue("galaxy");
            await input.trigger("keydown", { key: "Escape" });

            expect((input.element as HTMLInputElement).value).toBe("");
            expect(wrapper.emitted("input")).toBeFalsy();
        });
    });

    describe("delayed emit", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("emits 'input' and 'change' after the delay when a non-empty value is typed", async () => {
            const wrapper = mountDelayedInput({ value: "", delay: 500 });
            const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

            await input.setValue("galaxy");

            // no emission yet — still within delay window
            const countAfterType = wrapper.emitted("input")?.length ?? 0;

            vi.advanceTimersByTime(500);
            await nextTick();

            const emissions = wrapper.emitted("input") ?? [];
            expect(emissions.length).toBe(countAfterType + 1);
            expect(emissions[emissions.length - 1]).toEqual(["galaxy"]);
            const changeEmissions = wrapper.emitted("change") ?? [];
            expect(changeEmissions[changeEmissions.length - 1]).toEqual(["galaxy"]);
        });

        it("debounces rapid input and only emits once after the delay", async () => {
            const wrapper = mountDelayedInput({ value: "", delay: 500 });
            const input = wrapper.find(SELECTORS.INPUT_COMPONENT).find("input");

            await input.setValue("g");
            await input.setValue("ga");
            await input.setValue("gal");

            const countBeforeFlush = wrapper.emitted("input")?.length ?? 0;

            vi.advanceTimersByTime(500);
            await nextTick();

            const emissions = wrapper.emitted("input") ?? [];
            expect(emissions.length).toBe(countBeforeFlush + 1);
            expect(emissions[emissions.length - 1]).toEqual(["gal"]);
            const changeEmissions = wrapper.emitted("change") ?? [];
            expect(changeEmissions[changeEmissions.length - 1]).toEqual(["gal"]);
        });
    });
});
