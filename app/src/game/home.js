import { furnitureById } from "../data/furniture.js";
import { roomOf, normalizeDecor } from "./room.js";
import { placementCheck } from "./placement.js";
export const lumenReward = (xp) =>
  Number.isFinite(Number(xp))
    ? Math.max(0, Math.round((Number(xp) * 0.6) / 5) * 5)
    : 0;
export const refundFor = (price) =>
  Math.floor(Math.max(0, Number(price) || 0) * 0.7);
export const emptyHome = () => ({
  room: { w: 6, d: 6 },
  decor: normalizeDecor(),
  moments: [],
  lumens: 0,
  earned: 0,
  spent: 0,
  refunded: 0,
  glimmerDays: [],
  glimmerPaid: 0,
  inventory: [],
  placed: [],
  boundMemories: [],
  gifts: [],
  nextId: 1,
});
const number = (v) =>
  Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0;
export function normalizeHome(raw, done = []) {
  const h = emptyHome();
  if (!raw || typeof raw !== "object") {
    h.lumens = done.reduce((s, d) => s + lumenReward(d.xp), 0);
    h.earned = h.lumens;
    return h;
  }
  h.room = roomOf(raw);
  h.decor = normalizeDecor(raw.decor);
  h.moments = (Array.isArray(raw.moments) ? raw.moments : [])
    .filter((m) => m && typeof m.key === "string" && typeof m.text === "string")
    .slice(0, 60)
    .map((m) => ({
      key: m.key.slice(0, 100),
      kind: String(m.kind || "").slice(0, 40),
      text: m.text.slice(0, 160),
      at: String(m.at || "").slice(0, 30),
    }));
  for (const k of ["lumens", "earned", "spent", "refunded", "glimmerPaid"])
    h[k] = number(raw[k]);
  h.glimmerDays = [
    ...new Set(
      (Array.isArray(raw.glimmerDays) ? raw.glimmerDays : []).filter((d) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d),
      ),
    ),
  ].sort();
  h.boundMemories = (
    Array.isArray(raw.boundMemories) ? raw.boundMemories : []
  ).filter((s) => typeof s === "string");
  h.gifts = (Array.isArray(raw.gifts) ? raw.gifts : []).filter(
    (s) => furnitureById[s]?.stall === "gift",
  );
  const seen = new Set();
  for (const i of Array.isArray(raw.inventory) ? raw.inventory : []) {
    if (
      !i ||
      typeof i.uid !== "string" ||
      seen.has(i.uid) ||
      !furnitureById[i.fid]
    )
      continue;
    seen.add(i.uid);
    h.inventory.push({
      uid: i.uid,
      fid: i.fid,
      paid: Math.min(number(i.paid), furnitureById[i.fid].price),
      at: typeof i.at === "string" ? i.at : "",
      memory:
        i.memory && typeof i.memory.qid === "string"
          ? {
              qid: i.memory.qid,
              review: String(i.memory.review || "").slice(0, 160),
              date: String(i.memory.date || ""),
            }
          : null,
    });
  }
  h.nextId = Math.max(
    1,
    number(raw.nextId),
    ...h.inventory.map((i) => (Number(i.uid.replace("item-", "")) || 0) + 1),
  );
  for (const p of Array.isArray(raw.placed) ? raw.placed : []) {
    if (!p || h.placed.some((a) => a.uid === p.uid)) continue;
    const f = furnitureById[h.inventory.find((i) => i.uid === p.uid)?.fid];
    const at = { uid: p.uid, x: p.x, z: p.z, rotation: number(p.rotation) % 4 };
    if (placementCheck(f, at, h.placed, h.inventory, p.uid, h.room).ok)
      h.placed.push(at);
  }
  return h;
}
export function rewardCompletion(home, xp) {
  const reward = lumenReward(xp);
  home.lumens += reward;
  home.earned += reward;
  return reward;
}
export function recordGlimmer(home, date) {
  if (!home.glimmerDays.includes(date)) home.glimmerDays.push(date);
  const total = Math.floor(home.glimmerDays.length / 7) * 5;
  const reward = Math.max(0, total - home.glimmerPaid);
  home.lumens += reward;
  home.earned += reward;
  home.glimmerPaid += reward;
  return reward;
}
export function buyFurniture(home, f, date, done) {
  if (!f || f.stall === "gift" || home.lumens < f.price) return null;
  const latest = done.at(-1),
    key = latest ? `${latest.qid}:${latest.at}:${done.length}` : "";
  const memory =
    key && !home.boundMemories.includes(key)
      ? { qid: latest.qid, review: latest.review, date: latest.at }
      : null;
  const item = {
    uid: `item-${home.nextId++}`,
    fid: f.id,
    paid: f.price,
    at: date,
    memory,
  };
  home.lumens -= f.price;
  home.spent += f.price;
  home.inventory.push(item);
  if (memory) home.boundMemories.push(key);
  return item;
}
export function placeFurniture(home, uid, at) {
  const item = home.inventory.find((i) => i.uid === uid);
  const check = placementCheck(
    furnitureById[item?.fid],
    at,
    home.placed,
    home.inventory,
    uid,
    roomOf(home),
  );
  if (!check.ok) return check;
  const old = home.placed.find((p) => p.uid === uid);
  if (old) Object.assign(old, at);
  else home.placed.push({ uid, ...at });
  return check;
}
export function recycleFurniture(home, uid) {
  const item = home.inventory.find((i) => i.uid === uid);
  if (!item || furnitureById[item.fid].stall === "gift") return null;
  const refund = refundFor(item.paid);
  home.placed = home.placed.filter((p) => p.uid !== uid);
  home.inventory = home.inventory.filter((i) => i.uid !== uid);
  home.lumens += refund;
  home.refunded += refund;
  return refund;
}
export function unlockGifts(home, level, date) {
  for (const [lv, fid] of [
    [3, "stringlights"],
    [5, "telescope"],
    [7, "musicchime"],
    [9, "skylight"],
  ]) {
    if (level >= lv && !home.gifts.includes(fid)) {
      home.gifts.push(fid);
      home.inventory.push({
        uid: `item-${home.nextId++}`,
        fid,
        paid: 0,
        at: date,
        memory: null,
      });
    }
  }
}
