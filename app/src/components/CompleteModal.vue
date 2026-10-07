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
  today,
  completionIssue,
} from "../store.js";
import { recordedDates, bestRun, rhythmStrip } from "../game/rhythm.js";
import { onwardSuggestion } from "../game/onward.js";
import { prepSuggestion } from "../game/prep-moves.js";
import { readingMilestones } from "../game/town.js";
import { fieldGuide } from "../data/field-guides.js";
import { taskXp } from "../game/personal-tasks.js";
import { lumenReward } from "../game/home.js";
import { studioWorkForTask } from '../game/studio.js';
import { challengeCriteria, challengeRating, challengeCompletionIssue, allChallengeMedals, isLifetimeChallenge } from '../game/challenges.js';
import ChallengeEmblem from './ChallengeEmblem.vue';
import '../challenger.css';
import BuddyFace from "./BuddyFace.vue";
import ModalFrame from "./ModalFrame.vue";
const props = defineProps({ active: Object }),
  emit = defineEmits(["close", "done", "shop", "map", "library", "direction", "write", "studio", "challenger"]);
const work = computed(() => studioWorkForTask(state.home.studio, props.active.qid));
const issue = computed(() => completionIssue(props.active));
const confirmed = ref([]), newMedals = ref([]);
const challenge = computed(() => task.value?.challenge);
const challengeIssue = computed(() => challenge.value ? challengeCompletionIssue(challenge.value, review.value, confirmed.value) : '');
const finishButton = ref(null);
const task = computed(() => taskById[props.active.qid]),
  xp = computed(() => taskXp(task.value)),
  review = ref(""),
  result = ref(false),
  glimmer = ref(0);
