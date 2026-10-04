import { emptyReading, startBook, updateBook, noteBook, shelveBook, reopenBook } from "./game/reading.js";
import { emptyInquiry, startInquiry, updateInquiry, noteInquiry, keepInquiry, reopenInquiry } from "./game/inquiry.js";
import { emptyTown, changeExterior, placeYard, repairLibrary, applyYardPlan } from "./game/town.js";
import { personalTask, taskXp } from "./game/personal-tasks.js";
import { persistence } from './services/persistence.js';
import { normalizeActionPlan } from "./game/action-plan.js";
import { QA } from "./game/qa.js";
import { expandRoom, addHomeMoment, normalizeDecor } from "./game/room.js";
import { parseImport } from "./game/save.js";
import { dayCount, bestRun, canBackfill } from "./game/rhythm.js";
// Reactive API facade. Quest actions stay compatible; home rules and save migration are pure modules.
import { reactive, watch, computed } from "vue";
import { TASKS, DIFF, CATS } from "./data/tasks.js";
import {
  emptyHome,
  rewardCompletion,
  recordGlimmer,
  unlockGifts,
  buyFurniture,
  placeFurniture,
  recycleFurniture,
} from "./game/home.js";
import { furnitureById, vintageStock } from "./data/furniture.js";
import { dateStr } from "./data/season.js";

// ———— 小芽情绪总线：任何动作都可以让小芽有反应（含气泡台词） ————
export const BUDDY_NAME = "小芽";
export const buddyBus = reactive({ mood: "idle", at: 0, text: "" });
export function buddyMoment(mood, ms = 1500, text = "") {
  buddyBus.mood = mood;
  buddyBus.text = text;
  buddyBus.at = Date.now() + ms;
}

const emptyState = () => ({
  home: emptyHome(),
  customTasks: [],
  active: [], // { qid, start, logs:[{d, v?, note?, shield?}], shields（旧版免死金牌，已不使用，保留兼容） }
  done: [], // { qid, xp, at, review, units:[{metric, v}], streak?（最长一口气） }
  abandoned: [], // { qid, reason, at, logs?（放下时的记录快照，再接起时复制到进行中） }
  settings: { devDate: "" },
});

export const state = reactive(persistence.load() || emptyState());
export const saveWarning = reactive({ text: persistence.notice, pending: false });
let saveRequest = 0;
watch(
  state,
  () => {
    const request = ++saveRequest;
    const failed = () => {
      if (request !== saveRequest) return;
      saveWarning.pending = false;
      saveWarning.text = persistence.kind === 'native'
        ? '设备未能保存进度，请保持应用打开，并在成长手记中备份。'
        : '浏览器未能保存进度，请先在成长手记中导出备份。';
    };
    const saved = () => {
      if (request !== saveRequest) return;
      saveWarning.pending = false;
      saveWarning.text = '';
    };
    try {
      const result = persistence.save(JSON.stringify(state));
      if (result?.then) {
        saveWarning.pending = true;
        result.then(saved, failed);
      } else saved();
    } catch { failed(); }
  },
  { deep: true },
);

const catalog = Object.fromEntries(TASKS.map((t) => [t.id, t]));
export const taskById = new Proxy(catalog, {
  get(target, id) { return Object.hasOwn(target, id) ? target[id] : state.customTasks?.find(t => t.id === id); },
});
export function createPersonalTask(input) {
  if (state.active.length >= 3) return { ok: false, why: '手里最多放 3 件事，完成或放下一件后再来。' };
  const task = personalTask({ ...input, id: `personal-${crypto.randomUUID()}` });
  if (!task) return { ok: false, why: '写下想做的事、完成条件，并选择一个生活领域。' };
  (state.customTasks ||= []).push(task);
  accept(task);
  saveActionPlan(activeOf(task.id), input.plan);
  return { ok: true, task };
}
export function editPersonalTask(id, input) {
  const current = taskById[id];
  if (!current?.personal || !activeOf(id)) return { ok: false, why: '这件事已经归档，保留当时的记录。' };
  const updated = personalTask({ ...input, id });
  if (!updated) return { ok: false, why: '请写清想做的事与完成条件。' };
  Object.assign(current, updated);
  saveActionPlan(activeOf(id), input.plan);
  return { ok: true, task: current };
}
export const activeOf = (qid) => state.active.find((a) => a.qid === qid);

