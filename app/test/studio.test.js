import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDIO_DRAFTS } from '../src/data/studio-drafts.js';
import { STUDIO_THEMES, STUDIO_EXERCISES } from '../src/data/studio.js';
import { emptyStudio, normalizeStudio, studioFields, studioReady, studioStatus, addStudioWork, updateStudioWork, STUDIO_LIMITS } from '../src/game/studio.js';
import { normalizeState, parseImport } from '../src/game/save.js';
import { albumDocument } from '../src/services/studio-media.js';
const image = 'data:image/png;base64,aGVsbG8=';
const qid = i => `personal-example-${String(i).padStart(8,'0')}`;
const work = (i=1) => ({ id:`work-${i}`, title:'窗边', body:'  第一行\n第二行\n', note:'自己的话', images:[image], theme:'notice', exerciseId:'notice-light', taskIds:[qid(i)], created:'2026-10-05', updated:'2026-10-05' });
const source = (n=1) => ({ active:[], done: Array.from({length:n},(_,i)=>({qid:qid(i+1),xp:0,at:'2026-10-05'})), customTasks:Array.from({length:n},(_,i)=>({id:qid(i+1),title:'窗边',desc:'留下这一版',cat:'create'})), home:{studio:{works:Array.from({length:n},(_,i)=>work(i+1)),displayId:'work-1'}} });
test('three studio themes each have four concrete draft exercises; release content remains gated',()=>{
  assert.equal(STUDIO_THEMES.length,3);
  assert.equal(STUDIO_DRAFTS.length,12);
  assert.equal(new Set(STUDIO_DRAFTS.map(e=>e.id)).size,12);
  for (const theme of STUDIO_THEMES) assert.equal(STUDIO_DRAFTS.filter(e=>e.theme===theme.id).length,4);
  for (const e of STUDIO_DRAFTS) { assert.equal(e.reviewStatus,'pending-review'); assert.equal(e.steps.length,3); assert.ok(e.criterion && e.premise && e.minutes>0); }
  assert.deepEqual(STUDIO_EXERCISES,[]);
});
test('old saves get an empty studio and all historical works round-trip without trimming body',()=>{
  assert.deepEqual(normalizeState({active:[]}).home.studio,emptyStudio());
  const parsed=parseImport(JSON.stringify({version:3,state:source(45)}));
  assert.equal(parsed.home.studio.works.length,45);
  assert.equal(parsed.home.studio.works[0].body,'  第一行\n第二行\n');
  assert.deepEqual(parsed.home.studio.works[0].images,[image]);
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(parsed))).home.studio,parsed.home.studio);
});
test('invalid identities, missing task records, unsafe images and overlong fields reject the whole backup',()=>{
  const invalid = [
    s=>s.home.studio.works.push({...work(1)}),
    s=>s.home.studio.works[0].taskIds.push(qid(1)),
    s=>s.home.studio.works[0].taskIds=[qid(2)],
    s=>s.customTasks=[],
    s=>s.done=[],
    s=>s.home.studio.displayId='missing',
    s=>s.home.studio.works[0].images=['javascript:alert(1)'],
    s=>s.home.studio.works[0].body='x'.repeat(STUDIO_LIMITS.body+1),
    s=>s.home.studio.works[0].note='x'.repeat(STUDIO_LIMITS.note+1),
    s=>s.home.studio.works[0].images=Array(5).fill(image),
    s=>{s.home.studio.works[0].body='';s.home.studio.works[0].images=[];},
    s=>{s.active=s.done;s.done=[];},
  ];
  for(const mutate of invalid) {const s=source();mutate(s);assert.throws(()=>parseImport(JSON.stringify(s)));}
});
test('image budgets fail before mutation and never evict existing work',()=>{
  const studio=emptyStudio(),large='data:image/jpeg;base64,'+'a'.repeat(230000);
  for(let i=0;i<7;i++) assert.equal(addStudioWork(studio,{title:'一页',body:'',images:[large]},{id:`w${i}`,qid:qid(i),at:'2026-10-05'}).ok,true);
  const before=JSON.stringify(studio);
  assert.equal(addStudioWork(studio,{title:'第八页',images:[large]},{id:'w8',qid:qid(8),at:'2026-10-05'}).ok,false);
  assert.equal(updateStudioWork(studio,'w0',{title:'改一改',images:[large,large]},'2026-10-05').ok,false);
  assert.equal(JSON.stringify(studio),before);
  assert.throws(()=>normalizeStudio({works:Array.from({length:8},(_,i)=>({...work(i),images:[large]})),displayId:''}),/容量/);
  assert.throws(()=>studioFields({images:['data:image/png;base64,'+'a'.repeat(240000)]}));
});
test('readiness needs real content, status is derived from task history',()=>{
  const w=work(); assert.equal(studioReady({...w,body:' ',images:[]}),false);
  assert.equal(studioStatus(w,{active:[{qid:qid(1)}],done:[]}), 'working');
  assert.equal(studioStatus(w,{active:[],done:[]}), 'rest');
  assert.equal(studioStatus(w,{active:[],done:[{qid:qid(1)}]}), 'done');
});
test('standalone album escapes user text, preserves every image and defaults to excluding private notes',()=>{
  const w={...work(),title:'<script>我的作品</script>',body:'<&>\n完整正文',note:'仅自己知道的事',images:[image,image]};
  const html=albumDocument([w]);
  assert.ok(html.includes('&lt;script&gt;我的作品&lt;/script&gt;'));
  assert.ok(html.includes('&lt;&amp;&gt;\n完整正文'));
  assert.equal((html.match(/<img /g)||[]).length,2);
  assert.ok(!html.includes(w.note)); assert.ok(!html.includes('<script>'));
  assert.ok(albumDocument([w],{includeNote:true}).includes(w.note));
});
