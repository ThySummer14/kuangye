<script setup>
import { observationKind } from '../data/observations.js';
defineProps({ source: Object, open: Boolean });
</script>
<template>
  <details class="observation-source" :open="open">
    <summary>创作素材 · {{ source.place }}</summary>
    <div class="source-meta"><time>{{ source.observedOn }}</time><span>{{ observationKind(source.kind)?.name }}</span></div>
    <p class="source-finding">{{ source.body }}</p>
    <div v-if="source.images.length" class="source-images"><img v-for="(src,i) in source.images" :key="i" :src="src" :alt="source.place+' · 素材图片 '+(i+1)" /></div>
  </details>
</template>
<style scoped>
.observation-source { padding:20px; background:var(--moss-wash); border:1px solid var(--line); margin-bottom:24px; min-width:0; }
summary { cursor:pointer; color:var(--primary); font:500 16px/1.8 var(--serif); overflow-wrap:anywhere; }
.source-meta { display:flex; flex-wrap:wrap; gap:15px; margin:16px 0; color:var(--ink-3); font-size:11px; }
.source-finding { white-space:pre-wrap; overflow-wrap:anywhere; font:14px/1.9 var(--serif); color:var(--ink-2); }
.source-images { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.source-images img { width:100%; max-height:240px; display:block; object-fit:contain; background:var(--paper); }
@media(max-width:500px) { .source-images { grid-template-columns:1fr; } }
</style>