// ———— 时间（支持"时间旅行"调试） ————
export function now() {
  const devDate = state.settings?.devDate;
  return /^\d{4}-\d{2}-\d{2}$/.test(devDate || "")
    ? new Date(devDate + "T12:00:00")
    : new Date();
}
export function today() {
  return dateStr(now());
}
export function yesterday() {
  const d = now();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

// ———— 任务链：由易到难，完成前一阶段才解锁后一阶段 ————
export const chainStages = {};
for (const t of TASKS) {
  if (t.chain) (chainStages[t.chain] ||= []).push(t);
}
for (const k in chainStages)
  chainStages[k].sort((a, b) => (a.stage || 1) - (b.stage || 1));

export function chainUnlocked(task) {
  if (!task.chain) return true;
  const list = chainStages[task.chain];
  const idx = list.indexOf(task);
  return list
    .slice(0, idx)
    .every((prev) => state.done.some((d) => d.qid === prev.id));
}
export function nextChainStage(task) {
  if (!task.chain) return null;
  const list = chainStages[task.chain];
  return list[list.indexOf(task) + 1] || null;
}

// ———— 接取 ————
export function acceptState() {
  const season = state.active.filter(
    (a) => taskById[a.qid]?.tier === "season",
  ).length;
  const chapter = state.active.filter(
    (a) => taskById[a.qid]?.tier === "chapter",
  ).length;
  return { season, chapter, total: state.active.length };
}
export function canAccept(task) {
  if (!task || !taskById[task.id]) return { ok: false, why: "任务不存在" };
  if (task.personal && state.abandoned.some(a => a.qid === task.id))
    return { ok: false, why: '这件事已归档，需要时可以重新写一件。' };
  if (activeOf(task.id)) return { ok: false, why: "已在进行中" };
  if (state.done.some((d) => d.qid === task.id && !task.repeatable))
    return { ok: false, why: "已完成过这条支线" };
  if (!chainUnlocked(task))
    return { ok: false, why: "先完成这条成长线的上一阶段" };
  const l = acceptState();
  // 只有一条上限：手里最多 3 件。旧版「赛季级 ≤2、本章 ≤2」随本章任务板一起退役，
  // 它会让手里有两个习惯的人接不了第三件、又说不清为什么（第三十六切片）。
  if (l.total >= 3)
    return { ok: false, why: "手里最多放 3 件事，慢慢完成就好" };
  return { ok: true };
}
// 导入记录的排列可能不是时间顺序；同日按最后写入的暂放记录恢复。
export function restRecordOf(qid) {
  return [...state.abandoned].reverse().filter(r => r.qid === qid)
    .sort((a, b) => b.at.localeCompare(a.at))[0] || null;
}
export function accept(task) {
  if (!canAccept(task).ok) return false;
  // 复制最近一次暂放的快照，手记保留原记录；不累加多份快照。
  const kept = restRecordOf(task.id);
  const logs = (kept?.logs || []).map(l => ({ ...l }));
  state.active.push({ qid: task.id, start: today(), logs, shields: 2 });
  buddyMoment("excited", 1300, "新任务，冲！");
  return true;
}

export function saveActionPlan(a, value) {
  if (!state.active.includes(a)) return false;
  const plan = normalizeActionPlan(value);
  if (plan) a.plan = plan;
  else delete a.plan;
  return true;
}

// ———— 进度 ————
export function progressOf(a) {
  const t = taskById[a.qid];
  if (!t) return { cur: 0, target: 1 };
  // 按天任务：记录过的日期数，只增不减（节奏规则见 game/rhythm.js）。
  if (t.type === "streak") return { cur: dayCount(a.logs), target: t.target };
  if (t.type === "total")
    return {
      cur: a.logs.reduce((s, l) => s + Math.max(0, Number(l.v) || 0), 0),
      target: t.target,
    };
  return { cur: 0, target: 1 };
}
export const reached = (a) => {
  const p = progressOf(a);
  return p.cur >= p.target;
};
export function checkedToday(a) {
  const t = today();
  return a.logs.some((l) => l.d === t);
}
// 诚实补记：昨天做了却忘了记，可以补一笔，不消耗任何东西。
export function canRecordYesterday(a) {
  return taskById[a.qid]?.type === "streak" && canBackfill(a, today());
}
export function recordYesterday(a) {
  if (!canRecordYesterday(a)) return false;
  a.logs.push({ d: yesterday() });
  recordGlimmer(state.home, yesterday());
  buddyMoment("happy", 1000, "昨天的那一笔，补上了。");
  return true;
}
export function checkIn(a) {
  if (!checkedToday(a)) {
    a.logs.push({ d: today() });
    recordGlimmer(state.home, today());
    buddyMoment("excited", 900, "打卡 ✓");
    return true;
  }
  return false;
}
export function logUnits(a, v) {
  const value = Number(v);
  if (!Number.isFinite(value) || value <= 0) return false;
  a.logs.push({ d: today(), v: value });
  recordGlimmer(state.home, today());
  buddyMoment("excited", 900, `记录了 ${value}`);
  return true;
}

// ———— 完成 / 放弃 ————
export function complete(a, review = "") {
  const t = taskById[a.qid];
  if (!state.active.includes(a) || !t || (t.type !== "once" && !reached(a)))
    return false;
  const p = progressOf(a);
  const units = [];
  if (t.type === "total" && t.metric) {
    units.push({ metric: t.metric, v: p.cur });
  } else if (t.mv && t.metric) {
    units.push({ metric: t.metric, v: t.mv });
  }
  state.done.push({
    qid: t.id,
    xp: taskXp(t),
    at: today(),
    review,
    units,
    logs: a.logs.map((l) => ({ ...l })),
    ...(t.type === "streak" ? { streak: bestRun(a.logs) } : {}),
  });
  state.active = state.active.filter((x) => x !== a);
  rewardCompletion(state.home, taskXp(t));
  recordGlimmer(state.home, today());
  unlockGifts(state.home, levelInfo.value.level, today());
  buddyMoment("celebrate", 2000, t.personal ? "自己想做的事，你做到了。" : "这一点光，也照进我们家啦。");
  return true;
}
export function abandon(a, reason = "") {
  if (!a || !state.active.includes(a) || !taskById[a.qid]) return false;
  state.abandoned.push({ qid: a.qid, reason, at: today(), ...(a.logs.length ? { logs: a.logs.map((l) => ({ ...l })) } : {}) });
  state.active = state.active.filter((x) => x !== a);
  buddyMoment("sad", 2400, "休息一下也好，我陪着你。");
  return true;
}

// ———— 生涯统计 ————
export const totalXp = computed(() => state.done.reduce((s, d) => s + d.xp, 0));

const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];
const LEVEL_NAMES = [
  "初来者",
  "拾荒者",
  "开垦者",
  "行路人",
  "逐风者",
  "破晓者",
  "远行者",
  "拓荒者",
  "旷野行者",
  "大地之子",
  "旷野传说",
];
export const levelInfo = computed(() => {
  const xp = totalXp.value;
  let lv = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1;
  const cur = xp - (LEVELS[lv - 1] || 0);
  const need = (LEVELS[lv] || LEVELS[lv - 1] + 1500) - (LEVELS[lv - 1] || 0);
  return {
    level: lv,
    name: LEVEL_NAMES[Math.min(lv - 1, LEVEL_NAMES.length - 1)],
    cur,
    need,
    xp,
  };
});

