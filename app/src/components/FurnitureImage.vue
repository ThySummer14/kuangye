<script setup>
import { ref, onMounted, watch } from "vue";
import { furnitureThumbnail } from "../scenes/furniture.js";
const props = defineProps({ item: Object }),
  src = ref("");
function draw() {
  try {
    src.value = furnitureThumbnail(props.item);
  } catch {
    src.value = "";
  }
}
onMounted(draw);
watch(() => props.item.id, draw);
</script>
<template>
  <img v-if="src" :src="src" :alt="item.name" class="furniture-image" /><span
    v-else
    class="furniture-image image-fallback"
    >{{ item.name }}</span
  >
</template>
