<script setup>
import { ref, computed } from 'vue'
import { state, now } from './store'
import { seasonPhase, SEASON } from './data/season'
import SeasonBanner from './components/SeasonBanner.vue'
import TaskBoard from './components/TaskBoard.vue'
import Journey from './components/Journey.vue'
import ChainsView from './components/ChainsView.vue'
import Panel from './components/Panel.vue'
import CompleteModal from './components/CompleteModal.vue'
import AbandonModal from './components/AbandonModal.vue'
import RoamingBuddy from './components/RoamingBuddy.vue'
import { BUDDY_NAME } from './store'

const tab = ref('board')
const toastMsg = ref('')
let toastTimer = null
function toast(m) {
  toastMsg.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2400)
}

const phase = computed(() => seasonPhase(now()))
const completing = ref(null)
const abandoning = ref(null)
const todayLabel = computed(() => {
  const d = now()
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(d)
})
const seasonLine = computed(() => {
  if (phase.value.phase === 'pre') return `距 S1 开赛 ${phase.value.daysToStart} 天`
  if (phase.value.phase === 'active') return `S1 第 ${phase.value.dayInSeason} 天`
  return '赛季结算期'
})
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="side-brand">
        <div class="side-kicker">PERSONAL SIDE QUESTS</div>
        <div class="wordmark">旷野</div>
        <div class="wordmark-sub">人生支线任务</div>
        <div class="season-chip side-chip">{{ SEASON.id }} · {{ SEASON.name }}</div>
      </div>
      <nav class="side-nav" aria-label="主导航">
        <button class="side-link" :class="{ on: tab === 'board' }" @click="tab = 'board'">
          <span class="nav-icon nav-map" aria-hidden="true" />任务板
        </button>
        <button class="side-link" :class="{ on: tab === 'quest' }" @click="tab = 'quest'">
          <span class="nav-icon nav-quest" aria-hidden="true" />进行中
          <span v-if="state.active.length" class="side-badge">{{ state.active.length }}</span>
        </button>
        <button class="side-link" :class="{ on: tab === 'chains' }" @click="tab = 'chains'">
          <span class="nav-icon nav-chain" aria-hidden="true" />成长线
        </button>
        <button class="side-link" :class="{ on: tab === 'panel' }" @click="tab = 'panel'">
          <span class="nav-icon nav-panel" aria-hidden="true" />生涯面板
        </button>
      </nav>
      <div class="side-foot">
        <div class="side-foot-txt">{{ seasonLine }}</div>
        <div class="side-foot-sub">{{ BUDDY_NAME }}在屏幕上散步 · {{ state.done.length }} 项已完成</div>
        <div class="side-foot-note">数据只留在这台设备 · 随时可导出</div>
      </div>
    </aside>

    <div class="content">
      <header class="app-header">
        <div class="header-context">
          <div class="side-kicker">{{ todayLabel }} · 给自己派一件事</div>
          <div class="wordmark">旷野</div>
          <div class="wordmark-sub">人生支线任务</div>
        </div>
        <div class="header-right">
          <span class="header-stat">{{ state.done.length }} <small>战利品</small></span>
          <div class="season-chip">{{ SEASON.id }} · {{ SEASON.name }}</div>
        </div>
      </header>

      <SeasonBanner :phase="phase" />

      <main :key="tab">
        <TaskBoard
          v-if="tab === 'board'"
          :phase="phase"
          :toast="toast"
          @go-journey="tab = 'quest'"
          @complete="completing = $event"
          @abandon="abandoning = $event"
        />
        <Journey v-else-if="tab === 'quest'" @complete="completing = $event" @abandon="abandoning = $event" @go-board="tab = 'board'" />
        <ChainsView v-else-if="tab === 'chains'" :toast="toast" />
        <Panel v-else :toast="toast" />
      </main>
    </div>
  </div>

  <nav class="tabbar" aria-label="移动端主导航">
    <button class="tab-item" :class="{ on: tab === 'board' }" @click="tab = 'board'">
      <span class="nav-icon nav-map" aria-hidden="true" />任务板
    </button>
    <button class="tab-item" :class="{ on: tab === 'quest' }" @click="tab = 'quest'">
      <span class="nav-icon nav-quest" aria-hidden="true" />进行中
      <span v-if="state.active.length" class="tab-badge">{{ state.active.length }}</span>
    </button>
    <button class="tab-item" :class="{ on: tab === 'chains' }" @click="tab = 'chains'">
      <span class="nav-icon nav-chain" aria-hidden="true" />成长线
    </button>
    <button class="tab-item" :class="{ on: tab === 'panel' }" @click="tab = 'panel'">
      <span class="nav-icon nav-panel" aria-hidden="true" />面板
    </button>
  </nav>

  <CompleteModal v-if="completing" :active="completing" @close="completing = null" @done="toast($event)" />
  <AbandonModal v-if="abandoning" :active="abandoning" @close="abandoning = null" @done="toast($event)" />

  <RoamingBuddy />

  <Transition name="toast">
    <div v-if="toastMsg" class="toast" role="status">{{ toastMsg }}</div>
  </Transition>
</template>
