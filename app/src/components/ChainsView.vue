<script setup>
import { computed, ref, shallowRef, nextTick } from 'vue';
import { CHAINS, DIFF } from '../data/tasks.js';
import { CHAIN_GUIDES } from '../data/chain-guides.js';
import { fieldGuide } from '../data/field-guides.js';
import { chainStages, chainUnlocked, canAccept, accept, activeOf, progressOf, state, taskById } from '../store.js';
import TaskGuide from './TaskGuide.vue';
const props = defineProps({ toast: Function });
const initialChain = state.active.map(a => taskById[a.qid]?.chain).find(Boolean)
  || [...state.done].sort((a,b) => b.at.localeCompare(a.at)).map(d => taskById[d.qid]?.chain).find(Boolean)
  || 'run';
const selected = ref(initialChain), heading = ref(null), inspecting = shallowRef(null);
const stageElements = new Map();
function stageRef(id, el) { if (el) stageElements.set(id, el); else stageElements.delete(id); }
function completedCount(id) { return chainStages[id].filter(t => state.done.some(d => d.qid === t.id)).length; }
const journey = computed(() => chainStages[selected.value].map(task => {
  const record = [...state.done].reverse().find(d => d.qid === task.id);
  const active = activeOf(task.id);
  const eligibility = canAccept(task);
  return { task, record, active, eligibility,
    progress: active ? progressOf(active) : null,
    status: record ? 'done' : active ? 'active' : chainUnlocked(task) ? 'open' : 'locked' };
}));
const focus = computed(() => journey.value.find(s => s.status === 'active') || journey.value.find(s => s.status === 'open'));
const complete = computed(() => journey.value.every(s => s.status === 'done'));
const statusLabel = stage => ({done:'已经走过',active:'正在路上',open:stage.eligibility.ok ? '可以开始' : '已解锁',locked:'稍后的旅程'})[stage.status];
async function choose(id) {
  selected.value = id;
  await nextTick();
  heading.value?.focus({preventScroll:true});
  heading.value?.scrollIntoView({block:'start',behavior:'instant'});
}
async function take(task) {
  const eligibility = canAccept(task);
  if (!eligibility.ok) { props.toast?.(eligibility.why); return; }
  if (!accept(task)) return;
  inspecting.value = null;
  props.toast?.(`已接下「${task.title}」，从第一步开始。`);
  await nextTick();
  const element = stageElements.get(task.id);
  element?.focus({preventScroll:true});
  element?.scrollIntoView({block:'center',behavior:'instant'});
}
function focusStage() {
  const el = stageElements.get(focus.value?.task.id);
  el?.focus({preventScroll:true});
  el?.scrollIntoView({block:'center',behavior:'instant'});
}
</script>
<template>
  <div class="growth-journeys">
    <header class="journeys-intro"><h2>一件事，可以慢慢走远。</h2><p>挑一条想走的路。做过的会留下来，下一步等你准备好再开始。</p></header>
    <div class="journey-layout">
      <nav class="journey-menu" aria-label="选择成长线">
        <button v-for="(meta,id) in CHAINS" :key="id" :aria-pressed="selected === id" @click="choose(id)">
          <span class="journey-icon" aria-hidden="true">{{ meta.icon }}</span>
          <span><strong>{{ meta.name }}</strong><small>{{ completedCount(id) }} / {{ chainStages[id].length }} 阶段已完成</small></span>
          <span class="journey-menu-mark" aria-hidden="true">{{ selected === id ? '↗' : '' }}</span>
        </button>
      </nav>
      <section class="journey-detail" :aria-label="CHAINS[selected].name + '成长线'">
        <header class="journey-heading">
          <span class="journey-eyebrow">{{ CHAINS[selected].name }} · {{ journey.length }} 段旅程</span>
          <h2 ref="heading" tabindex="-1">{{ CHAIN_GUIDES[selected].title }}</h2>
          <p>{{ CHAIN_GUIDES[selected].intro }}</p>
          <p class="journey-reminder">{{ CHAIN_GUIDES[selected].reminder }}</p>
          <button v-if="focus" class="soft-button" @click="focusStage">{{ focus.status === 'active' ? '找到正在做的这一件 ↓' : '看看眼前这一步 ↓' }}</button>
          <div v-if="complete" class="journey-finished"><h3>这条路上的每个阶段，你都走过了。</h3><p>把经历留在这里。接下来想停一停，或走向别的方向，都由你决定。</p><a href="#panel">去成长手记，回望这些经历 ↗</a></div>
        </header>
        <ol class="journey-stages">
          <li v-for="(stage,index) in journey" :key="stage.task.id" :class="['journey-stage', stage.status]">
            <span class="stage-marker" aria-hidden="true">{{ stage.status === 'done' ? '✓' : String(index + 1).padStart(2,'0') }}</span>
            <article :ref="el => stageRef(stage.task.id, el)" :data-stage="stage.task.id" tabindex="-1" :aria-label="stage.task.title + ' · ' + statusLabel(stage)">
              <div class="stage-meta"><span>第 {{ index + 1 }} 阶段 · {{ statusLabel(stage) }}</span><span>{{ DIFF[stage.task.diff].name }}</span></div>
              <h3>{{ stage.task.title }}</h3>
              <template v-if="stage.record">
                <time>{{ stage.record.at }} 完成</time>
                <blockquote v-if="stage.record.review">{{ stage.record.review }}</blockquote>
                <p v-else class="stage-no-note">当时没有留下文字，但这一步已经走过了。</p>
              </template>
              <template v-else>
                <p class="stage-description">{{ stage.task.desc }}</p>
                <div v-if="stage.active" class="stage-current">
                  <template v-if="stage.task.type !== 'once'">
                    <label :for="'progress-' + stage.task.id">已记录 {{ stage.progress.cur }} / {{ stage.progress.target }} {{ stage.task.type === 'streak' ? '天' : stage.task.unit }}</label>
                    <progress :id="'progress-' + stage.task.id" :value="Math.min(stage.progress.cur, stage.progress.target)" :max="stage.progress.target" />
                  </template>
                  <p><strong>眼前这一步</strong>{{ fieldGuide(stage.task).steps[0] }}</p>
                  <a href="#tasks" class="stage-action">回任务岩壁，记录进度 ↗</a>
                </div>
                <p v-else-if="stage.status === 'open'" class="stage-first-step">{{ fieldGuide(stage.task).steps[0] }}</p>
                <p v-else class="stage-lock">先完成前面的阶段，再开始这一段。现在也可以先了解。</p>
                <p v-if="stage.status === 'open' && !stage.eligibility.ok" class="stage-capacity">{{ stage.eligibility.why }}</p>
                <button :class="stage.status === 'open' ? 'soft-button' : 'text-button'" @click="inspecting = stage.task">{{ stage.status === 'locked' ? '先了解这一段 ↗' : stage.active ? '重看出发手册 ↗' : '打开出发手册 ↗' }}</button>
              </template>
            </article>
          </li>
        </ol>
        <p class="journey-footnote">每一段都可以按自己的节奏来。准备好了，再走下一步。</p>
      </section>
    </div>
    <TaskGuide v-if="inspecting" :task="inspecting" :active="!!activeOf(inspecting.id)" :eligibility="canAccept(inspecting)" @close="inspecting = null" @accept="take" />
  </div>
