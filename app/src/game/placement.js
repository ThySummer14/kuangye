import { furnitureById } from "../data/furniture.js";
export const ROOM = { w: 6, d: 6 };
export function footprint(item, rotation = 0) {
  return rotation % 2 ? { w: item.d, d: item.w } : { w: item.w, d: item.d };
}
export function placementCheck(item, at, placed, inventory, ignoreId) {
  if (!item || !Number.isInteger(at.x) || !Number.isInteger(at.z))
    return { ok: false, why: "请选择屋内的格子" };
  const { w, d } = footprint(item, at.rotation || 0);
  if (at.x < 0 || at.z < 0 || at.x + w > ROOM.w || at.z + d > ROOM.d)
    return { ok: false, why: "再往屋里挪一点" };
  for (const p of placed) {
    if (p.uid === ignoreId) continue;
    const f = furnitureById[inventory.find((i) => i.uid === p.uid)?.fid];
    if (!f) continue;
    const other = footprint(f, p.rotation);
    if (
      at.x < p.x + other.w &&
      at.x + w > p.x &&
      at.z < p.z + other.d &&
      at.z + d > p.z
    )
      return { ok: false, why: "这里已经有家具啦，换个位置试试" };
  }
  return { ok: true, why: "这里刚刚好" };
}
