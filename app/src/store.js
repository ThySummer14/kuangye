// 状态与全部游戏逻辑。数据持久化在 localStorage（v0.2 迁移 IndexedDB）。
import { reactive, watch, computed } from 'vue'
import { TASKS, DIFF, CATS } from './data/tasks'
import { dateStr } from './data/season'

// ———— 小芽情绪总线：任何动作都可以让小芽有反应（含气泡台词） ————
export const BUDDY_NAME = '芽芽'
export const buddyBus = reactive({ mood: 'idle', at: 0, text: '' })
export function buddyMoment(mood, ms = 1500, text = '') {
  buddyBus.mood = mood
  buddyBus.text = text
  buddyBus.at = Date.now() + ms
}

const KEY = 'kuangye.v1'
const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && Array.isArray(raw.active)) return raw
  } catch (e) { /* 损坏数据当作全新开始 */ }
  return null
}

export const state = reactive(
  load() || {
    active: [], // { qid, start, logs:[{d, v?, note?}], shields }
    done: [], // { qid, xp, at, review, units:[{metric, v}] }
    abandoned: [], // { qid, reason, at }
    settings: { devDate: '' },
  }
)

watch(state, () => localStorage.setItem(KEY, JSON.stringify(state)), { deep: true })

export const taskById = Object.fromEntries(TASKS.map((t) => [t.id, t]))
export const activeOf = (qid) => state.active.find((a) => a.qid === qid)

// ———— 时间（支持"时间旅行"调试） ————
export function now() {
  return state.settings.devDate ? new Date(state.settings.devDate + 'T12:00:00') : new Date()
}
export function today() {
  return dateStr(now())
}

// ———— 任务链：由易到难，完成前一阶段才解锁后一阶段 ————
export const chainStages = {}
for (const t of TASKS) {
  if (t.chain) (chainStages[t.chain] ||= []).push(t)
}
for (const k in chainStages) chainStages[k].sort((a, b) => (a.stage || 1) - (b.stage || 1))

export function chainUnlocked(task) {
  if (!task.chain) return true
  const list = chainStages[task.chain]
  const idx = list.indexOf(task)
  return list.slice(0, idx).every((prev) => state.done.some((d) => d.qid === prev.id))
}
export function nextChainStage(task) {
  if (!task.chain) return null
  const list = chainStages[task.chain]
  return list[list.indexOf(task) + 1] || null
}

// ———— 接取 ————
export function acceptState() {
  const season = state.active.filter((a) => taskById[a.qid]?.tier === 'season').length
  const chapter = state.active.filter((a) => taskById[a.qid]?.tier === 'chapter').length
  return { season, chapter, total: state.active.length }
}
export function canAccept(task) {
  if (activeOf(task.id)) return { ok: false, why: '已在进行中' }
  if (state.done.some((d) => d.qid === task.id && !task.repeatable)) return { ok: false, why: '已完成过这条支线' }
  if (!chainUnlocked(task)) return { ok: false, why: '先完成这条成长线的上一阶段' }
  const l = acceptState()
  if (l.total >= 3) return { ok: false, why: '同时进行最多 3 个——贪多是第一死因' }
  if (task.tier === 'season' && l.season >= 2) return { ok: false, why: '赛季级任务最多同时 2 个' }
  if (task.tier === 'chapter' && l.chapter >= 2) return { ok: false, why: '本章任务最多同时 2 个' }
  return { ok: true }
}
export function accept(task) {
  state.active.push({ qid: task.id, start: today(), logs: [], shields: 2 })
  buddyMoment('excited', 1300, '新任务，冲！')
}

// ———— 进度 ————
export function progressOf(a) {
  const t = taskById[a.qid]
  if (!t) return { cur: 0, target: 1 }
  if (t.type === 'streak') return { cur: a.logs.length, target: t.target }
  if (t.type === 'total') return { cur: a.logs.reduce((s, l) => s + (l.v || 0), 0), target: t.target }
  return { cur: 0, target: 1 }
}
export const reached = (a) => {
  const p = progressOf(a)
  return p.cur >= p.target
}
export function checkedToday(a) {
  const t = today()
  return a.logs.some((l) => l.d === t)
}
export function checkIn(a) {
  if (!checkedToday(a)) {
    a.logs.push({ d: today() })
    buddyMoment('excited', 900, '打卡 ✓')
  }
}
export function logUnits(a, v) {
  a.logs.push({ d: today(), v: Number(v) || 0 })
}

