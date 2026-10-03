<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { state, taskById, activeOf, openInquiryPage, saveInquiryPage, addInquiryClue, keepInquiryPage, continueInquiryPage } from '../store.js';
import { INQUIRY_LIMITS } from '../game/inquiry.js';

const emit = defineEmits(['task', 'tasks', 'write']);
const pages = computed(() => state.home.inquiry?.pages || []);
const current = computed(() => pages.value.find(page => page.status === 'exploring'));
const selected = ref(''), editing = ref(false), editingId = ref(''), reflecting = ref(false), notice = ref('');
const shown = computed(() => pages.value.find(page => page.id === selected.value) || current.value || pages.value[0]);
const draft = reactive({ question: '', guess: '', answer: '', next: '' });
const reflection = reactive({ answer: '', next: '' }), clue = reactive({ text: '', source: '' });
const paper = ref(null), questionInput = ref(null), answerInput = ref(null);
watch(() => shown.value?.id, () => {
  Object.assign(reflection, { answer: shown.value?.answer || '', next: shown.value?.next || '' });
  Object.assign(clue, { text: '', source: '' });
}, { immediate: true });
async function edit(page) {
  editingId.value = page?.id || '';
  Object.assign(draft, { question: page?.question || '', guess: page?.guess || '', answer: page?.answer || '', next: page?.next || '' });
  editing.value = true; reflecting.value = false; notice.value = '';
  await nextTick(); questionInput.value?.focus();
}
function save() {
  const result = editingId.value ? saveInquiryPage(editingId.value, draft) : openInquiryPage(draft);
  notice.value = result.ok ? '问题和起点收好了。去找一条真实的线索，再回来写。' : result.why;
  if (result.ok) { selected.value = editingId.value || result.id; editing.value = false; }
}
function saveReflection() {
  const result = saveInquiryPage(shown.value.id, reflection);
  notice.value = result.ok ? '这一版解释和下一步，都留在夹页里了。' : result.why;
  if (result.ok) reflecting.value = false;
}
function addClue() {
  const result = addInquiryClue(shown.value.id, clue);
  notice.value = result.ok ? '这条线索，连同来处一起留下了。' : result.why;
  if (result.ok) Object.assign(clue, { text: '', source: '' });
}
function keep() {
  const result = keepInquiryPage(shown.value.id);
  notice.value = result.ok ? '这张夹页收好了，想继续时还能翻回来。' : result.why;
}
function resume() {
  const result = continueInquiryPage(shown.value.id);
  notice.value = result.ok ? '翻回这一页，接着上次的线索走。' : result.why;
}
async function select(id) {
  selected.value = id; editing.value = false; reflecting.value = false; notice.value = '';
  await nextTick(); paper.value?.focus({ preventScroll: true });
}
async function reflect() {
  Object.assign(reflection, { answer: shown.value.answer, next: shown.value.next });
  reflecting.value = true; notice.value = '';
  await nextTick(); answerInput.value?.focus();
}
</script>

