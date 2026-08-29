<script setup>
import { ref, computed } from 'vue'
import { taskById, abandon } from '../store'

const props = defineProps({ active: Object })
const emit = defineEmits(['close', 'done'])

const task = computed(() => taskById[props.active.qid])
const reason = ref('')

function confirm() {
  abandon(props.active, reason.value.trim())
  emit('done', '已放弃，归入墓志铭')
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-title">放弃这条支线？</div>
      <div class="modal-sub">「{{ task.title }}」· 放弃没有惩罚，但要有理由——这是给未来的自己看的。</div>
      <textarea
        class="textarea"
        v-model="reason"
        maxlength="80"
        placeholder="为什么放弃？（会记入墓志铭，季末复盘时可见）"
      ></textarea>
      <div class="modal-actions">
        <button class="btn btn-primary" @click="emit('close')">再坚持一下</button>
        <button class="btn" style="border-color: var(--danger); color: var(--danger)" @click="confirm">确认放弃</button>
      </div>
    </div>
  </div>
</template>
