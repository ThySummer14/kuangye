<script setup>
import { computed, ref } from 'vue';
const props = defineProps({ notebook: { type: Object, required: true } });
import { state, taskById } from '../store.js';
defineEmits(['inspect']);
const selected = ref(props.notebook.situations[0].id);
const situation = computed(() => props.notebook.situations.find(s => s.id === selected.value));
const tasks = computed(() => props.notebook.tasks.filter(t => t.situation === selected.value));
function status(id) {
  if(state.active.some(a => a.qid === id)) return '已接下，看看下一步';
  if(state.done.some(d => d.qid === id)) return '已做过，翻回这份手册';
  return '看看这件事怎么做';
}
</script>
<template>
  <section class="life-notes" :aria-label="notebook.label">
    <header><span class="eyebrow">{{ notebook.eyebrow }}</span><h3>{{ notebook.title }}</h3><p class="notebook-intro">{{ notebook.intro }}</p></header>
    <div class="life-layout">
      <div class="life-situations" role="group" :aria-label="notebook.groupLabel"><span>{{ notebook.question }}</span><button v-for="item in notebook.situations" :key="item.id" :aria-pressed="selected===item.id" @click="selected=item.id"><strong>{{ item.title }}</strong><small>{{ item.note }}</small><span aria-hidden="true">{{ selected===item.id?'✓':'↗' }}</span></button></div>
      <div class="life-options"><p class="life-current" role="status">{{ situation.title }} · 两件小事，选一件就好</p><article v-for="task in tasks" :key="task.id"><span class="life-time">约 {{ task.context.minutes }} 分钟 · {{ notebook.timeNote }}</span><h4>{{ task.title }}</h4><p>{{ task.cue }}</p><div class="life-result"><span>做到这里，就可以收尾</span><p>{{ task.desc }}</p></div><button class="soft-button" :aria-label="task.title+'：'+notebook.actionLabel" @click="$emit('inspect',taskById[task.id])">{{ status(task.id) }} ↗</button></article></div>
    </div>
    <footer>{{ notebook.footer }}</footer>
  </section>
</template>
<style scoped>
.notebook-intro{white-space:pre-line}.life-notes{margin:30px 0 34px;padding:30px;background:#f3efe5;border:1px solid #d9d1be;border-radius:16px;color:var(--ink)}.life-notes h3{font:500 30px/1.5 var(--serif);margin:12px 0}.life-notes header p{font-size:14px;line-height:1.9;color:var(--ink-2);margin-bottom:28px}.life-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:30px;align-items:start}.life-situations{display:grid;gap:10px}.life-situations>span{font-size:12px;color:var(--ink-2);margin-bottom:8px}.life-situations button{position:relative;text-align:left;border:1px solid #d5cfbd;background:transparent;border-radius:8px;padding:18px 32px 18px 16px;color:var(--ink)}.life-situations button[aria-pressed=true]{background:#e4e9dc;border-color:#8da080}.life-situations strong{font:500 19px/1.5 var(--serif);display:block}.life-situations small{display:block;font-size:12px;line-height:1.8;color:var(--ink-2);margin-top:7px}.life-situations button>span{position:absolute;right:13px;top:21px;color:var(--primary)}.life-options{min-width:0}.life-current{font-size:12px;color:var(--ink-2);margin:0 0 18px;line-height:1.7}.life-options article{background:#fffdf5;padding:24px 28px;border-radius:4px 12px 12px 4px;border-left:3px solid #b4a787}.life-options article+article{margin-top:18px}.life-time{font-size:11px;color:var(--ink-2)}.life-options h4{font:500 24px/1.6 var(--serif);margin:12px 0}.life-options p{font-size:13px;color:var(--ink-2);line-height:1.85}.life-result{padding-left:14px;border-left:2px solid #d9d2bb;margin:20px 0}.life-result>span{font-size:11px;color:var(--primary)}.life-result p{margin:8px 0 0}.life-options button{font-size:13px;line-height:1.7}.life-notes footer{margin-top:24px;font-size:12px;color:var(--ink-2);line-height:1.9}.life-notes button:focus-visible{outline:2px solid var(--primary);outline-offset:3px}@media(max-width:750px){.life-layout{grid-template-columns:1fr;gap:22px}.life-situations{grid-template-columns:repeat(3,minmax(0,1fr))}.life-situations>span{grid-column:1/-1}.life-situations button{padding:13px 8px}.life-situations small,.life-situations button>span{display:none}.life-situations strong{font:500 13px/1.7 var(--sans)}.life-notes{padding:22px 16px}.life-notes h3{font-size:26px}.life-options article{padding:21px 18px}.life-options h4{font-size:22px}.life-options .soft-button{width:100%}}
</style>
