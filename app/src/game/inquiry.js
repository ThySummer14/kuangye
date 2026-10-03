// A private learning notebook, separate from task progress and the light economy.
export const INQUIRY_LIMITS = { question: 120, guess: 1500, answer: 3000, next: 160, source: 500, note: 1500 };
const clean = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
export const emptyInquiry = () => ({ pages: [] });
export function inquiryFields(raw = {}) {
  return Object.fromEntries(['question', 'guess', 'answer', 'next'].map(key => [key, clean(raw[key], INQUIRY_LIMITS[key])]));
}
export function normalizeInquiry(raw) {
  if (raw == null) return emptyInquiry();
  if (!Array.isArray(raw.pages)) throw Error('问号夹页资料格式不完整，请保留原备份');
  const seen = new Set();
  let hasCurrent = false;
  const pages = raw.pages.map(page => {
    const id = clean(page?.id, 100), fields = inquiryFields(page);
    if (!id || !fields.question || seen.has(id) || !Array.isArray(page.notes))
      throw Error('问号夹页内容缺失或重复，请保留原备份');
    seen.add(id);
    const notes = page.notes.map(entry => {
      const text = clean(entry?.text, INQUIRY_LIMITS.note);
      if (!text) throw Error('问号夹页中的线索缺失，请保留原备份');
      return { text, source: clean(entry.source, INQUIRY_LIMITS.source), at: clean(entry.at, 10) };
    });
    const exploring = page.status === 'exploring' && !hasCurrent;
    if (exploring) hasCurrent = true;
    return { id, ...fields, status: exploring ? 'exploring' : 'kept', started: clean(page.started, 10), keptAt: clean(page.keptAt, 10), notes };
  });
  return { pages };
}
export function startInquiry(inquiry, input, id, at) {
  if (inquiry.pages.some(page => page.status === 'exploring')) return { ok: false, why: '先把手里的问题夹回去，再打开下一张。' };
  const fields = inquiryFields(input);
  if (!fields.question) return { ok: false, why: '写一个自己想弄懂的问题，就可以开始。' };
  if (!id || inquiry.pages.some(page => page.id === id)) return { ok: false, why: '这张夹页已经在本子里。' };
  inquiry.pages.unshift({ id, ...fields, answer: '', started: at, keptAt: '', status: 'exploring', notes: [] });
  return { ok: true, id };
}
export function updateInquiry(inquiry, id, input) {
  const page = inquiry.pages.find(page => page.id === id);
  if (!page) return { ok: false, why: '没有找到这张夹页。' };
  const fields = inquiryFields({ ...page, ...input });
  if (!fields.question) return { ok: false, why: '给这张夹页留一个具体的问题。' };
  Object.assign(page, fields);
  return { ok: true };
}
export function noteInquiry(inquiry, id, input, at) {
  const page = inquiry.pages.find(page => page.id === id), text = clean(input?.text, INQUIRY_LIMITS.note);
  if (!page || !text) return { ok: false, why: '先写下实际找到的一条线索。' };
  page.notes.push({ text, source: clean(input.source, INQUIRY_LIMITS.source), at });
  return { ok: true };
}
export function keepInquiry(inquiry, id, at) {
  const page = inquiry.pages.find(page => page.id === id);
  if (!page || page.status !== 'exploring') return { ok: false, why: '这张夹页已经收好了。' };
  page.status = 'kept'; page.keptAt = at;
  return { ok: true };
}
export function reopenInquiry(inquiry, id) {
  const page = inquiry.pages.find(page => page.id === id);
  if (!page || inquiry.pages.some(page => page.status === 'exploring')) return { ok: false, why: '先收好手里的夹页，再继续这一张。' };
  page.status = 'exploring'; page.keptAt = '';
  return { ok: true };
}
