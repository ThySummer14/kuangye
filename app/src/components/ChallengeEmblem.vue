<script setup>
defineProps({motif:{type:String,default:'summit'},locked:Boolean,large:Boolean});
const base=import.meta.env.BASE_URL;
</script>
<template>
  <img class="challenge-emblem" :class="{locked,large}" :src="`${base}challenger/${motif}.png`" alt="" width="600" height="660" decoding="async"/>
</template>
<style scoped>
.challenge-emblem{display:block;width:100%;height:auto;object-fit:contain;filter:drop-shadow(0 12px 10px #0008);transition:filter .4s,transform .4s}.challenge-emblem.locked{filter:saturate(.38) brightness(.78) drop-shadow(0 8px 8px #0005)}@media(prefers-reduced-motion:reduce){.challenge-emblem{transition:none}}
</style>
