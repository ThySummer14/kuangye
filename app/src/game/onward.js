// 完成之后的「下一件」：只给一个建议，不自动接取。顺序：成长线下一阶段 → 手里还有的事 → 同方向的入门任务 → 同方向的准备动作。
import { TRAILS } from '../data/field-guides.js';
import { recommendMapTask } from './map-recommendation.js';
import { pickPrepMove } from './prep-moves.js';

const CAT_TRAIL = { body: 'outside', live: 'settle', create: 'make', courage: 'connect', mind: 'think' };
export function trailOfTask(task) {
  if (!task) return '';
  return TRAILS.find(t => t.tasks.includes(task.id))?.id || CAT_TRAIL[task.cat] || '';
}

export function onwardSuggestion(state, task, { day = '', next = null, nextOk = false } = {}) {
  const trail = trailOfTask(task);
  if (next && nextOk) return { kind: 'chain', task: next, trail };
  if (state.active.length) return { kind: 'hand', active: state.active[0], trail };
  const rec = recommendMapTask(state, { trail, day });
  if (rec.task) return { kind: 'same', task: rec.task, trail };
  const prep = pickPrepMove(state, { trail, day });
  if (prep.move) return { kind: 'prep', move: prep.move, trail };
  return { kind: 'rest', trail };
}
