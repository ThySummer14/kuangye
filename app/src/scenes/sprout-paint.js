import { closedPath, eyePoses } from "../vendor/bloub-shape.js";
import { blinkAt } from "./face-paint.js";
import { softOutline, MASCOT_SKINS, DEFAULT_SKIN } from "../game/mascot.js";
export { softOutline as sproutOutline } from "../game/mascot.js";
export function faceContours(p, t, blink = true) {
  const lid = blink ? blinkAt(t) : 1,
    eyes = eyePoses(
      {
        yaw: p.yaw * 0.5 + p.gazeX * 8,
        pitch: p.pitch * 0.4 + p.gazeY * 5,
        roll: p.roll * 0.2,
      },
      80,
      p.split,
    );
  const result = [];
  for (let i = 0; i < 2; i++) {
    const side = i ? "right" : "left",
      e = eyes[i],
      tilt = ((p[side + "Tilt"] * Math.PI) / 180) * 0.55,
      smile = Math.max(0, Math.min(1, p.smile));
    const points = Array.from({ length: 32 }, (_, j) => {
      const a = (j / 32) * Math.PI * 2,
        x = Math.cos(a) * 6.3 * p[side + "W"];
      const y =
        Math.sin(a) * Math.max(0.8, 10 * p[side + "H"] * lid) * (1 - smile) +
        (-Math.sqrt(Math.max(0, 1 - Math.cos(a) ** 2)) * 5 +
          Math.sin(a) * 1.5) *
          smile;
      const rx = x * Math.cos(tilt) - y * Math.sin(tilt),
        ry = x * Math.sin(tilt) + y * Math.cos(tilt);
      return {
        x: 128 + e.x + rx * e.a + ry * e.c,
        y: 143 + e.y + rx * e.b + ry * e.d,
      };
    });
    result.push({ kind: "eye", points });
  }
  for (const x of [88, 168])
    result.push({
      kind: "cheek",
      alpha: 0.28 + p.cheek * 0.28,
      points: Array.from({ length: 32 }, (_, j) => {
        const a = (j / 32) * Math.PI * 2;
        return {
          x: x + p.gazeX * 3 + Math.cos(a) * 9,
          y: 163 + p.gazeY * 2 + Math.sin(a) * 8,
        };
      }),
    });
  const open = Math.max(0, Math.min(1, p.mouth)),
    smile = p.smile;
  result.push({
    kind: "mouth",
    points: Array.from({ length: 32 }, (_, j) => {
      const a = (j / 32) * Math.PI * 2,
        x = Math.cos(a) * (5.2 - open * 1.8),
        arc = (1 - Math.cos(a) ** 2) * 2.5 * (smile + 0.3);
      return {
        x: 128 + p.gazeX * 4 + x,
        y: 156 + p.gazeY * 2 + arc + Math.sin(a) * (1.1 + open * 4),
      };
    }),
  });
  return result;
}
export function paintSproutFace(
  c,
  p,
  t,
  { blink = true, skin = DEFAULT_SKIN } = {},
) {
  const palette = MASCOT_SKINS[skin] || MASCOT_SKINS[DEFAULT_SKIN];
  for (const contour of faceContours(p, t, blink)) {
    c.save();
    c.globalAlpha = contour.alpha ?? 1;
    c.fillStyle = contour.kind === "cheek" ? palette.cheek : palette.eye;
    c.fill(new Path2D(closedPath(contour.points)));
    c.restore();
  }
}
export function paintSprout(c, p, t, options = {}) {
  const skin = MASCOT_SKINS[options.skin] || MASCOT_SKINS[DEFAULT_SKIN];
  c.clearRect(0, 0, 256, 256);
  c.fillStyle = "#69553a16";
  c.beginPath();
  c.ellipse(128, 229, 59, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(128, 226);
  c.rotate(((p.roll * Math.PI) / 180) * 0.22);
  c.translate(-128, -226);
  const gradient = c.createRadialGradient(102, 105, 3, 102, 105, 168);
  gradient.addColorStop(0, skin.highlight);
  gradient.addColorStop(0.65, skin.body);
  gradient.addColorStop(1, skin.shade);
  c.fillStyle = gradient;
  c.fill(new Path2D(closedPath(softOutline(p, t, options.breath !== false))));
  c.save();
  c.translate(128, 226);
  c.scale(p.bodyW, p.bodyH);
  c.translate(-128, -226);
  paintSproutFace(c, p, t, options);
  c.restore();
  c.restore();
}
