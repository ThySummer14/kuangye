<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { buddyBus } from "../store.js";
import { createWorld } from "../scenes/world.js";
const emit = defineEmits(["navigate"]);
const host = ref(null),
  labels = ref({}),
  failed = ref(false);
const places = [
  { id: "atelier", name: "小小画室", sub: "小芽的表情试验台", icon: "✎" },
  { id: "woodshop", name: "木器铺", sub: "找木木师傅装修", icon: "⌑" },
  { id: "home", name: "小芽的家", sub: "把喜欢的生活，放进家里", icon: "⌂" },
  { id: "shop", name: "林间集市", sub: "去挑一件心动的小物", icon: "♧" },
  { id: "tasks", name: "任务岩壁", sub: "从一件小事出发", icon: "☷" },
  { id: "journal", name: "瞭望台 · 成长手记", sub: "看看走过的路", icon: "⌁" },
];
let engine;
onMounted(() => {
  try {
    engine = createWorld(host.value, {
      getMood: () => (Date.now() < buddyBus.at ? buddyBus.mood : "idle"),
      onNavigate: (id) => emit("navigate", id),
      onReady: (l, info) => {
        const h = host.value;
        if (!h) return;
        h.dataset.drawCalls = info.calls;
        const bounds = [];
        labels.value = Object.fromEntries(
          Object.entries(l).map(([k, v]) => {
            const button = h.parentElement.querySelector(`[data-place="${k}"]`);
            const w = button?.offsetWidth || 112,
              height = Math.max(44, button?.offsetHeight || 44);
            const pw = h.parentElement.clientWidth,
              ph = h.parentElement.clientHeight;
            const x = Math.max(
              w / 2 + 10,
              Math.min(
                pw - w / 2 - 10,
                h.offsetLeft + (v.left / 100) * h.clientWidth,
              ),
            );
            let y = Math.max(
              160,
              Math.min(ph - 90, h.offsetTop + (v.top / 100) * h.clientHeight),
            );
            for (let attempt = 0; attempt < 12; attempt++) {
              const collision = bounds.find(
                (b) =>
                  Math.abs(x - b.x) < (w + b.w) / 2 + 6 &&
                  Math.abs(y - b.y) < (height + b.h) / 2 + 6,
              );
              if (!collision) break;
              y = collision.y + (height + collision.h) / 2 + 8;
            }
            bounds.push({ x, y, w, h: height });
            return [k, { left: (x / pw) * 100, top: (y / ph) * 100 }];
          }),
        );
      },
    });
    engine.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      failed.value = true;
    });
  } catch {
    failed.value = true;
  }
});
onBeforeUnmount(() => engine?.dispose());
</script>
<template>
  <div class="world-stage" :class="{ 'map-failed': failed }">
    <div
      ref="host"
      class="world-canvas"
      aria-label="可拖动旋转的 3D 旷野小岛"
    />
    <div class="map-caption">
      <span>YOUR LITTLE WILDERNESS</span>
      <h2>风刚好，去逛逛吧。</h2>
      <p>点一个地方，开始今天的小冒险</p>
    </div>
    <button
      v-for="p in places"
      :key="p.id"
      :data-place="p.id"
      class="poi-label"
      :class="p.id"
      :style="
        labels[p.id]
          ? { left: labels[p.id].left + '%', top: labels[p.id].top + '%' }
          : {}
      "
      @click="engine && !failed ? engine.flyTo(p.id) : emit('navigate', p.id)"
    >
      <span>{{ p.icon }}</span
      ><b>{{ p.name }}</b
      ><i>↗</i>
    </button>
    <div v-if="failed" class="scene-fallback">
      这台设备暂时无法显示 3D 小岛。可以用场所按钮继续探索。
    </div>
    <div class="map-weather">
      ☀ <span>旷野 · 晴<br /><small>适合慢慢来的一天</small></span>
    </div>
    <div class="map-controls">
      <button aria-label="放大地图" @click="engine?.zoom(-2)">＋</button
      ><button aria-label="缩小地图" @click="engine?.zoom(2)">−</button
      ><button aria-label="恢复地图视角" @click="engine?.reset()">⟳</button>
    </div>
    <span class="map-hint">拖动转一转 · 滚动缩放</span>
  </div>
</template>
