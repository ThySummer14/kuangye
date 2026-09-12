<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { state, levelInfo, now, buddyBus, saveWarning } from "./store.js";
import WorldScene from "./components/WorldScene.vue";
import ChainsView from "./components/ChainsView.vue";
import CompleteModal from "./components/CompleteModal.vue";
import AbandonModal from "./components/AbandonModal.vue";
import BuddyFace from "./components/BuddyFace.vue";
import QuestView from "./components/QuestView.vue";
import ShopView from "./components/ShopView.vue";
import HomeView from "./components/HomeView.vue";
import JournalView from "./components/JournalView.vue";
import { registerGameTools } from "./game/webmcp.js";
import { disposeThumbnails } from "./scenes/furniture.js";
const validTabs = ["map", "tasks", "home", "shop", "panel", "quest", "chains"];
const tab = ref(
    validTabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : "map",
  ),
  completing = ref(null),
  abandoning = ref(null),
  toastMsg = ref("");
let toastTimer, unregisterTools;
function toast(t) {
  toastMsg.value = t;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg.value = ""), 3000);
}
function navigate(id) {
  tab.value = id === "journal" ? "panel" : id;
}
watch(tab, (t) => {
  location.hash = t;
  window.scrollTo({ top: 0, behavior: "instant" });
});
function hashChange() {
  const t = location.hash.slice(1);
  if (validTabs.includes(t)) tab.value = t;
}
function escape(e) {
  if (
    e.key === "Escape" &&
    !document.querySelector("dialog[open]") &&
    tab.value !== "home"
  )
    tab.value = "map";
}
onMounted(() => {
  unregisterTools = registerGameTools(navigate);
  window.addEventListener("hashchange", hashChange);
  window.addEventListener("keydown", escape);
});
onBeforeUnmount(() => {
  unregisterTools?.();
  clearTimeout(toastTimer);
  disposeThumbnails();
  window.removeEventListener("hashchange", hashChange);
  window.removeEventListener("keydown", escape);
});
const nav = [
  ["map", "⌘", "旷野地图"],
  ["tasks", "☷", "今日任务"],
  ["home", "⌂", "小芽的家"],
  ["shop", "♧", "林间集市"],
  ["panel", "◷", "成长手记"],
];
</script>
<template>
  <div class="wilderness-app">
    <header class="topbar">
      <button class="brand" @click="tab = 'map'">
        <span class="brand-symbol">✳</span
        ><span>旷野<small>KUANGYE</small></span>
      </button>
      <nav aria-label="主导航">
        <button
          v-for="[id, icon, name] in nav"
          :key="id"
          :class="{ selected: tab === id }"
          @click="tab = id"
        >
          <span>{{ icon }}</span
          >{{ name }}
        </button>
      </nav>
      <div class="top-stats">
        <span class="wallet"
          >✦ <b>{{ state.home.lumens }}</b> <small>光</small></span
        ><span class="avatar">芽</span>
      </div>
    </header>
    <main class="app-main">
      <div class="page-heading">
        <div>
          <div class="eyebrow">A LITTLE PROGRESS, A LITTLE HOME</div>
          <h1>
            {{
              tab === "map"
                ? "生活有点忙，也别忘了自己的小世界。"
                : nav.find((n) => n[0] === tab)?.[2] || "我的旅程"
            }}
          </h1>
        </div>
        <span class="date-label">{{
          new Intl.DateTimeFormat("zh-CN", {
            month: "long",
            day: "numeric",
            weekday: "short",
          }).format(now())
        }}</span>
      </div>
      <div v-if="tab === 'map'" class="explore-layout">
        <WorldScene @navigate="navigate" />
        <aside class="today-rail">
          <section class="buddy-card">
            <span class="eyebrow">小芽在等你</span>
            <div class="buddy-portrait"><BuddyFace :size="155" /></div>
            <h3>你来啦，一起慢慢长大。</h3>
            <p class="buddy-speech" aria-live="polite">
              {{
                buddyBus.text || "今天的每一点努力，都会让我们的小家暖一点。"
              }}
            </p>
            <button class="soft-button" @click="tab = 'home'">
              去小芽家坐坐 ↗
            </button>
          </section>
          <section class="little-task">
            <span class="eyebrow">今天，从这里开始</span>
            <h3>
              {{
                state.active.length
                  ? "手里有 " + state.active.length + " 件小事"
                  : "给真实的生活"
              }}<br />{{
                state.active.length ? "按自己的节奏来" : "留一点小冒险"
              }}
            </h3>
            <p>接一件事 → 收集光 → 布置小家</p>
            <button class="primary-button" @click="tab = 'tasks'">
              发现今日任务 <span>↗</span>
            </button>
          </section>
          <div class="rail-note">不用赶路。每一步，都算数。</div>
        </aside>
      </div>
      <QuestView
        v-else-if="tab === 'tasks' || tab === 'quest'"
        @complete="completing = $event"
        @abandon="abandoning = $event"
        @toast="toast"
        @chains="tab = 'chains'"
      />
      <HomeView
        v-else-if="tab === 'home'"
        @shop="tab = 'shop'"
        @journal="tab = 'panel'"
        @toast="toast"
      />
      <ShopView
        v-else-if="tab === 'shop'"
        @home="tab = 'home'"
        @toast="toast"
      />
      <JournalView
        v-else-if="tab === 'panel'"
        @toast="toast"
        @chains="tab = 'chains'"
      />
      <div v-else class="legacy-content">
        <button class="text-button" @click="tab = 'tasks'">
          ← 回到今日任务</button
        ><ChainsView :toast="toast" />
      </div>
      <p v-if="saveWarning.text" role="alert" class="save-warning">
        {{ saveWarning.text }}
      </p>

      <div class="bottom-note">
        <span>✳ 把日子过成喜欢的样子</span
        ><span
          >Lv.{{ levelInfo.level }} {{ levelInfo.name }} · 已完成
          {{ state.done.length }} 件小事</span
        ><span>你的进度保存在此浏览器</span>
      </div>
    </main>
    <CompleteModal
      v-if="completing"
      :active="completing"
      @close="completing = null"
      @done="toast"
      @shop="tab = 'shop'"
    /><AbandonModal
      v-if="abandoning"
      :active="abandoning"
      @close="abandoning = null"
      @done="toast"
    />
    <div v-if="toastMsg" class="toast" role="status">{{ toastMsg }}</div>
  </div>
</template>
