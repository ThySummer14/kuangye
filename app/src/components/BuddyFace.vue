<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { buddyBus, buddyMoment } from "../store.js";
import { EMOTION_NAMES } from "../game/emotions.js";
import SproutPortrait from "./SproutPortrait.vue";
const props = defineProps({
  size: { type: Number, default: 150 },
  mood: String,
  interactive: { type: Boolean, default: true },
});
const clock = ref(Date.now());
let timer,
  clicks = 0;
const currentMood = computed(
  () => props.mood || (clock.value < buddyBus.at ? buddyBus.mood : "idle"),
);
const moodLabel = computed(() => EMOTION_NAMES[currentMood.value] || "自在");
function pet() {
  if (!props.interactive) return;
  clicks++;
  buddyMoment(
    clicks % 4 === 0 ? "shocked" : clicks % 3 === 0 ? "proud" : "loved",
    2500,
    clicks % 4 === 0 ? "哇，软软的角也被你发现了。" : "你在这里，就很好。",
  );
}

onMounted(() => (timer = setInterval(() => (clock.value = Date.now()), 80)));
onBeforeUnmount(() => clearInterval(timer));
</script>
<template>
  <button
    class="buddy-touch"
    :disabled="!interactive"
    :aria-label="`摸摸小芽，当前${moodLabel}`"
    @click="pet"
  >
    <SproutPortrait :size="size" :mood="currentMood" />
  </button>
</template>
