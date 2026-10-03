import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyInquiry, startInquiry, updateInquiry, noteInquiry, keepInquiry, reopenInquiry } from '../src/game/inquiry.js';
import { parseImport } from '../src/game/save.js';
import { emptyHome } from '../src/game/home.js';

test('inquiry preserves the original guess, sourced clues and next action through keeping and reopening', () => {
  const inquiry = emptyInquiry();
  assert.equal(startInquiry(inquiry, { question: '  这件衣服的标识是什么意思？ ', guess: '我以为都可以机洗', next: '查衣服内侧标识' }, 'one', '2026-10-03').ok, true);
  const before = structuredClone(inquiry);
  assert.equal(startInquiry(inquiry, { question: '第二个问题' }, 'two', '2026-10-03').ok, false);
  assert.equal(noteInquiry(inquiry, 'one', { text: '  ' }, '2026-10-03').ok, false);
  assert.deepEqual(inquiry, before);
  noteInquiry(inquiry, 'one', { text: '标识上有一只手', source: '衣服内侧标签' }, '2026-10-03');
  updateInquiry(inquiry, 'one', { answer: '这件衣服需要手洗', next: '按标识洗好这件衣服' });
  keepInquiry(inquiry, 'one', '2026-10-03');
  startInquiry(inquiry, { question: '第二个问题' }, 'two', '2026-10-03');
  assert.equal(reopenInquiry(inquiry, 'one').ok, false);
  keepInquiry(inquiry, 'two', '2026-10-03');
  assert.equal(reopenInquiry(inquiry, 'one').ok, true);
  const page = inquiry.pages.find(page => page.id === 'one');
  assert.equal(page.guess, '我以为都可以机洗');
  assert.equal(page.answer, '这件衣服需要手洗');
  assert.deepEqual(page.notes, [{ text: '标识上有一只手', source: '衣服内侧标签', at: '2026-10-03' }]);
});

test('v3 backups keep every inquiry page and clue beside old task and reading records without changing the economy', () => {
  const home = emptyHome();
  home.lumens = 15;
  startInquiry(home.inquiry, { question: '一个问题', guess: '之前的想法' }, 'one', '2026-10-03');
  for (let index = 0; index < 40; index++) noteInquiry(home.inquiry, 'one', { text: `线索 ${index}`, source: `来源 ${index}` }, '2026-10-03');
  home.reading.books.push({ id: 'book', title: '一本书', author: '', bookmark: '第 12 页', next: '继续下一节', qid: '', started: '2026-10-03', finished: '', status: 'reading', notes: [] });
  const imported = parseImport(JSON.stringify({ version: 3, state: { active: [], done: [{ qid: 'soloEat', at: '2026-10-03', xp: 10, review: '安静吃完了饭' }], home } }));
  assert.deepEqual(imported.home.inquiry, home.inquiry);
  assert.deepEqual(imported.home.reading, home.reading);
  assert.equal(imported.home.lumens, 15);
  assert.equal(imported.home.glimmerDays.length, 0);
  assert.equal(imported.done[0].review, '安静吃完了饭');
  assert.deepEqual(parseImport(JSON.stringify({ active: [], done: [] })).home.inquiry, emptyInquiry());
});

test('damaged inquiry history rejects the entire import rather than silently discarding a page or clue', () => {
  const state = { active: [], home: { inquiry: { pages: [{ id: 'one', question: '问题', status: 'kept', notes: [{ text: '' }] }] } } };
  assert.throws(() => parseImport(JSON.stringify(state)), /线索缺失/);
  state.home.inquiry.pages[0].notes = [];
  state.home.inquiry.pages.push(structuredClone(state.home.inquiry.pages[0]));
  assert.throws(() => parseImport(JSON.stringify(state)), /缺失或重复/);
});
