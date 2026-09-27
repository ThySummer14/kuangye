import test from "node:test";
import assert from "node:assert/strict";
import { nextTick } from "vue";
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => memory.get(k) || null,
  setItem: (k, v) => memory.set(k, v),
  removeItem: (k) => memory.delete(k),
};
const store = await import("../src/store.js");
const { TASKS } = await import("../src/data/tasks.js");
test("full store flow pays exactly once, persists v3, and imports home together with tasks", async () => {
  store.resetData();
  const t = TASKS.find((t) => t.id === "run-s1");
  assert.equal(store.accept(t), true);
  assert.equal(store.accept(t), false);
  const a = store.activeOf(t.id);
  assert.equal(store.complete(a, "沿河的风"), true);
  assert.equal(store.complete(a, "duplicate"), false);
  assert.equal(store.state.home.lumens, 15);
  const i = store.purchase("mat");
  assert.ok(i);
  assert.equal(store.state.home.lumens, 10);
  assert.equal(store.place(i.uid, { x: 1, z: 1, rotation: 0 }).ok, true);
  await nextTick();
  assert.ok(memory.get("kuangye.v3"));
  const backup = store.exportData();
  store.resetData();
  store.importData(backup);
  assert.equal(store.state.home.inventory[0].memory.review, "沿河的风");
  assert.equal(store.state.home.placed.length, 1);
  assert.equal(store.state.done.length, 1);
});
test("streak check-in is unique and cannot complete early; abandoning never changes currency", () => {
  store.resetData();
  const t = TASKS.find(
    (t) => t.type === "streak" && t.chain === "read" && t.stage === 1,
  );
  assert.ok(t);
  store.accept(t);
  const a = store.activeOf(t.id);
  assert.equal(store.checkIn(a), true);
  assert.equal(store.checkIn(a), false);
  assert.equal(store.complete(a), false);
  assert.equal(store.state.home.glimmerDays.length, 1);
  assert.equal(store.state.home.lumens, 0);
  assert.equal(store.abandon(a, "休息"), true);
  assert.equal(store.abandon(a), false);
  assert.equal(store.state.home.lumens, 0);
  assert.equal(store.state.abandoned.length, 1);
});
test("three concurrent tasks remains the global limit", () => {
  store.resetData();
  for (const tier of ["season", "chapter", "chapter"]) {
    const t = TASKS.find((t) => t.tier === tier && store.canAccept(t).ok);
    assert.ok(t);
    store.accept(t);
  }
  assert.equal(store.state.active.length, 3);
  assert.ok(TASKS.every((t) => !store.canAccept(t).ok));
});
test("damaged v3 falls back to a legacy save without overwriting the legacy key", async () => {
  const legacy = {
    active: [],
    done: [{ qid: "climb", xp: 50, at: "2026-09-12", review: "山顶" }],
    abandoned: [],
  };
  memory.set("kuangye.v3", "{broken");
  memory.set("kuangye.v2", JSON.stringify(legacy));
  const recovered = await import("../src/store.js?recovery");
  assert.equal(recovered.state.done[0].review, "山顶");
  assert.equal(recovered.state.home.lumens, 30);
  assert.equal(memory.get("kuangye.v2"), JSON.stringify(legacy));
});
test("action plans round-trip safely without affecting rewards or legacy records", async () => {
  store.resetData();
  store.accept(TASKS.find(t => t.id === 'run-s1'));
  const a = store.state.active[0];
  assert.equal(store.saveActionPlan(a, { cue: ' 晚饭后 ', step: '穿鞋走到楼下', extra: 'ignored' }), true);
  assert.deepEqual({ ...a.plan }, { cue: '晚饭后', step: '穿鞋走到楼下' });
  const backup = store.exportData();
  store.importData(backup);
  assert.deepEqual({ ...store.state.active[0].plan }, { cue: '晚饭后', step: '穿鞋走到楼下' });
  assert.equal(store.state.home.lumens, 0);
  assert.equal(store.state.home.glimmerDays.length, 0);
  assert.equal(store.saveActionPlan(a, { cue: 'stale' }), false);
  const current = store.state.active[0];
  store.saveActionPlan(current, { cue: 'a'.repeat(100), step: 'b'.repeat(200) });
  assert.equal(current.plan.cue.length, 60);
  assert.equal(current.plan.step.length, 160);
  store.saveActionPlan(current, { cue: 42, step: {} });
  assert.equal('plan' in current, false);
  await nextTick();
  const { normalizeState } = await import('../src/game/save.js');
  assert.equal('plan' in normalizeState({ active: [{ qid: 'run-s1' }] }).active[0], false);
  assert.equal('plan' in normalizeState({ active: [{ qid: 'run-s1', plan: { step: [] } }] }).active[0], false);
});
