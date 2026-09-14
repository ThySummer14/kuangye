<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import SproutPortrait from "./SproutPortrait.vue";
import {
  EMOTION_NAMES,
  EMOTION_POSES,
  EMOTION_SPRING,
} from "../game/emotions.js";
const mood = ref("idle"),
  from = ref("idle"),
  to = ref("happy"),
  frequency = ref(EMOTION_SPRING.frequency),
  damping = ref(EMOTION_SPRING.damping),
  blink = ref(true),
  breath = ref(true),
  paused = ref(false),
  portrait = ref(null),
  data = ref({}),
  loop = ref(false);
let timer, loopTimer;
function choose(id) {
  loop.value = false;
  mood.value = id;
  paused.value = false;
}
async function replay() {
  loop.value = false;
  paused.value = false;
  mood.value = from.value;
  portrait.value.reset(from.value);
  await nextTick();
  mood.value = to.value;
}
function snapshot() {
  return {
    place: "emotion-lab",
    navigation: { standalone: true },
    emotion: portrait.value?.snapshot(),
    settings: {
      frequency: frequency.value,
      damping: damping.value,
      blink: blink.value,
      breath: breath.value,
      paused: paused.value,
    },
    viewport: {
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
    },
  };
}
async function reset() {
  loop.value = false;
  paused.value = false;
  from.value = "idle";
  to.value = "happy";
  frequency.value = 12;
  damping.value = 0.86;
  blink.value = breath.value = true;
  mood.value = "idle";
  portrait.value.reset();
  await nextTick();
  return snapshot();
}
onMounted(() => {
  timer = setInterval(() => (data.value = portrait.value?.snapshot()), 150);
  loopTimer = setInterval(() => {
    if (loop.value)
      mood.value = mood.value === from.value ? to.value : from.value;
  }, 2200);
  window.__KUANGYE__ = { snapshot, reset, scenarios: ["emotion-lab"] };
});
onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(loopTimer);
  delete window.__KUANGYE__;
});
</script>
<template>
  <main class="lab">
    <header>
      <div>
        <small>KUANGYE / EXPRESSION STUDY</small>
        <h1>小芽的表情试验台</h1>
        <p>一点眼神，一点心情。试着连续点几种表情。</p>
      </div>
      <button @click="reset">重置试验台</button>
    </header>
    <div class="lab-workspace">
      <section class="lab-stage">
        <div class="stage-caption">
          <span>正在感受</span><strong>{{ EMOTION_NAMES[mood] }}</strong
          ><small>{{ mood }}</small>
        </div>
        <SproutPortrait
          ref="portrait"
          :mood="mood"
          :size="400"
          :frequency="frequency"
          :damping="damping"
          :blink="blink"
          :breath="breath"
          :paused="paused"
        />
        <p>移动指针，小芽会看向你</p>
        <button @click="paused = !paused">
          {{ paused ? "继续播放" : "暂停观察" }}
        </button>
      </section>
      <aside class="lab-controls">
        <h2>从一种心情，到另一种</h2>
        <div class="transition-pair">
          <label
            >起点<select aria-label="起点" v-model="from">
              <option v-for="(name, id) in EMOTION_NAMES" :value="id">
                {{ name }}
              </option>
            </select></label
          ><span>→</span
          ><label
            >终点<select aria-label="终点" v-model="to">
              <option v-for="(name, id) in EMOTION_NAMES" :value="id">
                {{ name }}
              </option>
            </select></label
          >
        </div>
        <div class="actions">
          <button class="primary" @click="replay">播放这段过渡</button
          ><button
            :aria-pressed="loop"
            @click="
              loop = !loop;
              paused = false;
            "
          >
            循环往返
          </button>
        </div>
        <h2>调整手感</h2>
        <label class="slider"
          >弹簧速度 <output>{{ frequency }}</output
          ><input
            aria-label="弹簧速度"
            type="range"
            min="5"
            max="24"
            step="1"
            v-model.number="frequency" /></label
        ><label class="slider"
          >阻尼 <output>{{ damping.toFixed(2) }}</output
          ><input
            aria-label="阻尼"
            type="range"
            min="0.65"
            max="1"
            step="0.01"
            v-model.number="damping"
        /></label>
        <p class="hint">速度越高，响应越快；阻尼越低，回弹越明显。</p>
        <div class="toggles">
          <label><input type="checkbox" v-model="blink" />眨眼</label
          ><label><input type="checkbox" v-model="breath" />呼吸与叶片</label>
        </div>
        <details>
          <summary>查看当前情绪参数</summary>
          <pre>{{ JSON.stringify(data, null, 2) }}</pre>
        </details>
      </aside>
    </div>
    <section class="mood-library">
      <div class="library-title">
        <h2>十四种小心情</h2>
        <span>随时切换，不必等动画结束</span>
      </div>
      <div class="mood-grid">
        <button
          v-for="(name, id) in EMOTION_NAMES"
          :key="id"
          :data-mood="id"
          :aria-pressed="mood === id"
          @click="choose(id)"
        >
          <SproutPortrait
            :mood="id"
            :size="98"
            :blink="false"
            :breath="false"
          /><b>{{ name }}</b
          ><small>{{ id }}</small>
        </button>
      </div>
    </section>
    <footer>
      独立试验台 · 不读取或修改游戏存档 ·
      <a href="./licenses/bloub-MIT.txt">bloub / MIT</a>
    </footer>
  </main>
