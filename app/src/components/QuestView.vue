<script setup>
import { ref, shallowRef, computed, nextTick } from "vue";
import { CATS, DIFF, TYPES, CHAINS } from "../data/tasks.js";
import { taskContext, PLACES } from "../data/task-context.js";
import { QA } from "../game/qa.js";
import { selectTasks } from "../game/task-selection.js";
import {
  state,
  accept,
  canAccept,
  taskById,
  checkIn,
  checkedToday,
  progressOf,
  reached,
  logUnits,
  useShield,
  canUseShield,
} from "../store.js";
import { lumenReward } from "../game/home.js";
import BuddyFace from "./BuddyFace.vue";
import QuestTrails from "./QuestTrails.vue";
import ActionPlan from "./ActionPlan.vue";
import TaskGuide from "./TaskGuide.vue";
import { TRAILS, fieldGuide } from "../data/field-guides.js";
const trailId = ref("");
const minutes = ref(0), place = ref("all");
// Keep canonical task identity for the store’s chain eligibility lookup.
const inspecting = shallowRef(null);
const resultsHeading = ref(null);
const trail = computed(() => TRAILS.find(item => item.id === trailId.value));
async function selectTrail(id) {
  minutes.value = 0;
  place.value = "all";
  trailId.value = id;
  cat.value = "all";
  query.value = "";
  scope.value = "today";
  await nextTick();
  resultsHeading.value?.focus({ preventScroll: true });
  resultsHeading.value?.scrollIntoView({ block: "start", behavior: "instant" });
}
async function acceptGuide(task) {
  if (!canAccept(task).ok) return;
  inspecting.value = null;
  await nextTick();
  await take(task);
}
const emit = defineEmits(["complete", "abandon", "toast", "chains"]);
const cat = ref("all"),
  scope = ref("today"),
  query = ref(""),
  amounts = ref({});
