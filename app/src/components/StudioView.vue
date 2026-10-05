<script setup>
import { ref, computed } from 'vue';
import { state, taskById, activeOf, openStudioWork, continueStudioWork, displayStudioWork } from '../store.js';
import { STUDIO_THEMES, STUDIO_EXERCISES, studioTheme } from '../data/studio.js';
import { studioStatus, studioReady } from '../game/studio.js';
import { albumDocument, workCard, downloadStudioFile } from '../services/studio-media.js';
import ModalFrame from './ModalFrame.vue';
import StudioWorkEditor from './StudioWorkEditor.vue';
import StudioWorkPreview from './StudioWorkPreview.vue';
const props = defineProps({ focusWork: String, album: Boolean });
const emit = defineEmits(['toast', 'complete', 'abandon', 'home']);
const page = ref(props.album || props.focusWork ? 'works' : 'start'), selected = ref(props.focusWork || ''), editing = ref(false);
const starting = ref(null), title = ref(''), criterion = ref(''), error = ref(''), exporting = ref(false), includeNote = ref(false);
const works = computed(() => state.home.studio.works);
const completed = computed(() => works.value.filter(work => studioStatus(work, state) === 'done'));
const work = computed(() => works.value.find(work => work.id === selected.value));
const status = computed(() => work.value ? studioStatus(work.value, state) : '');
const active = computed(() => work.value ? activeOf(work.value.taskIds.at(-1)) : null);
const exercise = computed(() => STUDIO_EXERCISES.find(item => item.id === work.value?.exerciseId));
const emotionLink = './emotion-lab.html' + location.search;
const statusLabel = work => ({ working: '正在做', rest: '先放着', done: '已收好' }[studioStatus(work, state)]);
function inspect(item = {}) { starting.value = item; title.value = item.title || ''; criterion.value = item.criterion || ''; error.value = ''; }
function take() {
  const result = openStudioWork({ title: title.value, criterion: criterion.value, theme: starting.value.theme || 'own', exerciseId: starting.value.id || '', step: starting.value.steps?.[0] || '' });
  if (!result.ok) { error.value = result.why; return; }
  starting.value = null; selected.value = result.work.id; page.value = 'works'; editing.value = true;
  emit('toast', '这件作品，按你自己的节奏开始。');
}
function open(id) { selected.value = id; editing.value = false; includeNote.value = false; error.value = ''; }
function resume() {
  const result = continueStudioWork(work.value.id);
  if (!result.ok) { error.value = result.why; return; }
  editing.value = true; error.value = ''; emit('toast', '作品和之前的记录都在，接着做吧。');
}
function display() {
  const takingBack = state.home.studio.displayId === work.value.id;
  const result = displayStudioWork(takingBack ? '' : work.value.id);
  if (!result.ok) { error.value = result.why; return; }
  emit('toast', takingBack ? '收回到作品集了，作品和记录都还在。' : '这件作品，陈列到小家了。');
}
async function exportWork() {
  exporting.value = true; error.value = '';
  try { downloadStudioFile(await workCard(work.value, { includeNote: includeNote.value }), '旷野-作品卡片.png', 'image/png'); }
  catch (err) { error.value = err.message; }
  finally { exporting.value = false; }
}
function exportAlbum() {
  downloadStudioFile(albumDocument(completed.value, { includeNote: includeNote.value }), '旷野-我的作品集.html', 'text/html;charset=utf-8');
}
</script>
<template>
  <div class="studio">
    <header class="studio-heading"><div><span class="eyebrow">把自己做出的东西留下来</span><h2>从一小步，到一件作品。</h2><p>带着一个想法出门，把做出的那一版带回来。这里收下文字、照片、图画，也收下第一次尝试。</p></div><div class="studio-tally"><strong>{{ completed.length }}</strong><span>件作品，已经收好</span><small>手里 {{ state.active.length }} / 3 件事</small></div></header>
    <div class="place-tabs" role="group" aria-label="画室内的去处"><button :class="{active:page==='start'}" :aria-pressed="page==='start'" @click="page='start'; selected=''">开始创作</button><button :class="{active:page==='works'}" :aria-pressed="page==='works'" @click="page='works'; selected=''">我的作品集 · {{ works.length }}</button></div>
    <template v-if="page==='start'">
      <section class="studio-own"><div><h3>已经有想做的东西？</h3><p>给它一个名字，写清做到哪一步就算完成。</p></div><button class="primary-button" @click="inspect()">开始自己的作品 ＋</button></section>
      <p v-if="STUDIO_EXERCISES.length" class="studio-caption">也可以从下面挑一个起点。约需的时间只供安排，不计时；主题里没有必须完成的顺序。<span>练习文案 · 本地试用</span></p>
      <p v-else class="studio-caption">练习小册还在整理，你可以先开始自己的作品。</p>
      <section v-for="theme in STUDIO_THEMES.filter(t=>STUDIO_EXERCISES.some(e=>e.theme===t.id))" :key="theme.id" class="studio-theme" :style="{'--theme-color':theme.color}">
        <div class="theme-heading"><span>{{ theme.medium }}</span><h3>{{ theme.title }}</h3><p>{{ theme.note }}</p></div>
        <div class="exercise-list"><button v-for="(item,i) in STUDIO_EXERCISES.filter(e=>e.theme===theme.id)" :key="item.id" class="exercise" :data-exercise="item.id" @click="inspect(item)"><span class="exercise-number">0{{ i+1 }}</span><div><strong>{{ item.title }}</strong><p>{{ item.premise }}</p></div><span class="exercise-time">约 {{ item.minutes }} 分钟 <i aria-hidden="true">↗</i></span></button></div>
      </section>
    </template>
    <template v-else-if="work">
      <button class="text-button studio-back" @click="selected=''; editing=false">← 回到作品集</button>
      <div class="work-layout" :data-studio-work="work.id">
        <section class="work-page"><StudioWorkEditor v-if="status!=='done' || editing" :key="work.id" :work="work" @saved="emit('toast','这一版，保存好了。')" /><StudioWorkPreview v-else :work="work" /></section>
        <aside class="work-sidebar"><span class="work-state">{{ statusLabel(work) }} · {{ studioTheme(work.theme)?.title || '自己的想法' }}</span><h3>{{ work.title }}</h3><p class="work-criterion"><strong>做到这里，就可以收好</strong>{{ taskById[work.taskIds.at(-1)]?.desc }}</p>
          <details v-if="exercise" class="work-guide" open><summary>出发时的小提示</summary><ol><li v-for="step in exercise.steps" :key="step">{{ step }}</li></ol></details>
          <template v-if="status==='working'"><p class="work-help">先去创作。带回正文或图片，再记下完成的这一刻。</p><button class="primary-button" :disabled="!studioReady(work)" @click="editing=false; emit('complete',active)">我做好了，收好这件作品</button><button class="text-button" @click="emit('abandon',active)">先放一放</button></template>
          <template v-else-if="status==='rest'"><p class="work-help">成果还在。继续时，会接下一件同条件的小事；原任务记录也保留着。</p><button class="primary-button" :disabled="state.active.length>=3" @click="resume">接着做这件作品</button><small v-if="state.active.length>=3">手里已有三件事，先为创作留一个位置。</small></template>
          <template v-else><p v-if="work.note && !editing" class="private-note"><strong>留给自己的话</strong>{{ work.note }}</p><button class="soft-button" @click="editing=!editing">{{ editing ? '看作品成稿' : '再改一改这一版' }}</button><button class="primary-button" @click="display">{{ state.home.studio.displayId===work.id ? '从小家收回这件作品' : '陈列到小家' }}</button><button class="text-button" @click="emit('home')">去小家看看 ↗</button><div class="export-options"><label><input v-model="includeNote" type="checkbox" /> 导出时带上留给自己的话</label><button class="soft-button" :disabled="exporting" @click="exportWork">{{ exporting ? '正在做卡片…' : '导出这一件的 PNG 卡片' }}</button><p>卡片选取第一张图和一页正文。整本作品集保留全部图片与文字。</p><button class="text-button" @click="exportAlbum">导出 {{ completed.length }} 件作品的 HTML 作品集 ↗</button></div></template>
          <p v-if="error" role="alert" class="studio-error">{{ error }}</p>
        </aside>
      </div>
    </template>
    <template v-else>
      <div class="album-heading"><div><h3>一页一页，慢慢积起来。</h3><p>{{ works.length ? '正在做的、放一放的和已经收好的，都留在这里。' : '还没有作品。去做出第一版，再把它带回来。' }}</p></div><button class="soft-button" @click="page='start'">去找一个起点 ↗</button></div>
      <div class="album-grid"><button v-for="item in works" :key="item.id" :data-work="item.id" class="album-work" @click="open(item.id)"><div class="album-cover"><img v-if="item.images.length" :src="item.images[0]" :alt="item.title" /><p v-else>{{ item.body || '第一版还在路上。' }}</p></div><span>{{ statusLabel(item) }} · {{ item.created }}</span><h3>{{ item.title }}</h3><small>{{ studioTheme(item.theme)?.medium || '自己的想法' }} ↗</small></button></div>
      <div v-if="completed.length" class="album-export"><label><input v-model="includeNote" type="checkbox" /> 导出时带上留给自己的话</label><button class="soft-button" @click="exportAlbum">导出整本作品集 · {{ completed.length }} 件</button><p>独立 HTML 文件可在浏览器打开、打印，包含完整正文和图片。</p></div>
    </template>
    <footer class="studio-footer"><span>作品随成长手记的整份备份一起保存。换设备前，记得导出备份。</span><a :href="emotionLink">看看小芽的形象试验台 ↗</a></footer>
    <ModalFrame v-if="starting" label="开始一件作品" @close="starting=null"><span class="eyebrow">{{ starting.id ? '一个创作起点 · 本地试用' : '从自己的想法开始' }}</span><h2>{{ starting.title || '这次，想做出什么？' }}</h2><p v-if="starting.premise">{{ starting.premise }}</p><ol v-if="starting.steps" class="starting-steps"><li v-for="step in starting.steps" :key="step">{{ step }}</li></ol><form class="studio-start-form" @submit.prevent="take"><label for="studio-start-title">给作品一个名字</label><input id="studio-start-title" v-model="title" maxlength="60" required placeholder="比如：窗边的三个颜色" /><label for="studio-start-criterion">做到什么，就可以完成</label><textarea id="studio-start-criterion" v-model="criterion" maxlength="160" rows="3" required placeholder="写清最后会做出什么，而不只是一个愿望。" /><p>和岩壁共用三个任务名额。按自己的条件完成，不额外发任务光或 XP。</p><p v-if="error" role="alert" class="studio-error">{{ error }}</p><div class="placement-actions"><button type="button" class="text-button" @click="starting=null">先看看</button><button class="primary-button" type="submit">接下这件创作</button></div></form></ModalFrame>
  </div>
