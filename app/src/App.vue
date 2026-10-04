<script setup>
import { defineAsyncComponent, ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { state, levelInfo, now, today, buddyBus, saveWarning } from "./store.js";
import ChainsView from "./components/ChainsView.vue";
import CompleteModal from "./components/CompleteModal.vue";
import AbandonModal from "./components/AbandonModal.vue";
import BuddyFace from "./components/BuddyFace.vue";
import QuestView from "./components/QuestView.vue";
import JournalView from "./components/JournalView.vue";
import { registerGameTools } from "./game/webmcp.js";
import { disposeFurnitureImages } from "./services/furniture-images.js";
import SceneLoading from "./components/SceneLoading.vue";
const scenePage = loader => defineAsyncComponent({ loader, loadingComponent: SceneLoading, errorComponent: SceneLoading, delay: 120, timeout: 20000 });
const YardView = scenePage(() => import("./components/YardView.vue"));
const LibraryView = scenePage(() => import("./components/LibraryView.vue"));
const WorldScene = scenePage(() => import("./components/WorldScene.vue"));
const ShopView = scenePage(() => import("./components/ShopView.vue"));
const WoodshopView = scenePage(() => import("./components/WoodshopView.vue"));
const HomeView = scenePage(() => import("./components/HomeView.vue"));
import { nativePlatform } from "./services/native.js";
import { recommendMapTask } from "./game/map-recommendation.js";
import { accept, canAccept, taskById, progressOf, checkedToday, checkIn, reached } from "./store.js";
import { DIFF, CATS } from "./data/tasks.js";
import { taskContext, sessionContext, PLACES } from "./data/task-context.js";
import { pickPrepMove, prepSuggestion } from "./game/prep-moves.js";
import { PLACE_TITLES } from "./data/places.js";
import { lumenReward } from "./game/home.js";
import PlaceIcon from "./components/PlaceIcon.vue";
import { TRAILS, fieldGuide } from "./data/field-guides.js";
const validTabs = [
  "map",
  "tasks",
  "home",
  "shop",
  "panel",
  "quest",
  "chains",
  "woodshop",
  "yard",
  "library",
];
const tab = ref(
    validTabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : "map",
  ),
  completing = ref(null),
  abandoning = ref(null),
  toastMsg = ref("");
let toastTimer, unregisterTools;
const libraryDesk = ref('reading'), questEntry = shallowRef({ trail: '', task: '', suggestion: null });
function toast(t) {
  toastMsg.value = t;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg.value = ""), 3000);
}
function navigate(id) {
  if (id === 'tasks' || id === 'quest') questEntry.value = { trail: '', task: '', suggestion: null };
  if (id === 'library') libraryDesk.value = 'reading';
  if (id==='journal' || id==='panel') memoryTarget.value=null;
  if (id === "atelier") { location.href = "./emotion-lab.html" + location.search; return; }
  const next = id === "journal" ? "panel" : id;
  tab.value = validTabs.includes(next) ? next : "map";
}
function openLibrary(desk = 'reading') {
  libraryDesk.value = desk === 'inquiry' ? 'inquiry' : 'reading';
  tab.value = 'library';
}
function returnFromLibrary(qid = '') {
  questEntry.value = { trail: 'think', task: typeof qid === 'string' && taskById[qid] ? qid : '', suggestion: null };
  tab.value = 'tasks';
}
function writeInquiryStep(page) {
  questEntry.value = { trail: 'think', task: '', suggestion: {
    cat: 'mind', label: '问号夹页', note: page.question, step: page.next,
    titlePlaceholder: '给下一步起一个具体的名字', conditionPlaceholder: '写清实际做出什么结果，就可以收尾。', stepPlaceholder: page.next,
  } };
  tab.value = 'tasks';
}
function consumeQuestSuggestion() {
  questEntry.value = { ...questEntry.value, suggestion: null };
}
async function finishToMap() {
  navigate("map");
  await nextTick();
  document.querySelector(".brand")?.focus();
}
watch(tab, (t, previous) => {
  if (t !== 'panel' && !(previous === 'panel' && t === 'home')) memoryTarget.value=null;
  if (t !== 'home') returnFurniture.value='';
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
  disposeFurnitureImages();
  window.removeEventListener("hashchange", hashChange);
  window.removeEventListener("keydown", escape);
});
const nav = PLACE_TITLES;
const currentPlace = computed(() => nav[tab.value] || ["我的旅程", "map"]);
const dateLabel = computed(() => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(now()));
const daypart = computed(() => {
  const h = new Date(now()).getHours();
  return h < 5 ? "夜深了" : h < 11 ? "早上好" : h < 14 ? "中午好" : h < 18 ? "午后好" : h < 22 ? "晚上好" : "夜深了";
});
const levelPct = computed(() => Math.max(0, Math.min(1, levelInfo.value.cur / (levelInfo.value.need || 1))));
const ticketMeta = computed(() => {
  const t = nextAction.value?.task;
  if (!t) return "";
  const ctx = taskContext(t), session = !ctx && sessionContext(t);
  const span = t.type === "streak" ? `记满 ${t.target} 天` : t.type === "total" ? `累计 ${t.target}${t.unit || "次"}` : "";
  return [t.personal ? "自己写下的事" : DIFF[t.diff]?.name, CATS[t.cat]?.name,
    ctx ? `约 ${ctx.minutes} 分钟 · ${PLACES[ctx.place]}` : session ? `每次约 ${session.minutes} 分钟 · ${span}` : ""].filter(Boolean).join(" · ");
});
const selectedAction = ref("");
const startingTrail = ref(''), startingMinutes = ref(0), suggestionTurn = ref(0);
const recommendation = computed(() => recommendMapTask(state, {trail:startingTrail.value,minutes:startingMinutes.value,day:today(),offset:suggestionTurn.value}));
const startingLabel = computed(() => [TRAILS.find(t=>t.id===startingTrail.value)?.title || '方向不限',startingMinutes.value?`${startingMinutes.value} 分钟内`:'时间不限'].join(' · '));
const startingDetails = ref(null);
// 时间是第二个、也是最后一个问题：选完就收起面板，让推荐回到眼前。
function closeStarting() { if (startingDetails.value) startingDetails.value.open = false; }
const prepTurn = ref(0);
const prep = computed(() => recommendation.value.task ? { move: null, count: 0 } : pickPrepMove(state, {trail:startingTrail.value,minutes:startingMinutes.value,day:today(),offset:prepTurn.value}));
function writePrepMove() {
  const move = prep.value.move;
  if (!move) return;
  questEntry.value = { trail: startingTrail.value, task: '', suggestion: prepSuggestion(move) };
  tab.value = 'tasks';
}
watch([startingTrail,startingMinutes],()=>{suggestionTurn.value=0;prepTurn.value=0;});
function resetStartingPoint() { startingTrail.value='';startingMinutes.value=0;suggestionTurn.value=0; }
function openStartingNotebook() {
  questEntry.value={trail:startingTrail.value,task:'',suggestion:null};
  tab.value='tasks';
}
const memoryTarget=ref(null), returnFurniture=ref('');
function openFurnitureMemory(memory) { memoryTarget.value=memory;tab.value='panel'; }
function backToFurniture() { returnFurniture.value=memoryTarget.value?.uid||'';tab.value='home'; }
const nextAction = computed(() => {
  const active = state.active.find(a => a.qid === selectedAction.value) || state.active.find(a => a.plan) || state.active[0];
  if (active) return { kind: "active", task: taskById[active.qid], active };
  const task = recommendation.value.task;
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
// 按天任务在地图上就能记下今天：做完回来点一下，不用再翻进岩壁。
const mapRhythm = computed(() => {
  const a = nextAction.value?.kind === "active" && nextAction.value.task.type === "streak" ? nextAction.value.active : null;
  return a ? { a, ...progressOf(a), today: checkedToday(a), ready: reached(a) } : null;
});
function recordFromMap() {
  if (mapRhythm.value && checkIn(mapRhythm.value.a)) toast(mapRhythm.value.ready ? "攒满了，可以收好这件事了。" : "今天这一格，填好了。");
}
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
  if (!result.ok) { toast(result.why); return navigate("tasks"); }
  accept(action.task);
  toast(`已接下「${action.task.title}」，按自己的节奏来。`);
  questEntry.value={trail:startingTrail.value,task:action.task.id,suggestion:null};
  tab.value='tasks';
}
</script>
<template>
  <div class="wilderness-app" :class="'at-' + tab">
    <header class="topbar">
      <button class="brand" aria-label="旷野 · 回到地图" @click="tab = 'map'">
        <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="19" class="seal" />
          <circle cx="20" cy="17.2" r="5.2" class="sun" />
          <path d="M3.6 26.5c3.8-4.6 8-6.6 12.3-3.7 3.4-4.4 9-5.4 14.6-1.6 2.3 1.6 4.4 3.3 6 5.3A19 19 0 0 1 3.6 26.5z" class="hill" />
          <path d="M9 31.5h22" class="trail" />
        </svg>
        <span class="brand-word">旷野<small>KUANGYE</small></span>
      </button>
      <template v-if="tab !== 'map'">
        <button class="map-return" @click="navigate('map')"><span class="map-return-arrow">←</span> 回到地图</button>
        <div class="place-crumb">
          <PlaceIcon :name="currentPlace[1]" :size="18" />
          <h1>{{ currentPlace[0] }}</h1>
        </div>
      </template>
      <div class="top-stats">
        <span class="level-chip" :title="`Lv.${levelInfo.level} ${levelInfo.name} · ${levelInfo.cur}/${levelInfo.need} XP`">
          <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="track" /><circle cx="18" cy="18" r="15" class="fill" :style="{ strokeDashoffset: 94.25 * (1 - levelPct) }" /></svg>
          <b>{{ levelInfo.level }}</b>
          <span class="level-name">{{ levelInfo.name }}</span>
        </span>
        <span class="wallet" :aria-label="`口袋里有 ${state.home.lumens} 光`"><PlaceIcon name="light" :size="16" /><b>{{ state.home.lumens }}</b><small>光</small></span>
      </div>
    </header>
    <main class="app-main">
      <div v-if="tab === 'map'" class="page-heading map-heading">
        <div>
          <div class="eyebrow">{{ dateLabel }} · {{ daypart }}</div>
          <h1>今天，想去哪里？</h1>
        </div>
        <p class="heading-aside">不用赶路。每一步，都算数。</p>
      </div>
      <div v-if="tab === 'map'" class="explore-layout">
        <WorldScene :key="JSON.stringify(state.home.town)" @navigate="navigate" />
        <aside class="today-rail">
          <section class="buddy-card">
            <div class="buddy-portrait"><BuddyFace :size="96" /></div>
            <div class="buddy-bubble">
              <span class="eyebrow">小芽</span>
              <p class="buddy-speech" aria-live="polite">{{ buddyBus.text || "你来啦。今天的每一点努力，都会让我们的小家暖一点。" }}</p>
            </div>
          </section>
          <section class="little-task ticket" aria-label="今天的行动便笺">
            <div class="ticket-head">
              <span class="eyebrow">{{ nextAction?.kind === 'active' ? '今天继续这一件' : '今天先做这一件' }}</span>
              <span class="ticket-seal" aria-hidden="true">{{ nextAction?.kind === 'active' ? '进行' : '今日' }}</span>
            </div>
            <details v-if="!state.active.length" ref="startingDetails" class="starting-choices">
              <summary>{{ startingLabel }}<span aria-hidden="true">⌄</span></summary>
              <fieldset><legend>今天想试哪个方向？</legend><div class="starting-directions" role="group" aria-label="出发方向">
                <button :aria-pressed="!startingTrail" @click="startingTrail=''">都可以</button>
                <button v-for="t in TRAILS" :key="t.id" :aria-pressed="startingTrail===t.id" @click="startingTrail=t.id"><PlaceIcon :name="t.id" :size="14" />{{ t.title }}</button>
              </div></fieldset>
              <fieldset><legend>这次能留多久？</legend><div class="starting-times" role="group" aria-label="出发时间">
                <button v-for="m in [15,30,0]" :key="m" :aria-pressed="startingMinutes===m" @click="startingMinutes=m; closeStarting()">{{ m?m+' 分钟内':'时间不限' }}</button>
              </div></fieldset>
              <p class="starting-explain">短时会找一次做得完的事，也找每次十来分钟、按天攒的事。时间供安排参考，具体做到什么仍看任务说明。</p>
            </details>
            <template v-if="nextAction">
            <h3 class="map-action-title" aria-live="polite">{{ nextAction.task.title }}</h3>
            <div v-if="state.active.length > 1" class="map-plan-choices" role="group" aria-label="选择要继续的任务">
              <button v-for="a in state.active" :key="a.qid" :aria-label="taskById[a.qid].title" :aria-pressed="nextAction.active?.qid === a.qid" @click="selectedAction = a.qid">{{ taskById[a.qid].title }}</button>
            </div>
            <div v-if="nextAction.active?.plan" class="map-plan-note">
              <strong>{{ nextAction.active.plan.cue || '留一会儿给自己' }}</strong>
              <p>{{ nextAction.active.plan.step || nextAction.task.desc }}</p>
            </div>
            <p v-else>{{ nextAction.task.desc }}</p>
            <div v-if="nextAction.kind==='suggested'" class="map-first-step"><strong>可以先这样开始</strong><p>{{ fieldGuide(nextAction.task).steps[0] }}</p></div>
            <div class="ticket-tear" aria-hidden="true" />
            <div class="little-task-meta">
              <span>{{ ticketMeta }}</span>
              <span v-if="!nextAction.task.personal"><PlaceIcon name="light" :size="12" />{{ lumenReward(DIFF[nextAction.task.diff].xp) }} 光 · ＋{{ DIFF[nextAction.task.diff].xp }} XP</span>
            </div>
            <div v-if="mapRhythm" class="map-rhythm" role="img" :aria-label="`已攒 ${mapRhythm.cur} 天，目标 ${mapRhythm.target} 天`">
              <span><b>{{ mapRhythm.cur }}</b> / {{ mapRhythm.target }} 天</span>
              <i aria-hidden="true"><em :style="{ width: Math.min(100, mapRhythm.cur / mapRhythm.target * 100) + '%' }" /></i>
              <small>{{ mapRhythm.today ? '今天记好了' : '空过的日子不清零' }}</small>
            </div>
            <button v-if="mapRhythm?.ready" class="primary-button" @click="completing = mapRhythm.a">攒满了，收好这件事 <span aria-hidden="true">→</span></button>
            <button v-else-if="mapRhythm && !mapRhythm.today" class="primary-button" @click="recordFromMap">今天做到了，记一笔 <span aria-hidden="true">✓</span></button>
            <button v-if="mapRhythm && (mapRhythm.ready || !mapRhythm.today)" class="text-button map-another" @click="takeMapTask">打开进行中</button>
            <button v-else class="primary-button" @click="takeMapTask">
              {{ nextAction.kind === 'active' ? '打开进行中' : '接下这一步' }} <span aria-hidden="true">→</span>
            </button>
            <button v-if="nextAction.kind==='suggested' && recommendation.count>1" class="text-button map-another" @click="suggestionTurn++">换一件看看</button>
            </template>
            <template v-else-if="prep.move">
              <div class="prep-move">
                <span class="prep-kicker">{{ prep.move.minutes }} 分钟，先做一步准备</span>
                <h3 class="map-action-title" aria-live="polite">{{ prep.move.text }}</h3>
                <p>这一步取自「{{ prep.move.task.title }}」的出发手册。做完它不算完成原任务，也不发光；想留个记录，可以写成自己的一件小事。</p>
              </div>
              <div class="ticket-tear" aria-hidden="true" />
              <button class="primary-button" @click="writePrepMove">把这一步写成我的事 <span aria-hidden="true">→</span></button>
              <div class="starting-empty-actions">
                <button v-if="prep.count > 1" class="text-button" @click="prepTurn++">换一步看看</button>
                <button class="text-button" @click="openStartingNotebook">去岩壁看原任务 ↗</button>
              </div>
            </template>
            <template v-else>
              <h3>先留一点余地。</h3>
              <p>{{ startingMinutes?'这个组合暂时没有合适的短时任务。可以换个时间，或到小册里找一个准备动作。':'这个方向的入门任务已经翻过了。可以换个方向，或写下自己想做的事。' }}</p>
              <div class="starting-empty-actions"><button class="soft-button" @click="resetStartingPoint">重新挑选</button><button class="text-button" @click="openStartingNotebook">去岩壁找起点 ↗</button></div>
            </template>
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
        </aside>
      </div>
      <QuestView
        v-else-if="tab === 'tasks' || tab === 'quest'"
        :initial-trail="questEntry.trail" :focus-task="questEntry.task" :initial-suggestion="questEntry.suggestion"
        @complete="completing = $event"
        @abandon="abandoning = $event"
        @toast="toast"
        @chains="tab = 'chains'"
        @library="openLibrary"
        @entry-used="consumeQuestSuggestion"
      />
      <HomeView :return-furniture="returnFurniture" @memory="openFurnitureMemory"
        v-else-if="tab === 'home'"
        @shop="tab = 'shop'"
        @journal="memoryTarget=null; tab = 'panel'"
        @toast="toast"
      />
      <WoodshopView v-else-if="tab === 'woodshop'" @toast="toast" />
      <YardView v-else-if="tab === 'yard'" @home="tab = 'home'" />
      <LibraryView v-else-if="tab === 'library'" :desk="libraryDesk" @desk="libraryDesk=$event" @tasks="returnFromLibrary" @notebook="returnFromLibrary()" @write="writeInquiryStep" @journal="memoryTarget=null; tab = 'panel'" @toast="toast" />
      <ShopView
        v-else-if="tab === 'shop'"
        @home="tab = 'home'"
        @toast="toast"
      />
      <JournalView :focus-memory="memoryTarget" @back-furniture="backToFurniture" @library="openLibrary('reading')"
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

      <footer class="bottom-note">
        <span class="colophon-mark" aria-hidden="true">旷</span>
        <span>把日子过成喜欢的样子</span>
        <span>Lv.{{ levelInfo.level }} {{ levelInfo.name }} · 已完成 {{ state.done.length }} 件小事</span>
        <span>{{ nativePlatform ? "你的进度保存在这台设备里" : "你的进度保存在此浏览器" }}</span>
      </footer>
    </main>
    <CompleteModal
      v-if="completing"
      :active="completing"
      @close="completing = null"
      @direction="t => { if (!state.active.length) startingTrail = t }"
      @write="e => { questEntry = { trail: e.trail, task: '', suggestion: e.suggestion }; tab = 'tasks' }"
      @done="toast"
      @shop="tab = 'shop'"
      @map="finishToMap"
      @library="openLibrary('reading')"
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
.map-plan-choices { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.map-plan-choices button { max-width: 100%; padding: 7px 11px; font: inherit; font-size: 12px; text-align: left; overflow-wrap: anywhere; border: 1px solid var(--line-2); border-radius: 999px; background: var(--card); color: var(--ink-2); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.map-plan-choices button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.map-plan-note { border-left: 2px solid var(--sage); padding-left: 14px; margin: 14px 0; overflow-wrap: anywhere; }
.map-plan-note strong { font-size: 13px; color: var(--moss-deep); }
.map-plan-note p { margin-bottom: 0; }
</style>
