<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { state, changeHomeDecor } from "../store.js";
import { WEATHER, eastEightHour, daylight } from "../game/atmosphere.js";
import { QA } from "../game/qa.js";
import { fetchWeather } from "../services/weather.js";
const emit = defineEmits(["change"]);
const now = ref(new Date()),
  live = ref(null),
  status = ref("正在同步室外天气…"),
  loading = ref(false);
let timer,
  refresh,
  controller,
  disposed = false;
const mode = computed(() => state.home.decor.weather),
  light = computed(() => state.home.decor.light);
const effective = computed(() => ({
  weather: mode.value === "auto" ? live.value?.kind || "clear" : mode.value,
  day:
    light.value === "auto"
      ? daylight(eastEightHour(now.value))
      : light.value === "day"
        ? 1
        : light.value === "sunset"
          ? 0.4
          : 0,
  hour: eastEightHour(now.value),
}));
watch(effective, (v) => emit("change", v), { immediate: true });
async function sync(locate = false) {
  if (QA) { status.value = "本地场景 · 晴天"; return; }
  controller?.abort();
  controller = new AbortController();
  const own = controller;
  const timeout = setTimeout(() => own.abort(), 12000);
  loading.value = true;
  try {
    const data = await fetchWeather({ locate, signal: own.signal });
    if (disposed || own !== controller) return;
    live.value = data;
    status.value = `${data.label} · ${Math.round(data.temperature)}°C · ${WEATHER[data.kind]}`;
  } catch {
    if (disposed || own !== controller) return;
    status.value = live.value
      ? "同步失败，保留上次天气"
      : "天气暂不可用，暂用晴天；可手动选择";
  } finally {
    clearTimeout(timeout);
    if (own === controller) loading.value = false;
  }
}
onMounted(() => {
  sync(true);
  timer = setInterval(() => (now.value = new Date()), 30000);
  refresh = setInterval(() => {
    if (mode.value === "auto") sync();
  }, 1800000);
});
onBeforeUnmount(() => {
  disposed = true;
  clearInterval(timer);
  clearInterval(refresh);
  controller?.abort();
});
</script>
<template>
  <section class="weather-card">
    <div class="weather-title">
      <span>{{ effective.day < 0.15 ? "☾" : "☀" }} 窗外的此刻</span
      ><time
        >{{
          now.toLocaleTimeString("zh-CN", {
            timeZone: "Asia/Shanghai",
            hour: "2-digit",
            minute: "2-digit",
          })
        }}
        · UTC+8</time
      >
    </div>
    <p role="status">
      {{ mode === "auto" ? status : "自选天气 · " + WEATHER[mode] }}
    </p>
    <label
      >天气<select
        :value="mode"
        @change="changeHomeDecor('weather', $event.target.value)"
      >
        <option value="auto">跟随室外天气</option>
        <option v-for="(name, id) in WEATHER" :key="id" :value="id">
          {{ name }}
        </option>
      </select></label
    ><label
      >光线<select
        :value="light"
        @change="changeHomeDecor('light', $event.target.value)"
      >
        <option value="auto">跟随东八区时间</option>
        <option value="day">午后晴光</option>
        <option value="sunset">日落时分</option>
        <option value="night">温柔夜晚</option>
      </select></label
    ><button class="text-button" :disabled="loading" @click="sync(true)">
      {{ loading ? "同步中…" : "重新定位与同步" }}</button
    ><small
      >位置授权失败时使用新乡。仅将约公里级坐标用于查询天气，不保存定位轨迹。<a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer"
        >天气：Open-Meteo</a
      ></small
    >
  </section>
</template>
