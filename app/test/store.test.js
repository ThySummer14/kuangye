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
test("放下不清零：攒下的日子随放下记录保留，再接起来接着数", () => {
  store.resetData();
  const day = (d) => (store.state.settings.devDate = d);
  const t = TASKS.find((t) => t.id === "read-s2");
  store.state.done.push({ qid: "read-s1", xp: 10, at: "2026-08-31", review: "", units: [], logs: [] });
  day("2026-09-01"); store.accept(t);
  for (const d of ["2026-09-01", "2026-09-02", "2026-09-05"]) { day(d); store.checkIn(store.activeOf(t.id)); }
  assert.equal(store.abandon(store.activeOf(t.id), "考试周"), true);
  assert.equal(store.state.abandoned.at(-1).logs.length, 3);
  assert.equal(store.state.home.lumens, 0);
  day("2026-09-20");
  assert.equal(store.accept(t), true);
  const a = store.activeOf(t.id);
  assert.deepEqual(store.progressOf(a), { cur: 3, target: 14 });
  assert.equal(store.state.abandoned.at(-1).logs.length, 3);
  assert.notEqual(store.state.abandoned.at(-1).logs, a.logs);
  store.checkIn(a);
  assert.equal(store.progressOf(a).cur, 4);
  assert.equal(store.state.abandoned.at(-1).logs.length, 3);
  // 复制最近快照，不累加历史快照；过去的每一页仍然保留。
  store.abandon(a); store.accept(t);
  assert.equal(store.progressOf(store.activeOf(t.id)).cur, 4);
  assert.deepEqual(store.state.abandoned.map(r => r.logs.length), [3, 4]);
  day("");
});
test("累计任务多次放下、备份往返与接起，不重复数量或奖励", () => {
  store.resetData();
  store.state.settings.devDate = "2026-10-04";
  const t = store.taskById.poems10;
  store.accept(t);
  store.logUnits(store.activeOf(t.id), 2);
  store.abandon(store.activeOf(t.id), "先准备考试");
  store.importData(store.exportData());
  store.accept(t);
  assert.equal(store.progressOf(store.activeOf(t.id)).cur, 2);
  store.logUnits(store.activeOf(t.id), 1);
  store.abandon(store.activeOf(t.id));
  store.importData(store.exportData());
  store.accept(t);
  assert.equal(store.progressOf(store.activeOf(t.id)).cur, 3);
  assert.deepEqual(store.state.abandoned.map(r => r.logs.reduce((n, l) => n + l.v, 0)), [2, 3]);
  assert.equal(store.state.home.lumens, 0);
  assert.equal(store.state.home.glimmerDays.length, 1);
  assert.equal(store.state.done.length, 0);
  assert.equal(store.totalXp.value, 0);
  store.state.settings.devDate = "";
});
test("接起按最近暂放日期恢复；无日志的旧记录如实从零开始", () => {
  store.resetData();
  store.importData(JSON.stringify({ active: [], abandoned: [
    { qid: "poems10", at: "2026-09-09", logs: [{ d: "2026-09-08", v: 3 }] },
    { qid: "poems10", at: "2026-09-01", logs: [{ d: "2026-09-01", v: 1 }] },
    { qid: "read-s1", at: "2026-08-01", reason: "旧版只留了理由" },
  ] }));
  store.accept(store.taskById.poems10);
  assert.equal(store.progressOf(store.activeOf("poems10")).cur, 3);
  store.accept(store.taskById["read-s1"]);
  assert.equal(store.progressOf(store.activeOf("read-s1")).cur, 0);
});
test("存档往返保留已完成与放下记录里的数量", () => {
  store.resetData();
  const backup = JSON.stringify({ app: "kuangye", version: 3, state: {
    active: [], abandoned: [{ qid: "poems10", reason: "", at: "2026-09-03", logs: [{ d: "2026-09-02", v: 2 }] }, { qid: "climb", reason: "旧版", at: "2026-08-01" }],
    done: [{ qid: "body-walk3", xp: 10, at: "2026-09-05", review: "", units: [], logs: [{ d: "2026-09-01", v: 1 }, { d: "2026-09-05", v: 2, note: "河边" }] }],
  } });
  store.importData(backup);
  assert.deepEqual(store.state.done[0].logs, [{ d: "2026-09-01", v: 1 }, { d: "2026-09-05", v: 2, note: "河边" }]);
  assert.deepEqual(store.state.abandoned[0].logs, [{ d: "2026-09-02", v: 2 }]);
  assert.equal("logs" in store.state.abandoned[1], false);
  store.importData(store.exportData());
  assert.equal(store.state.done[0].logs[1].v, 2);
  assert.equal(store.progressOf({ qid: "poems10", logs: store.state.abandoned[0].logs }).cur, 2);
});
test("three concurrent tasks remains the only limit, whatever their tier", () => {
  store.resetData();
  for (const id of ["read-s1", "body-walk3", "cook-s1"]) {
    assert.equal(TASKS.find((t) => t.id === id).tier, "season");
    assert.deepEqual(store.canAccept(TASKS.find((t) => t.id === id)), { ok: true });
    store.accept(TASKS.find((t) => t.id === id));
  }
  assert.equal(store.state.active.length, 3);
  assert.ok(TASKS.every((t) => !store.canAccept(t).ok));
  assert.match(store.canAccept(TASKS.find((t) => t.id === "climb")).why, /最多放 3 件/);
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
test('studio task capacity, artifact completion, display and revisions preserve existing reward rules',async()=>{
  store.resetData();
  const input={title:'窗边的光',criterion:'留下一个角落的照片',theme:'notice'};
  const result=store.openStudioWork(input),id=result.work.id,qid=result.work.taskIds[0];
  assert.equal(result.ok,true);
  assert.ok(store.completionIssue(store.activeOf(qid)));
  assert.equal(store.complete(store.activeOf(qid)),false);
  assert.equal(store.displayStudioWork(id).ok,false);
  for(let i=0;i<2;i++)assert.equal(store.openStudioWork(input).ok,true);
  const before=JSON.stringify(store.state);
  assert.equal(store.openStudioWork(input).ok,false);assert.equal(JSON.stringify(store.state),before);
  assert.equal(store.saveStudioWork(id,{title:input.title,body:'  光落在杯柄上。\n',note:'仅给自己',images:[]}).ok,true);
  assert.equal(store.complete(store.activeOf(qid),'第一次试着把光拍下来'),true);
  assert.equal(store.complete(store.activeOf(qid)),false);
  assert.equal(store.state.done[0].xp,0);assert.equal(store.state.home.lumens,0);assert.equal(store.state.home.glimmerDays.length,1);
  assert.equal(store.displayStudioWork(id).ok,true);
  assert.equal(store.saveStudioWork(id,{title:'改名',body:'',images:[]}).ok,false);
  assert.equal(store.saveStudioWork(id,{title:'改名',body:'这次留了完整一版。',images:[]}).ok,true);
  assert.equal(store.state.done.length,1);assert.equal(store.state.home.lumens,0);
  const backup=store.exportData();store.resetData();store.importData(backup);
  assert.equal(store.state.home.studio.displayId,id);
  assert.equal(store.state.home.studio.works.find(w=>w.id===id).body,'这次留了完整一版。');
  assert.equal(store.continueStudioWork(id).ok,false);
  await nextTick();
});
test('studio resting preserves artifacts, resumes through a new task and rejects imports without changing current data',async()=>{
  store.resetData();
  const {work}=store.openStudioWork({title:'小故事',criterion:'写成一版',body:'开头已经写下来。',note:'慢慢来'});
  const id=work.id,old=work.taskIds[0];
  store.abandon(store.activeOf(old),'这周先准备考试');
  assert.equal(store.editPersonalTask(old,{title:'改写',desc:'新条件',cat:'create'}).ok,false);
  assert.equal(store.state.home.studio.works[0].body,'开头已经写下来。');
  for(let i=0;i<3;i++)store.createPersonalTask({title:'手里的事',desc:'做完一版',cat:'live'});
  assert.equal(store.continueStudioWork(id).ok,false);
  store.abandon(store.state.active[0]);
  assert.equal(store.continueStudioWork(id).ok,true);
  const resumed=store.state.home.studio.works[0];
  assert.equal(resumed.taskIds.length,2);assert.notEqual(resumed.taskIds[1],old);
  assert.equal(store.taskById[resumed.taskIds[1]].desc,'写成一版');
  assert.equal(store.state.abandoned[0].qid,old);assert.equal(store.state.abandoned[0].reason,'这周先准备考试');
  assert.equal(store.complete(store.activeOf(resumed.taskIds[1])),true);
  assert.equal(store.state.home.lumens,0);assert.equal(store.state.home.glimmerDays.length,1);
  const backup=store.exportData(),invalid=JSON.parse(backup),before=JSON.stringify(store.state);
  invalid.state.home.studio.works[0].taskIds.push('personal-missing-record');
  assert.throws(()=>store.importData(JSON.stringify(invalid)));
  assert.equal(JSON.stringify(store.state),before);
  store.importData(backup);
  assert.deepEqual([...store.state.home.studio.works[0].taskIds],[old,resumed.taskIds[1]]);
  await nextTick();
});
