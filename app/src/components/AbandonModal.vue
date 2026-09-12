<script setup>
import { ref, computed } from "vue";
import { taskById, abandon } from "../store.js";
import BuddyFace from "./BuddyFace.vue";
import ModalFrame from "./ModalFrame.vue";
const props = defineProps({ active: Object }),
  emit = defineEmits(["close", "done"]);
const reason = ref(""),
  task = computed(() => taskById[props.active.qid]);
function confirm() {
  if (abandon(props.active, reason.value.trim())) {
    emit("done", "先放一放，过去的努力不会消失");
    emit("close");
  }
}
</script>
<template>
  <ModalFrame label="暂时放下任务" @close="emit('close')"
    ><div class="completion-result">
      <BuddyFace :size="125" mood="sad" />
      <h2>把这件事，先放一放。</h2>
      <p>{{ task.title }}</p>
    </div>
    <label for="rest-reason">想留下一句话吗？（可选）</label
    ><textarea
      id="rest-reason"
      v-model="reason"
      maxlength="160"
      placeholder="也许现在，有更想做的事。"
    />
    <p class="completion-note">不会扣除光或经验。记录会留在成长手记里。</p>
    <div class="placement-actions">
      <button class="soft-button" @click="emit('close')">继续做这件事</button
      ><button class="primary-button" @click="confirm">暂时放下</button>
    </div></ModalFrame
  >
</template>
