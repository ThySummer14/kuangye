// 赛季配置：静态数据，随版本发布。换这份数据 = 游戏"版本更新"。
export const SEASON = {
  id: 'S1',
  name: '破土',
  motto: '轨道消失了，前面是一片旷野。',
  start: '2026-09-23', // 秋分开赛
  end: '2026-12-21', // 冬至前夜结算
  chapters: [
    { name: '翻土', hint: '松开惯性，先动起来。' },
    { name: '播种', hint: '把挑战种进日常。' },
    { name: '发芽', hint: '看见改变破土而出。' },
  ],
}

const DAY = 86400000
const d = (s) => {
  const [y, m, dd] = s.split('-').map(Number)
  return new Date(y, m - 1, dd, 12)
}

// 当前所处阶段：pre(序章) / active(进行中) / settle(结算期)
export function seasonPhase(now = new Date()) {
  const s = d(SEASON.start)
  const e = d(SEASON.end)
  if (now < s) return { phase: 'pre', chapter: 0, dayInSeason: 0, daysToStart: Math.ceil((s - now) / DAY) }
  if (now > e) return { phase: 'settle', chapter: 2, dayInSeason: 0 }
  const dayInSeason = Math.floor((now - s) / DAY) + 1
  const seg = Math.floor((e - s) / DAY) / 3
  const chapter = Math.min(2, Math.floor((dayInSeason - 1) / seg))
  return { phase: 'active', chapter, dayInSeason }
}

// 第 i 章的日期范围 [起, 止]
export function chapterRange(i) {
  const s = d(SEASON.start)
  const e = d(SEASON.end)
  const total = Math.floor((e - s) / DAY)
  const seg = total / 3
  const a = new Date(s.getTime() + Math.floor(i * seg) * DAY)
  const b = i === 2 ? e : new Date(s.getTime() + Math.floor((i + 1) * seg) * DAY - DAY)
  return [a, b]
}

export const fmtDate = (dt) => `${dt.getMonth() + 1}月${dt.getDate()}日`

export const dateStr = (now = new Date()) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
