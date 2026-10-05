import { studioReady, studioStatus } from './studio.js';
export const emptyVisits = () => [];
const invalid = () => { throw Error('街角来往资料不完整，请保留原备份。'); };
function field(value, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) invalid();
  return value;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) invalid();
  return value;
}
export function residentBrief(raw) {
  if (!raw || !['pending-review','approved'].includes(raw.reviewStatus)) invalid();
  const list = (value, max, limit) => {
    if (!Array.isArray(value) || !value.length || value.length > max) invalid();
    return value.map(item => field(item, limit));
  };
  return { name:field(raw.name,40), role:field(raw.role,60), title:field(raw.title,60),
    story:list(raw.story,6,800), steps:list(raw.steps,6,160), criterion:field(raw.criterion,160),
    reply:field(raw.reply,600), change:field(raw.change,240), reviewStatus:raw.reviewStatus };
}
export function normalizeVisits(raw) {
  if (raw == null) return emptyVisits();
  if (!Array.isArray(raw)) invalid();
  const ids = new Set(), works = new Set();
  return raw.map(visit => {
    const id = field(visit?.id,100), workId = field(visit.workId,100);
    if (ids.has(id) || works.has(workId)) invalid();
    ids.add(id); works.add(workId);
    let delivered = null;
    if (visit.delivered != null) {
      const d = visit.delivered;
      if (typeof d.excerpt !== 'string' || d.excerpt.length > 240) invalid();
      delivered = { at:date(d.at), title:field(d.title,60), excerpt:d.excerpt };
    }
    return { id, workId, acceptedAt:date(visit.acceptedAt), brief:residentBrief(visit.brief), delivered };
  });
}
export const visitForWork = (visits, id) => visits.find(visit => visit.workId === id);
export const hasResidentDisplay = visits => visits.some(visit => !!visit.delivered);
export function validateVisitLinks(state) {
  for (const visit of state.home.visits) {
    const work = state.home.studio.works.find(work => work.id === visit.workId);
    if (!work) throw Error('街角来往缺少原作品，请保留原备份。');
    if (visit.delivered && (studioStatus(work,state) !== 'done' || !studioReady(work)))
      throw Error('交回的作品尚未收好，请保留原备份。');
  }
}
export function handInVisit(state, id, confirmed, at) {
  const visit = state.home.visits.find(visit => visit.id === id);
  if (!visit) return { ok:false, why:'没有找到这次来访。' };
  if (visit.delivered) return { ok:true, unchanged:true, visit };
  const work = state.home.studio.works.find(work => work.id === visit.workId);
  if (!work || studioStatus(work,state) !== 'done' || !studioReady(work)) return { ok:false, why:'先到画室收好这件作品，再带回来。' };
  if (confirmed !== true) return { ok:false, why:'按约定检查这一版，再确认交回。' };
  visit.delivered = { at:date(at), title:work.title, excerpt:work.body.trim().slice(0,240) };
  return { ok:true, visit };
}
