<script setup>
import { TRAILS } from '../data/field-guides.js';
defineProps({ selected: String });
defineEmits(['select']);
</script>
<template>
  <section class="quest-trails" aria-labelledby="trails-title">
    <div class="trails-heading"><h3 id="trails-title">今天，想从哪里开始？</h3><p>不用先想好远方。从眼前的生活选一个方向。</p></div>
    <div class="trail-options">
      <button v-for="trail in TRAILS" :key="trail.id" :aria-pressed="selected === trail.id"
        @click="$emit('select', selected === trail.id ? '' : trail.id)">
        <span class="trail-symbol" aria-hidden="true">{{ trail.symbol }}</span>
        <span><strong>{{ trail.title }}</strong><small>{{ trail.note }}</small></span>
        <span class="trail-arrow" aria-hidden="true">{{ selected === trail.id ? '✓' : '↗' }}</span>
      </button>
    </div>
  </section>
</template>
<style scoped>
.quest-trails { margin: 30px 0; }
.trails-heading h3 { font: 600 23px var(--serif); margin: 0 0 8px; }
.trails-heading p { color: var(--ink-2); font-size: 13px; margin: 0 0 18px; }
.trail-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.trail-options button { display: flex; align-items: center; gap: 16px; text-align: left; padding: 20px; border: 1px solid var(--line); border-radius: 14px; color: var(--ink); background: #edf2e9; }
.trail-options button:nth-child(2) { background: #f3efe5; }
.trail-options button:nth-child(3) { background: #ebeff3; }
.trail-options button:nth-child(4) { background: #f2ebe8; }
.trail-options button[aria-pressed="true"] { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.trail-options button:hover { border-color: var(--primary); }
.trail-options button:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.trail-symbol { font-size: 26px; width: 32px; flex: 0 0 32px; text-align: center; }
.trail-options strong { display: block; font: 600 18px var(--serif); }
.trail-options small { display: block; color: var(--ink-2); margin-top: 6px; font-size: 12px; line-height: 1.6; }
.trail-arrow { margin-left: auto; }
@media (max-width: 600px) {
  .trail-options { grid-template-columns: 1fr; }
  .trail-options button { padding: 14px 16px; gap: 12px; }
  .trails-heading h3 { font-size: 21px; }
}
</style>
