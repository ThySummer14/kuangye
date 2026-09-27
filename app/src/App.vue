<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { state, levelInfo, now, buddyBus, saveWarning } from "./store.js";
import WorldScene from "./components/WorldScene.vue";
import ChainsView from "./components/ChainsView.vue";
import CompleteModal from "./components/CompleteModal.vue";
import AbandonModal from "./components/AbandonModal.vue";
import BuddyFace from "./components/BuddyFace.vue";
import QuestView from "./components/QuestView.vue";
import ShopView from "./components/ShopView.vue";
import WoodshopView from "./components/WoodshopView.vue";
import HomeView from "./components/HomeView.vue";
import JournalView from "./components/JournalView.vue";
import { registerGameTools } from "./game/webmcp.js";
import { disposeThumbnails } from "./scenes/furniture.js";
import { nativePlatform } from "./services/native.js";
import { selectTasks } from "./game/task-selection.js";
import { accept, canAccept, taskById } from "./store.js";
import { DIFF } from "./data/tasks.js";
const validTabs = [
  "map",
  "tasks",
  "home",
  "shop",
  "panel",
  "quest",
  "chains",
  "woodshop",
];
const tab = ref(
    validTabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : "map",
  ),
  completing = ref(null),
  abandoning = ref(null),
  toastMsg = ref("");
