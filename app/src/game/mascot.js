// docs/mascot.md is the sole visual authority. No economy or save state here.
export const MASCOT_SKINS = Object.freeze({
  softCorner: Object.freeze({
    id: "softCorner",
    name: "小芽",
    body: "#fdf7f1",
    highlight: "#fdf7f1",
    shade: "#f7ece3",
    eye: "#d9af68",
    cheek: "#fdd1cf",
    sproutLight: "#c7ef90",
    sproutDark: "#a7e160",
    lantern: "#ffd98a",
    shadow: "#766952",
  }),
});
export const DEFAULT_SKIN = "softCorner";
export const MASCOT_UNIT = 190;
export const DEPTH_RATIO = 0.84;
// Bottom-to-top radial profile, in the same 256px coordinate space as the portrait.
export const BODY_PROFILE = Object.freeze([
  [226, 0],
  [225, 43],
  [221, 67],
  [212, 80],
  [196, 87],
  [172, 86],
  [149, 78],
  [127, 65],
  [108, 47],
  [95, 25],
  [89, 0],
]);
export const HORNS = Object.freeze([
  { x: 91, y: 87, rx: 22, ry: 28, rz: 18 },
  { x: 174, y: 101, rx: 17, ry: 20, rz: 15 },
]);
export function bodyRadius(y) {
  if (y >= 226 || y <= 89) return 0;
  for (let i = 0; i < BODY_PROFILE.length - 1; i++) {
    const [a, ra] = BODY_PROFILE[i],
      [b, rb] = BODY_PROFILE[i + 1];
    if (y <= a && y >= b) {
      const u = (a - y) / (a - b),
        before = BODY_PROFILE[Math.max(0, i - 1)],
        after = BODY_PROFILE[Math.min(BODY_PROFILE.length - 1, i + 2)];
      const m0 = ((rb - before[1]) / (before[0] - b)) * (a - b),
        m1 = ((after[1] - ra) / (a - after[0])) * (a - b);
      return (
        (2 * u ** 3 - 3 * u * u + 1) * ra +
        (u ** 3 - 2 * u * u + u) * m0 +
        (-2 * u ** 3 + 3 * u * u) * rb +
        (u ** 3 - u * u) * m1
      );
    }
  }
  return 0;
}
export function softOutline(p = { bodyW: 1, bodyH: 1 }, t = 0, breath = false) {
  const h =
    p.bodyH +
    (breath ? Math.sin(t * 0.00115) * 0.004 * (p.breathScale ?? 1) : 0);
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2,
      y = 157.5 - Math.cos(a) * 68.5;
    return {
      x: 128 + Math.sign(Math.sin(a)) * bodyRadius(y) * p.bodyW,
      y: 226 + (y - 226) * h,
    };
  });
}
export const BASE_OUTLINE = softOutline();
export function surfaceDepth(x, y) {
  const r = bodyRadius(y);
  return (
    (Math.sqrt(Math.max(0, r * r - (x - 128) ** 2)) * DEPTH_RATIO) / MASCOT_UNIT
  );
}
// Two leaves only, anchored at the same stem tip in both renderers.
export function sproutPose(p) {
  const droop = Math.max(0, -p.leaf),
    upright = Math.max(0, p.leaf);
  return {
    base: { x: 128, y: 93 },
    control: { x: 128 + droop * 22, y: 69 - upright * 6 },
    tip: { x: 135 + droop * 14, y: 66 + droop * 17 - upright * 6 },
    angle: droop * 1.3 - upright * 0.18,
  };
}
export function handPose(p, side) {
  const lift = p.arms || 0,
    hug = p.hug || 0;
  return {
    x: 128 + side * (82 - hug * 31),
    y: 196 - lift * 31 - hug * 15,
    rx: 14,
    ry: 15,
  };
}
