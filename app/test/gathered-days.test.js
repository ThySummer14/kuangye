import test from 'node:test';
import assert from 'node:assert/strict';
import { gatheredDays, gatheredMonths } from '../src/game/journal.js';

const taskById = { 'read-s2': { title: '读满 14 天', unit: '' }, 'body-walk3': { title: '散步', unit: '次' }, 'cook-s1': { title: '番茄炒蛋' } };
const state = {
  home: {
    glimmerDays: ['2026-09-12', '2026-09-13', '2026-09-20', '2026-10-02'],
    reading: { books: [{ id: 'b1', title: '旷野', notes: [{ at: '2026-09-13', text: 'x' }] }] },
    inquiry: { pages: [{ id: 'p1', question: '为什么云会停？', notes: [{ at: '2026-10-02', text: 'y' }, { at: 'bad', text: 'z' }] }] },
  },
  active: [{ qid: 'read-s2', logs: [{ d: '2026-09-13' }, { d: '2026-10-02' }] }, { qid: 'body-walk3', logs: [{ d: '2026-09-13', v: 1 }, { d: '2026-09-13', v: 2 }] }],
  done: [{ qid: 'cook-s1', at: '2026-09-12', review: '老了点', logs: [] }],
  abandoned: [{ qid: 'gone', at: '2026-09-25' }],
};

test('攒下的日子合并所有记录来源，只列出现过的日期', () => {
  const before = JSON.stringify(state);
  const days = gatheredDays(state, taskById);
  assert.deepEqual(days.map(d => d.date), ['2026-10-02', '2026-09-20', '2026-09-13', '2026-09-12']);
  assert.equal(JSON.stringify(state), before);
  const d13 = days.find(d => d.date === '2026-09-13');
  assert.deepEqual(d13.entries.map(e => e.kind), ['day', 'units', 'reading']);
  assert.equal(d13.entries.find(e => e.kind === 'units').v, 3);
  assert.equal(days.find(d => d.date === '2026-09-12').done, true);
  assert.equal(days.find(d => d.date === '2026-09-12').entries[0].review, '老了点');
  // 只在微光里留下日期（例如放下的任务）也算攒下的一天，但不编造细节。
  assert.deepEqual(days.find(d => d.date === '2026-09-20').entries, []);
  assert.ok(!days.some(d => d.date === '2026-09-25'));
});

test('按月分组，月份倒序、月内正序', () => {
  const months = gatheredMonths(gatheredDays(state, taskById));
  assert.deepEqual(months.map(m => m.month), ['2026-10', '2026-09']);
  assert.deepEqual(months[1].days.map(d => d.date), ['2026-09-12', '2026-09-13', '2026-09-20']);
  assert.deepEqual(gatheredMonths(gatheredDays({ home: {}, active: [], done: [] }, {})), []);
});
