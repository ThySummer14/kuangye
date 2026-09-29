<script setup>
import { computed, ref, shallowRef, watch, nextTick } from 'vue';
import { state, taskById, canAccept, accept, nextChainStage } from '../store.js';
import { CATS, TASKS } from '../data/tasks.js';
import { fieldGuide } from '../data/field-guides.js';
import { journalRecords, journalMonths, linkedMemoryRecord } from '../game/journal.js';
import TaskGuide from './TaskGuide.vue';
const props=defineProps({focusMemory:Object});
const emit = defineEmits(['toast','back-furniture']);
const linkedElement=ref(null);
const linkedRecord=computed(()=>linkedMemoryRecord(state.done,props.focusMemory));
const filter = ref('done'), cat = ref('all'), query = ref(''), onlyNotes = ref(false), limit = ref(12);
const inspecting = shallowRef(null);
const continuationLink = ref(null);
const allDone = computed(() => journalRecords(state.done, taskById));
const source = computed(() => filter.value === 'done' ? state.done : state.abandoned);
const records = computed(() => journalRecords(source.value, taskById, {cat: cat.value, query: query.value, onlyNotes: onlyNotes.value}));
const months = computed(() => journalMonths(records.value.slice(0, limit.value)));
const counts = computed(() => Object.fromEntries(Object.keys(CATS).map(id => [id, source.value.filter(d => taskById[d.qid]?.cat === id).length])));
const reflection = computed(() => allDone.value.find(({record, task}) => record.review?.trim() && (cat.value === 'all' || task?.cat === cat.value)));
const first = computed(() => allDone.value.at(-1));
const domains = computed(() => new Set(allDone.value.map(d => d.task?.cat).filter(Boolean)).size);
const focusTask = computed(() => allDone.value.find(({task}) => cat.value === 'all' || task?.cat === cat.value)?.task);
const nextTask = computed(() => {
  if (!focusTask.value) return null;
  const next = nextChainStage(focusTask.value);
  if (next && canAccept(next).ok) return next;
  return TASKS.find(t => t.cat === focusTask.value.cat && ['E', 'D'].includes(t.diff) && canAccept(t).ok) || null;
});
watch([filter, cat, query, onlyNotes], () => { limit.value = 12; });
function clearFilters() { cat.value = 'all'; query.value = ''; onlyNotes.value = false; }
function monthLabel(month) { const match = /^(\d{4})-(\d{2})$/.exec(month); return match ? `${match[1]} 年 ${Number(match[2])} 月` : month; }
async function take(task) {
  if (!accept(task)) { emit('toast', canAccept(task).why); return; }
  inspecting.value = null;
  emit('toast', `已接下「${task.title}」。第一步在任务岩壁等你。`);
  await nextTick();
  continuationLink.value?.focus();
}
watch(()=>props.focusMemory,async memory=>{
  if(!memory)return;
  filter.value='done';clearFilters();await nextTick();
  const index=records.value.findIndex(entry=>entry.record===linkedRecord.value);
  if(index<0)return;
  limit.value=Math.max(12,index+1);await nextTick();
  linkedElement.value?.scrollIntoView({block:'center'});
  linkedElement.value?.focus({preventScroll:true});
},{immediate:true});
function linkElement(el,record) { if(record===linkedRecord.value)linkedElement.value=el; }
</script>
<template>
  <div class="memory-notebook">
    <div v-if="focusMemory" class="memory-return"><p>{{ linkedRecord?'从「'+focusMemory.name+'」翻来的这一页，已在下方标记。':'这件家具的铭牌仍在，暂时没有找到对应记录。' }}</p><button v-if="!linkedRecord" class="soft-button" @click="emit('back-furniture')">回到这件家具 ↗</button></div>
    <section v-if="allDone.length" class="memory-overview" aria-label="走过的路">
      <div><span>已经走过的路</span><h3>{{ allDone.length }} 件事，成为了你的经历。</h3>
        <p>从 {{ first.record.at }} 的第一次记录开始，你尝试过 {{ domains }} 个生活领域。</p></div>
      <span class="notebook-mark" aria-hidden="true">▤</span>
    </section>
    <section v-if="filter === 'done' && reflection" class="memory-letter" aria-label="留给自己的话">
      <span class="memory-kicker">翻到你写下的这一页</span>
      <blockquote>{{ reflection.record.review }}</blockquote>
      <p><time>{{ reflection.record.at }}</time> · {{ reflection.task?.title || '一件完成的事' }}</p>
    </section>
    <section v-if="filter === 'done' && focusTask" class="memory-next" aria-label="从这里继续">
      <template v-if="state.active.length">
        <span class="memory-kicker">回望之后，按自己的节奏继续</span>
        <h3>手里还有 {{ state.active.length }} 件正在做的事。</h3>
        <p>不用急着接新的，先照顾已经开始的这一件。</p>
        <a ref="continuationLink" href="#tasks" class="memory-link">回任务岩壁，继续手里的事 ↗</a>
      </template>
      <template v-else-if="nextTask">
        <span class="memory-kicker">从这段经历再走一步</span>
        <h3>{{ nextTask.title }}</h3>
        <p>{{ fieldGuide(nextTask).steps[0] }}</p>
        <button class="text-button memory-link" @click="inspecting = nextTask">看看下一步怎么开始 ↗</button>
      </template>
      <template v-else>
        <h3>这一段已经走得很远了。</h3>
        <a href="#tasks" class="memory-link">去岩壁，挑一件新的事 ↗</a>
      </template>
    </section>
    <div class="place-tabs memory-status" role="group" aria-label="记录状态">
      <button :class="{active: filter === 'done'}" :aria-pressed="filter === 'done'" @click="filter = 'done'">完成的事 · {{ state.done.length }}</button>
      <button :class="{active: filter === 'rest'}" :aria-pressed="filter === 'rest'" @click="filter = 'rest'">暂时放下 · {{ state.abandoned.length }}</button>
    </div>
    <div v-if="source.length" class="memory-domains" role="group" aria-label="按生活领域回看">
      <button :aria-pressed="cat === 'all'" @click="cat = 'all'">全部 <span>{{ source.length }}</span></button>
      <button v-for="(c, id) in CATS" :key="id" :aria-pressed="cat === id" @click="cat = id">{{ c.name }} <span>{{ counts[id] }}</span></button>
    </div>
    <div v-if="source.length" class="memory-search">
      <input v-model="query" type="search" aria-label="搜索手记" placeholder="找一件事，或一句自己写过的话" />
      <label><input v-model="onlyNotes" type="checkbox" />只看写过的话</label>
    </div>
    <p v-if="source.length" class="memory-count" role="status">{{ cat === 'all' ? '全部领域' : CATS[cat].name }} · {{ records.length }} 条{{ filter === 'done' ? '完成记录' : '暂放记录' }}</p>
    <div v-if="!records.length" class="memory-empty">
      <template v-if="!source.length">
        <h3>{{ filter === 'done' ? '第一页，从一件真实的小事开始。' : '这里还没有暂时放下的事。' }}</h3>
        <p>{{ filter === 'done' ? '完成后留下一句话，下次回来，就能认出那时的自己。' : '改变主意或停下来都可以。放下的理由会留在这里，不会扣光。' }}</p>
        <a v-if="filter === 'done'" href="#tasks" class="memory-link">去任务岩壁，挑一件做得到的事 ↗</a>
      </template>
      <template v-else><h3>这一页，暂时没有匹配的记录。</h3><p>试试另一段文字，或看看其他生活领域。</p><button class="soft-button" @click="clearFilters">查看全部{{ filter === 'done' ? '完成' : '暂放' }}记录</button></template>
    </div>
    <section v-for="group in months" :key="group.month" class="memory-month" :aria-label="monthLabel(group.month)">
      <h3 class="memory-month-title">{{ monthLabel(group.month) }} <small>{{ group.entries.length }} 条</small></h3>
      <article v-for="entry in group.entries" :key="entry.index" class="memory-entry" :class="{'memory-linked':entry.record===linkedRecord}" :ref="el=>linkElement(el,entry.record)" tabindex="-1" :data-memory-qid="entry.record.qid">
        <span v-if="entry.record===linkedRecord" class="memory-kicker">这段经历，留在了「{{ focusMemory.name }}」里。</span>
        <div class="memory-date"><time>{{ entry.record.at }}</time><span>{{ CATS[entry.task?.cat]?.name || '生活片段' }}</span></div>
        <h4>{{ entry.task?.title || '一件过去的事' }}</h4>
        <p v-if="entry.record.review || entry.record.reason" class="memory-words">{{ entry.record.review || entry.record.reason }}</p>
        <p v-else class="memory-no-note">{{ filter === 'done' ? '那天没有留下文字，但这件事已经做到了。' : '这次没有留下理由。把手里的事放一放，也是一种选择。' }}</p>
        <p v-if="entry.task?.personal" class="personal-condition">当时约定：{{ entry.task.desc }}</p>
        <small v-if="filter === 'done' && !entry.task?.personal" class="memory-earned">当时获得 ＋{{ entry.record.xp }} XP</small>
        <button v-if="entry.record===linkedRecord" class="soft-button" @click="emit('back-furniture')">回到这件家具 ↗</button>
      </article>
    </section>
    <button v-if="records.length > limit" class="soft-button memory-more" @click="limit += 12">再翻 12 条记录 · 还有 {{ records.length - limit }} 条</button>
    <TaskGuide v-if="inspecting" :task="inspecting" :active="false" :eligibility="canAccept(inspecting)" @close="inspecting = null" @accept="take" />
  </div>
