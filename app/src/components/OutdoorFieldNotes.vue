<script setup>
import { computed, ref } from 'vue';
import { OUTDOOR_TASKS } from '../data/outdoor-tasks.js';
import { state, taskById } from '../store.js';
const emit = defineEmits(['inspect']);
const minutes = ref(0);
const shown = computed(() => OUTDOOR_TASKS.filter(t => !minutes.value || t.context.minutes <= minutes.value));
function status(id) { return state.active.some(a=>a.qid===id) ? '已经接下 · 翻开手册' : state.done.some(d=>d.qid===id) ? '已经走过 · 再翻翻手册' : '翻开这页，看看怎么开始'; }
</script>
<template>
  <section class="outdoor-notes" aria-label="走出门，观察身边">
    <header><span class="eyebrow">口袋里的探索小册 · 试用草稿</span><h3>走出门，观察身边。</h3><p>不用专门去远方。楼下、食堂门口、每天经过的小路，<br class="desktop-break" />选一件想留意的事，把一个发现带回来。</p></header>
    <div class="outdoor-choice" role="group" aria-label="探索参考用时"><span>这次想留多久？</span><button v-for="item in [{value:0,label:'都翻翻'},{value:10,label:'约 10 分钟'},{value:15,label:'约 15 分钟'}]" :key="item.value" :aria-pressed="minutes===item.value" @click="minutes=item.value">{{ item.label }}</button></div>
    <p class="outdoor-count" role="status">{{ shown.length }} 件可翻阅 · 用时仅供安排，没有倒计时</p>
    <div class="outdoor-pages"><article v-for="task in shown" :key="task.id"><div class="outdoor-page-meta"><span>{{ task.context.minutes }} 分钟左右</span><span>{{ task.cat==='create'?'留下一点创作':task.cat==='mind'?'换个角度观察':'认识身边的生活' }}</span></div><h4>{{ task.title }}</h4><p>{{ task.cue }}</p><div class="outdoor-takeaway"><span>带回来的东西</span><p>{{ task.desc }}</p></div><button class="text-button" :aria-label="task.title+'：翻开探索手册'" @click="emit('inspect',taskById[task.id])">{{ status(task.id) }} ↗</button></article></div>
    <footer>没有合适的天气，就留到下次。观察不要求拍照上传，也不用分享给别人。</footer>
  </section>
</template>
<style scoped>
.outdoor-notes{margin:30px 0 34px;padding:30px;background:#edf1e6;border:1px solid #cbd7c3;border-radius:16px;color:var(--ink)}.outdoor-notes header{max-width:650px}.outdoor-notes h3{font:500 30px/1.5 var(--serif);margin:13px 0}.outdoor-notes header p{font-size:14px;line-height:1.9;color:var(--ink-2)}.outdoor-choice{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:24px 0 12px}.outdoor-choice>span{font-size:12px;margin-right:8px}.outdoor-choice button{padding:9px 12px;border:1px solid #becdb5;background:transparent;border-radius:6px;color:var(--primary);font-size:12px}.outdoor-choice button[aria-pressed=true]{background:var(--primary);color:white}.outdoor-count{font-size:12px;color:var(--ink-2);margin:0 0 20px}.outdoor-pages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.outdoor-pages article{display:flex;flex-direction:column;min-width:0;padding:23px;background:#fffdf5;border-radius:3px 12px 12px 3px;border-left:3px solid #a5b292}.outdoor-page-meta{display:flex;flex-wrap:wrap;gap:7px 12px;font-size:11px;color:var(--ink-2)}.outdoor-pages h4{font:500 23px/1.6 var(--serif);margin:18px 0 10px}.outdoor-pages p{font-size:13px;line-height:1.85;color:var(--ink-2);margin:0}.outdoor-takeaway{margin:22px 0;padding-top:16px;border-top:1px solid var(--line)}.outdoor-takeaway>span{display:block;font-size:11px;color:var(--primary);margin-bottom:7px}.outdoor-pages button{margin-top:auto;text-align:left;color:var(--primary);font-size:12px;line-height:1.8;padding:0}.outdoor-notes footer{font-size:12px;line-height:1.9;color:var(--ink-2);margin-top:22px}.outdoor-notes button:focus-visible{outline:2px solid var(--primary);outline-offset:4px}@media(max-width:1000px){.outdoor-pages{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.outdoor-notes{padding:21px 16px}.outdoor-notes h3{font-size:25px}.outdoor-pages{grid-template-columns:1fr;gap:14px}.outdoor-pages article{padding:20px}.outdoor-choice>span{width:100%;margin-bottom:4px}.desktop-break{display:none}.outdoor-pages h4{font-size:22px}}
</style>