export const catXp = computed(() => {
  const m = {};
  for (const c of Object.keys(CATS)) m[c] = 0;
  for (const d of state.done) {
    const t = taskById[d.qid];
    if (t) m[t.cat] += d.xp;
  }
  return m;
});
export const CAT_TITLES = {
  body: "铁打的",
  mind: "清醒者",
  create: "造物者",
  live: "自立者",
  courage: "无畏者",
};
export const earnedTitles = computed(() =>
  Object.entries(catXp.value)
    .filter(([, xp]) => xp >= 100)
    .map(([c]) => CAT_TITLES[c]),
);

export const lifeMetrics = computed(() => {
  const m = {};
  for (const d of state.done)
    for (const u of d.units || []) m[u.metric] = (m[u.metric] || 0) + u.v;
  // 累积型任务的进行中进度也实时计入——读了就是读了
  for (const a of state.active) {
    const t = taskById[a.qid];
    if (t && t.type === "total" && t.metric)
      m[t.metric] =
        (m[t.metric] || 0) + a.logs.reduce((s, l) => s + (l.v || 0), 0);
  }
  return m;
});
export const maxStreakDays = computed(() =>
  Math.max(
    ...state.done.map((d) => d.streak || bestRun(d.logs)),
    ...state.active.map((a) => bestRun(a.logs)),
    0,
  ),
);

