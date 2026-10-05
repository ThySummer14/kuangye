<script setup>
defineProps({ work: Object, compact: Boolean });
</script>
<template>
  <article class="studio-work-preview" :class="{ compact }">
    <div v-if="work.images.length" class="work-images">
      <img v-for="(src, i) in (compact ? work.images.slice(0, 1) : work.images)" :key="i" :src="src" :alt="work.title + ' · 第 ' + (i + 1) + ' 张'" />
    </div>
    <h3>{{ work.title }}</h3>
    <p v-if="work.body">{{ work.body }}</p>
    <small>{{ work.created }} · 自己做出来的东西</small>
  </article>
</template>
<style scoped>
.studio-work-preview { min-width: 0; padding: 28px; background: var(--card); border: 1px solid var(--line-2); }
.work-images { display: grid; gap: 16px; }
.work-images img { display: block; width: 100%; max-height: 540px; object-fit: contain; background: var(--paper); }
h3 { font: 500 26px/1.5 var(--serif); color: var(--ink); margin: 24px 0 14px; overflow-wrap: anywhere; }
p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; line-height: 2; margin: 0 0 24px; }
small { font-size: 11px; color: var(--ink-3); }
.compact { padding: 20px; }
.compact img { max-height: 240px; }
.compact h3 { font-size: 21px; }
.compact p { max-height: 8em; overflow: hidden; font-size: 13px; margin-bottom: 12px; }
@media(max-width:600px) { .studio-work-preview { padding: 20px; } h3 { font-size: 23px; } }
</style>