</template>
<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: #f4f5ef;
  color: #354936;
  font-family: Arial, "PingFang SC", sans-serif;
}
button,
select,
input {
  font: inherit;
}
button,
select {
  border: 1px solid #cdd6c4;
  border-radius: 9px;
  background: #fffef7;
  padding: 11px 15px;
  color: inherit;
  cursor: pointer;
}
button:hover {
  background: #eaf0dd;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 3px solid #b99757;
  outline-offset: 3px;
}
button[aria-pressed="true"] {
  border-color: #5d8050;
  background: #e2ecd4;
}
.lab {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 32px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 20px;
}
header small {
  font-size: 10px;
  letter-spacing: 2px;
  color: #788a73;
}
h1 {
  font:
    32px Georgia,
    "Songti SC",
    serif;
  margin: 12px 0;
}
header p {
  font-size: 13px;
  color: #7e8a75;
}
.lab-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
  gap: 24px;
}
.lab-stage {
  background: #e8eddf;
  border: 1px solid #d8e1cc;
  border-radius: 22px;
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 26px 20px 24px;
  overflow: hidden;
  min-height: 540px;
}
.stage-caption {
  align-self: flex-start;
  display: flex;
  gap: 14px;
  align-items: baseline;
}
.stage-caption span,
.stage-caption small {
  font-size: 11px;
  color: #869276;
}
.stage-caption strong {
  font:
    24px Georgia,
    "Songti SC",
    serif;
}
.lab-stage p {
  font-size: 11px;
  color: #889278;
  margin: 0 0 15px;
}
.lab-stage > .sprout-portrait {
  width: min(400px, 100%) !important;
  height: auto !important;
  aspect-ratio: 1;
}
.lab-stage > button {
  background: transparent;
  font-size: 12px;
}
.lab-controls {
  background: #fffdf6;
  border: 1px solid #e0e2d4;
  border-radius: 20px;
  padding: 26px;
}
h2 {
  font:
    20px Georgia,
    "Songti SC",
    serif;
  margin: 0 0 20px;
}
.transition-pair {
  display: flex;
  align-items: end;
  gap: 12px;
}
.transition-pair label {
  display: grid;
  gap: 8px;
  flex: 1;
  font-size: 12px;
}
.transition-pair select {
  width: 100%;
  min-width: 0;
}
.transition-pair > span {
  padding-bottom: 13px;
}
.actions {
  display: flex;
  gap: 10px;
  margin: 18px 0 30px;
}
.actions button {
  font-size: 12px;
  flex: 1;
}
.primary {
  background: #57784c;
  color: #fff;
}
.primary:hover {
  background: #45623c;
}
.slider {
  display: block;
  font-size: 13px;
  margin: 18px 0;
}
.slider output {
  float: right;
  font-variant-numeric: tabular-nums;
}
.slider input {
  display: block;
  width: 100%;
  margin: 14px 0;
  accent-color: #72945d;
}
.hint {
  font-size: 11px;
  line-height: 1.8;
  color: #89917f;
}
.toggles {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  font-size: 13px;
}
.toggles input {
  accent-color: #64804f;
}
details {
  font-size: 12px;
  padding-top: 20px;
  border-top: 1px solid #e8e9df;
}
pre {
  font-size: 10px;
  overflow: auto;
  max-height: 190px;
}
.mood-library {
  margin-top: 30px;
}
.library-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.library-title span {
  font-size: 11px;
  color: #89917e;
}
.mood-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}
.mood-grid button {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 8px 4px 14px;
}
.mood-grid b {
  font-size: 13px;
  font-weight: 500;
}
.mood-grid small {
  font-size: 10px;
  color: #89927b;
  margin-top: 5px;
}
footer {
  padding: 26px 0 0;
  font-size: 11px;
  color: #839079;
}
footer a {
  color: inherit;
}
@media (max-width: 760px) {
  .lab {
    padding: 24px 16px;
  }
  header {
    align-items: start;
  }
  h1 {
    font-size: 23px;
  }
  header > button {
    font-size: 10px;
    padding: 9px;
    white-space: nowrap;
  }
  .lab-workspace {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .lab-stage {
    min-height: 380px;
    padding: 22px 16px;
  }
  .lab-stage > .sprout-portrait {
    width: 280px !important;
  }
  .lab-controls {
    padding: 23px;
  }
  .mood-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
  }
  .library-title {
    display: block;
  }
  .library-title span {
    display: block;
    margin: -8px 0 18px;
  }
  .stage-caption strong {
    font-size: 21px;
  }
}
</style>
