<script setup>
import { defineAsyncComponent, ref, computed } from "vue";
import { state, purchase, today, taskById } from "../store.js";
import { FURNITURE, STALLS, vintageStock } from "../data/furniture.js";
import FurnitureImage from "./FurnitureImage.vue";
import BuddyFace from "./BuddyFace.vue";
import SceneLoading from "./SceneLoading.vue";
const FurnitureDetail = defineAsyncComponent({ loader: () => import("./FurnitureDetail.vue"), loadingComponent: SceneLoading, errorComponent: SceneLoading, delay:120, timeout:20000 });
const inspecting = ref(null);
const emit = defineEmits(["home", "toast"]),
  stall = ref("general"),
  recent = ref(null);
const items = computed(() =>
  stall.value === "vintage"
    ? vintageStock(today())
    : FURNITURE.filter((f) => f.stall === stall.value),
);
const latestDone = computed(() => state.done.at(-1) || null);
const latestTask = computed(() => latestDone.value ? taskById[latestDone.value.qid] : null);
function buy(f) {
  const item = purchase(f.id);
  if (item) {
    recent.value = { furniture: f, item };
    emit("toast", `「${f.name}」装进背包了`);
  }
}
</script>
<template>
  <FurnitureDetail v-if="inspecting" :item="inspecting" @close="inspecting=null" @buy="buy(inspecting)" @home="emit('home')" />
  <div class="shop-layout">
    <section>
      <div class="shop-banner">
        <div>
          <span class="eyebrow">THE WOODLAND MARKET</span>
          <h2>挑一件喜欢的，带回家。</h2>
          <p>每件小物，都能成为一段生活的纪念。</p>
        </div>
        <BuddyFace :size="125" mood="curious" />
      </div>
      <div class="place-tabs" role="tablist" aria-label="集市摊位">
        <button
          v-for="(name, id) in STALLS"
          :key="id"
          role="tab"
          :aria-selected="stall === id"
          :class="{ active: stall === id }"
          @click="stall = id"
        >
          {{ name }}
        </button>
      </div>
      <p v-if="stall === 'vintage'" class="shop-note">
        今日旧物 · 七折相遇 · {{ today() }}
      </p>
      <div class="furniture-grid">
        <article v-for="f in items" :key="f.id" class="product-card">
          <div class="product-art" :style="{ '--item-color': f.color }">
            <FurnitureImage :item="f" /><span
              v-if="state.home.inventory.some((i) => i.fid === f.id)"
              class="owned-tag"
              >家中已有</span
            >
          </div>
          <div class="product-content">
            <h3>{{ f.name }}</h3>
            <p>{{ f.description }}</p>
            <button class="detail-entry" :aria-label="`近看${f.name}与尺寸`" @click="inspecting=f">近看与尺寸 ↗</button>
            <div class="product-bottom">
              <span class="price">✦ {{ f.price }}</span
              ><button
                :disabled="state.home.lumens < f.price"
                class="buy-button"
                :aria-label="`购买${f.name}`"
                @click="buy(f)"
              >
                {{
                  state.home.lumens < f.price
                    ? `还差 ${f.price - state.home.lumens} 光`
                    : "带回家 ＋"
                }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
    <aside class="shop-aside">
      <div class="balance-card">
        <span class="eyebrow">口袋里的光</span
        ><strong>✦ {{ state.home.lumens }}</strong>
        <p>完成真实生活中的任务，<br />把收获的光用来布置小家。</p>
        <div class="glimmer-progress">
          <i
            :style="{
              width: ((state.home.glimmerDays.length % 7) / 7) * 100 + '%',
            }"
          />
        </div>
        <small
          >微光 {{ state.home.glimmerDays.length % 7 }} / 7 ·
          有记录的日子，都会被记住</small
        >
      </div>
      <div v-if="recent" class="purchase-success" role="status">
        <span>✓ 已装进背包</span>
        <h3>{{ recent.furniture.name }}</h3>
        <p>小芽已经在想放在哪里了。</p>
        <div v-if="recent.item.memory" class="memory-set-card">
          <span class="eyebrow">这件家具替你收好了一句话</span>
          <strong>{{ latestTask?.title || "最近完成的一件事" }}</strong>
          <blockquote>{{ recent.item.memory.review || "那天，我为自己完成了一件事。" }}</blockquote>
        </div>
        <button class="primary-button" @click="emit('home')">
          回家布置 ↗
        </button>
      </div>
      <div v-else-if="latestDone" class="shop-memory-invite">
        <span class="eyebrow">最近完成 · 可以安放</span>
        <h3>{{ latestTask?.title || "一件已经完成的小事" }}</h3>
        <p>{{ latestDone.review || "这段回忆，会成为小家里的一块铭牌。" }}</p>
        <small>下一件购买的家具，会替你收好这句话。</small>
      </div>
      <div v-else class="shop-story">
        <h3>家，慢慢变成你的样子。</h3>
        <p>不用收集所有东西。留下一件真正喜欢的，就很好。</p>
        <button class="soft-button" @click="emit('home')">
          看看我的小家 ↗
        </button>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.detail-entry { background:none; border:0; border-bottom:1px solid #cbd6bd; padding:7px 0; margin:3px 0 14px; color:var(--primary); font-size:12px; min-height:36px; }
.detail-entry:focus-visible { outline:2px solid var(--primary); outline-offset:3px; }
.shop-memory-invite,
.memory-set-card {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #e3dfca;
  border-radius: 15px;
  background: #f7f5e9;
}
.shop-memory-invite h3,
.memory-set-card strong {
  display: block;
  margin: 8px 0 6px;
  color: #4c6047;
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 600;
}
.shop-memory-invite p,
.memory-set-card blockquote {
  margin: 0 0 9px;
  color: #788473;
  font-size: 13px;
  line-height: 1.7;
}
.shop-memory-invite small {
  color: #a0875d;
  font-size: 11px;
  line-height: 1.6;
}
.memory-set-card blockquote {
  padding-left: 10px;
  border-left: 2px solid #d1b873;
  font-family: var(--serif);
  font-size: 15px;
}
@media (max-width: 760px) {
  .shop-memory-invite,
  .memory-set-card { padding: 14px; }
  .shop-memory-invite h3,
  .memory-set-card strong { font-size: 15px; }
  .purchase-success .primary-button { width: 100%; }
}
</style>
