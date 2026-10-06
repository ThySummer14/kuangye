import { isPersonalId } from './personal-tasks.js';
export const STUDIO_LIMITS = { title: 60, body: 12000, note: 240, images: 4, imageChars: 240000, allImageChars: 1800000 };
const text = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const themeIds = new Set(['notice', 'words', 'lines', 'own']);
export const emptyStudio = () => ({ works: [], displayId: '' });
export function studioImage(data) {
  if (typeof data !== 'string' || data.length > STUDIO_LIMITS.imageChars || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw Error('作品图片格式或大小不合适，请保留原文件，换一张较小的 PNG、JPEG 或 WebP 图片。');
  return data;
}
export function studioFields(input = {}) {
  if (input.images != null && (!Array.isArray(input.images) || input.images.length > STUDIO_LIMITS.images)) throw Error('每件作品最多保留四张图片。');
  for (const key of ['title', 'body', 'note']) {
    if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > STUDIO_LIMITS[key])) throw Error('作品文字格式或长度不合适，请保留原内容。');
  }
  return {
    title: text(input.title, STUDIO_LIMITS.title), body: input.body || '', note: input.note || '',
    images: (input.images || []).map(studioImage),
  };
}
export const studioImageSize = works => works.reduce((n, work) => n + work.images.reduce((sum, data) => sum + data.length, 0), 0);
export function normalizeStudio(raw) {
  if (raw == null) return emptyStudio();
  if (!Array.isArray(raw.works)) throw Error('作品集资料不完整，请保留原备份。');
  const ids = new Set(), taskIds = new Set();
  const works = raw.works.map(work => {
    const id = work?.id;
    if (typeof id !== 'string' || id.length > 100 || id.trim() !== id) throw Error('作品身份格式不完整，请保留原备份。');
    if (!id || ids.has(id) || !themeIds.has(work.theme) || !Array.isArray(work.taskIds) || !work.taskIds.length)
      throw Error('作品身份或任务关联缺失、重复，请保留原备份。');
    ids.add(id);
    for (const qid of work.taskIds) {
      if (!isPersonalId(qid) || taskIds.has(qid)) throw Error('作品任务关联缺失或重复，请保留原备份。');
      taskIds.add(qid);
    }
    for (const key of ['exerciseId', 'created', 'updated']) if (work[key] != null && (typeof work[key] !== 'string' || work[key].length > (key==='exerciseId' ? 100 : 10))) throw Error('作品资料格式不完整，请保留原备份。');
    const fields = studioFields(work);
    if (!fields.title || (typeof work.body === 'string' && work.body.length > STUDIO_LIMITS.body)) throw Error('作品正文或标题不完整，请保留原备份。');
    return { id, ...fields, theme: work.theme, exerciseId: work.exerciseId || '', taskIds: [...work.taskIds], created: work.created || '', updated: work.updated || '' };
  });
  if (studioImageSize(works) > STUDIO_LIMITS.allImageChars) throw Error('这份作品集图片超过本版本的保存容量，请保留原备份。');
  const displayId = text(raw.displayId, 100);
  if (displayId && !works.some(work => work.id === displayId)) throw Error('陈列作品的原始记录缺失，请保留原备份。');
  return { works, displayId };
}
export function validateStudioLinks(state) {
  const definitions = new Set(state.customTasks.map(task => task.id));
  const records = new Set([...state.active, ...state.done, ...state.abandoned].map(record => record.qid));
  for (const work of state.home.studio.works) {
    if (work.taskIds.some(qid => !definitions.has(qid) || !records.has(qid))) throw Error('作品缺少原始任务记录，请保留原备份。');
    if (studioStatus(work, state) === 'done' && !studioReady(work)) throw Error('已收好的作品缺少正文或图片，请保留原备份。');
  }
  const shown = state.home.studio.works.find(work => work.id === state.home.studio.displayId);
  if (shown && (studioStatus(shown, state) !== 'done' || !studioReady(shown))) throw Error('陈列作品尚未收好，请保留原备份。');
}
export const studioReady = work => !!work?.title.trim() && (!!work.body.trim() || !!work.images.length);
export function studioStatus(work, state) {
  if (work.taskIds.some(qid => state.done.some(record => record.qid === qid))) return 'done';
  return state.active.some(record => record.qid === work.taskIds.at(-1)) ? 'working' : 'rest';
}
// 返回哪一版由真实暂放历史决定；编辑成果不会改变回来的起点。
export function latestRestingStudioWork(state) {
  const byTask = new Map(state.home.studio.works.filter(work => studioStatus(work, state) === 'rest').map(work => [work.taskIds.at(-1), work]));
  const candidates = state.abandoned.map((record, index) => ({ record, index, work: byTask.get(record.qid) }))
    .filter(item => item.work).sort((a, b) => b.record.at.localeCompare(a.record.at) || b.index - a.index);
  const item = candidates[0];
  return item ? { work: item.work, record: item.record } : null;
}
export const studioWorkForTask = (studio, qid) => studio.works.find(work => work.taskIds.at(-1) === qid);
export function addStudioWork(studio, fields, { id, qid, theme = 'own', exerciseId = '', at, otherImageChars = 0 }) {
  const value = studioFields(fields);
  if (!value.title || !id || studio.works.some(work => work.id === id) || !isPersonalId(qid)) return { ok: false, why: '先给作品起一个名字。' };
  const work = { id, ...value, theme: themeIds.has(theme) ? theme : 'own', exerciseId, taskIds: [qid], created: at, updated: at };
  if (studioImageSize([...studio.works, work]) + otherImageChars > STUDIO_LIMITS.allImageChars) return { ok: false, why: '图片保存空间快满了。请换较小的图片；已有作品都保留着。' };
  studio.works.unshift(work);
  return { ok: true, work };
}
export function updateStudioWork(studio, id, fields, at, otherImageChars = 0) {
  const work = studio.works.find(work => work.id === id);
  if (!work) return { ok: false, why: '没有找到这件作品。' };
  const value = studioFields(fields);
  if (!value.title) return { ok: false, why: '给这件作品留一个名字。' };
  const next = studio.works.map(item => item.id === id ? { ...item, ...value } : item);
  if (studioImageSize(next) + otherImageChars > STUDIO_LIMITS.allImageChars) return { ok: false, why: '图片保存空间快满了。请换较小的图片；已有作品都保留着。' };
  Object.assign(work, value, { updated: at });
  return { ok: true, work };
}
