<script setup>
import { computed } from 'vue';
import { studioReady } from '../game/studio.js';
import PlaceIcon from './PlaceIcon.vue';
const props = defineProps({ item: Object, full: Boolean });
const hasArtifact = computed(() => studioReady(props.item.work));
const emit = defineEmits(['open']);
</script>
<template>
  <section class="map-resting-work" :data-rest-work="item.work.id" aria-labelledby="map-resting-title">
    <span class="resting-place"><PlaceIcon name="atelier" :size="14" /> 画室 · 最近暂放</span>
    <h3 id="map-resting-title">{{ item.work.title }}</h3>
    <time v-if="item.record.at" :datetime="item.record.at">{{ item.record.at }} · 先放在这里</time>
    <div v-if="hasArtifact" class="resting-version"><img v-if="item.work.images.length" :src="item.work.images[0]" alt="暂放作品的第一张成果图" /><p v-if="item.work.body.trim()">{{ item.work.body }}</p></div>
    <p class="resting-help">{{ hasArtifact ? '这一版还在。先打开看看，再决定要不要接着做。' : '第一版还在路上。名字和完成条件，都留在画室。' }}</p>
    <button class="soft-button" @click="emit('open',item.work.id)">回画室看这一版 ↗</button>
    <small v-if="full">手里已有三件事，仍可以打开原作品。</small>
  </section>
</template>
<style scoped>
.map-resting-work { min-width:0; padding:22px; border:1px solid var(--line); background:var(--card); }
.resting-place { display:flex; align-items:center; gap:7px; color:var(--primary); font-size:11px; line-height:1.8; }
h3 { margin:12px 0 8px; color:var(--ink); font:500 22px/1.5 var(--serif); overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
time { font-size:11px; color:var(--ink-3); }
.resting-version { display:flex; align-items:start; gap:14px; min-width:0; padding:15px 0; margin-top:8px; border-bottom:1px solid var(--line-2); }
.resting-version img { width:64px; height:76px; flex-shrink:0; object-fit:contain; background:var(--paper); }
.resting-version p { min-width:0; margin:0; color:var(--ink-2); font:13px/1.8 var(--serif); white-space:pre-wrap; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.resting-help { font-size:12px; color:var(--ink-2); line-height:1.9; margin:16px 0; }
button { max-width:100%; font-size:12px; }
small { display:block; font-size:11px; color:var(--ink-3); line-height:1.9; margin-top:12px; }
@media(max-width:760px) { .map-resting-work { order:1; padding:18px; } h3 { font-size:21px; } }
</style>
