<script setup>
import { ref, computed } from 'vue'
import { TASKS, CATS } from '../data/tasks'
import { canAccept, accept } from '../store'
import { SEASON } from '../data/season'
import TaskCard from './TaskCard.vue'

const props = defineProps({ phase: Object, toast: Function })
const emit = defineEmits(['go-journey'])

const filter = ref('all')
const catIds = Object.keys(CATS)

const seasonTasks = computed(() =>
  TASKS.filter((t) => t.tier === 'season' && (filter.value === 'all' || t.cat === filter.value))
)
const chapterTasks = computed(() =>
  TASKS.filter(
    (t) => t.tier === 'chapter' && t.chapter === props.phase.chapter && (filter.value === 'all' || t.cat === filter.value)
  )
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

  <div class="section-h">
    <span class="t">本章 · {{ SEASON.chapters[phase.chapter].name }}</span>
    <span class="s">当章有效 · 最多同时 2 个</span>
    <span class="line" />
  </div>
  <div class="card-grid">
    <TaskCard v-for="t in chapterTasks" :key="t.id" :task="t" @accept="acceptTask" @go="emit('go-journey')" />
  </div>

  <div class="section-h">
    <span class="t">常驻区</span>
    <span class="s">赛季级任务 · 全季有效 · 最多同时 2 个</span>
    <span class="line" />
  </div>
  <div class="card-grid">
    <TaskCard v-for="t in seasonTasks" :key="t.id" :task="t" @accept="acceptTask" @go="emit('go-journey')" />
  </div>

  <div style="height: 8px"></div>
</template>
