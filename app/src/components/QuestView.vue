<script setup>
import { ref, computed, nextTick } from "vue";
import { CATS, DIFF, TYPES } from "../data/tasks.js";
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
const emit = defineEmits(["complete", "abandon", "toast", "chains"]);
const cat = ref("all"),
  scope = ref("today"),
  query = ref(""),
  amounts = ref({});
const list = computed(() => selectTasks(state, {
  cat: cat.value, scope: scope.value, query: query.value,
}));
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
          手里的小事 <span>{{ state.active.length }} / 3</span>
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
          <p class="action-reminder">先去生活里做，回来再记录。还没做完，也可以下次继续。</p>
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
    <div class="quest-filters">
      <div class="place-tabs">
        <button :class="{ active: scope === 'today' }" @click="scope = 'today'">
          适合今天</button
        ><button :class="{ active: scope === 'all' }" @click="scope = 'all'">
          全部支线</button
        ><button @click="emit('chains')">成长线 ↗</button>
      </div>
      <input
        ref="searchInput"
        v-model="query"
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
    <p v-if="query.trim()" class="search-scope" role="status">搜索全部难度的支线 · {{ cat === 'all' ? '所有领域' : CATS[cat].name }} · {{ list.length }} 件</p>
    <div class="quest-grid">
      <article v-for="t in list" :key="t.id" class="quest-card">
        <div class="task-meta">
          <span :style="{ color: CATS[t.cat].color }"
            >{{ CATS[t.cat].name }} · {{ DIFF[t.diff].name }}</span
          ><span>{{ TYPES[t.type] }}</span>
        </div>
        <h3>{{ t.title }}</h3>
        <p>{{ t.desc }}</p>
        <div class="quest-card-footer">
          <span class="price"
            >✦ {{ lumenReward(DIFF[t.diff].xp) }} <small>光</small
            ><i>＋{{ DIFF[t.diff].xp }} XP</i></span
          ><button
            class="soft-button"
            :disabled="!canAccept(t).ok"
            :title="canAccept(t).why"
            @click="take(t)"
          >
            {{ canAccept(t).ok ? "接下这件事 ＋" : canAccept(t).why }}
          </button>
        </div>
      </article>
    </div>
    <div v-if="!list.length" class="active-empty">
      这里暂时没有匹配的任务。换个分类，或清空搜索试试。
      <button class="soft-button" @click="clearFilters">清空筛选，看看适合今天的事</button>
    </div>
  </div>
</template>
<style scoped>
.active-card:focus { outline: 2px solid #557252; outline-offset: 4px; }
.active-section .section-title > span { max-width: none; }
.active-card .action-reminder { font-size: 13px; color: #64715f; padding-left: 12px; border-left: 2px solid #cbd6ba; }
.search-scope { color: #64715f; font-size: 13px; margin: 0 0 18px; }
.active-empty .soft-button { display: block; margin: 16px auto 0; }
</style>
