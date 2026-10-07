import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key),
};

const store = await import('../src/store.js');
const { CHALLENGE_MEDALS } = await import('../src/data/challenges.js');
const { LIFETIME_CHALLENGES, LIFETIME_MEDALS } = await import('../src/data/lifetime-challenges.js');
const {
  allChallengeMedals,
  challengeBrief,
  challengeCriteria,
  challengeHonors,
  challengeRating,
  isLifetimeChallenge,
  lifetimeBrief,
  lifetimeHonors,
  normalizeChallenge,
} = await import('../src/game/challenges.js');

function reset() {
  memory.clear();
  store.resetData();
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function confirmed(task) {
  return challengeCriteria(task.challenge).map(item => item.id);
}

function medalsOf(result) {
  if (Array.isArray(result)) return result;
  return result?.medals || [];
}

test('十四项人生挑战与专属章一一对应，v2 快照保留原目标和可选约定', () => {
  assert.equal(LIFETIME_CHALLENGES.length, 14);
  assert.equal(LIFETIME_MEDALS.length, 14);
  assert.equal(new Set(LIFETIME_CHALLENGES.map(challenge => challenge.id)).size, 14);
  assert.equal(new Set(LIFETIME_MEDALS.map(medal => medal.id)).size, 14);
  assert.deepEqual(LIFETIME_MEDALS.map(medal => medal.operationId), LIFETIME_CHALLENGES.map(challenge => challenge.id));
  assert.ok(LIFETIME_CHALLENGES.some(challenge => challenge.id === 'life-math'));

  for (const definition of LIFETIME_CHALLENGES) {
    assert.ok(definition.id && definition.title && definition.objective);
    const agreement = definition.id === 'life-math' ? '线性代数第一章' : '';
    const brief = lifetimeBrief(definition.id, agreement);
    const snapshot = brief.challenge;
    assert.equal(snapshot.version, 2);
    assert.equal(snapshot.album, 'lifetime');
    assert.equal(snapshot.operationId, definition.id);
    assert.equal(snapshot.title, definition.title);
    assert.equal(snapshot.objective, definition.objective);
    assert.equal(isLifetimeChallenge(snapshot), true);
    assert.equal(challengeRating(snapshot), null);
    assert.deepEqual(normalizeChallenge(jsonClone(snapshot)), snapshot);

    const criteria = challengeCriteria(snapshot);
    assert.ok(criteria.some(item => item.condition === snapshot.objective));
    assert.equal(criteria.length, snapshot.definition ? 2 : 1);
    if (snapshot.definition) assert.ok(criteria.some(item => item.condition === snapshot.definition));
  }
  assert.throws(() => lifetimeBrief('unknown-lifetime-project'));
  const nonMath = LIFETIME_CHALLENGES.find(challenge => challenge.id !== 'life-math');
  const withAgreement = lifetimeBrief(nonMath.id, '由我自己约定的完成边界').challenge;
  assert.equal(withAgreement.objective, nonMath.objective, 'an agreement must not replace the original goal');
  assert.ok(challengeCriteria(withAgreement).some(item => item.condition === '由我自己约定的完成边界'));

  const legacy = challengeBrief('deep-work', ['offline']).challenge;
  assert.equal(isLifetimeChallenge(legacy), false);
  assert.equal(challengeRating(legacy), 5);
  assert.equal(challengeCriteria(legacy).length, 2);
  assert.throws(() => normalizeChallenge({ ...lifetimeBrief('life-math', '范围').challenge, version: 99 }));
  assert.throws(() => normalizeChallenge({ ...lifetimeBrief('life-math', '范围').challenge, album: 'unknown' }));
  assert.throws(() => normalizeChallenge({ ...lifetimeBrief('life-math', '范围').challenge, objective: '' }));
  assert.throws(() => normalizeChallenge({ ...lifetimeBrief('life-math', '范围').challenge, operationId: 'life-unknown' }));
});

test('数学开始必须填写范围；人生挑战共用三名额且进行中同项目只能接取一次', () => {
  reset();
  store.state.settings.devDate = '2026-10-07';
  const math = LIFETIME_CHALLENGES.find(challenge => challenge.id === 'life-math');
  const others = LIFETIME_CHALLENGES.filter(challenge => challenge.id !== 'life-math');
  const emptyBefore = JSON.stringify(store.state);
  assert.equal(store.acceptLifetimeChallenge(math.id).ok, false);
  assert.equal(JSON.stringify(store.state), emptyBefore);
  assert.equal(store.acceptLifetimeChallenge('unknown-lifetime-project').ok, false);
  assert.equal(JSON.stringify(store.state), emptyBefore);

  const first = store.acceptLifetimeChallenge(others[0].id);
  assert.equal(first.ok, true);
  assert.equal(first.task.challenge.definition, undefined);
  const duplicateBefore = JSON.stringify(store.state);
  assert.equal(store.acceptLifetimeChallenge(others[0].id, '换一个条件').ok, false);
  assert.equal(JSON.stringify(store.state), duplicateBefore);

  const mathAccepted = store.acceptLifetimeChallenge(math.id, '本学期线性代数第一章');
  assert.equal(mathAccepted.ok, true);
  assert.equal(mathAccepted.task.challenge.definition, '本学期线性代数第一章');
  assert.equal(store.acceptLifetimeChallenge(others[1].id).ok, true);
  const fullBefore = JSON.stringify(store.state);
  assert.equal(store.acceptLifetimeChallenge(others[2].id).ok, false);
  assert.equal(JSON.stringify(store.state), fullBefore);
  assert.equal(store.state.active.length, 3);
  assert.equal(store.state.done.length, 0);
  assert.equal(store.totalXp.value, 0);
  assert.equal(store.state.home.lumens, 0);
  assert.deepEqual(store.state.home.glimmerDays, []);
});

test('完成 v2 挑战需要 review 和全部 criteria；只给对应 lifetime medal，v1 四章规则不变', () => {
  reset();
  store.state.settings.devDate = '2026-10-07';
  const math = LIFETIME_CHALLENGES.find(challenge => challenge.id === 'life-math');
  const accepted = store.acceptLifetimeChallenge(math.id, '微积分课程第三周内容');
  assert.equal(accepted.ok, true);
  const task = accepted.task;
  const snapshot = jsonClone(task.challenge);
  const lifetimeMedalsBefore = medalsOf(lifetimeHonors(store.state));
  assert.equal(lifetimeMedalsBefore.length, 14);
  assert.ok(lifetimeMedalsBefore.every(medal => !medal.earned));

  const criteriaIds = confirmed(task);
  assert.equal(criteriaIds.length, 2);
  assert.equal(store.complete(store.activeOf(task.id), '', criteriaIds), false);
  assert.equal(store.complete(store.activeOf(task.id), '完成记录', criteriaIds.slice(0, 1)), false);
  assert.equal(store.complete(store.activeOf(task.id), '按范围完成了这一段学习', criteriaIds), true);
  assert.equal(store.complete(store.activeOf(task.id), '重复结算', criteriaIds), false);
  assert.equal(store.state.done.length, 1);
  assert.equal(store.state.done[0].xp, 0);
  assert.equal(store.totalXp.value, 0);
  assert.equal(store.state.home.lumens, 0);
  assert.deepEqual(store.state.home.glimmerDays, ['2026-10-07']);

  const legacyMedals = challengeHonors(store.state).medals;
  assert.equal(legacyMedals.length, CHALLENGE_MEDALS.length);
  assert.ok(legacyMedals.every(medal => !medal.earned), 'v2 record must not earn a v1 medal');
  const lifetimeMedals = medalsOf(lifetimeHonors(store.state));
  assert.equal(lifetimeMedals.length, 14);
  assert.equal(lifetimeMedals.filter(medal => medal.earned).length, 1);

  const expectedDefinition = LIFETIME_MEDALS.find(medal => medal.operationId === math.id);
  assert.equal(lifetimeMedals.find(medal => medal.earned).id, expectedDefinition.id);

  const other = LIFETIME_CHALLENGES.find(challenge => challenge.id !== 'life-math');
  const second = store.acceptLifetimeChallenge(other.id);
  assert.equal(second.ok, true);
  assert.equal(store.complete(store.activeOf(second.task.id), '完成了自己的原始目标', confirmed(second.task)), true);
  assert.equal(store.state.done.length, 2);
  assert.ok(store.state.done.every(record => record.xp === 0));
  assert.equal(store.totalXp.value, 0);
  assert.equal(store.state.home.lumens, 0);
  assert.deepEqual(store.state.home.glimmerDays, ['2026-10-07']);
  const expectedSecond = LIFETIME_MEDALS.find(medal => medal.operationId === other.id);
  const lifetimeMedalsAfterSecond = medalsOf(lifetimeHonors(store.state));
  assert.deepEqual(lifetimeMedalsAfterSecond.filter(medal => medal.earned).map(medal => medal.id).sort(),
    [expectedDefinition.id, expectedSecond.id].sort());
  assert.equal(medalsOf(allChallengeMedals(store.state)).length, CHALLENGE_MEDALS.length + LIFETIME_MEDALS.length);
  assert.deepEqual(jsonClone(store.taskById[task.id].challenge), snapshot);
});

test('v1 与 v2 挑战可共同导出恢复，坏 v2 快照会原子拒绝整份导入', () => {
  reset();
  store.state.settings.devDate = '2026-10-07';
  const legacyBrief = challengeBrief('deep-work', ['offline']);
  const legacy = store.createPersonalTask(legacyBrief);
  assert.equal(legacy.ok, true);
  const lifetimeDefinition = LIFETIME_CHALLENGES.find(challenge => challenge.id !== 'life-math');
  const lifetime = store.acceptLifetimeChallenge(lifetimeDefinition.id);
  assert.equal(lifetime.ok, true);

  assert.equal(store.complete(store.activeOf(legacy.task.id), '完成旧版行动', confirmed(legacy.task)), true);
  assert.equal(store.complete(store.activeOf(lifetime.task.id), '完成个人目标', confirmed(lifetime.task)), true);
  const backup = store.exportData();
  reset();
  store.importData(backup);
  assert.deepEqual(jsonClone(store.taskById[legacy.task.id].challenge), jsonClone(legacy.task.challenge));
  assert.deepEqual(jsonClone(store.taskById[lifetime.task.id].challenge), jsonClone(lifetime.task.challenge));
  assert.equal(store.taskById[lifetime.task.id].challenge.version, 2);
  assert.equal(challengeHonors(store.state).clears, 1, 'legacy four medals should count only v1 records');
  assert.equal(medalsOf(lifetimeHonors(store.state)).filter(medal => medal.earned).length, 1);

  const before = JSON.stringify(store.state);
  const damaged = JSON.parse(backup);
  damaged.state.settings.devDate = '1999-01-01';
  const v2Task = damaged.state.customTasks.find(item => item.challenge?.album === 'lifetime');
  v2Task.challenge.version = 3;
  assert.throws(() => store.importData(JSON.stringify(damaged)));
  assert.equal(JSON.stringify(store.state), before);

  const unknown = JSON.parse(backup);
  unknown.state.settings.devDate = '1999-01-01';
  unknown.state.customTasks.find(item => item.challenge?.album === 'lifetime').challenge.operationId = 'life-unknown';
  assert.throws(() => store.importData(JSON.stringify(unknown)));
  assert.equal(JSON.stringify(store.state), before);
});
