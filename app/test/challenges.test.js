import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key),
};

const store = await import('../src/store.js');
const { CHALLENGE_OPERATIONS } = await import('../src/data/challenges.js');
const {
  challengeBrief,
  challengeHonors,
  challengeRating,
  normalizeChallenge,
} = await import('../src/game/challenges.js');

function reset() {
  memory.clear();
  store.resetData();
}

function confirmAll(task) {
  return ['objective', ...task.challenge.terms.map(term => term.id)];
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('六项挑战均有明确目标；加码权重、上限和无效条件经过校验', () => {
  assert.equal(CHALLENGE_OPERATIONS.length, 6);
  for (const operation of CHALLENGE_OPERATIONS) {
    assert.ok(operation.id && operation.title && operation.premise && operation.objective);
    assert.ok(operation.objective.trim().length > 0);
    assert.ok(operation.firstStep.trim().length > 0);
    assert.ok(operation.rating >= 4 && operation.rating <= 6);
    assert.deepEqual(operation.terms.map(term => term.weight).sort(), [1, 2, 3]);
    for (const term of operation.terms) {
      assert.ok(term.title.trim().length > 0);
      assert.ok(term.condition.trim().length > 0);
    }
    const brief = challengeBrief(operation.id, operation.terms.map(term => term.id));
    assert.equal(brief.challenge.operationId, operation.id);
    assert.equal(challengeRating(brief.challenge), operation.rating + 6);
    assert.ok(challengeRating(brief.challenge) <= 12);
  }

  const operation = CHALLENGE_OPERATIONS[0];
  assert.throws(() => challengeBrief(operation.id, ['missing-term']), /有效/);
  assert.throws(() => challengeBrief(operation.id, [operation.terms[0].id, operation.terms[0].id]), /有效/);
  const base = challengeBrief(operation.id, [operation.terms[0].id]).challenge;
  assert.throws(() => normalizeChallenge({ ...base, terms: [base.terms[0], { ...base.terms[0] }] }), /资料/);
});

test('挑战快照规范化后与往返副本独立，坏结构和未知版本会拒绝', () => {
  const original = challengeBrief('deep-work', ['offline', 'verify']).challenge;
  const raw = structuredClone(original);
  const clean = normalizeChallenge(raw);
  raw.objective = '改写后的目标';
  raw.terms[0].condition = '改写后的加码';
  assert.equal(clean.objective, original.objective);
  assert.equal(clean.terms[0].condition, original.terms[0].condition);
  assert.deepEqual(normalizeChallenge(structuredClone(clean)), clean);
  assert.throws(() => normalizeChallenge(null), /资料/);
  assert.throws(() => normalizeChallenge({ ...original, version: 2 }), /资料/);
  assert.throws(() => normalizeChallenge({ ...original, version: 99 }), /资料/);
  assert.throws(() => normalizeChallenge({ ...original, album: 'other' }), /资料/);
  assert.throws(() => normalizeChallenge({ ...original, terms: [{ ...original.terms[0], weight: 0 }] }), /资料/);
});

test('接取挑战共用三个名额；重复项目和无效条件拒绝时不改变存档', () => {
  reset();
  store.state.settings.devDate = '2026-10-06';
  const invalidBefore = JSON.stringify(store.state);
  assert.equal(store.acceptChallenge('deep-work', ['not-real']).ok, false);
  assert.equal(JSON.stringify(store.state), invalidBefore);

  const first = store.acceptChallenge('deep-work', ['offline']);
  assert.equal(first.ok, true);
  const duplicateBefore = JSON.stringify(store.state);
  assert.equal(store.acceptChallenge('deep-work', ['verify']).ok, false);
  assert.equal(JSON.stringify(store.state), duplicateBefore);
  assert.equal(store.acceptChallenge('hard-book', []).ok, true);
  assert.equal(store.acceptChallenge('prototype', []).ok, true);
  const fullBefore = JSON.stringify(store.state);
  assert.equal(store.acceptChallenge('speak', []).ok, false);
  assert.equal(JSON.stringify(store.state), fullBefore);

  assert.equal(store.state.active.length, 3);
  assert.equal(store.state.done.length, 0);
  assert.equal(store.totalXp.value, 0);
  assert.equal(store.state.home.lumens, 0);
  assert.deepEqual(store.state.home.glimmerDays, []);
});

test('挑战条件不能编辑；完成必须有回顾和全部逐项确认，且结算零奖励并只记一次微光', () => {
  reset();
  store.state.settings.devDate = '2026-10-06';
  const accepted = store.acceptChallenge('deep-work', ['offline']);
  const firstTask = accepted.task;
  const frozenSnapshot = structuredClone(firstTask.challenge);
  assert.equal(store.editPersonalTask(firstTask.id, {
    title: '降低难度', desc: '跳过专注要求', cat: 'live',
    challenge: { ...frozenSnapshot, objective: '改成容易的事' },
  }).ok, false);
  assert.deepEqual(structuredClone(firstTask.challenge), frozenSnapshot);

  const first = store.activeOf(firstTask.id);
  const all = confirmAll(firstTask);
  assert.equal(store.complete(first, '', all), false);
  assert.equal(store.complete(first, '完成了目标', ['objective']), false);
  assert.equal(store.complete(first, '完成了目标', new Set(all)), false);
  assert.equal(store.state.done.length, 0);
  assert.equal(store.complete(first, '完成了目标，也留下了结果', all), true);
  assert.equal(store.complete(first, '重复完成', all), false);
  assert.equal(store.state.done.length, 1);
  assert.equal(store.state.done[0].xp, 0);

  const secondResult = store.acceptChallenge('hard-book', []);
  assert.equal(secondResult.ok, true);
  const second = store.activeOf(secondResult.task.id);
  assert.equal(store.complete(second, '读完并写下自己的理解', confirmAll(secondResult.task)), true);
  assert.equal(store.complete(second, '再记一次', confirmAll(secondResult.task)), false);
  assert.equal(store.state.done.length, 2);
  assert.equal(store.totalXp.value, 0);
  assert.equal(store.state.home.lumens, 0);
  assert.deepEqual(store.state.home.glimmerDays, ['2026-10-06']);
});

test('放下挑战不扣款；重新接取生成新记录并保留旧条件与放下记录', () => {
  reset();
  store.state.settings.devDate = '2026-10-06';
  const firstResult = store.acceptChallenge('hard-book', ['sources']);
  const oldTask = firstResult.task;
  const oldSnapshot = structuredClone(oldTask.challenge);
  assert.equal(store.abandon(store.activeOf(oldTask.id), '先准备考试'), true);
  assert.equal(store.state.home.lumens, 0);
  assert.equal(store.state.home.glimmerDays.length, 0);
  assert.equal(store.totalXp.value, 0);

  const retry = store.acceptChallenge('hard-book', ['debate']);
  assert.equal(retry.ok, true);
  assert.notEqual(retry.task.id, oldTask.id);
  assert.deepEqual(jsonClone(store.taskById[oldTask.id].challenge), oldSnapshot);
  assert.deepEqual(store.state.abandoned.map(record => [record.qid, record.reason]), [[oldTask.id, '先准备考试']]);
  assert.equal(store.state.active[0].qid, retry.task.id);

  assert.equal(store.complete(store.activeOf(retry.task.id), '完成了新的条件', confirmAll(retry.task)), true);
  assert.equal(store.state.abandoned.length, 1);
  assert.equal(store.state.abandoned[0].qid, oldTask.id);
  assert.equal(store.state.customTasks.length, 2);
  assert.equal(store.state.done.length, 1);
  assert.equal(store.state.home.lumens, 0);
});

test('蚀刻章从锁定开始，按等级阈值和不同项目解锁，重复 done 不重复计数', () => {
  const state = { customTasks: [], done: [] };
  const initial = challengeHonors(state);
  assert.deepEqual([initial.clears, initial.best, initial.variety], [0, 0, 0]);
  assert.deepEqual(initial.medals.map(medal => [medal.progress, medal.earned]), [
    [0, false], [0, false], [0, false], [0, false],
  ]);

  const addRecord = (operationId, termIds, id) => {
    const brief = challengeBrief(operationId, termIds);
    state.customTasks.push({ id, challenge: structuredClone(brief.challenge) });
    state.done.push({ qid: id });
    return brief.challenge;
  };
  const rank8 = addRecord('deep-work', ['offline', 'verify'], 'personal-challenge-0001');
  assert.equal(challengeRating(rank8), 8);
  let honors = challengeHonors(state);
  assert.equal(honors.best, 8);
  assert.equal(honors.medals.find(medal => medal.id === 'resolve').earned, true);
  assert.equal(honors.medals.find(medal => medal.id === 'summit').earned, false);
  assert.equal(honors.medals.find(medal => medal.id === 'versatile').earned, false);

  const rank12 = addRecord('prototype', ['process', 'constraint', 'test'], 'personal-challenge-0002');
  assert.equal(challengeRating(rank12), 12);
  state.done.push({ qid: 'personal-challenge-0002' });
  addRecord('prototype', [], 'personal-challenge-0003');
  honors = challengeHonors(state);
  assert.equal(honors.clears, 3);
  assert.equal(honors.variety, 2);
  assert.equal(honors.medals.find(medal => medal.id === 'summit').earned, true);
  assert.equal(honors.medals.find(medal => medal.id === 'versatile').earned, false);

  addRecord('skill', ['log', 'variation', 'teach'], 'personal-challenge-0004');
  honors = challengeHonors(state);
  assert.equal(honors.clears, 4);
  assert.equal(honors.variety, 3);
  assert.equal(honors.medals.find(medal => medal.id === 'versatile').earned, true);
});

test('挑战快照可备份往返；旧档仍可导入，坏挑战会整份拒绝', () => {
  reset();
  store.state.settings.devDate = '2026-10-06';
  const accepted = store.acceptChallenge('prototype', ['process', 'test']);
  const expected = structuredClone(accepted.task.challenge);
  assert.equal(store.complete(store.activeOf(accepted.task.id), '完成了可用作品和修订', confirmAll(accepted.task)), true);
  const backup = store.exportData();

  reset();
  store.importData(backup);
  assert.deepEqual(jsonClone(store.taskById[accepted.task.id].challenge), expected);
  assert.equal(store.state.done.length, 1);
  assert.equal(store.state.done[0].qid, accepted.task.id);

  store.importData(JSON.stringify({ app: 'kuangye', version: 2, state: {
    active: [],
    done: [{ qid: 'climb', xp: 50, at: '2026-09-12', review: '旧经历' }],
    abandoned: [],
  } }));
  assert.equal(store.state.customTasks.length, 0);
  assert.equal(store.state.done[0].qid, 'climb');
  assert.equal(store.state.done[0].review, '旧经历');
  assert.equal('challenge' in store.taskById.climb, false);

  const before = JSON.stringify(store.state);
  const damaged = JSON.parse(backup);
  damaged.state.settings.devDate = '1999-01-01';
  damaged.state.customTasks[0].challenge.version = 2;
  assert.throws(() => store.importData(JSON.stringify(damaged)), /挑战资料/);
  assert.equal(JSON.stringify(store.state), before);
});