</template>
<style scoped>
.memory-return{padding:18px;background:#edf2e7;border-radius:12px;margin-bottom:22px;font-size:13px;color:var(--ink-2)}
.memory-linked{background:#fff9e7;border-left:3px solid #b39b61!important;padding:20px!important;border-radius:0 12px 12px 0;outline:none}
.memory-linked>.soft-button{display:block;margin-top:16px}
.memory-linked:focus-visible{outline:2px solid #9b8755;outline-offset:3px}

.memory-overview { display: flex; align-items: center; gap: 24px; padding: 22px 0; border-top: 1px solid var(--line); }
.memory-overview span, .memory-kicker { font-size: 12px; color: var(--ink-2); }
.memory-overview h3 { font: 600 24px/1.5 var(--serif); margin: 8px 0; }
.memory-overview p { font-size: 13px; line-height: 1.8; color: var(--ink-2); margin: 0; }
.memory-overview .notebook-mark { font-size: 58px; color: #b4bfa6; margin-left: auto; }
.memory-letter { padding: 24px; background: #f1efdf; border-radius: 3px 16px 16px 3px; border-left: 3px solid #b8a66d; margin: 0 0 20px; }
.memory-letter blockquote { margin: 15px 0; font: 500 23px/1.85 var(--serif); white-space: pre-wrap; overflow-wrap: anywhere; color: #485542; }
.memory-letter > p { font-size: 12px; line-height: 1.8; color: var(--ink-2); margin: 0; }
.memory-next { padding: 20px; background: #edf2e9; border-radius: 12px; margin-bottom: 28px; }
.memory-next h3 { font: 600 19px/1.6 var(--serif); margin: 7px 0; }
.memory-next p { font-size: 13px; line-height: 1.8; color: var(--ink-2); margin: 8px 0; }
.memory-link { display: inline-block; font-size: 13px; color: var(--primary); line-height: 1.8; text-underline-offset: 4px; }
button.memory-link { padding: 0; text-align: left; }
.memory-status { flex-wrap: wrap; }
.memory-domains { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
.memory-domains button { background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 12px; color: var(--ink-2); }
.memory-domains button[aria-pressed="true"] { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
.memory-domains span { margin-left: 5px; font-variant-numeric: tabular-nums; }
.memory-search { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.memory-search > input { flex: 1 1 220px; min-width: 0; padding: 12px; background: #fff; border: 1px solid var(--line); border-radius: 8px; font: inherit; font-size: 13px; color: var(--ink); }
.memory-search label { font-size: 12px; color: var(--ink-2); display: flex; align-items: center; gap: 5px; }
.memory-search input[type="checkbox"] { accent-color: var(--primary); }
.memory-count { color: var(--ink-2); font-size: 12px; margin: 18px 0 25px; }
.memory-month-title { display: flex; gap: 12px; align-items: baseline; font: 600 20px var(--serif); padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.memory-month-title small { font: 400 12px var(--sans); color: var(--ink-2); }
.memory-entry { position: relative; margin: 0 0 0 5px; padding: 12px 0 24px 20px; border-left: 1px solid #dbe2d4; }
.memory-entry h4 { font-size: 16px; font-weight: 500; line-height: 1.7; margin: 7px 0; }
.memory-date { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--ink-2); }
.memory-words { font: 400 18px/1.85 var(--serif); white-space: pre-wrap; overflow-wrap: anywhere; margin: 10px 0; }
.memory-no-note { font-size: 13px; color: var(--ink-2); line-height: 1.8; }
.personal-condition { font-size: 12px; color: var(--ink-2); line-height: 1.8; overflow-wrap: anywhere; }
.memory-earned { color: var(--ink-2); font-size: 11px; }
.memory-empty { padding: 24px 0 35px; }
.memory-empty h3 { font: 500 22px/1.6 var(--serif); }
.memory-empty p { color: var(--ink-2); font-size: 14px; line-height: 1.8; }
.memory-more { display: block; margin: 15px auto; }
@media (max-width: 760px) {
  .memory-overview h3 { font-size: 21px; }
  .notebook-mark { display: none; }
  .memory-letter { padding: 18px; }
  .memory-letter blockquote { font-size: 20px; }
  .memory-next { padding: 16px; }
}
</style>