</template>
<style scoped>
.journeys-intro { margin: 20px 0 28px; }
.journeys-intro h2 { font: 600 28px/1.5 var(--serif); margin: 0 0 10px; }
.journeys-intro p { color: var(--ink-2); font-size: 14px; line-height: 1.8; }
.journey-layout { display: grid; grid-template-columns: 240px minmax(0,1fr); gap: 30px; }
.journey-menu { display: flex; flex-direction: column; gap: 9px; align-self: start; }
.journey-menu button { display: flex; align-items: center; gap: 16px; background: #f1f4ed; border: 1px solid var(--line); padding: 18px; border-radius: 12px; color: var(--ink); text-align: left; }
.journey-menu button[aria-pressed="true"] { border-color: var(--primary); background: #e5eee0; }
.journey-icon { font-size: 26px; width: 28px; text-align: center; }
.journey-menu strong { font: 600 20px var(--serif); }
.journey-menu small { display: block; margin-top: 7px; color: var(--ink-2); font-size: 12px; }
.journey-menu-mark { margin-left: auto; }
.journey-detail { min-width: 0; padding: 30px; background: #fffef8; border: 1px solid #e8e5d9; border-radius: 18px; }
.journey-eyebrow { font-size: 12px; color: var(--primary); }
.journey-heading h2 { font: 600 30px/1.5 var(--serif); margin: 12px 0; }
.journey-heading > p { max-width: 620px; font-size: 14px; line-height: 1.9; color: var(--ink-2); }
.journey-heading .journey-reminder { padding-left: 14px; border-left: 2px solid #ccd8bd; font-size: 13px; margin: 20px 0; }
.journey-finished { margin: 24px 0; padding: 20px; background: #eef2e5; border-radius: 12px; }
.journey-finished h3 { font: 600 20px/1.6 var(--serif); margin: 0; }
.journey-finished p { font-size: 14px; line-height: 1.8; color: var(--ink-2); }
.journey-finished a, .stage-action { color: var(--primary); text-underline-offset: 4px; font-size: 13px; line-height: 1.8; }
.journey-stages { list-style: none; padding: 0; margin: 30px 0 0; }
.journey-stage { position: relative; padding: 0 0 26px 42px; }
.journey-stage:not(:last-child)::before { content: ''; position: absolute; top: 28px; bottom: 0; left: 13px; width: 1px; background: #d4ddcc; }
.stage-marker { position: absolute; left: 0; top: 0; width: 28px; height: 28px; border: 1px solid #c6d2be; border-radius: 50%; display: grid; place-items: center; font-size: 11px; color: var(--ink-2); background: #fffef8; }
.done .stage-marker { background: #dfe9d5; color: var(--primary); }
.active .stage-marker { background: var(--primary); border-color: var(--primary); color: #fff; }
.journey-stage article { padding: 20px; border: 1px solid var(--line); border-radius: 12px; }
.journey-stage.active article { border-color: #8da982; background: #f1f6ec; }
.journey-stage.locked article { border-style: dashed; }
.journey-stage article:focus-visible, .journey-heading h2:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; }
.stage-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--ink-2); }
.journey-stage h3 { font: 600 20px/1.6 var(--serif); margin: 12px 0 8px; }
.journey-stage time { font-size: 12px; color: var(--ink-2); }
.journey-stage blockquote { margin: 15px 0 0; padding-left: 14px; border-left: 2px solid #c2b888; font: 400 18px/1.9 var(--serif); white-space: pre-wrap; overflow-wrap: anywhere; }
.stage-description, .stage-first-step, .stage-no-note { font-size: 14px; line-height: 1.8; color: var(--ink-2); }
.stage-first-step { color: var(--ink); }
.stage-lock, .stage-capacity { font-size: 12px; line-height: 1.8; color: var(--ink-2); }
.stage-current { margin: 18px 0; }
.stage-current label { font-size: 13px; color: var(--primary); }
.stage-current progress { display: block; width: 100%; height: 7px; margin: 12px 0 18px; accent-color: var(--primary); }
.stage-current progress { appearance: none; border: 0; border-radius: 4px; overflow: hidden; background: #dfe7d9; }
.stage-current progress::-webkit-progress-bar { background: #dfe7d9; }
.stage-current progress::-webkit-progress-value { background: var(--primary); border-radius: 4px; }
.stage-current progress::-moz-progress-bar { background: var(--primary); border-radius: 4px; }
.stage-current p { font-size: 13px; line-height: 1.8; color: var(--ink-2); }
.stage-current strong { display: block; color: var(--ink); font-weight: 500; }
.journey-footnote { margin: 5px 0 0; color: var(--ink-2); font-size: 12px; line-height: 1.8; }
@media(max-width:760px) {
  .journeys-intro h2 { font-size: 24px; }
  .journey-layout { grid-template-columns: minmax(0,1fr); gap: 20px; }
  .journey-menu { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
  .journey-menu button { padding: 12px; gap: 10px; }
  .journey-menu strong { font-size: 18px; }
  .journey-menu small { font-size: 10px; }
  .journey-icon { width: 20px; font-size: 21px; }
  .journey-menu-mark { display: none; }
  .journey-detail { padding: 22px 14px; }
  .journey-heading h2 { font-size: 25px; }
  .journey-stage { padding-left: 33px; }
  .journey-stage article { padding: 15px; }
  .journey-stage h3 { font-size: 18px; }
  .journey-stage blockquote { font-size: 16px; }
}
</style>
