<script setup>
import { computed, ref, shallowRef } from 'vue';
import { state, taskById, activeOf, canAccept, accept, progressOf, restoreLibrary } from '../store.js';
import { emptyTown, readingMilestones } from '../game/town.js';
import { LIBRARY_STAGES } from '../data/town.js';
import TownScene from './TownScene.vue';
import ReadingDesk from './ReadingDesk.vue';
import TaskGuide from './TaskGuide.vue';
const emit=defineEmits(['tasks','journal','toast']);
const town=computed(()=>state.home.town||emptyTown());
const earned=computed(()=>readingMilestones(state.done));
const ready=computed(()=>town.value.library<earned.value);
const next=computed(()=>LIBRARY_STAGES[town.value.library]);
const task=computed(()=>next.value?taskById[next.value.qid]:null);
const active=computed(()=>task.value?activeOf(task.value.id):null);
const inspecting=shallowRef(null), light=ref('day'), notice=ref('');
function repair() {const r=restoreLibrary();notice.value=r.ok?LIBRARY_STAGES[r.stage-1].memory:r.why;}
function take(t) {if(accept(t)){inspecting.value=null;emit('toast','接下了阅读任务，第一步在岩壁等你。');emit('tasks');}}
function record(qid) {return state.done.find(d=>d.qid===qid);}
</script>
<template>
  <div class="library-page">
    <header><span class="eyebrow">家门外的第一条街</span><h2>{{ town.library===3?'书屋开门了，进来坐坐。':'让街角的书屋，慢慢亮起来。' }}</h2><p>每走完一段阅读旅程，就为这里修好一点。那些读过的日子，会留在这条街上。</p></header>
    <ReadingDesk @task="inspecting=$event" @tasks="emit('tasks')" />
    <h3 class="library-place-title">街角，因那些阅读而变化。</h3>
    <div class="library-layout">
      <div><TownScene mode="library" :town="town" :light="light" /><div class="library-light" role="group" aria-label="书屋预览光线"><button :aria-pressed="light==='day'" @click="light='day'">日间</button><button :aria-pressed="light==='night'" @click="light='night'">夜间</button></div></div>
      <section class="library-current" aria-label="书屋的下一步">
        <span class="eyebrow">{{ town.library }} / 3 段街角记忆</span>
        <template v-if="next"><h3>{{ next.title }}</h3><p>{{ next.change }}</p>
          <template v-if="ready"><p class="library-ready">你已经做到了「{{ task.title }}」。现在可以把这段经历留在书屋。</p><button class="primary-button" @click="repair">{{ next.title }}</button></template>
          <template v-else><div class="library-requirement"><span>对应的阅读旅程</span><strong>{{ task.title }}</strong><p>{{ task.desc }}</p><small v-if="active">正在进行 · {{ progressOf(active).cur }} / {{ progressOf(active).target }} {{ task.type==='streak'?'天':task.unit||'次' }}</small></div>
            <button v-if="active" class="primary-button" @click="emit('tasks')">回岩壁，继续阅读</button>
            <button v-else class="primary-button" @click="inspecting=task">看看这段阅读怎么开始</button></template>
        </template>
        <template v-else><h3>这里，有你读过的日子。</h3><p>书架、长椅和窗边的灯，都因为那些真实的阅读留下来。下面可以翻到当时的回顾。</p><button class="soft-button" @click="emit('journal')">去成长手记继续翻阅 ↗</button></template>
        <p v-if="notice" class="library-notice" role="status">{{ notice }}</p>
        <p class="library-note">以前完成的阅读也算数。修复不花光、不另发奖励，也没有施工倒计时。</p>
      </section>
    </div>
    <section class="library-history" aria-label="书屋修复记忆"><h3>一间书屋，三段来路。</h3><div class="library-stages"><article v-for="(stage,index) in LIBRARY_STAGES" :key="stage.qid" :class="{built:index<town.library}"><span>{{ index<town.library?'已留在街角':record(stage.qid)?'阅读已完成':'还没走到这里' }}</span><h4>{{ stage.title }}</h4><p>{{ index<town.library?stage.memory:stage.change }}</p><template v-if="record(stage.qid)"><time>{{ record(stage.qid).at }}</time><blockquote>{{ record(stage.qid).review || '那时没有留下文字，但那些阅读已经成为这间书屋的一部分。' }}</blockquote></template><small v-else>{{ taskById[stage.qid].title }}</small></article></div></section>
    <TaskGuide v-if="inspecting" :task="inspecting" :active="!!activeOf(inspecting.id)" :eligibility="canAccept(inspecting)" @close="inspecting=null" @accept="take" />
  </div>
</template>
<style scoped>
.library-page > header { margin:24px 0 30px; }
.library-page h2 { font:500 32px/1.5 var(--serif); margin:14px 0; }
.library-page p { font-size:14px; line-height:1.9; color:var(--ink-2); }
.library-place-title { font:500 24px/1.6 var(--serif); margin:24px 0; }
.library-layout { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(300px,1fr); gap:26px; align-items:start; }
.library-current { background:#fffdf5; border:1px solid var(--line); border-radius:18px; padding:28px; }
.library-current h3 { font:500 25px/1.6 var(--serif); margin:15px 0; }
.library-requirement { background:#edf2e7; padding:18px; border-radius:10px; margin:22px 0; }
.library-requirement span,.library-requirement small { font-size:12px; color:var(--ink-2); }
.library-requirement strong { display:block; font-size:16px; line-height:1.7; margin-top:10px; }
.library-current .library-ready { color:var(--primary); margin:24px 0; }
.library-current .library-note { font-size:12px; padding-top:18px; border-top:1px solid var(--line); margin-top:26px; }
.library-current .library-notice { color:var(--primary); }
.library-light { display:flex; gap:8px; margin:12px 0; }
.library-light button { border:1px solid #c4d0b8; background:transparent; padding:8px 16px; border-radius:7px; color:var(--primary); }
.library-light button[aria-pressed=true] { background:var(--primary); color:white; }
.library-history { margin:30px 0; }
.library-history > h3 { font:500 25px var(--serif); }
.library-stages { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
.library-stages article { padding:22px; border:1px solid var(--line); border-radius:12px; }
.library-stages article.built { background:#edf2e7; }
.library-stages span,.library-stages small,.library-stages time { font-size:12px; color:var(--ink-2); }
.library-stages h4 { font:500 20px var(--serif); margin:14px 0; }
.library-stages blockquote { margin:14px 0 0; font:400 16px/1.8 var(--serif); overflow-wrap:anywhere; }
@media(max-width:800px) { .library-layout,.library-stages { grid-template-columns:1fr; } .library-page h2 { font-size:27px; } .library-current { padding:20px; } }
</style>
