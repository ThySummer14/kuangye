<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import {
  state, taskById, levelInfo, catXp, earnedTitles, lifeMetrics, maxStreakDays,
  exportData, importData, resetData, now,
} from '../store'
import { CATS, METRICS } from '../data/tasks'
// 3D 场景懒加载：进面板才下载 three.js
const SkyDiorama = defineAsyncComponent(() => import('./SkyDiorama.vue'))

const props = defineProps({ toast: Function })

const metrics = computed(() =>
  Object.entries(lifeMetrics.value)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b.v - a.v)
    .map(([k, v]) => ({ key: k, v, ...METRICS[k] }))
)
const doneSorted = computed(() =>
  [...state.done].sort((a, b) => b.at.localeCompare(a.at)).map((d) => ({ ...d, task: taskById[d.qid] }))
)
const abanSorted = computed(() =>
  [...state.abandoned].sort((a, b) => b.at.localeCompare(a.at)).map((d) => ({ ...d, task: taskById[d.qid] }))
)
const ATTR_MAX = 500
const attrRatio = (xp) => Math.min(1, xp / ATTR_MAX)
const xpRatio = computed(() => Math.min(1, levelInfo.value.cur / levelInfo.value.need))

function doExport() {
  const blob = new Blob([exportData()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `kuangye-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  props.toast('已导出备份 JSON')
}
const fileEl = ref(null)
function onFile(e) {
  const f = e.target.files[0]
  if (!f) return
  const r = new FileReader()
  r.onload = () => {
    try {
      importData(r.result)
      props.toast('导入成功')
    } catch (err) {
      props.toast('导入失败：' + err.message)
    }
  }
  r.readAsText(f)
  e.target.value = ''
}
function onReset() {
  if (confirm('确定清空所有数据？不可恢复（建议先导出备份）。')) {
    resetData()
    props.toast('已重置为全新档')
  }
}
</script>

<template>
  <!-- 小芽的家（3D 场景） -->
  <div class="hero-card">
    <SkyDiorama />
  </div>

  <!-- 角色信息 -->
  <div class="char-card">
    <div class="char-row">
      <span class="lvl-pill"><span class="lv">Lv</span><span class="n">{{ levelInfo.level }}</span></span>
      <div>
        <div class="char-name">{{ levelInfo.name }}</div>
        <div class="char-title">{{ earnedTitles.length ? earnedTitles.join(' · ') : '尚无称号——先拿下 100 XP 的领域' }}</div>
        <div class="char-sub">总经验 {{ levelInfo.xp }} · 完成 {{ state.done.length }} 项支线 · 最长连击 {{ maxStreakDays }} 天</div>
      </div>
    </div>
    <div class="xp-line">
      <div class="qc-progress-line">
        <span>距 Lv{{ levelInfo.level + 1 }}</span>
        <span><b>{{ levelInfo.cur }}</b> / {{ levelInfo.need }}</span>
      </div>
      <div class="bar"><i :style="{ '--p': xpRatio }" /></div>
    </div>
  </div>

  <!-- 五维属性 -->
  <div class="section-h"><span class="t">五维属性</span><span class="s">由各领域 XP 生长</span><span class="line" /></div>
  <div class="char-card" style="margin-top: 0">
    <div v-for="(c, key) in CATS" :key="key" class="attr-row">
      <span class="attr-name">{{ CATS[key].attr }}</span>
      <span class="attr-bar"><i :style="{ '--p': attrRatio(catXp[key]), background: `linear-gradient(90deg, ${CATS[key].color}88, ${CATS[key].color})` }" /></span>
      <span class="attr-xp">{{ catXp[key] }}</span>
    </div>
  </div>

  <!-- 人生累计卡 -->
  <div class="section-h"><span class="t">人生累计卡</span><span class="s">迄今为止的一切</span><span class="line" /></div>
  <div v-if="metrics.length" class="metric-grid">
    <div v-for="m in metrics" :key="m.key" class="metric-cell">
      <span class="ic">{{ m.icon }}</span>
      <div>
        <div class="v">{{ m.v }}<small>{{ m.unit }}</small></div>
        <div class="k">{{ m.label }}</div>
      </div>
    </div>
  </div>
  <div v-else class="empty" style="padding: 22px 0">
    还没有累计数据。完成带「量」的任务，这里会慢慢长出你的人生。
  </div>

  <!-- 时间轴 -->
  <div class="section-h"><span class="t">完成时间轴</span><span class="s">{{ state.done.length }} 项战利品</span><span class="line" /></div>
  <div v-if="doneSorted.length" class="char-card" style="margin-top: 0">
    <div v-for="d in doneSorted" :key="d.qid + d.at" class="timeline-item">
      <span class="tl-date">{{ d.at.slice(5) }}</span>
      <div class="tl-body">
        <div class="tl-title">{{ d.task?.title || d.qid }}</div>
        <div v-if="d.review" class="tl-review">「{{ d.review }}」</div>
      </div>
      <span class="tl-xp">+{{ d.xp }}</span>
    </div>
  </div>
  <div v-else class="empty" style="padding: 22px 0">第一份战利品还空着。</div>

  <!-- 墓志铭 -->
  <details v-if="abanSorted.length" class="mor">
    <summary>墓志铭 · 放弃的支线（{{ abanSorted.length }}）</summary>
    <div class="char-card" style="margin-top: 8px">
      <div v-for="a in abanSorted" :key="a.qid + a.at" class="timeline-item">
        <span class="tl-date">{{ a.at.slice(5) }}</span>
        <div class="tl-body">
          <div class="tl-title">{{ a.task?.title || a.qid }}</div>
          <div v-if="a.reason" class="tl-review">「{{ a.reason }}」</div>
        </div>
      </div>
    </div>
  </details>

  <!-- 数据 -->
  <div class="section-h"><span class="t">数据</span><span class="s">一切都在这台设备的浏览器里</span><span class="line" /></div>
  <div class="char-card" style="margin-top: 0">
    <div class="setting-row">
      <button class="btn btn-sm" @click="doExport">导出备份 JSON</button>
      <button class="btn btn-sm" @click="fileEl.click()">导入</button>
      <input ref="fileEl" type="file" accept="application/json" style="display: none" @change="onFile" />
      <button class="btn btn-sm" style="color: var(--danger)" @click="onReset">重置</button>
    </div>
    <div class="setting-row">
      <span>时间旅行（预览赛季各阶段）：</span>
      <input type="date" v-model="state.settings.devDate" />
      <button v-if="state.settings.devDate" class="btn btn-sm" @click="state.settings.devDate = ''">回到今天</button>
    </div>
    <div class="setting-row" style="color: var(--ink-3)">旷野 v0.1 雏形 · 数据仅存本机，不上传任何服务器</div>
  </div>
</template>
