<script setup>
// 小芽——旷野的活物吉祥物 v2。
// 动效技术学习自 inspirations/grok-icon-study：弹簧积分器、带过冲的眨眼队列、
// 视线跟随。v2 新增：四种表情（idle/celebrate/excited/sad）、单眼 wink、
// 目光漫游与指针跟随、接任务/打卡/完成/放弃时的情绪反应（ambient 实例）。
// 形象为原创（种子芽 × 叶片 × 多边形眼睛），不复制 Grok 角色造型。
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { buddyBus } from '../store'

const props = defineProps({
  size: { type: Number, default: 72 },
  mood: { type: String, default: 'idle' }, // idle | celebrate
  ambient: { type: Boolean, default: false }, // 响应全局情绪总线（侧栏/空状态里那只）
})

const bodyG = ref(null)
const gazeG = ref(null)
const eyeLg = ref(null)
const eyeRg = ref(null)
const transientMood = ref('')

function makeSpring(x) {
  return { x, v: 0, t: x }
}
const jump = makeSpring(0)
const gaze = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }

let raf = 0
let last = performance.now()
let blinkQueue = [] // { at, v, eye? } eye 缺省 = 双眼
let nextBlinkAt = performance.now() + 1500
let nextWanderAt = 0
let moodTimer = null

// ———— 表情 ————
function setMood(m, ms = 1500) {
  transientMood.value = m
  clearTimeout(moodTimer)
  if (m !== 'idle') moodTimer = setTimeout(() => (transientMood.value = ''), ms)
}
if (props.ambient) {
  watch(
    () => buddyBus.at,
    () => {
      if (buddyBus.at > Date.now() - 3000) setMood(buddyBus.mood, Math.max(900, buddyBus.at - Date.now()))
    }
  )
}

// ———— 眨眼队列（带过冲；12% 概率单眼 wink） ————
function queueBlink(now) {
  if (Math.random() < 0.12) {
    const eye = Math.random() < 0.5 ? 'L' : 'R'
    blinkQueue.push({ at: now, v: 0.06, eye }, { at: now + 280, v: 1, eye })
  } else {
    blinkQueue.push(
      { at: now, v: 0.06 },
      { at: now + 70, v: 0.06 },
      { at: now + 150, v: 1.1 },
      { at: now + 300, v: 1 }
    )
    if (Math.random() < 0.14) {
      blinkQueue.push({ at: now + 380, v: 0.06 }, { at: now + 500, v: 1 })
    }
  }
  nextBlinkAt = now + 2200 + Math.random() * 2800
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

function onPointerMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2
  const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2
  gaze.tx = clamp(nx * 2.6, -2.6, 2.6)
  gaze.ty = clamp(ny * 1.8, -1.6, 2)
  nextWanderAt = performance.now() + 1600
}

function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  // 跳跃弹簧（120Hz 子步长）
  const h = 1 / 120
  let acc = dt
  while (acc > 0) {
    const s = Math.min(h, acc)
    jump.v += (190 * (jump.t - jump.x) - 14 * jump.v) * s
    jump.x += jump.v * s
    acc -= s
  }

  // 眨眼
  let lidL = 1
  let lidR = 1
  while (blinkQueue.length && now >= blinkQueue[0].at) {
    const b = blinkQueue.shift()
    if (b.eye === 'L') lidL = b.v
    else if (b.eye === 'R') lidR = b.v
    else lidL = lidR = b.v
  }
  if (!blinkQueue.length && now >= nextBlinkAt) queueBlink(now)

  // 目光漫游（没人理它时自己东看看西看看），偶尔来个小碎跳
  if (now >= nextWanderAt) {
    gaze.tx = (Math.random() - 0.5) * 4
    gaze.ty = (Math.random() - 0.5) * 2.6
    nextWanderAt = now + 2600 + Math.random() * 2800
    if (Math.random() < 0.08) jump.v = -55
  }

  // 视线弹簧跟随
  gaze.vx += (90 * (gaze.tx - gaze.x) - 13 * gaze.vx) * dt
  gaze.x += gaze.vx * dt
  gaze.vy += (90 * (gaze.ty - gaze.y) - 13 * gaze.vy) * dt
  gaze.y += gaze.vy * dt

  // 应用
  const sy = clamp(1 - jump.v * 0.0009, 0.86, 1.12)
  const sx = clamp(1 + jump.v * 0.00045, 0.94, 1.06)
  if (bodyG.value) {
    bodyG.value.setAttribute(
      'transform',
      `translate(0 ${jump.x.toFixed(2)}) translate(60 106) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-60 -106)`
    )
  }
  if (gazeG.value) gazeG.value.setAttribute('transform', `translate(${gaze.x.toFixed(2)} ${gaze.y.toFixed(2)})`)
  if (eyeLg.value) eyeLg.value.setAttribute('transform', `translate(0 81) scale(1 ${lidL.toFixed(3)}) translate(0 -81)`)
  if (eyeRg.value) eyeRg.value.setAttribute('transform', `translate(0 81) scale(1 ${lidR.toFixed(3)}) translate(0 -81)`)

  raf = requestAnimationFrame(step)
}

