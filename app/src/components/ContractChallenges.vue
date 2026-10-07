<script setup>
import { computed, ref, nextTick, defineAsyncComponent } from 'vue';
import { CHALLENGE_OPERATIONS } from '../data/challenges.js';
import { challengeBrief, challengeRating, challengeCriteria, challengeHonors, challengeRecords, isLifetimeChallenge } from '../game/challenges.js';
import { state, taskById, acceptChallenge } from '../store.js';
import ChallengeEmblem from './ChallengeEmblem.vue';
import ModalFrame from './ModalFrame.vue';
import '../challenger.css';
const ChallengeMedalViewer = defineAsyncComponent(() => import('./ChallengeMedalViewer.vue'));
const emit = defineEmits(['complete', 'abandon', 'toast', 'back']);
const section = ref('operations'), filter = ref('all'), selected = ref(null), selectedTerms = ref([]), medal = ref(null), error = ref('');
const sectionHeading = ref(null), activeHeading = ref(null);
const filters = [{ id: 'all', label: '全部挑战' }, { id: 'mind', label: '头脑' }, { id: 'create', label: '创造' }, { id: 'courage', label: '勇气' }, { id: 'live', label: '生活' }];
const operations = computed(() => CHALLENGE_OPERATIONS.filter(op => filter.value === 'all' || op.category === filter.value));
const honors = computed(() => challengeHonors(state));
const records = computed(() => challengeRecords(state).filter(r=>!isLifetimeChallenge(r.challenge)).slice().reverse());
const active = computed(() => state.active.filter(a => taskById[a.qid]?.challenge && !isLifetimeChallenge(taskById[a.qid].challenge)));
const resting = computed(() => state.abandoned.filter(a => taskById[a.qid]?.challenge && !isLifetimeChallenge(taskById[a.qid].challenge)).slice().reverse());
const chosen = computed(() => selected.value ? challengeBrief(selected.value.id, selectedTerms.value).challenge : null);
const currentRating = computed(() => chosen.value ? challengeRating(chosen.value) : 0);
const currentActive = computed(() => selected.value && active.value.some(a => taskById[a.qid].challenge.operationId === selected.value.id));
const available = computed(() => !currentActive.value && state.active.length < 3);
function inspect(op) { selected.value = op; selectedTerms.value = []; error.value = ''; }
async function switchSection(id) { section.value = id; await nextTick(); sectionHeading.value?.focus({ preventScroll: true }); }
async function goOperations() { await switchSection('operations'); sectionHeading.value?.scrollIntoView({ block: 'start', behavior: 'instant' }); }
async function take() {
  const result = acceptChallenge(selected.value.id, selectedTerms.value);
  if (!result.ok) { error.value = result.why; return; }
  selected.value = null;
  emit('toast', '挑战已接下。去现实里完成它，带着结果回来。');
  await nextTick(); activeHeading.value?.focus({ preventScroll: true }); activeHeading.value?.scrollIntoView({ block: 'start', behavior: 'instant' });
}
const bestFor = id => Math.max(0, ...records.value.filter(r => r.challenge.operationId === id).map(r => r.rating));
</script>
<template>
  <div class="challenger">
    <div class="challenge-location"><button @click="emit('back')">← 任务岩壁</button><span>岩壁北侧 / 挑战专辑</span><span class="challenge-open">常驻开放</span></div>
    <header class="challenge-hero">
      <div class="challenge-hero-copy">
        <p class="challenge-eyebrow">THE CHALLENGER / 越界行动</p>
        <h2>挑战者<span class="title-period">.</span></h2>
        <p class="challenge-manifesto">向自己的边界，<br/>再走一步。</p>
        <p class="challenge-hero-note">选择一件难事，亲手提高难度。<br/>这里的每一道刻痕，都来自真实的突破。</p>
        <button class="challenge-primary hero-cta" @click="goOperations">选择我的挑战 <span aria-hidden="true">↗</span></button>
      </div>
      <div class="challenge-hero-art">
        <div class="challenge-orbit orbit-one"/><div class="challenge-orbit orbit-two"/>
        <span class="hero-giant-word" aria-hidden="true">BEYOND</span>
        <button class="hero-emblem" aria-label="旋转观察临界之上蚀刻章" @click="medal=honors.medals.find(m=>m.id==='summit')"><ChallengeEmblem motif="summit" large /></button>
        <div class="hero-art-caption"><span>临界之上</span><small>CHALLENGE RATING 12</small><button class="hero-inspect-link" @click="medal=honors.medals.find(m=>m.id==='summit')">360° 旋转观察 ↗</button></div>
      </div>
      <div class="hero-foot"><span>挑战由你选择，边界由你定义。</span><span>可暂放 · 可重试 · 不限时</span></div>
    </header>
    <section class="challenge-stats" aria-label="我的挑战记录">
      <div><span>个人最高挑战等级</span><strong>{{ String(honors.best).padStart(2,'0') }}</strong><small>{{ honors.best ? '由已完成的行动记录' : '等待第一次突破' }}</small></div>
      <div><span>已完成行动</span><strong>{{ String(honors.clears).padStart(2,'0') }}</strong><small>每次尝试都留下自己的版本</small></div>
      <button @click="switchSection('medals')"><span>已刻印蚀刻章</span><strong>{{ String(honors.medals.filter(m=>m.earned).length).padStart(2,'0') }}<em> / 04</em></strong><small>查看我的荣誉 ↗</small></button>
    </section>
    <section v-if="active.length" class="challenge-active" aria-label="进行中的挑战">
      <div class="challenge-section-heading"><div><p class="challenge-eyebrow">IN PROGRESS</p><h3 ref="activeHeading" tabindex="-1">正在越界</h3></div><span>共用名额 {{ state.active.length }} / 3</span></div>
      <article v-for="a in active" :key="a.qid" :data-challenge-active="a.qid">
        <span class="active-rating">{{ String(challengeRating(taskById[a.qid].challenge)).padStart(2,'0') }}</span>
        <div class="active-brief"><span class="challenge-eyebrow">{{ a.start }} 接取</span><h4>{{ taskById[a.qid].challenge.title }}</h4><ul><li v-for="c in challengeCriteria(taskById[a.qid].challenge)" :key="c.id">{{ c.condition }}</li></ul><div class="challenge-actions"><button class="challenge-primary" @click="emit('complete',a)">我完成了，留下刻印 ↗</button><button class="challenge-text" @click="emit('abandon',a)">先放一放</button></div></div>
      </article>
    </section>
    <nav class="challenge-tabs" aria-label="挑战者专辑内容">
      <button :aria-pressed="section==='operations'" @click="switchSection('operations')">挑战一览 <small>06</small></button>
      <button :aria-pressed="section==='medals'" @click="switchSection('medals')">蚀刻章 <small>04</small></button>
      <button :aria-pressed="section==='records'" @click="switchSection('records')">行动档案 <small>{{ records.length }}</small></button>
    </nav>
    <section class="challenge-content" :key="section">
      <div class="challenge-section-heading"><div><p class="challenge-eyebrow">{{ section==='operations'?'CHOOSE YOUR LIMIT':section==='medals'?'ETCHED IN EXPERIENCE':'YOUR OWN RECORD' }}</p><h3 ref="sectionHeading" tabindex="-1">{{ section==='operations'?'挑一件，真正的难事。':section==='medals'?'让突破，有迹可循。':'你走过的边界。' }}</h3></div><p>{{ section==='operations'?'基础目标已经足够认真。想再进一步，就叠加条件。':section==='medals'?'章属于完成挑战的你。每一枚都永久保留。':'每次接取的条件与结果，原样保留在这里。' }}</p></div>
      <template v-if="section==='operations'">
        <div class="challenge-filters" role="group" aria-label="筛选挑战领域"><button v-for="f in filters" :key="f.id" :aria-pressed="filter===f.id" @click="filter=f.id">{{ f.label }}</button></div>
        <div class="operation-grid">
          <button v-for="op in operations" :key="op.id" class="operation-card" :data-operation="op.id" @click="inspect(op)">
            <div class="operation-meta"><span>{{ op.code }} / {{ op.field }}</span><span v-if="bestFor(op.id)">最佳 {{ bestFor(op.id) }}</span><span v-else>尚未突破</span></div>
            <div class="operation-title"><h4>{{ op.title }}</h4><span class="operation-arrow" aria-hidden="true">↗</span></div>
            <p>{{ op.premise }}</p><div class="operation-bottom"><span>基础等级 <b>{{ String(op.rating).padStart(2,'0') }}</b><i aria-hidden="true"><em v-for="n in 6" :key="n" :class="{on:n<=op.rating}" /></i></span><small>{{ op.duration }}</small></div>
          </button>
        </div>
        <div class="challenge-principles"><b>对手，是昨天的自己。</b><p>等级只记录你选择的条件，不衡量人的价值。可以分段、可以暂停，完成之前，随时回来。</p></div>
      </template>
      <template v-else-if="section==='medals'">
        <div class="challenge-medals"><button v-for="m in honors.medals" :key="m.id" class="challenge-medal" :class="{earned:m.earned}" :data-medal="m.id" @click="medal=m"><div class="medal-art"><ChallengeEmblem :motif="m.motif" :locked="!m.earned" /></div><span class="medal-state">{{ m.earned?'已刻印':'尚未刻印' }}</span><h4>{{ m.name }}</h4><small>{{ m.english }}</small><p>{{ m.condition }}</p><span class="medal-progress">{{ m.progress }} / {{ m.target }} <span>360° 观察 ↗</span></span></button></div>
        <p class="challenge-note">蚀刻章只记录荣誉，不能购买，不额外发光或 XP。挑战完成仍计入当天的微光。</p>
      </template>
      <template v-else>
        <div v-if="!records.length" class="challenge-empty"><span aria-hidden="true">↗</span><h4>下一页，留给你的第一次突破。</h4><p>完成后，实际结果和当时选择的条件会一起留下。</p><button class="challenge-primary" @click="goOperations">去挑一项挑战</button></div>
        <article v-for="r in records" :key="r.task.id" class="challenge-record"><span class="record-rating">{{ String(r.rating).padStart(2,'0') }}</span><div><span class="challenge-eyebrow">{{ r.record.at }} / 已完成</span><h4>{{ r.challenge.title }}</h4><p class="record-review">{{ r.record.review }}</p><details><summary>查看当时的挑战条件</summary><ul><li v-for="c in challengeCriteria(r.challenge)" :key="c.id">{{ c.condition }}</li></ul></details></div></article>
        <details v-if="resting.length" class="challenge-resting"><summary>暂放的尝试 <span>{{ resting.length }}</span></summary><article v-for="r in resting" :key="r.qid"><div><strong>{{ taskById[r.qid].title }}</strong><p>{{ r.at }} 暂放{{ r.reason?' / '+r.reason:'' }}</p><details><summary>查看当时的挑战条件</summary><ul><li v-for="c in challengeCriteria(taskById[r.qid].challenge)" :key="c.id">{{ c.condition }}</li></ul></details></div><button class="challenge-text" @click="goOperations">重新选择条件 ↗</button></article></details>
      </template>
    </section>
    <footer class="challenge-footer"><strong>KEEP GOING. ON YOUR TERMS.</strong><span>旷野 / 挑战者</span><small>本专辑内容试用中，欢迎带着真实体验回来。</small></footer>
    <ModalFrame v-if="selected" :label="'配置挑战：'+selected.title" class="challenge-dialog" @close="selected=null">
      <p class="challenge-eyebrow">{{ selected.code }} / {{ selected.field }}</p><h2>{{ selected.title }}</h2><p class="challenge-modal-premise">{{ selected.premise }}</p>
      <div class="challenge-objective"><span>基础目标 / 等级 {{ selected.rating }}</span><p>{{ selected.objective }}</p><small>{{ selected.firstStep }}</small></div>
      <h3 class="terms-title">给自己加码 <small>可选，可叠加</small></h3>
      <div class="challenge-terms"><label v-for="t in selected.terms" :key="t.id" :class="{selected:selectedTerms.includes(t.id)}"><input v-model="selectedTerms" type="checkbox" :value="t.id"/><span><strong>{{ t.title }}</strong><small>{{ t.condition }}</small></span><b>+{{ t.weight }}</b></label></div>
      <div class="challenge-commit"><div class="challenge-rating" aria-live="polite"><span>本次挑战等级</span><strong :key="currentRating">{{ String(currentRating).padStart(2,'0') }}</strong></div><div><p>接取后保留这一组条件。<br/>完成全部条件，再记录结果。</p><button class="challenge-primary" :disabled="!available" @click="take">{{ currentActive?'此项目正在进行':state.active.length>=3?'手里已经有 3 件事':'接下挑战' }} <span v-if="available" aria-hidden="true">↗</span></button></div></div>
      <p v-if="!available" class="challenge-note">{{ currentActive?'关闭面板，继续本次行动；想换条件可以先放下。':'可以先查看条件，完成或暂放手里的事后再接取。' }}</p><p v-if="error" role="alert">{{ error }}</p><p class="challenge-note">完成后按条件留下蚀刻章。可暂放重试，不扣款，不限时。</p>
    </ModalFrame>
    <ModalFrame v-if="medal" :label="medal.name+'蚀刻章'" class="challenge-dialog medal-dialog" @close="medal=null">
      <div class="medal-inspect"><ChallengeMedalViewer :key="medal.id" :motif="medal.motif" :name="medal.name"/><div class="medal-inspect-copy"><span class="challenge-eyebrow">{{ medal.earned?'已刻印':'图样预览 / 尚未获得' }}</span><h2>{{ medal.name }}</h2><p>{{ medal.inscription }}</p><div class="medal-condition"><span>刻印条件</span><strong>{{ medal.condition }}</strong><small>当前进度 {{ medal.progress }} / {{ medal.target }}</small></div><button class="challenge-primary" @click="medal=null;goOperations()">查看挑战一览 ↗</button></div></div>
    </ModalFrame>
  </div>
</template>
