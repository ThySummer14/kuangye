<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
const props = defineProps({ label: String }),
  emit = defineEmits(["close"]),
  dialog = ref(null);
let previous;
onMounted(() => {
  previous = document.activeElement;
  dialog.value.showModal();
});
onBeforeUnmount(() => previous?.focus?.());
</script>
<template>
  <dialog
    ref="dialog"
    class="game-modal"
    :aria-label="label"
    @cancel.prevent="emit('close')"
    @click="
      (e) => {
        if (e.target === dialog) emit('close');
      }
    "
  >
    <div class="game-modal-inner">
      <button class="modal-close" aria-label="关闭弹窗" @click="emit('close')">
        ×</button
      ><slot />
    </div>
  </dialog>
</template>
