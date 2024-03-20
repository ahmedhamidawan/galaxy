<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";

import LoadingSpan from "./LoadingSpan.vue";

const props = defineProps({
    view: {
        type: String,
        default: "error",
    },
    query: {
        type: String,
        default: "",
    },
    context: {
        type: String,
        default: "",
    },
});

const query = ref(props.query);
const queryResponse = ref("");

const busy = ref(false);

// on submit, query the server and put response in display box
function submitQuery() {
    busy.value = true;
    queryResponse.value = "";
    const context = props.context || "username";
    axios
        .post("/api/chat", {
            query: query.value,
            context: context,
        })
        .then(function (response) {
            queryResponse.value = response.data;
        })
        .catch(function (error) {
            console.error(error);
        })
        .finally(() => {
            busy.value = false;
        });
}
</script>
<template>
    <div>
        <div>
            <b-button
                variant="info"
                :disabled="busy"
                @click="submitQuery">
                <span v-if="!busy">
                    Let our Help Wizard Figure it out!
                </span>
                <LoadingSpan v-else message="Thinking..." />
            </b-button>
        </div>
        <!-- spinner when busy -->
        <div>
            <div v-if="busy">
                <b-skeleton animation="wave" width="85%"></b-skeleton>
                <b-skeleton animation="wave" width="55%"></b-skeleton>
                <b-skeleton animation="wave" width="70%"></b-skeleton>
            </div>
            <div v-else class="chatResponse">{{ queryResponse }}</div>
        </div>
    </div>
</template>
<style lang="scss" scoped>
.chatResponse {
    white-space: pre-wrap;
}
</style>