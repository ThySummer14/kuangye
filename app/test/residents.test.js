import test from 'node:test';
import assert from 'node:assert/strict';
import { RESIDENT_DRAFTS } from '../src/data/resident-drafts.js';
import { RESIDENT_VISITS } from '../src/data/residents.js';
import { residentBrief, normalizeVisits, handInVisit, hasResidentDisplay } from '../src/game/residents.js';
import { parseImport, normalizeState } from '../src/game/save.js';
const draft=RESIDENT_DRAFTS[0], qid='personal-resident-fixture';
const visit=()=>({id:draft.id,workId:'postcard-1',acceptedAt:'2026-10-05',brief:residentBrief(draft),delivered:null});
const source=()=>({active:[{qid}],done:[],abandoned:[],customTasks:[{id:qid,title:draft.title,desc:draft.criterion,cat:'create'}],home:{visits:[visit()],studio:{displayId:'',works:[{id:'postcard-1',title:'楼下的一米',body:'三个细节和一句话。',note:'私人备注不交回',images:[],theme:'notice',exerciseId:'',taskIds:[qid],created:'2026-10-05',updated:'2026-10-05'}]}}});
test('resident story has one concrete commission, remains a draft, and is gated in release',()=>{
  assert.equal(RESIDENT_DRAFTS.length,1); assert.equal(draft.reviewStatus,'pending-review');
  assert.equal(draft.steps.length,3); assert.ok(draft.story.length && draft.reply && draft.change);
  assert.deepEqual(RESIDENT_VISITS,[]);
});
test('old saves default to no visits and accepted stories survive without the current catalogue',()=>{
  assert.deepEqual(normalizeState({active:[]}).home.visits,[]);
  const state=parseImport(JSON.stringify({version:3,state:source()}));
  assert.deepEqual(state.home.visits,[visit()]);
  const histories=Array.from({length:45},(_,i)=>({...visit(),id:`old-${i}`,workId:`work-${i}`}));
  assert.equal(normalizeVisits(histories).length,45);
});
test('invalid visits and broken work associations reject the entire backup',()=>{
  const mutations=[
    s=>s.home.visits.push(visit()),
    s=>s.home.visits.push({...visit(),id:'another'}),
    s=>s.home.visits[0].workId='missing',
    s=>s.home.visits[0].brief.story=['x'.repeat(801)],
    s=>s.home.visits[0].brief.criterion='',
    s=>s.home.visits[0].acceptedAt='2026-02-30',
    s=>s.home.visits[0].delivered={at:'2026-10-05',title:'提前交回',excerpt:''},
  ];
  for(const mutate of mutations){const s=source();mutate(s);assert.throws(()=>parseImport(JSON.stringify(s)));}
});
test('handover requires linked completed work and explicit confirmation, freezes a private-note-free snapshot and is idempotent',()=>{
  const state=parseImport(JSON.stringify(source()));
  assert.equal(handInVisit(state,draft.id,true,'2026-10-05').ok,false);
  assert.equal(hasResidentDisplay(state.home.visits),false);
  state.done.push({qid,xp:0,at:'2026-10-05'});state.active=[];
  assert.equal(handInVisit(state,draft.id,false,'2026-10-05').ok,false);
  assert.equal(handInVisit(state,draft.id,'yes','2026-10-05').ok,false);
  assert.equal(handInVisit(state,draft.id,true,'2026-10-05').ok,true);
  assert.equal(hasResidentDisplay(state.home.visits),true);
  const original=JSON.stringify(state.home.visits), economy=JSON.stringify(state.home.glimmerDays);
  state.home.studio.works[0].title='修订后';state.home.studio.works[0].body='x'.repeat(300);
  assert.equal(handInVisit(state,draft.id,true,'2026-10-06').unchanged,true);
  assert.equal(JSON.stringify(state.home.visits),original);assert.equal(JSON.stringify(state.home.glimmerDays),economy);
  assert.ok(!original.includes('私人备注'));
  assert.equal(parseImport(JSON.stringify({version:3,state})).home.visits[0].delivered.title,'楼下的一米');
});
