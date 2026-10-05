<script setup>
import { computed, ref } from 'vue';
import { state, openObservationWork } from '../store.js';
import { observationSource } from '../game/observation-craft.js';
import ModalFrame from './ModalFrame.vue';
import ObservationSource from './ObservationSource.vue';
const props = defineProps({ entry: Object });
const emit = defineEmits(['close', 'studio']);
const title = ref(''), criterion = ref(''), includeImages = ref(true), error = ref('');
const source = computed(() => observationSource(props.entry, includeImages.value));
function take() {
  const result = openObservationWork(props.entry.id, { title: title.value, criterion: criterion.value, includeImages: includeImages.value });
  if (!result.ok) { error.value = result.why; return; }
  emit('studio', result.work.id);
}
</script>
<template>
  <ModalFrame label="把发现带到画室" @close="emit('close')">
    <span class="eyebrow">从真实发现，开始一件作品</span><h2><span>让这一页，</span><span>长出新的一版。</span></h2>
    <p class="craft-intro">可以写一段文字、画一个细节，或做一张自己的图。先写清想做出的成果，再接下这件创作。</p>
    <ObservationSource :source="source" open />
    <form class="craft-form" @submit.prevent="take">
      <label v-if="entry.images.length" class="craft-images"><input v-model="includeImages" type="checkbox" /> 带上这 {{ entry.images.length }} 张素材图片</label>
      <p class="craft-help">素材保留这一刻的观察，成果区从空白开始。带入的图片占用本地保存空间，原页仍留在观察册。</p>
      <label for="craft-title">这次，想做出什么</label><input id="craft-title" v-model="title" maxlength="60" required placeholder="给自己的作品起一个名字" />
      <label for="craft-criterion">做到什么，就可以收好</label><textarea id="craft-criterion" v-model="criterion" maxlength="160" rows="3" required placeholder="比如：画出叶缘的形状，并写下三处看见的细节。" />
      <p class="craft-help">手里 {{ state.active.length }} / 3 件事。创作沿用原任务名额与完成规则。</p>
      <p v-if="state.active.length>=3" class="craft-error">先完成或放下一件事，为这次创作留一个位置。</p>
      <p v-if="error" role="alert" class="craft-error">{{ error }}</p>
      <div class="placement-actions"><button class="text-button" type="button" @click="emit('close')">先留在观察册</button><button class="primary-button" type="submit" :disabled="state.active.length>=3">接下这件创作，去画室</button></div>
    </form>
  </ModalFrame>
</template>
<style scoped>
h2 { font:500 26px/1.5 var(--serif); margin:12px 0 16px; }
.craft-intro,.craft-help { color:var(--ink-2); font-size:12px; line-height:1.9; }
.craft-intro { margin-bottom:22px; }
.craft-form > label { display:block; margin:20px 0 9px; font-size:13px; }
.craft-form > .craft-images { display:flex; align-items:center; gap:9px; }
.craft-form > input,.craft-form > textarea { width:100%; box-sizing:border-box; border:1px solid var(--line-2); border-radius:var(--r-s); background:var(--card); color:var(--ink); padding:12px; font:14px/1.8 var(--sans); }
.craft-help { color:var(--ink-3); }
.craft-error { color:var(--ember); font-size:13px; line-height:1.8; }
@media(max-width:500px) { h2 span { display:block; } }
</style>
