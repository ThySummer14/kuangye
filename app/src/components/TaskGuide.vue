<script setup>
import { computed, ref } from 'vue';
import { STARTING_POINTS } from '../data/starting-points.js';
import { activeOf, saveActionPlan, saveWarning } from '../store.js';
import ModalFrame from './ModalFrame.vue';
import { CATS, DIFF } from '../data/tasks.js';
import { fieldGuide } from '../data/field-guides.js';
import { lumenReward } from '../game/home.js';
const props = defineProps({ task: Object, active: Boolean, eligibility: Object });
defineEmits(['close', 'accept']);
const guide = computed(() => fieldGuide(props.task));
const startingPoints = computed(() => STARTING_POINTS[props.task.id] || []);
const chosenStep = ref('');
function useStep(step) {
  const active = activeOf(props.task.id);
  if (!active || !saveActionPlan(active, { ...active.plan, step })) return;
  chosenStep.value = step;
}
</script>
<template>
  <ModalFrame :label="task.title + ' · 出发手册'" @close="$emit('close')">
    <div class="field-guide">
      <span class="guide-label">出发手册 · {{ CATS[task.cat].name }}</span>
      <h2>{{ task.title }}</h2>
      <p class="guide-time">{{ guide.time }}</p>
      <section class="guide-prep"><h3>带上这些就好</h3><p>{{ guide.prepare }}</p></section>
      <section><h3>可以这样开始</h3><ol><li v-for="step in guide.steps" :key="step">{{ step }}</li></ol></section>
      <section v-if="startingPoints.length" class="guide-starting-points" aria-label="卡住时的起步办法">
        <h3>卡住时，从这里开始</h3>
        <p class="starting-intro">挑一个像现在的你的情况。</p>
        <details v-for="[obstacle, step, next] in startingPoints" :key="obstacle">
          <summary>{{ obstacle }}</summary>
          <div class="starting-body"><p class="starting-step">{{ step }}</p><p>{{ next }}</p>
            <button v-if="active" class="text-button" @click="useStep(step)">{{ activeOf(task.id)?.plan?.step ? '用这一步替换便笺第一步' : '把这一步写进便笺' }} ↗</button>
            <p v-if="chosenStep === step" class="starting-saved" role="status">{{ saveWarning.text || (saveWarning.pending ? '正在保存…' : '已写进出发便笺，回地图也能看见。') }}</p>
          </div>
        </details>
      </section>
      <section class="guide-finish"><h3>怎样算完成</h3><p>{{ task.title }}</p><p>{{ task.desc }}</p>
        <small v-if="task.type !== 'once'">{{ task.type === 'streak' ? '按天记录' : '按数量记录' }} · 目标 {{ task.target }} {{ task.type === 'streak' ? '天' : task.unit }}</small>
      </section>
      <p class="guide-recall">回来时，可以记下：{{ guide.recall }}</p>
      <footer>
        <template v-if="!active"><span v-if="!task.personal">完成后 ✦ {{ lumenReward(DIFF[task.diff].xp) }} 光 · {{ DIFF[task.diff].xp }} XP</span>
          <p v-if="!eligibility.ok" role="status">{{ eligibility.why }}</p>
          <button class="primary-button full-button" :disabled="!eligibility.ok" @click="$emit('accept', task)">接下这件事</button>
        </template>
        <button v-else class="primary-button full-button" @click="$emit('close')">记住第一步，去试试看</button>
      </footer>
    </div>
  </ModalFrame>
</template>
<style scoped>
.field-guide { text-align: left; }
.guide-label { font-size: 12px; color: var(--primary); letter-spacing: 2px; }
.field-guide h2 { margin: 12px 0; padding-right: 12px; font: 600 27px/1.45 var(--serif); }
.field-guide .guide-time { color: var(--ink-2); font-size: 13px; margin-bottom: 25px; }
.field-guide section { margin: 22px 0; }
.field-guide h3 { font-size: 14px; margin: 0 0 10px; color: var(--ink); }
.field-guide p, .field-guide li { font-size: 14px; line-height: 1.85; color: var(--ink-2); }
.field-guide p { margin: 6px 0; }
.field-guide ol { padding-left: 24px; margin: 0; }
.field-guide li { padding-left: 7px; margin: 12px 0; }
.field-guide li::marker { color: var(--primary); font-weight: 600; }
.guide-prep { border-bottom: 1px solid var(--line); padding-bottom: 18px; }
.guide-starting-points { padding: 18px; background: #f4f2e9; border-radius: 12px; }
.field-guide .starting-intro { font-size: 12px; margin-bottom: 12px; }
.guide-starting-points details + details { border-top: 1px solid #dfdfd0; }
.guide-starting-points summary { cursor: pointer; padding: 13px 0; color: #425b39; font-size: 14px; line-height: 1.6; }
.guide-starting-points summary:focus-visible { outline: 2px solid #527242; outline-offset: 3px; }
.starting-body { padding: 0 0 14px 14px; border-left: 2px solid #becbb1; margin-bottom: 12px; }
.field-guide .starting-step { color: #34482e; }
.starting-body .text-button { text-align: left; line-height: 1.7; margin-top: 8px; }
.field-guide .starting-saved { font-size: 12px; color: #425b39; }
.guide-finish { padding: 16px; border-radius: 12px; background: var(--primary-soft); }
.guide-finish small { color: var(--primary); }
.field-guide .guide-recall { font-family: var(--serif); }
.field-guide footer { border-top: 1px solid var(--line); margin-top: 22px; padding-top: 18px; }
.field-guide footer > span { display: block; font-size: 12px; color: var(--ink-2); margin-bottom: 14px; }
@media (max-width: 600px) {
  .field-guide h2 { font-size: 23px; }
  .field-guide footer { position: sticky; bottom: 0; padding: 12px 0 16px; background: #fffdf6; }
  .field-guide footer > span { margin-bottom: 9px; }
}
</style>
