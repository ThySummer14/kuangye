<script setup>
import { computed, ref } from 'vue';
import { TRAIL_NOTEBOOKS } from '../data/trail-notebooks.js';
import { fieldGuide } from '../data/field-guides.js';
import { state, taskById, canAccept } from '../store.js';

const props = defineProps({ trail: { type: Object, required: true }, expanded: Boolean });
const emit = defineEmits(['inspect', 'resume', 'write', 'browse']);
const notebook = computed(() => TRAIL_NOTEBOOKS[props.trail.id]);
const selected = ref(notebook.value.situations[0].id);
const situation = computed(() => notebook.value.situations.find(item => item.id === selected.value));
const pages = computed(() => situation.value.tasks.map(id => taskById[id]).filter(Boolean));
const status = task => state.active.some(a => a.qid === task.id) ? 'active'
  : state.done.some(d => d.qid === task.id && !task.repeatable) ? 'done' : 'ready';
function effort(task) {
  if (task.type === 'streak') return `连续 ${task.target} 天 · 按天记录`;
  if (task.type === 'total') return `累计 ${task.target} ${task.unit || '次'} · 可以分次做`;
  return '一次完成 · 按自己的节奏';
}
function write() {
  emit('write', { ...situation.value.writing, cat: notebook.value.cat, label: situation.value.title, note: situation.value.note });
}
</script>

<template>
  <section class="trail-notebook" :data-notebook="trail.id" :aria-label="notebook.label">
    <header class="notebook-heading">
      <div><span class="eyebrow">{{ trail.title }} · 行动小册</span><h3>{{ notebook.title }}</h3><p>{{ notebook.intro }}</p></div>
      <span class="notebook-stamp" aria-hidden="true">{{ trail.symbol }}</span>
    </header>
    <div class="notebook-layout">
      <div class="notebook-situations" role="group" :aria-label="notebook.question">
        <p>{{ notebook.question }}</p>
        <button v-for="item in notebook.situations" :key="item.id" :aria-pressed="selected === item.id" @click="selected = item.id">
          <strong>{{ item.title }}</strong><small>{{ item.note }}</small><span aria-hidden="true">{{ selected === item.id ? '✓' : '↗' }}</span>
        </button>
      </div>
      <div class="notebook-pages">
        <div class="notebook-current" role="status"><strong>{{ situation.title }}</strong><p>{{ situation.note }}<span>两件事，选一件合适的就好。</span></p></div>
        <div class="notebook-options">
          <article v-for="task in pages" :key="task.id" :data-notebook-task="task.id" :class="{ 'page-done': status(task) === 'done' }">
            <div class="page-meta"><span>{{ effort(task) }}</span><span v-if="status(task) !== 'ready'" class="page-status">{{ status(task) === 'active' ? '正在做' : '已走过' }}</span></div>
            <h4>{{ task.title }}</h4>
            <p class="page-description">{{ task.desc }}</p>
            <div class="page-first-step"><span>从这个动作开始</span><p>{{ fieldGuide(task).steps[0] }}</p></div>
            <button v-if="status(task) === 'active'" class="soft-button page-action" @click="emit('resume', task.id)">继续这件事 <span aria-hidden="true">↗</span></button>
            <button v-else class="soft-button page-action" :aria-label="task.title + '：打开行动手册'" @click="emit('inspect', task)">{{ status(task) === 'done' ? '已完成，翻翻手册' : '看看怎么做' }} <span aria-hidden="true">↗</span></button>
            <small v-if="status(task) === 'ready' && !canAccept(task).ok" class="page-eligibility">{{ canAccept(task).why }}。仍可以先翻阅。</small>
          </article>
        </div>
      </div>
    </div>
    <footer class="notebook-footer">
      <div><strong>也可以从你自己的生活里选一件。</strong><p>沿着「{{ situation.title }}」写具体的目标和完成条件。</p><button class="text-button" @click="write">按这个情境，自己写一件 <span aria-hidden="true">↗</span></button></div>
      <button class="text-button notebook-browse" :aria-expanded="expanded" aria-controls="task-library" @click="emit('browse')">{{ expanded ? '收起这个方向的任务' : '再看看这个方向的任务' }} <span aria-hidden="true">{{ expanded ? '↑' : '↓' }}</span></button>
    </footer>
  </section>
</template>

