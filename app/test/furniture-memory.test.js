import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedMemoryRecord } from '../src/game/journal.js';
test('furniture memories find exact original dates and avoid ambiguous imported completions',()=>{
 const first={qid:'read-s1',at:'2026-09-01',review:'第一段'},second={qid:'read-s1',at:'2026-09-20',review:'另一段'};
 const done=[first,second];
 assert.equal(linkedMemoryRecord(done,{qid:'read-s1',date:'2026-09-01'}),first);
 assert.equal(linkedMemoryRecord(done,{qid:'read-s1',date:'2026-08-01'}),null);
 assert.equal(linkedMemoryRecord([first],{qid:'read-s1'}),first);
 assert.equal(linkedMemoryRecord(done,{qid:'missing'}),null);
 assert.equal(linkedMemoryRecord(done,null),null);
 assert.deepEqual(done,[first,second]);
});
