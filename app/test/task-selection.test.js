import test from "node:test";
import assert from "node:assert/strict";
import { selectTasks } from "../src/game/task-selection.js";
const empty = { active: [], done: [] };
test("search finds advanced tasks without changing today's suggestions", () => {
  assert.ok(!selectTasks(empty).some(t => t.id === "run5k"));
  assert.deepEqual(selectTasks(empty, {query:"  连续跑完 5 公里不停歇  "}).map(t=>t.id), ["run5k"]);
  assert.deepEqual(selectTasks(empty,{query:"  "}),selectTasks(empty));
});
test("search respects chosen domain and existing task history", () => {
  assert.deepEqual(selectTasks(empty,{query:"5 公里",cat:"mind"}),[]);
  assert.deepEqual(selectTasks({active:[{qid:"run5k"}],done:[]},{query:"5 公里"}),[]);
  assert.deepEqual(selectTasks({active:[],done:[{qid:"run5k"}]},{query:"5 公里"}),[]);
});
