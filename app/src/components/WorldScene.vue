<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { buddyBus, state } from '../store.js';
import { createWorld } from '../scenes/world.js';
import { emptyTown } from '../game/town.js';
import { MAP_PLACES } from '../data/places.js';
import PlaceIcon from './PlaceIcon.vue';
import { studioStatus } from '../game/studio.js';
import { hasResidentDisplay } from '../game/residents.js';
import { RESIDENT_VISITS } from '../data/residents.js';
const emit=defineEmits(['navigate']);
const host=ref(null), labels=ref({}), failed=ref(false), highlighted=ref('');
const places=MAP_PLACES;
const resident=computed(()=>!!RESIDENT_VISITS.length || !!state.home.visits.length);
const displayed=computed(()=>hasResidentDisplay(state.home.visits));
const counts=computed(()=>({ tasks: state.active.length ? `${state.active.length}/3` : '', atelier: state.home.studio.works.filter(work=>studioStatus(work,state)==='done').length || '' }));
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
    engine=createWorld(host.value,{town:state.home.town||emptyTown(),resident:resident.value,residentDisplay:displayed.value,getMood:()=>Date.now()<buddyBus.at?buddyBus.mood:'idle',onNavigate:id=>emit('navigate',id),onHover:id=>highlighted.value=id,onReady:arrange});
    engine.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed.value=true;});
  } catch {failed.value=true;engine?.dispose();}
});
onBeforeUnmount(()=>engine?.dispose());
</script>
<template>
  <section class="world-map" :class="{'map-offline':failed}">
    <div class="world-stage" :class="{'map-failed':failed}">
      <div ref="host" class="world-canvas" aria-label="可拖动旋转的 3D 旷野小镇" />
      <div class="map-caption"><span>THE FIRST STREET · 第一条街</span><h2>家门外，多了一条街。</h2><p>布置院子，也让生活在街角留下变化。</p></div>
      <svg class="map-compass" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" /><circle cx="24" cy="24" r="15.5" class="inner" /><path d="M24 7 27.2 24 24 41 20.8 24z" class="needle" /><path d="M24 7 27.2 24H20.8z" class="north" /><text x="24" y="5.2">N</text></svg>
      <div v-if="failed" class="scene-fallback">这台设备暂时无法显示立体地图。可以用场所按钮继续探索。</div>
      <div class="map-weather"><span class="sun" aria-hidden="true">☀</span><span>旷野 · 晴<br /><small>街角书屋 · {{ ['等待修复','门窗已打开','书架已安好','灯已亮起'][state.home.town?.library||0] }}</small></span></div>
      <div class="map-controls"><button aria-label="放大地图" @click="engine?.zoom(-2)">＋</button><button aria-label="缩小地图" @click="engine?.zoom(2)">−</button><button aria-label="恢复地图视角" @click="engine?.reset()">⟳</button></div>
      <span v-if="marker&&!failed" class="place-marker" :style="{left:marker.left+'px',top:marker.top+'px'}" aria-hidden="true" />
      <span class="map-hint">{{ selectedPlace?selectedPlace.name+' · 点击进入':'拖动看街景 · 点击建筑，或在下方选择去处' }}</span>
    </div>
    <nav class="map-places" aria-label="地图上的场所">
      <button v-for="p in places" :key="p.id" :data-place="p.id" class="place-link" :class="['tone-'+p.tone,{highlighted:highlighted===p.id}]"
        :aria-label="p.name" :aria-describedby="'place-hint-'+p.id+(counts[p.id]?' place-count-'+p.id:'')"
        @pointerenter="highlighted=p.id" @pointerleave="highlighted=''" @focus="highlighted=p.id" @blur="highlighted=''"
        @click="engine&&!failed?engine.flyTo(p.id):emit('navigate',p.id)">
        <span class="place-badge"><PlaceIcon :name="p.id" :size="20" /></span>
        <span class="place-text"><b>{{ p.name }}</b><small :id="'place-hint-'+p.id">{{ p.id==='library' && resident ? displayed?'窗边留着一次来往':'阅读、问题与街角来访' : p.hint }}</small></span>
        <span class="place-short" aria-hidden="true">{{ p.short }}</span>
        <em v-if="counts[p.id]" :id="'place-count-'+p.id" class="place-count">{{ counts[p.id] }}</em>
      </button>
    </nav>
  </section>
</template>
<style scoped>
.world-map { position:relative; min-width:0; align-self:start; }
.map-hint { pointer-events:none; }
.place-marker { position:absolute; width:26px; height:26px; border:3px solid #fffdf1; box-shadow:0 0 0 3px var(--moss), 0 6px 14px rgba(30,60,40,.3); border-radius:50%; transform:translate(-50%,-50%); pointer-events:none; }
</style>
