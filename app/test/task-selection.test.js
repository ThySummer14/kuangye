import test from "node:test";
import assert from "node:assert/strict";
import { selectTasks } from "../src/game/task-selection.js";
const empty = { active: [], done: [] };
test("search finds advanced tasks without changing today's suggestions", () => {
  assert.ok(!selectTasks(empty).some(t => t.id === "run5k"));
  assert.deepEqual(selectTasks(empty, {query:"  连续跑完 5 公里不停歇  "}).map(t=>t.id), ["run5k"]);
  assert.deepEqual(selectTasks(empty,{query:"  "}),selectTasks(empty));
});
test("search covers descriptions, domains, types, and growth lines", () => {
  assert.ok(selectTasks(empty, { query: "生活技能" }).some(t => t.id === "live-repair"));
  assert.ok(selectTasks(empty, { query: "累积" }).some(t => t.id === "live-admin3"));
  assert.ok(selectTasks(empty, { query: "跑步" }).some(t => t.id === "run5k"));
  assert.ok(selectTasks(empty, { query: "公开链接" }).some(t => t.id === "shipweb"));
});
test("search respects chosen domain and existing task history", () => {
  assert.ok(!selectTasks(empty,{query:"5 公里",cat:"mind"}).some(t => t.cat !== "mind"));
  assert.ok(!selectTasks({active:[{qid:"run5k"}],done:[]},{query:"5 公里"}).some(t => t.id === "run5k"));
  assert.ok(!selectTasks({active:[],done:[{qid:"run5k"}]},{query:"5 公里"}).some(t => t.id === "run5k"));
});
