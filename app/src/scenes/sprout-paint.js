import { closedPath } from "../vendor/bloub-shape.js";
import { blinkAt } from "./face-paint.js";
import {
  softOutline,
  HORNS,
  handPose,
  sproutPose,
  MASCOT_SKINS,
  DEFAULT_SKIN,
} from "../game/mascot.js";
export { softOutline as sproutOutline } from "../game/mascot.js";
const ellipse = (x, y, rx, ry, angle = 0) =>
  Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2,
      dx = Math.cos(a) * rx,
      dy = Math.sin(a) * ry;
    return {
      x: x + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: y + dx * Math.sin(angle) + dy * Math.cos(angle),
    };
  });
export function faceContours(p, t, blink = true) {
  const lid = blink ? blinkAt(t) : 1,
    gx = p.gazeX * p.gazeScale * 3 + p.yaw * 0.3,
    gy = p.gazeY * p.gazeScale * 2 + p.pitch * 0.3;
  const result = [];
  for (const [i, side] of ["left", "right"].entries()) {
    const smile = Math.max(0, Math.min(1, p.smile)),
      tilt = (p[side + "Tilt"] * Math.PI) / 180;
    const points = Array.from({ length: 32 }, (_, j) => {
      const a = (j / 32) * Math.PI * 2,
        u = Math.cos(a),
        x = u * 9.3 * p[side + "W"] * (1 + smile * 0.1),
        openY = Math.sin(a) * Math.max(1.35, 15 * p[side + "H"] * lid),
        arcY = -6.2 * Math.sqrt(Math.max(0, 1 - u * u)) + Math.sin(a) * 1.9,
        y = openY * (1 - smile) + arcY * smile;
      return {
        x:
          128 +
          (i ? 1 : -1) * p.split +
          gx +
          x * Math.cos(tilt) -
          y * Math.sin(tilt),
        y: 145 + gy + x * Math.sin(tilt) + y * Math.cos(tilt),
      };
    });
    result.push({ kind: "eye", points });
  }
  for (const x of [73, 183])
    result.push({
      kind: "cheek",
      alpha: 0.85 + p.cheek * 0.15,
      points: ellipse(x + gx * 0.35, 170 + gy * 0.35, 13.5 + p.cheek, 7.5),
    });
  result.push({
    kind: "mouth",
    points: Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2,
        u = Math.cos(a);
      return {
        x: 128 + gx * 0.6 + u * 8,
        y:
          155 +
          gy * 0.6 +
          3.6 * Math.sqrt(Math.max(0, 1 - (2 * Math.abs(u) - 1) ** 2)) +
          Math.sin(a) * 1.6,
      };
    }),
  });
  return result;
}
function fill(c, pts, color, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fill(new Path2D(closedPath(pts)));
  c.restore();
}
export function paintSproutFace(
  c,
  p,
  t,
  { blink = true, skin = DEFAULT_SKIN } = {},
) {
  const palette = MASCOT_SKINS[skin] || MASCOT_SKINS[DEFAULT_SKIN];
  for (const s of faceContours(p, t, blink))
    fill(
      c,
      s.points,
      s.kind === "cheek" ? palette.cheek : palette.eye,
      s.alpha ?? 1,
    );
}
export function paintSprout(c, p, t, options = {}) {
  const skin = MASCOT_SKINS[options.skin] || MASCOT_SKINS[DEFAULT_SKIN];
  c.clearRect(0, 0, 256, 256);
  fill(c, ellipse(128, 228, 65, 4), skin.shadow, 0.09);
  c.save();
  c.translate(128, 226);
  c.rotate((p.roll * Math.PI) / 180);
  c.scale(
    p.bodyW,
    p.bodyH +
      (options.breath === false
        ? 0
        : Math.sin(t * 0.00115) * 0.004 * p.breathScale),
  );
  c.translate(-128, -226);
  const gradient = c.createLinearGradient(0, 110, 0, 226);
  gradient.addColorStop(0, skin.body);
  gradient.addColorStop(0.78, skin.body);
  gradient.addColorStop(1, skin.shade);
  for (const h of HORNS) fill(c, ellipse(h.x, h.y, h.rx, h.ry), gradient);
  const s = sproutPose(p);
  c.save();
  c.strokeStyle = skin.sproutDark;
  c.lineWidth = 5;
  c.lineCap = "round";
  c.shadowColor = skin.sproutLight;
  c.shadowBlur = 7;
  c.beginPath();
  c.moveTo(s.base.x, s.base.y);
  c.quadraticCurveTo(s.control.x, s.control.y, s.tip.x, s.tip.y);
  c.stroke();
  c.translate(s.tip.x, s.tip.y);
  c.rotate(s.angle);
  const leafGrad = c.createLinearGradient(0, 0, -12, -26);
  leafGrad.addColorStop(0, skin.sproutDark);
  leafGrad.addColorStop(1, skin.sproutLight);
  fill(c, ellipse(-10, -10, 14, 8, 0.8), leafGrad);
  fill(c, ellipse(12, -6, 14, 8, -0.4), leafGrad);
  c.restore();
  fill(c, softOutline(), gradient);
  paintSproutFace(c, p, t, options);
  for (const side of [-1, 1]) {
    const h = handPose(p, side);
    fill(c, ellipse(h.x, h.y + 1.5, h.rx, h.ry), skin.shade);
    fill(c, ellipse(h.x, h.y, h.rx, h.ry - 1), gradient);
  }
  c.restore();
}
