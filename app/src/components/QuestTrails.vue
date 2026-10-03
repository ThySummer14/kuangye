<script setup>
import { TRAILS } from '../data/field-guides.js';
import PlaceIcon from './PlaceIcon.vue';
defineProps({ selected: String, compact: Boolean });
defineEmits(['select']);
// 方向卡的色调沿用五域颜色（表现层）。
const TONES = { outside: '#c0603f', settle: '#5e8f4f', make: '#b98417', connect: '#8c6488', think: '#4e6690' };
</script>
<template>
  <section class="quest-trails" aria-labelledby="trails-title">
    <div v-if="!compact" class="trails-heading"><h3 id="trails-title">今天，想从哪里开始？</h3><p>不用先想好远方。从眼前的生活选一个方向。</p></div>
    <div class="trail-options">
      <button v-for="trail in TRAILS" :key="trail.id" :data-trail="trail.id" :aria-pressed="selected === trail.id"
        :style="{ '--tone': TONES[trail.id] || 'var(--moss)' }"
        @click="$emit('select', selected === trail.id ? '' : trail.id)">
        <span class="trail-symbol" aria-hidden="true"><PlaceIcon :name="trail.id" :size="22" /></span>
        <span><strong>{{ trail.title }}</strong><small>{{ trail.note }}</small></span>
        <span class="trail-arrow" aria-hidden="true">{{ selected === trail.id ? '✓' : '→' }}</span>
      </button>
    </div>
  </section>
</template>
<style scoped>
.quest-trails { margin: 30px 0; }
.trails-heading h3 { font: 600 23px var(--serif); margin: 0 0 8px; }
.trails-heading p { color: var(--ink-2); font-size: 13px; margin: 0 0 18px; }
.trail-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.trail-options button {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 16px; text-align: left; padding: 18px 20px;
  border: 1px solid var(--line); border-radius: 18px; color: var(--ink);
  background: linear-gradient(120deg, color-mix(in srgb, var(--tone) 9%, var(--card)), var(--card) 65%);
  box-shadow: var(--lift-1);
  transition: transform .22s var(--ease-out), box-shadow .22s, border-color .22s;
}
.trail-options button[data-trail=think] { grid-column: 1/-1; }
.trail-options button:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--tone) 45%, var(--line)); box-shadow: var(--lift-2); }
.trail-options button[aria-pressed="true"] { border-color: var(--tone); box-shadow: inset 0 0 0 1px var(--tone), var(--lift-2); }
.trail-options button:focus-visible { outline: 2px solid var(--tone); outline-offset: 3px; }
.trail-symbol {
  display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 44px; border-radius: 14px;
  color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, var(--card));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 20%, transparent);
  transition: transform .3s var(--ease-spring);
}
.trail-options button:hover .trail-symbol { transform: rotate(-8deg) scale(1.06); }
.trail-options strong { display: block; font: 600 18px var(--serif); letter-spacing: .5px; }
.trail-options small { display: block; color: var(--ink-2); margin-top: 4px; font-size: 12px; line-height: 1.6; }
.trail-arrow { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; color: var(--tone); background: color-mix(in srgb, var(--tone) 10%, transparent); transition: transform .2s var(--ease-out); }
.trail-options button:hover .trail-arrow { transform: translateX(3px); }
@media (max-width: 600px) {
  .trail-options { grid-template-columns: 1fr; gap: 10px; }
  .trail-options button { padding: 13px 14px; gap: 12px; }
  .trail-symbol { width: 40px; height: 40px; flex-basis: 40px; }
  .trails-heading h3 { font-size: 21px; }
}
</style>
