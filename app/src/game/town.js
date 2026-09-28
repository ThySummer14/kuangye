import { EXTERIOR, YARD_ITEMS, LIBRARY_STAGES } from '../data/town.js';
export const YARD_SIZE = { w: 6, d: 4 };
export const yardItem = id => YARD_ITEMS.find(item => item.id === id);
export function yardFootprint(id, rotation = 0) {
  const item = yardItem(id);
  if (!item) return null;
  return rotation % 180 ? { w: item.d, d: item.w } : { w: item.w, d: item.d };
}
export const emptyTown = () => ({ exterior: { wall: 'cream', roof: 'clay', door: 'oak', porch: 'open', path: 'stone' }, yard: [], library: 0 });
export function readingMilestones(done = []) {
  let count = 0;
  for (const stage of LIBRARY_STAGES) {
    if (!done.some(d => d.qid === stage.qid)) break;
    count++;
  }
  return count;
}
export function yardCheck(yard, id, at) {
  const size = yardFootprint(id, at?.rotation);
  if (!size || !Number.isInteger(at?.x) || !Number.isInteger(at?.z) || ![0,90,180,270].includes(at?.rotation))
    return { ok: false, why: '先选一件材料和一个院子里的位置。' };
  if (at.x < 0 || at.z < 0 || at.x + size.w > 6 || at.z + size.d > 4)
    return { ok: false, why: '这里超出院子的边界了。' };
  if (at.x < 4 && at.x + size.w > 2)
    return { ok: false, why: '给中间的入户小径留出位置。' };
  if (yard.some(p => {
    if (p.id === id) return false;
    const other = yardFootprint(p.id, p.rotation);
    return at.x < p.x + other.w && at.x + size.w > p.x && at.z < p.z + other.d && at.z + size.d > p.z;
  })) return { ok: false, why: '这里已经有东西了，换一格试试。' };
  return { ok: true };
}
export function normalizeTown(raw, done = []) {
  const result = emptyTown();
  for (const key of Object.keys(EXTERIOR))
    if (Object.hasOwn(EXTERIOR[key], raw?.exterior?.[key])) result.exterior[key] = raw.exterior[key];
  for (const p of Array.isArray(raw?.yard) ? raw.yard : []) {
    if (p && !result.yard.some(i => i.id === p.id) && yardCheck(result.yard, p.id, p).ok)
      result.yard.push({ id: p.id, x: p.x, z: p.z, rotation: p.rotation });
  }
  result.library = Number.isInteger(raw?.library) ? Math.max(0, Math.min(3, readingMilestones(done), raw.library)) : 0;
  return result;
}
export function changeExterior(town, key, value) {
  if (!Object.hasOwn(EXTERIOR, key) || !Object.hasOwn(EXTERIOR[key], value)) return false;
  town.exterior[key] = value;
  return true;
}
export function placeYard(town, id, at) {
  const check = yardCheck(town.yard, id, at);
  if (!check.ok) return check;
  town.yard = [...town.yard.filter(p => p.id !== id), { id, x: at.x, z: at.z, rotation: at.rotation }];
  return { ok: true };
}
export function repairLibrary(town, done) {
  if (town.library >= 3) return { ok: false, why: '书屋已经修好了，来坐坐吧。' };
  if (town.library >= readingMilestones(done)) return { ok: false, why: '先完成这一阶段的阅读，再把变化留在街角。' };
  town.library++;
  return { ok: true, stage: town.library };
}
