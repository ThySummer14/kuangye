<script setup>
import { computed } from 'vue'
import { SEASON, chapterRange, fmtDate } from '../data/season'
import { now } from '../store'

const props = defineProps({ phase: Object })

const ch = computed(() => SEASON.chapters[props.phase.chapter])
const range = computed(() => {
  const [a, b] = chapterRange(props.phase.chapter)
  return `${fmtDate(a)} – ${fmtDate(b)}`
})
const seasonRange = computed(() => {
  const [a] = chapterRange(0)
  const [, b] = chapterRange(2)
  return `${fmtDate(a)} – ${fmtDate(b)}`
})
// 本章时间进度（0–1）
const frac = computed(() => {
  if (props.phase.phase !== 'active') return 0
  const [a, b] = chapterRange(props.phase.chapter)
  const t = (now().getTime() - a.getTime()) / (b.getTime() - a.getTime())
  return Math.min(1, Math.max(0.02, t))
})
</script>

<template>
  <div class="season-banner">
    <div class="banner-top">
      <span class="banner-season">{{ SEASON.id }}「{{ SEASON.name }}」</span>
      <span v-if="phase.phase === 'pre'" class="banner-tag">序章 · 秋分开赛</span>
      <span v-else-if="phase.phase === 'active'" class="banner-tag">进行中</span>
      <span v-else class="banner-tag">已收官</span>
    </div>
    <div class="banner-motto">「{{ SEASON.motto }}」</div>

    <template v-if="phase.phase === 'pre'">
      <div class="banner-meta">
        <span class="banner-chapter">距开赛还有 {{ phase.daysToStart }} 天</span>
        <span class="banner-count">{{ seasonRange }}</span>
      </div>
      <div class="banner-hint">序章期间可先接取任务试玩，进度自动带入 S1。</div>
    </template>

    <template v-else-if="phase.phase === 'active'">
      <div class="banner-meta">
        <span class="banner-chapter">本章 · {{ ch.name }}</span>
        <span class="banner-count">第 {{ phase.dayInSeason }} 天 · {{ range }}</span>
      </div>
      <div class="chapter-bar"><i :style="{ '--p': frac }" /></div>
      <div class="banner-hint">{{ ch.hint }}</div>
    </template>

    <template v-else>
      <div class="banner-meta">
        <span class="banner-chapter">赛季结算期</span>
      </div>
      <div class="banner-hint">S1 已收官，战报整理中——下一季见。</div>
    </template>
  </div>
</template>
