<script setup>
import { computed } from 'vue';
import { state, taskById } from '../store.js';
import { furnitureById } from '../data/furniture.js';
import { linkedMemoryRecord } from '../game/journal.js';
const props=defineProps({inventoryItem:Object});
const emit=defineEmits(['close','journal','move']);
const furniture=computed(()=>furnitureById[props.inventoryItem.fid]);
const memory=computed(()=>props.inventoryItem.memory);
const original=computed(()=>linkedMemoryRecord(state.done,memory.value));
</script>
<template>
 <section class="furniture-memory-card" aria-label="家具里的记忆">
  <button class="memory-card-close" aria-label="收起家具记忆" @click="emit('close')">×</button>
  <span class="eyebrow">{{ furniture.name }} · 家里的一段来路</span>
  <template v-if="memory"><h3>{{ taskById[memory.qid]?.title || '那次完成的小事' }}</h3><blockquote>{{ memory.review || '那天没有留下文字，但这件事已经做到了。' }}</blockquote><time>{{ memory.date }}</time><p v-if="!original" class="memory-card-note">铭牌还在，暂时没有找到对应的完成记录。</p></template>
  <template v-else><h3>这是你为家挑选的一件喜欢。</h3><p class="memory-card-note">{{ furniture.stall==='gift'?'它是成长送来的礼物。':'这件家具没有绑定任务铭牌，也可以一直留在家里。' }}</p></template>
  <div class="memory-card-actions"><button v-if="original" class="soft-button" @click="emit('journal',memory)">翻到那一天的手记 ↗</button><button class="text-button" @click="emit('move')">调整摆放</button></div>
 </section>
</template>
<style scoped>
.furniture-memory-card{position:relative;padding:23px 28px;margin-top:14px;border:1px solid #dddcc6;border-left:4px solid #b29a63;border-radius:4px 14px 14px 4px;background:#fffaf0}.furniture-memory-card h3{font:500 23px/1.6 var(--serif);margin:12px 0;color:var(--ink)}.furniture-memory-card blockquote{font:400 18px/1.9 var(--serif);white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0;color:#536047}.furniture-memory-card time,.memory-card-note{font-size:12px;line-height:1.8;color:var(--ink-2)}.memory-card-close{position:absolute;right:12px;top:10px;background:none;border:0;color:#7f8e77;font-size:24px;width:36px;height:36px}.memory-card-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:18px;align-items:center}.furniture-memory-card>.eyebrow{display:block;padding-right:30px}@media(max-width:600px){.furniture-memory-card{padding:20px 18px}.furniture-memory-card h3{font-size:21px}.furniture-memory-card blockquote{font-size:17px}}
</style>
