<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { createEmotionMotion } from "../game/emotions.js";
import { paintSprout } from "../scenes/sprout-paint.js";
const props = defineProps({
  mood: { default: "idle" },
  size: { default: 256 },
  frequency: Number,
  damping: Number,
  blink: { default: true },
  breath: { default: true },
  paused: Boolean,
});
const canvas = ref(null),
  motion = createEmotionMotion();
let frame,
  last = 0,
  time = 0,
  gaze = { x: 0, y: 0 };
function render(t) {
  const dt = Math.min((t - last) / 1000 || 0.016, 0.1);
  last = t;
  motion.setMood(props.mood);
  if (!props.paused) {
    time += dt * 1000;
    motion.step(
      dt,
      { frequency: props.frequency, damping: props.damping },
      gaze,
    );
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.value.getContext("2d");
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  paintSprout(ctx, motion.values, time, {
    blink: props.blink && !reduced,
    breath: props.breath && !reduced,
  });
  frame = requestAnimationFrame(render);
}
function move(e) {
  const r = canvas.value.getBoundingClientRect();
  gaze = {
    x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)),
    y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)),
  };
}
onMounted(() => (frame = requestAnimationFrame(render)));
onBeforeUnmount(() => cancelAnimationFrame(frame));
defineExpose({
  snapshot: () => motion.snapshot(),
  reset: (m) => {
    motion.reset(m);
    time = 0;
  },
  advance: (dt) =>
    motion.step(dt, { frequency: props.frequency, damping: props.damping }),
});
</script>
<template>
  <canvas
    ref="canvas"
    width="512"
    height="512"
    :style="{ width: size + 'px', height: size + 'px' }"
    class="sprout-portrait"
    role="img"
    :aria-label="'小芽 · ' + mood"
    @pointermove="move"
    @pointerleave="gaze = { x: 0, y: 0 }"
  />
</template>
<style scoped>
.sprout-portrait {
  max-width: 100%;
  object-fit: contain;
  display: block;
}
</style>
