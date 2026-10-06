import test from 'node:test';
import assert from 'node:assert/strict';
import { latestRestingStudioWork } from '../src/game/studio.js';
import { normalizeState, parseImport } from '../src/game/save.js';

const qid = i => `personal-return-${String(i).padStart(8,'0')}`;
const work = i => ({ id:`return-${i}`, title:`第${i}版`, body:'  留下的成果\n第二行\n', images:[], note:'私人备注', theme:'own', exerciseId:'', taskIds:[qid(i)], created:'2026-10-01', updated:'2026-10-06' });
const state = works => ({ active:[], done:[], abandoned:[], home:{studio:{works,displayId:''}} });

test('map return uses the last task pause, excludes active/completed/ordinary records and ignores edits', () => {
  const a=work(1),b=work(2),active=work(3),done=work(4);
  a.taskIds=[qid(10),qid(1)];
  const s=state([done,active,a,b]);
  s.active=[{qid:qid(3)}];s.done=[{qid:qid(4)}];
  s.abandoned=[{qid:qid(1),at:'2026-10-02'},{qid:qid(2),at:'2026-10-04'},
    {qid:qid(10),at:'2026-10-06'},{qid:qid(3),at:'2026-10-06'},
    {qid:qid(4),at:'2026-10-06'},{qid:qid(99),at:'2026-10-06'}];
  const before=JSON.stringify(s),result=latestRestingStudioWork(s);
  assert.equal(result.work,b);assert.equal(result.record,s.abandoned[1]);
  assert.equal(JSON.stringify(s),before);
  a.updated='2030-01-01';s.home.studio.works.reverse();
  assert.equal(latestRestingStudioWork(s).work.id,b.id);
});

test('pause dates take priority over array order, with last history entry breaking a same-day tie', () => {
  const s=state([work(1),work(2),work(3)]);
  s.abandoned=[{qid:qid(1),at:'2026-10-05'}, {qid:qid(2),at:'2026-10-05'}, {qid:qid(3),at:'2026-10-02'}];
  assert.equal(latestRestingStudioWork(s).work.id,'return-2');
  s.abandoned.push({qid:qid(1),at:'2026-10-05'});
  assert.equal(latestRestingStudioWork(s).work.id,'return-1');
});

test('continued works leave the candidate list, re-pausing uses the new task, completion excludes all past pauses', () => {
  const a=work(1),b=work(2),s=state([a,b]);
  s.abandoned=[{qid:qid(2),at:'2026-10-02',logs:[{d:'2026-10-01',v:2}]},{qid:qid(1),at:'2026-10-03'}];
  const history=structuredClone(s.abandoned);
  a.taskIds.push(qid(11));s.active.push({qid:qid(11)});
  assert.equal(latestRestingStudioWork(s).work.id,b.id);
  s.active=[];s.abandoned.push({qid:qid(11),at:'2026-10-06'});
  assert.equal(latestRestingStudioWork(s).work.id,a.id);
  s.done.push({qid:qid(11)});
  assert.equal(latestRestingStudioWork(s).work.id,b.id);
  s.done.push({qid:qid(2)});assert.equal(latestRestingStudioWork(s),null);
  assert.deepEqual(s.abandoned.slice(0,2),history);
});

test('old empty saves and a full 45-work backup remain intact through the read-only projection', () => {
  assert.equal(latestRestingStudioWork(normalizeState({active:[]})),null);
  const works=Array.from({length:45},(_,i)=>work(i)),s=state(works);
  s.customTasks=works.map(w=>({id:w.taskIds[0],title:w.title,desc:'留下这一版',cat:'create'}));
  s.abandoned=works.map(w=>({qid:w.taskIds[0],at:'2026-10-05',reason:'歇一歇',logs:[{d:'2026-10-04',v:3,note:'原任务记录'}]}));
  const restored=parseImport(JSON.stringify({version:3,state:s})),before=JSON.stringify(restored);
  assert.equal(latestRestingStudioWork(restored).work.id,'return-44');
  assert.equal(JSON.stringify(restored),before);
  assert.equal(restored.home.studio.works.length,45);assert.equal(restored.abandoned.length,45);
  assert.equal(restored.home.studio.works[44].body,works[44].body);
  assert.deepEqual(restored.abandoned[44].logs,s.abandoned[44].logs);
});
