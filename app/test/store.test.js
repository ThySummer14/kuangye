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
test("按天任务空档后不清零，完成仍需记满且只结算一次", () => {
  store.resetData();
  const t = TASKS.find((t) => t.id === "read-s1");
  const day = (d) => (store.state.settings.devDate = d);
  day("2026-09-01");
  assert.equal(store.accept(t), true);
  const a = store.activeOf(t.id);
  store.checkIn(a);
  day("2026-09-05");
  store.checkIn(a);
  assert.deepEqual(store.progressOf(a), { cur: 2, target: 3 });
  assert.equal(store.complete(a), false);
  day("2026-09-20");
  assert.equal(store.progressOf(a).cur, 2);
  assert.equal(store.canRecordYesterday(a), true);
  assert.equal(store.recordYesterday(a), true);
  assert.equal(store.recordYesterday(a), false);
  assert.equal(store.progressOf(a).cur, 3);
  assert.equal(a.shields, 2);
  store.checkIn(a);
  assert.equal(store.complete(a, "断断续续，也读完了三天"), true);
  const done = store.state.done.at(-1);
  assert.equal(done.streak, 2);
  assert.equal(done.logs.length, 4);
  assert.equal(store.state.home.lumens, 5);
  assert.equal(store.state.home.glimmerDays.length, 4);
  day("");
});
test("旧档里带空档与金牌标记的按天日志，按日期数恢复进度", () => {
  store.resetData();
  store.importData(JSON.stringify({ app: "kuangye", version: 3, state: {
    active: [{ qid: "read-s2", start: "2026-09-01", shields: 1, logs: [
      { d: "2026-09-01" }, { d: "2026-09-02" }, { d: "2026-09-03", shield: true }, { d: "2026-09-10" }, { d: "2026-09-10" }, { d: "2026-09-15" },
    ] }],
    done: [{ qid: "read-s1", xp: 10, at: "2026-08-31", review: "", logs: [] }], abandoned: [],
  } }));
  const a = store.activeOf("read-s2");
  assert.deepEqual(store.progressOf(a), { cur: 5, target: 14 });
  assert.equal(a.shields, 1);
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
test('personal tasks share capacity, preserve their content, and cannot mint completion rewards', async () => {
  store.resetData();
  const input = { title: '清理抽屉', desc: '文具和票据分开收好', cat: 'live', plan: { cue: '晚饭后', step: '拿出东西' } };
  assert.equal(store.createPersonalTask({ ...input, title: ' ' }).ok, false);
  assert.equal(store.state.customTasks.length, 0);
  const { task } = store.createPersonalTask(input);
  const a = store.activeOf(task.id);
  assert.equal(store.state.active.length, 1);
  assert.equal(store.editPersonalTask(task.id, { ...input, title: '整理书桌' }).ok, true);
  const saved = store.exportData();
  store.importData(saved);
  assert.equal(store.taskById[task.id].title, '整理书桌');
  assert.equal(store.activeOf(task.id).plan.cue, '晚饭后');
  assert.equal(store.complete(store.activeOf(task.id), '终于能放下本子了'), true);
  assert.equal(store.complete(a), false);
  assert.equal(store.state.done[0].xp, 0);
  assert.equal(store.state.home.lumens, 0);
  assert.equal(store.state.home.glimmerDays.length, 1);
  assert.equal(store.editPersonalTask(task.id, input).ok, false);
  for (let i = 0; i < 3; i++) assert.equal(store.createPersonalTask(input).ok, true);
  assert.equal(store.createPersonalTask(input).ok, false);
  assert.equal(store.state.customTasks.length, 4);
  const rest = store.state.active[0];
  store.abandon(rest, '这周换个安排');
  assert.equal(store.accept(store.taskById[rest.qid]), false);
  assert.equal(store.editPersonalTask(rest.qid, input).ok, false);
  store.complete(store.state.active[0]);
  assert.equal(store.state.home.glimmerDays.length, 1);
  assert.equal(store.state.home.lumens, 0);
  const backup = store.exportData();
  store.resetData();
  store.importData(backup);
  assert.equal(store.taskById[task.id].desc, input.desc);
  assert.equal(store.state.abandoned[0].reason, '这周换个安排');
  assert.equal(store.state.done[0].review, '终于能放下本子了');
  await nextTick();
});
test('personal backup definitions cannot collide or inject rewards; missing content is rejected', async () => {
  const { parseImport, normalizeState } = await import('../src/game/save.js');
  const task = { id: 'personal-abcdefgh', title: '我写的', desc: '做完一件事', cat: 'live', xp: 500, diff: 'S', type: 'streak' };
  const source = { active: [], customTasks: [task], done: [{ qid: task.id, xp: 500 }] };
  const parsed = parseImport(JSON.stringify(source));
  assert.equal(parsed.customTasks[0].diff, 'E');
  assert.equal(parsed.customTasks[0].type, 'once');
  assert.equal(parsed.done[0].xp, 0);
  assert.equal(parsed.home.lumens, 0);
  assert.throws(() => parseImport(JSON.stringify({ ...source, customTasks: [] })), /无法识别/);
  assert.throws(() => normalizeState({ ...source, customTasks: [] }), /缺少/);
  assert.throws(() => parseImport(JSON.stringify({ ...source, customTasks: [task, task] })), /重复/);
  assert.throws(() => parseImport(JSON.stringify({ ...source, customTasks: [{ ...task, id: 'run-s1' }] })), /资料/);
  assert.deepEqual(normalizeState({ active: [] }).customTasks, []);
});
test('a personal completion can become a furniture memory and survive backup', () => {
  store.resetData();
  store.accept(store.taskById['run-s1']);
  store.complete(store.state.active[0]);
  const {task} = store.createPersonalTask({title:'清出书桌',desc:'留下一块写字的地方',cat:'live'});
  store.complete(store.activeOf(task.id),'这是我自己决定的一步');
  const item = store.purchase('mat');
  assert.equal(item.memory.qid, task.id);
  assert.equal(store.state.home.lumens,10);
  const backup = store.exportData();
  store.resetData();
  store.importData(backup);
  assert.equal(store.taskById[store.state.home.inventory[0].memory.qid].title,'清出书桌');
  assert.equal(store.state.home.inventory[0].memory.review,'这是我自己决定的一步');
});
test('town changes persist with tasks and repair never changes the economy',()=>{
  store.resetData();
  const before=store.state.home.lumens;
  store.setExterior('roof','blue');
  assert.equal(store.arrangeYard('bench',{x:0,z:0,rotation:0}).ok,true);
  assert.equal(store.restoreLibrary().ok,false);
  store.state.done.push({qid:'read-s1',xp:10,at:'2026-09-28',review:'读了三天',units:[],logs:[]});
  assert.equal(store.restoreLibrary().ok,true);
  assert.equal(store.restoreLibrary().ok,false);
  assert.equal(store.state.home.lumens,before);
  assert.equal(store.state.home.glimmerDays.length,0);
  const backup=store.exportData(); store.resetData();store.importData(backup);
  assert.equal(store.state.home.town.library,1);
  assert.equal(store.state.home.town.exterior.roof,'blue');
  assert.equal(store.state.home.town.yard.length,1);
  store.removeYard('bench');assert.equal(store.state.home.town.yard.length,0);
});
