<script setup>
import { computed, ref } from 'vue';
import { state, acceptResidentVisit, deliverResidentVisit } from '../store.js';
import { RESIDENT_VISITS } from '../data/residents.js';
import { studioStatus } from '../game/studio.js';
import StudioWorkPreview from './StudioWorkPreview.vue';
const emit = defineEmits(['studio','journal','toast']);
const choices = computed(() => [...state.home.visits.map(v=>({id:v.id,...v.brief})), ...RESIDENT_VISITS.filter(d=>!state.home.visits.some(v=>v.id===d.id))]);
const selected = ref(choices.value[0]?.id || ''), error = ref(''), confirmed = ref(false);
const entry = computed(() => choices.value.find(v=>v.id===selected.value));
const visit = computed(() => state.home.visits.find(v=>v.id===selected.value));
const work = computed(() => state.home.studio.works.find(w=>w.id===visit.value?.workId));
const status = computed(() => work.value ? studioStatus(work.value,state) : '');
function take() {
  const result = acceptResidentVisit(entry.value.id);
  if (!result.ok) { error.value=result.why; return; }
  error.value=''; emit('studio',result.work.id);
}
function handIn() {
  const result = deliverResidentVisit(visit.value.id,confirmed.value);
  if (!result.ok) { error.value=result.why; return; }
  error.value=''; emit('toast','这次来往，留在街角了。');
}
</script>
<template>
  <section v-if="entry" class="resident-desk" :data-resident="entry.id" aria-label="街角来访">
    <div v-if="choices.length>1" class="visit-choices"><button v-for="item in choices" :key="item.id" :aria-pressed="selected===item.id" @click="selected=item.id; confirmed=false; error=''">{{ item.name }} · {{ item.title }}</button></div>
    <div class="visit-layout">
      <aside class="resident-intro">
        <svg class="resident-portrait" viewBox="0 0 200 230" aria-hidden="true"><path fill="#e6ebdb" d="M18 140C6 81 38 24 96 19s91 41 85 111c-4 53-31 74-77 75S28 190 18 140"/><path fill="#b3c49b" d="M29 188h145v11H29z"/><path fill="#d9caaa" d="M130 152h34v47h-34z"/><path fill="#77906e" d="M62 123q38-20 65 0l9 72H48z"/><path fill="#f1d6b6" d="M87 106h23v21q-12 11-23 0z"/><ellipse fill="#f1d6b6" cx="98" cy="83" rx="31" ry="36"/><path fill="#555e4c" d="M66 86q-12-43 31-46 42-1 35 49l-13-21q-27 13-49 9z"/><path fill="none" stroke="#616452" stroke-width="2.5" stroke-linecap="round" d="M81 88h4m22 0h4m-19 15q7 5 13-1"/><path fill="#f5e9d0" stroke="#bcae8f" d="M61 144l54-9 9 38-54 9z"/><path fill="none" stroke="#87977b" stroke-width="2" d="M76 153l23-4m-21 13l31-5"/><path fill="none" stroke="#f1d6b6" stroke-width="10" stroke-linecap="round" d="M56 145l12 23m61-24l-12 21"/><path fill="none" stroke="#9d896a" stroke-width="3" d="M137 154v-10q10-13 18 0v10"/></svg>
        <span class="eyebrow">街角的熟面孔</span><h3>{{ entry.name }}</h3><p>{{ entry.role }}</p><small v-if="entry.reviewStatus==='pending-review'">{{ visit ? '接取时保存的故事草稿' : '故事与委托 · 本地试用' }}</small>
        <p class="resident-pace">没有交回期限。<br />等你有空，再带着这一版回来。</p>
      </aside>
      <div class="visit-letter">
        <span class="eyebrow">{{ visit?.delivered ? '一次来往，已经留下' : visit ? '带着一个约定出门' : '一张留白很久的明信片' }}</span>
        <h3>{{ entry.title }}</h3><p v-for="paragraph in entry.story" :key="paragraph" class="resident-story">{{ paragraph }}</p>
        <template v-if="!visit?.delivered">
          <ol class="resident-steps"><li v-for="step in entry.steps" :key="step">{{ step }}</li></ol>
          <p class="resident-criterion"><strong>交回前，看看有没有做到</strong>{{ entry.criterion }}</p>
          <template v-if="!visit"><p class="visit-footnote">共用三个任务名额 · 没有期限<br />在画室保存成果。交回只留下街角变化，不另发光或 XP。</p><button class="primary-button" @click="take">接下委托，去画室开始</button></template>
          <template v-else-if="status!=='done'"><p class="visit-progress">{{ status==='rest' ? '这件作品先放着，已写下的都还在。' : '已经接下。去看看身边的那个地方，把成果带回来。' }}</p><button class="primary-button" @click="emit('studio',work.id)">{{ status==='rest' ? '回画室，接着做这一版' : '回画室，继续这件作品' }}</button><small class="visit-date">{{ visit.acceptedAt }} · 接下这次委托</small></template>
          <div v-else class="visit-handover"><h4>这一版已经收好，带回来了吗？</h4><StudioWorkPreview :work="work" compact /><button class="text-button" @click="emit('studio',work.id)">打开完整作品，检查这一版 ↗</button><label class="handover-check"><input v-model="confirmed" type="checkbox" /> 我确认这一版按约定留下了真实观察与成果。</label><button class="primary-button" :disabled="!confirmed" @click="handIn">把这一版交回书屋</button><p class="visit-footnote">留给自己的话不进入街角陈列。交回不会再结算奖励。</p></div>
        </template>
        <div v-else class="resident-return" aria-live="polite"><p class="resident-reply">{{ entry.reply }}</p><div class="resident-keepsake"><time>{{ visit.delivered.at }} · 交回书屋</time><h4>{{ visit.delivered.title }}</h4><p v-if="visit.delivered.excerpt">{{ visit.delivered.excerpt }}</p><span>{{ entry.change }}</span></div><div class="visit-actions"><button class="soft-button" @click="emit('studio',work.id)">打开窗边的作品 ↗</button><button class="text-button" @click="emit('journal')">在成长手记回望这次来往 ↗</button></div><p class="visit-footnote">交回时的标题与摘记留在这里；完整作品仍可在画室修订。</p></div>
        <p v-if="error" class="visit-error" role="alert">{{ error }}</p>
      </div>
    </div>
  </section>
  <section v-else class="resident-empty"><h3>街角来访还在整理。</h3><p>这里会收下与真实行动有关的故事。先按自己的节奏，做手里的事。</p></section>
