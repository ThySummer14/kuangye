<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import { state, openObservationPage } from '../store.js';
import { observationEntries } from '../game/observations.js';
import { OBSERVATION_PROMPTS, OBSERVATION_KINDS, observationKind } from '../data/observations.js';
import ObservationEditor from './ObservationEditor.vue';
import ObservationMark from './ObservationMark.vue';
const props=defineProps({focusEntry:String});
const emit=defineEmits(['toast','journal','outside']);
const selected=ref(props.focusEntry||''),editing=ref(false),query=ref(''),kind=ref('all'),error=ref(''),heading=ref(null);
const book=computed(()=>state.home.observations),entry=computed(()=>book.value.entries.find(entry=>entry.id===selected.value));
const draft=computed(()=>book.value.entries.find(entry=>entry.status==='draft'));
const kept=computed(()=>observationEntries(book.value));
const visible=computed(()=>observationEntries(book.value,{query:query.value,kind:kind.value}));
watch(()=>props.focusEntry,id=>{if(id)open(id);},{immediate:true});
async function open(id) {selected.value=id;editing.value=false;error.value='';await nextTick();heading.value?.focus({preventScroll:true});heading.value?.scrollIntoView({block:'start'});}
function begin(prompt) {
  const result=openObservationPage(prompt?{kind:prompt.kind,hint:prompt.note}:{});
  if(!result.ok){error.value=result.why;return;}
  open(result.entry.id);
}
function collected() {editing.value=false;emit('toast','这次停下来看见的，收好了。');}
</script>
<template>
  <section class="observation-book" :class="{'has-entry':!!entry}" aria-label="院子里的观察册">
    <div class="observation-book-heading"><div><span class="eyebrow">去近处，带回一个发现</span><h3><span>把看见的，</span><span>留成一页。</span></h3><p>地点、日子、一个具体细节。没有必须集齐的东西，也不需要认识所有名字。</p></div><div class="observation-tally"><strong>{{ kept.length }}</strong><span>页真实发现</span></div></div>
    <div class="observation-book-layout">
      <aside class="observation-index" aria-label="观察页索引">
        <button class="primary-button observation-start" @click="begin()">{{ draft?'接着写手里这一页':'打开一张观察页 ＋' }}</button>
        <button v-if="draft" class="observation-draft" :data-observation="draft.id" @click="open(draft.id)"><span>正在写 · 草稿还在</span><strong>{{ draft.place || '还没写下地点' }}</strong><small>{{ draft.observedOn }}</small></button>
        <div v-if="kept.length" class="observation-filters"><label for="observation-query">找一段自己的发现</label><input id="observation-query" v-model="query" type="search" placeholder="地点、文字或日期" /><label for="observation-filter">按留意的东西翻页</label><select id="observation-filter" v-model="kind"><option value="all">全部发现</option><option v-for="item in OBSERVATION_KINDS" :key="item.id" :value="item.id">{{ item.name }}</option></select></div>
        <div class="observation-records"><button v-for="item in visible" :key="item.id" :data-observation="item.id" :aria-pressed="selected===item.id" @click="open(item.id)"><time>{{ item.observedOn }}</time><strong>{{ item.place }}</strong><span>{{ observationKind(item.kind)?.name }}</span><p>{{ item.body }}</p></button></div>
        <p v-if="kept.length && !visible.length" class="observation-index-note">这一页里没有找到匹配的发现。换个词，或翻回全部。</p><p v-else-if="!kept.length" class="observation-index-note">册子还空着。出门走一小段，或从窗边看一眼，再回来写。</p>
      </aside>
      <div class="observation-main">
        <template v-if="entry"><div class="observation-page-tools"><button class="text-button" @click="selected=''; editing=false">← 回到观察册</button><span>{{ entry.status==='draft'?'正在写的一页':'已收进册子' }}</span></div><article class="observation-page" :data-observation-page="entry.id"><h4 ref="heading" tabindex="-1">{{ entry.place || '这次，在哪里停下来看了看？' }}</h4>
          <ObservationEditor v-if="entry.status==='draft'||editing" :key="entry.id" :entry="entry" @kept="collected" @saved="emit('toast','这一页，保存好了。')" />
          <template v-else><div class="observation-page-meta"><time>{{ entry.observedOn }}</time><span>{{ observationKind(entry.kind)?.name }}</span></div><div v-if="entry.images.length" class="observation-photos"><img v-for="(src,i) in entry.images" :key="i" :src="src" :alt="entry.place+' · 第 '+(i+1)+' 张观察图片'" /></div><div v-else class="observation-page-mark"><ObservationMark :kind="entry.kind" /></div><p class="observation-finding">{{ entry.body }}</p><footer>{{ entry.keptAt }} · 收进观察册</footer></template>
        </article><div v-if="entry.status==='kept'" class="observation-page-actions"><button class="soft-button" @click="editing=!editing">{{ editing?'看收好的记录':'再补一点发现' }}</button><button class="text-button" @click="emit('journal')">去成长手记回望 ↗</button></div></template>
        <template v-else><div class="observation-empty"><div class="observation-empty-mark"><ObservationMark /></div><span class="eyebrow">一个很近的地方，也值得认真看</span><h4>{{ kept.length?'那些停下来的时刻，都在这里。':'不必远行，先从门口开始。' }}</h4><p>不用先拍到一张好照片。记下自己真正看见的一个细节，就能留下这一页。</p><button class="soft-button" @click="begin()">{{ draft?'回到正在写的那一页':'开始自己的观察' }}</button></div>
          <div v-if="OBSERVATION_PROMPTS.length" class="observation-prompts"><span class="eyebrow">也可以从一个小起点出门 · 本地试用</span><button v-for="prompt in OBSERVATION_PROMPTS" :key="prompt.id" :aria-label="prompt.title" :data-observation-prompt="prompt.id" @click="begin(prompt)"><ObservationMark :kind="prompt.kind" /><div><strong>{{ prompt.title }}</strong><p>{{ prompt.note }}</p></div><span aria-hidden="true">↗</span></button></div>
        </template><p v-if="error" class="observation-error" role="alert">{{ error }}</p>
      </div>
    </div>
    <footer class="observation-book-footer"><p>观察页与图片随成长手记的整份备份保存。记一页不会自动完成任务；已有出门的事，仍回岩壁按自己的条件记录。</p><button class="text-button" @click="emit('outside')">去岩壁，找一件出门的事 ↗</button></footer>
  </section>
