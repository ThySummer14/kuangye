import test from 'node:test';
import assert from 'node:assert/strict';
import { journalRecords, journalMonths } from '../src/game/journal.js';
const tasks = { a: { title: '第一次做饭', cat: 'create' }, b: { title: '散步', cat: 'body' } };
test('journal sorts imported dates and same-day records without mutating stored history', () => {
  const input = [{qid:'a', at:'2026-09-03'}, {qid:'b',at:'2026-08-20'}, {qid:'b',at:'2026-09-03',review:'晚风'}];
  const before = structuredClone(input);
  const result = journalRecords(input, tasks);
  assert.deepEqual(result.map(e => e.index), [2,0,1]);
  assert.deepEqual(journalMonths(result).map(g => [g.month,g.entries.length]), [['2026-09',2],['2026-08',1]]);
  assert.deepEqual(input,before);
});
test('journal combines domain, personal words, and notes filters; missing legacy task stays readable', () => {
  const input = [{qid:'a',at:'2026-09-01',review:' 番茄炒蛋 '}, {qid:'b',at:'2026-09-02',review:' '}, {qid:'old',reason:'等秋天再走'}];
  assert.equal(journalRecords(input,tasks,{cat:'create',query:'番茄',onlyNotes:true}).length,1);
  assert.equal(journalRecords(input,tasks,{cat:'body',query:'番茄'}).length,0);
  assert.equal(journalRecords(input,tasks,{onlyNotes:true}).length,2);
  assert.equal(journalRecords(input,tasks,{query:'秋天'})[0].record.qid,'old');
  assert.equal(journalMonths(journalRecords(input,tasks)).at(-1).month,'日期未记');
});
