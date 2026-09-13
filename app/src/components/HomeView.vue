<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import * as THREE from "three";
import {
  state,
  expandHome,
  changeHomeDecor,
  rememberHomeInteraction,
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
import { roomOf, expansionOffer, WALLS, FLOORS } from "../game/room.js";
import { homeLife } from "../scenes/home-life.js";
import { INTERACTIONS } from "../game/buddy-walk.js";
const room = computed(() => roomOf(state.home));
const expansion = ref(null),
  speech = ref("点点空地，我就蹦过去。拖动画面可以转动小家。");
let life;
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
    room.value,
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
      if (f) placeModel(f, p, engine, parent, room.value);
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
      cell.value.x - room.value.w / 2 + size.w / 2,
      0.14,
      cell.value.z - room.value.d / 2 + size.d / 2,
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
      x: Math.max(0, Math.min(room.value.w - 1, cell.value.x + map[e.key][0])),
      z: Math.max(0, Math.min(room.value.d - 1, cell.value.z + map[e.key][1])),
    };
  }
}
function boot() {
  engine?.dispose();
  host.value?.replaceChildren();
  try {
    failed.value = false;
    engine = createWorld(host.value, {
      onPet: () => life?.pet(),
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
        } else if (click && !life?.walk(c))
          emit("toast", "这里暂时走不过去，给小芽留一条小路吧。");
      },
      onReady: (_, info) => {
        if (host.value) host.value.dataset.drawCalls = info.calls;
      },
    });
    engine.setRoomSize(room.value);
    engine.setLighting(state.home.decor.light);
    engine.setHome((api) => decorateHome(api, room.value, state.home.decor));
    life = homeLife(
      engine,
      () => state.home,
      (a) => {
        speech.value = a.text;
        buddyMoment(a.mood, 5000, a.text);
        rememberHomeInteraction(a.model, a.text);
      },
    );
    sync();
    ghost();
    const activeEngine = engine;
    engine.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      if (engine !== activeEngine) return;
      e.preventDefault();
      failed.value = true;
    });
  } catch {
    failed.value = true;
  }
}
function expandNow() {
  const r = expandHome(expansion.value);
  expansion.value = null;
  emit("toast", r.ok ? `小家扩建到 ${r.area} 平方米啦！` : r.why);
}
function interact() {
  if (!life?.interact(selected.value))
    emit("toast", "小芽走不到这里，挪开一点家具试试。");
}
onMounted(() => {
  boot();
  window.addEventListener("keydown", key);
  if (sleepy.value) buddyMoment("sleepy", 5000, "睡醒就能见到你，真好。");
});
watch(() => [state.home.room, state.home.decor], boot, { deep: true });
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
      <div class="home-stage" :class="[{ sleepy }, state.home.decor.light]">
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
          <span
            >{{ state.home.placed.length }} 件家具 · {{ room.w / 2 }} ×
            {{ room.d / 2 }} 米</span
          ><button aria-label="恢复房间视角" @click="engine?.reset()">⟳</button>
        </div>
        <span v-if="editing" class="placement-banner"
          >{{ check.why }} · 点击地面放下</span
        >
      </div>
      <div class="home-controls">
        <p class="life-speech" role="status">🌱 {{ speech }}</p>
        <div class="placement-actions">
          <button class="soft-button" @click="life?.pet()">摸摸小芽</button
          ><button class="soft-button" @click="engine?.turn(-0.4)">
            ↶ 转一转</button
          ><button class="soft-button" @click="engine?.turn(0.4)">
            转一转 ↷</button
          ><button class="soft-button" @click="engine?.zoom(-2)">＋</button
          ><button class="soft-button" @click="engine?.zoom(2)">－</button
          ><button class="soft-button" @click="engine?.overhead()">
            俯瞰布置
          </button>
        </div>
        <small>拖动旋转与调整高度 · 双指或滚轮缩放 · 点空地让小芽散步</small>
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
            :style="{ gridTemplateColumns: `repeat(${room.w},1fr)` }"
            role="group"
            aria-label="房间平面放置格子"
          >
            <template v-for="z in room.d" :key="z"
              ><button
                v-for="x in room.w"
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
          <button class="primary-button" @click="interact">
            {{ INTERACTIONS[item.model]?.name || "让小芽看看它" }}
          </button>
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
      <section class="home-renovation">
        <span class="eyebrow">GROW A LITTLE HOME</span>
        <h3>给生活多一点空间</h3>
        <p>现在 {{ (room.w * room.d) / 4 }} m²，慢慢长成理想的小家。</p>
        <button
          v-for="axis in ['w', 'd']"
          :key="axis"
          class="soft-button"
          :disabled="!expansionOffer(state.home, axis)"
          @click="expansion = axis"
        >
          {{ axis === "w" ? "向右扩建" : "向前扩建" }} ·
          {{ expansionOffer(state.home, axis)?.price ?? "已达上限" }} 光
        </button>
        <h4>换一种心情 · 免费</h4>
        <label
          >光线<select
            :value="state.home.decor.light"
            @change="changeHomeDecor('light', $event.target.value)"
          >
            <option value="day">午后晴光</option>
            <option value="sunset">日落时分</option>
            <option value="night">温柔夜晚</option>
          </select></label
        ><label
          >墙面<select
            :value="state.home.decor.wall"
            @change="changeHomeDecor('wall', $event.target.value)"
          >
            <option v-for="(v, k) in WALLS" :key="k" :value="k">
              {{ v.name }}
            </option>
          </select></label
        ><label
          >地板<select
            :value="state.home.decor.floor"
            @change="changeHomeDecor('floor', $event.target.value)"
          >
            <option v-for="(v, k) in FLOORS" :key="k" :value="k">
              {{ v.name }}
            </option>
          </select></label
        >
        <p v-if="state.home.moments.length" class="home-tip">
          最近的小发现：{{ state.home.moments[0].text }}
        </p>
      </section>
    </aside>
    <ModalFrame v-if="expansion" label="扩建小家" @close="expansion = null"
      ><h3>让小家再长大一点</h3>
      <p>
        花费 {{ expansionOffer(state.home, expansion)?.price }} 光，增加
        {{ expansionOffer(state.home, expansion)?.addedArea }}
        m²。现有家具会留在原来的格子。
      </p>
      <div class="placement-actions">
        <button class="soft-button" @click="expansion = null">再想想</button
        ><button
          class="primary-button"
          :disabled="
            state.home.lumens < expansionOffer(state.home, expansion)?.price
          "
          @click="expandNow"
        >
          确认扩建
        </button>
      </div></ModalFrame
    >
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