<style scoped>
.trail-notebook { margin: 24px 0 32px; padding: 32px; border: 1px solid #ced7c5; border-radius: 4px 20px 20px 4px; background: #edf1e7; border-left: 5px solid #98aa88; color: var(--ink); }
.notebook-heading { display: flex; gap: 24px; justify-content: space-between; padding-bottom: 26px; }
.notebook-heading h3 { margin: 14px 0 12px; font: 500 clamp(25px, 3vw, 34px)/1.45 var(--serif); }
.notebook-heading p { margin: 0; max-width: 600px; font-size: 14px; line-height: 1.9; color: var(--ink-2); }
.notebook-stamp { align-self: center; flex: 0 0 58px; display: grid; place-items: center; height: 58px; border: 1px solid #b5c1a9; border-radius: 50%; color: #738767; font-size: 28px; }
.notebook-layout { display: grid; grid-template-columns: 205px minmax(0, 1fr); gap: 30px; align-items: start; }
.notebook-situations { display: grid; gap: 10px; }
.notebook-situations > p { font-size: 12px; color: var(--ink-2); line-height: 1.8; margin: 0 0 6px; }
.notebook-situations button { position: relative; text-align: left; padding: 18px 32px 18px 16px; border: 1px solid #c7d1bf; border-radius: 8px; color: var(--ink); background: transparent; }
.notebook-situations button[aria-pressed=true] { background: #dfe7d7; border-color: #839b75; }
.notebook-situations strong { display: block; font: 500 18px/1.5 var(--serif); }
.notebook-situations small { display: block; color: var(--ink-2); font-size: 12px; line-height: 1.8; margin-top: 6px; }
.notebook-situations button > span { position: absolute; right: 12px; top: 20px; color: var(--primary); }
.notebook-current { margin-bottom: 18px; }
.notebook-current > strong { font-size: 13px; font-weight: 500; }
.notebook-current p { margin: 5px 0 0; font-size: 12px; color: var(--ink-2); line-height: 1.8; }
.notebook-current p > span { display: block; }
.notebook-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.notebook-options article { display: flex; flex-direction: column; min-width: 0; background: #fffdf5; border: 1px solid #e0dfcd; border-radius: 3px 12px 12px 3px; padding: 24px; }
.page-meta { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 11px; line-height: 1.7; color: var(--ink-2); }
.page-status { color: var(--primary); }
.notebook-options h4 { margin: 14px 0 10px; font: 500 23px/1.6 var(--serif); overflow-wrap: anywhere; }
.page-description { margin: 0; font-size: 13px; line-height: 1.85; color: var(--ink-2); }
.page-first-step { margin: 20px 0 22px; padding-left: 12px; border-left: 2px solid #becaad; }
.page-first-step > span { font-size: 11px; color: #647b54; }
.page-first-step p { margin: 7px 0 0; font-size: 13px; line-height: 1.85; color: var(--ink); }
.page-action { margin-top: auto; width: 100%; display: flex; justify-content: space-between; gap: 12px; font-size: 13px; line-height: 1.7; text-align: left; }
.page-eligibility { font-size: 11px; line-height: 1.8; color: var(--ink-2); margin-top: 10px; }
.page-done { border-color: #cad5be!important; }
.notebook-footer { display: flex; gap: 24px; justify-content: space-between; align-items: flex-end; border-top: 1px solid #ccd7c2; margin-top: 28px; padding-top: 22px; }
.notebook-footer strong { font-weight: 500; font-size: 14px; line-height: 1.8; }
.notebook-footer p { color: var(--ink-2); font-size: 12px; line-height: 1.8; margin: 7px 0 10px; }
.notebook-footer .text-button { text-align: left; font-size: 13px; line-height: 1.8; padding: 0; }
.notebook-browse { flex-shrink: 0; }
.trail-notebook button:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
@media (max-width: 1050px) {
  .notebook-layout { grid-template-columns: 175px minmax(0, 1fr); gap: 22px; }
  .notebook-options { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .trail-notebook { padding: 23px 16px; border-left-width: 3px; }
  .notebook-heading { padding-bottom: 22px; }
  .notebook-heading h3 { font-size: 27px; }
  .notebook-heading p { font-size: 13px; }
  .notebook-stamp { display: none; }
  .notebook-layout { grid-template-columns: 1fr; gap: 22px; }
  .notebook-situations { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
  .notebook-situations > p { grid-column: 1/-1; margin-bottom: 2px; }
  .notebook-situations button { padding: 12px 5px; text-align: center; min-height: 46px; }
  .notebook-situations strong { font: 500 12px/1.7 var(--sans); }
  .notebook-situations small, .notebook-situations button > span { display: none; }
  .notebook-options article { padding: 20px; }
  .notebook-options h4 { font-size: 22px; }
  .notebook-current { margin-bottom: 15px; }
  .notebook-current > strong { display: none; }
  .notebook-footer { display: block; margin-top: 22px; padding-top: 20px; }
  .notebook-footer .notebook-browse { margin-top: 22px; }
}
</style>
