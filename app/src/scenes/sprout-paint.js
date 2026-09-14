import { closedPath, eyePoses } from "../vendor/bloub-shape.js";
import { paintEye, paintMouth, blinkAt } from "./lab-face-paint.js";
const ellipse = (c, x, y, w, h, color) => {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  c.fill();
};
export function paintSproutFace(c, p, t, { blink = true, breath = true } = {}) {
  const lid = blink ? blinkAt(t) : 1;
  const eyes = eyePoses(
    {
      yaw: p.yaw + p.gazeX * 9,
      pitch: p.pitch + p.gazeY * 6,
      roll: p.roll * 0.28,
    },
    110,
    p.split,
  );
  for (let i = 0; i < 2; i++) {
    const e = eyes[i],
      side = i === 0 ? "left" : "right";
    c.save();
    c.translate(128 + e.x, 111 + e.y);
    c.transform(e.a, e.b, e.c, e.d, 0, 0);
    c.fillStyle = "#fff9e8";
    paintEye(
      c,
      0,
      0,
      11 * p[side + "W"],
      Math.max(0.65, 21 * p[side + "H"] * lid),
      p.smile,
      (p[side + "Tilt"] * Math.PI) / 180,
    );
    c.restore();
  }
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, p.cheek)) * 0.55;
  ellipse(c, 73 + p.gazeX * 5, 149, 13, 6, "#e9b5a0");
  ellipse(c, 183 + p.gazeX * 5, 149, 13, 6, "#e9b5a0");
  c.restore();
  paintMouth(c, 128 + p.gazeX * 7, 151 + p.gazeY * 4, p.mouth, p.smile, 10);
}
export function sproutOutline(p, t, breath = true) {
  const b = breath ? Math.sin(t * 0.00115) * 0.009 : 0;
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    const r = 1 - 0.025 * Math.sin(a) + 0.012 * Math.cos(a * 3) * p.smile;
    return {
      x: 128 + Math.cos(a) * 62 * p.bodyW * r,
      y: 165 + Math.sin(a) * 62 * (p.bodyH + b) * r,
    };
  });
}
export function paintSprout(c, p, t, options = {}) {
  c.clearRect(0, 0, 256, 256);
  ellipse(c, 128, 229, 47 * p.bodyW, 5, "#55674719");
  c.save();
  c.translate(128, 226);
  c.rotate(((p.roll * Math.PI) / 180) * 0.3);
  c.translate(-128, -226);
  const gradient = c.createRadialGradient(104, 139, 4, 134, 175, 78);
  gradient.addColorStop(0, "#a5c578");
  gradient.addColorStop(1, "#739a4e");
  c.fillStyle = gradient;
  c.fill(new Path2D(closedPath(sproutOutline(p, t, options.breath !== false))));
  ellipse(c, 128, 204, 32, 15, "#c9dc9e");
  const top = 165 - 62 * p.bodyH;
  c.strokeStyle = "#658d47";
  c.lineWidth = 5;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(128, top + 9);
  c.quadraticCurveTo(124, top - 20, 128, top - 33);
  c.stroke();
  c.save();
  c.translate(128, top - 26);
  c.rotate(
    p.leaf + (options.breath === false ? 0 : Math.sin(t * 0.0011) * 0.025),
  );
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    c.fillStyle = side === 1 ? "#8bb55b" : "#739f4c";
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(3, -25, 29, -34, 44, -33);
    c.bezierCurveTo(38, -11, 19, 4, 0, 0);
    c.fill();
    c.strokeStyle = "#b0cf7e";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(3, -3);
    c.quadraticCurveTo(22, -17, 37, -28);
    c.stroke();
    c.restore();
  }
  c.restore();
  // Same normalized face is used as the curved 3D decal.
  c.save();
  c.translate(51, 93);
  c.scale(0.6, 0.6);
  paintSproutFace(c, p, t, options);
  c.restore();
  c.restore();
}
