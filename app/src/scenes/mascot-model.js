import * as THREE from "three";
import {
  BASE_OUTLINE,
  surfaceDepth,
  MASCOT_SKINS,
  DEFAULT_SKIN,
} from "../game/mascot.js";
import { createEmotionMotion } from "../game/emotions.js";
import { faceContours } from "./sprout-paint.js";
export function softBodyGeometry() {
  const vertices = [0, 0.02 + 86 / 220, 0.34],
    indices = [],
    rings = 31,
    n = 64,
    cy = 0.02 + 86 / 220;
  for (let j = 1; j <= rings; j++) {
    const a = (j / (rings + 1)) * Math.PI,
      s = Math.sin(a);
    for (const p of BASE_OUTLINE) {
      const dx = p.x - 128,
        dy = p.y - 140,
        r = Math.hypot(dx, dy),
        base = 1 / Math.sqrt((dx / r / 72) ** 2 + (dy / r / 80) ** 2),
        factor = (s * (base + (r - base) * s ** 4)) / r;
      vertices.push(
        (dx / 220) * factor,
        cy - (dy / 220) * factor,
        0.34 * Math.cos(a),
      );
    }
  }
  const back = vertices.length / 3;
  vertices.push(0, cy, -0.34);
  for (let i = 0; i < n; i++) indices.push(0, 1 + ((i + 1) % n), 1 + i);
  for (let j = 0; j < rings - 1; j++)
    for (let i = 0; i < n; i++) {
      const a = 1 + j * n + i,
        b = 1 + j * n + ((i + 1) % n),
        c = a + n,
        d = b + n;
      indices.push(a, b, c, b, d, c);
    }
  for (let i = 0; i < n; i++)
    indices.push(
      back,
      1 + (rings - 1) * n + i,
      1 + (rings - 1) * n + ((i + 1) % n),
    );
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  if (geo.attributes.normal.getZ(0) < 0) {
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    geo.setIndex(indices);
    geo.computeVertexNormals();
  }
  return geo;
}
function faceGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(33 * 3), 3),
  );
  const ids = [];
  for (let i = 0; i < 32; i++) ids.push(0, i + 1, ((i + 1) % 32) + 1);
  g.setIndex(ids);
  return g;
}
function updateFace(geometry, points) {
  const center = {
    x: points.reduce((s, p) => s + p.x, 0) / 32,
    y: points.reduce((s, p) => s + p.y, 0) / 32,
  };
  const attr = geometry.attributes.position;
  [center, ...points].forEach((p, i) =>
    attr.setXYZ(
      i,
      (p.x - 128) / 220,
      0.02 + (226 - p.y) / 220,
      surfaceDepth(p.x, p.y) + 0.004,
    ),
  );
  attr.needsUpdate = true;
  geometry.computeBoundingSphere();
}
export function contactShadowGeometry() {
  const pos = [],
    colors = [],
    idx = [],
    n = 48,
    rings = 8;
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i < n; i++) {
      const r = j / rings,
        a = (i / n) * Math.PI * 2;
      pos.push(Math.cos(a) * 0.48 * r, 0, Math.sin(a) * 0.34 * r);
      colors.push(0.23, 0.2, 0.14, 0.34 * (1 - r * r) ** 2);
    }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i,
        b = j * n + ((i + 1) % n);
      idx.push(a, b, a + n, b, b + n, a + n);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  g.setIndex(idx);
  return g;
}
export function makeSoftCorner(
  world,
  {
    getMood = () => "idle",
    getGaze = () => ({ x: 0, y: 0 }),
    mode = "map",
    skin = DEFAULT_SKIN,
    getOptions = () => ({}),
  } = {},
) {
  const g = new THREE.Group(),
    shape = new THREE.Group(),
    palette = MASCOT_SKINS[skin] || MASCOT_SKINS[DEFAULT_SKIN];
  g.add(shape);
  g.userData.dynamic = true;
  g.userData.skin = palette.id;
  world.add(g);
  const body = new THREE.Mesh(
    softBodyGeometry(),
    new THREE.MeshStandardMaterial({
      color: palette.body,
      emissive: palette.body,
      emissiveIntensity: 0.1,
      roughness: 0.82,
      metalness: 0,
    }),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  shape.add(body);
  const face = Array.from({ length: 5 }, (_, i) => {
    const m = new THREE.Mesh(
      faceGeometry(),
      new THREE.MeshBasicMaterial({
        color: i === 2 || i === 3 ? palette.cheek : palette.eye,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    );
    m.frustumCulled = false;
    m.renderOrder = 2;
    shape.add(m);
    return m;
  });
  const contact = new THREE.Mesh(
    contactShadowGeometry(),
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  contact.userData.dynamic = true;
  contact.renderOrder = 1;
  world.add(contact);
  g.userData.contactShadow = contact;
  const motion = createEmotionMotion();
  let previous = 0;
  g.userData.drawFace = (t) => {
    const dt = Math.min((t - previous) / 1000 || 0.016, 0.1);
    previous = t;
    motion.setMood(
      g.userData.moodUntil > Date.now() ? g.userData.mood : getMood(),
    );
    const options = getOptions(),
      p = motion.step(options.paused ? 0 : dt, options, getGaze()),
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const contours = faceContours(p, t, !reduced && options.blink !== false);
    contours.forEach((c, i) => {
      updateFace(face[i].geometry, c.points);
      face[i].material.opacity = c.alpha ?? 1;
    });
    const sy =
      p.bodyH +
      (reduced || options.breath === false ? 0 : Math.sin(t * 0.00115) * 0.007);
    shape.scale.set(p.bodyW, sy, p.bodyW);
    shape.position.y = 0.02 * (1 - sy);
    g.userData.faceRoll = ((p.roll * Math.PI) / 180) * 0.22;
    if (mode !== "home") g.rotation.z = g.userData.faceRoll;
  };
  g.userData.emotionSnapshot = motion.snapshot;
  g.userData.resetEmotion = motion.reset;
  return g;
}