<template>
  <section class="inquiry-desk" aria-label="我的问号夹页">
    <header class="inquiry-heading"><div><span class="eyebrow">从一个小问题，看懂一点世界</span><h3>让一个问号，有一段来路。</h3><p>先写现在的想法，再去读、去问或亲手试一次。把找到的线索和自己的解释留在一起。</p></div><span>{{ pages.length }} 张夹页</span></header>
    <div class="inquiry-layout">
      <aside class="inquiry-index" aria-label="问题夹页夹">
        <span class="index-label">手里先留一个问题</span>
        <button v-for="page in pages" :key="page.id" class="inquiry-index-page" :aria-pressed="shown?.id === page.id && !editing" @click="select(page.id)"><small>{{ page.status === 'exploring' ? '正在弄懂' : '已经夹好' }}</small><strong>{{ page.question }}</strong><span>{{ page.notes.length }} 条线索{{ page.answer ? ' · 留有自己的解释' : '' }}</span></button>
        <button v-if="!current" class="soft-button" @click="edit()">打开一张新夹页 ＋</button>
        <p>问题可以很小。一次只追一个，其他想法留到下一页。</p>
      </aside>
      <div ref="paper" tabindex="-1" class="inquiry-paper">
        <form v-if="editing" class="inquiry-form" @submit.prevent="save">
          <span class="eyebrow">把好奇心缩到可以开始的地方</span><h4>{{ editingId ? '整理这个问题的起点。' : '现在，想弄懂什么？' }}</h4>
          <label for="inquiry-question">我的具体问题<input id="inquiry-question" ref="questionInput" v-model="draft.question" :maxlength="INQUIRY_LIMITS.question" required placeholder="例如：这件衣服的洗涤标识是什么意思？" /></label>
          <p class="field-hint">“想学会摄影”可以先缩成“为什么这张照片看起来很暗”。</p>
          <label for="inquiry-guess">现在，我是这样想的 <small>选填</small><textarea id="inquiry-guess" v-model="draft.guess" :maxlength="INQUIRY_LIMITS.guess" rows="3" placeholder="写自己的猜测，或已经知道的一点。不确定也可以如实写。" /></label>
          <label for="inquiry-start">先去做哪个小动作 <small>选填</small><input id="inquiry-start" v-model="draft.next" :maxlength="INQUIRY_LIMITS.next" placeholder="例如：看一眼衣服内侧的标签，查清其中一个符号。" /></label>
          <div class="inquiry-actions"><button class="primary-button">收好问题，去找线索</button><button class="text-button" type="button" @click="editing=false">取消</button></div>
        </form>
        <template v-else-if="shown">
          <div class="inquiry-page-meta"><span>{{ shown.status === 'exploring' ? '正在弄懂的这一个' : '夹页夹里的这一张' }}</span><time v-if="shown.started">从 {{ shown.started }} 开始</time></div>
          <h4>{{ shown.question }}</h4>
          <button class="text-button inquiry-edit" @click="edit(shown)">整理问题与起点 ↗</button>
          <div v-if="!reflecting" class="inquiry-understanding">
            <section><span>最初，我这样想</span><p>{{ shown.guess || '当时没有写下猜测，可以从找到的第一条线索开始。' }}</p></section>
            <section :class="{ 'has-answer': shown.answer }"><span>现在，我能这样说明</span><p>{{ shown.answer || '看过资料、问过人或试过之后，用自己的话说明；还没弄懂的地方也可以留下。' }}</p></section>
          </div>
          <form v-if="reflecting" class="inquiry-form reflection-form" @submit.prevent="saveReflection">
            <label for="inquiry-answer">用自己的话，说明现在的理解<textarea id="inquiry-answer" ref="answerInput" v-model="reflection.answer" :maxlength="INQUIRY_LIMITS.answer" rows="5" placeholder="哪些线索改变了想法？可以解释到哪一步？哪里还不确定？" /></label>
            <label for="inquiry-next">下次，从哪里继续<input id="inquiry-next" v-model="reflection.next" :maxlength="INQUIRY_LIMITS.next" placeholder="一个可以实际去做的动作，或下一次想确认的问题。" /></label>
            <div class="inquiry-actions"><button class="primary-button">保存解释和下一步</button><button type="button" class="text-button" @click="reflecting=false">取消</button></div>
          </form>
          <button v-else class="soft-button" @click="reflect">{{ shown.answer ? '补写自己的解释与下一步' : '写下我的解释与下一步' }}</button>
          <div v-if="shown.next && !reflecting" class="inquiry-next"><span>下次从这里接着走</span><p>{{ shown.next }}</p><button class="text-button" @click="emit('write', shown)">把下一步写成自己的事 ↗</button></div>
          <section class="inquiry-clues" aria-label="这个问题的线索"><h5>找到的线索 <small>{{ shown.notes.length }} 条</small></h5>
            <p v-if="!shown.notes.length" class="inquiry-no-clue">可以是读到的一段、一次实际观察，或动手试过的结果。先去做，再把真实的发现带回来。</p>
            <ol v-else><li v-for="(entry,index) in shown.notes" :key="index"><div><time>{{ entry.at || '日期未记' }}</time><span>线索 {{ index + 1 }}</span></div><p>{{ entry.text }}</p><small>来自：{{ entry.source || '这条线索没有记录来源' }}</small></li></ol>
            <form class="clue-form" @submit.prevent="addClue"><label for="inquiry-clue">我实际找到的一条线索<textarea id="inquiry-clue" v-model="clue.text" :maxlength="INQUIRY_LIMITS.note" rows="3" placeholder="写真正读到、问到或试出来的内容，不必一次就找到答案。" /></label><label for="inquiry-source">来自哪里 <small>选填</small><input id="inquiry-source" v-model="clue.source" :maxlength="INQUIRY_LIMITS.source" placeholder="书名与页码、网页地址、观察地点，或实验方式。" /></label><button class="soft-button" :disabled="!clue.text.trim()">夹入这条线索</button></form>
          </section>
          <details class="inquiry-journeys"><summary>想把学习走成一段旅程</summary><p>夹页是自己的记录。接取、进度和完成，仍按原任务要求确认。</p><button v-for="qid in ['research','c1-demo']" :key="qid" class="text-button" @click="activeOf(qid) ? emit('tasks', qid) : emit('task', taskById[qid])">{{ taskById[qid].title }} · {{ activeOf(qid) ? '回岩壁继续' : '翻开手册' }} ↗</button></details>
          <footer class="inquiry-close"><button v-if="shown.status === 'exploring'" class="soft-button" @click="keep">先把这一页夹好</button><button v-else-if="!current" class="soft-button" @click="resume">继续弄懂这个问题</button><p>留下一个问号，也可以收好这一页。这里不计时、不自动完成任务。</p></footer>
        </template>
        <div v-else class="inquiry-empty"><span aria-hidden="true">？</span><h4>那些“为什么”，可以有自己的位置。</h4><p>不用先选一门大课。<br />写一个真的好奇的问题，去找到一条线索。</p><button class="primary-button" @click="edit()">写下第一个问题</button></div>
        <p v-if="notice" class="inquiry-notice" role="status">{{ notice }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.inquiry-desk { margin: 28px 0 44px; color: var(--ink); }
.inquiry-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 24px; }
.inquiry-heading h3 { font: 500 29px/1.5 var(--serif); margin: 12px 0; }
.inquiry-heading p { margin: 0; max-width: 630px; font-size: 13px; line-height: 1.9; color: var(--ink-2); }
.inquiry-heading > span { font-size: 12px; white-space: nowrap; color: var(--ink-2); }
.inquiry-layout { display: grid; grid-template-columns: 235px minmax(0,1fr); border: 1px solid #cdd6cb; border-radius: 4px 18px 18px 4px; background: #fffdf5; overflow: hidden; }
.inquiry-index { display: flex; flex-direction: column; gap: 12px; padding: 24px 20px; background: #e9eeeb; }
.index-label { font-size: 12px; color: #667a70; margin-bottom: 4px; }
.inquiry-index-page { position: relative; text-align: left; color: var(--ink); background: #f7f8f0; border: 1px solid #ccd6c9; border-left: 4px solid #9bad9e; border-radius: 2px 8px 8px 2px; padding: 14px; }
.inquiry-index-page[aria-pressed=true] { background: #fffdf5; border-color: #819a85; }
.inquiry-index-page strong { display: block; margin: 9px 0; font: 500 18px/1.65 var(--serif); overflow-wrap: anywhere; }
.inquiry-index-page small, .inquiry-index-page > span { display: block; font-size: 11px; color: var(--ink-2); line-height: 1.8; }
.inquiry-index > p { font-size: 12px; line-height: 1.9; color: var(--ink-2); }
.inquiry-paper { padding: 30px 36px; min-width: 0; }
.inquiry-paper h4 { margin: 12px 0; font: 500 28px/1.6 var(--serif); overflow-wrap: anywhere; }
.inquiry-page-meta { display: flex; flex-wrap: wrap; gap: 10px 20px; font-size: 11px; color: var(--ink-2); }
.inquiry-edit { font-size: 12px; padding: 0; margin: 0 0 20px; }
.inquiry-understanding { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; margin: 8px 0 22px; }
.inquiry-understanding section { padding: 18px 20px; background: #f1f2e9; border-top: 2px solid #bac6b3; }
.inquiry-understanding section.has-answer { background: #edf2e7; border-top-color: #6f8b66; }
.inquiry-understanding span { font-size: 11px; color: var(--ink-2); }
.inquiry-understanding p { font: 400 17px/1.9 var(--serif); margin: 10px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.inquiry-next { margin: 24px 0; padding: 18px; border-left: 3px solid #9fb18c; background: #eef2e6; }
.inquiry-next > span { font-size: 11px; color: var(--ink-2); }
.inquiry-next p { font: 400 18px/1.8 var(--serif); margin: 9px 0 12px; overflow-wrap: anywhere; }
.inquiry-next button { padding: 0; font-size: 12px; line-height: 1.8; text-align: left; }
.inquiry-form { display: grid; gap: 18px; }
.inquiry-form label, .clue-form label { display: grid; gap: 9px; font-size: 13px; color: var(--ink-2); line-height: 1.8; }
.inquiry-form small, .clue-form label small { font-size: 11px; }
.inquiry-desk :is(input,textarea) { width: 100%; box-sizing: border-box; border: 1px solid #cad6c3; border-radius: 7px; background: #fffef9; color: var(--ink); padding: 11px 12px; font: inherit; line-height: 1.7; min-width: 0; }
.inquiry-desk textarea { resize: vertical; }
.inquiry-form .field-hint { margin: -8px 0 0; font-size: 12px; line-height: 1.9; color: var(--ink-2); }
.inquiry-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 4px 0 12px; }
.reflection-form { margin: 8px 0 24px; padding: 20px; background: #f0f3e9; border-radius: 8px; }
.inquiry-clues { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--line); }
.inquiry-clues h5 { margin: 0 0 18px; font: 500 21px/1.6 var(--serif); }
.inquiry-clues h5 small { margin-left: 10px; font: 400 11px var(--sans); color: var(--ink-2); }
.inquiry-no-clue { font-size: 13px; line-height: 1.9; color: var(--ink-2); }
.inquiry-clues ol { list-style: none; margin: 0; padding: 0; }
.inquiry-clues li { padding: 18px 0 18px 18px; border-left: 1px solid #b9c8b0; margin: 0 0 12px; }
.inquiry-clues li > div { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--ink-2); }
.inquiry-clues li p { font: 400 17px/1.9 var(--serif); margin: 10px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.inquiry-clues li > small { display: block; font-size: 11px; line-height: 1.9; color: var(--ink-2); overflow-wrap: anywhere; }
.clue-form { display: grid; gap: 15px; padding: 20px; background: #f4f3e9; border-radius: 8px; margin: 20px 0; }
.clue-form button { justify-self: start; }
.inquiry-journeys { margin-top: 25px; border-block: 1px solid var(--line); padding: 15px 0; }
.inquiry-journeys summary { color: var(--primary); font-size: 13px; cursor: pointer; }
.inquiry-journeys p, .inquiry-close p { font-size: 12px; line-height: 1.9; color: var(--ink-2); }
.inquiry-journeys button { display: block; font-size: 13px; line-height: 1.9; text-align: left; padding: 7px 0; }
.inquiry-close { margin-top: 25px; }
.inquiry-notice { font-size: 13px; color: var(--primary); line-height: 1.9; margin-top: 22px; }
.inquiry-empty { padding: 30px 0 42px; }
.inquiry-empty > span { display: block; font: 500 50px/1.2 var(--serif); color: #96a991; }
.inquiry-empty p { font-size: 14px; line-height: 1.9; color: var(--ink-2); margin: 18px 0 24px; }
.inquiry-desk :is(button,input,textarea,summary):focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.inquiry-desk button:disabled { opacity: .5; }
@media (max-width: 700px) {
  .inquiry-heading { display: block; }
  .inquiry-heading h3 { font-size: 25px; }
  .inquiry-heading > span { display: block; margin-top: 12px; }
  .inquiry-layout { grid-template-columns: 1fr; }
  .inquiry-index { padding: 18px; max-height: 300px; overflow: auto; }
  .inquiry-paper { padding: 24px 18px; }
  .inquiry-paper h4 { font-size: 24px; }
  .inquiry-understanding { grid-template-columns: 1fr; gap: 10px; }
  .inquiry-desk :is(input,textarea) { font-size: 16px; }
  .reflection-form, .clue-form { padding: 16px; }
  .inquiry-actions button { font-size: 13px; }
}
</style>
