import { TASKS } from '../data/tasks.js';
import { TRAILS } from '../data/field-guides.js';
import { TRAIL_NOTEBOOKS } from '../data/trail-notebooks.js';
import { selectTasks } from './task-selection.js';

const directions = Object.fromEntries(TRAILS.map(trail => [trail.id, new Set([
  ...trail.tasks,
  ...(TRAIL_NOTEBOOKS[trail.id]?.situations.flatMap(s => s.tasks) || []),
])]));

// A daily starting point, not an assignment. Selection is read-only and keeps
// canonical task objects, so acceptance and chain eligibility stay in store.
export function recommendMapTask(state, { trail = '', minutes = 0, day = '', offset = 0 } = {}, pool = TASKS) {
  if (state.active.length || (trail && !directions[trail])) return { task: null, count: 0 };
  const candidates = selectTasks(state, { scope: 'all', minutes }, pool).filter(task =>
    ['E', 'D'].includes(task.diff) && (!task.chain || task.stage === 1) &&
    (!trail || directions[trail].has(task.id))
  );
  if (!candidates.length) return { task: null, count: 0 };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
  const seed = [...date].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 0);
  const turn = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  return { task: candidates[(seed % candidates.length + turn % candidates.length) % candidates.length], count: candidates.length };
}
