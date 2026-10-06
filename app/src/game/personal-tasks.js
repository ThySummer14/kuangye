import { normalizeChallenge } from './challenges.js';
import { CATS, DIFF } from '../data/tasks.js';
export const isPersonalId = id => typeof id === 'string' && /^personal-[a-z0-9-]{8,80}$/.test(id);
export function personalTask(input) {
  const clean = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
  const title = clean(input?.title, 60), desc = clean(input?.desc, 240);
  if (!title || !desc || !Object.hasOwn(CATS, input?.cat)) return null;
  const challenge = normalizeChallenge(input.challenge);
  return { ...(challenge ? { challenge } : {}), id: input.id, title, desc, cat: input.cat, type: 'once', diff: 'E', tier: 'personal', personal: true };
}
export function normalizePersonalTasks(raw = []) {
  if (!Array.isArray(raw)) throw new Error('自己的任务资料格式不完整，请保留原备份');
  const seen = new Set();
  return raw.map(input => {
    const task = personalTask(input);
    if (!task || !isPersonalId(task.id) || seen.has(task.id))
      throw new Error('自己的任务资料缺失或重复，请保留原备份');
    seen.add(task.id);
    return task;
  });
}
export const taskXp = task => task?.personal ? 0 : DIFF[task?.diff]?.xp || 0;
