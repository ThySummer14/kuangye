<script setup>
import { ref, computed } from "vue";
import {
  state,
  taskById,
  levelInfo,
  catXp,
  lifeMetrics,
  exportData,
  importData,
  buddyMoment,
} from "../store.js";
import { CATS, METRICS } from "../data/tasks.js";
import { furnitureById } from "../data/furniture.js";
import BuddyFace from "./BuddyFace.vue";
const emit = defineEmits(["toast", "chains"]),
  file = ref(null),
  filter = ref("done"),
  pendingImport = ref(""),
  importSummary = ref("");
const records = computed(() =>
  [...(filter.value === "done" ? state.done : state.abandoned)].reverse(),
);
function download(text, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function backup() {
  download(
    exportData(),
    `kuangye-${new Date().toISOString().slice(0, 10)}.json`,
  );
  emit("toast", "已导出任务与小家备份");
}
async function readFile(e) {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const text = await f.text();
    const raw = JSON.parse(text),
      s = raw.state || raw;
    if (!Array.isArray(s.active)) throw new Error("缺少任务记录");
    pendingImport.value = text;
    importSummary.value = `${s.done?.length || 0} 条完成记录，${s.active.length} 件进行中的事`;
  } catch (err) {
    emit("toast", "未能读取备份：" + err.message);
  }
}
function restore() {
  try {
    backup();
    importData(pendingImport.value);
    pendingImport.value = "";
    emit("toast", "备份已恢复，原进度也已自动导出");
  } catch (err) {
    emit("toast", "导入失败：" + err.message);
  }
}
function report() {
  const lines = [
    "旷野 · 小家的成长报告",
    new Date().toLocaleDateString("zh-CN"),
    "",
    `完成 ${state.done.length} 件事 · Lv.${levelInfo.value.level} ${levelInfo.value.name}`,
    `小家收藏 ${state.home.inventory.length} 件家具，已布置 ${state.home.placed.length} 件`,
    `获得 ${state.home.earned} 光 · 花费 ${state.home.spent} 光 · 回收 ${state.home.refunded} 光 · 余额 ${state.home.lumens} 光`,
    "",
    ...state.done.map(
      (d) =>
        `${d.at} ${taskById[d.qid]?.title}\n${d.review || "完成了一件事，把一点光带回家。"}`,
    ),
    "",
    "家中的记忆",
    ...state.home.inventory
      .filter((i) => i.memory)
      .map(
        (i) =>
          `${furnitureById[i.fid].name}：${taskById[i.memory.qid]?.title} / ${i.memory.review}`,
      ),
  ];
  download(lines.join("\n"), "旷野-成长报告.txt", "text/plain;charset=utf-8");
  buddyMoment("proud", 3000, "你看，我们一起走了这么远。");
}
</script>
<template>
  <div class="journal-layout">
    <aside class="journal-summary">
      <BuddyFace :size="160" mood="proud" /><span class="eyebrow"
        >你走过的路，都在这里</span
      >
      <h2>Lv.{{ levelInfo.level }} {{ levelInfo.name }}</h2>
      <p>
        {{ state.done.length }} 件小事，{{
          state.home.inventory.length
        }}
        件家的收藏
      </p>
      <div class="task-progress">
        <i :style="{ width: (levelInfo.cur / levelInfo.need) * 100 + '%' }" />
      </div>
      <small
        >{{ levelInfo.cur }} / {{ levelInfo.need }} XP · 下一站 Lv.{{
          levelInfo.level + 1
        }}</small
      >
      <div class="attributes">
        <div v-for="(c, id) in CATS" :key="id">
          <span>{{ c.attr }}</span>
          <div>
            <i
              :style="{
                width: Math.min(100, (catXp[id] / 500) * 100) + '%',
                background: c.color,
              }"
            />
          </div>
          <b>{{ catXp[id] }}</b>
        </div>
      </div>
      <button class="soft-button" @click="emit('chains')">
        继续我的成长线 ↗
      </button>
      <div v-if="Object.keys(lifeMetrics).length" class="life-metrics">
        <div v-for="(v, k) in lifeMetrics" :key="k">
          <b
            >{{ v }} <small>{{ METRICS[k]?.unit }}</small></b
          ><span>{{ METRICS[k]?.label || k }}</span>
        </div>
      </div>
    </aside>
    <section class="journal-pages">
      <div class="journal-header">
        <div>
          <span class="eyebrow">XIAO YA'S NOTEBOOK</span>
          <h2>小芽的本子</h2>
          <p>那些认真生活的瞬间，慢慢写满这一本。</p>
        </div>
        <button class="soft-button" @click="report">导出成长报告 ↗</button>
      </div>
      <div class="place-tabs">
        <button :class="{ active: filter === 'done' }" @click="filter = 'done'">
          完成的事 · {{ state.done.length }}</button
        ><button
          :class="{ active: filter === 'rest' }"
          @click="filter = 'rest'"
        >
          暂时放下 · {{ state.abandoned.length }}
        </button>
      </div>
      <div v-if="!records.length" class="journal-empty">
        <span>▤</span>
        <h3>第一页，留给下一次小小的出发。</h3>
        <p>完成任务时写下的回顾，会被小芽好好收在这里。</p>
      </div>
      <article
        v-for="(d, i) in records"
        :key="d.qid + ':' + i"
        class="journal-entry"
      >
        <time>{{ d.at }}</time>
        <div>
          <h3>{{ taskById[d.qid]?.title }}</h3>
          <p>
            {{
              d.review ||
              d.reason ||
              (filter === "done"
                ? "那天，我为自己完成了一件事。"
                : "把手里的事放一放，也是一种选择。")
            }}
          </p>
          <span v-if="filter === 'done'" class="entry-xp"
            >＋{{ d.xp }} XP · {{ CATS[taskById[d.qid]?.cat]?.name }}</span
          >
        </div>
      </article>
      <section class="backup-section">
        <div>
          <h3>把小家，好好保存。</h3>
          <p>进度存在当前浏览器。换设备或换网址前，请先导出备份。</p>
        </div>
        <div class="placement-actions">
          <button class="soft-button" @click="backup">导出备份</button
          ><button class="text-button" @click="file.click()">导入备份</button
          ><input
            ref="file"
            type="file"
            accept=".json,application/json"
            hidden
            @change="readFile"
          />
        </div>
        <div v-if="pendingImport" class="import-confirm" role="alert">
          <p>
            此备份含
            {{ importSummary }}。恢复会替换当前进度，我们会先自动导出原进度。
          </p>
          <button class="primary-button" @click="restore">恢复这份备份</button
          ><button class="text-button" @click="pendingImport = ''">取消</button>
        </div>
      </section>
    </section>
  </div>
</template>