async function confirm() {
  const before = state.home.glimmerPaid;
  const earnedBefore = challenge.value ? allChallengeMedals(state).filter(m => m.earned).map(m => m.id) : [];
  if (complete(props.active, review.value.trim(), confirmed.value)) {
    if (challenge.value) newMedals.value = allChallengeMedals(state).filter(m => m.earned && !earnedBefore.includes(m.id));
    glimmer.value = state.home.glimmerPaid - before;
    result.value = true;
    await nextTick();
    finishButton.value?.focus();
  }
}
// 按天任务的回望：这些日子散落在多长的时间里；停过又回来，本身值得被看见。
const footprint = computed(() => {
  if (task.value.type !== "streak") return null;
  const dates = recordedDates(props.active.logs);
  if (!dates.length) return null;
  const end = today() > dates.at(-1) ? today() : dates.at(-1);
  const span = Math.round((new Date(end + "T12:00:00") - new Date(dates[0] + "T12:00:00")) / 86400000) + 1;
  const best = bestRun(props.active.logs);
  return {
    days: dates.length, span, best,
    cells: rhythmStrip(props.active.logs, end, "", Math.min(span, 120)),
    line: dates.length >= span ? `${dates.length} 天，一天也没有空着。` : `${dates.length} 天，散落在 ${span} 天里。停过，也回来了。`,
  };
});
const next = computed(() => (result.value ? nextChainStage(task.value) : null));
// 只给一个「下一件」，不自动接取；今天到这里也完全可以。
const onward = computed(() => result.value && !work.value && !challenge.value ? onwardSuggestion(state, task.value, { day: today(), next: next.value, nextOk: !!next.value && canAccept(next.value).ok }) : null);
function takeOnward() {
  const o = onward.value;
  if (!o?.task || !accept(o.task)) return;
  emit("done", o.kind === "chain" ? "新的成长线，慢慢来" : `已接下「${o.task.title}」，按自己的节奏来。`);
  emit("close");
}
function writeOnward() {
  if (!onward.value?.move) return;
  emit("write", { trail: onward.value.trail, suggestion: prepSuggestion(onward.value.move) });
  emit("close");
}
function finish() {
  if (result.value && onward.value?.trail) emit("direction", onward.value.trail);
  if (result.value)
    emit("done", challenge.value ? "这次突破，已经刻进你的行动档案。" : task.value.personal ? "自己写下的事，也认真做到了。" : `这件事完成了，收获 ${lumenReward(xp.value)} 光`);
  emit("close");
}
function returnToMap() {
  finish();
  emit("map");
}
</script>
<template>
  <ModalFrame
    :class="{ 'challenge-dialog challenge-completion': challenge }"
    :label="result ? '这一件事，收好了' : '记录完成的任务'"
    @close="finish"
    ><template v-if="!result"
      ><span class="eyebrow">{{ challenge ? 'CHALLENGE ACCOMPLISHED' : '完成记录' }}</span>
      <h2>{{ challenge ? '这条边界，你跨过了。' : '这一件事，你做到了。' }}</h2>
      <p class="completion-task">{{ task.title }}</p><p v-if="task.personal && !challenge" class="review-prompt">你定下的完成条件：{{ task.desc }}</p>
      <div v-if="challenge" class="challenge-confirm" role="group" aria-label="确认实际完成的挑战条件"><label v-for="c in challengeCriteria(challenge)" :key="c.id"><input v-model="confirmed" type="checkbox" :value="c.id"/><span>{{ c.condition }}</span></label></div>
      <label for="quest-review"
        >{{ challenge ? "留下你实际完成的结果" : "给未来的自己留一句话" }} <small>{{ challenge ? "（必填）" : "（可选）" }}</small></label
      ><p class="review-prompt">{{ challenge ? "带回什么成果？最难的一步是怎样完成的？" : fieldGuide(task).recall }}</p><textarea
        id="quest-review"
        v-model="review"
        maxlength="160"
        :placeholder="challenge ? '写下具体成果，以及这次如何越过难点。' : fieldGuide(task).recall"
        rows="4"
      />
      <p class="completion-note">{{ challenge ? "按你接取时的条件，诚实地确认这次突破。" : "它也会成为你下一件家具上的小小铭牌。" }}</p>
      <p v-if="challengeIssue" class="review-prompt">{{ challengeIssue }}</p>
      <p v-if="issue" role="alert" class="review-prompt">{{ issue }}<button class="text-button" @click="emit('close'); emit('studio',work.id)">回画室带回作品 ↗</button></p>
      <div class="placement-actions">
        <button class="soft-button" @click="emit('close')">再等等</button
        ><button class="primary-button" :disabled="!!issue || !!challengeIssue" @click="confirm">
          {{ challenge ? "确认完成，留下刻印" : task.personal ? "完成，记下这一刻" : "完成，收下这束光" }}
        </button>
      </div></template
    ><template v-else
      ><div class="completion-result">
        <div v-if="challenge" class="challenge-result"><ChallengeEmblem :motif="newMedals.at(-1)?.motif || (isLifetimeChallenge(challenge)?challenge.operationId:'breach')" /></div>
        <BuddyFace v-else :size="175" mood="celebrate" /><span class="eyebrow"
          >{{ challenge ? "ACTION COMPLETE / 行动完成" : task.personal ? "把这一刻留给自己" : "一点努力，一点光" }}</span
        >
        <h2 v-if="challenge">突破，已刻印。</h2>
        <h2 v-else-if="task.personal" class="personal-completion-heading">你想做的，做到了。</h2>
        <template v-else><h2>＋{{ lumenReward(xp) }} <small>光</small></h2><span class="completion-xp">＋{{ xp }} XP</span></template>
        <p v-if="isLifetimeChallenge(challenge)" class="challenge-rating-result">人生挑战 / 这一枚，属于你的经历</p>
        <p v-else-if="challenge" class="challenge-rating-result">挑战等级 {{ String(challengeRating(challenge)).padStart(2,'0') }} / {{ challenge.terms.length }} 条加码</p>
        <p v-if="newMedals.length" class="challenge-earned-result">新蚀刻章：{{ newMedals.map(m=>m.name).join('、') }}</p>
        <h3>{{ task.title }}</h3>
        <p>{{ review || "今天，又为自己完成了一件事。" }}</p>
        <div v-if="footprint" class="footprint" role="img" :aria-label="footprint.line + (footprint.best >= 2 ? `最长一口气 ${footprint.best} 天。` : '')">
          <ol aria-hidden="true"><li v-for="c in footprint.cells" :key="c.d" :class="{ on: c.on }" /></ol>
          <p>{{ footprint.line }}<small v-if="footprint.best >= 2">最长一口气 {{ footprint.best }} 天</small></p>
        </div>
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
      <button v-if="challenge" class="text-button completion-shop-link" @click="finish(); emit('challenger',challenge.album)">回挑战者，查看蚀刻章与档案 ↗</button>
      <button v-if="task.chain === 'read' && readingMilestones(state.done) > (state.home.town?.library || 0)" class="text-button completion-shop-link" @click="emit('close'); emit('library')">去街角书屋，留下一点变化 ↗</button>
      <button v-if="work" class="text-button completion-shop-link" @click="emit('close'); emit('studio',work.id)">去画室看看这件作品 ↗</button>
      <button
        v-if="!challenge" class="text-button completion-shop-link"
        @click="
          emit('shop');
          emit('close');
        "
      >
        去集市，把这句话安放到一件家具上 ↗</button
      ><section v-if="onward && ['chain', 'same', 'prep'].includes(onward.kind)" class="onward" aria-label="下一件可以是">
        <span class="onward-kicker">{{ onward.kind === 'chain' ? '成长线的下一步' : onward.kind === 'prep' ? '同一个方向，下次可以先做一步准备' : '同一个方向，下次可以是' }}</span>
        <strong>{{ onward.task?.title || onward.move.text }}</strong>
        <p v-if="onward.task">{{ fieldGuide(onward.task).steps[0] }}</p>
        <p v-else>取自「{{ onward.move.task.title }}」的出发手册。</p>
        <button v-if="onward.task" class="soft-button" @click="takeOnward">接下它</button>
        <button v-else class="soft-button" @click="writeOnward">把这一步写成我的事</button>
        <small>不急。今天到这里，也已经很好。</small>
      </section>
      <p v-else-if="onward?.kind === 'hand'" class="onward-hand">手里还有「{{ taskById[onward.active.qid]?.title }}」，按自己的节奏接着来。</p></template
    ></ModalFrame
  >
