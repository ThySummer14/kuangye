<script setup>
import { ref, computed } from 'vue'
import { TASKS, CATS, DIFF } from '../data/tasks'
import { canAccept, accept, chainUnlocked, state, taskById, progressOf, now } from '../store'
import TaskCard from './TaskCard.vue'

const props = defineProps({ phase: Object, toast: Function })
const emit = defineEmits(['go-journey', 'complete', 'abandon'])

const scope = ref('starter')
const filter = ref('all')
const catIds = Object.keys(CATS)
const DIFF_ORDER = ['E', 'D', 'C', 'B', 'A', 'S']
const chapterIndex = computed(() => (props.phase?.phase === 'settle' ? 2 : props.phase?.chapter || 0))
const chapterName = computed(() => ['翻土', '播种', '发芽'][chapterIndex.value])
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now()))

const availableTasks = computed(() =>
  TASKS.filter((t) => (t.tier === 'season' || t.chapter === chapterIndex.value) && chainUnlocked(t))
)
const starterTasks = computed(() => {
  const byCat = catIds.map((cat) =>
    availableTasks.value.filter((t) => t.cat === cat && (t.diff === 'E' || t.diff === 'D')).slice(0, 2)
  )
  return byCat.flat().sort((a, b) => DIFF_ORDER.indexOf(a.diff) - DIFF_ORDER.indexOf(b.diff))
})
const displayedTasks = computed(() => {
  const source = scope.value === 'starter' ? starterTasks.value : scope.value === 'chapter'
    ? availableTasks.value.filter((t) => t.tier === 'chapter')
    : availableTasks.value
  return source.filter((t) => filter.value === 'all' || t.cat === filter.value)
})
const groups = computed(() =>
  DIFF_ORDER.map((d) => ({
    diff: d,
    meta: DIFF[d],
    list: displayedTasks.value.filter((t) => t.diff === d),
  })).filter((g) => g.list.length)
)
const activeCount = computed(() => state.active.length)
const focusActive = computed(() => state.active[0] || null)
const focusTask = computed(() => (focusActive.value ? taskById[focusActive.value.qid] : null))
const focusProgress = computed(() => (focusActive.value ? progressOf(focusActive.value) : null))
const completionRate = computed(() => Math.round((state.done.length / Math.max(1, state.done.length + state.active.length)) * 100))
const suggestedTask = computed(() => starterTasks.value.find((t) => canAccept(t).ok) || availableTasks.value.find((t) => canAccept(t).ok) || null)
const hasStarted = computed(() => state.done.length > 0 || state.active.length > 0)

function acceptTask(task) {
  const c = canAccept(task)
  if (!c.ok) return props.toast(c.why)
  accept(task)
  props.toast(`已接取「${task.title}」`)
}

function showScope(next) {
  scope.value = next
  if (next === 'starter') filter.value = 'all'
}
</script>

