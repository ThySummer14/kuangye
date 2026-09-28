// Personal reading records do not award progress, XP or light.
const clean = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
export const READING_TASKS = ['read-s1', 'read-s2', 'read-s3'];
export const emptyReading = () => ({ books: [] });
export function bookFields(raw = {}) {
  return { title: clean(raw.title, 80), author: clean(raw.author, 60), bookmark: clean(raw.bookmark, 80), next: clean(raw.next, 160), qid: READING_TASKS.includes(raw.qid) ? raw.qid : '' };
}
export function normalizeReading(raw) {
  const result = emptyReading(), seen = new Set();
  for (const b of Array.isArray(raw?.books) ? raw.books : []) {
    const id = clean(b?.id, 100);
    if (!b || !id || !bookFields(b).title || seen.has(id)) continue;
    seen.add(id);
    result.books.push({ id, ...bookFields(b), started: clean(b.started, 10), finished: clean(b.finished, 10), status: b.status === 'reading' && !result.books.some(x => x.status === 'reading') ? 'reading' : 'shelved', notes: (Array.isArray(b.notes) ? b.notes : []).filter(n => n && clean(n.text, 1500)).map(n => ({ text: clean(n.text, 1500), at: clean(n.at, 10), bookmark: clean(n.bookmark, 80) })) });
  }
  return result;
}
export function startBook(reading, fields, id, at) {
  if (reading.books.some(b => b.status === 'reading')) return { ok: false, why: '先把手里的这本放回书架，再打开下一本。' };
  const data = bookFields(fields);
  if (!data.title) return { ok: false, why: '写下书名，就可以开始了。' };
  if (!id || reading.books.some(b => b.id === id)) return { ok: false, why: '这本书已经在书架上。' };
  reading.books.unshift({ id, ...data, started: at, finished: '', status: 'reading', notes: [] });
  return { ok: true };
}
export function updateBook(reading, id, fields) {
  const b = reading.books.find(b => b.id === id), data = bookFields(fields);
  if (!b || !data.title) return { ok: false, why: '书名不能留空。' };
  Object.assign(b, data); return { ok: true };
}
export function noteBook(reading, id, text, at) {
  const b = reading.books.find(b => b.id === id), value = clean(text, 1500);
  if (!b || !value) return { ok: false, why: '写下一句话，再夹进书里。' };
  b.notes.unshift({ text: value, at, bookmark: b.bookmark }); return { ok: true };
}
export function shelveBook(reading, id, finished, at) {
  const b = reading.books.find(b => b.id === id);
  if (!b || b.status !== 'reading') return { ok: false, why: '这本书已经在书架上。' };
  b.status = 'shelved'; b.finished = finished ? at : ''; return { ok: true };
}
export function reopenBook(reading, id) {
  const b = reading.books.find(b => b.id === id);
  if (!b || reading.books.some(b => b.status === 'reading')) return { ok: false, why: '先放回手里的书，再继续这一本。' };
  b.status = 'reading'; b.finished = ''; return { ok: true };
}