// ———— 备份 ————
export function exportData() {
  return JSON.stringify(
    {
      app: "kuangye",
      version: 3,
      exportedAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)),
    },
    null,
    2,
  );
}
export function importData(json) {
  const s = parseImport(json);
  state.customTasks = s.customTasks;
  state.active = s.active;
  state.done = s.done;
  state.abandoned = s.abandoned;
  state.settings = s.settings;
  state.home = s.home;
}
export function resetData() {
  // Purge first so the watcher's fresh-empty save lands after the vault is
  // cleared; the previous generation is really deleted, not kept as backup.
  persistence.purge();
  Object.assign(state, emptyState());
}

// Home operations always validate against the catalog; the view never sets prices or rewards.
export function purchase(fid) {
  const catalog = furnitureById[fid];
  const f =
    catalog?.stall === "vintage"
      ? vintageStock(today()).find((i) => i.id === fid)
      : catalog;
  const item = buyFurniture(state.home, f, today(), state.done);
  if (item) buddyMoment("curious", 2500, "这个放在家里，一定很好看。");
  return item;
}
export function place(uid, at) {
  const result = placeFurniture(state.home, uid, at);
  buddyMoment(
    result.ok ? "happy" : "worried",
    2000,
    result.ok ? "这里刚刚好。" : "换个位置试试？",
  );
  return result;
}
export function recycle(uid) {
  return recycleFurniture(state.home, uid);
}
unlockGifts(state.home, levelInfo.value.level, today());

export function expandHome(axis) {
  const result = expandRoom(state.home, axis);
  if (result.ok) {
    addHomeMoment(
      state.home,
      "expansion",
      `小家长大到 ${result.area} 平方米啦。`,
      `expansion:${result.next.w}x${result.next.d}`,
    );
    buddyMoment("celebrate", 3200, "哇，小家又多了一个温暖的角落。");
  }
  return result;
}
export function changeHomeDecor(key, value) {
  if (!["wall", "floor", "light", "weather"].includes(key)) return;
  state.home.decor = normalizeDecor({ ...state.home.decor, [key]: value });
}
export function rememberHomeInteraction(model, text) {
  return addHomeMoment(state.home, "discovery", text, `discovery:${model}`);
}

// Town changes share the persistence facade; rendering never unlocks a building.
export function setExterior(key, value) {
  state.home.town ||= emptyTown();
  return changeExterior(state.home.town, key, value);
}
export function arrangeYard(id, at) {
  state.home.town ||= emptyTown();
  return placeYard(state.home.town, id, at);
}
export function adoptYardPlan(id) {
  state.home.town ||= emptyTown();
  return applyYardPlan(state.home.town, id);
}
export function removeYard(id) {
  if (!state.home.town) return;
  state.home.town.yard = state.home.town.yard.filter(p => p.id !== id);
}
export function restoreLibrary() {
  state.home.town ||= emptyTown();
  const result = repairLibrary(state.home.town, state.done);
  if (result.ok) buddyMoment('happy', 2500, '街角又多了一个可以坐坐的地方。');
  return result;
}

const readingState = () => (state.home.reading ||= emptyReading());
export const openReadingBook = fields => startBook(readingState(), fields, crypto.randomUUID(), today());
export const saveReadingBook = (id, fields) => updateBook(readingState(), id, fields);
export const addReadingNote = (id, text) => noteBook(readingState(), id, text, today());
export const putReadingBookAway = (id, finished) => shelveBook(readingState(), id, finished, today());
export const continueReadingBook = id => reopenBook(readingState(), id);
const inquiryState = () => (state.home.inquiry ||= emptyInquiry());
export const openInquiryPage = fields => startInquiry(inquiryState(), fields, crypto.randomUUID(), today());
export const saveInquiryPage = (id, fields) => updateInquiry(inquiryState(), id, fields);
export const addInquiryClue = (id, fields) => noteInquiry(inquiryState(), id, fields, today());
export const keepInquiryPage = id => keepInquiry(inquiryState(), id, today());
export const continueInquiryPage = id => reopenInquiry(inquiryState(), id);
