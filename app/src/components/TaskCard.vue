<script setup>
import { computed } from 'vue'
import { CATS, DIFF, TYPES, TYPE_ICONS } from '../data/tasks'
import { canAccept, activeOf, state } from '../store'

const props = defineProps({ task: Object })
const emit = defineEmits(['accept', 'go'])

const cat = computed(() => CATS[props.task.cat])
const diff = computed(() => DIFF[props.task.diff])
const act = computed(() => activeOf(props.task.id))
const archived = computed(() => state.done.some((d) => d.qid === props.task.id))
const cap = computed(() => canAccept(props.task))

const typeLabel = computed(() => {
  const base = `${TYPE_ICONS[props.task.type]} ${TYPES[props.task.type]}`
  if (props.task.target) return `${base} · ${props.task.target}${props.task.unit || '天'}`
  return base
})
</script>

<template>
  <div class="task-card" :class="{ 'done-archived': archived }" :style="{ '--cat-color': cat.color }">
    <div class="tc-head">
      <span class="diff-badge" :class="`diff-${task.diff}`">{{ task.diff }}</span>
      <span class="tc-title">{{ task.title }}</span>
      <span class="cat-tag">{{ cat.name }}</span>
    </div>
    <div class="tc-desc">{{ task.desc }}</div>
    <div class="tc-foot">
      <span class="tc-meta">
        <span class="tc-xp">+{{ diff.xp }} XP</span>
        <span>{{ typeLabel }}</span>
      </span>
      <span style="flex: 1"></span>
      <button v-if="archived" class="btn btn-sm" disabled>✓ 已归档</button>
      <button v-else-if="act" class="btn btn-sm" @click="emit('go')">进行中 →</button>
      <button
        v-else
        class="btn btn-sm btn-primary"
        :disabled="!cap.ok"
        :title="cap.ok ? '' : cap.why"
        @click="cap.ok && emit('accept', task)"
      >{{ cap.ok ? '＋ 接取' : '接满' }}</button>
    </div>
  </div>
</template>
