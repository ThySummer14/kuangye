<script setup>
import { ref, computed } from "vue";
import { observationEntries } from '../game/observations.js';
import { studioStatus } from '../game/studio.js';
import {
  state,
  taskById,
  levelInfo,
  catXp,
  lifeMetrics,
  exportData,
  importData,
  waitForSave,
  buddyMoment,
} from "../store.js";
import { CATS, METRICS } from "../data/tasks.js";
import { furnitureById } from "../data/furniture.js";
import BuddyFace from "./BuddyFace.vue";
import JournalMemories from "./JournalMemories.vue";
import GatheredDays from "./GatheredDays.vue";
import EtchingCabinet from "./EtchingCabinet.vue";
import { parseImport } from '../game/save.js';
import { exportAndroidFile } from "../services/android.js";
import { nativePlatform, exportBackup, pickBackup } from "../services/backup.js";
const props=defineProps({focusMemory:Object});
const view = ref('journal');
const emit = defineEmits(["toast", "chains", "library", "back-furniture", "resume", "studio", "visits", "observation"]),
  file = ref(null),
  pendingImport = ref(""),
  restoring = ref(false),
  importSummary = ref("");
const observations=computed(()=>observationEntries(state.home.observations));
const portfolio = computed(() => state.home.studio.works.filter(work => studioStatus(work,state)==='done'));
function backupName() {
  return `kuangye-${new Date().toISOString().slice(0, 10)}.json`;
}
function download(text, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function backup({ interactive = true } = {}) {
  const text = exportData();
  if (nativePlatform) {
    try {
      await exportBackup(backupName(), text, { interactive });
      if (interactive) emit("toast", "备份已保存到所选位置");
      return true;
    } catch (err) {
      emit("toast", "未能导出备份：" + err.message);
      return false;
    }
  }
  download(text, backupName());
  if (interactive) emit("toast", "已导出任务与小家备份");
  return true;
}
async function importBackup() {
  if (!nativePlatform) {
    file.value?.click();
    return;
  }
  try {
    const text = await pickBackup();
    if (!text) return;
    const s = parseImport(text);
    pendingImport.value = text;
    importSummary.value = `${s.done?.length || 0} 条完成记录，${s.active.length} 件进行中的事`;
  } catch (err) {
    emit("toast", "未能读取备份：" + err.message);
  }
}
async function readFile(e) {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const text = await f.text();
    const s = parseImport(text);
    pendingImport.value = text;
    importSummary.value = `${s.done?.length || 0} 条完成记录，${s.active.length} 件进行中的事`;
  } catch (err) {
    emit("toast", "未能读取备份：" + err.message);
  }
}
async function restore() {
  if (restoring.value) return;
  restoring.value = true;
  const original = exportData();
  let applied = false;
  try {
    if (!await backup({ interactive: false })) throw Error("未能保留当前进度，已取消恢复");
    importData(pendingImport.value);
    applied = true;
    await waitForSave();
    pendingImport.value = "";
    emit("toast", "备份已恢复，原进度也已自动导出");
  } catch (err) {
    if (applied) {
      importData(original);
      try { await waitForSave(); } catch { /* Original remains in memory and in the exported safety copy. */ }
    }
    emit("toast", "导入失败：" + err.message);
  } finally { restoring.value = false; }
}
async function report() {
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
  try {
    if (!await exportAndroidFile(lines.join("\n"), "旷野-成长报告.txt", "text/plain"))
      download(lines.join("\n"), "旷野-成长报告.txt", "text/plain;charset=utf-8");
  } catch (error) { emit("toast", error.message); return; }
  buddyMoment("proud", 3000, "你看，我们一起走了这么远。");
}
</script>
<template>
  <div class="place-tabs" role="group" aria-label="瞭望台内的去处">
    <button :class="{active:view==='journal'}" :aria-pressed="view==='journal'" @click="view='journal'">成长手记</button>
    <button :class="{active:view==='etchings'}" :aria-pressed="view==='etchings'" @click="view='etchings'">营地印记柜</button>
  </div>
  <EtchingCabinet v-if="view==='etchings'" />
  <div v-else class="journal-layout">
    <aside class="journal-summary" aria-label="成长概览">
      <BuddyFace :size="160" mood="proud" /><span class="eyebrow"
        >你走过的路，都在这里</span
      >
      <h2>Lv.{{ levelInfo.level }} {{ levelInfo.name }}</h2>
      <p>
        {{ state.done.length }} 件小事，{{ state.home.inventory.length }}
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
      <section v-if="state.home.moments.length" class="home-renovation">
        <span class="eyebrow">小家也在慢慢长大</span>
        <h3>和小芽一起的小发现</h3>
        <p v-for="m in state.home.moments.slice(0, 6)" :key="m.key">
          <small>{{ m.at.slice(0, 10) }}</small> · {{ m.text }}
        </p>
      </section>
      <div class="journal-header">
        <div>
          <h2>小芽的本子</h2>
          <p>那些认真生活的瞬间，慢慢写满这一本。</p>
        </div>
        <button class="soft-button" @click="report">导出成长报告 ↗</button>
      </div>
      <GatheredDays />
      <section v-if="portfolio.length" class="home-renovation journal-portfolio"><span class="eyebrow">自己做出来的东西</span><h3>我的作品集 · {{ portfolio.length }} 件</h3><button v-for="work in portfolio.slice(0,3)" :key="work.id" class="text-button" :data-journal-work="work.id" @click="emit('studio',work.id)">{{ work.title }} ↗</button><button class="soft-button" @click="emit('studio','')">到画室翻开全部作品</button></section>
      <section v-if="state.home.reading?.books.length" class="home-renovation"><span class="eyebrow">书页里的日子</span><h3>我的阅读书架</h3><p v-for="book in state.home.reading.books.slice(0,4)" :key="book.id">《{{ book.title }}》 · {{ book.status==='reading'?'正在读':book.finished?'已读完':'暂放书架' }} · {{ book.notes.length }} 段摘记</p><button class="soft-button" @click="emit('library')">去书屋翻开书签与摘记 ↗</button></section>
      <section v-if="state.home.visits.some(v=>v.delivered)" class="home-renovation journal-visits"><span class="eyebrow">街角的来往</span><h3>做过的事，也留在了别人的窗边。</h3><article v-for="visit in state.home.visits.filter(v=>v.delivered)" :key="visit.id" :data-journal-visit="visit.id"><p><small>{{ visit.delivered.at }}</small> · {{ visit.brief.name }} · {{ visit.delivered.title }}</p><blockquote>{{ visit.brief.reply }}</blockquote><button class="text-button" @click="emit('studio',visit.workId)">打开这次带回的作品 ↗</button></article><button class="soft-button" @click="emit('visits')">回书屋，看看街角来往 ↗</button></section>
      <section v-if="observations.length" class="home-renovation journal-observations"><span class="eyebrow">在近处停下来过</span><h3>我的观察册 · {{ observations.length }} 页</h3><button v-for="entry in observations.slice(0,3)" :key="entry.id" class="text-button" :data-journal-observation="entry.id" @click="emit('observation',entry.id)">{{ entry.observedOn }} · {{ entry.place }} ↗</button><button class="soft-button" @click="emit('observation','')">回院子，翻开全部观察页 ↗</button></section>
      <JournalMemories :focus-memory="props.focusMemory" @back-furniture="emit('back-furniture')" @toast="emit('toast', $event)" @resume="emit('resume', $event)" @studio="emit('studio',$event)" />
      <section class="backup-section">
        <div>
          <h3>把小家，好好保存。</h3>
          <p>
            {{
              nativePlatform
                ? "进度保存在这台设备的应用里。换手机或清理存储前，请先把备份存到「文件」。"
                : "进度存在当前浏览器。换设备或换网址前，请先导出备份。"
            }}
          </p>
        </div>
        <div class="placement-actions">
          <button class="soft-button" @click="backup">导出备份</button
          ><button class="text-button" @click="importBackup">导入备份</button
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
          <button class="primary-button" :disabled="restoring" @click="restore">{{ restoring ? "正在保存与恢复…" : "恢复这份备份" }}</button
          ><button class="text-button" :disabled="restoring" @click="pendingImport = ''">取消</button>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
.journal-visits article { padding-block:16px; border-bottom:1px solid var(--line); margin-bottom:20px; }
.journal-visits blockquote { margin:14px 0; font:400 15px/1.9 var(--serif); color:var(--ink-2); }
.journal-observations > button,.journal-portfolio > button { display: block; margin: 10px 0; overflow-wrap: anywhere; max-width: 100%; text-align: left; }
@media (max-width: 760px) {
  .journal-pages { order: -1; }
}
</style>
