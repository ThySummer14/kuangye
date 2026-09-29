<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { loadFurnitureImages } from "../services/furniture-images.js";
const props = defineProps({ item: Object }),
  src = ref("");
let generation = 0;
async function draw() {
  const version = ++generation;
  try {
    const { furnitureThumbnail } = await loadFurnitureImages();
    if (version !== generation) return;
    src.value = furnitureThumbnail(props.item);
  } catch {
    src.value = "";
  }
}
onMounted(draw);
onBeforeUnmount(() => generation++);
watch(() => props.item.id, draw);
</script>
<template>
  <img v-if="src" :src="src" :alt="item.name" class="furniture-image" /><span
    v-else
    class="furniture-image image-fallback"
    >{{ item.name }}</span
  >
</template>
