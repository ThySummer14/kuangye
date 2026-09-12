import { TASKS } from "../data/tasks.js";
import { dateStr } from "../data/season.js";
import { normalizeHome } from "./home.js";
const TASK_IDS = new Set(TASKS.map((t) => t.id));
export function normalizeState(raw) {
  const source = raw?.state || raw;
  if (!source || !Array.isArray(source.active)) return null;
  const cleanNumber = (v, fallback = 0) =>
    Number.isFinite(Number(v)) ? Number(v) : fallback;
  return {
    active: source.active
      .filter((a) => a && typeof a.qid === "string" && TASK_IDS.has(a.qid))
      .map((a) => ({
        qid: a.qid,
        start: typeof a.start === "string" ? a.start : dateStr(new Date()),
        logs: Array.isArray(a.logs)
          ? a.logs
              .filter((l) => l && typeof l.d === "string")
              .map((l) => ({
                d: l.d,
                ...(l.v !== undefined
                  ? { v: Math.max(0, cleanNumber(l.v)) }
                  : {}),
                ...(l.note ? { note: String(l.note).slice(0, 160) } : {}),
                ...(l.shield ? { shield: true } : {}),
              }))
          : [],
        shields: Math.max(0, Math.floor(cleanNumber(a.shields, 2))),
      })),
    done: Array.isArray(source.done)
      ? source.done
          .filter((d) => d && typeof d.qid === "string" && TASK_IDS.has(d.qid))
          .map((d) => ({
            qid: d.qid,
            xp: Math.max(0, cleanNumber(d.xp)),
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
            logs: Array.isArray(d.logs)
              ? d.logs
                  .filter((l) => l && typeof l.d === "string")
                  .map((l) => ({
                    d: l.d,
                    ...(l.shield ? { shield: true } : {}),
                  }))
              : [],
            ...(d.streak !== undefined
              ? { streak: Math.max(0, Math.floor(cleanNumber(d.streak))) }
              : {}),
          }))
      : [],
    abandoned: Array.isArray(source.abandoned)
      ? source.abandoned
          .filter((a) => a && typeof a.qid === "string" && TASK_IDS.has(a.qid))
          .map((a) => ({
            qid: a.qid,
            reason: typeof a.reason === "string" ? a.reason.slice(0, 160) : "",
            at: typeof a.at === "string" ? a.at : dateStr(new Date()),
          }))
      : [],
    home: normalizeHome(
      source.home,
      Array.isArray(source.done)
        ? source.done.filter((d) => d && TASK_IDS.has(d.qid))
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
