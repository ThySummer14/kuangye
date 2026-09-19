// Shared geometry and surface palette; seasons never own emotion or interaction state.
export const MASCOT_SKINS = Object.freeze({
  softCorner: Object.freeze({
    id: "softCorner",
    name: "软角",
    body: "#f3eee4",
    highlight: "#fffdf7",
    shade: "#d6d0c3",
    eye: "#493b2a",
    cheek: "#dfafa0",
  }),
});
export const DEFAULT_SKIN = "softCorner";
const anchors = [
  [128, 226],
  [91, 224],
  [69, 213],
  [58, 192],
  [49, 183],
  [47, 172],
  [54, 161],
  [61, 137],
  [75, 108],
  [87, 91],
  [94, 73],
  [103, 64],
  [114, 65],
  [126, 82],
  [142, 88],
  [155, 79],
  [165, 81],
  [174, 96],
  [183, 114],
  [194, 136],
  [201, 161],
  [210, 171],
  [209, 183],
  [200, 189],
  [190, 210],
  [166, 223],
];
export function softOutline(p = { bodyW: 1, bodyH: 1 }, t = 0, breath = false) {
  const points = [];
  const h = p.bodyH + (breath ? Math.sin(t * 0.00115) * 0.007 : 0);
  for (let i = 0; i < 64; i++) {
    const u = (i / 64) * anchors.length,
      j = Math.floor(u),
      v = u - j;
    const a = anchors[(j - 1 + anchors.length) % anchors.length],
      b = anchors[j],
      c = anchors[(j + 1) % anchors.length],
      d = anchors[(j + 2) % anchors.length];
    const at = (k) =>
      0.5 *
      (2 * b[k] +
        (-a[k] + c[k]) * v +
        (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * v * v +
        (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * v * v * v);
    points.push({
      x: 128 + (at(0) - 128) * p.bodyW,
      y: 226 + (at(1) - 226) * h,
    });
  }
  return points;
}
export const BASE_OUTLINE = softOutline();
// Front depth of a rounded closed shell, used by the body and all facial geometry.
export function surfaceDepth(x, y) {
  const dx = x - 128,
    dy = y - 140,
    r = Math.hypot(dx, dy);
  if (r < 1e-6) return 0.34;
  const nx = dx / r,
    ny = dy / r;
  let boundary = 100;
  for (let i = 0; i < 64; i++) {
    const a = BASE_OUTLINE[i],
      b = BASE_OUTLINE[(i + 1) % 64],
      ex = b.x - a.x,
      ey = b.y - a.y,
      den = nx * ey - ny * ex;
    if (Math.abs(den) < 1e-8) continue;
    const ax = a.x - 128,
      ay = a.y - 140,
      dist = (ax * ey - ay * ex) / den,
      u = (ax * ny - ay * nx) / den;
    if (dist > 0 && u >= 0 && u <= 1) {
      boundary = dist;
      break;
    }
  }
  const base = 1 / Math.sqrt((nx / 72) ** 2 + (ny / 80) ** 2);
  let low = 0,
    high = 1;
  for (let i = 0; i < 22; i++) {
    const q = (low + high) / 2,
      rr = q * (base + (boundary - base) * q ** 4);
    if (rr < r) low = q;
    else high = q;
  }
  return 0.34 * Math.sqrt(Math.max(0, 1 - ((low + high) / 2) ** 2));
}
