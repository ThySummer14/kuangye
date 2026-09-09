<script setup>
import { computed } from 'vue'
import { state, acceptState } from '../store'
import ActiveQuestCard from './ActiveQuestCard.vue'

const emit = defineEmits(['complete', 'abandon', 'go-board'])
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
  <div v-else class="empty empty-journey">
    <div class="empty-buddy" aria-hidden="true">芽</div>
    <div class="empty-kicker">你的路还空着一格</div>
    <p>不需要先想清楚整个人生。<br />挑一件今天做得到的事，走出第一步。</p>
    <button class="btn btn-primary" @click="emit('go-board')">去任务板挑一件 <span aria-hidden="true">→</span></button>
  </div>
</template>
