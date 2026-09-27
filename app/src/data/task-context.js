// Planning estimates for single-sitting tasks, never deadlines or completion rules.
const EXISTING_CONTEXT = {
  selfrec: {minutes:10,place:'inside'},
  'c2-thanks': {minutes:10,place:'either'},
  'c1-askhelp': {minutes:10,place:'either'},
  soloEat: {minutes:30,place:'either'},
  letter10y: {minutes:30,place:'inside'},
  'c2-letter': {minutes:30,place:'inside'},
  'cook-s1': {minutes:60,place:'inside'},
  'c0-call30': {minutes:60,place:'either'},
  'c1-handcraft': {minutes:60,place:'inside'},
};
export const PLACES = {inside:'在室内',outside:'去户外',either:'地点不限'};
export function taskContext(task) { return task.context || EXISTING_CONTEXT[task.id] || null; }
export function matchesContext(task, {minutes=0,place='all'} = {}) {
  if (!minutes && place === 'all') return true;
  const context = taskContext(task);
  if (!context || task.type !== 'once') return false;
  return (!minutes || context.minutes <= minutes) && (place === 'all' || context.place === 'either' || context.place === place);
}
