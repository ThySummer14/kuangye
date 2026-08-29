<script setup>
// 小芽——旷野的活物吉祥物。
// 动效技术学习自 inspirations/grok-icon-study：半隐式欧拉弹簧积分器 + 带过冲的眨眼队列。
// 形象为原创（种子芽 × 叶片 × 多边形眼睛），不复制 Grok 角色造型。
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  size: { type: Number, default: 72 },
  mood: { type: String, default: 'idle' }, // idle | celebrate
})

const bodyG = ref(null)
const eyesG = ref(null)
const celebrating = ref(false)

function makeSpring(x) {
  return { x, v: 0, t: 0 }
}
const jump = makeSpring(0)

let raf = 0
let last = performance.now()
let blinkQueue = []
let nextBlinkAt = performance.now() + 1500
let celebrateTimer = null

function queueBlink(now) {
  blinkQueue.push(
    { at: now, v: 0.06 },
    { at: now + 70, v: 0.06 },
    { at: now + 150, v: 1.1 },
    { at: now + 300, v: 1 }
  )
  if (Math.random() < 0.14) {
    blinkQueue.push({ at: now + 380, v: 0.06 }, { at: now + 500, v: 1 })
  }
  nextBlinkAt = now + 2200 + Math.random() * 2800
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  // 弹簧积分，120Hz 子步长
  const h = 1 / 120
  let acc = dt
  while (acc > 0) {
    const s = Math.min(h, acc)
    jump.v += (190 * (jump.t - jump.x) - 14 * jump.v) * s
    jump.x += jump.v * s
    acc -= s
  }
  // 眨眼
  let lid = 1
  while (blinkQueue.length && now >= blinkQueue[0].at) lid = blinkQueue.shift().v
  if (!blinkQueue.length && now >= nextBlinkAt) queueBlink(now)
  // 跳跃 + 跟随速度的挤压拉伸
  const sy = clamp(1 - jump.v * 0.0009, 0.86, 1.12)
  const sx = clamp(1 + jump.v * 0.00045, 0.94, 1.06)
  if (bodyG.value) {
    bodyG.value.setAttribute(
      'transform',
      `translate(0 ${jump.x.toFixed(2)}) translate(60 106) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-60 -106)`
    )
  }
  if (eyesG.value) {
    eyesG.value.setAttribute('transform', `translate(0 81) scale(1 ${lid.toFixed(3)}) translate(0 -81)`)
  }
  raf = requestAnimationFrame(step)
}

function celebrate() {
  jump.v = -210
  celebrating.value = true
  clearTimeout(celebrateTimer)
  celebrateTimer = setTimeout(() => (celebrating.value = false), 1400)
}

function poke() {
  jump.v = -130
  queueBlink(performance.now())
}

watch(
  () => props.mood,
  (m) => {
    if (m === 'celebrate') celebrate()
  },
  { immediate: true }
)

onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    raf = requestAnimationFrame(step)
  }
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

defineExpose({ poke })
</script>

<template>
  <svg
    class="buddy"
    :class="{ celebrating }"
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    role="img"
    aria-label="旷野小芽"
    @click="poke"
  >
    <!-- 地面影子：不随身体跳起，落点才可信 -->
    <ellipse cx="60" cy="107" rx="24" ry="4.5" fill="rgba(93,76,44,0.16)" />
    <g ref="bodyG">
      <g class="breath-g">
        <!-- 茎与叶 -->
        <path d="M60 60 C 59 52, 61 46, 60 38" stroke="#6f9448" stroke-width="4" stroke-linecap="round" />
        <path class="leaf leaf-l" d="M60 41 C 48 42, 40 34, 38 24 C 50 22, 59 30, 60 41 Z" fill="#7fae54" />
        <path class="leaf leaf-r" d="M60 41 C 72 42, 80 34, 82 24 C 70 22, 61 30, 60 41 Z" fill="#8fbc60" />
        <!-- 种子身体 -->
        <path
          d="M60 56 C 78 56, 88 72, 88 85 C 88 99, 75 106, 60 106 C 45 106, 32 99, 32 85 C 32 72, 42 56, 60 56 Z"
          fill="#93b968"
        />
        <ellipse cx="60" cy="93" rx="19" ry="10" fill="#c2d79b" opacity="0.9" />
        <!-- 眼睛：普通圆眼 + 庆祝弯眼 -->
        <g ref="eyesG">
          <g class="eye-round">
            <ellipse cx="49" cy="81" rx="3.2" ry="4" fill="#33291e" />
            <ellipse cx="71" cy="81" rx="3.2" ry="4" fill="#33291e" />
          </g>
          <g class="eye-happy" opacity="0">
            <path d="M45 82 Q49 76.5 53 82" stroke="#33291e" stroke-width="2.4" stroke-linecap="round" />
            <path d="M67 82 Q71 76.5 75 82" stroke="#33291e" stroke-width="2.4" stroke-linecap="round" />
          </g>
        </g>
        <path d="M56.5 89.5 Q60 92.5 63.5 89.5" stroke="#33291e" stroke-width="2" stroke-linecap="round" />
        <ellipse cx="43.5" cy="88" rx="3" ry="1.8" fill="#e2a184" opacity="0.5" />
        <ellipse cx="76.5" cy="88" rx="3" ry="1.8" fill="#e2a184" opacity="0.5" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.buddy { display: block; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.breath-g {
  transform-origin: 60px 106px;
  transform-box: view-box;
  animation: buddy-breath 2.8s ease-in-out infinite;
}
@keyframes buddy-breath {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.025); }
}
.leaf { transform-box: view-box; }
.leaf-l { transform-origin: 60px 41px; animation: sway-l 3.4s ease-in-out infinite alternate; }
.leaf-r { transform-origin: 60px 41px; animation: sway-r 3.4s ease-in-out infinite alternate; }
@keyframes sway-l { from { transform: rotate(-3deg); } to { transform: rotate(4deg); } }
@keyframes sway-r { from { transform: rotate(3deg); } to { transform: rotate(-4deg); } }
.eye-happy { transition: opacity 0.12s ease; }
.celebrating .eye-round { opacity: 0; }
.celebrating .eye-happy { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .breath-g, .leaf-l, .leaf-r { animation: none !important; }
}
</style>
