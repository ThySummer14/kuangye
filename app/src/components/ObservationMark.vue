<script setup>
defineProps({kind:{type:String,default:'plant'}});
</script>
<template>
  <svg viewBox="0 0 200 150" class="observation-mark" fill="none" aria-hidden="true">
    <g v-if="kind==='plant'||kind==='other'" stroke="#718466" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M98 128q12-53 2-95"/><path fill="#ccd4b8" d="M101 46q5-22 37-22-2 35-34 41"/><path d="M103 60l23-26"/><path fill="#dee1c8" d="M101 85q-38 6-47-34 39-1 47 34"/><path d="M96 82L67 62"/><path fill="#aabc91" d="M102 106q12-30 48-20-9 35-48 20"/><path d="M108 104l26-10"/><path d="M70 130h72" stroke="#b9baa1"/></g>
    <g v-else-if="kind==='sky'" stroke="#7e9992" stroke-width="2" stroke-linecap="round"><circle cx="106" cy="60" r="24" fill="#e4d5a8" stroke="#b6a56e"/><path d="M105 22v-8m34 21 6-6m5 32h10m-87-25-7-5M74 74l-7 7"/><path fill="#f6f2e4" d="M56 112h88q13-1 11-14-2-12-18-13 0-19-20-18-17 0-23 16-10-8-21-2-12 5-10 16-17 1-14 11 1 4 7 4"/><path d="M73 130h68" stroke="#b9baa1"/></g>
    <g v-else stroke="#8f9a79" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path fill="#d8c7a6" d="m54 100 17-12 58 10-14 13z"/><path d="M61 102v27m59-22v23M69 88V62l64 9v28"/><path fill="#e6ddc8" d="m69 62 7-9 63 10-6 8z"/><path d="m75 72 51 7m-53 2 52 7M147 47q11 7 1 16m11-24q20 16-1 35" stroke="#9bad91"/><path d="M40 132h112" stroke="#b9baa1"/></g>
  </svg>
</template>
<style scoped>.observation-mark { display:block; width:100%; height:100%; }</style>
