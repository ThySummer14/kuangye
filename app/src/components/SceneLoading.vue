<script setup>
defineProps({ error: Object });
function retry() { location.reload(); }
</script>
<template><section class="scene-loading" role="status"><p>{{ error?'这个场景暂时没能载入。':'正在铺开这个地方…' }}</p><button v-if="error" class="soft-button" @click="retry">重新载入</button></section></template>
<style scoped>.scene-loading{min-height:240px;display:grid;place-content:center;text-align:center;color:var(--ink-2);background:#eef2e7;border-radius:18px;padding:24px}</style>
