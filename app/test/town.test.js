import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyTown, placeYard, yardCheck, changeExterior, normalizeTown, repairLibrary, readingMilestones } from '../src/game/town.js';
import { normalizeState, parseImport } from '../src/game/save.js';
import { LIBRARY_STAGES } from '../src/data/town.js';

test('yard placement respects boundary, reserved path, rotation and collisions without consuming items',()=>{
  const town=emptyTown();
  assert.equal(placeYard(town,'bench',{x:0,z:0,rotation:0}).ok,true);
  assert.equal(yardCheck(town.yard,'tree',{x:1,z:0,rotation:0}).ok,false);
  assert.equal(placeYard(town,'bench',{x:1,z:0,rotation:90}).ok,true);
  assert.equal(town.yard.length,1);
  assert.equal(placeYard(town,'tree',{x:0,z:0,rotation:0}).ok,true);
  assert.equal(placeYard(town,'laundry',{x:1,z:3,rotation:0}).ok,false);
  assert.equal(placeYard(town,'laundry',{x:4,z:3,rotation:90}).ok,false);
  assert.equal(placeYard(town,'laundry',{x:4,z:3,rotation:0}).ok,true);
  assert.equal(placeYard(town,'lamp',{x:2,z:1,rotation:0}).ok,false);
  assert.equal(placeYard(town,'lamp',{x:4,z:1,rotation:45}).ok,false);
  assert.equal(placeYard(town,'unknown',{x:0,z:1,rotation:0}).ok,false);
});
test('library repair is sequential, tied to real reading milestones, and idempotent at each stage',()=>{
  const town=emptyTown(); const done=[];
  assert.equal(repairLibrary(town,done).ok,false);
  assert.equal(readingMilestones([{qid:'read-s3'}]),0);
  for(const stage of LIBRARY_STAGES){
    done.push({qid:stage.qid});
    assert.equal(repairLibrary(town,done).ok,true);
    assert.equal(repairLibrary(town,done).ok,false);
  }
  assert.equal(town.library,3);
  assert.equal(changeExterior(town,'roof','blue'),true);
  assert.equal(changeExterior(town,'roof','missing'),false);
  assert.equal(changeExterior(town,'__proto__','blue'),false);
});
test('v3 town backup preserves custom house and legal layout, old saves get defaults, unearned repairs are cleaned',()=>{
  const town=emptyTown();
  changeExterior(town,'porch','canopy');
  placeYard(town,'bench',{x:4,z:1,rotation:90});
  town.library=2;
  const done=LIBRARY_STAGES.slice(0,2).map(stage=>({qid:stage.qid,xp:10,at:'2026-09-28',review:'窗边读过的日子'}));
  const state=normalizeState({active:[],done,home:{town,lumens:25}});
  assert.deepEqual(parseImport(JSON.stringify({version:3,state})).home.town,town);
  assert.equal(state.home.lumens,25);
  assert.deepEqual(normalizeState({active:[]}).home.town,emptyTown());
  assert.equal(normalizeTown(town,[]).library,0);
  assert.equal(normalizeTown(town,[done[0]]).library,1);
  const malformed={...town,yard:[...town.yard,...town.yard,{id:'tree',x:2,z:1,rotation:0},{id:'tree',x:0,z:0,rotation:0}]};
  assert.equal(normalizeTown(malformed,done).yard.length,2);
});
