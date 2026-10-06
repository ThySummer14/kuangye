<script setup>
import { useId } from 'vue';
defineProps({ motif: { type: String, default: 'summit' }, locked: Boolean, large: Boolean });
const uid = useId().replace(/:/g, '');
</script>
<template>
  <svg class="challenge-emblem" :class="{ locked, large }" viewBox="0 0 240 260" aria-hidden="true">
    <defs>
      <linearGradient :id="uid+'metal'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef0e9"/><stop offset=".23" stop-color="#838b8a"/><stop offset=".48" stop-color="#fafcf3"/><stop offset=".52" stop-color="#626b6c"/><stop offset="1" stop-color="#b7bfbd"/></linearGradient>
      <linearGradient :id="uid+'dark'" x2=".7" y2="1"><stop stop-color="#505957"/><stop offset=".45" stop-color="#192221"/><stop offset="1" stop-color="#060b0b"/></linearGradient>
      <linearGradient :id="uid+'fire'" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffe2a8"/><stop offset=".45" stop-color="#fb8b45"/><stop offset="1" stop-color="#a93a18"/></linearGradient>
    </defs>
    <path d="M120 7 213 60 213 177 120 249 27 177 27 60Z" :fill="`url(#${uid}dark)`" stroke="#080b0b" stroke-width="5"/>
    <path d="M120 8 210 60 210 176 120 245 30 176 30 60Z M120 24 44 69 44 169 120 228 196 169 196 69Z" fill-rule="evenodd" :fill="`url(#${uid}metal)`"/>
    <path d="m120 32 69 41v92l-69 54-69-54V73Z" fill="none" stroke="#65706b" stroke-width="1"/>
    <path d="m34 85-16 10v52l16 10m172-72 16 10v52l-16 10" fill="none" :stroke="`url(#${uid}metal)`" stroke-width="7"/>
    <g :fill="`url(#${uid}fire)`">
      <path d="m116 8 4-3 4 3v31l-4 3-4-3ZM52 181l8 6-8 12-8-6Zm128 6 8-6 8 12-8 6Z"/>
      <path d="m86 212 34 27 34-27-34 10Z"/>
    </g>
    <g v-if="motif==='summit'" :fill="`url(#${uid}metal)`">
      <path d="m120 49 51 100-27-9-24-48-24 48-27 9Z"/>
      <path d="m120 92 10 20-10 44-10-44Z" :fill="`url(#${uid}fire)`"/>
      <path d="m74 119-20 45 41-18-12 24 37 30 37-30-12-24 41 18-20-45 32 59-78 42-78-42Z"/>
      <path d="m107 166 13 10 13-10-13 27Z" fill="#ed9e68"/>
    </g>
    <g v-else-if="motif==='breach'" :fill="`url(#${uid}metal)`">
      <path d="M64 77h47l-12 17H80v71h24l-13 19H64Zm67 0h45v107h-48l13-19h19V94h-41Z"/>
      <path d="m138 59-39 72h22l-25 73 52-91h-26Z" :fill="`url(#${uid}fire)`"/>
    </g>
    <g v-else-if="motif==='resolve'" :fill="`url(#${uid}metal)`">
      <path d="m120 57 51 63-20 60-31 26-31-26-20-60 20 15 31-78-15 99 15 24 20-37-6-38Z"/>
      <path d="m120 104-17 39 17 27 17-27Z" :fill="`url(#${uid}fire)`"/>
      <path d="m59 95 14 63 22 43-34-30Zm122 0-14 63-22 43 34-30Z"/>
    </g>
    <g v-else :fill="`url(#${uid}metal)`">
      <path d="m120 52 28 54-28 23-28-23Zm-8 88-36-23-20 55 57 14Zm16 0 36-23 20 55-57 14Z"/>
      <path d="m120 115 18 20-18 22-18-22Z" :fill="`url(#${uid}fire)`"/>
      <path d="m88 193 32 14 32-14-32 29Z"/>
    </g>
    <g fill="#d2d7ce"><circle cx="42" cy="66" r="2"/><circle cx="198" cy="66" r="2"/><circle cx="42" cy="171" r="2"/><circle cx="198" cy="171" r="2"/></g>
    <path class="emblem-glint" d="m46 65 74-43 76 43" fill="none" stroke="#fff9e6" stroke-width="2"/>
  </svg>
</template>
<style scoped>
.challenge-emblem{display:block;width:100%;height:auto;filter:drop-shadow(0 12px 10px #0008);transition:filter .4s,transform .4s}.challenge-emblem.locked{filter:grayscale(.9) brightness(.62) drop-shadow(0 8px 8px #0005)}.emblem-glint{opacity:.75}.large .emblem-glint{animation:edge-light 4s ease-in-out infinite}@keyframes edge-light{50%{opacity:.2}}@media(prefers-reduced-motion:reduce){.challenge-emblem,.emblem-glint{animation:none!important;transition:none}}
</style>
