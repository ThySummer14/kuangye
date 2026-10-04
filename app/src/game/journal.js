import { CATS } from '../data/tasks.js';

// Read-only projections: imported records may not arrive in chronological order.
export function journalRecords(records, taskById, { cat = 'all', query = '', onlyNotes = false } = {}) {
  const term = query.trim().toLowerCase();
  return records.map((record, index) => ({ record, task: taskById[record.qid], index }))
    .filter(({ record, task }) => (cat === 'all' || task?.cat === cat)
      && (!onlyNotes || Boolean(record.review?.trim() || record.reason?.trim()))
      && (!term || [task?.title, CATS[task?.cat]?.name, record.review, record.reason, record.at]
        .filter(Boolean).join(' ').toLowerCase().includes(term)))
    .sort((a, b) => String(b.record.at || '').localeCompare(String(a.record.at || '')) || b.index - a.index);
}

export function journalMonths(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const month = /^\d{4}-\d{2}/.exec(entry.record.at || '')?.[0] || '日期未记';
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(entry);
  }
  return [...groups].map(([month, entries]) => ({ month, entries }));
}

// Match the original completion, never an unrelated record with a similar title.
export function linkedMemoryRecord(done, memory) {
  if (!memory?.qid) return null;
  const matches = done.filter(d => d.qid === memory.qid);
  return matches.find(d => d.at === memory.date) || (matches.length === 1 ? matches[0] : null);
}

// 攒下的日子：所有留下过记录的日期，以及那天做了什么。只读投影，只列出现过的日子，不推算缺席。
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function gatheredDays(state, taskById) {
  const days = new Map();
  const add = (d, entry) => {
    if (!DAY.test(d || '')) return;
    if (!days.has(d)) days.set(d, []);
    if (!entry) return;
    const list = days.get(d), same = list.find(e => e.kind === entry.kind && e.key === entry.key);
    if (same) { if (entry.v) same.v = (same.v || 0) + entry.v; } else list.push(entry);
  };
  const logEntries = (qid, logs) => {
    const task = taskById[qid];
    for (const l of logs || []) add(l?.d, { kind: l?.v ? 'units' : 'day', key: qid, title: task?.title || '一件事', unit: task?.unit || '', v: Number(l?.v) || 0 });
  };
  for (const d of state.home?.glimmerDays || []) add(d);
  for (const a of state.active || []) logEntries(a.qid, a.logs);
  for (const r of state.done || []) {
    logEntries(r.qid, r.logs);
    add(r.at, { kind: 'done', key: r.qid, title: taskById[r.qid]?.title || '一件已经完成的事', review: r.review || '' });
  }
  for (const b of state.home?.reading?.books || []) for (const n of b.notes || []) add(n.at, { kind: 'reading', key: b.id, title: b.title });
  for (const p of state.home?.inquiry?.pages || []) for (const n of p.notes || []) add(n.at, { kind: 'clue', key: p.id, title: p.question });
  const order = { done: 0, day: 1, units: 1, reading: 2, clue: 3 };
  return [...days].sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({ date, entries: entries.sort((a, b) => order[a.kind] - order[b.kind]), done: entries.some(e => e.kind === 'done') }));
}

export function gatheredMonths(days) {
  const groups = new Map();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(day);
  }
  // 月内按日期正序排，读起来像一行攒起来的日子。
  return [...groups].map(([month, list]) => ({ month, days: [...list].reverse() }));
}
