<script setup>
import { ref, computed } from "vue";
import { state, expandHome, changeHomeDecor } from "../store.js";
import { roomOf, expansionOffer, WALLS, FLOORS } from "../game/room.js";
import ModalFrame from "./ModalFrame.vue";
const emit = defineEmits(["toast"]);
const room = computed(() => roomOf(state.home));
const axis = ref("w"),
  confirming = ref(false),
  note = ref("选一块喜欢的样本，我们慢慢把家装好。");
const offer = computed(() => expansionOffer(state.home, axis.value));
function apply(kind, id) {
  changeHomeDecor(kind, id);
  note.value =
    "已经换好" +
    (kind === "wall" ? WALLS[id].name : FLOORS[id].name) +
    "，回家就能看见。";
}
function expand() {
  const result = expandHome(axis.value);
  confirming.value = false;
  note.value = result.ok
    ? `完工啦！小家现在有 ${result.area} 平方米。`
    : result.why;
  emit("toast", note.value);
}
</script>
<template>
  <div class="woodshop-layout">
    <section class="workshop-bench">
      <div class="workshop-sign">
        <span>木木 · 手作与修缮</span><small>从一块木头，开始家的新模样</small>
      </div>
      <div class="workshop-samples">
        <h2>墙面样本 <small>免费换色</small></h2>
        <div class="sample-row">
          <button
            v-for="(v, id) in WALLS"
            :key="id"
            :aria-pressed="state.home.decor.wall === id"
            @click="apply('wall', id)"
          >
            <span
              class="wall-swatch"
              :style="{ background: v.color, borderColor: v.trim }"
              ><i></i
            ></span>
            <b>{{ v.name }}</b
            ><small>{{
              state.home.decor.wall === id ? "✓ 家里正在用" : "选这块墙色"
            }}</small>
          </button>
        </div>
        <h2>脚下的温度 <small>免费更换地板</small></h2>
        <div class="sample-row floor-samples">
          <button
            v-for="(v, id) in FLOORS"
            :key="id"
            :aria-pressed="state.home.decor.floor === id"
            @click="apply('floor', id)"
          >
            <span class="floor-swatch"
              ><i
                v-for="n in 6"
                :key="n"
                :style="{ background: v.colors[n % 3] }"
              ></i
            ></span>
            <b>{{ v.name }}</b
            ><small>{{
              state.home.decor.floor === id ? "✓ 家里正在用" : "铺上这款木地板"
            }}</small>
          </button>
        </div>
      </div>
      <div class="bench-edge" aria-hidden="true">
        <span>⌑</span> 木纹各有不同，喜欢就好。
      </div>
    </section>
    <aside class="workshop-order">
      <div class="workshop-host">
        <div class="craftsman-portrait" aria-hidden="true">
          <span class="craft-hat"></span><span class="craft-face">• ᴗ •</span
          ><span class="craft-apron">✂</span>
        </div>
        <div>
          <small>今天也开着门</small>
          <h2>木木师傅</h2>
        </div>
      </div>
      <p class="workshop-speech" role="status">“{{ note }}”</p>
      <h3>让小家长大一点</h3>
      <p>
        现在 {{ room.w / 2 }} × {{ room.d / 2 }} 米 ·
        <b>{{ (room.w * room.d) / 4 }} m²</b>
      </p>
      <div class="room-blueprint" :class="axis" aria-label="扩建方向示意">
        <div
          class="blueprint-room"
          :style="{ '--room-w': room.w, '--room-d': room.d }"
        >
          <span>小芽的家<br />{{ (room.w * room.d) / 4 }} m²</span>
        </div>
        <span class="extension-strip" v-if="offer"
          >{{ axis === "w" ? "→" : "↓" }} +1 米</span
        >
      </div>
      <div class="axis-options">
        <button
          v-for="id in ['w', 'd']"
          :key="id"
          class="soft-button"
          :aria-pressed="axis === id"
          @click="axis = id"
        >
          {{ id === "w" ? "向右扩建 →" : "向前扩建 ↓" }}
        </button>
      </div>
      <template v-if="offer"
        ><p>
          增加 {{ offer.addedArea }} m²，扩建后
          {{ offer.area }} m²。<br /><small
            >家具留在原来的格子，不用重新布置。</small
          >
        </p>
        <button
          class="primary-button"
          :disabled="state.home.lumens < offer.price"
          @click="confirming = true"
        >
          请师傅开工 · {{ offer.price }} 光
        </button>
        <p v-if="state.home.lumens < offer.price" class="funds-note">
          再攒 {{ offer.price - state.home.lumens }} 光就可以开工啦。
        </p></template
      >
      <p v-else>这个方向已经足够宽敞啦。</p>
    </aside>
    <ModalFrame v-if="confirming" label="确认扩建" @close="confirming = false"
      ><h2>给小家添一个新角落</h2>
      <p>
        花费 {{ offer?.price }} 光，{{ axis === "w" ? "向右" : "向前" }}增加
        {{ offer?.addedArea }} m²。现有家具和回忆都会保留。
      </p>
      <div class="placement-actions">
        <button class="soft-button" @click="confirming = false">再想想</button
        ><button class="primary-button" @click="expand">确认扩建</button>
      </div></ModalFrame
    >
  </div>