// ———— 完成 / 放弃 ————
export function complete(a, review = '') {
  const t = taskById[a.qid]
  if (!t) return
  const units = []
  if (t.type === 'total' && t.metric) {
    units.push({ metric: t.metric, v: a.logs.reduce((s, l) => s + (l.v || 0), 0) })
  } else if (t.mv && t.metric) {
    units.push({ metric: t.metric, v: t.mv })
  }
  state.done.push({ qid: t.id, xp: DIFF[t.diff].xp, at: today(), review, units })
  state.active = state.active.filter((x) => x !== a)
  buddyMoment('celebrate', 2000, '又变强了一点！')
}
export function abandon(a, reason = '') {
  state.abandoned.push({ qid: a.qid, reason, at: today() })
  state.active = state.active.filter((x) => x !== a)
  buddyMoment('sad', 2400, '没关系……下次再来')
}

// ———— 生涯统计 ————
export const totalXp = computed(() => state.done.reduce((s, d) => s + d.xp, 0))

const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000]
const LEVEL_NAMES = ['初来者', '拾荒者', '开垦者', '行路人', '逐风者', '破晓者', '远行者', '拓荒者', '旷野行者', '大地之子', '旷野传说']
export const levelInfo = computed(() => {
  const xp = totalXp.value
  let lv = 1
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1
  const cur = xp - (LEVELS[lv - 1] || 0)
  const need = (LEVELS[lv] || LEVELS[lv - 1] + 1500) - (LEVELS[lv - 1] || 0)
  return { level: lv, name: LEVEL_NAMES[Math.min(lv - 1, LEVEL_NAMES.length - 1)], cur, need, xp }
})

export const catXp = computed(() => {
  const m = {}
  for (const c of Object.keys(CATS)) m[c] = 0
  for (const d of state.done) {
    const t = taskById[d.qid]
    if (t) m[t.cat] += d.xp
  }
  return m
})
export const CAT_TITLES = { body: '铁打的', mind: '清醒者', create: '造物者', live: '自立者', courage: '无畏者' }
export const earnedTitles = computed(() =>
  Object.entries(catXp.value)
    .filter(([, xp]) => xp >= 100)
    .map(([c]) => CAT_TITLES[c])
)

export const lifeMetrics = computed(() => {
  const m = {}
  for (const d of state.done) for (const u of d.units || []) m[u.metric] = (m[u.metric] || 0) + u.v
  // 累积型任务的进行中进度也实时计入——读了就是读了
  for (const a of state.active) {
    const t = taskById[a.qid]
    if (t && t.type === 'total' && t.metric) m[t.metric] = (m[t.metric] || 0) + a.logs.reduce((s, l) => s + (l.v || 0), 0)
  }
  return m
})
export const maxStreakDays = computed(() => {
  const dates = new Set()
  for (const a of state.active) for (const l of a.logs) if (l.d) dates.add(l.d)
  const sorted = [...dates].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const s of sorted) {
    const dt = new Date(s + 'T12:00:00').getTime()
    run = prev && dt - prev === 86400000 ? run + 1 : 1
    prev = dt
    if (run > best) best = run
  }
  return best
})

// ———— 备份 ————
export function exportData() {
  return JSON.stringify(
    { app: 'kuangye', version: 1, exportedAt: new Date().toISOString(), state: JSON.parse(JSON.stringify(state)) },
    null,
    2
  )
}
export function importData(json) {
  const raw = JSON.parse(json)
  const s = raw.state || raw
  if (!Array.isArray(s.active)) throw new Error('数据格式不对')
  state.active = s.active || []
  state.done = s.done || []
  state.abandoned = s.abandoned || []
  state.settings = Object.assign({ devDate: '' }, s.settings || {})
}
export function resetData() {
  state.active = []
  state.done = []
  state.abandoned = []
  state.settings = { devDate: '' }
}
