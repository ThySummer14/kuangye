<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import * as THREE from "three";
import {
  state,
  place,
  recycle,
  taskById,
  buddyMoment,
  buddyBus,
} from "../store.js";
import { furnitureById } from "../data/furniture.js";
import { footprint, placementCheck } from "../game/placement.js";
import { refundFor } from "../game/home.js";
import { createWorld } from "../scenes/world.js";
import { decorateHome, placeModel } from "../scenes/furniture.js";
import FurnitureImage from "./FurnitureImage.vue";
import BuddyFace from "./BuddyFace.vue";
import ModalFrame from "./ModalFrame.vue";
const emit = defineEmits(["shop", "toast", "journal"]);
const host = ref(null),
  failed = ref(false),
  selected = ref(""),
  editing = ref(false),
  rotation = ref(0),
  cell = ref({ x: 2, z: 2 }),
  bag = ref("unplaced"),
  recycling = ref(false);
const current = computed(() =>
    state.home.inventory.find((i) => i.uid === selected.value),
  ),
  item = computed(() => furnitureById[current.value?.fid]);
const items = computed(() =>
  state.home.inventory.filter(
    (i) =>
      bag.value === "all" || !state.home.placed.some((p) => p.uid === i.uid),
  ),
);
const check = computed(() =>
  placementCheck(
    item.value,
    { ...cell.value, rotation: rotation.value },
    state.home.placed,
    state.home.inventory,
    selected.value,
  ),
);
const recentActivity = computed(() =>
  [
    ...state.done.map((d) => d.at),
    ...state.active.flatMap((a) => a.logs.map((l) => l.d)),
  ]
    .sort()
    .at(-1),
);
const sleepy = computed(
  () =>
    recentActivity.value &&
    (Date.now() - new Date(recentActivity.value + "T12:00:00")) / 86400000 >= 3,
);
let engine;
function select(i) {
  selected.value = i.uid;
  rotation.value =
    state.home.placed.find((p) => p.uid === i.uid)?.rotation || 0;
  editing.value = !state.home.placed.some((p) => p.uid === i.uid);
  if (editing.value) buddyMoment("curious", 1800, "你想把它放在哪里？");
}
function sync() {
  engine?.setFurniture((parent) => {
    for (const p of state.home.placed) {
      const f =
        furnitureById[state.home.inventory.find((i) => i.uid === p.uid)?.fid];
      if (f) placeModel(f, p, engine, parent);
    }
  });
}
function ghost() {
  engine?.setGhost(() => {
    if (!editing.value || !item.value) return null;
    const size = footprint(item.value, rotation.value);
    const g = new THREE.Mesh(
      new THREE.BoxGeometry(size.w - 0.08, 0.22, size.d - 0.08),
      new THREE.MeshBasicMaterial({
        color: check.value.ok ? "#77b5a0" : "#cc987c",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    g.position.set(
      cell.value.x - 3 + size.w / 2,
      0.14,
      cell.value.z - 3 + size.d / 2,
    );
    return g;
  });
}
function commit() {
  if (!editing.value || !current.value) return;
  const r = place(selected.value, { ...cell.value, rotation: rotation.value });
  emit("toast", r.ok ? `「${item.value.name}」安家了` : r.why);
  if (r.ok) {
    editing.value = false;
    sync();
  }
}
function remove() {
  state.home.placed = state.home.placed.filter((p) => p.uid !== selected.value);
  editing.value = false;
  selected.value = "";
  emit("toast", "已收回背包，随时可以重新摆放");
}
function recycleNow() {
  const name = item.value.name;
  const refund = recycle(selected.value);
  recycling.value = false;
  selected.value = "";
  editing.value = false;
  if (refund !== null) emit("toast", `已回收${name}，返还 ${refund} 光`);
}
function key(e) {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === "Escape") {
    editing.value = false;
    selected.value = "";
    recycling.value = false;
  }
  if (!editing.value) return;
  if (e.key.toLowerCase() === "r") rotation.value = (rotation.value + 1) % 4;
  const map = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  if (map[e.key]) {
    e.preventDefault();
    cell.value = {
      x: Math.max(0, Math.min(5, cell.value.x + map[e.key][0])),
      z: Math.max(0, Math.min(5, cell.value.z + map[e.key][1])),
    };
  }
}
onMounted(() => {
  try {
    engine = createWorld(host.value, {
      mode: "home",
      getMood: () =>
        Date.now() < buddyBus.at
          ? buddyBus.mood
          : sleepy.value
            ? "sleepy"
            : "idle",
      onPick: (uid) => {
        if (editing.value) return false;
        const i = state.home.inventory.find((i) => i.uid === uid);
        if (i) {
          select(i);
          return true;
        }
        return false;
      },
      onCell: (c, click) => {
        if (editing.value) {
          cell.value = c;
          if (click) commit();
        }
      },
      onReady: (_, info) => {
        if (host.value) host.value.dataset.drawCalls = info.calls;
      },
    });
    engine.setHome(decorateHome);
    sync();
    engine.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      failed.value = true;
    });
  } catch {
    failed.value = true;
  }
  window.addEventListener("keydown", key);
  if (sleepy.value) buddyMoment("sleepy", 5000, "睡醒就能见到你，真好。");
});
watch(() => state.home.placed, sync, { deep: true });
watch(() => state.home.inventory, sync, { deep: true });
watch([editing, item, rotation, cell, check], ghost, { deep: true });
onBeforeUnmount(() => {
  engine?.dispose();
  window.removeEventListener("keydown", key);
});
</script>
<template>
  <div class="home-layout">
    <section class="home-main">
      <div class="home-stage" :class="{ sleepy }">
        <div class="home-heading">
          <div>
            <span class="eyebrow">A HOME MADE OF LITTLE MOMENTS</span>
            <h2>小芽的家</h2>
            <p>
              {{
                sleepy
                  ? "暖灯开着。慢慢来，小芽也在休息。"
                  : "阳光落进来，今天也有一个属于你的角落。"
              }}
            </p>
          </div>
          <button class="soft-button" @click="emit('journal')">
            ▤ 小芽的本子
          </button>
        </div>
        <div
          ref="host"
          class="home-canvas"
          aria-label="小芽的 3D 房间，选择家具后点击地面放置"
        />
        <div v-if="failed" class="scene-fallback">
          3D 暂时不可用。选择背包中的家具，再用下方平面格子布置，小家仍会保存。
        </div>
        <div class="home-status">
          <span>{{ state.home.placed.length }} 件家具 · 3 × 3 米的温柔</span
          ><button aria-label="恢复房间视角" @click="engine?.reset()">⟳</button>
        </div>
        <span v-if="editing" class="placement-banner"
          >{{ check.why }} · 点击地面放下</span
        >
      </div>
      <div class="inventory">
        <div class="inventory-heading">
          <h3>
            我的背包 <span>{{ state.home.inventory.length }}</span>
          </h3>
          <div class="small-tabs">
            <button
              :class="{ active: bag === 'unplaced' }"
              @click="bag = 'unplaced'"
            >
              待布置</button
            ><button :class="{ active: bag === 'all' }" @click="bag = 'all'">
              全部家具
            </button>
          </div>
          <button class="text-button" @click="emit('shop')">
            去集市逛逛 ↗
          </button>
        </div>
        <div v-if="!items.length" class="inventory-empty">
          <span>这里留着下一个小期待。</span>
          <p>
            {{
              state.home.inventory.length
                ? "家具都安家啦。点击房间中的家具，可以移动或查看回忆。"
                : "完成一件小事，就能去集市带回第一件家具。"
            }}
          </p>
          <button class="soft-button" @click="emit('shop')">
            {{
              state.home.inventory.length
                ? "再去集市看看 ↗"
                : "挑第一件小物 ↗"
            }}
          </button>
        </div>
        <div v-else class="inventory-items">
          <button
            v-for="i in items"
            :key="i.uid"
            :class="{ selected: selected === i.uid }"
            class="inventory-item"
            @click="select(i)"
          >
            <FurnitureImage :item="furnitureById[i.fid]" /><span>{{
              furnitureById[i.fid].name
            }}</span
            ><small>{{
              state.home.placed.some((p) => p.uid === i.uid)
                ? "已在家中"
                : "点击布置"
            }}</small>
          </button>
        </div>
      </div>
    </section>
    <aside class="home-aside">
      <section v-if="current" class="placement-card">
        <span class="eyebrow">{{
          editing ? "给它找一个位置" : "家里的小小纪念"
        }}</span
        ><FurnitureImage :item="item" />
        <h3>{{ item.name }}</h3>
        <p>{{ item.description }}</p>
        <template v-if="editing"
          ><div
            class="placement-grid"
            role="group"
            aria-label="房间平面放置格子"
          >
            <template v-for="z in 6" :key="z"
              ><button
                v-for="x in 6"
                :key="x"
                :aria-label="`选择第${z}行第${x}列`"
                :class="{
                  chosen: cell.x === x - 1 && cell.z === z - 1,
                  occupied: state.home.placed.some((p) => {
                    const f =
                      furnitureById[
                        state.home.inventory.find((i) => i.uid === p.uid)?.fid
                      ];
                    const size = footprint(f, p.rotation);
                    return (
                      p.uid !== selected &&
                      x - 1 >= p.x &&
                      x - 1 < p.x + size.w &&
                      z - 1 >= p.z &&
                      z - 1 < p.z + size.d
                    );
                  }),
                }"
                @click="cell = { x: x - 1, z: z - 1 }"
            /></template>
          </div>
          <div class="placement-feedback" role="status">{{ check.why }}</div>
          <div class="placement-actions">
            <button class="soft-button" @click="rotation = (rotation + 1) % 4">
              旋转 90°</button
            ><button
              class="primary-button"
              :disabled="!check.ok"
              @click="commit"
            >
              放在这里
            </button>
          </div>
          <button class="text-button" @click="editing = false">取消布置</button
          ><small>方向键选位置 · R 旋转 · Esc 取消</small></template
        ><template v-else
          ><div v-if="current.memory" class="memory-plaque">
            <span>✦ 这件家具，记得那一天</span>
            <h4>
              {{ taskById[current.memory.qid]?.title || "一次小小的成长" }}
            </h4>
            <blockquote>
              {{ current.memory.review || "那天，我为自己完成了一件事。" }}
            </blockquote>
            <time>{{ current.memory.date }}</time>
          </div>
          <div v-else class="memory-plaque">
            {{
              item.stall === "gift"
                ? "这是成长送给你的礼物。"
                : "这是你为小芽选的一点温柔。"
            }}
          </div>
          <div class="placement-actions">
            <button class="primary-button" @click="editing = true">
              移动位置</button
            ><button class="soft-button" @click="remove">收回背包</button>
          </div>
          <button
            v-if="item.stall !== 'gift'"
            class="text-button"
            @click="recycling = true"
          >
            回收 · 返还 {{ refundFor(current.paid) }} 光
          </button></template
        >
      </section>
      <section v-else class="home-buddy-card">
        <BuddyFace :size="180" :mood="sleepy ? 'sleepy' : undefined" />
        <h3>这就是我们的家啦。</h3>
        <p>
          不必一下子填满。<br />你带回来的每一件东西，<br />小芽都会认真喜欢。
        </p>
        <div class="home-tip">
          先从背包挑一件家具，<br />再点屋里的空地放下。<br />点击已放好的家具，看看它的回忆。
        </div>
      </section>
    </aside>
    <ModalFrame v-if="recycling" label="回收家具" @close="recycling = false"
      ><h3>把这件家具交还给集市？</h3>
      <p>返还 {{ refundFor(current?.paid) }} 光，任务回忆仍保存在手记里。</p>
      <div class="placement-actions">
        <button class="soft-button" @click="recycling = false">留下它</button
        ><button class="primary-button" @click="recycleNow">确认回收</button>
      </div></ModalFrame
    >
  </div>
</template>
