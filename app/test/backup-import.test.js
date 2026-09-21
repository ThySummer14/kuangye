import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport } from '../src/game/save.js';
import { TASKS } from '../src/data/tasks.js';
test('legacy and v3 backups share import cleaning without losing known history',()=>{
 const state={active:[],done:[{qid:TASKS[0].id,xp:12,at:'2026-09-20',review:'保留回顾'}],abandoned:[]};
 for(const raw of [state,...[1,2,3].map(version=>({version,state}))]){
  const result=parseImport(JSON.stringify(raw));assert.equal(result.done.length,1);assert.equal(result.done[0].review,'保留回顾');
 }
});
test('import refuses unknown task history instead of silently deleting it',()=>{
 for(const key of ['active','done','abandoned']){
  const state={active:[],done:[],abandoned:[]};state[key]=[{qid:'future-task',review:'不可丢失'}];
  const original=JSON.stringify(state);assert.throws(()=>parseImport(original),/未导入/);assert.equal(JSON.stringify(state),original);
 }
});
test('future backup schema cannot overwrite current data through import',()=>{
 assert.throws(()=>parseImport(JSON.stringify({version:4,state:{active:[]}})),/尚不支持/);
 assert.throws(()=>parseImport('{}'),/active/);
});
