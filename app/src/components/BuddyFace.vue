<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { buddyBus, buddyMoment } from "../store.js";
import { paintEye } from "../scenes/face-paint.js";
import { EXPRESSIONS, springStep } from "../game/emotions.js";
const props = defineProps({
  size: { type: Number, default: 150 },
  mood: String,
  interactive: { type: Boolean, default: true },
});
const canvas = ref(null),
  moodLabel = ref("自在");
const moods = EXPRESSIONS;
const names = {
  idle: "自在",
  curious: "好奇",
  happy: "开心",
  proud: "骄傲",
  celebrate: "欢呼",
  sleepy: "困困",
  sad: "陪伴",
  worried: "疑惑",
  shocked: "惊喜",
  loved: "被喜欢",
  excited: "期待",
};
let frame,
  ctx,
  last = 0,
  gaze = { x: 0, y: 0 },
  params = [1, 0, 0.2, 0, 0],
  velocity = [0, 0, 0, 0, 0],
  clicks = 0;
function ellipse(x, y, rx, ry, color, rotation = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    Math.max(0.3, rx),
    Math.max(0.3, ry),
    rotation,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}
function stroke(x1, y1, cx, cy, x2, y2, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
}
function render(t) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dt = Math.min((t - last) / 1000 || 0.016, 0.035);
  last = t;
  const mood =
      props.mood || (Date.now() < buddyBus.at ? buddyBus.mood : "idle"),
    goal = moods[mood] || moods.idle;
  moodLabel.value = names[mood] || "自在";
  for (let i = 0; i < 5; i++) {
    if (reduced) params[i] = goal[i];
    else {
      const step = springStep(params[i], velocity[i], goal[i], dt);
      velocity[i] = step.velocity;
      params[i] = step.position;
    }
  }
  ctx.clearRect(0, 0, 256, 256);
  const breath = reduced ? 0 : Math.sin(t * 0.002) * 2,
    bounce = reduced ? 0 : Math.abs(Math.sin(t * 0.008)) * params[4] * 15;
  ellipse(128, 224, 55, 8, "#899b6a20");
  ctx.save();
  ctx.translate(128, 137 + breath - bounce);
  ctx.rotate(params[3]);
  ctx.translate(-128, -137);
  ellipse(128, 166, 60, 54, "#93b968");
  ellipse(128, 199, 40, 18, "#c2d79b");
  stroke(128, 115, 126, 86, 128, 67, "#6f9448", 7);
  ctx.fillStyle = "#7fae54";
  ctx.beginPath();
  ctx.moveTo(128, 78);
  ctx.bezierCurveTo(101, 78, 89, 60, 82, 40);
  ctx.bezierCurveTo(110, 40, 127, 55, 128, 78);
  ctx.fill();
  ctx.fillStyle = "#8fbc60";
  ctx.beginPath();
  ctx.moveTo(128, 78);
  ctx.bezierCurveTo(155, 78, 167, 60, 174, 40);
  ctx.bezierCurveTo(146, 40, 129, 55, 128, 78);
  ctx.fill();
  ctx.translate(0, 26);
  const blink =
    !reduced && t % 4700 > 4490
      ? Math.max(0.08, Math.abs((t % 4700) - 4595) / 105)
      : 1;
  const gx = mood === "idle" || mood === "curious" ? gaze.x : 0,
    gy = mood === "idle" || mood === "curious" ? gaze.y : 0;
  for (const x of [107, 151]) {
    ctx.fillStyle = "#33291e";
    paintEye(
      ctx,
      x + gx,
      130 + gy,
      5.3,
      8 * params[0] * blink * (x < 128 ? 1 + params[3] : 1 - params[3]),
      params[1],
      params[3] * (x < 128 ? -1 : 1),
    );
    ellipse(x + (x < 128 ? -12 : 12), 148, 10, 5, "#dfa99877");
  }
  if (params[2] > 0.55) {
    ellipse(129, 153, 9, 8 * params[2], "#72584a");
    ellipse(129, 157, 5, 3, "#dc9f8b");
  } else stroke(120, 150, 129, 156 + params[1] * 8, 138, 150, "#536247", 3);
  ctx.restore();
  if (mood === "loved") {
    ctx.fillStyle = "#c68c7f";
    ctx.font = "27px serif";
    ctx.fillText("♥", 199, 91);
  }
  if (mood === "sleepy") {
    ctx.fillStyle = "#899887";
    ctx.font = "18px sans-serif";
    ctx.fillText("z z", 190, 93);
  }
  if (params[4] > 0.2) {
    ctx.fillStyle = "#cdad61";
    ctx.font = "24px serif";
    ctx.fillText("✦", 38, 97);
    ctx.fillText("✧", 199, 146);
  }
  frame = requestAnimationFrame(render);
}
function move(e) {
  const r = canvas.value.getBoundingClientRect();
  gaze = {
    x: Math.max(-4, Math.min(4, (e.clientX - r.left - r.width / 2) / 20)),
    y: Math.max(-2, Math.min(2, (e.clientY - r.top - r.height / 2) / 30)),
  };
}
function pet() {
  if (!props.interactive) return;
  clicks++;
  buddyMoment(
    clicks % 4 === 0 ? "shocked" : clicks % 3 === 0 ? "proud" : "loved",
    2500,
    clicks % 4 === 0 ? "哇，你发现我的小叶子了。" : "你在这里，就很好。",
  );
}
onMounted(() => {
  ctx = canvas.value.getContext("2d");
  frame = requestAnimationFrame(render);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>
<template>
  <button
    class="buddy-touch"
    :disabled="!interactive"
    :aria-label="`摸摸小芽，当前${moodLabel}`"
    @click="pet"
    @pointermove="move"
    @pointerleave="gaze = { x: 0, y: 0 }"
  >
    <canvas
      ref="canvas"
      width="256"
      height="256"
      :style="{ width: size + 'px', height: size + 'px' }"
    />
  </button>
</template>
