import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTick } from 'vue';
import { parseImport, normalizeState } from '../src/game/save.js';
import { observationSource } from '../src/game/observation-craft.js';
import { studioReady } from '../src/game/studio.js';
import { albumDocument } from '../src/services/studio-media.js';

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
const st = await import('../src/store.js');
const at = '2026-10-05', image = n => 'data:image/jpeg;base64,' + 'a'.repeat(n);
const fields = { place:'楼下长椅旁', body:'  叶缘是一排细齿。\n背面的颜色更浅。\n', kind:'plant', observedOn:'2026-10-03', images:[image(20)] };
function kept(images = fields.images) {
  const entry = st.openObservationPage({...fields, images}).entry;
  assert.equal(st.keepObservationPage(entry.id).ok, true);
  return entry;
}
const input = { title:'叶子的两面', criterion:'画出叶缘，再写下三处细节。' };
function reset() { st.resetData(); st.state.settings.devDate = at; }
const unchanged = action => { const before = JSON.stringify(st.state); assert.equal(action().ok, false); assert.equal(JSON.stringify(st.state), before); };

test('source is a frozen snapshot; blank artifacts cannot complete; resting and repeat entry preserve one link and original payouts', async () => {
  reset(); const entry = kept(), original = observationSource(entry);
  const result = st.openObservationWork(entry.id, input), work = result.work;
  assert.equal(result.ok, true); assert.deepEqual(JSON.parse(JSON.stringify(result.link.source)), original);
  assert.equal(studioReady(work), false); assert.equal(st.complete(st.activeOf(work.taskIds[0])), false);
  assert.equal(st.saveObservationPage(entry.id, {body:'新的发现。', images:[]}).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.link.source)), original);
  assert.equal(st.saveStudioWork(work.id, {title:work.title, body:'我画出了两面的差别。', images:[], note:'私人的想法'}).ok, true);
  assert.equal(entry.body, '新的发现。');
  assert.equal(st.abandon(st.activeOf(work.taskIds[0]), '明天再画'), true);
  const before = JSON.stringify(st.state);
  assert.equal(st.openObservationWork(entry.id).work.id, work.id); assert.equal(JSON.stringify(st.state), before);
  assert.equal(st.continueStudioWork(work.id).ok, true); assert.equal(work.taskIds.length, 2);
  assert.equal(st.state.home.observationWorks.length, 1);
  assert.equal(st.complete(st.activeOf(work.taskIds.at(-1))), true);
  assert.equal(st.totalXp.value, 0); assert.equal(st.state.home.lumens, 0); assert.equal(st.state.home.glimmerDays.length, 1);
  for(let i=0;i<3;i++) st.createPersonalTask({title:'另一件事', desc:'写好一版', cat:'create'});
  const full = JSON.stringify(st.state);
  assert.equal(st.openObservationWork(entry.id, input).existing, true); assert.equal(JSON.stringify(st.state), full);
  assert.equal(st.complete(st.activeOf(work.taskIds.at(-1))), false);
  const html = albumDocument([work]);
  assert.ok(html.includes(work.body)); assert.ok(!html.includes(original.body)); assert.ok(!html.includes(original.images[0])); assert.ok(!html.includes(work.note));
  await nextTick(); const backup = st.exportData(); st.importData(backup);
  assert.deepEqual(JSON.parse(JSON.stringify(st.state.home.observationWorks[0].source)), original);
  assert.equal(st.state.home.studio.works[0].taskIds.length, 2);
});

test('uncollected pages, missing observations, invalid completion conditions and three active tasks refuse before any mutation', () => {
  reset(); const draft = st.openObservationPage(fields).entry;
  unchanged(() => st.openObservationWork(draft.id, input));
  unchanged(() => st.openObservationWork('missing', input));
  st.keepObservationPage(draft.id);
  unchanged(() => st.openObservationWork(draft.id, {...input, criterion:''}));
  for(let i=0;i<3;i++) st.createPersonalTask({title:'手里的事', desc:'一版', cat:'create'});
  unchanged(() => st.openObservationWork(draft.id, input));
});

