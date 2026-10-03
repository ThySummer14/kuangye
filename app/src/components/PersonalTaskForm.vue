<script setup>
import { reactive, ref, computed } from 'vue';
import ModalFrame from './ModalFrame.vue';
import { CATS } from '../data/tasks.js';
import { state, activeOf, createPersonalTask, editPersonalTask } from '../store.js';
const props = defineProps({ task: Object, suggestion: Object });
const emit = defineEmits(['close', 'saved']);
const existing = props.task && activeOf(props.task.id);
const draft = reactive({ title: props.task?.title || '', desc: props.task?.desc || '', cat: props.task?.cat || props.suggestion?.cat || 'live', cue: existing?.plan?.cue || '', step: existing?.plan?.step || props.suggestion?.step || '' });
const error = ref('');
const full = computed(() => !props.task && state.active.length >= 3);
function save() {
  const input = { ...draft, plan: { cue: draft.cue, step: draft.step } };
  const result = props.task ? editPersonalTask(props.task.id, input) : createPersonalTask(input);
  if (!result.ok) { error.value = result.why; return; }
  emit('saved', result.task);
}
</script>
<template>
  <ModalFrame :label="task ? '修改自己的事' : '自己给自己派一件事'" @close="emit('close')">
    <form class="personal-form" @submit.prevent="save">
      <span class="personal-kicker">从你自己的生活里出发</span>
      <h2>{{ task ? '把这件事，改得更合适。' : '这一次，由你来写。' }}</h2>
      <p>不用是一件大事。写得具体一点，让回来时的自己知道有没有做到。</p>
      <aside v-if="suggestion && !task" class="personal-situation"><strong>从「{{ suggestion.label }}」开始</strong><p>{{ suggestion.note }}</p><small>下面是参考写法，可以换成你自己的安排。</small></aside>
      <label for="personal-title">我想做什么 <small>必填</small></label>
      <input id="personal-title" v-model="draft.title" maxlength="60" required :placeholder="suggestion?.titlePlaceholder || '例如：整理书桌左边的抽屉'" />
      <label for="personal-condition">怎样才算完成 <small>必填</small></label>
      <textarea id="personal-condition" v-model="draft.desc" maxlength="240" required rows="3" :placeholder="suggestion?.conditionPlaceholder || '例如：把文具、票据分开收好，清出一个能放笔记本的位置。'" />
      <p class="field-hint">写看得见的结果，比如“读完一章并记下一句话”，比“好好读书”更容易开始。</p>
      <fieldset><legend>这件事更接近</legend><div class="personal-domains"><label v-for="(cat, id) in CATS" :key="id"><input type="radio" v-model="draft.cat" :value="id" name="personal-domain" />{{ cat.name }}</label></div></fieldset>
      <div class="personal-first-step"><h3>顺手安排第一步 <small>选填</small></h3>
        <label for="personal-cue">什么时候开始</label><input id="personal-cue" v-model="draft.cue" maxlength="60" placeholder="例如：今天晚饭后" />
        <label for="personal-step">先做哪一个小动作</label><input id="personal-step" v-model="draft.step" maxlength="160" :placeholder="suggestion?.stepPlaceholder || '例如：把抽屉里的东西拿出来'" />
      </div>
      <p class="personal-reward">完成后留在成长手记，也能成为家具上的回忆。不另发 XP 和任务光；当天的微光与其他任务共用一次。</p>
      <p v-if="full || error" role="alert">{{ full ? '手里已有 3 件事，先完成或放下一件，再来写新的。' : error }}</p>
      <footer><button type="button" class="text-button" @click="emit('close')">先不写了</button><button class="primary-button" :disabled="full">{{ task ? '保存修改' : '写好了，接下这件事' }}</button></footer>
    </form>
  </ModalFrame>
</template>
<style scoped>
.personal-form { text-align: left; }
.personal-kicker { font-size: 12px; color: var(--primary); }
.personal-form h2 { font: 600 26px/1.5 var(--serif); margin: 12px 24px 12px 0; }
.personal-form p { font-size: 13px; color: var(--ink-2); line-height: 1.8; }
.personal-form > label, .personal-first-step label { display: block; font-size: 14px; margin: 22px 0 8px; color: var(--ink); }
.personal-form small { font-size: 11px; font-weight: normal; color: var(--ink-2); margin-left: 8px; }
.personal-form :is(input:not([type=radio]), textarea) { width: 100%; box-sizing: border-box; background: white; border: 1px solid #bccbb4; border-radius: 8px; padding: 12px; font: inherit; font-size: 14px; color: var(--ink); line-height: 1.6; }
.personal-form textarea { resize: vertical; }
.personal-form :is(input,textarea,button):focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.personal-form fieldset { border: 0; padding: 0; margin: 22px 0; }
.personal-form legend { font-size: 14px; margin-bottom: 12px; }
.personal-domains { display: flex; flex-wrap: wrap; gap: 10px 18px; }
.personal-domains label { display: flex; align-items: center; gap: 5px; font-size: 13px; min-height: 32px; }
.personal-domains input { accent-color: var(--primary); }
.personal-first-step { background: #f0f3e9; border-radius: 12px; padding: 16px; }
.personal-first-step h3 { margin: 0; font-size: 14px; }
.personal-first-step label { margin-top: 14px; }
.personal-form .field-hint, .personal-form .personal-reward { font-size: 12px; }
.personal-situation { margin: 18px 0; padding: 16px; border-left: 2px solid #9fb28d; background: #edf2e7; border-radius: 0 10px 10px 0; }
.personal-situation strong { font-size: 14px; font-weight: 500; }
.personal-situation p { margin: 8px 0; }
.personal-situation > small { display: block; margin: 0; line-height: 1.8; }
.personal-form footer { display: flex; justify-content: space-between; gap: 12px; padding: 16px 0 4px; background: #fffdf6; position: sticky; bottom: -1px; }
.personal-form footer button { font-size: 13px; }
</style>
