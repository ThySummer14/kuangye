import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  softBodyGeometry,
  makeSoftCorner,
} from "../src/scenes/mascot-model.js";
import { EMOTION_POSES } from "../src/game/emotions.js";
import { faceContours } from "../src/scenes/sprout-paint.js";
import { surfaceDepth, DEFAULT_SKIN } from "../src/game/mascot.js";
test("soft corner is a closed volumetric shell with outward normals", () => {
  const g = softBodyGeometry();
  g.computeBoundingBox();
  const size = g.boundingBox.getSize(new THREE.Vector3());
  assert.ok(size.z > size.x * 0.75);
  assert.ok(size.y > 0.7);
  // The radial body now starts at its bottom pole, not the former front pole.
  assert.ok(g.attributes.normal.getY(0) < -0.9);
  assert.ok(g.attributes.normal.getY(g.attributes.normal.count - 1) > 0.9);
  const front = Array.from(
    { length: g.attributes.position.count },
    (_, i) => i,
  ).reduce((a, b) =>
    g.attributes.position.getZ(a) > g.attributes.position.getZ(b) ? a : b,
  );
  assert.ok(g.attributes.normal.getZ(front) > 0.9);
  const edges = new Map();
  const ids = g.index.array;
  for (let i = 0; i < ids.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const a = ids[i + j],
        b = ids[i + ((j + 1) % 3)],
        key = [Math.min(a, b), Math.max(a, b)].join(",");
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  assert.ok([...edges.values()].every((n) => n === 2));
  g.dispose();
});
test("every expression stays on the body; character and shadow use no texture maps", () => {
  for (const p of Object.values(EMOTION_POSES))
    for (const shape of faceContours(p, 0, false))
      for (const q of shape.points) assert.ok(surfaceDepth(q.x, q.y) > 0.15);
  globalThis.matchMedia = () => ({ matches: false });
  const world = new THREE.Group();
  const buddy = makeSoftCorner(world);
  buddy.userData.drawFace(10);
  assert.equal(buddy.userData.skin, DEFAULT_SKIN);
  const features = buddy.userData.visualFeatures();
  assert.equal(features.leaves, 2);
  assert.equal(features.hands, 2);
  assert.ok(features.horns[0].top > features.horns[1].top);
  assert.equal(features.palette.eye, "#d9af68");
  assert.equal(features.palette.body, "#fdf7f1");
  assert.ok(buddy.getObjectByName("mouth-w"));
  assert.equal(buddy.getObjectByName("leg"), undefined);
  world.traverse((o) => {
    if (o.isMesh) {
      assert.equal(o.material.map, null);
      assert.ok(
        [...o.geometry.attributes.position.array].every(Number.isFinite),
      );
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  delete globalThis.matchMedia;
});
