<script setup>
import { ref, nextTick } from 'vue';
import { saveActionPlan, saveWarning } from '../store.js';
import { START_CUES } from '../game/action-plan.js';
const props = defineProps({ active: Object, suggestion: String });
const editing = ref(false), cue = ref(''), step = ref(''), message = ref('');
const cueInput = ref(null), editButton = ref(null);
async function edit() {
  cue.value = props.active.plan?.cue || '';
  step.value = props.active.plan?.step || '';
  message.value = '';
  editing.value = true;
  await nextTick();
  cueInput.value?.focus({ preventScroll: true });
}
async function close() {
  editing.value = false;
  await nextTick();
  editButton.value?.focus({ preventScroll: true });
}
async function save() {
  if (!saveActionPlan(props.active, { cue: cue.value, step: step.value })) return;
  await close();
  message.value = props.active.plan ? '便笺写好了，回地图也能看见。' : '便笺已收起，随时可以重新写。';
}
async function clear() {
  saveActionPlan(props.active, null);
  await close();
  message.value = '便笺已收起，任务仍在这里。';
}
</script>
<template>
  <section class="action-plan" :aria-label="'出发便笺：' + active.qid">
    <div class="plan-heading"><strong>出发便笺</strong><span>把开始变得具体一点</span></div>
    <form v-if="editing" @submit.prevent="save" @keydown.esc.stop.prevent="close">
      <label :for="`cue-${active.qid}`">什么时候开始</label>
      <input :id="`cue-${active.qid}`" ref="cueInput" v-model="cue" maxlength="60" placeholder="比如：晚饭后，回宿舍之前" />
      <div class="cue-options" role="group" aria-label="开始时机建议">
        <button v-for="item in START_CUES" :key="item" type="button" :aria-pressed="cue === item" @click="cue = item">{{ item }}</button>
      </div>
      <label :for="`step-${active.qid}`">我的第一步</label>
      <textarea :id="`step-${active.qid}`" v-model="step" maxlength="160" rows="3" :placeholder="suggestion" />
      <button type="button" class="text-button use-suggestion" @click="step = suggestion">用手册这一步</button>
      <p class="plan-help">只写一项也可以。时间变了就改一改，不设提醒，也没有迟到。</p>
      <div class="plan-actions">
        <button class="soft-button" type="submit">收好便笺</button>
        <button class="text-button" type="button" @click="close">取消</button>
        <button v-if="active.plan" class="text-button" type="button" @click="clear">清除便笺</button>
      </div>
    </form>
    <template v-else>
      <p v-if="active.plan?.cue" class="plan-cue">{{ active.plan.cue }}</p>
      <p class="plan-step">{{ active.plan?.step || suggestion }}</p>
      <button ref="editButton" class="text-button" @click="edit">{{ active.plan ? '改一改安排' : '写下我的安排' }} ↗</button>
    </template>
    <p v-if="message" class="plan-status" role="status">{{ saveWarning.text || (saveWarning.pending ? '正在保存便笺…' : message) }}</p>
  </section>
</template>
<style scoped>
.action-plan { background: #f3f5eb; border-left: 3px solid #8fa580; padding: 18px; margin: 18px 0 12px; border-radius: 2px 12px 12px 2px; }
.plan-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; margin-bottom: 12px; }
.plan-heading strong { color: #3f5738; font-size: 14px; }
.plan-heading span, .plan-help, .plan-status { font-size: 12px; color: #63715e; line-height: 1.7; }
.action-plan .plan-cue { margin: 0 0 6px; font-size: 13px; color: #48613e; font-weight: 600; }
.action-plan .plan-step { margin: 0 0 12px; color: #3e4939; line-height: 1.8; overflow-wrap: anywhere; }
.action-plan label { display: block; margin: 16px 0 8px; color: #3e4939; font-size: 13px; font-weight: 600; }
.action-plan input, .action-plan textarea { box-sizing: border-box; width: 100%; padding: 12px; font: inherit; font-size: 14px; line-height: 1.6; color: #303e2d; background: #fffef9; border: 1px solid #b6c3ac; border-radius: 8px; }
.action-plan textarea { resize: vertical; }
.action-plan :is(input, textarea, button):focus-visible { outline: 2px solid #527242; outline-offset: 3px; }
.cue-options, .plan-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.cue-options button { padding: 7px 10px; font: inherit; font-size: 12px; border: 1px solid #bac6b1; border-radius: 6px; background: transparent; color: #45553d; cursor: pointer; }
.cue-options button[aria-pressed="true"] { background: #425c38; color: #fff; border-color: #425c38; }
.use-suggestion { margin-top: 8px; }
.action-plan .plan-help { margin: 12px 0; }
.action-plan .plan-status { margin: 12px 0 0; }
@media (max-width: 480px) { .action-plan { padding: 14px; } .cue-options button { min-height: 40px; } }
</style>
