import { normalizeState } from "./game/save.js";
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

const KEY = "kuangye.v3";
const LEGACY_KEY = "kuangye.v1";
const emptyState = () => ({
  home: emptyHome(),
  active: [], // { qid, start, logs:[{d, v?, note?, shield?}], shields }
  done: [], // { qid, xp, at, review, units:[{metric, v}], streak? }
  abandoned: [], // { qid, reason, at }
  settings: { devDate: "" },
});

const load = () => {
  for (const key of [KEY, "kuangye.v2", LEGACY_KEY]) {
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      const normalized = normalizeState(raw);
      if (normalized) return normalized;
    } catch (e) {
      /* 损坏数据尝试下一个版本 */
    }
  }
  return emptyState();
};

export const state = reactive(load());
export const saveWarning = reactive({ text: "" });

watch(
  state,
  () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      saveWarning.text = "浏览器未能保存进度，请先在成长手记中导出备份。";
    }
  },
  { deep: true },
);

export const taskById = Object.fromEntries(TASKS.map((t) => [t.id, t]));
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
  if (activeOf(task.id)) return { ok: false, why: "已在进行中" };
  if (state.done.some((d) => d.qid === task.id && !task.repeatable))
    return { ok: false, why: "已完成过这条支线" };
  if (!chainUnlocked(task))
    return { ok: false, why: "先完成这条成长线的上一阶段" };
  const l = acceptState();
  if (l.total >= 3)
    return { ok: false, why: "手里最多放 3 件事，慢慢完成就好" };
  if (task.tier === "season" && l.season >= 2)
    return { ok: false, why: "赛季级任务最多同时 2 个" };
  if (task.tier === "chapter" && l.chapter >= 2)
    return { ok: false, why: "本章任务最多同时 2 个" };
  return { ok: true };
}
export function accept(task) {
  if (!canAccept(task).ok) return false;
  state.active.push({ qid: task.id, start: today(), logs: [], shields: 2 });
  buddyMoment("excited", 1300, "新任务，冲！");
  return true;
}

// ———— 进度 ————
export function progressOf(a) {
  const t = taskById[a.qid];
  if (!t) return { cur: 0, target: 1 };
  if (t.type === "streak") return { cur: streakRun(a), target: t.target };
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
function streakRun(a) {
  const dates = [...new Set(a.logs.map((l) => l.d).filter(Boolean))].sort();
  if (!dates.length) return 0;
  const end = dates.includes(today()) ? today() : yesterday();
  let run = 0;
  const cursor = new Date(end + "T12:00:00");
  const set = new Set(dates);
  while (set.has(dateStr(cursor))) {
    run += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return run;
}
export function canUseShield(a) {
  return (
    taskById[a.qid]?.type === "streak" &&
    a.start <= yesterday() &&
    a.shields > 0 &&
    !a.logs.some((l) => l.d === yesterday())
  );
}
export function useShield(a) {
  if (!canUseShield(a)) return false;
  a.logs.push({ d: yesterday(), shield: true });
  recordGlimmer(state.home, yesterday());
  a.shields -= 1;
  buddyMoment("excited", 1000, "金牌替你守住一天");
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
    xp: DIFF[t.diff].xp,
    at: today(),
    review,
    units,
    logs: a.logs.map((l) => ({ ...l })),
    ...(t.type === "streak" ? { streak: p.cur } : {}),
  });
  state.active = state.active.filter((x) => x !== a);
  rewardCompletion(state.home, DIFF[t.diff].xp);
  recordGlimmer(state.home, today());
  unlockGifts(state.home, levelInfo.value.level, today());
  buddyMoment("celebrate", 2000, "这一点光，也照进我们家啦。");
  return true;
}
export function abandon(a, reason = "") {
  if (!a || !state.active.includes(a) || !taskById[a.qid]) return false;
  state.abandoned.push({ qid: a.qid, reason, at: today() });
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
function longestStreak(logs) {
  const dates = [...new Set(logs.map((l) => l.d).filter(Boolean))].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const s of dates) {
    const dt = new Date(s + "T12:00:00").getTime();
    run = prev && dt - prev === 86400000 ? run + 1 : 1;
    prev = dt;
    if (run > best) best = run;
  }
  return best;
}

export const maxStreakDays = computed(() =>
  Math.max(
    ...state.done.map((d) => d.streak || longestStreak(d.logs || [])),
    ...state.active.map((a) => longestStreak(a.logs)),
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
  const s = normalizeState(JSON.parse(json));
  if (!s) throw new Error("数据格式不对：缺少 active 数组");
  state.active = s.active;
  state.done = s.done;
  state.abandoned = s.abandoned;
  state.settings = s.settings;
  state.home = s.home;
}
export function resetData() {
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
