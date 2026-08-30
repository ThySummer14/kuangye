<script setup>
import { computed } from 'vue'
import { state, acceptState } from '../store'
import ActiveQuestCard from './ActiveQuestCard.vue'
import SproutBuddy from './SproutBuddy.vue'

const emit = defineEmits(['complete', 'abandon'])
const counts = computed(() => acceptState())
</script>

<template>
  <div class="section-h">
    <span class="t">进行中</span>
    <span class="s">{{ counts.total }} / 3 · 赛季级 ≤2 · 本章 ≤2</span>
    <span class="line" />
  </div>

  <div v-if="state.active.length" class="card-grid">
    <ActiveQuestCard
      v-for="a in state.active"
      :key="a.qid"
      :active="a"
      @complete="emit('complete', a)"
      @abandon="emit('abandon', a)"
    />
  </div>
  <div v-else class="empty">
    <SproutBuddy :size="72" ambient />
    <p style="margin-top: 6px">还没有进行中的支线。<br />去任务板接一个——别贪多，先接一个。</p>
  </div>
</template>
