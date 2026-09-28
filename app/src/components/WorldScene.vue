<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { buddyBus, state } from '../store.js';
import { createWorld } from '../scenes/world.js';
import { emptyTown } from '../game/town.js';
const emit=defineEmits(['navigate']);
const host=ref(null), labels=ref({}), failed=ref(false);
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
function arrange(l,info) {
  const h=host.value;
  if(!h)return;
  h.dataset.drawCalls=info.calls;
  const pw=h.parentElement.clientWidth, ph=h.parentElement.clientHeight, bounds=[], result={};
  for(const p of places) {
    const v=l[p.id]; if(!v)continue;
    const button=h.parentElement.parentElement.querySelector(`[data-place="${p.id}"]`);
    const w=button?.offsetWidth||112,height=44;
    const projected={x:h.offsetLeft+v.left/100*h.clientWidth,y:h.offsetTop+v.top/100*h.clientHeight};
    let best=null;
    for(const dy of [0,-52,52,-104,104,-156,156])for(const dx of [0,-120,120,-240,240]) {
      const x=Math.max(w/2+10,Math.min(pw-w/2-10,projected.x+dx));
      const y=Math.max(150,Math.min(ph-85,projected.y+dy));
      if(bounds.some(b=>Math.abs(x-b.x)<(w+b.w)/2+6 && Math.abs(y-b.y)<height+6))continue;
      const cost=(x-projected.x)**2+(y-projected.y)**2;
      if(!best||cost<best.cost)best={x,y,w,cost};
    }
    const pos=best||{x:pw/2,y:ph-90,w};bounds.push(pos);
    result[p.id]={left:pos.x,top:pos.y};
  }
  labels.value=result;
}
onMounted(()=>{
  try {
    engine=createWorld(host.value,{town:state.home.town||emptyTown(),getMood:()=>Date.now()<buddyBus.at?buddyBus.mood:'idle',onNavigate:id=>emit('navigate',id),onReady:arrange});
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
      <span class="map-hint">拖动转一转 · 滚动缩放</span>
    </div>
    <nav class="map-places" aria-label="地图上的场所">
      <button v-for="p in places" :key="p.id" :data-place="p.id" class="poi-label" :class="p.id"
        :style="labels[p.id]?{left:labels[p.id].left+'px',top:labels[p.id].top+'px'}:{}"
        @click="engine&&!failed?engine.flyTo(p.id):emit('navigate',p.id)"><span>{{ p.icon }}</span><b>{{ p.name }}</b><i>↗</i></button>
    </nav>
  </section>
</template>
<style scoped>
.world-map { position:relative; min-width:0; }
.map-caption h2 { font-size:27px; }
.map-places .poi-label > b { font-size:12px; }
.map-places .poi-label > span { font-size:17px; }
.world-map.map-offline .map-places { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding-top:12px; }
.world-map.map-offline .poi-label { position:static; transform:none; left:auto!important; top:auto!important; white-space:normal; min-height:44px; }
@media(max-width:600px) {
  .world-stage { height:440px; }
  .map-caption h2 { font-size:22px; }
  .map-places { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:12px 0 0; }
  .map-places .poi-label { position:static; transform:none; left:auto!important; top:auto!important; padding:11px 10px; box-shadow:none; min-height:46px; white-space:normal; text-align:left; }
  .map-places .poi-label b { font-size:12px; }
  .map-places .poi-label i { margin-left:auto; }
  .map-places .poi-label span { font-size:17px; }
  .map-weather { bottom:44px; }
}
</style>