</template>
<style scoped>
.completion-result h2.personal-completion-heading { font-size: 26px; line-height: 1.5; color: var(--primary); }
.footprint { margin: 18px auto 12px; max-width: 340px; }
.footprint ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 3px; }
.footprint li { width: 9px; height: 9px; border-radius: 3px; background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line); }
.footprint li.on { background: var(--moss); box-shadow: none; }
.completion-result .footprint p { font-size: 13px; color: var(--ink-2); margin: 10px 0 0; }
.footprint small { display: block; margin-top: 2px; font-size: 12px; color: var(--glow-deep); }
.onward { margin: 18px 0 4px; padding: 14px 16px; border-radius: var(--r-s); background: var(--moss-wash); border: 1px dashed var(--line-2); text-align: left; }
.onward-kicker { display: block; font-size: 11.5px; font-weight: 700; color: var(--moss); }
.onward strong { display: block; margin: 6px 0 2px; font-family: var(--serif); font-size: 16px; color: var(--ink); line-height: 1.5; }
.onward p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.7; color: var(--ink-2); }
.onward small { display: block; margin-top: 8px; font-size: 11.5px; color: var(--ink-3); }
.onward-hand { margin: 16px 0 0; text-align: center; font-size: 13px; color: var(--ink-2); }
.review-prompt { font-size: 13px; line-height: 1.7; color: var(--ink-2); margin: 8px 0 12px; }
.completion-saved {
  text-align: center;
  color: #667459;
  font-size: 13px;
  line-height: 1.7;
  margin: 0 0 16px;
}
</style>
