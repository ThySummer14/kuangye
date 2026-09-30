import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATIVE_TASKS } from '../src/data/creative-tasks.js';
import { LIFE_TASKS } from '../src/data/life-tasks.js';
import { OUTDOOR_TASKS } from '../src/data/outdoor-tasks.js';
import { SMALL_TASKS } from '../src/data/small-tasks.js';
import { TASKS, CATS } from '../src/data/tasks.js';
import { selectTasks } from '../src/game/task-selection.js';
import { parseImport } from '../src/game/save.js';
const empty = {active:[],done:[]};
test('short-task drafts stay isolated and have a bounded one-time reward budget', () => {
  assert.equal(SMALL_TASKS.length,15);
  assert.equal(new Set(SMALL_TASKS.map(t=>t.id)).size,15);
  for(const cat of Object.keys(CATS)) assert.equal(SMALL_TASKS.filter(t=>t.cat===cat).length,3);
  for(const task of SMALL_TASKS) {
    assert.equal(task.reviewStatus,'pending-review');
    assert.equal(task.type,'once');
    assert.equal(task.diff,'E');
    assert.ok(!task.repeatable);
    assert.ok(!TASKS.some(t=>t.id===task.id));
  }
  assert.throws(()=>parseImport(JSON.stringify({active:[],done:[{qid:SMALL_TASKS[0].id}]})),/无法识别/);
});
test('time and place filter before suggestion limits, respecting history and search', () => {
  const pool=[...TASKS,...SMALL_TASKS];
  const short=selectTasks(empty,{minutes:10,place:'inside'},pool);
  assert.ok(short.some(t=>t.id==='small-desk'));
  assert.ok(!short.some(t=>t.id==='small-outside'));
  assert.ok(!short.some(t=>t.id==='read-s1')); // ten minutes per day is not a ten-minute task
  assert.deepEqual(selectTasks(empty,{minutes:10,cat:'live',query:'桌面'},pool).map(t=>t.id),['small-desk']);
  assert.ok(!selectTasks({active:[{qid:'small-desk'}],done:[{qid:'small-tomorrow'}]},{minutes:10},pool).some(t=>['small-desk','small-tomorrow'].includes(t.id)));
  assert.deepEqual(selectTasks(empty,{minutes:10,place:'outside',query:'桌面'},pool),[]);
});

test('themed drafts cannot enter the ordinary task pool or overwrite an existing task identity', () => {
  const drafts = [...SMALL_TASKS, ...OUTDOOR_TASKS, ...LIFE_TASKS, ...CREATIVE_TASKS];
  assert.equal(new Set([...TASKS, ...drafts].map(t => t.id)).size, TASKS.length + drafts.length);
  for (const task of drafts) {
    assert.equal(task.reviewStatus, 'pending-review');
    assert.equal(task.type, 'once');
    assert.equal(task.diff, 'E');
    assert.ok(!task.repeatable);
    assert.throws(() => parseImport(JSON.stringify({active:[],done:[{qid:task.id}]})), /无法识别/);
  }
});
