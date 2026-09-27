// Optional v3 annotation. Planning never changes progress or rewards.
export const START_CUES = ['现在留一会儿', '下一次课间', '吃过饭以后', '今天收工以后', '周末有空时'];
export function normalizeActionPlan(value) {
  if (!value || typeof value !== 'object') return null;
  const clean = (text, limit) => typeof text === 'string' ? text.trim().slice(0, limit) : '';
  const cue = clean(value.cue, 60);
  const step = clean(value.step, 160);
  return cue || step ? { cue, step } : null;
}
