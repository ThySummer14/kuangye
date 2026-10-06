<script setup>
import { ref, onMounted, onBeforeUnmount, useId } from 'vue';
import { createMedalViewer } from '../scenes/challenge-medal-viewer.js';
import ChallengeEmblem from './ChallengeEmblem.vue';
const props=defineProps({motif:{type:String,default:'summit'},name:String});
const host=ref(null),failed=ref(false),spinning=ref(false),ready=ref(false),view=ref('front');
const hintId=useId();let viewer;
function fail(){failed.value=true;ready.value=false;viewer?.dispose();viewer=undefined;}
function start(){
  failed.value=false;
  try{viewer=createMedalViewer(host.value,{motif:props.motif,autoRotate:true,onError:fail,onInteraction:()=>{view.value='free';},onChange:s=>{spinning.value=s.spinning;}});ready.value=true;}catch{fail();}
}
function pose(side){view.value=side;viewer?.pose(side);}
function key(event){
  const actions={ArrowLeft:()=>viewer?.orbit(-.16),ArrowRight:()=>viewer?.orbit(.16),ArrowUp:()=>viewer?.orbit(0,-.12),ArrowDown:()=>viewer?.orbit(0,.12),'+':()=>viewer?.zoom(.85),'=':()=>viewer?.zoom(.85),'-':()=>viewer?.zoom(1.15),Home:()=>pose('front')};
  if(actions[event.key]){event.preventDefault();actions[event.key]();}
}
onMounted(start);onBeforeUnmount(()=>viewer?.dispose());
</script>
<template>
  <div class="medal-viewer" :data-motif="motif" :data-spinning="spinning">
    <div class="medal-viewer-stage">
      <div class="medal-stage-orbit" aria-hidden="true"/>
      <div class="medal-stage-label"><span>OBJECT / 0{{ ['breach','resolve','versatile','summit'].indexOf(motif)+1 }}</span><span>{{ failed?'图样预览':'360° INSPECTION' }}</span></div>
      <div v-show="!failed" ref="host" class="medal-canvas" tabindex="0" role="region" :aria-label="name+'立体模型'" :aria-describedby="hintId" @keydown="key"/>
      <div v-if="failed" class="medal-render-fallback"><ChallengeEmblem :motif="motif"/><p>立体预览暂不可用，先看看章的图样。</p><button @click="start">重新加载立体预览</button></div>
      <span v-if="ready" class="medal-stage-marker" aria-hidden="true">{{ spinning?'缓缓巡回':view==='back'?'背面 / 独立编号':view==='front'?'正面 / 蚀刻浮雕':'自由视角' }}</span>
    </div>
    <div v-if="!failed" class="medal-viewer-controls" role="group" aria-label="调整蚀刻章视角">
      <div><button :aria-pressed="view==='front'&&!spinning" @click="pose('front')">正面</button><button :aria-pressed="view==='back'&&!spinning" @click="pose('back')">背面</button><button :aria-pressed="spinning" @click="viewer?.spin(!spinning)">{{ spinning?'暂停巡回':'自动巡回' }}</button></div>
      <div><button aria-label="缩小蚀刻章" @click="viewer?.zoom(1.15)">−</button><button aria-label="放大蚀刻章" @click="viewer?.zoom(.85)">＋</button></div>
    </div>
    <p :id="hintId" class="medal-viewer-hint">{{ failed?'每一道突破，都值得留下刻痕。':'拖动旋转 · 双指或滚轮缩放 · 也可用方向键与 ＋ / −' }}</p>
  </div>
</template>
<style scoped>
.medal-viewer{width:100%;min-width:0}.medal-viewer-stage{position:relative;height:440px;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 50% 46%,#40443855,transparent 62%),linear-gradient(125deg,#161d1c,#0d1110);border:1px solid #465043}.medal-canvas{height:100%;width:100%;position:relative;z-index:2;touch-action:none;cursor:grab;outline-offset:-4px}.medal-canvas:active{cursor:grabbing}.medal-canvas:focus-visible{outline:2px solid #faac70}.medal-canvas :deep(canvas){display:block;width:100%;height:100%}.medal-stage-orbit{position:absolute;inset:13% 19%;border:1px solid #92a18023;border-radius:50%;transform:rotate(-25deg);pointer-events:none}.medal-stage-orbit:after{content:'';position:absolute;inset:9%;border:1px dashed #92a18022;border-radius:50%}.medal-stage-label{position:absolute;z-index:3;inset:16px 18px auto;display:flex;justify-content:space-between;color:#9ba88f;font:9px monospace;letter-spacing:1.5px;pointer-events:none}.medal-stage-marker{position:absolute;z-index:3;bottom:18px;left:18px;color:#b8c0a9;font:10px monospace;letter-spacing:2px;pointer-events:none}.medal-stage-marker:before{content:'';display:inline-block;width:5px;height:5px;background:#f6a363;margin-right:8px;vertical-align:2px}.medal-viewer-controls{display:flex;justify-content:space-between;gap:12px;margin:12px 0 0}.medal-viewer-controls>div{display:flex;gap:6px}.medal-viewer-controls button,.medal-render-fallback button{min-height:44px;padding:9px 14px;color:#c5ceb8;border:1px solid #58614c;background:#1c251f;font-size:11px;cursor:pointer}.medal-viewer-controls button[aria-pressed=true]{color:#ffd0a8;border-color:#bf8d5f;background:#372d20}.medal-viewer-controls button:hover{border-color:#f6a363;color:#ffbd84}.medal-viewer-hint{font-size:10px;color:#aebca3;line-height:1.8;text-align:center;margin:12px 0 0}.medal-render-fallback{position:absolute;inset:35px 20px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}.medal-render-fallback .challenge-emblem{max-height:270px;max-width:240px;object-fit:contain}.medal-render-fallback p{font-size:11px}.medal-render-fallback button{margin-top:0}
@media(max-width:600px){.medal-viewer-stage{height:350px}.medal-stage-label{font-size:8px;letter-spacing:.7px;inset:14px 12px auto}.medal-stage-marker{bottom:14px;left:12px;font-size:9px}.medal-viewer-controls{gap:7px}.medal-viewer-controls>div{gap:4px}.medal-viewer-controls button{padding:8px 10px;font-size:10px}.medal-viewer-hint{font-size:9px}.medal-stage-orbit{inset:16% 8%}}
</style>
