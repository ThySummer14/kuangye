import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyTown, placeYard, yardCheck, changeExterior, normalizeTown, repairLibrary, readingMilestones, previewYardPlan, applyYardPlan } from '../src/game/town.js';
import { normalizeState, parseImport } from '../src/game/save.js';
import { LIBRARY_STAGES, YARD_PLANS, YARD_ITEMS } from '../src/data/town.js';

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

test('yard plans are legal, distinct, independent previews and preserve other town settings',()=>{
  const town=emptyTown();
  town.exterior.roof='blue'; town.library=2;
  placeYard(town,'tree',{x:1,z:3,rotation:0});
  const before=structuredClone(town);
  const signatures=new Set();
  for(const plan of YARD_PLANS){
    const preview=previewYardPlan(plan.id);
    assert.equal(preview.ok,true);
    assert.deepEqual(preview.yard.map(p=>p.id).sort(),YARD_ITEMS.map(p=>p.id).sort());
    for(const item of preview.yard) assert.equal(yardCheck(preview.yard,item.id,item).ok,true);
    assert.deepEqual(town,before);
    signatures.add(JSON.stringify(preview.yard));
    preview.yard[0].x=99;
    assert.notEqual(previewYardPlan(plan.id).yard[0].x,99);
    const adopted=structuredClone(town);
    assert.equal(applyYardPlan(adopted,plan.id).ok,true);
    assert.deepEqual(adopted.exterior,before.exterior);
    assert.equal(adopted.library,2);
    assert.deepEqual(normalizeTown(adopted,LIBRARY_STAGES.map(s=>({qid:s.qid}))),adopted);
    adopted.yard[0].x=99;
    assert.notEqual(plan.yard[0].x,99);
  }
  assert.equal(signatures.size,3);
  assert.equal(applyYardPlan(town,'missing').ok,false);
  assert.deepEqual(town,before);
});
test('invalid preset fails atomically rather than partially replacing a saved yard',()=>{
  const town=emptyTown(); placeYard(town,'tree',{x:0,z:0,rotation:0});
  const before=structuredClone(town);
  const plan=YARD_PLANS[0], original=plan.yard;
  try {
    plan.yard=[original[0],{id:'tree',x:2,z:0,rotation:0}];
    assert.equal(applyYardPlan(town,plan.id).ok,false);
    assert.deepEqual(town,before);
    plan.yard=[original[0],original[0]];
    assert.equal(applyYardPlan(town,plan.id).ok,false);
    assert.deepEqual(town,before);
  } finally {plan.yard=original;}
});