let toastTimer, unregisterTools;
function toast(t) {
  toastMsg.value = t;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg.value = ""), 3000);
}
function navigate(id) {
  if (id === "atelier") { location.href = "./emotion-lab.html" + location.search; return; }
  const next = id === "journal" ? "panel" : id;
  tab.value = validTabs.includes(next) ? next : "map";
}
async function finishToMap() {
  navigate("map");
  await nextTick();
  document.querySelector(".brand")?.focus();
}
watch(tab, (t) => {
  location.hash = t;
  window.scrollTo({ top: 0, behavior: "instant" });
});
function hashChange() {
  const t = location.hash.slice(1);
  tab.value = validTabs.includes(t) ? t : "map";
}
function escape(e) {
  if (
    e.key === "Escape" &&
    !document.querySelector("dialog[open]") &&
    tab.value !== "home"
  )
    tab.value = "map";
}
onMounted(() => {
  unregisterTools = registerGameTools(navigate, () => tab.value);
  window.addEventListener("hashchange", hashChange);
  window.addEventListener("keydown", escape);
});
onBeforeUnmount(() => {
  unregisterTools?.();
  clearTimeout(toastTimer);
  disposeThumbnails();
  window.removeEventListener("hashchange", hashChange);
  window.removeEventListener("keydown", escape);
});
const nav = [
  ["map", "⌘", "旷野地图"],
  ["tasks", "☷", "任务岩壁"],
  ["home", "⌂", "小芽的家"],
  ["shop", "♧", "林间集市"],
  ["panel", "◷", "成长手记"],
  ["woodshop", "⌑", "木器铺"],
];
const selectedAction = ref("");
const nextAction = computed(() => {
  const active = state.active.find(a => a.qid === selectedAction.value) || state.active.find(a => a.plan) || state.active[0];
  if (active) return { kind: "active", task: taskById[active.qid], active };
  const task = selectTasks(state, { scope: "today" })[0];
  return task ? { kind: "suggested", task } : null;
});
const latestDone = computed(() => {
  const record = [...state.done].reverse()[0];
  if (!record) return null;
  return {
    record,
    task: taskById[record.qid] || null,
  };
});
async function takeMapTask() {
  const action = nextAction.value;
  if (!action) return;
  if (action.kind === "active") {
    navigate("tasks");
    await nextTick();
    const card = [...document.querySelectorAll('[data-active-task]')].find(el => el.dataset.activeTask === action.active.qid);
    card?.focus({ preventScroll: true });
    card?.scrollIntoView({ block: "center", behavior: "instant" });
    return;
  }
  const result = canAccept(action.task);
  if (!result.ok) return navigate("tasks");
  accept(action.task);
  toast(`已接下「${action.task.title}」，按自己的节奏来。`);
  navigate("tasks");
}
</script>
<template>
  <div class="wilderness-app">
    <header class="topbar">
      <button class="brand" @click="tab = 'map'">
        <span class="brand-symbol">✳</span
        ><span>旷野<small>KUANGYE</small></span>
      </button>
      <button
        v-if="tab !== 'map'"
        class="soft-button map-return"
        @click="navigate('map')"
      >
        ← 回到地图
      </button>
      <div class="top-stats">
        <span class="wallet"
          >✦ <b>{{ state.home.lumens }}</b> <small>光</small></span
        ><span class="avatar">芽</span>
      </div>
    </header>
    <main class="app-main">
      <div class="page-heading">
        <div>
          <div class="eyebrow">A LITTLE PROGRESS, A LITTLE HOME</div>
          <h1>
            {{
              tab === "map"
                ? "今天，想去哪里？"
                : nav.find((n) => n[0] === tab)?.[2] || "我的旅程"
            }}
          </h1>
        </div>
        <span class="date-label">{{
          new Intl.DateTimeFormat("zh-CN", {
            month: "long",
            day: "numeric",
            weekday: "short",
          }).format(now())
        }}</span>
      </div>
      <div v-if="tab === 'map'" class="explore-layout">
        <WorldScene @navigate="navigate" />
        <aside class="today-rail">
          <section class="buddy-card">
            <span class="eyebrow">小芽在等你</span>
            <div class="buddy-portrait"><BuddyFace :size="155" /></div>
            <h3>你来啦，一起慢慢长大。</h3>
            <p class="buddy-speech" aria-live="polite">
              {{
                buddyBus.text || "今天的每一点努力，都会让我们的小家暖一点。"
              }}
            </p>
          </section>
          <section class="little-task" v-if="nextAction">
            <span class="eyebrow">{{ nextAction.kind === 'active' ? '今天继续这一件' : '今天先做这一件' }}</span>
            <h3>{{ nextAction.task.title }}</h3>
            <div v-if="state.active.length > 1" class="map-plan-choices" role="group" aria-label="选择要继续的任务">
              <button v-for="a in state.active" :key="a.qid" :aria-label="taskById[a.qid].title" :aria-pressed="nextAction.active?.qid === a.qid" @click="selectedAction = a.qid">{{ taskById[a.qid].title }}</button>
            </div>
            <div v-if="nextAction.active?.plan" class="map-plan-note">
              <strong>{{ nextAction.active.plan.cue || '留一会儿给自己' }}</strong>
              <p>{{ nextAction.active.plan.step || nextAction.task.desc }}</p>
            </div>
            <p v-else>{{ nextAction.task.desc }}</p>
            <div class="little-task-meta">
              <span>{{ nextAction.kind === 'active' ? '已经接下' : '适合现在开始' }}</span>
              <span>{{ nextAction.task.personal ? "自己写下的事" : "＋" + DIFF[nextAction.task.diff].xp + " XP" }}</span>
            </div>
            <button class="primary-button" @click="takeMapTask">
              {{ nextAction.kind === 'active' ? '打开进行中' : '接下这一步' }} <span aria-hidden="true">→</span>
            </button>
          </section>
          <section class="little-task little-task-empty" v-else>
            <span class="eyebrow">今天已经有安排</span>
            <h3>把手里的事，慢慢做完。</h3>
            <p>完成一件，再从任务岩壁挑下一件。旷野不会催你。</p>
            <button class="primary-button" @click="navigate('tasks')">去看手里的事 <span aria-hidden="true">→</span></button>
          </section>
          <section v-if="latestDone" class="lookback-card" aria-labelledby="lookback-title">
            <span class="eyebrow">最近完成 · 回头看一眼</span>
            <h3 id="lookback-title">{{ latestDone.task?.title || '一件已经完成的小事' }}</h3>
            <time>{{ latestDone.record.at }}</time>
            <p>{{ latestDone.record.review || '那天，我为自己完成了一件事。' }}</p>
            <button
              class="text-button lookback-link"
              aria-label="打开成长手记查看最近完成记录"
              @click="navigate('journal')"
            >
              去成长手记看看 <span aria-hidden="true">↗</span>
            </button>
          </section>
          <div class="rail-note">不用赶路。每一步，都算数。</div>
        </aside>
      </div>
      <QuestView
        v-else-if="tab === 'tasks' || tab === 'quest'"
        @complete="completing = $event"
        @abandon="abandoning = $event"
        @toast="toast"
        @chains="tab = 'chains'"
      />
      <HomeView
        v-else-if="tab === 'home'"
        @shop="tab = 'shop'"
        @journal="tab = 'panel'"
        @toast="toast"
      />
      <WoodshopView v-else-if="tab === 'woodshop'" @toast="toast" />
      <ShopView
        v-else-if="tab === 'shop'"
        @home="tab = 'home'"
        @toast="toast"
      />
      <JournalView
        v-else-if="tab === 'panel'"
        @toast="toast"
        @chains="tab = 'chains'"
      />
      <div v-else class="legacy-content">
        <button class="text-button" @click="tab = 'tasks'">
          ← 回到今日任务</button
        ><ChainsView :toast="toast" />
      </div>
      <p v-if="saveWarning.text" role="alert" class="save-warning">
        {{ saveWarning.text }}
      </p>

      <div class="bottom-note">
        <span>✳ 把日子过成喜欢的样子</span
        ><span
          >Lv.{{ levelInfo.level }} {{ levelInfo.name }} · 已完成
          {{ state.done.length }} 件小事</span
        ><span>{{
          nativePlatform ? "你的进度保存在这台设备里" : "你的进度保存在此浏览器"
        }}</span>
      </div>
    </main>
    <CompleteModal
      v-if="completing"
      :active="completing"
      @close="completing = null"
      @done="toast"
      @shop="tab = 'shop'"
      @map="finishToMap"
    /><AbandonModal
      v-if="abandoning"
      :active="abandoning"
      @close="abandoning = null"
      @done="toast"
    />
    <div v-if="toastMsg" class="toast" role="status">{{ toastMsg }}</div>
  </div>
</template>

<style scoped>
.map-plan-choices { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.map-plan-choices button { max-width: 100%; padding: 8px 10px; font: inherit; font-size: 12px; text-align: left; overflow-wrap: anywhere; border: 1px solid #bdcbb6; border-radius: 7px; background: transparent; color: #42583c; cursor: pointer; }
.map-plan-choices button[aria-pressed="true"] { background: #42583c; color: white; }
.map-plan-note { border-left: 2px solid #91a77d; padding-left: 14px; margin: 16px 0; overflow-wrap: anywhere; }
.map-plan-note strong { font-size: 13px; color: #42583c; }
.map-plan-note p { margin-bottom: 0; }
@media (max-width: 600px) {
  .today-rail { display: flex; }
  .today-rail > .little-task { order: -1; }
}
</style>
