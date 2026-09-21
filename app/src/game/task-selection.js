import { TASKS, CATS } from "../data/tasks.js";

// Search broadens the suggestion scope, never eligibility or completion rules.
export function selectTasks(state, { cat = "all", scope = "today", query = "" } = {}) {
  const term = query.trim();
  const available = TASKS.filter(t =>
    (cat === "all" || t.cat === cat) &&
    (!term || t.title.includes(term)) &&
    (term || scope !== "today" ||
      (["E", "D"].includes(t.diff) && (!t.chain || t.stage === 1))) &&
    !state.active.some(a => a.qid === t.id) &&
    !state.done.some(d => d.qid === t.id && !t.repeatable)
  );
  if (scope === "all" || term) return available;
  const priority = t => (t.type === "once" ? 0 : 2) + (t.diff === "E" ? 0 : 1);
  const ranked = available.sort((a, b) => priority(a) - priority(b));
  return cat === "all"
    ? Object.keys(CATS).map(c => ranked.find(t => t.cat === c)).filter(Boolean)
    : ranked.slice(0, 6);
}
