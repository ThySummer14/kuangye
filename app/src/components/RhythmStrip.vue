<script setup>
// 按天任务的进度格：目标有几天就有几格，记过的日子依次填满。
// 只展示攒下的日子，不画日历空档；今天还没记时，下一格轻轻亮着。
import { computed } from "vue";
import { recordedDates, rhythmSummary } from "../game/rhythm.js";
const props = defineProps({ active: Object, target: Number, today: String });
const r = computed(() => rhythmSummary(props.active.logs, props.today, props.target));
const md = d => `${Number(d.slice(5, 7))}月${Number(d.slice(8))}日`;
const slots = computed(() => {
  const dates = recordedDates(props.active.logs);
  const waiting = r.value.since !== 0 && dates.length < props.target;
  return Array.from({ length: Math.max(props.target, dates.length) }, (_, i) => ({
    d: dates[i] || "", next: waiting && i === dates.length,
  }));
});
const dense = computed(() => slots.value.length > 30);
const line = computed(() => {
  const { days, since, current } = r.value;
  if (!days) return "记下第一天，第一格就亮起来。";
  if (since === 0) return current >= 2 ? `今天这一格填好了，这一口气 ${current} 天。` : "今天这一格填好了。";
  if (since === 1) return current >= 2 ? `昨天记过，已经一口气 ${current} 天。` : "昨天记过，今天接着来就好。";
  return `上次记在 ${md(r.value.last)}。中间空着没关系，攒下的 ${days} 天都还在。`;
});
</script>

<template>
  <div class="rhythm">
    <div class="rhythm-count">
      <strong>{{ r.days }}</strong><span>/ {{ r.target }} 天</span>
      <small v-if="r.left">还差 {{ r.left }} 天</small><small v-else class="rhythm-ready">已经攒满</small>
      <em v-if="r.best >= 3" class="rhythm-best">最长一口气 {{ r.best }} 天</em>
    </div>
    <ol class="rhythm-slots" :class="{ dense }" role="img" :aria-label="`攒下 ${r.days} 天，目标 ${r.target} 天。`">
      <li v-for="(s, i) in slots" :key="i" :class="{ on: s.d, next: s.next }" :title="s.d ? md(s.d) : s.next ? '今天可以填这一格' : ''" />
    </ol>
    <p class="rhythm-line">{{ line }}</p>
  </div>
</template>

<style scoped>
.rhythm { margin: 14px 0 4px; }
.rhythm-count { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
.rhythm-count strong { font-family: var(--serif); font-size: 28px; line-height: 1; font-weight: 700; color: var(--moss-deep); }
.rhythm-count span { color: var(--ink-2); font-size: 13px; }
.rhythm-count small { color: var(--ink-3); font-size: 12px; }
.rhythm-count .rhythm-ready { color: var(--moss); font-weight: 600; }
.rhythm-best { margin-left: auto; font-style: normal; font-size: 11px; color: var(--glow-deep); background: var(--glow-soft); border-radius: 999px; padding: 2px 9px; }
.rhythm-slots { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.rhythm-slots li { width: 17px; height: 17px; border-radius: 5px; background: var(--paper-2); box-shadow: inset 0 0 0 1px var(--line); }
.rhythm-slots.dense { gap: 3px; }
.rhythm-slots.dense li { width: 11px; height: 11px; border-radius: 3px; }
.rhythm-slots li.on { background: linear-gradient(160deg, var(--sage), var(--moss)); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .12); }
.rhythm-slots li.next { background: var(--glow-soft); box-shadow: inset 0 0 0 1.5px var(--glow); }
@media (prefers-reduced-motion: no-preference) {
  .rhythm-slots li.on { animation: slot-in .45s var(--ease-spring) both; }
  @keyframes slot-in { from { transform: scale(.6); opacity: .4; } }
}
.rhythm-line { margin: 8px 0 0; font-size: 13px; line-height: 1.6; color: var(--ink-2); }
</style>
