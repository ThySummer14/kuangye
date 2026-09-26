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
