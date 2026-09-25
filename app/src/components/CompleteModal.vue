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
import { DIFF } from "../data/tasks.js";
import { lumenReward } from "../game/home.js";
import BuddyFace from "./BuddyFace.vue";
import ModalFrame from "./ModalFrame.vue";
const props = defineProps({ active: Object }),
  emit = defineEmits(["close", "done", "shop", "map"]);
const finishButton = ref(null);
const task = computed(() => taskById[props.active.qid]),
  diff = computed(() => DIFF[task.value.diff]),
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
    emit("done", `这件事完成了，收获 ${lumenReward(diff.value.xp)} 光`);
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
    :label="result ? '完成小事，收获光' : '记录完成的任务'"
    @close="finish"
    ><template v-if="!result"
      ><span class="eyebrow">A LITTLE MOMENT TO REMEMBER</span>
      <h2>这一件事，你做到了。</h2>
      <p class="completion-task">{{ task.title }}</p>
      <label for="quest-review"
        >给未来的自己留一句话 <small>（可选）</small></label
      ><textarea
        id="quest-review"
        v-model="review"
        maxlength="160"
        placeholder="这一趟，发生了什么值得记住的事？"
        rows="4"
      />
      <p class="completion-note">它也会成为你下一件家具上的小小铭牌。</p>
      <div class="placement-actions">
        <button class="soft-button" @click="emit('close')">再等等</button
        ><button class="primary-button" @click="confirm">
          完成，收下这束光
        </button>
      </div></template
    ><template v-else
      ><div class="completion-result">
        <BuddyFace :size="175" mood="celebrate" /><span class="eyebrow"
          >一点努力，一点光</span
        >
        <h2>＋{{ lumenReward(diff.xp) }} <small>光</small></h2>
        <span class="completion-xp">＋{{ diff.xp }} XP</span>
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
        class="text-button"
        @click="
          emit('shop');
          emit('close');
        "
      >
        去集市，给小家添一点温暖 ↗</button
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
.completion-saved {
  text-align: center;
  color: #667459;
  font-size: 13px;
  line-height: 1.7;
  margin: 0 0 16px;
}
</style>
