<script setup>
// 瞭望台「攒下的日子」：只列出留下过记录的日子，点开看那天做了什么。只读，不发奖励。
import { computed, ref } from "vue";
import { state, taskById } from "../store.js";
import { gatheredDays, gatheredMonths } from "../game/journal.js";
import { bestRun } from "../game/rhythm.js";
const days = computed(() => gatheredDays(state, taskById));
const months = computed(() => gatheredMonths(days.value));
const best = computed(() => bestRun(days.value.map(d => ({ d: d.date }))));
const showAll = ref(false);
const visible = computed(() => showAll.value ? months.value : months.value.slice(0, 3));
const picked = ref("");
const selected = computed(() => days.value.find(d => d.date === picked.value) || days.value[0]);
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const md = d => `${Number(d.slice(5, 7))}月${Number(d.slice(8))}日`;
const fullDate = d => `${md(d)} 周${WEEK[new Date(d + "T12:00:00").getDay()]}`;
const monthLabel = m => `${m.slice(0, 4)} 年 ${Number(m.slice(5))} 月`;
function describe(e) {
  if (e.kind === "done") return `完成了「${e.title}」`;
  if (e.kind === "units") return `「${e.title}」记下 ${e.v}${e.unit || ""}`;
  if (e.kind === "day") return `「${e.title}」攒下一天`;
  if (e.kind === "observation") return `在「${e.title}」留下一个具体发现`;
  if (e.kind === "reading") return `在《${e.title}》里留了一段摘记`;
  return `给问题「${e.title}」添了一条线索`;
}
</script>

<template>
  <section v-if="days.length" class="gathered" aria-labelledby="gathered-title">
    <span class="eyebrow">攒下的日子</span>
    <h3 id="gathered-title">你已经为自己攒下 {{ days.length }} 个日子。</h3>
    <p class="gathered-sub">从 {{ md(days.at(-1).date) }} 开始<template v-if="best >= 2"> · 最长一口气 {{ best }} 天</template>。这里只收做过的日子；<span class="legend-done">金色</span>的那天，完成了一件事。</p>
    <div v-for="m in visible" :key="m.month" class="gathered-month">
      <h4>{{ monthLabel(m.month) }} <small>{{ m.days.length }} 个日子</small></h4>
      <ol class="day-chips">
        <li v-for="d in m.days" :key="d.date">
          <button :class="{ done: d.done }" :aria-pressed="selected?.date === d.date" :aria-label="fullDate(d.date) + (d.done ? '，完成了一件事' : '')" @click="picked = d.date">
            {{ Number(d.date.slice(8)) }}
          </button>
        </li>
      </ol>
    </div>
    <button v-if="months.length > 3" class="text-button gathered-more" @click="showAll = !showAll">{{ showAll ? "只看最近三个月" : `翻看更早的 ${months.length - 3} 个月` }}</button>
    <div v-if="selected" class="day-detail" aria-live="polite">
      <strong>{{ fullDate(selected.date) }}</strong>
      <ul v-if="selected.entries.length">
        <li v-for="e in selected.entries" :key="e.kind + e.key" :class="e.kind">
          {{ describe(e) }}<q v-if="e.review">{{ e.review }}</q>
        </li>
      </ul>
      <p v-else>这一天留下过记录，细节没有保存下来。</p>
    </div>
  </section>
</template>

<style scoped>
.gathered { margin: 0 0 28px; padding: 22px 24px; border-radius: var(--r-m); background: var(--moss-wash); border: 1px solid var(--line); }
.gathered h3 { margin: 6px 0 4px; font-family: var(--serif); font-size: 21px; color: var(--ink); }
.gathered-sub { margin: 0 0 14px; font-size: 12.5px; color: var(--ink-3); line-height: 1.7; }
.legend-done { color: var(--glow-deep); font-weight: 700; }
.gathered-month { margin-top: 12px; }
.gathered-month h4 { margin: 0 0 8px; font-size: 13px; color: var(--ink-2); font-weight: 600; }
.gathered-month h4 small { margin-left: 6px; font-weight: 400; color: var(--ink-3); }
.day-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.day-chips button { min-width: 34px; height: 34px; padding: 0 6px; border-radius: 10px; border: 0; cursor: pointer; font: 600 13px/1 var(--serif); color: #fff; background: linear-gradient(160deg, var(--sage), var(--moss)); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .14); transition: transform .15s var(--ease-out); }
.day-chips button.done { color: var(--glow-deep); background: linear-gradient(160deg, #fff7df, var(--glow-soft)); box-shadow: inset 0 0 0 1.5px var(--glow); }
.day-chips button[aria-pressed="true"] { outline: 2px solid var(--ink); outline-offset: 2px; }
.day-chips button:hover { transform: translateY(-1px); }
.gathered-more { margin-top: 12px; font-size: 12px; }
.day-detail { margin-top: 16px; padding: 14px 16px; border-radius: var(--r-s); background: var(--card); box-shadow: var(--lift-1); }
.day-detail strong { font-family: var(--serif); font-size: 15px; color: var(--moss-deep); }
.day-detail ul { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.day-detail li { font-size: 13px; line-height: 1.6; color: var(--ink-2); padding-left: 14px; position: relative; }
.day-detail li::before { content: ""; position: absolute; left: 0; top: .6em; width: 6px; height: 6px; border-radius: 2px; background: var(--sage); }
.day-detail li.done::before { background: var(--glow); }
.day-detail q { display: block; margin-top: 2px; font-family: var(--serif); color: var(--ink-3); }
.day-detail p { margin: 8px 0 0; font-size: 13px; color: var(--ink-3); }
@media (max-width: 520px) { .gathered { padding: 18px 16px; } .gathered h3 { font-size: 18px; } }
</style>
