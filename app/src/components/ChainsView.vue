<script setup>
// 成长线：每条链一架梯子——✓ 已完成 / ● 进行中 / ○ 可接取 / × 待解锁
import { CHAINS, DIFF } from '../data/tasks'
import { chainStages, chainUnlocked, canAccept, accept, activeOf, state } from '../store'

const props = defineProps({ toast: Function })

function stageState(t) {
  if (state.done.some((d) => d.qid === t.id)) return 'done'
  if (activeOf(t.id)) return 'active'
  if (chainUnlocked(t)) return 'open'
  return 'locked'
}
const STATE_MARK = { done: '✓', active: '●', open: '○', locked: '×' }
const STATE_TXT = { done: '已完成', active: '进行中', open: '可接取', locked: '完成上一阶段解锁' }

function acceptTask(t) {
  const c = canAccept(t)
  if (!c.ok) return props.toast(c.why)
  accept(t)
  props.toast(`已接取「${t.title}」`)
}
</script>

<template>
  <div class="chains-intro">
    ✦ 由易到难的任务线：完成当前阶段，下一阶段自动解锁。S 级传说任务都藏在这条线的尽头。
  </div>

  <div v-for="(meta, id) in CHAINS" :key="id" class="chain-card">
    <div class="chain-head">
      <span class="ic">{{ meta.icon }}</span>
      <div>
        <div class="chain-name">{{ meta.name }}线</div>
        <div class="chain-desc">{{ meta.desc }}</div>
      </div>
      <span class="chain-progress">
        {{ chainStages[id].filter((t) => stageState(t) === 'done').length }} / {{ chainStages[id].length }}
      </span>
    </div>
    <div class="chain-steps">
      <div v-for="t in chainStages[id]" :key="t.id" class="chain-step" :class="stageState(t)">
        <span class="diff-badge" :class="`diff-${t.diff}`">{{ t.diff }}</span>
        <span class="t">{{ t.title }}</span>
        <span class="chain-xp">+{{ DIFF[t.diff].xp }}</span>
        <span class="st">{{ STATE_MARK[stageState(t)] }} {{ STATE_TXT[stageState(t)] }}</span>
        <button
          v-if="stageState(t) === 'open'"
          class="btn btn-sm btn-primary"
          @click="acceptTask(t)"
        >接取</button>
      </div>
    </div>
  </div>
</template>
