<script setup>
import { computed, ref, watch } from 'vue';
import { state } from '../store.js';
import { observationEntries } from '../game/observations.js';
import { observationWorkFor } from '../game/observation-craft.js';
import { studioStatus } from '../game/studio.js';
import { OBSERVATION_KINDS, observationKind } from '../data/observations.js';
import ObservationMark from './ObservationMark.vue';
const emit = defineEmits(['preview', 'work', 'observation']);
const query = ref(''), kind = ref('all'), shown = ref(3);
const kept = computed(() => observationEntries(state.home.observations));
const draft = computed(() => state.home.observations.entries.some(entry => entry.status === 'draft'));
const matches = computed(() => observationEntries(state.home.observations, { query: query.value, kind: kind.value }));
const rows = computed(() => matches.value.slice(0, shown.value).map(entry => {
  const link = observationWorkFor(state.home.observationWorks, entry.id);
  return { entry, work: state.home.studio.works.find(work => work.id === link?.workId) };
}));
const remaining = computed(() => matches.value.length - rows.value.length);
watch([query, kind], () => { shown.value = 3; });
const statusLabel = work => ({ working: '正在做', rest: '先放着', done: '已收好' }[studioStatus(work, state)]);
function choose(row) { if (row.work) emit('work', row.work.id); else emit('preview', row.entry); }
function clear() { query.value = ''; kind.value = 'all'; shown.value = 3; }
</script>
<template>
  <section class="studio-observations" aria-label="从观察开始创作">
    <div class="picker-heading"><div><span class="eyebrow">自己的发现，也是起点</span><h3>从收好的观察开始</h3><p>挑一页真实发现，为它做出新的一版。</p></div><button v-if="kept.length" class="text-button" @click="emit('observation')">去观察册看看 ↗</button></div>
    <template v-if="kept.length">
      <div class="picker-filters"><div><label for="studio-observation-query">找一段发现</label><input id="studio-observation-query" v-model="query" type="search" placeholder="地点、文字或日期" /></div><div><label for="studio-observation-kind">留意的东西</label><select id="studio-observation-kind" v-model="kind"><option value="all">全部发现</option><option v-for="item in OBSERVATION_KINDS" :key="item.id" :value="item.id">{{ item.name }}</option></select></div></div>
      <p class="picker-count" role="status">{{ matches.length }} 页{{ query.trim() || kind !== 'all' ? '匹配的发现' : '已收好的观察' }}<span v-if="rows.length"> · 正在看 {{ rows.length }} 页，按观察日期从近到远</span></p>
      <div class="picker-list"><button v-for="row in rows" :key="row.entry.id" class="picker-row" :data-studio-observation="row.entry.id" @click="choose(row)"><div class="picker-mark"><img v-if="row.entry.images.length" :src="row.entry.images[0]" alt="" /><ObservationMark v-else :kind="row.entry.kind" /></div><div class="picker-detail"><span><time>{{ row.entry.observedOn }}</time> · {{ observationKind(row.entry.kind)?.name }}</span><strong>{{ row.entry.place }}</strong><p>{{ row.entry.body }}</p><small>{{ row.work ? statusLabel(row.work)+' · 回到作品' : '预览这页素材' }} ↗</small></div></button></div>
      <div v-if="!rows.length" class="picker-empty"><p>没有找到这段发现。换个词，或翻回全部观察。</p><button class="text-button" @click="clear">清除筛选，看看全部</button></div>
      <button v-if="remaining" class="text-button picker-more" @click="shown+=6">再看 {{ Math.min(6,remaining) }} 页观察 <span>· 还有 {{ remaining }} 页</span></button>
      <p class="picker-help">先预览，再决定接不接。已经开始的观察，会回到原来的作品。</p>
    </template>
    <div v-else class="picker-empty"><p>{{ draft ? '手里那页还在写。收进观察册后，就能从这里开始创作。' : '观察册还空着。到近处看一眼，留下一处具体发现。' }}</p><button class="soft-button" @click="emit('observation')">去观察册，留一页发现 ↗</button></div>
  </section>
</template>
<style scoped>
.studio-observations { margin:28px 0; padding:26px; border:1px solid var(--line); background:var(--card); }
.picker-heading { display:flex; align-items:start; justify-content:space-between; gap:20px; }
.picker-heading h3 { font:500 25px/1.5 var(--serif); margin:8px 0; }
.picker-heading p,.picker-empty p { margin:0; font-size:13px; color:var(--ink-2); line-height:1.9; }
.picker-heading > button { flex-shrink:0; margin-top:8px; }
.picker-filters { display:grid; grid-template-columns:minmax(0,1fr) minmax(140px,200px); gap:18px; margin-top:24px; }
.picker-filters > div { min-width:0; }
.picker-filters label { display:block; font-size:11px; color:var(--ink-3); margin-bottom:7px; }
.picker-filters input,.picker-filters select { width:100%; box-sizing:border-box; min-width:0; padding:10px 12px; font:13px/1.6 var(--sans); color:var(--ink); border:1px solid var(--line-2); background:var(--paper); border-radius:var(--r-s); }
.picker-count,.picker-help { font-size:11px; line-height:1.9; color:var(--ink-3); margin:16px 0; }
.picker-list { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
.picker-row { display:flex; align-items:start; gap:14px; min-width:0; padding:16px 0; text-align:left; border:0; border-block:1px solid var(--line-2); color:var(--ink); background:transparent; cursor:pointer; font:inherit; }
.picker-row:hover { background:var(--moss-wash); }
.picker-mark { width:46px; height:62px; flex-shrink:0; background:var(--paper); display:grid; place-items:center; overflow:hidden; }
.picker-mark img { width:100%; height:100%; object-fit:contain; }
.picker-mark :deep(svg) { width:42px; height:54px; }
.picker-detail { min-width:0; }
.picker-detail > span { display:block; font-size:10px; color:var(--ink-3); line-height:1.9; }
.picker-detail strong { font:500 17px/1.6 var(--serif); margin:7px 0; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.picker-detail p { margin:0 0 12px; font-size:12px; line-height:1.8; color:var(--ink-2); overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.picker-detail small { font-size:11px; color:var(--primary); line-height:1.8; }
.picker-more { display:block; margin-top:18px; }
.picker-more span { color:var(--ink-3); font-size:11px; }
.picker-empty { margin-top:20px; }
.picker-empty button { margin-top:14px; }
.picker-help { margin-bottom:0; }
@media(max-width:900px) { .picker-list { grid-template-columns:1fr; gap:0; } .picker-row { border-bottom:0; } .picker-row:last-child { border-bottom:1px solid var(--line-2); } }
@media(max-width:500px) { .studio-observations { padding:22px 20px; } .picker-heading { flex-direction:column; gap:8px; } .picker-heading > button { margin:0; } .picker-filters { grid-template-columns:minmax(0,1fr) 115px; gap:12px; } .picker-count span { display:block; } .picker-detail strong { font-size:18px; } }
</style>
