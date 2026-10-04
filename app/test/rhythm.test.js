import test from "node:test";
import assert from "node:assert/strict";
import { recordedDates, dayCount, bestRun, currentRun, rhythmStrip, rhythmSummary, canBackfill } from "../src/game/rhythm.js";

const logs = ["2026-09-15", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-22", "2026-09-23", "2026-09-27"].map(d => ({ d }));

test("按天进度只数不同日期，空档不清零", () => {
  assert.equal(dayCount(logs), 7);
  assert.equal(dayCount([...logs, { d: "2026-09-27", v: 2 }, { d: "bad" }, null, { shield: true }]), 7);
  assert.equal(dayCount(logs.slice(0, 3)), 3);
  // 间隔很久回来，进度保持不变；再记一天只会增加。
  assert.equal(rhythmSummary(logs, "2026-10-04", 14).days, 7);
  assert.equal(rhythmSummary([...logs, { d: "2026-10-04" }], "2026-10-04", 14).days, 8);
  assert.deepEqual(recordedDates([{ d: "2026-09-02" }, { d: "2026-09-01" }]), ["2026-09-01", "2026-09-02"]);
});

test("一口气只是记录：最长段与当前段", () => {
  assert.equal(bestRun(logs), 3);
  assert.equal(bestRun([]), 0);
  assert.equal(currentRun(logs, "2026-09-27"), 1);
  assert.equal(currentRun(logs, "2026-09-28"), 1);
  assert.equal(currentRun(logs, "2026-09-29"), 0);
  assert.equal(currentRun(logs, "2026-09-19"), 3);
  // 跨月相邻也算一段
  assert.equal(bestRun([{ d: "2026-09-30" }, { d: "2026-10-01" }]), 2);
});

test("节奏条按日排列，区分接取前、记录与今天", () => {
  const strip = rhythmStrip(logs, "2026-09-28", "2026-09-17", 14);
  assert.equal(strip.length, 14);
  assert.equal(strip.at(-1).d, "2026-09-28");
  assert.equal(strip.at(-1).today, true);
  assert.equal(strip[0].d, "2026-09-15");
  assert.equal(strip[0].before, true);
  assert.equal(strip.filter(c => c.on).length, 7);
  const s = rhythmSummary(logs, "2026-10-04", 14);
  assert.deepEqual({ left: s.left, last: s.last, since: s.since, best: s.best }, { left: 7, last: "2026-09-27", since: 7, best: 3 });
  assert.equal(rhythmSummary([], "2026-10-04", 3).since, -1);
});

test("补记只针对接取之后、还没记的昨天", () => {
  assert.equal(canBackfill({ start: "2026-10-03", logs: [] }, "2026-10-04"), true);
  assert.equal(canBackfill({ start: "2026-10-04", logs: [] }, "2026-10-04"), false);
  assert.equal(canBackfill({ start: "2026-10-01", logs: [{ d: "2026-10-03" }] }, "2026-10-04"), false);
  assert.equal(canBackfill(null, "2026-10-04"), false);
});
