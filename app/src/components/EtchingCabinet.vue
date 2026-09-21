<script setup>
import { ref } from 'vue';
import { ETCHING_ART } from '../data/etching-art.js';
import { ETCHING_TIERS } from '../data/etchings.js';
import { etchingImage } from '../art/etching-svg.js';
import ModalFrame from './ModalFrame.vue';
const rank=ref(1), selected=ref(null);
const artwork=(art,r)=>`${import.meta.env.BASE_URL}etchings/${art.number}-${ETCHING_TIERS[r-1].id}.webp`;
</script>
<template>
 <section class="etching-cabinet" aria-label="营地印记柜" :data-rank="rank">
  <header class="cabinet-intro">
   <div><span class="eyebrow">把走过的路，刻成值得珍藏的形状</span><h2>营地印记柜</h2><p>木木把图样摆好了。每一枚章，都留着慢慢长成的空间。</p></div>
   <span class="art-status">图样预览 · 尚未开放领取</span>
  </header>
  <div class="cabinet-controls" role="group" aria-label="预览蚀刻章阶位">
   <button v-for="tier in ETCHING_TIERS" :key="tier.id" :aria-pressed="rank===tier.rank" @click="rank=tier.rank">{{tier.name}}</button>
   <p>{{rank===1?'留一道浅刻，记住一次出发。':rank===2?'纹路交织，经历渐渐有了层次。':'在漫长的生长之后，迎来完整的形状。'}}</p>
  </div>
  <div class="cabinet-shelves">
   <button v-for="art in ETCHING_ART" :key="art.id" class="etching-piece" :data-etching="art.id" @click="selected=art" :aria-label="'查看'+art.name">
    <span class="etching-number">{{art.number}}</span>
    <img :src="artwork(art,rank)" :alt="art.name+' · '+ETCHING_TIERS[rank-1].name" width="192" height="192" decoding="async"/>
    <span class="etching-name">{{art.name}}</span><small>{{art.material}}</small>
   </button>
  </div>
  <footer class="cabinet-note"><p>章记录荣誉，铭牌安放回忆。光用来布置小家，不能购买或兑换蚀刻章。</p><p>系列故事发布后才能获得荣誉；现在可以先看看每枚章的三个模样。离开一阵子，也不会失去已经走过的路。</p></footer>
  <ModalFrame v-if="selected" :label="selected.name+'的三阶图样'" @close="selected=null">
   <div class="etching-detail"><span class="eyebrow">{{selected.number}} / 营地的手作印记</span><h2>{{selected.name}}</h2><p>{{selected.meaning}}</p>
    <div class="etching-evolution"><figure v-for="tier in ETCHING_TIERS" :key="tier.id"><img :src="artwork(selected,tier.rank)" :alt="selected.name+' · '+tier.name" width="160" height="160"/><figcaption><h3><img class="etching-seal" :src="etchingImage(selected.id,tier.rank)" alt="" width="32" height="32"/>{{tier.name}}</h3><p>{{selected.stages[tier.rank-1]}}</p></figcaption></figure></div>
    <div class="etching-conditions"><h3>同一枚章，慢慢长成</h3><p>素刻记录起点，嵌纹见证深入，镀彩留给长期完成。升阶保留之前的记忆，不多算一枚收藏。</p><p>镀彩至少跨越三个参与季，参与季不必连续；第一季不会发放镀彩。具体目标随系列故事公布。</p></div>
   </div>
  </ModalFrame>
 </section>
</template>
<style scoped>
.cabinet-intro{display:flex;justify-content:space-between;gap:24px;align-items:center;margin:8px 0 28px}.cabinet-intro h2{font-size:32px;margin:10px 0}.cabinet-intro p,.cabinet-note,.etching-detail>p{color:#677361;line-height:1.8}.art-status{font-size:12px;color:#746448;white-space:nowrap;border:1px solid #d9ceae;padding:9px 13px;border-radius:20px}.cabinet-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:20px}.cabinet-controls button{padding:10px 22px;border:1px solid #cabfa5;border-radius:20px;background:#fffdf7;color:#645943;cursor:pointer}.cabinet-controls button[aria-pressed=true]{background:#536a50;border-color:#536a50;color:#fffdf7}.cabinet-controls p{font-size:13px;margin-left:auto;color:#77816d}.cabinet-shelves{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 24px;padding:30px;background:linear-gradient(90deg,#b6a38422,transparent 40%,#b6a38418),#e9e0ce;border:10px solid #c5b493;border-top-width:18px;border-radius:10px;box-shadow:inset 0 5px 14px #79604415}.etching-piece{position:relative;border:0;border-bottom:8px solid #ad9470;border-radius:2px 2px 5px 5px;padding:8px 5px 20px;background:linear-gradient(0deg,#dfd0b7,transparent 35%);color:#504d3c;text-align:center;cursor:pointer;min-width:0;transition:background .18s ease}.etching-piece:hover{background-color:#f4eddc}.etching-piece:focus-visible{outline:3px solid #557252;outline-offset:4px}.etching-piece img{display:block;width:100%;height:auto;max-width:192px;margin:auto}.etching-name{display:block;font:600 18px Georgia,'Songti SC',serif;letter-spacing:2px;margin:8px 0}.etching-piece small{font-size:11px;color:#796e55}.etching-number{position:absolute;left:6px;top:5px;font:12px Georgia,serif;color:#99856b}.cabinet-note{font-size:13px;margin:22px 0;max-width:760px}.cabinet-note p{margin:5px 0}.etching-detail{padding:14px 4px}.etching-detail h2{font:32px Georgia,'Songti SC',serif;margin:15px 0}.etching-evolution{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.etching-evolution figure{margin:0;min-width:0;background:#f2eddf;border-radius:12px;padding:12px}.etching-evolution img{display:block;width:100%;height:auto}.etching-evolution h3{font-size:16px}.etching-evolution p{font-size:12px;line-height:1.7;color:#77816c}.etching-conditions{border-top:1px solid #dedfce;padding-top:15px;font-size:13px;line-height:1.8;color:#63725f}@media(max-width:700px){.cabinet-intro{display:block}.art-status{display:inline-block;margin-top:10px}.cabinet-shelves{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 12px;padding:12px;border-width:7px}.cabinet-controls p{width:100%;margin:4px 0}.etching-name{font-size:16px}.etching-piece small{font-size:10px}.etching-evolution{grid-template-columns:1fr}.etching-evolution figure{display:grid;grid-template-columns:100px 1fr;align-items:center;gap:14px}.cabinet-intro h2{font-size:28px}}@media(prefers-reduced-motion:reduce){.etching-piece{transition:none}}
</style>
<style scoped>
.etching-piece>img{border-radius:7px;mix-blend-mode:multiply}.etching-evolution>figure>img{border-radius:8px;mix-blend-mode:multiply}.etching-evolution h3{display:flex;align-items:center;gap:5px}.etching-evolution .etching-seal{width:32px;height:32px;flex:none}
</style>
