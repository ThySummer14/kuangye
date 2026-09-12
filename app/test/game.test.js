import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyHome,
  lumenReward,
  rewardCompletion,
  recordGlimmer,
  buyFurniture,
  placeFurniture,
  recycleFurniture,
  normalizeHome,
  unlockGifts,
} from "../src/game/home.js";
import { placementCheck, footprint } from "../src/game/placement.js";
import { normalizeState } from "../src/game/save.js";
import { furnitureById, vintageStock } from "../src/data/furniture.js";
import { springStep, EXPRESSIONS } from "../src/game/emotions.js";
test("completion rewards are rounded to five and invalid input never creates currency", () => {
  assert.deepEqual(
    [10, 25, 50, 100, 200, 500].map(lumenReward),
    [5, 15, 30, 60, 120, 300],
  );
  assert.equal(lumenReward(-2), 0);
  assert.equal(lumenReward(NaN), 0);
});
test("unique recorded days yield glimmer once; gaps never remove progress", () => {
  const h = emptyHome();
  for (let i = 1; i <= 7; i++) {
    recordGlimmer(h, `2026-09-0${i}`);
    recordGlimmer(h, `2026-09-0${i}`);
  }
  assert.equal(h.lumens, 5);
  assert.equal(h.glimmerPaid, 5);
  recordGlimmer(h, "2026-10-01");
  assert.equal(h.lumens, 5);
});
test("first task can buy first furniture and memory binds once per completion", () => {
  const h = emptyHome(),
    done = [{ qid: "run-s1", at: "2026-09-12", review: "第一次沿着河边跑完" }];
  rewardCompletion(h, 10);
  const i = buyFurniture(h, furnitureById.mat, "2026-09-12", done);
  assert.equal(h.lumens, 0);
  assert.equal(i.memory.review, done[0].review);
  rewardCompletion(h, 10);
  assert.equal(
    buyFurniture(h, furnitureById.mat, "2026-09-12", done).memory,
    null,
  );
  assert.equal(buyFurniture(h, furnitureById.sofa, "2026-09-12", done), null);
});
test("placement enforces rotated footprint, bounds, collisions and can move itself", () => {
  const h = emptyHome();
  h.lumens = 500;
  const a = buyFurniture(h, furnitureById.bed, "2026-09-12", []),
    b = buyFurniture(h, furnitureById.stool, "2026-09-12", []);
  assert.deepEqual(footprint(furnitureById.bed, 1), { w: 3, d: 2 });
  assert.equal(placeFurniture(h, a.uid, { x: 4, z: 4, rotation: 1 }).ok, false);
  assert.equal(placeFurniture(h, a.uid, { x: 0, z: 0, rotation: 1 }).ok, true);
  assert.equal(placeFurniture(h, b.uid, { x: 1, z: 1, rotation: 0 }).ok, false);
  assert.equal(placeFurniture(h, a.uid, { x: 1, z: 0, rotation: 1 }).ok, true);
  assert.equal(placeFurniture(h, b.uid, { x: 5, z: 5, rotation: 0 }).ok, true);
  assert.equal(
    placementCheck(furnitureById.mat, { x: NaN, z: 0 }, [], []).ok,
    false,
  );
});
test("recycle returns 70 percent of actual paid price only once and removes placement", () => {
  const h = emptyHome();
  h.lumens = 100;
  const a = buyFurniture(
    h,
    { ...furnitureById.radio, price: 60 },
    "2026-09-12",
    [],
  );
  placeFurniture(h, a.uid, { x: 0, z: 0, rotation: 0 });
  assert.equal(recycleFurniture(h, a.uid), 42);
  assert.equal(h.lumens, 82);
  assert.equal(h.inventory.length, 0);
  assert.equal(h.placed.length, 0);
  assert.equal(recycleFurniture(h, a.uid), null);
});
test("level gifts are idempotent and cannot be bought or recycled", () => {
  const h = emptyHome();
  unlockGifts(h, 9, "2026-09-12");
  unlockGifts(h, 9, "2026-09-12");
  assert.equal(h.inventory.length, 4);
  assert.equal(
    buyFurniture(h, furnitureById.stringlights, "2026-09-12", []),
    null,
  );
  assert.equal(recycleFurniture(h, h.inventory[0].uid), null);
});
test("v2 migration preserves active, done, abandoned and credits historical completion light", () => {
  const old = {
    version: 2,
    state: {
      active: [
        {
          qid: "run-s1",
          start: "2026-09-01",
          logs: [{ d: "2026-09-02", v: 2 }],
          shields: 1,
        },
      ],
      done: [
        {
          qid: "climb",
          xp: 50,
          at: "2026-09-03",
          review: "看到了山顶的云",
          units: [{ metric: "summit", v: 1 }],
        },
      ],
      abandoned: [{ qid: "sleep30", reason: "调整计划", at: "2026-09-04" }],
    },
  };
  const s = normalizeState(old);
  assert.equal(s.active[0].logs[0].v, 2);
  assert.equal(s.done[0].review, "看到了山顶的云");
  assert.equal(s.abandoned[0].reason, "调整计划");
  assert.equal(s.home.lumens, 30);
  assert.equal(normalizeState({}), null);
});
test("v3 save round trip keeps purchased prices, placements and plaques", () => {
  const h = emptyHome();
  h.lumens = 50;
  const i = buyFurniture(h, furnitureById.mat, "2026-09-12", [
    { qid: "climb", review: "云", at: "2026-09-12" },
  ]);
  placeFurniture(h, i.uid, { x: 2, z: 2, rotation: 1 });
  const clean = normalizeState({
    active: [],
    done: [],
    home: JSON.parse(JSON.stringify(h)),
  });
  assert.deepEqual(clean.home, h);
});
test("corrupt home data is sanitized without removing task records", () => {
  const h = normalizeHome({
    lumens: -12,
    nextId: 1,
    inventory: [
      { uid: "item-8", fid: "mat", paid: 500 },
      { uid: "item-8", fid: "mat" },
      { uid: "bad", fid: "unknown" },
    ],
    placed: [{ uid: "item-8", x: 40, z: 0 }],
  });
  assert.equal(h.lumens, 0);
  assert.equal(h.inventory.length, 1);
  assert.equal(h.inventory[0].paid, 5);
  assert.equal(h.nextId, 9);
  assert.equal(h.placed.length, 0);
});
test("vintage stock is deterministic and independent from purchases", () => {
  const a = vintageStock("2026-09-12");
  assert.deepEqual(a, vintageStock("2026-09-12"));
  assert.equal(a.length, 3);
  assert.ok(
    a.every((f) => f.price === Math.round(furnitureById[f.id].price * 0.7)),
  );
});
test("all expressions interpolate without overshooting or discontinuity", () => {
  for (const target of Object.values(EXPRESSIONS)) {
    let p = 0,
      v = 0;
    for (let i = 0; i < 120; i++) {
      const s = springStep(p, v, target[0], 1 / 60);
      assert.ok(Number.isFinite(s.position));
      assert.ok(s.position <= target[0] + 1e-8);
      p = s.position;
      v = s.velocity;
    }
    assert.ok(Math.abs(p - target[0]) < 0.001);
  }
});