test('copying source photos can fail atomically and text-only entry succeeds without touching the original photos', () => {
  reset();
  for(let i=0;i<7;i++) { const w = st.openStudioWork({...input, images:[image(200000)]}).work; st.abandon(st.activeOf(w.taskIds[0])); }
  const entry = kept([image(230000)]);
  unchanged(() => st.openObservationWork(entry.id, input));
  const result = st.openObservationWork(entry.id, {...input, includeImages:false});
  assert.equal(result.ok, true); assert.deepEqual(result.link.source.images, []); assert.equal(entry.images.length, 1);
  assert.equal(result.work.images.length, 0); assert.equal(result.work.body, '');
});

test('source images count in every studio and observation write path and combined import; refused writes preserve all data', () => {
  reset();
  for(let i=0;i<5;i++) { const w = st.openStudioWork({...input, images:[image(220000)]}).work; st.abandon(st.activeOf(w.taskIds[0])); }
  const entry = kept([image(170000), image(170000)]), result = st.openObservationWork(entry.id, input);
  assert.equal(result.ok, true);
  unchanged(() => st.openStudioWork({...input, images:[image(230000)]}));
  unchanged(() => st.saveStudioWork(result.work.id, {title:input.title, images:[image(230000)]}));
  unchanged(() => st.openObservationPage({...fields, images:[image(230000)]}));
  unchanged(() => st.saveObservationPage(entry.id, {images:[image(200000), image(200000)]}));
  const bad = JSON.parse(st.exportData()); bad.state.home.studio.works[0].images = [image(230000)];
  const before = JSON.stringify(st.state); assert.throws(() => st.importData(JSON.stringify(bad)), /图片总量/); assert.equal(JSON.stringify(st.state), before);
});

function historical(n = 1) {
  const entries = Array.from({length:n}, (_,i) => ({id:`observation-${i}`, ...fields, status:'kept', hint:'', createdAt:at, keptAt:at}));
  const works = Array.from({length:n}, (_,i) => ({id:`work-${i}`, title:input.title, body:'完整成果', images:[], note:'', theme:'notice', exerciseId:'', taskIds:[`personal-craft-${String(i).padStart(6,'0')}`], created:at, updated:at}));
  return {active:[], done:works.map(w => ({qid:w.taskIds[0], xp:0, at})), customTasks:works.map(w => ({id:w.taskIds[0], title:w.title, desc:input.criterion, cat:'create'})), home:{observations:{entries}, studio:{works, displayId:''}, observationWorks:entries.map((e,i) => ({observationId:e.id, workId:works[i].id, startedAt:at, source:observationSource(e)}))}};
}
test('old v1/v2/v3 saves default to no links, and every historical association and source round-trips', () => {
  for(const version of [1,2,3]) assert.deepEqual(parseImport(JSON.stringify({version,state:{active:[]}})).home.observationWorks, []);
  const source = historical(45), value = parseImport(JSON.stringify({version:3,state:source}));
  assert.equal(value.home.observationWorks.length, 45); assert.equal(value.home.observationWorks[0].source.body, fields.body);
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(value))).home.observationWorks, value.home.observationWorks);
});
test('duplicate, missing, draft and malformed source associations reject the whole backup', () => {
  const mutations = [
    s => s.home.observationWorks.push({...s.home.observationWorks[0]}),
    s => s.home.observationWorks[0].observationId = 'missing',
    s => s.home.observationWorks[0].workId = 'missing',
    s => s.home.observations.entries[0].status = 'draft',
    s => s.home.observationWorks[0].startedAt = '2026-02-30',
    s => s.home.observationWorks[0].source.body = '',
    s => s.home.observationWorks[0].source.body = 'x'.repeat(3001),
    s => s.home.observationWorks[0].source.images = ['https://example.com/photo.png'],
    s => s.home.observationWorks[0].source.images = [image(20),image(20),image(20)],
    s => s.home.observationWorks[1].workId = s.home.observationWorks[0].workId,
    s => s.home.observationWorks[1].observationId = s.home.observationWorks[0].observationId,
  ];
  for(const mutate of mutations) { const s = historical(2); mutate(s); assert.throws(() => parseImport(JSON.stringify(s))); }
});
