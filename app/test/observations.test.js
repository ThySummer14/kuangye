import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyObservations, normalizeObservations, startObservation, updateObservation, keepObservation, observationEntries } from '../src/game/observations.js';
import { OBSERVATION_PROMPTS } from '../src/data/observations.js';
import { OBSERVATION_DRAFTS } from '../src/data/observation-drafts.js';
import { parseImport, normalizeState } from '../src/game/save.js';
import { gatheredDays } from '../src/game/journal.js';
const at='2026-10-05',image='data:image/jpeg;base64,'+'a'.repeat(230000);
const entry=(id='one')=>({id,place:'楼下长椅旁',body:'  叶缘有细小的齿。\n光落在另一侧。\n',hint:'留意叶缘',kind:'plant',observedOn:'2026-10-03',images:[],status:'kept',createdAt:at,keptAt:at});
test('observation prompts are concrete drafts, free writing is independent of their release gate',()=>{
  assert.equal(OBSERVATION_DRAFTS.length,3);assert.deepEqual(OBSERVATION_PROMPTS,[]);
  for(const prompt of OBSERVATION_DRAFTS){assert.equal(prompt.reviewStatus,'pending-review');assert.ok(prompt.title&&prompt.note&&prompt.kind);}
});
test('old saves default to an empty book and preserve every historical entry, image and body whitespace',()=>{
  assert.deepEqual(normalizeState({active:[]}).home.observations,emptyObservations());
  const entries=Array.from({length:45},(_,i)=>entry(`history-${i}`));entries[0].images=[image];
  const state=parseImport(JSON.stringify({version:3,state:{active:[],home:{observations:{entries}}}}));
  assert.equal(state.home.observations.entries.length,45);assert.equal(state.home.observations.entries[0].body,entries[0].body);
  assert.deepEqual(state.home.observations.entries[0].images,[image]);
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(state))).home.observations,state.home.observations);
});
test('one draft at a time, concrete content before collecting, idempotent collection and revisions preserve the original collection date',()=>{
  const book=emptyObservations();const result=startObservation(book,{},'one',at);
  assert.equal(startObservation(book,{place:'别处'},'two',at).entry.id,'one');assert.equal(book.entries.length,1);
  assert.equal(keepObservation(book,'one',at).ok,false);
  assert.equal(updateObservation(book,'one',{place:'楼下',body:'  一阵风。\n',kind:'street'}).ok,true);
  assert.equal(keepObservation(book,'one',at).ok,true);
  assert.equal(keepObservation(book,'one','2026-10-06').unchanged,true);assert.equal(result.entry.keptAt,at);
  const before=JSON.stringify(book);assert.equal(updateObservation(book,'one',{body:' '}).ok,false);assert.equal(JSON.stringify(book),before);
  assert.equal(updateObservation(book,'one',{body:'第一阵风后，又听见了脚步。'}).ok,true);assert.equal(result.entry.keptAt,at);
  assert.equal(startObservation(book,{},'two',at).ok,true);assert.equal(book.entries.length,2);
});
test('invalid dates, identities, content, images and multiple drafts reject the entire import',()=>{
  const mutations=[
    entries=>entries.push(entry()), entries=>entries[0].place='',entries=>entries[0].body=' ',
    entries=>entries[0].body='x'.repeat(3001),entries=>entries[0].hint='x'.repeat(501),
    entries=>entries[0].observedOn='2026-02-30',entries=>entries[0].keptAt='yesterday',
    entries=>entries[0].images=['https://example.com/photo.png'],entries=>entries[0].images=[image,image,image],
    entries=>entries.push({...entry('two'),status:'draft',keptAt:''},{...entry('three'),status:'draft',keptAt:''}),
  ];
  for(const mutate of mutations){const entries=[entry()];mutate(entries);assert.throws(()=>parseImport(JSON.stringify({active:[],home:{observations:{entries}}})));}
});
test('shared image budget refuses writes before mutation and rejects an overfull combined backup',()=>{
  const book=emptyObservations();startObservation(book,{},'one',at);
  const before=JSON.stringify(book);
  assert.equal(updateObservation(book,'one',{images:[image]},1610000).ok,false);assert.equal(JSON.stringify(book),before);
  const qid='personal-observation-image';
  const state={active:[{qid}],customTasks:[{id:qid,title:'作品',desc:'一版',cat:'create'}],home:{studio:{displayId:'',works:[{id:'work',title:'作品',body:'',images:[image,image,image,image],theme:'own',taskIds:[qid],created:at,updated:at}]},observations:{entries:[{...entry('one'),images:[image,image]},{...entry('two'),images:[image,image]}]}}};
  assert.throws(()=>parseImport(JSON.stringify(state)),/图片总量/);
  assert.throws(()=>normalizeObservations({entries:[{...entry(),images:[image,image,image]}]}));
});
test('search and date projections are read-only, collected discoveries never masquerade as task completions',()=>{
  const book={entries:[entry('one'),{...entry('two'),kind:'street',place:'校园',body:'远处的脚步',observedOn:'2026-10-04'},{...entry('draft'),status:'draft',keptAt:''}]};
  const state={active:[],done:[],abandoned:[],home:{observations:book}},before=JSON.stringify(state);
  assert.equal(observationEntries(book,{query:'  叶缘 ',kind:'plant'})[0].id,'one');
  assert.equal(observationEntries(book,{query:'叶缘',kind:'street'}).length,0);
  assert.deepEqual(observationEntries(book).map(e=>e.id),['two','one']);
  const days=gatheredDays(state,{});assert.equal(days.length,2);assert.ok(days.every(day=>!day.done&&day.entries[0].kind==='observation'));
  assert.equal(JSON.stringify(state),before);
});
