import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendMapTask } from '../src/game/map-recommendation.js';
import { TASKS } from '../src/data/tasks.js';
import { taskContext, sessionContext } from '../src/data/task-context.js';
import { prepMoves, pickPrepMove, prepSuggestion } from '../src/game/prep-moves.js';
import { fieldGuide } from '../src/data/field-guides.js';

const empty = {active:[],done:[]};
test('map suggestions vary by day and manual turn without writing or cloning tasks',()=>{
  const before=JSON.stringify(empty);
  const a=recommendMapTask(empty,{day:'2026-10-03'});
  assert.ok(TASKS.includes(a.task));
  assert.equal(recommendMapTask(empty,{day:'2026-10-03'}).task,a.task);
  assert.notEqual(recommendMapTask(empty,{day:'2026-10-03',offset:1}).task,a.task);
  assert.notEqual(recommendMapTask(empty,{day:'2026-10-04'}).task,a.task);
  assert.equal(JSON.stringify(empty),before);
});
test('map directions use their existing notebooks and respect honest time estimates',()=>{
  const creation=recommendMapTask(empty,{trail:'make',minutes:15});
  assert.equal(creation.task.id,'selfrec');
  const social=recommendMapTask(empty,{trail:'connect',minutes:15});
  assert.ok(['c1-askhelp','c2-thanks'].includes(social.task.id));
  for(const minutes of [15,30]) for(const trail of ['', 'outside','settle','make','connect','think']) {
    const {task}=recommendMapTask(empty,{trail,minutes});
    if(!task) continue;
    // 一次性任务用一次完成的估时；按天／累积任务只在写明单次用时时进入短时组合。
    if(task.type==='once') assert.ok(taskContext(task).minutes<=minutes);
    else assert.ok(sessionContext(task).minutes<=minutes);
  }
  assert.equal(recommendMapTask(empty,{trail:'think',minutes:15}).task.id,'read-s1');
  assert.equal(recommendMapTask(empty,{trail:'settle',minutes:15}).task.id,'c1-budget7');
  assert.equal(sessionContext(TASKS.find(t=>t.id==='selfrec')),null);
  assert.deepEqual(recommendMapTask(empty,{trail:'unknown'}),{task:null,count:0});
});
test('map suggestions exclude completed nonrepeatable and locked advanced tasks, and leave active work first',()=>{
  const task=TASKS.find(t=>t.id==='selfrec');
  assert.deepEqual(recommendMapTask({active:[],done:[{qid:task.id}]},{trail:'make',minutes:15}),{task:null,count:0});
  assert.deepEqual(recommendMapTask({active:[{qid:task.id}],done:[]}),{task:null,count:0});
  const advanced=TASKS.find(t=>t.id==='run5k'), locked={...task,id:'locked',chain:'run',stage:2,diff:'D'};
  assert.deepEqual(recommendMapTask(empty,{},[advanced,locked]),{task:null,count:0});
});
test('every short map combination offers a real task or a handbook preparation step',()=>{
  for(const minutes of [15,30]) for(const trail of ['outside','settle','make','connect','think']) {
    const {task}=recommendMapTask(empty,{trail,minutes});
    const {move}=pickPrepMove(empty,{trail,minutes,day:'2026-10-04'});
    assert.ok(task||move, `${trail}/${minutes} is empty`);
  }
  assert.equal(recommendMapTask(empty,{trail:'outside',minutes:15}).task,null);
});
test('preparation steps quote existing handbooks, skip finished tasks, and never write state',()=>{
  const before=JSON.stringify(empty);
  for(const m of prepMoves(empty)) {
    const g=fieldGuide(m.task);
    assert.ok([g.steps[0],g.startingPoints?.[0]?.[1]].includes(m.text), m.from);
    assert.ok(m.minutes<=15);
  }
  assert.equal(JSON.stringify(empty),before);
  const outside=prepMoves(empty,{trail:'outside',minutes:15}).map(m=>m.from);
  assert.deepEqual(outside,['soloMovie','climb','volunteer']);
  assert.deepEqual(prepMoves({active:[{qid:'climb'}],done:[{qid:'soloMovie'}]},{trail:'outside',minutes:15}).map(m=>m.from),['volunteer']);
  assert.deepEqual(prepMoves(empty,{trail:'outside',minutes:10}).map(m=>m.from),['soloMovie']);
  const a=pickPrepMove(empty,{trail:'think',minutes:15,day:'2026-10-04'});
  assert.equal(pickPrepMove(empty,{trail:'think',minutes:15,day:'2026-10-04'}).move.from,a.move.from);
  assert.notEqual(pickPrepMove(empty,{trail:'think',minutes:15,day:'2026-10-04',offset:1}).move.from,a.move.from);
  const s=prepSuggestion(a.move);
  assert.equal(s.cat,a.move.task.cat);
  assert.equal(s.step,a.move.text);
  assert.ok(!('title' in s) && !('desc' in s));
});
import { onwardSuggestion, trailOfTask } from '../src/game/onward.js';
test('after finishing, one onward suggestion in the same direction, never auto-accepted',()=>{
  const by=id=>TASKS.find(t=>t.id===id);
  assert.equal(trailOfTask(by('selfrec')),'make');
  assert.equal(trailOfTask({id:'personal-x',cat:'mind'}),'think');
  const chain=onwardSuggestion(empty,by('read-s1'),{next:by('read-s2'),nextOk:true});
  assert.deepEqual([chain.kind,chain.task.id],['chain','read-s2']);
  const hand=onwardSuggestion({active:[{qid:'climb'}],done:[]},by('selfrec'));
  assert.equal(hand.kind,'hand');
  const doneState={active:[],done:[{qid:'selfrec'}]};
  const before=JSON.stringify(doneState);
  const same=onwardSuggestion(doneState,by('selfrec'),{day:'2026-10-04'});
  assert.equal(same.kind,'same');
  assert.notEqual(same.task.id,'selfrec');
  assert.equal(trailOfTask(same.task),'make');
  assert.equal(JSON.stringify(doneState),before);
});