</template>
<style scoped>
.resident-desk { margin:30px 0 38px; }
.visit-layout { display:grid; grid-template-columns:220px minmax(0,1fr); gap:42px; }
.resident-intro { text-align:center; }
.resident-portrait { width:180px; max-width:100%; display:block; margin:0 auto 16px; }
.resident-intro h3 { font:500 30px var(--serif); margin:12px 0; }
.resident-intro p { font-size:13px; color:var(--ink-2); line-height:1.8; }
.resident-intro small { display:block; font-size:10px; color:var(--ink-3); }
.resident-pace { border-top:1px solid var(--line); padding-top:20px; margin-top:24px; }
.visit-letter { padding:32px 38px; background:var(--card); border:1px solid var(--line-2); min-width:0; }
.visit-letter h3 { font:500 30px/1.5 var(--serif); margin:15px 0 24px; }
.resident-story,.resident-reply { font:400 16px/2 var(--serif); margin:14px 0; }
.resident-steps { padding:20px 0 20px 22px; margin:20px 0; border-block:1px solid var(--line); }
.resident-steps li { padding:6px 0 6px 7px; color:var(--ink-2); font-size:13px; line-height:1.9; }
.resident-criterion { font-size:13px; line-height:1.9; background:var(--moss-wash); padding:16px 20px; }
.resident-criterion strong { display:block; color:var(--primary); margin-bottom:6px; font-weight:500; }
.visit-footnote,.visit-date { color:var(--ink-3); font-size:11px; line-height:1.9; margin:20px 0; }
.visit-date { display:block; }
.visit-progress { color:var(--primary); font-size:14px; line-height:1.9; }
.visit-letter h4 { font:500 21px/1.6 var(--serif); margin:24px 0 15px; }
.handover-check { display:flex; align-items:start; gap:10px; font-size:13px; line-height:1.9; margin:22px 0; }
.handover-check input { margin-top:6px; accent-color:var(--primary); flex-shrink:0; }
.visit-handover > .text-button { margin-top:18px; }
.resident-keepsake { padding:24px; margin:25px 0; border:1px dashed var(--line-2); background:var(--paper); }
.resident-keepsake time { font-size:11px; color:var(--ink-3); }
.resident-keepsake h4 { margin:14px 0; overflow-wrap:anywhere; }
.resident-keepsake p { white-space:pre-wrap; overflow-wrap:anywhere; font-size:13px; line-height:1.9; }
.resident-keepsake span { display:block; margin-top:20px; color:var(--primary); font-size:12px; line-height:1.9; }
.visit-actions { display:flex; flex-wrap:wrap; gap:18px; align-items:center; }
.visit-error { color:var(--ember); font-size:13px; line-height:1.8; }
.visit-choices { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; }
.visit-choices button { padding:10px; border:1px solid var(--line); background:var(--card); }
.visit-choices button[aria-pressed=true] { color:var(--primary); background:var(--moss-wash); }
.resident-empty { margin:30px 0; }
@media(max-width:700px) { .visit-layout { grid-template-columns:1fr; gap:20px; } .resident-intro { display:grid; grid-template-columns:100px 1fr; text-align:left; align-content:center; column-gap:20px; } .resident-portrait { grid-row:1/6; width:100px; margin:0; } .resident-intro h3 { font-size:26px; margin:8px 0 0; } .resident-intro p { margin:4px 0; } .resident-intro .resident-pace { display:none; } .visit-letter { padding:24px 20px; } .visit-letter h3 { font-size:25px; } .resident-story,.resident-reply { font-size:15px; } .resident-keepsake { padding:18px; } }
</style>
