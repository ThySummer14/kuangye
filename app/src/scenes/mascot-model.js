import * as THREE from "three";
import {
  bodyRadius,
  HORNS,
  DEPTH_RATIO,
  MASCOT_UNIT as U,
  surfaceDepth,
  sproutPose,
  handPose,
  MASCOT_SKINS,
  DEFAULT_SKIN,
} from "../game/mascot.js";
import { createEmotionMotion } from "../game/emotions.js";
import { faceContours } from "./sprout-paint.js";
const Y = (y) => 0.02 + (226 - y) / U;
export function softBodyGeometry() {
  const vertices = [0, Y(226), 0],
    indices = [],
    n = 24;
  const profile = Array.from({ length: 12 }, (_, i) => {
    const y = 226 - (1 - Math.cos(((i + 1) / 13) * Math.PI)) * 0.5 * 137;
    return [y, bodyRadius(y)];
  });
  for (const [y, r] of profile)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      vertices.push(
        (Math.cos(a) * r) / U,
        Y(y),
        (Math.sin(a) * r * DEPTH_RATIO) / U,
      );
    }
  const rings = profile.length,
    top = vertices.length / 3;
  vertices.push(0, Y(89), 0);
  for (let i = 0; i < n; i++) indices.push(0, 1 + ((i + 1) % n), 1 + i);
  for (let j = 0; j < rings - 1; j++)
    for (let i = 0; i < n; i++) {
      const a = 1 + j * n + i,
        b = 1 + j * n + ((i + 1) % n);
      indices.push(a, b, a + n, b, b + n, a + n);
    }
  for (let i = 0; i < n; i++)
    indices.push(
      top,
      1 + (rings - 1) * n + i,
      1 + (rings - 1) * n + ((i + 1) % n),
    );
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  // Middle front-facing ring must point outwards (lathe winding is independent of camera).
  const front = 1 + 4 * n + n / 4;
  if (g.attributes.normal.getZ(front) < 0) {
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    g.setIndex(indices);
    g.computeVertexNormals();
  }
  return g;
}
function tintedGeometry(geometry, palette, low, high) {
  const attr = geometry.attributes.position,
    colors = [],
    body = new THREE.Color(palette.body),
    shade = new THREE.Color(palette.shade);
  for (let i = 0; i < attr.count; i++) {
    const a = THREE.MathUtils.clamp((attr.getY(i) - low) / (high - low), 0, 1),
      c = shade.clone().lerp(body, Math.min(1, a * 2.8));
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
function faceGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(360 * 3), 3),
  );
  return g;
}
function updateFace(g, points) {
  const attr = g.attributes.position;
  let i = 0;
  const put = (p) => {
    attr.setXYZ(i++, (p.x - 128) / U, Y(p.y), surfaceDepth(p.x, p.y) + 0.006);
  };
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  // All shared contours are ribbons ordered around the perimeter. Pair opposite
  // points into two rows of short surface strips, including a projected middle row.
  // This preserves concave smile/w silhouettes without long triangles cutting the body.
  for (let j = 0; j < 16; j++) {
    const a = points[j],
      b = points[j + 1],
      c = points[(32 - j) % 32],
      d = points[(31 - j) % 32],
      ab = mid(a, c),
      cd = mid(b, d);
    for (const p of [a, b, ab, b, cd, ab, ab, cd, c, cd, d, c]) put(p);
  }
  g.setDrawRange(0, i);
  attr.needsUpdate = true;
  g.computeBoundingSphere();
}
export function contactShadowGeometry() {
  const pos = [],
    colors = [],
    idx = [],
    n = 24,
    rings = 3;
  const c = new THREE.Color(MASCOT_SKINS[DEFAULT_SKIN].shadow);
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i < n; i++) {
      const r = j / rings,
        a = (i / n) * Math.PI * 2;
      pos.push(Math.cos(a) * 0.48 * r, 0, Math.sin(a) * 0.34 * r);
      colors.push(c.r, c.g, c.b, 0.24 * (1 - r * r) ** 2);
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
function glowGeometry() {
  const pos = [0, 0, 0],
    colors = [1, 1, 1, 0.15],
    idx = [],
    rings = 3,
    n = 20;
  for (let j = 1; j <= rings; j++)
    for (let i = 0; i < n; i++) {
      const r = j / rings,
        a = (i / n) * Math.PI * 2;
      pos.push(Math.cos(a) * r, Math.sin(a) * r, 0);
      colors.push(1, 1, 1, 0.15 * (1 - r * r) ** 2);
    }
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + ((i + 1) % n));
  for (let j = 0; j < rings - 1; j++)
    for (let i = 0; i < n; i++) {
      const a = 1 + j * n + i,
        b = 1 + j * n + ((i + 1) % n);
      idx.push(a, a + n, b, b, a + n, b + n);
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
  const palette = MASCOT_SKINS[skin] || MASCOT_SKINS[DEFAULT_SKIN],
    g = new THREE.Group(),
    shape = new THREE.Group();
  g.name = "xiaoya";
  g.add(shape);
  g.userData.dynamic = true;
  g.userData.skin = palette.id;
  world.add(g);
  const bodyMaterial = () =>
    new THREE.MeshBasicMaterial({ vertexColors: true });
  const body = new THREE.Mesh(
    tintedGeometry(softBodyGeometry(), palette, 0.02, Y(89)),
    bodyMaterial(),
  );
  body.name = "body";
  body.castShadow = true;
  shape.add(body);
  for (const [i, h] of HORNS.entries()) {
    const geo = new THREE.SphereGeometry(1, 16, 8);
    geo.scale(h.rx / U, h.ry / U, h.rz / U);
    const horn = new THREE.Mesh(
      tintedGeometry(geo, palette, -h.ry / U, h.ry / U),
      bodyMaterial(),
    );
    horn.name = i ? "horn-right-short" : "horn-left-tall";
    horn.position.set((h.x - 128) / U, Y(h.y), -0.015);
    shape.add(horn);
  }
  const hands = [-1, 1].map((side) => {
    const geo = new THREE.SphereGeometry(1, 12, 6);
    geo.scale(14 / U, 15 / U, 12 / U);
    const hand = new THREE.Mesh(
      tintedGeometry(geo, palette, -15 / U, 15 / U),
      bodyMaterial(),
    );
    hand.name = side < 0 ? "hand-left" : "hand-right";
    shape.add(hand);
    return hand;
  });
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
    m.name = ["eye-left", "eye-right", "cheek-left", "cheek-right", "mouth-w"][
      i
    ];
    m.frustumCulled = false;
    m.renderOrder = 2;
    shape.add(m);
    return m;
  });
  const sprout = new THREE.Group();
  sprout.name = "two-leaf-sprout";
  shape.add(sprout);
  const green = () =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.sproutDark).multiplyScalar(0.06),
      emissive: palette.sproutLight,
      emissiveIntensity: 0.85,
      roughness: 1,
      metalness: 0,
    });
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(0, 0.1, 0)),
      6,
      2.4 / U,
      5,
      false,
    ),
    green(),
  );
  stem.name = "stem";
  sprout.add(stem);
  const leaves = [-1, 1].map((side) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), green());
    leaf.name = side < 0 ? "leaf-left" : "leaf-right";
    leaf.scale.set(14 / U, 8 / U, 6 / U);
    sprout.add(leaf);
    return leaf;
  });
  const halo = new THREE.Mesh(
    glowGeometry(),
    new THREE.MeshBasicMaterial({
      color: palette.sproutLight,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  halo.name = "sprout-halo";
  halo.renderOrder = 0;
  shape.add(halo);
  halo.scale.set(0.25, 0.2, 1);
  const inverse = new THREE.Quaternion();
  halo.onBeforeRender = (_r, _s, camera) => {
    shape.getWorldQuaternion(inverse).invert();
    halo.quaternion.copy(inverse).multiply(camera.quaternion);
  };
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
  contact.name = "contact-shadow";
  world.add(contact);
  g.userData.contactShadow = contact;
  const motion = createEmotionMotion();
  let previous = null;
  g.userData.drawFace = (t) => {
    const dt =
      previous === null
        ? 1 / 60
        : Math.max(0, Math.min((t - previous) / 1000, 0.1));
    previous = t;
    motion.setMood(
      g.userData.moodUntil > Date.now() ? g.userData.mood : getMood(),
    );
    const options = getOptions(),
      p = motion.step(options.paused ? 0 : dt, options, getGaze()),
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    faceContours(p, t, !reduced && options.blink !== false).forEach((c, i) => {
      updateFace(face[i].geometry, c.points);
      face[i].material.opacity = c.alpha ?? 1;
    });
    const sy =
      p.bodyH +
      (reduced || options.breath === false
        ? 0
        : Math.sin(t * 0.00115) * 0.004 * p.breathScale);
    shape.scale.set(p.bodyW, sy, p.bodyW);
    shape.position.y = 0.02 * (1 - sy);
    g.userData.faceRoll = (-p.roll * Math.PI) / 180;
    if (mode !== "home") g.rotation.z = g.userData.faceRoll;
    hands.forEach((hand, i) => {
      const h = handPose(p, i ? 1 : -1);
      hand.position.set(
        (h.x - 128) / U,
        Y(h.y),
        surfaceDepth(h.x, h.y) + 0.012,
      );
    });
    const s = sproutPose(p),
      tip = new THREE.Vector3((s.tip.x - 128) / U, Y(s.tip.y), -0.018);
    // Mutate a fixed tube's vertex positions rather than allocate geometry each frame.
    const attr = stem.geometry.attributes.position;
    for (let j = 0; j <= 6; j++) {
      const u = j / 6,
        v = 1 - u,
        x = v * v * s.base.x + 2 * v * u * s.control.x + u * u * s.tip.x,
        y = v * v * s.base.y + 2 * v * u * s.control.y + u * u * s.tip.y;
      for (let i = 0; i <= 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        attr.setXYZ(
          j * 6 + i,
          (x - 128 + Math.cos(a) * 2.4) / U,
          Y(y),
          -0.018 + (Math.sin(a) * 2.4) / U,
        );
      }
    }
    attr.needsUpdate = true;
    stem.geometry.computeVertexNormals();
    stem.geometry.computeBoundingSphere();
    leaves.forEach((leaf, i) => {
      const dx = i ? 12 : -10,
        dy = i ? -6 : -10,
        c = Math.cos(s.angle),
        sn = Math.sin(s.angle),
        fork = -0.6,
        lx = dx * c - dy * sn;
      leaf.position.set(
        tip.x + (lx * Math.cos(fork)) / U,
        tip.y - (dx * sn + dy * c) / U,
        tip.z - (lx * Math.sin(fork)) / U,
      );
      leaf.rotation.order = "YXZ";
      leaf.rotation.set(0, fork, -(s.angle + (i ? -0.4 : 0.8)));
    });
    halo.position.copy(tip);
    halo.position.y += 0.04;
  };
  g.userData.emotionSnapshot = motion.snapshot;
  g.userData.resetEmotion = (m) => {
    motion.reset(m);
    previous = null;
  };
  g.userData.visualFeatures = () => {
    let triangles = 0,
      coreTriangles = 0;
    g.traverse((o) => {
      if (o.isMesh) {
        const n =
          (o.geometry.drawRange.count === Infinity
            ? o.geometry.index?.count || o.geometry.attributes.position.count
            : o.geometry.drawRange.count) / 3;
        triangles += n;
        if (o !== halo) coreTriangles += n;
      }
    });
    return {
      version: "mascot-v1",
      horns: shape.children
        .filter((o) => o.name.startsWith("horn-"))
        .map((o) => ({
          name: o.name,
          top: o.position.y + HORNS[o.name.includes("left") ? 0 : 1].ry / U,
        })),
      leaves: sprout.children.filter((o) => o.name.startsWith("leaf-")).length,
      hands: shape.children.filter((o) => o.name.startsWith("hand-")).length,
      palette,
      coreTriangles,
      trianglesIncludingGlow: triangles,
    };
  };
  return g;
}