const list = computed(() => {
  const tasks = selectTasks(state, {
    cat: cat.value, scope: trail.value ? "all" : scope.value, query: query.value, minutes: minutes.value, place: place.value,
  });
  return trail.value ? tasks.filter(task => trail.value.tasks.includes(task.id)) : tasks;
});
const scopeLabel = computed(() => scope.value === "today" ? "今天可做" : "任务库");
function effort(t) {
  if (t.type === "once") return "一次完成";
  if (t.type === "streak") return `连续 ${t.target} 天`;
  return `累计 ${t.target}${t.unit || "次"}`;
}
function tierLabel(t) {
  if (t.chain) return `${CHAINS[t.chain]?.name || "成长线"} · 第 ${t.stage} 阶段`;
  return t.tier === "chapter" ? `本章 · 第 ${t.chapter + 1} 章` : "赛季任务";
}
const activeCards = new Map();
const searchInput = ref(null);
function cardRef(id, element) {
  if (element) activeCards.set(id, element);
  else activeCards.delete(id);
}
async function take(t) {
  const c = canAccept(t);
  if (!c.ok) {
    emit("toast", c.why);
    return;
  }
  accept(t);
  emit("toast", `已接下「${t.title}」，按自己的节奏来。`);
  await nextTick();
  const card = activeCards.get(t.id);
  card?.focus({ preventScroll: true });
  card?.scrollIntoView({ block: "center", behavior: "instant" });
}
async function clearFilters() {
  minutes.value = 0;
  place.value = "all";
  trailId.value = "";
  query.value = "";
  cat.value = "all";
  scope.value = "today";
  await nextTick();
  searchInput.value?.focus();
}
function log(a) {
  if (logUnits(a, amounts.value[a.qid])) {
    emit("toast", "这一点进度，记住了");
    amounts.value[a.qid] = "";
  } else emit("toast", "填一个大于 0 的数量吧");
}
</script>
<template>
  <div class="quests">
    <section class="quest-intro">
      <div>
        <span class="eyebrow">SMALL STEPS INTO REAL LIFE</span>
        <h2>今天，给自己一件做得到的事。</h2>
        <p>在生活里完成它，带着一点光回来。诚实记录，就已经很好。</p>
      </div>
      <BuddyFace :size="125" />
    </section>
    <section class="active-section">
      <div class="section-title">
        <h3>
          进行中的任务 <span>{{ state.active.length }} / 3</span>
        </h3>
        <span>不赶进度，专心做完一件</span>
      </div>
      <div v-if="!state.active.length" class="active-empty">
        还没出发也没关系。从下面挑一件心动的小事吧。
      </div>
      <div v-else class="active-grid">
        <article v-for="a in state.active" :key="a.qid" class="active-card"
          :ref="el => cardRef(a.qid, el)" :data-active-task="a.qid"
          tabindex="-1" :aria-label="'已接下：' + taskById[a.qid].title">
          <div class="task-meta">
            <span>{{ CATS[taskById[a.qid].cat].name }}</span
            ><span>✦ {{ lumenReward(DIFF[taskById[a.qid].diff].xp) }} 光</span>
          </div>
          <h3>{{ taskById[a.qid].title }}</h3>
          <p>{{ taskById[a.qid].desc }}</p>
          <ActionPlan :active="a" :suggestion="fieldGuide(taskById[a.qid]).steps[0]" />
          <button class="text-button guide-link" @click="inspecting = taskById[a.qid]">打开出发手册 ↗</button>
          <template v-if="taskById[a.qid].type !== 'once'"
            ><div class="task-progress">
              <i
                :style="{
                  width:
                    Math.min(
                      100,
                      (progressOf(a).cur / progressOf(a).target) * 100,
                    ) + '%',
                }"
              />
            </div>
            <small
              >{{ progressOf(a).cur }} / {{ progressOf(a).target }}
              {{ taskById[a.qid].type === "streak" ? "天" : taskById[a.qid].unit }}</small
            ></template
          >
          <div class="task-actions">
            <button
              v-if="taskById[a.qid].type === 'streak'"
              class="soft-button"
              :disabled="checkedToday(a)"
              @click="checkIn(a) && emit('toast', '今天的微光，收到了。')"
            >
              {{ checkedToday(a) ? "今天已记录 ✓" : "记录今天" }}
            </button>
            <form
              v-if="taskById[a.qid].type === 'total'"
              class="log-form"
              @submit.prevent="log(a)"
            >
              <input
                v-model="amounts[a.qid]"
                :aria-label="`${taskById[a.qid].title}本次数量`"
                type="number"
                min="0.01"
                step="any"
                :placeholder="'本次数量' + (taskById[a.qid].unit ? '（' + taskById[a.qid].unit + '）' : '')"
                required
              /><button class="soft-button">记录</button>
            </form>
            <button
              v-if="taskById[a.qid].type === 'once' || reached(a)"
              class="primary-button"
              @click="emit('complete', a)"
            >
              我完成了</button
            ><button
              v-if="canUseShield(a)"
              class="text-button"
              @click="useShield(a)"
            >
              补记昨天</button
            ><button class="text-button" @click="emit('abandon', a)">
              先放一放
            </button>
          </div>
        </article>
      </div>
    </section>
    <section class="task-context-picker" aria-label="按时间和场景找任务">
      <div><strong>今天，留多少时间给自己？</strong><p>一次完成的参考用时，不是倒计时。选“都看看”可以找长期任务。</p></div>
      <div class="context-options" role="group" aria-label="参考用时">
        <button v-for="option in [{value:0,label:'都看看'},{value:10,label:'约 10 分钟内'},{value:30,label:'约 30 分钟内'},{value:60,label:'约 1 小时内'}]" :key="option.value"
          :aria-pressed="minutes === option.value" @click="minutes = option.value; trailId = ''">{{ option.label }}</button>
      </div>
      <div class="context-options" role="group" aria-label="行动场景">
        <button v-for="option in [{value:'all',label:'地点不限'},{value:'inside',label:'在室内'},{value:'outside',label:'去户外'}]" :key="option.value"
          :aria-pressed="place === option.value" @click="place = option.value; trailId = ''">{{ option.label }}</button>
      </div>
      <p v-if="QA" class="draft-note">试用任务库 · 含 15 件待审小事，仅使用独立试用存档。</p>
    </section>
    <details class="trail-disclosure">
      <summary>还没想好？从一个生活方向找起</summary>
      <QuestTrails :selected="trailId" @select="selectTrail" />
    </details>
    <div class="quest-filters">
      <div class="place-tabs">
        <button :class="{ active: scope === 'today' }" @click="scope = 'today'; trailId = ''">
          今天可做</button
        ><button :class="{ active: scope === 'all' }" @click="scope = 'all'; trailId = ''">
          任务库</button
        ><button @click="emit('chains')">成长线 ↗</button>
      </div>
      <input
        ref="searchInput"
        v-model="query"
        @input="trailId = ''"
        aria-label="搜索任务"
        placeholder="搜索一件想做的事…"
        class="search-input"
      />
    </div>
    <div class="category-tabs">
      <button :class="{ active: cat === 'all' }" @click="cat = 'all'">
        全部</button
      ><button
        v-for="(c, id) in CATS"
        :key="id"
        :class="{ active: cat === id }"
        @click="cat = id"
      >
        {{ c.name }}
      </button>
    </div>
    <p class="search-scope" role="status">
      {{ trail ? trail.title : scopeLabel }} · {{ cat === 'all' ? '全部领域' : CATS[cat].name }} · {{ list.length }} 条
      <span v-if="scope === 'today' && !trail && !minutes && place === 'all'">（优先热身与入门任务）</span>
      <span v-if="minutes"> · 约 {{ minutes }} 分钟内</span>
      <span v-if="place !== 'all'"> · {{ PLACES[place] }}</span>
      <span v-if="query.trim()"> · 搜索“{{ query.trim() }}”</span>
    </p>
    <div class="quest-section-heading">
      <h3 ref="resultsHeading" tabindex="-1">{{ trail ? trail.title : "选择下一件" }}</h3>
      <span>先选一件做得到的，再慢慢走远。</span>
    </div>
    <div class="quest-grid">
      <article v-for="t in list" :key="t.id" class="quest-card">
        <div class="task-meta">
          <span :style="{ color: CATS[t.cat].color }"
            >{{ CATS[t.cat].name }} · {{ DIFF[t.diff].name }}</span
          ><span>{{ TYPES[t.type] }}</span>
        </div>
        <h3>{{ t.title }}</h3>
        <p>{{ t.desc }}</p>
        <button class="text-button guide-link" :aria-label="t.title + '：看看怎么开始'" @click="inspecting = t">看看怎么开始 ↗</button>
        <div class="task-effort">
          <span>{{ effort(t) }}</span><span v-if="taskContext(t)">约 {{ taskContext(t).minutes }} 分钟 · {{ PLACES[taskContext(t).place] }}</span><span>{{ t.reviewStatus === 'pending-review' ? '试用小事' : tierLabel(t) }}</span>
        </div>
        <div class="quest-card-footer">
          <span class="price"
            >✦ {{ lumenReward(DIFF[t.diff].xp) }} <small>光</small
            ><i>＋{{ DIFF[t.diff].xp }} XP</i></span
          ><div class="quest-card-action">
            <small v-if="!canAccept(t).ok" class="accept-note">{{ canAccept(t).why }}</small>
            <button
              class="soft-button"
              :disabled="!canAccept(t).ok"
              :title="canAccept(t).why"
              @click="take(t)"
            >
              {{ canAccept(t).ok ? "接取任务 ＋" : "暂不可接取" }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-if="!list.length" class="active-empty">
      {{ trail ? "这个方向暂时没有待接的任务。已接下的在上方，也可以换个方向。" : "这里暂时没有匹配的任务。换个分类，或清空搜索试试。" }}
      <button class="soft-button" @click="clearFilters">清空筛选，看看适合今天的事</button>
    </div>
    <TaskGuide v-if="inspecting" :task="inspecting"
      :active="state.active.some(a => a.qid === inspecting.id)" :eligibility="canAccept(inspecting)"
      @close="inspecting = null" @accept="acceptGuide" />
  </div>
</template>
<style scoped>
.trail-disclosure { margin-bottom: 24px; }
.trail-disclosure summary { cursor: pointer; color: var(--primary); font-size: 14px; padding: 12px 0; }
.task-context-picker { padding: 20px; border: 1px solid var(--line); border-radius: 14px; background: #f1f3eb; margin: 0 0 22px; }
.task-context-picker strong { font: 600 20px var(--serif); }
.task-context-picker p { font-size: 12px; line-height: 1.8; color: var(--ink-2); margin: 8px 0 14px; }
.context-options { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.context-options button { border: 1px solid #d4dece; border-radius: 8px; background: transparent; padding: 9px 12px; color: var(--ink-2); font-size: 13px; }
.context-options button[aria-pressed="true"] { background: var(--primary); color: white; border-color: var(--primary); }
.task-context-picker .draft-note { margin: 14px 0 0; color: #776c51; }

.guide-link { padding: 0; margin: 3px 0 12px; font-size: 13px; color: var(--primary); text-align: left; }
.action-reminder strong { display: block; margin-bottom: 4px; }
.active-grid { align-items: start; }
.active-card > p { flex: none; }
.active-card:focus { outline: 2px solid #557252; outline-offset: 4px; }
.active-section .section-title > span { max-width: none; }
  .active-card .action-reminder { font-size: 13px; color: #64715f; padding-left: 12px; border-left: 2px solid #cbd6ba; }
.search-scope { color: #64715f; font-size: 13px; margin: 0 0 12px; }
.quest-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin: 0 0 16px; }
.quest-section-heading h3 { margin: 0; font-family: var(--serif); font-size: 21px; font-weight: 600; color: #344b38; }
.quest-section-heading span { color: #84907e; font-size: 12px; }
.task-effort { display: flex; flex-wrap: wrap; gap: 8px 14px; margin: 13px 0 15px; color: #788473; font-size: 12px; }
.task-effort span + span { color: #a48a55; }
.quest-card-action { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; min-width: 122px; }
.quest-card-action .soft-button { max-width: 100%; white-space: nowrap; }
.accept-note { max-width: 180px; color: #9b7862; font-size: 11px; line-height: 1.4; text-align: right; }
.active-empty .soft-button { display: block; margin: 16px auto 0; }
@media (max-width: 760px) {
  .quest-section-heading { align-items: flex-start; flex-direction: column; gap: 4px; }
  .quest-section-heading span { font-size: 11px; }
  .task-effort { margin-bottom: 12px; }
  .quest-card-action { align-items: stretch; min-width: 0; width: 100%; }
  .accept-note { max-width: none; text-align: left; }
  .quest-card-action .soft-button { width: 100%; }
}
</style>
