import { normalizePersonalTasks, isPersonalId } from "./personal-tasks.js";
import { normalizeActionPlan } from "./action-plan.js";
import { TASKS } from "../data/tasks.js";
import { dateStr } from "../data/season.js";
import { normalizeHome } from "./home.js";
const TASK_IDS = new Set(TASKS.map((t) => t.id));
// Import must not silently discard unfamiliar history during whitelist cleaning.
export function parseImport(json) {
  const raw = JSON.parse(json);
  if (raw?.version != null && (!Number.isInteger(raw.version) || raw.version > 3))
    throw new Error('这份备份来自尚不支持的版本，请保留原文件并使用对应版本恢复');
  const source = raw?.state || raw;
  if (!source || !Array.isArray(source.active))
    throw new Error('数据格式不对：缺少 active 数组');
  const customTasks = normalizePersonalTasks(source.customTasks);
  const taskIds = new Set([...TASK_IDS, ...customTasks.map(t => t.id)]);
  const unknown = ['active','done','abandoned'].flatMap(key =>
    Array.isArray(source[key]) ? source[key].filter(record =>
      record && typeof record.qid === 'string' && !taskIds.has(record.qid)
    ) : []);
  if (unknown.length)
    throw new Error(`备份中有 ${unknown.length} 条当前任务库无法识别的记录。为保留这些经历，本次未导入；请保留原备份`);
  return normalizeState(raw);
}
export function normalizeState(raw) {
  const source = raw?.state || raw;
  if (!source || !Array.isArray(source.active)) return null;
  const customTasks = normalizePersonalTasks(source.customTasks);
  const taskIds = new Set([...TASK_IDS, ...customTasks.map(t => t.id)]);
  for (const key of ['active', 'done', 'abandoned']) {
    if (Array.isArray(source[key]) && source[key].some(r => isPersonalId(r?.qid) && !taskIds.has(r.qid)))
      throw new Error('自己的任务记录缺少原始内容，请保留原备份');
  }
  const cleanNumber = (v, fallback = 0) =>
    Number.isFinite(Number(v)) ? Number(v) : fallback;
  // 进行中、已完成、暂时放下共用一份日志清洗；已完成与放下的日志也保留数量（第三十九切片前完成记录会丢掉数量）。
  const cleanLogs = (logs) => Array.isArray(logs)
    ? logs.filter((l) => l && typeof l.d === "string").map((l) => ({
        d: l.d,
        ...(l.v !== undefined ? { v: Math.max(0, cleanNumber(l.v)) } : {}),
        ...(l.note ? { note: String(l.note).slice(0, 160) } : {}),
        ...(l.shield ? { shield: true } : {}),
      }))
    : [];
  return {
    customTasks,
    active: source.active
      .filter((a) => a && typeof a.qid === "string" && taskIds.has(a.qid))
      .map((a) => ({
        qid: a.qid,
        ...(normalizeActionPlan(a.plan) ? { plan: normalizeActionPlan(a.plan) } : {}),
        start: typeof a.start === "string" ? a.start : dateStr(new Date()),
        logs: cleanLogs(a.logs),
        shields: Math.max(0, Math.floor(cleanNumber(a.shields, 2))),
      })),
    done: Array.isArray(source.done)
      ? source.done
          .filter((d) => d && typeof d.qid === "string" && taskIds.has(d.qid))
          .map((d) => ({
            qid: d.qid,
            xp: isPersonalId(d.qid) ? 0 : Math.max(0, cleanNumber(d.xp)),
            at: typeof d.at === "string" ? d.at : dateStr(new Date()),
            review: typeof d.review === "string" ? d.review.slice(0, 160) : "",
            units: Array.isArray(d.units)
              ? d.units
                  .filter((u) => u && typeof u.metric === "string")
                  .map((u) => ({
                    metric: u.metric,
                    v: Math.max(0, cleanNumber(u.v)),
                  }))
              : [],
            logs: cleanLogs(d.logs),
            ...(d.streak !== undefined
              ? { streak: Math.max(0, Math.floor(cleanNumber(d.streak))) }
              : {}),
          }))
      : [],
    abandoned: Array.isArray(source.abandoned)
      ? source.abandoned
          .filter((a) => a && typeof a.qid === "string" && taskIds.has(a.qid))
          .map((a) => {
            const logs = cleanLogs(a.logs);
            return {
              qid: a.qid,
              reason: typeof a.reason === "string" ? a.reason.slice(0, 160) : "",
              at: typeof a.at === "string" ? a.at : dateStr(new Date()),
              ...(logs.length ? { logs } : {}),
            };
          })
      : [],
    home: normalizeHome(
      source.home,
      Array.isArray(source.done)
        ? source.done.filter((d) => d && taskIds.has(d.qid)).map(d => isPersonalId(d.qid) ? { ...d, xp: 0 } : d)
        : [],
    ),
    settings: {
      devDate:
        typeof source.settings?.devDate === "string"
          ? source.settings.devDate
          : "",
    },
  };
}
