<script setup>
// 「芽芽」——全屏唯一的漫游小吉祥物。
// 在屏幕里小碎跳着闲逛；可以拖到任何地方（位置记忆在本地）；
// 戳它/接任务/打卡/完成/放弃时会冒气泡说话。
// 移动用弹簧（拖拽时刚度更大，跟手但保留拖拽感），走路时朝向翻转。
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import SproutBuddy from './SproutBuddy.vue'
import { buddyBus, BUDDY_NAME } from '../store'

const POKE_LINES = ['嘿嘿，痒！', '再戳就要长高了', '（警惕地看了你一眼）', '要不要去接个任务？', `${BUDDY_NAME}在此！`]

const wrap = ref(null)
const buddy = ref(null)
const pos = ref({ x: 80, y: 320 })
const flip = ref(false)
const bubble = ref('')
const dragging = ref(false)

let px = 80, py = 320, vx = 0, vy = 0
let tx = 80, ty = 320
let raf = 0
let last = performance.now()
let nextWalkAt = performance.now() + 4000
let hopAt = 0
let bubbleTimer = null
let drag = false, grabX = 0, grabY = 0, movedDist = 0, lastPX = 0, lastPY = 0
let reduce = false

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))
const M = 10, TOP = 76, BOTTOM = 100 // 边距：顶部横幅之下、底部导航之上
const clampPos = (x, y) => ({ x: clamp(x, M, window.innerWidth - 76), y: clamp(y, TOP, window.innerHeight - BOTTOM) })

function persist() {
  try { localStorage.setItem('kuangye.buddy.pos', JSON.stringify({ x: Math.round(px), y: Math.round(py) })) } catch (e) { /* 忽略 */ }
}

function speak(text, ms = 1900) {
  bubble.value = text
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => (bubble.value = ''), ms)
}

watch(
  () => buddyBus.at,
  () => {
    if (buddyBus.at > Date.now() - 3000 && buddyBus.text) speak(buddyBus.text, Math.max(1400, buddyBus.at - Date.now()))
  }
)

function onDown(e) {
  drag = true
  movedDist = 0
  grabX = e.clientX - px
  grabY = e.clientY - py
  lastPX = e.clientX
  lastPY = e.clientY
  try { wrap.value.setPointerCapture(e.pointerId) } catch (err) { /* 合成事件无活动指针，忽略 */ }
}
function onMove(e) {
  if (!drag) return
  movedDist += Math.abs(e.clientX - lastPX) + Math.abs(e.clientY - lastPY)
  lastPX = e.clientX
  lastPY = e.clientY
  if (movedDist > 6) dragging.value = true
  const p = clampPos(e.clientX - grabX, e.clientY - grabY)
  tx = p.x
  ty = p.y
  nextWalkAt = performance.now() + 9000
}
function onUp() {
  if (!drag) return
  drag = false
  dragging.value = false
  persist()
  if (movedDist < 6) {
    buddy.value?.poke()
    speak(POKE_LINES[Math.floor(Math.random() * POKE_LINES.length)])
    nextWalkAt = performance.now() + 5000
  }
}

function frame(now) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  // 闲逛调度：随机走到屏幕某处
  if (!reduce && !drag && now >= nextWalkAt) {
    const p = clampPos(M + Math.random() * (window.innerWidth - 100), TOP + Math.random() * (window.innerHeight - TOP - BOTTOM - 10))
    tx = p.x
    ty = p.y
    nextWalkAt = now + 7000 + Math.random() * 9000
  }

  // 移动弹簧：拖拽时更硬（跟手但保留一点拖拽感）
  const k = drag ? 340 : 26
  const c = drag ? 23 : 9
  const h = 1 / 120
  let acc = dt
  while (acc > 0) {
    const s = Math.min(h, acc)
    vx += (k * (tx - px) - c * vx) * s
    vy += (k * (ty - py) - c * vy) * s
    px += vx * s
    py += vy * s
    acc -= s
  }

  // 走路：小碎跳 + 朝向翻转
  const dist = Math.hypot(tx - px, ty - py)
  if (!reduce && !drag && dist > 6) {
    if (Math.abs(vx) > 12) flip.value = vx < 0
    if (now >= hopAt) {
      buddy.value?.hop(-64)
      hopAt = now + 240 + Math.random() * 180
    }
  }

  const p = clampPos(px, py)
  pos.value = p
  px = p.x
  py = p.y
}

onMounted(() => {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    const saved = JSON.parse(localStorage.getItem('kuangye.buddy.pos'))
    if (saved && Number.isFinite(saved.x)) {
      const p = clampPos(saved.x, saved.y)
      px = tx = p.x
      py = ty = p.y
      nextWalkAt = performance.now() + 8000 // 刚回来先歇会儿
    }
  } catch (e) { /* 无存档就用默认位置 */ }
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(bubbleTimer)
})
</script>

<template>
  <div
    ref="wrap"
    class="roaming-buddy"
    :class="{ dragging }"
    :style="{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }"
    :title="`${BUDDY_NAME}：可以拖我到任何地方`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <div class="rb-flipper" :style="{ transform: flip ? 'scaleX(-1)' : 'none' }">
      <SproutBuddy ref="buddy" :size="64" ambient />
    </div>
    <Transition name="bubble">
      <div v-if="bubble" class="rb-bubble">{{ bubble }}</div>
    </Transition>
  </div>
</template>
