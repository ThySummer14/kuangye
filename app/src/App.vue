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
import SproutBuddy from './components/SproutBuddy.vue'

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

// 侧栏底部的一句话状态
const seasonLine = computed(() => {
  if (phase.value.phase === 'pre') return `距 S1 开赛 ${phase.value.daysToStart} 天`
  if (phase.value.phase === 'active') return `S1 第 ${phase.value.dayInSeason} 天`
  return '赛季结算期'
})
</script>

<template>
  <div class="shell">
    <!-- 桌面侧边栏（≥900px 出现） -->
    <aside class="sidebar">
      <div class="side-brand">
        <div class="wordmark">旷野</div>
        <div class="wordmark-sub">人生支线任务</div>
        <div class="season-chip side-chip">{{ SEASON.id }} · {{ SEASON.name }}</div>
      </div>
      <nav class="side-nav">
        <button class="side-link" :class="{ on: tab === 'board' }" @click="tab = 'board'">
          <span class="ic">🗺️</span>任务板
        </button>
        <button class="side-link" :class="{ on: tab === 'quest' }" @click="tab = 'quest'">
          <span class="ic">⚔️</span>进行中
          <span v-if="state.active.length" class="side-badge">{{ state.active.length }}</span>
        </button>
        <button class="side-link" :class="{ on: tab === 'chains' }" @click="tab = 'chains'">
          <span class="ic">🌱</span>成长线
        </button>
        <button class="side-link" :class="{ on: tab === 'panel' }" @click="tab = 'panel'">
          <span class="ic">🏔️</span>生涯面板
        </button>
      </nav>
      <div class="side-foot">
        <SproutBuddy :size="68" ambient />
        <div class="side-foot-txt">{{ seasonLine }}</div>
      </div>
    </aside>

    <div class="content">
      <header class="app-header">
        <div>
          <div class="wordmark">旷野</div>
          <div class="wordmark-sub">人生支线任务</div>
        </div>
        <div class="season-chip">{{ SEASON.id }} · {{ SEASON.name }}</div>
      </header>

      <SeasonBanner :phase="phase" />

      <!-- :key 让每次切换视图都重放入场动效 -->
      <main :key="tab">
        <TaskBoard v-if="tab === 'board'" :phase="phase" :toast="toast" @go-journey="tab = 'quest'" />
        <Journey v-else-if="tab === 'quest'" @complete="completing = $event" @abandon="abandoning = $event" />
        <ChainsView v-else-if="tab === 'chains'" :toast="toast" />
        <Panel v-else :toast="toast" />
      </main>
    </div>

    <!-- 移动端底部胶囊导航 -->
    <nav class="tabbar">
      <button class="tab-item" :class="{ on: tab === 'board' }" @click="tab = 'board'">
        <span class="ic">🗺️</span>任务板
      </button>
      <button class="tab-item" :class="{ on: tab === 'quest' }" @click="tab = 'quest'">
        <span class="ic">⚔️</span>进行中
        <span v-if="state.active.length" class="tab-badge">{{ state.active.length }}</span>
      </button>
      <button class="tab-item" :class="{ on: tab === 'chains' }" @click="tab = 'chains'">
        <span class="ic">🌱</span>成长线
      </button>
      <button class="tab-item" :class="{ on: tab === 'panel' }" @click="tab = 'panel'">
        <span class="ic">🏔️</span>面板
      </button>
    </nav>
  </div>

  <CompleteModal v-if="completing" :active="completing" @close="completing = null" @done="toast($event)" />
  <AbandonModal v-if="abandoning" :active="abandoning" @close="abandoning = null" @done="toast($event)" />

  <Transition name="toast">
    <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
  </Transition>
</template>
