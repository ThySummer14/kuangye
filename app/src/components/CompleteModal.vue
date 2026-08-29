<script setup>
import { ref, computed } from 'vue'
import { taskById, complete } from '../store'
import { DIFF } from '../data/tasks'
import SproutBuddy from './SproutBuddy.vue'

const props = defineProps({ active: Object })
const emit = defineEmits(['close', 'done'])

const task = computed(() => taskById[props.active.qid])
const diff = computed(() => DIFF[task.value.diff])
const review = ref('')
const result = ref(false)

function confirm() {
  complete(props.active, review.value.trim())
  result.value = true
}
function close() {
  emit('done', `任务完成，+${diff.value.xp} XP`)
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
        <div class="modal-actions">
          <button class="btn btn-primary" @click="close">好</button>
        </div>
      </template>
    </div>
  </div>
</template>