</template>
<style scoped>
.observation-book { margin:30px 0; }
.observation-book-heading { display:flex; align-items:center; justify-content:space-between; gap:24px; padding-bottom:25px; }
.observation-book-heading h3 { font:500 30px/1.5 var(--serif); margin:12px 0; }
@media(max-width:760px) { .observation-book-heading h3 span { display:block; } }
.observation-book-heading p { font-size:13px; line-height:1.9; color:var(--ink-2); max-width:600px; }
.observation-tally { border-left:1px solid var(--line); padding:0 20px; display:grid; gap:6px; flex-shrink:0; }
.observation-tally strong { font:500 40px var(--serif); color:var(--primary); }
.observation-tally span { font-size:11px; color:var(--ink-3); }
.observation-book-layout { display:grid; grid-template-columns:260px minmax(0,1fr); gap:32px; }
.observation-index { border-top:1px solid var(--line-2); padding-top:22px; }
.observation-start { width:100%; }
.observation-draft { display:grid; width:100%; padding:20px; margin-top:18px; text-align:left; gap:9px; background:var(--moss-wash); border:1px dashed var(--line-2); color:var(--ink); }
.observation-draft span,.observation-draft small { color:var(--ink-3); font-size:11px; }
.observation-draft strong { font:500 18px/1.6 var(--serif); overflow-wrap:anywhere; }
.observation-filters { display:grid; gap:8px; margin:25px 0 15px; }
.observation-filters label { font-size:11px; color:var(--ink-3); margin-top:6px; }
.observation-filters input,.observation-filters select { padding:10px; width:100%; box-sizing:border-box; min-width:0; border:1px solid var(--line); border-radius:4px; color:var(--ink); background:var(--card); font:12px var(--sans); }
.observation-records button { display:block; width:100%; border:0; border-bottom:1px solid var(--line); background:transparent; color:var(--ink); text-align:left; padding:20px 10px; }
.observation-records button[aria-pressed=true] { background:var(--moss-wash); border-left:3px solid var(--primary); }
.observation-records time,.observation-records span { font-size:10px; color:var(--ink-3); }
.observation-records strong { display:block; font:500 19px/1.6 var(--serif); margin:8px 0 4px; overflow-wrap:anywhere; }
.observation-records p { font-size:12px; color:var(--ink-2); line-height:1.8; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin:10px 0 0; overflow-wrap:anywhere; }
.observation-index-note { font-size:12px; line-height:1.9; color:var(--ink-3); padding:14px 5px; }
.observation-main { min-width:0; }
.observation-page-tools { display:flex; align-items:center; justify-content:space-between; gap:15px; margin-bottom:16px; }
.observation-page-tools span { font-size:11px; color:var(--ink-3); }
.observation-page { padding:30px 34px; border:1px solid var(--line-2); background:var(--card); }
.observation-page h4 { font:500 27px/1.6 var(--serif); margin:0 0 24px; overflow-wrap:anywhere; outline:none; scroll-margin-top:85px; }
.observation-page-meta { display:flex; gap:15px; font-size:12px; color:var(--ink-3); margin-bottom:24px; }
.observation-photos { display:grid; gap:20px; }
.observation-photos img { display:block; width:100%; max-height:540px; object-fit:contain; background:var(--paper); }
.observation-page-mark { width:200px; height:150px; margin:20px auto; }
.observation-finding { white-space:pre-wrap; overflow-wrap:anywhere; font:400 16px/2 var(--serif); margin:30px 0; }
.observation-page footer { color:var(--ink-3); font-size:11px; border-top:1px solid var(--line); padding-top:18px; }
.observation-page-actions { display:flex; align-items:center; flex-wrap:wrap; gap:20px; margin-top:20px; }
.observation-empty { padding:34px 30px; text-align:center; background:var(--card); border:1px solid var(--line-2); }
.observation-empty-mark { width:190px; height:140px; margin:0 auto 22px; }
.observation-empty h4 { font:500 25px/1.6 var(--serif); margin:14px 0; }
.observation-empty p { font-size:13px; color:var(--ink-2); line-height:1.9; max-width:420px; margin:14px auto 24px; }
.observation-prompts { margin-top:26px; }
.observation-prompts > button { display:grid; grid-template-columns:80px minmax(0,1fr) 15px; gap:18px; align-items:center; width:100%; margin-top:12px; padding:20px 12px; border:0; border-bottom:1px solid var(--line); background:transparent; text-align:left; color:var(--ink); }
.observation-prompts strong { font:500 20px/1.6 var(--serif); }
.observation-prompts p { font-size:12px; line-height:1.9; color:var(--ink-2); margin:7px 0 0; }
.observation-book-footer { margin-top:32px; padding-top:22px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:18px 30px; justify-content:space-between; align-items:center; }
.observation-book-footer p { margin:0; max-width:660px; font-size:11px; line-height:1.9; color:var(--ink-3); }
.observation-error { color:var(--ember); font-size:13px; line-height:1.9; }
@media(max-width:760px) { .has-entry .observation-main { order:-1; } .observation-book-layout { grid-template-columns:1fr; gap:24px; } .observation-book-heading { align-items:start; } .observation-book-heading h3 { font-size:25px; } .observation-tally { padding-right:0; padding-left:16px; } .observation-records { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; } .observation-records button { border:1px solid var(--line); padding:15px; } .observation-filters { grid-template-columns:1fr 1fr; column-gap:12px; } .observation-filters label:nth-of-type(2) { grid-column:2; grid-row:1; } .observation-page { padding:24px 20px; } .observation-page h4 { font-size:23px; } .observation-prompts > button { grid-template-columns:55px minmax(0,1fr) 12px; gap:12px; padding-inline:0; } .observation-empty { padding:26px 20px; } }
</style>
