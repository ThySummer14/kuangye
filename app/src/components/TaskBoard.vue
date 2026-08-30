<script setup>
import { ref, computed } from 'vue'
import { TASKS, CATS, DIFF, CHAINS } from '../data/tasks'
import { canAccept, accept, chainUnlocked } from '../store'
import TaskCard from './TaskCard.vue'

const props = defineProps({ phase: Object, toast: Function })
const emit = defineEmits(['go-journey'])

const filter = ref('all')
const catIds = Object.keys(CATS)
const DIFF_ORDER = ['E', 'D', 'C', 'B', 'A', 'S']

// 按难度分区；未解锁的成长线阶段不上板（不占位）
const groups = computed(() =>
  DIFF_ORDER.map((d) => ({
    diff: d,
    meta: DIFF[d],
    list: TASKS.filter(
      (t) => t.diff === d && chainUnlocked(t) && (filter.value === 'all' || t.cat === filter.value)
    ),
  })).filter((g) => g.list.length)
)

function acceptTask(task) {
  const c = canAccept(task)
  if (!c.ok) return props.toast(c.why)
  accept(task)
  props.toast(`已接取「${task.title}」`)
}
</script>

<template>
  <div class="chips">
    <button class="chip" :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
    <button
      v-for="c in catIds"
      :key="c"
      class="chip"
      :class="{ on: filter === c }"
      @click="filter = c"
    >{{ CATS[c].name }}</button>
  </div>
  <div class="board-note">同时进行 ≤3 · 赛季级 ≤2 · 本章 ≤2 · 完成一阶段解锁下一阶段</div>

  <template v-for="g in groups" :key="g.diff">
    <div class="section-h">
      <span class="diff-badge" :class="`diff-${g.diff}`">{{ g.diff }}</span>
      <span class="t">{{ g.meta.name }}级</span>
      <span class="s">{{ g.list.length }} 条可接</span>
      <span class="line" />
    </div>
    <div class="card-grid">
      <TaskCard v-for="t in g.list" :key="t.id" :task="t" @accept="acceptTask" @go="emit('go-journey')" />
    </div>
  </template>

  <div style="height: 8px"></div>
</template>
