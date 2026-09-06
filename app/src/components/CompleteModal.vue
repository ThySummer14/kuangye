<script setup>
import { ref, computed } from 'vue'
import { taskById, complete, canAccept, accept, nextChainStage } from '../store'
import { DIFF } from '../data/tasks'
import SproutBuddy from './SproutBuddy.vue'

const props = defineProps({ active: Object })
const emit = defineEmits(['close', 'done'])

const task = computed(() => taskById[props.active.qid])
const diff = computed(() => DIFF[task.value.diff])
const review = ref('')
const result = ref(false)

function confirm() {
  if (!complete(props.active, review.value.trim())) return
  result.value = true
}
function close() {
  emit('done', `任务完成，+${diff.value.xp} XP`)
  emit('close')
}

// 完成后若解锁了成长线下一阶段，直接在结算页给入口——不占任务板位
const nextTask = computed(() => (result.value ? nextChainStage(task.value) : null))
const nextOk = computed(() => (nextTask.value ? canAccept(nextTask.value).ok : false))
function acceptNext() {
  if (!nextOk.value) return
  accept(nextTask.value)
  emit('done', `已接取下一阶段「${nextTask.value.title}」`)
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="!result && emit('close')">
    <div class="modal">
      <template v-if="!result">
        <div class="modal-title">宣布完成</div>
        <div class="modal-sub">「{{ task.title }}」· +{{ diff.xp }} XP</div>
        <textarea
          class="textarea"
          v-model="review"
          maxlength="80"
          placeholder="一句话回顾（可选）：这一趟你经历了什么？"
        ></textarea>
        <div class="modal-actions">
          <button class="btn" @click="emit('close')">再等等</button>
          <button class="btn btn-primary" @click="confirm">完成，结算！</button>
        </div>
      </template>
      <template v-else>
        <div class="result-hero">
          <SproutBuddy :size="92" mood="celebrate" />
          <div class="xp">+{{ diff.xp }} XP</div>
          <div class="t serif">「{{ task.title }}」</div>
          <div class="s">{{ review || '已完成，收入生涯档案。' }}</div>
        </div>
        <div v-if="nextTask" class="next-stage">
          <div class="ns-label">✦ 成长线解锁下一阶段</div>
          <div class="ns-row">
            <span class="diff-badge" :class="`diff-${nextTask.diff}`">{{ nextTask.diff }}</span>
            <span class="ns-title">{{ nextTask.title }}</span>
            <button class="btn btn-sm btn-primary" :disabled="!nextOk" @click="acceptNext">接取下一阶段</button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="close">好</button>
        </div>
      </template>
    </div>
  </div>
</template>
