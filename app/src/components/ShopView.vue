<script setup>
import { ref, computed } from "vue";
import { state, purchase, today } from "../store.js";
import { FURNITURE, STALLS, vintageStock } from "../data/furniture.js";
import FurnitureImage from "./FurnitureImage.vue";
import BuddyFace from "./BuddyFace.vue";
const emit = defineEmits(["home", "toast"]),
  stall = ref("general"),
  recent = ref(null);
const items = computed(() =>
  stall.value === "vintage"
    ? vintageStock(today())
    : FURNITURE.filter((f) => f.stall === stall.value),
);
function buy(f) {
  const item = purchase(f.id);
  if (item) {
    recent.value = f;
    emit("toast", `「${f.name}」装进背包了`);
  }
}
</script>
<template>
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
        <h3>{{ recent.name }}</h3>
        <p>小芽已经在想放在哪里了。</p>
        <button class="primary-button" @click="emit('home')">
          回家布置 ↗
        </button>
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