</template>
<style scoped>
.woodshop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 26px;
  align-items: start;
}
.workshop-bench {
  background: #eae2ce;
  border: 1px solid #cbbb99;
  border-radius: 20px;
  overflow: hidden;
}
.workshop-sign {
  padding: 28px 30px;
  background: #526e5e;
  color: #fff4d8;
  border-bottom: 7px solid #c0a17b;
}
.workshop-sign span {
  font: 26px var(--serif);
  letter-spacing: 3px;
  display: block;
}
.workshop-sign small {
  display: block;
  margin-top: 10px;
  color: #d5dfcc;
}
.workshop-samples {
  padding: 20px 28px 30px;
}
.workshop-samples h2 {
  font: 21px var(--serif);
  margin: 16px 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.workshop-samples h2 small {
  font: 12px sans-serif;
  color: #73694f;
}
.sample-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
.sample-row button {
  padding: 10px 8px 12px;
  border: 1px solid #cfc4aa;
  border-radius: 8px;
  background: #f7f1e2;
  color: #4e5948;
  text-align: center;
  min-width: 0;
}
.sample-row button[aria-pressed="true"] {
  outline: 2px solid #5a785c;
  outline-offset: 2px;
}
.sample-row b,
.sample-row small {
  display: block;
  font-size: 13px;
  margin-top: 10px;
}
.sample-row small {
  font-size: 10px;
  color: #7b806a;
}
.wall-swatch {
  height: 104px;
  display: block;
  border: 7px solid;
  position: relative;
  box-shadow: 2px 4px 3px #604c3615;
}
.wall-swatch:after {
  content: "";
  position: absolute;
  inset: 60% 0 0;
  border-top: 3px solid #ffffff70;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 22px,
    #ffffff40 22px 24px
  );
}
.floor-samples {
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 0;
}
.floor-swatch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  height: 100px;
  background: #9a805f;
  padding: 3px;
  transform: rotate(-2deg);
}
.floor-swatch i {
  position: relative;
}
.floor-swatch i:after {
  content: "";
  position: absolute;
  inset: 5px;
  background: repeating-linear-gradient(
    0deg,
    transparent 0 6px,
    #755d3820 7px 8px
  );
}
.bench-edge {
  padding: 18px 28px;
  background: #bc986c;
  color: #fff8e8;
  border-top: 6px solid #d2b58b;
  font-size: 12px;
  letter-spacing: 1px;
}
.bench-edge span {
  font-size: 25px;
  margin-right: 20px;
}
.workshop-order {
  padding: 24px;
  background: #faf7ed;
  border: 1px solid #e0ddcd;
  border-radius: 18px;
}
.workshop-host {
  display: flex;
  align-items: center;
  gap: 18px;
}
.workshop-host .craftsman-portrait {
  margin: 0;
  transform: scale(0.8);
  width: 85px;
  flex-shrink: 0;
}
.workshop-host h2 {
  font: 24px var(--serif);
  margin: 7px 0;
}
.workshop-host small {
  font-size: 11px;
  color: #829079;
}
.workshop-speech {
  background: #eceede;
  padding: 16px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.8;
  min-height: 74px;
}
.workshop-order h3 {
  font: 21px var(--serif);
  margin-top: 28px;
}
.workshop-order p {
  font-size: 13px;
  line-height: 1.8;
}
.room-blueprint {
  height: 170px;
  background:
    repeating-linear-gradient(0deg, transparent 0 15px, #a3b8a52b 15px 16px),
    repeating-linear-gradient(90deg, #e8efe5 0 15px, #a3b8a52b 15px 16px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid #c7d3c1;
  border-radius: 8px;
  gap: 4px;
}
.blueprint-room {
  width: calc(var(--room-w) * 10px);
  height: calc(var(--room-d) * 10px);
  border: 3px solid #729078;
  background: #fbf6df;
  display: grid;
  place-items: center;
  text-align: center;
  font-size: 11px;
  z-index: 1;
  transition:
    width 0.5s,
    height 0.5s;
}
.extension-strip {
  border: 1px dashed #7a9b73;
  padding: 12px 6px;
  color: #607756;
  font-size: 12px;
  background: #e0ead9;
}
.room-blueprint.d {
  flex-direction: column;
}
.room-blueprint.d .extension-strip {
  padding: 4px 16px;
}
.axis-options {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.axis-options button {
  font-size: 12px;
  padding: 10px;
}
.axis-options [aria-pressed="true"] {
  background: #dbe7d3;
  border-color: #729078;
}
.workshop-order > .primary-button {
  width: 100%;
  justify-content: center;
}
.funds-note {
  color: #947140;
}
@media (max-width: 1000px) {
  .woodshop-layout {
    grid-template-columns: 1fr;
  }
  .workshop-order {
    max-width: none;
  }
}
@media (max-width: 540px) {
  .workshop-sign {
    padding: 24px 20px;
  }
  .workshop-sign span {
    font-size: 23px;
  }
  .workshop-samples {
    padding: 12px 16px 24px;
  }
  .sample-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .floor-samples {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .floor-samples b {
    font-size: 11px;
  }
  .floor-samples small {
    font-size: 9px;
  }
  .wall-swatch {
    height: 105px;
  }
  .workshop-order {
    padding: 20px;
  }
}
</style>
