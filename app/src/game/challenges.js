import { CHALLENGE_OPERATIONS, CHALLENGE_MEDALS } from '../data/challenges.js';
const fail = () => { throw new Error('挑战资料不完整或版本不受支持，请保留原备份'); };
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const id = v => typeof v === 'string' && /^[a-z][a-z0-9-]{0,60}$/.test(v);
// Frozen evidence is self-contained: old attempts survive future catalogue edits.
export function normalizeChallenge(raw) {
  if (raw === undefined) return undefined;
  if (!raw || raw.version !== 1 || raw.album !== 'challenger' || !id(raw.operationId) ||
      !text(raw.title, 60) || !text(raw.objective, 240) || !Number.isInteger(raw.baseRating) ||
      raw.baseRating < 4 || raw.baseRating > 6 || !Array.isArray(raw.terms) || raw.terms.length > 3) fail();
  const seen = new Set();
  const terms = raw.terms.map(t => {
    if (!t || !id(t.id) || seen.has(t.id) || !text(t.title, 40) || !text(t.condition, 240) ||
        !Number.isInteger(t.weight) || t.weight < 1 || t.weight > 3) fail();
    seen.add(t.id);
    return { id: t.id, title: t.title, condition: t.condition, weight: t.weight };
  });
  if (raw.baseRating + terms.reduce((n, t) => n + t.weight, 0) > 12) fail();
  return { version: 1, album: 'challenger', operationId: raw.operationId, title: raw.title,
    objective: raw.objective, baseRating: raw.baseRating, terms };
}
export const challengeRating = c => c.baseRating + c.terms.reduce((n, t) => n + t.weight, 0);
export const challengeCriteria = c => [{ id: 'objective', title: '基础目标', condition: c.objective }, ...c.terms];
export function challengeBrief(operationId, termIds = []) {
  const op = CHALLENGE_OPERATIONS.find(o => o.id === operationId);
  if (!op || !Array.isArray(termIds) || new Set(termIds).size !== termIds.length || termIds.some(id => !op.terms.some(t => t.id === id)))
    throw new Error('请选择有效的挑战与加码条件。');
  const challenge = normalizeChallenge({ version: 1, album: 'challenger', operationId, title: op.title,
    objective: op.objective, baseRating: op.rating, terms: op.terms.filter(t => termIds.includes(t.id)) });
  return { title: `${op.title} · 挑战 ${challengeRating(challenge)}`, desc: op.objective, cat: op.category, challenge };
}
export function challengeCompletionIssue(challenge, review, confirmed) {
  if (typeof review !== 'string' || !review.trim()) return '写一句你实际完成的结果，再留下这次突破。';
  const ids = challengeCriteria(challenge).map(t => t.id);
  if (!Array.isArray(confirmed) || confirmed.length !== ids.length || ids.some(id => !confirmed.includes(id)))
    return '逐项确认接取时的全部条件；还没做到的可以下次继续。';
  return '';
}
export function challengeRecords(state) {
  const tasks = new Map((state.customTasks || []).filter(t => t.challenge).map(t => [t.id, t]));
  const seen = new Set();
  return (state.done || []).flatMap(record => {
    const task = tasks.get(record.qid);
    if (!task || seen.has(task.id)) return [];
    seen.add(task.id);
    return [{ task, record, challenge: task.challenge, rating: challengeRating(task.challenge) }];
  });
}
export function challengeHonors(state) {
  const records = challengeRecords(state);
  const stats = { clears: records.length, best: Math.max(0, ...records.map(r => r.rating)),
    variety: new Set(records.map(r => r.challenge.operationId)).size };
  return { ...stats, medals: CHALLENGE_MEDALS.map(m => ({ ...m, progress: Math.min(m.target, stats[m.metric]), earned: stats[m.metric] >= m.target })) };
}
