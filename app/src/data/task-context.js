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
// 按天／累积任务的单次参考用时：标题已写明每次多长，或单次本来就很短。
// 只服务地图「这次能留多久」的起步推荐，显示为「每次约 N 分钟」；任务库的「一次完成」筛选不使用它。
const SESSION_CONTEXT = {
  'read-s1': {minutes:10,place:'inside'},
  'body-walk3': {minutes:20,place:'outside'},
  'c1-budget7': {minutes:5,place:'either'},
};
export function sessionContext(task) { return task && task.type !== 'once' ? SESSION_CONTEXT[task.id] || null : null; }
export function taskContext(task) { return task.context || EXISTING_CONTEXT[task.id] || null; }
export function matchesContext(task, {minutes=0,place='all'} = {}) {
  if (!minutes && place === 'all') return true;
  const context = taskContext(task);
  if (!context || task.type !== 'once') return false;
  return (!minutes || context.minutes <= minutes) && (place === 'all' || context.place === 'either' || context.place === place);
}
