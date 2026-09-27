<script setup>
import { ref, computed, nextTick } from "vue";
import {
  taskById,
  complete,
  canAccept,
  accept,
  nextChainStage,
  state,
  saveWarning,
} from "../store.js";
import { fieldGuide } from "../data/field-guides.js";
import { taskXp } from "../game/personal-tasks.js";
import { lumenReward } from "../game/home.js";
import BuddyFace from "./BuddyFace.vue";
import ModalFrame from "./ModalFrame.vue";
const props = defineProps({ active: Object }),
  emit = defineEmits(["close", "done", "shop", "map"]);
const finishButton = ref(null);
const task = computed(() => taskById[props.active.qid]),
  xp = computed(() => taskXp(task.value)),
  review = ref(""),
  result = ref(false),
  glimmer = ref(0);
async function confirm() {
  const before = state.home.glimmerPaid;
  if (complete(props.active, review.value.trim())) {
    glimmer.value = state.home.glimmerPaid - before;
    result.value = true;
    await nextTick();
    finishButton.value?.focus();
  }
}
const next = computed(() => (result.value ? nextChainStage(task.value) : null));
function finish() {
  if (result.value)
    emit("done", task.value.personal ? "自己写下的事，也认真做到了。" : `这件事完成了，收获 ${lumenReward(xp.value)} 光`);
  emit("close");
}
function returnToMap() {
  finish();
  emit("map");
}
function nextTask() {
  if (accept(next.value)) {
    emit("done", "新的成长线，慢慢来");
    emit("close");
  }
}
</script>
<template>
  <ModalFrame
    :label="result ? '这一件事，收好了' : '记录完成的任务'"
    @close="finish"
    ><template v-if="!result"
      ><span class="eyebrow">A LITTLE MOMENT TO REMEMBER</span>
      <h2>这一件事，你做到了。</h2>
      <p class="completion-task">{{ task.title }}</p><p v-if="task.personal" class="review-prompt">你定下的完成条件：{{ task.desc }}</p>
      <label for="quest-review"
        >给未来的自己留一句话 <small>（可选）</small></label
      ><p class="review-prompt">{{ fieldGuide(task).recall }}</p><textarea
        id="quest-review"
        v-model="review"
        maxlength="160"
        :placeholder="fieldGuide(task).recall"
        rows="4"
      />
      <p class="completion-note">它也会成为你下一件家具上的小小铭牌。</p>
      <div class="placement-actions">
        <button class="soft-button" @click="emit('close')">再等等</button
        ><button class="primary-button" @click="confirm">
          {{ task.personal ? "完成，记下这一刻" : "完成，收下这束光" }}
        </button>
      </div></template
    ><template v-else
      ><div class="completion-result">
        <BuddyFace :size="175" mood="celebrate" /><span class="eyebrow"
          >{{ task.personal ? "把这一刻留给自己" : "一点努力，一点光" }}</span
        >
        <h2 v-if="task.personal" class="personal-completion-heading">你想做的，做到了。</h2>
        <template v-else><h2>＋{{ lumenReward(xp) }} <small>光</small></h2><span class="completion-xp">＋{{ xp }} XP</span></template>
        <h3>{{ task.title }}</h3>
        <p>{{ review || "今天，又为自己完成了一件事。" }}</p>
        <p v-if="glimmer" class="glimmer-gift">
          这七天的微光，又凝成了 {{ glimmer }} 点光。
        </p>
      </div>
      <p class="completion-saved" role="status">
        {{ saveWarning.text || (saveWarning.pending ? "正在保存这一刻…" : "已记入成长手记。这一件事，收好了。") }}
      </p>
      <button
        ref="finishButton"
        class="primary-button full-button"
        @click="returnToMap"
      >
        {{ (saveWarning.text || saveWarning.pending) ? "回到地图" : "收好了，回到地图" }}
      </button>
      <button
        class="text-button completion-shop-link"
        @click="
          emit('shop');
          emit('close');
        "
      >
        去集市，把这句话安放到一件家具上 ↗</button
      ><button
        v-if="next && canAccept(next).ok"
        class="text-button"
        @click="nextTask"
      >
        接下成长线的下一步</button
      ></template
    ></ModalFrame
  >
</template>
<style scoped>
.completion-result h2.personal-completion-heading { font-size: 26px; line-height: 1.5; color: var(--primary); }
.review-prompt { font-size: 13px; line-height: 1.7; color: var(--ink-2); margin: 8px 0 12px; }
.completion-saved {
  text-align: center;
  color: #667459;
  font-size: 13px;
  line-height: 1.7;
  margin: 0 0 16px;
}
</style>