function celebrate() {
  jump.v = -210
  if (props.ambient) setMood('celebrate', 1600)
}

function poke() {
  jump.v = -130
  queueBlink(performance.now())
}
function hop(v = -70) {
  jump.v = v
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
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(moodTimer)
})

defineExpose({ poke, hop })
</script>

<template>
  <svg
    class="buddy"
    :class="`m-${transientMood || mood || 'idle'}`"
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    role="img"
    aria-label="旷野小芽"
    @click="poke"
    @pointermove="onPointerMove"
  >
    <!-- 地面影子：不随身体跳起，落点才可信 -->
    <ellipse cx="60" cy="107" rx="24" ry="4.5" fill="rgba(93,76,44,0.16)" />
    <g ref="bodyG">
      <g class="breath-g">
        <!-- 茎与叶（sad 时耷拉） -->
        <path d="M60 60 C 59 52, 61 46, 60 38" stroke="#6f9448" stroke-width="4" stroke-linecap="round" />
        <g class="leafwrap leafwrap-l"><path class="leaf leaf-l" d="M60 41 C 48 42, 40 34, 38 24 C 50 22, 59 30, 60 41 Z" fill="#7fae54" /></g>
        <g class="leafwrap leafwrap-r"><path class="leaf leaf-r" d="M60 41 C 72 42, 80 34, 82 24 C 70 22, 61 30, 60 41 Z" fill="#8fbc60" /></g>
        <!-- 种子身体 -->
        <path
          d="M60 56 C 78 56, 88 72, 88 85 C 88 99, 75 106, 60 106 C 45 106, 32 99, 32 85 C 32 72, 42 56, 60 56 Z"
          fill="#93b968"
        />
        <ellipse cx="60" cy="93" rx="19" ry="10" fill="#c2d79b" opacity="0.9" />
        <!-- 眼睛：圆眼（可眨可 wink）+ 弯眼（开心），整体带视线跟随 -->
        <g ref="eyesG">
          <g ref="gazeG">
            <g ref="eyeLg"><ellipse cx="49" cy="81" rx="3.2" ry="4" fill="#33291e" /></g>
            <g ref="eyeRg"><ellipse cx="71" cy="81" rx="3.2" ry="4" fill="#33291e" /></g>
            <g class="eye-happy">
              <path d="M45 82 Q49 76.5 53 82" stroke="#33291e" stroke-width="2.4" stroke-linecap="round" />
              <path d="M67 82 Q71 76.5 75 82" stroke="#33291e" stroke-width="2.4" stroke-linecap="round" />
            </g>
          </g>
        </g>
        <!-- 嘴：微笑 / 张嘴欢呼 / 撇嘴委屈 -->
        <path class="mouth mouth-smile" d="M56.5 89.5 Q60 92.5 63.5 89.5" stroke="#33291e" stroke-width="2" stroke-linecap="round" />
        <ellipse class="mouth mouth-open" cx="60" cy="91" rx="3.2" ry="4" fill="#33291e" />
        <path class="mouth mouth-frown" d="M56 92 Q60 89 64 92" stroke="#33291e" stroke-width="2" stroke-linecap="round" />
        <ellipse class="blush" cx="43.5" cy="88" rx="3" ry="1.8" fill="#e2a184" opacity="0.5" />
        <ellipse class="blush" cx="76.5" cy="88" rx="3" ry="1.8" fill="#e2a184" opacity="0.5" />
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
.leafwrap { transform-box: view-box; transform-origin: 60px 41px; transition: transform 0.4s var(--ease-out, ease-out); }

/* 表情切换 */
.eye-round, .eye-happy, .mouth { transition: opacity 0.12s ease, transform 0.15s ease; }
.eye-happy, .mouth-open, .mouth-frown { opacity: 0; }
.m-celebrate .eye-round, .m-excited .eye-round { opacity: 0; }
.m-celebrate .eye-happy, .m-excited .eye-happy { opacity: 1; }
.m-celebrate .mouth-smile, .m-excited .mouth-smile, .m-sad .mouth-smile { opacity: 0; }
.m-celebrate .mouth-open, .m-excited .mouth-open, .m-sad .mouth-frown { opacity: 1; }
.m-sad .eye-round { transform: scaleY(0.55); }
.m-sad .leafwrap-l { transform: rotate(16deg); }
.m-sad .leafwrap-r { transform: rotate(-16deg); }
.m-excited .blush, .m-celebrate .blush { opacity: 0.75; }

@media (prefers-reduced-motion: reduce) {
  .breath-g, .leaf-l, .leaf-r { animation: none !important; }
}
</style>
