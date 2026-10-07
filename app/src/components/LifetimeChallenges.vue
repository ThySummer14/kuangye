<script setup>
import { computed, ref, defineAsyncComponent, nextTick } from 'vue';
import { LIFETIME_CHALLENGES } from '../data/lifetime-challenges.js';
import { lifetimeHonors, challengeRecords, isLifetimeChallenge } from '../game/challenges.js';
import { state, taskById, acceptLifetimeChallenge } from '../store.js';
import ChallengeEmblem from './ChallengeEmblem.vue';
import ModalFrame from './ModalFrame.vue';
import '../lifetime-challenger.css';
const ChallengeMedalViewer=defineAsyncComponent(()=>import('./ChallengeMedalViewer.vue'));
const emit=defineEmits(['complete','abandon','toast','back']);
const selected=ref(null),definition=ref(''),error=ref(''),section=ref('all'),gallery=ref(null),heading=ref(null);
const honors=computed(()=>lifetimeHonors(state));
const medals=computed(()=>Object.fromEntries(honors.value.medals.map(m=>[m.id,m])));
const active=computed(()=>state.active.filter(a=>isLifetimeChallenge(taskById[a.qid]?.challenge)));
const records=computed(()=>challengeRecords(state).filter(r=>isLifetimeChallenge(r.challenge)).slice().reverse());
const resting=computed(()=>state.abandoned.filter(a=>isLifetimeChallenge(taskById[a.qid]?.challenge)).slice().reverse());
const shown=computed(()=>LIFETIME_CHALLENGES.filter(op=>section.value!=='earned'||medals.value[op.id].earned));
const current=computed(()=>selected.value&&active.value.find(a=>taskById[a.qid].challenge.operationId===selected.value.id));
const currentDefinition=computed(()=>current.value?taskById[current.value.qid].challenge.definition:'');
const selectedRecords=computed(()=>records.value.filter(r=>r.challenge.operationId===selected.value?.id));
const status=op=>medals.value[op.id].earned?'已刻印':active.value.some(a=>taskById[a.qid].challenge.operationId===op.id)?'正在挑战':'等待你的故事';
function inspect(op){selected.value=op;definition.value='';error.value='';}
async function showGallery(){section.value='all';await nextTick();heading.value?.focus({preventScroll:true});gallery.value?.scrollIntoView({behavior:'instant',block:'start'});}
async function take(){const result=acceptLifetimeChallenge(selected.value.id,definition.value);if(!result.ok){error.value=result.why;return;}error.value='';emit('toast','这一项，开始挑战。可以随时回来继续。');}
function finish(){const a=current.value;selected.value=null;emit('complete',a);}
function rest(){const a=current.value;selected.value=null;emit('abandon',a);}
</script>
<template>
  <div class="challenger lifetime">
    <div class="challenge-location"><button @click="emit('back')">← 任务岩壁</button><span>岩壁北侧 / 个人专辑</span><span class="challenge-open">一生开放</span></div>
    <header class="life-hero">
      <div class="life-hero-copy"><p class="challenge-eyebrow">THE LONG WAY / PERSONAL COLLECTION</p><h2>一生，<br/>去挑战<span>。</span></h2><p class="life-manifesto">十四个想抵达的地方。<br/>用经历，让它们留下刻痕。</p><button class="challenge-primary" @click="showGallery">展开我的挑战 <span aria-hidden="true">↗</span></button><div class="life-hero-edition"><b>01—14</b><span>独立图样 / 专属蚀刻 / 永久收藏</span></div></div>
      <button class="life-hero-object" aria-label="观察越过六百蚀刻章" @click="inspect(LIFETIME_CHALLENGES[0])"><span class="life-orbit" aria-hidden="true"/><span class="life-object-index" aria-hidden="true">01</span><ChallengeEmblem motif="life-cet6" large/><span class="life-object-caption"><b>越过六百</b><small>BEYOND 600</small><em>360° 旋转观察 ↗</em></span></button>
      <div class="life-hero-bottom"><span>挑战由你写下，完成由你确认。</span><span>没有截止日 / 随时继续</span></div>
    </header>
    <section class="life-ledger" aria-label="人生挑战记录"><div><b>{{ String(honors.clears).padStart(2,'0') }}<small> / 14</small></b><span>已刻印的经历</span></div><div><b>{{ String(active.length).padStart(2,'0') }}</b><span>正在挑战</span></div><p>这些愿望一直在这里。<br/>想出发时，就从其中一项开始。</p></section>
    <section v-if="active.length" class="life-active" aria-label="正在挑战的人生项目"><div class="challenge-section-heading"><div><p class="challenge-eyebrow">NOW EXPLORING</p><h3>正在走的路</h3></div><span>共用进行名额 {{ state.active.length }} / 3</span></div><button v-for="a in active" :key="a.qid" :data-life-active="a.qid" @click="inspect(LIFETIME_CHALLENGES.find(op=>op.id===taskById[a.qid].challenge.operationId))"><span>{{ taskById[a.qid].challenge.title }}</span><small>{{ taskById[a.qid].challenge.definition || '按自己写下的目标继续' }}</small><b>继续 / 留下刻印 ↗</b></button></section>
    <section ref="gallery" class="life-gallery"><div class="life-gallery-heading"><div><p class="challenge-eyebrow">FOURTEEN WAYS TO GO BEYOND</p><h3 ref="heading" tabindex="-1">我的挑战，<br class="life-mobile-break"/>各有其形。</h3></div><p>每一项挑战，一枚专属蚀刻章。<br/>点开图样，转动看看它的另一面。</p></div><div class="life-filters" role="group" aria-label="筛选人生挑战"><button :aria-pressed="section==='all'" @click="section='all'">全部挑战 <small>14</small></button><button :aria-pressed="section==='earned'" @click="section='earned'">已刻印 <small>{{ honors.clears }}</small></button><span>THE LONG WAY / VOL. 01</span></div>
      <div v-if="shown.length" class="life-grid"><button v-for="op in shown" :key="op.id" class="life-card" :class="{earned:medals[op.id].earned}" :data-life-operation="op.id" @click="inspect(op)"><div class="life-card-top"><span>{{ op.code }} / {{ op.field }}</span><span>{{ status(op) }}</span></div><div class="life-card-art"><span class="life-card-number" aria-hidden="true">{{ String(op.ordinal).padStart(2,'0') }}</span><ChallengeEmblem :motif="op.id" lazy/></div><div class="life-card-copy"><small>{{ op.english }}</small><h4>{{ op.medalName }} <span aria-hidden="true">↗</span></h4><p>{{ op.title }}</p></div></button></div>
      <div v-else class="challenge-empty"><h4>这里，留给你亲手完成的经历。</h4><p>每一枚图样现在都可以观察。完成对应挑战，就会留下刻印。</p><button class="challenge-primary" @click="showGallery">看看全部挑战 ↗</button></div>
    </section>
    <section v-if="records.length" class="life-records"><p class="challenge-eyebrow">ETCHED IN EXPERIENCE</p><h3>已经发生的故事</h3><article v-for="r in records" :key="r.task.id"><ChallengeEmblem :motif="r.challenge.operationId" lazy/><div><small>{{ r.record.at }} / 已完成</small><h4>{{ r.challenge.title }}</h4><p>{{ r.record.review }}</p><p v-if="r.challenge.definition" class="life-record-definition">我的约定：{{ r.challenge.definition }}</p></div></article></section>
    <details v-if="resting.length" class="challenge-resting"><summary>暂放的尝试 <span>{{ resting.length }}</span></summary><article v-for="r in resting" :key="r.qid"><div><strong>{{ taskById[r.qid].challenge.title }}</strong><p>{{ r.at }} 暂放{{ r.reason?' / '+r.reason:'' }}</p><p v-if="taskById[r.qid].challenge.definition">{{ taskById[r.qid].challenge.definition }}</p></div><button class="challenge-text" @click="inspect(LIFETIME_CHALLENGES.find(op=>op.id===taskById[r.qid].challenge.operationId))">再次出发 ↗</button></article></details>
    <footer class="life-footer"><p>愿有一天，<br/>这些图样都成为你的故事。</p><span>THE LONG WAY<br/>旷野 / 挑战者</span></footer>
    <ModalFrame v-if="selected" :label="selected.title+' / '+selected.medalName" class="challenge-dialog life-dialog" @close="selected=null"><div class="life-detail"><ChallengeMedalViewer :key="selected.id" :motif="selected.id" :name="selected.medalName"/><div class="life-detail-copy"><p class="challenge-eyebrow">{{ selected.code }} / {{ medals[selected.id].earned?'已刻印':'专属图样' }}</p><h2>{{ selected.medalName }}</h2><p class="life-inscription">{{ selected.inscription }}</p><div class="life-objective"><small>我的挑战</small><h3>{{ selected.title }}</h3><p>{{ selected.objective }}</p></div>
      <template v-if="current"><p v-if="currentDefinition" class="life-definition">我的约定：{{ currentDefinition }}</p><p class="challenge-note">{{ current.start }} 开始。这一项正在挑战中。</p><div class="life-detail-actions"><button class="challenge-primary" @click="finish">我完成了，留下刻印 ↗</button><button class="challenge-text" @click="rest">先放一放</button></div></template>
      <template v-else><label class="life-definition-label" for="life-definition">{{ selected.needsDefinition?'这一次，我想学会什么？':'写下自己的完成约定' }} <small>{{ selected.needsDefinition?'开始前填写':'可选' }}</small></label><textarea id="life-definition" v-model="definition" maxlength="240" :placeholder="selected.definitionPrompt" :aria-required="selected.needsDefinition" :aria-invalid="!!error" :aria-describedby="error?'life-error':undefined" rows="3"/><p v-if="error" id="life-error" role="alert">{{ error }}</p><button class="challenge-primary life-start" :disabled="state.active.length>=3" @click="take">{{ state.active.length>=3?'手里已有 3 件事':medals[selected.id].earned?'再挑战一次 ↗':'开始这一项挑战 ↗' }}</button><p class="challenge-note">{{ state.active.length>=3?'先完成或暂放手里的事，这份挑战会一直在。':'没有截止日，可以暂放再来。完成后，这枚章就有了你的经历。' }}</p></template>
      <div v-if="selectedRecords.length" class="life-detail-history"><small>我的刻印记录</small><article v-for="r in selectedRecords" :key="r.task.id"><b>{{ r.record.at }}</b><p>{{ r.record.review }}</p><p v-if="r.challenge.definition">{{ r.challenge.definition }}</p></article></div>
    </div></div></ModalFrame>
  </div>
</template>
