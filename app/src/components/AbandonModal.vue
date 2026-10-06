<script setup>
import { ref, computed } from "vue";
import { state, taskById, abandon, progressOf } from "../store.js";
import { studioWorkForTask } from '../game/studio.js';
import BuddyFace from "./BuddyFace.vue";
import ModalFrame from "./ModalFrame.vue";
const props = defineProps({ active: Object }),
  emit = defineEmits(["close", "done"]);
const reason = ref(""),
  task = computed(() => taskById[props.active.qid]);
// 放下不清零：攒下的日子与数量会留着，再接起来接着数。
const kept = computed(() => {
  if (studioWorkForTask(state.home.studio,props.active.qid)) return { title: '这件作品和当时的记录，都还在。', detail: '已保存的正文和图片会留在画室。以后想继续，到画室接着做这件作品；原任务会保留在手记里。' };
  if (task.value.challenge) return { title: '这次尝试，仍然留在行动档案里。', detail: '挑战条件和暂放原因会保留。回来后，可以在挑战者专辑重新选条件，再开始一次。' };
  if (task.value.personal) return { title: "这件事会收进手记。", detail: "自己写下的内容会保留原样。以后想继续，可以到岩壁重新写一件。" };
  const p = progressOf(props.active);
  if (p.cur && task.value.type === "streak") return {
    title: `攒下的 ${p.cur} 天，都还在。`,
    detail: `这 ${p.cur} 天仍在「攒下的日子」里。以后再接起，从 ${p.cur} / ${p.target} 天继续。`,
  };
  if (p.cur && task.value.type === "total") return {
    title: `记下的 ${p.cur}${task.value.unit || ""}，都还在。`,
    detail: "这些记录会留在手记里。以后再接起来，接着累计。",
  };
  return { title: "先腾出一点余地。", detail: "以后想做时，可以从手记重新接起这件事。" };
});
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
    <section class="rest-kept" aria-label="保留的记录">
      <strong>{{ kept.title }}</strong>
      <p>{{ kept.detail }}</p>
    </section>
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
<style scoped>
.completion-result h2 { font: 500 26px/1.5 var(--serif); color: var(--ink); }
.completion-result > p { color: var(--ink-2); font-size: 14px; line-height: 1.7; }
.rest-kept { padding: 16px 18px; margin: 0 0 20px; border-left: 3px solid var(--moss); border-radius: 0 var(--r-s) var(--r-s) 0; background: var(--moss-wash); }
.rest-kept strong { color: var(--moss-deep); font: 600 18px/1.6 var(--serif); }
.rest-kept p { margin: 6px 0 0; color: var(--ink-2); font-size: 13px; line-height: 1.8; }
.completion-note { color: var(--ink-2); line-height: 1.7; }
@media (max-width: 520px) { .rest-kept { padding: 14px; } .completion-result h2 { font-size: 23px; } }
</style>
