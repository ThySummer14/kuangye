<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { buddyBus, state } from '../store.js';
import { createWorld } from '../scenes/world.js';
import { emptyTown } from '../game/town.js';
const emit=defineEmits(['navigate']);
const host=ref(null), labels=ref({}), failed=ref(false), highlighted=ref('');
const places=[
  {id:'home',name:'小芽的家',icon:'⌂'},
  {id:'yard',name:'家门前的院子',icon:'♧'},
  {id:'library',name:'街角书屋',icon:'▤'},
  {id:'tasks',name:'任务岩壁',icon:'☷'},
  {id:'shop',name:'林间集市',icon:'♧'},
  {id:'woodshop',name:'木器铺',icon:'⌑'},
  {id:'journal',name:'瞭望台 · 成长手记',icon:'⌁'},
  {id:'atelier',name:'小小画室',icon:'✎'},
];
let engine;
const selectedPlace=computed(()=>places.find(p=>p.id===highlighted.value));
const marker=computed(()=>labels.value[highlighted.value]);
function arrange(projected,info) {
  const h=host.value;if(!h)return;
  h.dataset.drawCalls=info.calls;
  const result={};
  for(const p of places) {
    const v=projected[p.id];if(!v)continue;
    const x=h.offsetLeft+v.left/100*h.clientWidth,y=h.offsetTop+v.top/100*h.clientHeight;
    if(x>18&&x<h.parentElement.clientWidth-18&&y>145&&y<h.parentElement.clientHeight-65)result[p.id]={left:x,top:y};
  }
  labels.value=result;
}
onMounted(()=>{
  try {
    engine=createWorld(host.value,{town:state.home.town||emptyTown(),getMood:()=>Date.now()<buddyBus.at?buddyBus.mood:'idle',onNavigate:id=>emit('navigate',id),onHover:id=>highlighted.value=id,onReady:arrange});
    engine.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed.value=true;});
  } catch {failed.value=true;engine?.dispose();}
});
onBeforeUnmount(()=>engine?.dispose());
</script>
<template>
  <section class="world-map" :class="{'map-offline':failed}">
    <div class="world-stage" :class="{'map-failed':failed}">
      <div ref="host" class="world-canvas" aria-label="可拖动旋转的 3D 旷野小镇" />
      <div class="map-caption"><span>THE FIRST STREET</span><h2>家门外，多了一条街。</h2><p>布置院子，也让生活在街角留下变化。</p></div>
      <div v-if="failed" class="scene-fallback">这台设备暂时无法显示立体地图。可以用场所按钮继续探索。</div>
      <div class="map-weather">☀ <span>旷野 · 晴<br /><small>街角书屋 · {{ ['等待修复','门窗已打开','书架已安好','灯已亮起'][state.home.town?.library||0] }}</small></span></div>
      <div class="map-controls"><button aria-label="放大地图" @click="engine?.zoom(-2)">＋</button><button aria-label="缩小地图" @click="engine?.zoom(2)">−</button><button aria-label="恢复地图视角" @click="engine?.reset()">⟳</button></div>
      <span v-if="marker&&!failed" class="place-marker" :style="{left:marker.left+'px',top:marker.top+'px'}" aria-hidden="true" />
      <span class="map-hint">{{ selectedPlace?selectedPlace.name+' · 点击进入':'拖动看街景 · 点击建筑，或在下方选择去处' }}</span>
    </div>
    <nav class="map-places" aria-label="地图上的场所">
      <button v-for="p in places" :key="p.id" :data-place="p.id" class="place-link" :class="{highlighted:highlighted===p.id}"
        @pointerenter="highlighted=p.id" @pointerleave="highlighted=''" @focus="highlighted=p.id" @blur="highlighted=''"
        @click="engine&&!failed?engine.flyTo(p.id):emit('navigate',p.id)"><span aria-hidden="true">{{ p.icon }}</span><b>{{ p.name }}</b><i aria-hidden="true">↗</i></button>
    </nav>
  </section>
</template>
<style scoped>
.world-map { position:relative; min-width:0; align-self:start; }
.map-caption h2 { font-size:27px; }
.map-places { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; padding:14px 0 0; }
.place-link { display:flex; align-items:center; gap:8px; text-align:left; min-height:52px; padding:10px 12px; border:1px solid #dbe3d5; border-radius:10px; background:#fffdf5; color:#3d5844; }
.place-link b { font-size:12px; font-weight:500; line-height:1.6; }
.place-link > span { font-size:19px; }
.place-link i { margin-left:auto; font-size:12px; font-style:normal; color:#8a9c82; }
.place-link.highlighted { border-color:#819b7f; background:#edf2e6; }
.place-link:focus-visible { outline:2px solid #466f58; outline-offset:3px; }
.place-marker { position:absolute; width:26px; height:26px; border:3px solid #fffdf1; box-shadow:0 0 0 3px #547958; border-radius:50%; transform:translate(-50%,-50%); pointer-events:none; }
.map-hint { pointer-events:none; }
@media(max-width:1000px) { .map-places { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) {
 .world-stage { height:440px; }
 .map-caption h2 { font-size:22px; }
 .place-link { min-height:46px; padding:9px 10px; }
 .map-weather { bottom:44px; }
 .map-hint { font-size:11px; }
}
</style>
