import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmotionMotion,
  EMOTION_POSES,
  morphSpring,
} from "../src/game/emotions.js";
import { closedPath, eyePoses } from "../src/vendor/bloub-shape.js";
import { sproutOutline } from "../src/scenes/sprout-paint.js";
test("all 196 mood pairs converge; interruption preserves pose and velocity", () => {
  for (const from of Object.keys(EMOTION_POSES))
    for (const to of Object.keys(EMOTION_POSES)) {
      const m = createEmotionMotion(from);
      m.setMood(to);
      for (let i = 0; i < 17; i++) m.step(1 / 60);
      const before = m.snapshot();
      m.setMood("curious");
      assert.deepEqual(m.snapshot().parameters, before.parameters);
      assert.deepEqual(m.snapshot().velocity, before.velocity);
      m.setMood(to);
      for (let i = 0; i < 240; i++) m.step(1 / 60);
      for (const key of Object.keys(m.values)) {
        assert.ok(Number.isFinite(m.values[key]));
        assert.ok(
          Math.abs(m.values[key] - EMOTION_POSES[to][key]) < 1e-5,
          `${from}->${to}:${key}`,
        );
      }
    }
});
test("spring is timestep consistent and resumes safely; closed outlines retain topology", () => {
  for (const z of [0.65, 0.86, 1]) {
    let x = 0,
      v = 0;
    for (let i = 0; i < 60; i++) {
      const r = morphSpring(x, v, 1, 1 / 60, 12, z);
      x = r.position;
      v = r.velocity;
    }
    const one = morphSpring(0, 0, 1, 1, 12, z);
    assert.ok(Math.abs(x - one.position) < 1e-9);
  }
  for (const p of Object.values(EMOTION_POSES)) {
    const pts = sproutOutline(p, 0, false);
    assert.equal(pts.length, 64);
    const path = closedPath(pts);
    assert.equal((path.match(/C/g) || []).length, 64);
    assert.ok(path.endsWith("Z"));
    assert.ok(!path.includes("NaN"));
    for (const e of eyePoses(p, 110, 18)) assert.ok(e.depth > 0.8);
  }
  const m = createEmotionMotion();
  m.setMood("shocked");
  m.step(300);
  assert.ok(Object.values(m.values).every(Number.isFinite));
});
