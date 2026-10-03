import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendMapTask } from '../src/game/map-recommendation.js';
import { TASKS } from '../src/data/tasks.js';
import { taskContext } from '../src/data/task-context.js';

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
    if(task){assert.equal(task.type,'once');assert.ok(taskContext(task).minutes<=minutes);}
  }
  assert.deepEqual(recommendMapTask(empty,{trail:'think',minutes:15}),{task:null,count:0});
  assert.deepEqual(recommendMapTask(empty,{trail:'unknown'}),{task:null,count:0});
});
test('map suggestions exclude completed nonrepeatable and locked advanced tasks, and leave active work first',()=>{
  const task=TASKS.find(t=>t.id==='selfrec');
  assert.deepEqual(recommendMapTask({active:[],done:[{qid:task.id}]},{trail:'make',minutes:15}),{task:null,count:0});
  assert.deepEqual(recommendMapTask({active:[{qid:task.id}],done:[]}),{task:null,count:0});
  const advanced=TASKS.find(t=>t.id==='run5k'), locked={...task,id:'locked',chain:'run',stage:2,diff:'D'};
  assert.deepEqual(recommendMapTask(empty,{},[advanced,locked]),{task:null,count:0});
});
