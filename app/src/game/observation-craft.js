import { observationDate, observationFields, observationReady, observationImageSize } from './observations.js';
import { studioImageSize, STUDIO_LIMITS } from './studio.js';

const invalid = () => { throw Error('观察与作品的关联资料不完整，请保留原备份。'); };
const identity = value => typeof value === 'string' && !!value.trim() && value === value.trim() && value.length <= 100;
export const observationWorkFor = (links, id) => links.find(link => link.observationId === id);
export const observationSourceFor = (links, id) => links.find(link => link.workId === id);
export const observationCraftImageSize = links => links.reduce((size, link) => size + link.source.images.reduce((n, image) => n + image.length, 0), 0);

export function observationSource(entry, includeImages = true) {
  const { place, body, kind, observedOn, images } = observationFields(entry);
  if (!observationReady({ place, body })) invalid();
  return { place, body, kind, observedOn, images: includeImages ? [...images] : [] };
}
export function normalizeObservationWorks(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) invalid();
  const observations = new Set(), works = new Set();
  return raw.map(link => {
    if (!identity(link?.observationId) || !identity(link.workId) || observations.has(link.observationId) || works.has(link.workId) || !link.source) invalid();
    observations.add(link.observationId); works.add(link.workId);
    return { observationId: link.observationId, workId: link.workId, startedAt: observationDate(link.startedAt), source: observationSource(link.source) };
  });
}
export function validateObservationWorkLinks(home) {
  for (const link of home.observationWorks) {
    if (!home.observations.entries.some(entry => entry.id === link.observationId && entry.status === 'kept') || !home.studio.works.some(work => work.id === link.workId)) invalid();
  }
}
// 所有检查在创建作品之前完成；重复打开不复制素材，也不需要新名额。
export function prepareObservationWork(state, id, includeImages = true) {
  const existing = observationWorkFor(state.home.observationWorks, id);
  if (existing) return { ok: true, existing: true, link: existing, work: state.home.studio.works.find(work => work.id === existing.workId) };
  const entry = state.home.observations.entries.find(entry => entry.id === id);
  if (!entry || entry.status !== 'kept') return { ok: false, why: '先把具体发现收进观察册，再带到画室。' };
  if (state.active.length >= 3) return { ok: false, why: '手里最多放 3 件事，完成或放下一件后再来。' };
  const source = observationSource(entry, includeImages);
  const used = studioImageSize(state.home.studio.works) + observationImageSize(state.home.observations) + observationCraftImageSize(state.home.observationWorks);
  const added = source.images.reduce((size, image) => size + image.length, 0);
  if (used + added > STUDIO_LIMITS.allImageChars) return { ok: false, why: '带入这些图片后，保存空间不够了。可以取消带图，只带文字；原观察和作品都保留着。' };
  return { ok: true, source };
}
