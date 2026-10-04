// 「节奏」：按天任务的规则。进度是记录过的不同日期数，只增不减；
// 连续段只作为可以欣赏的记录，从不作为门槛，空档不会清零任何东西。
import { dateStr } from "../data/season.js";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const noon = d => new Date(d + "T12:00:00");
const shift = (d, n) => { const t = noon(d); t.setDate(t.getDate() + n); return dateStr(t); };
const gap = (a, b) => Math.round((noon(b) - noon(a)) / 86400000);

export function recordedDates(logs = []) {
  return [...new Set((logs || []).map(l => l?.d).filter(d => DAY.test(d || "")))].sort();
}

export const dayCount = logs => recordedDates(logs).length;

// 最长一口气：日期里最长的相邻段。
export function bestRun(logs) {
  let best = 0, run = 0, prev = null;
  for (const d of recordedDates(logs)) {
    run = prev && gap(prev, d) === 1 ? run + 1 : 1;
    prev = d;
    best = Math.max(best, run);
  }
  return best;
}

// 正在进行的一口气：以今天或昨天结尾的相邻段；仅用于鼓励性文案。
export function currentRun(logs, today) {
  const set = new Set(recordedDates(logs));
  let cursor = set.has(today) ? today : shift(today, -1), run = 0;
  while (set.has(cursor)) { run += 1; cursor = shift(cursor, -1); }
  return run;
}

// 最近 length 天（含今天）的节奏条；接取之前的日子标为 before，不算空档。
export function rhythmStrip(logs, today, start = "", length = 14) {
  const set = new Set(recordedDates(logs));
  return Array.from({ length }, (_, i) => {
    const d = shift(today, i - length + 1);
    return { d, on: set.has(d), today: d === today, before: !!start && d < start };
  });
}

export function rhythmSummary(logs, today, target = 0) {
  const dates = recordedDates(logs);
  const last = dates.at(-1) || "";
  return {
    days: dates.length,
    target,
    left: Math.max(0, target - dates.length),
    best: bestRun(logs),
    current: currentRun(logs, today),
    last,
    // 距离上次记录过了几天；0 表示今天已记，-1 表示还没有记录。
    since: last ? gap(last, today) : -1,
  };
}

// 诚实补记：昨天做了却忘了记，可以补一笔。只能补接取之后的昨天，不消耗任何东西。
export function canBackfill(active, today) {
  const y = shift(today, -1);
  return !!active && (active.start || "") <= y && !(active.logs || []).some(l => l?.d === y);
}

export const yesterdayOf = today => shift(today, -1);
