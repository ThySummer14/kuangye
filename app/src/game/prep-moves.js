// 短时空态的准备动作选择：只读、按日期稳定轮换，资格不经过 store，也不产生任何记录。
import { PREP_MOVES } from '../data/prep-moves.js';
import { fieldGuide } from '../data/field-guides.js';
import { TASKS } from '../data/tasks.js';

const byId = Object.fromEntries(TASKS.map(t => [t.id, t]));

export function prepText(move) {
  const task = byId[move.from];
  if (!task) return '';
  const guide = fieldGuide(task);
  return (move.source === 'start' ? guide.startingPoints?.[0]?.[1] : guide.steps?.[0]) || guide.steps?.[0] || '';
}

export function prepMoves(state, { trail = '', minutes = 0 } = {}) {
  const taken = new Set([...(state.done || []), ...(state.active || [])].map(r => r.qid));
  return PREP_MOVES.filter(m => (!trail || m.trail === trail) && (!minutes || m.minutes <= minutes) &&
    byId[m.from] && (byId[m.from].repeatable || !taken.has(m.from)) && prepText(m))
    .map(m => ({ ...m, task: byId[m.from], text: prepText(m) }));
}

export function pickPrepMove(state, { trail = '', minutes = 0, day = '', offset = 0 } = {}) {
  const list = prepMoves(state, { trail, minutes });
  if (!list.length) return { move: null, count: 0 };
  const seed = [...(/^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  const turn = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  return { move: list[(seed + turn) % list.length], count: list.length };
}

// 写成自己的事时的预填：只带第一步与方向，标题和完成条件仍由用户写。
export function prepSuggestion(move) {
  return {
    cat: move.task.cat, label: `${move.minutes} 分钟的准备`, note: `取自「${move.task.title}」的出发手册。做完这一步不算完成原任务。`,
    step: move.text, titlePlaceholder: '用自己的话给这一步起个名字',
    conditionPlaceholder: '写清做到什么就算完成，例如：把找到的结果写在一张便签上。', stepPlaceholder: move.text,
  };
}
