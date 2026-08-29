<script setup>
import { ref, computed } from 'vue'
import { state, now } from './store'
import { seasonPhase, SEASON } from './data/season'
import SeasonBanner from './components/SeasonBanner.vue'
import TaskBoard from './components/TaskBoard.vue'
import Journey from './components/Journey.vue'
import Panel from './components/Panel.vue'
import CompleteModal from './components/CompleteModal.vue'
import AbandonModal from './components/AbandonModal.vue'

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
</script>

<template>
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
    <Panel v-else :toast="toast" />
  </main>

  <nav class="tabbar">
    <button class="tab-item" :class="{ on: tab === 'board' }" @click="tab = 'board'">
      <span class="ic">🗺️</span>任务板
    </button>
    <button class="tab-item" :class="{ on: tab === 'quest' }" @click="tab = 'quest'">
      <span class="ic">⚔️</span>进行中
      <span v-if="state.active.length" class="tab-badge">{{ state.active.length }}</span>
    </button>
    <button class="tab-item" :class="{ on: tab === 'panel' }" @click="tab = 'panel'">
      <span class="ic">🏔️</span>面板
    </button>
  </nav>

  <CompleteModal v-if="completing" :active="completing" @close="completing = null" @done="toast($event)" />
  <AbandonModal v-if="abandoning" :active="abandoning" @close="abandoning = null" @done="toast($event)" />

  <Transition name="toast">
    <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
  </Transition>
</template>
