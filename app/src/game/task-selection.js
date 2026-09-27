import { matchesContext } from "../data/task-context.js";
import { TASKS, CATS, DIFF, TYPES, CHAINS } from "../data/tasks.js";

// Search broadens the suggestion scope, never eligibility or completion rules.
export function selectTasks(state, { cat = "all", scope = "today", query = "", minutes = 0, place = "all" } = {}, pool = TASKS) {
  const term = query.trim().toLowerCase();
  const available = pool.filter(t => {
    const searchable = [
      t.title,
      t.desc,
      CATS[t.cat]?.name,
      DIFF[t.diff]?.name,
      TYPES[t.type],
      t.chain ? CHAINS[t.chain]?.name : "",
    ].join(" ").toLowerCase();
    return (
      (cat === "all" || t.cat === cat) &&
      matchesContext(t, {minutes, place}) &&
      (!term || searchable.includes(term)) &&
      (term || scope !== "today" ||
        (["E", "D"].includes(t.diff) && (!t.chain || t.stage === 1))) &&
      !state.active.some(a => a.qid === t.id) &&
      !state.done.some(d => d.qid === t.id && !t.repeatable)
    );
  });
  if (scope === "all" || term || minutes || place !== "all") return available;
  const priority = t => (t.type === "once" ? 0 : 2) + (t.diff === "E" ? 0 : 1);
  const ranked = available.sort((a, b) => priority(a) - priority(b));
  return cat === "all"
    ? Object.keys(CATS).map(c => ranked.find(t => t.cat === c)).filter(Boolean)
    : ranked.slice(0, 6);
}
