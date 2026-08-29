<script setup>
import { ref, computed } from 'vue'
import { CATS, DIFF, TYPES, TYPE_ICONS } from '../data/tasks'
import { progressOf, reached, checkedToday, checkIn, logUnits, taskById, now } from '../store'

const props = defineProps({ active: Object })
const emit = defineEmits(['complete', 'abandon'])

const task = computed(() => taskById[props.active.qid])
const cat = computed(() => CATS[task.value.cat])
const p = computed(() => progressOf(props.active))
const done = computed(() => reached(props.active))
const todayChecked = computed(() => checkedToday(props.active))
const addV = ref(1)
const ratio = computed(() => Math.min(1, p.value.cur / p.value.target))

// 最近 14 天打卡格
const dots = computed(() => {
  const set = new Set(props.active.logs.map((l) => l.d))
  const out = []
  const n = now()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() - i)
    const pad = (x) => String(x).padStart(2, '0')
    out.push(set.has(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`))
  }
  return out
})

function record() {
  logUnits(props.active, addV.value)
  addV.value = 1
}
</script>

<template>
  <div class="quest-card" :style="{ '--cat-color': cat.color }">
    <div class="qc-head">
      <span class="diff-badge" :class="`diff-${task.diff}`">{{ task.diff }}</span>
      <span class="qc-title">{{ task.title }}</span>
      <span class="cat-tag">{{ cat.name }}</span>
    </div>

    <!-- 一次性 -->
    <template v-if="task.type === 'once'">
      <div class="qc-progress-line"><span>{{ TYPE_ICONS.once }} {{ TYPES.once }}挑战 · 诚实制：做到了再点</span></div>
      <div class="qc-actions">
        <button class="btn btn-primary breath" @click="emit('complete')">宣布完成</button>
      </div>
      <div class="qc-meta">
        <span>{{ props.active.start }} 接取</span>
        <button class="btn btn-ghost btn-sm" @click="emit('abandon')">放弃</button>
      </div>
    </template>

    <!-- 连击 -->
    <template v-else-if="task.type === 'streak'">
      <div class="qc-progress-line">
        <span>{{ TYPE_ICONS.streak }} {{ TYPES.streak }}挑战</span>
        <span><b>{{ p.cur }}</b> / {{ p.target }} 天</span>
      </div>
      <div class="bar"><i :style="{ '--p': ratio }" /></div>
      <div class="dots"><i v-for="(on, i) in dots" :key="i" :class="{ on }" /></div>
      <div class="shield-note">🛡️ 免死金牌 ×{{ props.active.shields }} · 实在断签的那天用它抵一次</div>
      <div class="qc-actions">
        <button v-if="todayChecked" class="btn" disabled>今日已打卡 ✓</button>
        <button v-else class="btn btn-primary breath" @click="checkIn(props.active)">今日打卡</button>
        <button v-if="done" class="btn btn-primary" @click="emit('complete')">结算</button>
      </div>
      <div class="qc-meta">
        <span>{{ props.active.start }} 接取</span>
        <button class="btn btn-ghost btn-sm" @click="emit('abandon')">放弃</button>
      </div>
    </template>

    <!-- 累积 -->
    <template v-else>
      <div class="qc-progress-line">
        <span>{{ TYPE_ICONS.total }} {{ TYPES.total }}挑战</span>
        <span><b>{{ p.cur }}</b> / {{ p.target }} {{ task.unit }}</span>
      </div>
      <div class="bar"><i :style="{ '--p': ratio }" /></div>
      <div class="log-row">
        <input class="num-input" type="number" min="1" v-model.number="addV" />
        <button class="btn" @click="record">记录{{ task.unit ? ' ' + task.unit : '' }}</button>
      </div>
      <div v-if="done" class="qc-actions">
        <button class="btn btn-primary breath" @click="emit('complete')">结算</button>
      </div>
      <div class="qc-meta">
        <span>{{ props.active.start }} 接取</span>
        <button class="btn btn-ghost btn-sm" @click="emit('abandon')">放弃</button>
      </div>
    </template>
  </div>
</template>
