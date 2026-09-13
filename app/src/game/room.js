export const BASE_ROOM = Object.freeze({ w: 6, d: 6 });
export const MAX_ROOM = 12;
export const WALLS = {
  meadow: { name: "鼠尾草绿", color: "#aeb99a", trim: "#edf0dc" },
  cream: { name: "奶油白", color: "#e4d7bd", trim: "#fff1d6" },
  blue: { name: "雨后蓝", color: "#a4bec0", trim: "#e3eeee" },
  rose: { name: "陶土粉", color: "#cca995", trim: "#f5e6d7" },
};
export const FLOORS = {
  oak: { name: "蜜色橡木", colors: ["#c9a477", "#d3b285", "#bd976c"] },
  walnut: { name: "暖胡桃木", colors: ["#997553", "#a5805c", "#8f6b4c"] },
  birch: { name: "浅色白桦", colors: ["#ded0ae", "#e8d9b9", "#d4c6a3"] },
};
export function roomOf(home) {
  const raw = home?.room;
  return { w: cleanDimension(raw?.w), d: cleanDimension(raw?.d) };
}
function cleanDimension(v) {
  return Number.isInteger(v) && v >= 6 && v <= MAX_ROOM && v % 2 === 0 ? v : 6;
}
export function expansionOffer(home, axis) {
  const room = roomOf(home);
  if (!["w", "d"].includes(axis) || room[axis] >= MAX_ROOM) return null;
  const steps = (room.w + room.d - 12) / 2;
  const price = 30 + steps * 20;
  const next = { ...room, [axis]: room[axis] + 2 };
  return {
    axis,
    price,
    current: room,
    next,
    addedArea: (next.w * next.d - room.w * room.d) / 4,
    area: (next.w * next.d) / 4,
  };
}
export function expandRoom(home, axis) {
  const offer = expansionOffer(home, axis);
  if (!offer) return { ok: false, why: "这个方向已经足够宽敞啦" };
  if (home.lumens < offer.price)
    return {
      ok: false,
      why: `再收集 ${offer.price - home.lumens} 光，就能扩建了`,
    };
  home.lumens -= offer.price;
  home.spent += offer.price;
  home.room = offer.next;
  return { ok: true, ...offer };
}
export function normalizeDecor(raw) {
  return {
    wall: WALLS[raw?.wall] ? raw.wall : "meadow",
    floor: FLOORS[raw?.floor] ? raw.floor : "oak",
    light: ["day", "sunset", "night"].includes(raw?.light) ? raw.light : "day",
  };
}
export function addHomeMoment(home, kind, text, key = kind) {
  home.moments ||= [];
  if (home.moments.some((m) => m.key === key)) return false;
  home.moments.unshift({ key, kind, text, at: new Date().toISOString() });
  home.moments = home.moments.slice(0, 60);
  return true;
}