</template>
<style scoped>
.studio { max-width: 1080px; margin: auto; }
.studio-heading { display: grid; grid-template-columns: 1fr 180px; gap: 48px; padding: 12px 0 28px; }
.studio-heading h2 { font: 500 clamp(29px,3.4vw,40px)/1.4 var(--serif); margin: 14px 0; }
.studio-heading p { max-width: 570px; color: var(--ink-2); line-height: 1.9; font-size: 14px; }
.studio-tally { align-self: center; border-left: 1px solid var(--line-2); padding-left: 28px; display: grid; gap: 7px; font-size: 13px; color: var(--ink-2); }
.studio-tally strong { font: 500 48px var(--serif); color: var(--primary); }
.studio-tally small { color: var(--ink-3); font-size: 11px; }
.studio-own { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 28px 0; padding: 22px 26px; background: var(--moss-wash); border: 1px solid var(--line); }
.studio-own h3,.album-heading h3 { font: 500 23px/1.5 var(--serif); margin: 0 0 8px; }
.studio-own p,.album-heading p { margin: 0; font-size: 13px; color: var(--ink-2); line-height: 1.8; }
.studio-caption { font-size: 12px; line-height: 1.9; color: var(--ink-3); margin: 22px 0 32px; }
.studio-caption span { display: block; margin-top: 4px; }
.studio-theme { display: grid; grid-template-columns: 230px 1fr; gap: 34px; padding: 30px 0; border-top: 1px solid var(--line-2); }
.theme-heading span { font-size: 12px; color: var(--theme-color); }
.theme-heading h3 { font: 500 25px/1.5 var(--serif); margin: 10px 0; }
.theme-heading p { font-size: 13px; color: var(--ink-3); line-height: 1.9; }
.exercise-list { min-width: 0; }
.exercise { display: grid; grid-template-columns: 34px 1fr 102px; gap: 14px; text-align: left; align-items: start; width: 100%; border: 0; border-bottom: 1px dashed var(--line); background: transparent; color: var(--ink); padding: 19px 10px; cursor: pointer; font: inherit; }
.exercise:last-child { border-bottom: 0; }
.exercise:hover { background: var(--card); }
.exercise-number { color: var(--theme-color); font: 500 22px var(--serif); }
.exercise strong { font-size: 15px; font-weight: 500; }
.exercise p { margin: 8px 0 0; font-size: 12px; color: var(--ink-3); line-height: 1.8; }
.exercise-time { font-size: 11px; color: var(--ink-3); text-align: right; padding-top: 3px; }
.exercise-time i { font-style: normal; margin-left: 7px; color: var(--theme-color); }
.studio-back { margin: 20px 0; }
.work-layout { display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 40px; }
.work-page { min-width: 0; }
.work-sidebar { min-width: 0; }
.work-state { font-size: 11px; color: var(--primary); }
.work-sidebar h3 { font: 500 25px/1.5 var(--serif); margin: 12px 0 22px; overflow-wrap: anywhere; }
.work-criterion,.private-note { font-size: 13px; line-height: 1.9; white-space: pre-wrap; overflow-wrap: anywhere; border-left: 2px solid var(--sage); padding-left: 16px; }
.work-criterion strong,.private-note strong { display: block; font-size: 11px; color: var(--ink-3); margin-bottom: 7px; }
.work-guide { margin: 24px 0; font-size: 12px; line-height: 1.9; color: var(--ink-2); }
.work-guide summary { cursor: pointer; color: var(--primary); }
.work-guide ol { padding-left: 20px; }
.work-guide li { margin: 7px 0; }
.work-help { font-size: 13px; line-height: 1.9; color: var(--ink-2); margin-top: 26px; }
.work-sidebar > button { display: block; margin-top: 12px; max-width: 100%; }
.work-sidebar > small { font-size: 12px; color: var(--ink-3); display: block; margin-top: 12px; line-height: 1.8; }
.export-options { border-top: 1px solid var(--line); margin-top: 24px; padding-top: 20px; }
.export-options label,.album-export label { font-size: 12px; display: block; margin-bottom: 16px; line-height: 1.8; }
.export-options p,.album-export p { font-size: 11px; line-height: 1.8; color: var(--ink-3); }
.export-options button { text-align: left; max-width: 100%; }
.album-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 30px 0; }
.album-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 24px; }
.album-work { min-width: 0; padding: 0 0 20px; border: 0; border-bottom: 1px solid var(--line-2); text-align: left; background: transparent; cursor: pointer; font: inherit; color: var(--ink); }
.album-cover { height: 220px; background: var(--card); border: 1px solid var(--line); overflow: hidden; margin-bottom: 16px; }
.album-cover img { width: 100%; height: 100%; object-fit: contain; }
.album-cover p { padding: 24px; white-space: pre-wrap; overflow-wrap: anywhere; font: 14px/2 var(--serif); margin: 0; color: var(--ink-2); }
.album-work span,.album-work small { font-size: 11px; color: var(--ink-3); }
.album-work h3 { font: 500 21px/1.5 var(--serif); margin: 9px 0; overflow-wrap: anywhere; }
.album-export { margin: 36px 0; padding-top: 24px; border-top: 1px solid var(--line); }
.studio-footer { border-top: 1px dashed var(--line-2); margin-top: 48px; padding-top: 20px; display: flex; justify-content: space-between; gap: 18px; font-size: 11px; line-height: 1.9; color: var(--ink-3); }
.studio-footer a { flex-shrink: 0; color: var(--primary); }
.studio-error { color: var(--ember); font-size: 13px; line-height: 1.8; }
.starting-steps { padding-left: 24px; font-size: 13px; line-height: 1.9; color: var(--ink-2); }
.starting-steps li { margin: 9px 0; }
.studio-start-form label { display: block; font-size: 13px; margin: 20px 0 8px; }
.studio-start-form input,.studio-start-form textarea { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid var(--line-2); background: var(--card); color: var(--ink); font: 14px/1.8 var(--sans); border-radius: var(--r-s); }
.studio-start-form p { font-size: 12px; line-height: 1.8; color: var(--ink-3); }
@media(max-width:760px) { .studio-heading { grid-template-columns: 1fr; gap: 14px; } .studio-tally { display: flex; gap: 14px; align-items: baseline; border: 0; padding: 0; } .studio-tally strong { font-size: 30px; } .studio-theme { grid-template-columns: 1fr; gap: 8px; } .work-layout { grid-template-columns: 1fr; gap: 28px; } .work-sidebar { border-top: 1px solid var(--line); padding-top: 24px; } .album-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media(max-width:500px) { .studio-own,.album-heading { align-items: start; flex-direction: column; padding-inline: 20px; } .album-heading { padding-inline: 0; } .exercise { grid-template-columns: 26px 1fr; gap: 12px; padding-inline: 0; } .exercise-time { grid-column: 2; text-align: left; } .album-grid { grid-template-columns: 1fr; } .album-cover { height: 230px; } .studio-footer { flex-direction: column; } }
</style>