<template>
  <section class="board-hero">
    <div class="board-hero-copy">
      <div class="eyebrow">{{ dateLabel }} <span class="eyebrow-dot" /> {{ props.phase?.phase === 'pre' ? '序章预热中' : `第 ${props.phase?.dayInSeason} 天` }}</div>
      <h1>让今天留下点什么</h1>
      <p v-if="activeCount">你已经在路上。今天只需要把其中一件事往前推一点。</p>
      <p v-else>不等状态变好，先给自己派一件做得到的事。</p>
      <button class="hero-cta" @click="activeCount ? emit('go-journey') : showScope('starter')">
        <span>{{ activeCount ? '去进行中看看' : '看一眼适合起步' }}</span><span aria-hidden="true">↗</span>
      </button>
    </div>
    <div class="board-hero-mark" aria-hidden="true">
      <span class="mark-sun" />
      <span class="mark-line line-a" /><span class="mark-line line-b" /><span class="mark-line line-c" />
      <span class="mark-seed">芽</span>
    </div>
  </section>

  <div class="board-stats" aria-label="我的旷野状态">
    <div class="board-stat"><span class="stat-value">{{ activeCount }}<small>/ 3</small></span><span class="stat-label">进行中</span></div>
    <div class="board-stat"><span class="stat-value">{{ state.done.length }}</span><span class="stat-label">已留下</span></div>
    <div class="board-stat"><span class="stat-value">{{ completionRate }}<small>%</small></span><span class="stat-label">当前完成率</span></div>
    <div class="board-stat board-stat-season"><span class="stat-value">{{ chapterName }}</span><span class="stat-label">本章</span></div>
  </div>

  <section v-if="focusTask" class="focus-strip">
    <div class="focus-kicker"><span class="live-dot" /> 今日继续 <span>你最近在走的路</span></div>
    <div class="focus-main">
      <div>
        <div class="focus-title">{{ focusTask.title }}</div>
        <div class="focus-progress">
          <span>{{ focusTask.type === 'once' ? '完成瞬间即结算' : `已完成 ${focusProgress.cur} / ${focusProgress.target}${focusTask.type === 'streak' ? ' 天' : ` ${focusTask.unit || ''}`}` }}</span>
          <span v-if="focusTask.type !== 'once'" class="focus-bar"><i :style="{ '--p': Math.min(1, focusProgress.cur / focusProgress.target) }" /></span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" @click="emit('go-journey')">打开进行中 <span aria-hidden="true">→</span></button>
    </div>
  </section>

  <section v-else-if="suggestedTask" class="daily-pick" :style="{ '--cat-color': CATS[suggestedTask.cat].color }">
    <div class="daily-pick-top">
      <div>
        <div class="daily-pick-kicker"><span class="live-dot" /> 今日只选这一件</div>
        <h2>给未来的自己留一条证据</h2>
      </div>
      <span class="daily-pick-mark" aria-hidden="true">01</span>
    </div>
    <div class="daily-pick-task">
      <span class="diff-badge" :class="`diff-${suggestedTask.diff}`">{{ suggestedTask.diff }}</span>
      <div class="daily-pick-copy">
        <strong>{{ suggestedTask.title }}</strong>
        <span>{{ suggestedTask.desc }}</span>
      </div>
      <button class="btn btn-primary btn-sm" :disabled="!canAccept(suggestedTask).ok" @click="acceptTask(suggestedTask)">
        {{ canAccept(suggestedTask).ok ? '接下这一步' : '先清出一个位置' }}
      </button>
    </div>
    <div class="daily-pick-foot">完成它会获得 +{{ DIFF[suggestedTask.diff].xp }} XP · 之后还能随时换一条路</div>
  </section>

  <section v-if="!hasStarted" class="start-ritual" aria-label="开始方式">
    <div class="start-ritual-copy">
      <div class="eyebrow">第一次来到旷野</div>
      <h2>不用规划一生，先完成一件事</h2>
      <p>接取、推进、结算。每一条完成记录，都会变成你以后回头看得见的成长。</p>
    </div>
    <div class="start-ritual-steps">
      <div><b>01</b><span>挑一件</span></div>
      <div><b>02</b><span>往前推</span></div>
      <div><b>03</b><span>留下来</span></div>
    </div>
  </section>

  <section class="board-library">
    <div class="library-heading">
      <div>
        <div class="eyebrow">选择你的下一步</div>
        <h2>{{ scope === 'starter' ? '从一件轻量的事开始' : scope === 'chapter' ? `本章 · ${chapterName}` : '全部可用支线' }}</h2>
      </div>
      <span class="library-count">{{ availableTasks.length }} 条已开放</span>
    </div>
    <div class="scope-tabs" role="tablist" aria-label="任务范围">
      <button :class="{ on: scope === 'starter' }" role="tab" :aria-selected="scope === 'starter'" @click="showScope('starter')">适合起步</button>
      <button :class="{ on: scope === 'chapter' }" role="tab" :aria-selected="scope === 'chapter'" @click="showScope('chapter')">本章任务</button>
      <button :class="{ on: scope === 'all' }" role="tab" :aria-selected="scope === 'all'" @click="showScope('all')">全部支线</button>
    </div>
    <div class="chips">
      <button class="chip" :class="{ on: filter === 'all' }" @click="filter = 'all'">全部领域</button>
      <button v-for="c in catIds" :key="c" class="chip" :class="{ on: filter === c }" @click="filter = c">{{ CATS[c].name }}</button>
    </div>
    <div class="board-note">同时进行最多 3 条 · 先完成，下一阶段自然会出现 · 不急着把所有事都接走</div>

    <template v-for="g in groups" :key="g.diff">
      <div class="section-h">
        <span class="diff-badge" :class="`diff-${g.diff}`">{{ g.diff }}</span>
        <span class="t">{{ g.meta.name }}级</span>
        <span class="s">{{ g.list.length }} 条</span>
        <span class="line" />
      </div>
      <div class="card-grid">
        <TaskCard v-for="t in g.list" :key="t.id" :task="t" @accept="acceptTask" @go="emit('go-journey')" />
      </div>
    </template>
    <div v-if="!groups.length" class="empty"><div class="empty-mark">○</div><p>这一组暂时没有可接的支线。</p></div>
  </section>
</template>
