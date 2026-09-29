<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { state } from '../store.js';
import { footprint, furnitureLayer } from '../game/placement.js';
import { createWorld } from '../scenes/world.js';
import { furnitureModel } from '../scenes/furniture.js';
import ModalFrame from './ModalFrame.vue';
const props=defineProps({item:Object});
const emit=defineEmits(['close','buy','home']);
const host=ref(null),rotation=ref(0),light=ref('day'),grid=ref(true),failed=ref(false);
const size=computed(()=>footprint(props.item,rotation.value));
const owned=computed(()=>state.home.inventory.filter(i=>i.fid===props.item.id));
const memories=computed(()=>owned.value.filter(i=>i.memory));
let engine;
function resetView() { engine?.reset(); engine?.zoom(-1); }
function draw() {
 engine?.setFurniture(parent=>{
  if(grid.value) {
   engine.box(size.value.w,.025,size.value.d,'#c9d7b5',0,.016,0,parent);
   for(let x=0;x<=size.value.w;x++)engine.box(.012,.012,size.value.d,'#a4b18d',x-size.value.w/2,.04,0,parent);
   for(let z=0;z<=size.value.d;z++)engine.box(size.value.w,.012,.012,'#a4b18d',0,.04,z-size.value.d/2,parent);
  }
  const model=furnitureModel(props.item,engine);model.position.y=.07;model.rotation.y=-rotation.value*Math.PI/2;parent.add(model);
 });
}
onMounted(()=>{
 try {
  engine=createWorld(host.value,{mode:'home'});
  const extent=Math.max(props.item.w,props.item.d)+.7;
  engine.setRoomSize({w:extent,d:extent});
  engine.setHome(({box})=>box(extent,.08,extent,'#e8dfc9',0,-.05,0));
  engine.zoom(-1);draw();
  engine.renderer.domElement.addEventListener('webglcontextlost',()=>failed.value=true);
 }catch{failed.value=true;engine?.dispose();engine=null;}
});
watch([rotation,grid],draw);
watch(light,value=>engine?.setLighting(value));
onBeforeUnmount(()=>engine?.dispose());
</script>
<template>
 <ModalFrame :label="item.name+' · 近看与尺寸'" class="furniture-detail" @close="emit('close')">
  <span class="eyebrow">带回家之前，先看仔细。</span><h2>{{ item.name }}</h2><p class="detail-description">{{ item.description }}</p>
  <div class="detail-scene" :class="light"><div ref="host" class="detail-canvas" :aria-label="item.name+'的可旋转模型'" /><p v-if="failed" class="detail-fallback">立体预览暂时不可用，尺寸与购买仍可查看。</p><span class="detail-drag">拖动转一转 · 滚轮缩放</span></div>
  <div class="detail-controls"><button @click="rotation=(rotation+1)%4">旋转 90°</button><button @click="resetView">复位视角</button><button :aria-pressed="grid" @click="grid=!grid">显示占地</button><button :aria-pressed="light==='night'" @click="light=light==='day'?'night':'day'">{{ light==='day'?'看看夜间':'回到日间' }}</button></div>
  <div class="detail-size"><strong>{{ size.w/2 }} × {{ size.d/2 }} 米</strong><span>摆放占地 · {{ size.w }} × {{ size.d }} 格 · 每格 0.5 米</span></div>
  <p class="detail-rule">{{ furnitureLayer(item)==='floor'?'这是地面铺物，可以放在其他家具下面。':'摆放时需要留出完整占地，不能与其他实体家具重叠。' }}这是游戏中的占地尺寸。</p>
  <details v-if="memories.length" class="detail-memories"><summary>家中这件家具留下的回忆（{{ memories.length }}）</summary><blockquote v-for="entry in memories" :key="entry.uid">{{ entry.memory.review || '那天，我为自己完成了一件事。' }}</blockquote></details>
  <p v-else-if="owned.length" class="detail-owned">家中已有 {{ owned.length }} 件，可以回家查看与布置。</p>
  <div class="detail-purchase"><strong>✦ {{ item.price }} 光</strong><button class="primary-button" :disabled="state.home.lumens<item.price" @click="emit('buy')">{{ state.home.lumens<item.price?'还差 '+(item.price-state.home.lumens)+' 光':owned.length?'再带一件回家':'带回家 ＋' }}</button></div>
  <button v-if="owned.length" class="text-button detail-home" @click="emit('home')">回家布置 ↗</button>
 </ModalFrame>
</template>
<style scoped>
.furniture-detail{width:min(720px,calc(100vw - 24px))}.detail-description{font-size:14px;color:var(--ink-2);line-height:1.8}.detail-scene{position:relative;height:340px;border-radius:14px;background:#edf1e5;overflow:hidden}.detail-scene.night{background:#35484c}.detail-canvas{position:absolute;inset:0;touch-action:none}.detail-canvas :deep(canvas){display:block}.detail-drag{position:absolute;bottom:12px;left:0;right:0;text-align:center;pointer-events:none;font-size:11px;color:#63745b}.night .detail-drag{color:#e2e8d8}.detail-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 20px}.detail-controls button{border:1px solid #cbd5bf;border-radius:7px;background:transparent;color:var(--primary);min-height:40px;padding:8px 12px;font-size:12px}.detail-controls button[aria-pressed=true]{background:#e5edda;border-color:#8fa078}.detail-size{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.detail-size strong{font:500 25px var(--serif)}.detail-size span,.detail-rule,.detail-owned{font-size:12px;color:var(--ink-2);line-height:1.8}.detail-rule{margin:10px 0 20px}.detail-purchase{border-top:1px solid var(--line);padding-top:20px;display:flex;justify-content:space-between;gap:12px;align-items:center}.detail-purchase strong{color:#a87936;font-size:18px}.detail-purchase button{min-height:44px}.detail-home{margin-top:14px}.detail-memories{font-size:13px;line-height:1.8;margin:18px 0}.detail-memories blockquote{border-left:2px solid #bd9c64;padding-left:14px;margin:10px 0;font-family:var(--serif);overflow-wrap:anywhere}.detail-fallback{position:absolute;top:30%;padding:22px;line-height:1.8;background:#fffdf5;font-size:14px}
@media(max-width:600px){.detail-scene{height:270px}.furniture-detail :deep(.game-modal-inner){padding:28px 18px 20px}.detail-controls{gap:6px}.detail-controls button{padding:8px;font-size:11px}.detail-size strong{font-size:22px}}
</style>
