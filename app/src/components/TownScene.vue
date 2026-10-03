<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { createWorld } from '../scenes/world.js';
import { buildExterior, buildYardItem, buildYardPath, buildFence, buildLibrary } from '../scenes/town-models.js';
import { yardFootprint } from '../game/town.js';
const props=defineProps({ town: Object, mode: { type: String, default: 'yard' }, focus: {type:String,default:'yard'}, ghost: Object, editable: {type:Boolean,default:true}, light: {type:String,default:'day'} });
const emit=defineEmits(['cell','select']);
const host=ref(null), failed=ref(false);
let engine;
function frame() {
  if(props.mode==='yard' && props.focus==='house') engine?.setView({target:[0,1.3,-1.9],angle:.72,distance:8,elevation:5.4});
  else if(props.mode==='library') engine?.setView({target:[0,1.2,-.15],angle:.72,distance:8.8,elevation:6.4});
  else engine?.reset();
}
function sync() {
  engine?.setFurniture(parent=>{
    if(props.mode==='library') buildLibrary(engine,parent,props.town.library,0,-.4);
    else {
      buildExterior(engine,parent,props.town.exterior);
      buildYardPath(engine,parent,props.town.exterior);
      for(const p of props.town.yard)buildYardItem(engine,parent,p);
    }
  });
}
function preview() {
  engine?.setGhost(()=>{
    if(!props.ghost) return null;
    const {id,x,z,rotation,ok}=props.ghost, size=yardFootprint(id,rotation);
    if(!size) return null;
    const ghost=new THREE.Mesh(new THREE.BoxGeometry(size.w-.05,.08,size.d-.05),new THREE.MeshBasicMaterial({color:ok?'#76a986':'#bc775f',transparent:true,opacity:.5,depthWrite:false}));
    ghost.position.set(x-3+size.w/2,.08,z+size.d/2);return ghost;
  });
}
onMounted(()=>{
  try {
    engine=createWorld(host.value,{mode:'home',onPick:id=>{if(props.mode==='yard' && props.editable){emit('select',id);return true;}},onCell:(cell,commit)=>{if(commit && props.mode==='yard' && props.editable)emit('cell',{x:cell.x-1,z:cell.z-5});}});
    const size=props.mode==='yard'?{w:8,d:10}:{w:6,d:7};
    engine.setRoomSize(size);
    engine.setHome(({box})=>{
      const floor=box(size.w,.1,size.d,'#b7cb98',0,-.05,0);
      if(props.mode==='yard')buildFence(engine,engine.world);
      else for(const x of [-2.5,2.5]){
        box(.8,.35,.8,'#b59672',x,.18,.6);
        engine.ball(.48,'#8ca776',x,.65,.6);
      }
      return floor;
    });
    engine.setLighting(props.light);sync();preview();frame();
    engine.renderer.domElement.addEventListener('webglcontextlost',()=>failed.value=true);
  } catch {failed.value=true;engine?.dispose();engine=null;}
});
watch(()=>props.town,sync,{deep:true});
watch(()=>props.ghost,preview,{deep:true});
watch(()=>props.light,v=>engine?.setLighting(v));
watch(()=>props.focus,frame);
onBeforeUnmount(()=>engine?.dispose());
</script>
<template>
  <div class="town-scene" :class="{night:light==='night'}">
    <div ref="host" class="town-canvas" :aria-label="mode==='yard'?'可旋转的房屋与院落预览':'街角书屋修复预览'" />
    <p v-if="failed" class="town-fallback">暂时无法显示立体预览，仍可使用下方的平面布局和选项。</p>
    <div class="town-view-controls"><button aria-label="放大场景" @click="engine?.zoom(-2)">＋</button><button aria-label="缩小场景" @click="engine?.zoom(2)">−</button><button aria-label="恢复场景视角" @click="frame">⟳</button></div>
    <p class="town-scene-hint">拖动转一转 · 滚动缩放{{ mode==='yard' && editable?' · 点地面选择位置':'' }}</p>
  </div>
</template>
<style scoped>
.town-scene { position: relative; min-height: 420px; height: 520px; border-radius: 20px; background: #e8efdf; overflow: hidden; }
.town-scene.night { background: #34484d; }
.town-canvas { position: absolute; inset: 0; touch-action: none; }
.town-canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.town-view-controls { position: absolute; right: 15px; top: 15px; display:flex; gap:6px; }
.town-view-controls button { background:#fffaf0; border:1px solid #ced7c3; color:#46694c; width:36px; height:36px; border-radius:8px; font-size:20px; }
.town-scene-hint { position:absolute; bottom:10px; width:100%; text-align:center; color:#66785f; font-size:12px; pointer-events:none; }
.night .town-scene-hint { color:#dce7d2; }
.town-fallback { position:absolute; top:35%; padding:30px; background:#fffaf0; }
@media(max-width:600px) { .town-scene { min-height:320px; height:360px; } }
</style>
