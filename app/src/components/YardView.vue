<script setup>
import { computed, ref, nextTick } from 'vue';
import { state, setExterior, arrangeYard, removeYard, adoptYardPlan } from '../store.js';
import { EXTERIOR, YARD_ITEMS, YARD_PLANS } from '../data/town.js';
import { emptyTown, yardCheck, yardFootprint, previewYardPlan } from '../game/town.js';
import TownScene from './TownScene.vue';
const emit=defineEmits(['home']);
const town=computed(()=>state.home.town||emptyTown());
const tab=ref('yard'), selected=ref('bench'), rotation=ref(0), cell=ref({x:0,z:0}), message=ref(''), light=ref('day');
const preview=ref(null), previewHost=ref(null), previewHeading=ref(null), editor=ref(null);
const previewTown=computed(()=>preview.value?{...town.value,yard:preview.value.yard}:town.value);
function switchTab(value) { tab.value=value; preview.value=null; message.value=''; }
async function tryPlan(plan) {
  const result=previewYardPlan(plan.id);
  if(!result.ok){message.value=result.why;return;}
  preview.value={...plan,yard:result.yard}; message.value='';
  await nextTick(); previewHeading.value?.focus({preventScroll:true});
  previewHost.value?.scrollIntoView({behavior:'smooth',block:'start'});
}
async function cancelPlan() { const id=preview.value.id; preview.value=null; message.value='已回到原来的院子。'; await nextTick(); editor.value?.querySelector(`[data-plan="${id}"]`)?.focus(); }
async function adoptPlan() {
  const result=adoptYardPlan(preview.value?.id);
  if(!result.ok){message.value=result.why;return;}
  const name=preview.value.name; preview.value=null; tab.value='yard'; select(selected.value);
  message.value=`已采用「${name}」，还可以逐件调整。`;
  await nextTick(); editor.value?.querySelector('.yard-materials button[aria-pressed=true]')?.focus();
}
function planOccupant(plan,c) {return plan.yard.find(p=>{const f=yardFootprint(p.id,p.rotation);return c.x>=p.x&&c.x<p.x+f.w&&c.z>=p.z&&c.z<p.z+f.d;});}
const check=computed(()=>yardCheck(town.value.yard,selected.value,{...cell.value,rotation:rotation.value}));
const ghost=computed(()=>selected.value?{id:selected.value,...cell.value,rotation:rotation.value,ok:check.value.ok}:null);
const current=computed(()=>YARD_ITEMS.find(i=>i.id===selected.value));
const placed=computed(()=>town.value.yard.some(p=>p.id===selected.value));
const cells=Array.from({length:24},(_,i)=>({x:i%6,z:Math.floor(i/6)}));
function occupant(c) {return town.value.yard.find(p=>{const f=yardFootprint(p.id,p.rotation);return c.x>=p.x&&c.x<p.x+f.w&&c.z>=p.z&&c.z<p.z+f.d;});}
function select(id) {selected.value=id;const p=town.value.yard.find(p=>p.id===id);rotation.value=p?.rotation||0;if(p)cell.value={x:p.x,z:p.z};message.value='';}
function choose(c) {if(c.x<0||c.x>5||c.z<0||c.z>3)return;cell.value=c;message.value='';}
function place() {const r=arrangeYard(selected.value,{...cell.value,rotation:rotation.value});message.value=r.ok?`${current.value.name}安放好了，回地图也能看见。`:r.why;}
function remove() {removeYard(selected.value);message.value='已收回材料栏，随时可以再摆。';}
function key(e,c) {const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();const next={x:Math.max(0,Math.min(5,c.x+delta[0])),z:Math.max(0,Math.min(3,c.z+delta[1]))};choose(next);e.currentTarget.parentElement.querySelector(`[data-cell="${next.x}-${next.z}"]`)?.focus();}
</script>
<template>
  <div class="yard-page">
    <header class="town-intro"><div><span class="eyebrow">从门口开始，住成喜欢的样子</span><h2>给家，留一个院子。</h2><p>第一批材料已经备好。试着放一张长椅，或为窗外种一棵树。</p></div><button class="soft-button" @click="emit('home')">进屋看看 ↗</button></header>
    <div class="yard-workbench">
      <div ref="previewHost" class="yard-preview"><TownScene :editable="tab==='yard'" :town="previewTown" :ghost="tab==='yard'?ghost:null" :light="light" @cell="choose" @select="select" />
        <div class="yard-light" role="group" aria-label="预览光线"><button :aria-pressed="light==='day'" @click="light='day'">日间</button><button :aria-pressed="light==='night'" @click="light='night'">夜间</button><span>仅切换预览光线</span></div>
        <div v-if="preview" class="plan-confirm" aria-label="确认院落布局">
          <div><span class="eyebrow">正在试摆 · 尚未保存</span><h3 ref="previewHeading" tabindex="-1">{{ preview.name }}</h3><p>采用后替换当前六件材料的位置，房屋配色保持原样。</p></div>
          <div class="yard-actions"><button class="primary-button" @click="adoptPlan">采用这个布局</button><button class="text-button" @click="cancelPlan">取消预览</button></div>
        </div>
      </div>
      <section ref="editor" class="yard-editor">
        <div class="place-tabs" role="group" aria-label="布置方式"><button :class="{active:tab==='yard'}" :aria-pressed="tab==='yard'" @click="switchTab('yard')">布置院子</button><button :class="{active:tab==='house'}" :aria-pressed="tab==='house'" @click="switchTab('house')">搭配房屋</button><button :class="{active:tab==='plans'}" :aria-pressed="tab==='plans'" @click="switchTab('plans')">布局方案</button></div>
        <template v-if="tab==='yard'">
          <p class="yard-explain">六件材料各一份，自由摆放，不花光。中间的小径留给进出。</p>
          <div class="yard-materials" role="group" aria-label="院落材料"><button v-for="item in YARD_ITEMS" :key="item.id" :aria-pressed="selected===item.id" @click="select(item.id)"><strong>{{ item.name }}</strong><small>{{ town.yard.some(p=>p.id===item.id)?'已摆放 · 可移动':item.note }}</small></button></div>
          <h3>选一个位置 <small>上方靠近房屋</small></h3>
          <div class="yard-grid" role="group" aria-label="院落平面布局">
            <button v-for="c in cells" :key="`${c.x}-${c.z}`" :data-cell="`${c.x}-${c.z}`" :class="{path:c.x===2||c.x===3,chosen:cell.x===c.x&&cell.z===c.z,occupied:occupant(c)}" :aria-pressed="cell.x===c.x&&cell.z===c.z" :aria-label="`第${c.z+1}排第${c.x+1}格${c.x===2||c.x===3?'，入户小径':occupant(c)?'，'+YARD_ITEMS.find(i=>i.id===occupant(c).id).name:''}`" @click="choose(c)" @keydown="key($event,c)">{{ c.x===2||c.x===3?'·':occupant(c)?YARD_ITEMS.find(i=>i.id===occupant(c).id).symbol:'＋' }}</button>
          </div>
          <div class="yard-selection"><span>{{ current?.name }} · {{ rotation }}°</span><button class="text-button" @click="rotation=(rotation+90)%360; message=''">旋转 90° ↻</button></div>
          <p class="yard-check" role="status">{{ message || (check.ok?'这里放得下。':check.why) }}</p>
          <div class="yard-actions"><button class="primary-button" :disabled="!check.ok" @click="place">{{ placed?'移到这里':'放在这里' }}</button><button v-if="placed" class="text-button" @click="remove">收回材料栏</button></div>
        </template>
        <template v-else-if="tab==='plans'">
          <p class="yard-explain">不必从空地开始。六件免费材料，三种生活的样子；先试摆，喜欢再留下。</p>
          <div class="yard-plans">
            <button v-for="(plan,index) in YARD_PLANS" :key="plan.id" :data-plan="plan.id" class="yard-plan" :aria-pressed="preview?.id===plan.id" :aria-label="`预览${plan.name}`" @click="tryPlan(plan)">
              <span class="plan-drawing" aria-hidden="true"><i v-for="c in cells" :key="`${c.x}-${c.z}`" :class="[planOccupant(plan,c)?.id,{path:c.x===2||c.x===3}]">{{ planOccupant(plan,c)?YARD_ITEMS.find(i=>i.id===planOccupant(plan,c).id).symbol:'' }}</i></span>
              <span class="plan-copy"><small>0{{ index+1 }} / {{ plan.mood }}</small><strong>{{ plan.name }}</strong><span>{{ plan.note }}</span><b>{{ preview?.id===plan.id?'正在上方预览':'试摆看看 ↗' }}</b></span>
            </button>
          </div>
          <p class="yard-check" role="status">{{ message || (preview?'预览不会改动存档。可以切换方案对比，或取消回到原样。':'原来的院子会一直保留到你点击「采用这个布局」。') }}</p>
        </template>
        <template v-else>
          <p class="yard-explain">选一种屋顶、一扇门，搭配出自己的家。所有组合都可以随时更换。</p>
          <fieldset v-for="(options,key) in EXTERIOR" :key="key" class="exterior-options"><legend>{{ {wall:'外墙',roof:'屋顶',door:'门',porch:'门廊',path:'入户小径'}[key] }}</legend><div><button v-for="(option,value) in options" :key="value" :aria-pressed="town.exterior[key]===value" @click="setExterior(key,value)"><i v-if="option.color" :style="{background:option.color}" />{{ option.name }}</button></div></fieldset>
          <p class="yard-explain">更换后自动保存，地图上的小家也会一起改变。</p>
        </template>
      </section>
    </div>
  </div>
</template>
<style scoped>
.plan-confirm { padding:18px 20px; background:#f1f4e8; border:1px solid #c6d2b9; border-radius:12px; }
.plan-confirm h3 { font:500 23px var(--serif); margin:8px 0; }
.plan-confirm p { font-size:12px; line-height:1.8; color:var(--ink-2); margin:0; }
.yard-preview { scroll-margin-top:18px; }
.yard-plans { display:grid; gap:12px; }
.yard-plan { display:flex; align-items:center; gap:16px; width:100%; padding:16px 12px; border:1px solid var(--line); background:#faf9f0; border-radius:10px; text-align:left; color:var(--ink); }
.yard-plan[aria-pressed=true] { border-color:var(--primary); background:#edf2e5; }
.plan-copy { flex:1; min-width:0; }
.plan-copy strong,.plan-copy span,.plan-copy b,.plan-copy small { display:block; }
.plan-copy strong { font:500 21px var(--serif); margin:7px 0; }
.plan-copy span { font-size:12px; line-height:1.8; color:var(--ink-2); }
.plan-copy small { font-size:10px; line-height:1.6; color:var(--ink-2); }
.plan-copy b { font-size:12px; color:var(--primary); margin-top:10px; font-weight:500; }
.plan-drawing { display:grid; grid-template-columns:repeat(6,12px); gap:2px; flex:none; padding:7px; background:#e4ebd8; border-radius:5px; border-top:4px solid #ac8b69; }
.plan-drawing i { height:14px; font-style:normal; font-size:12px; text-align:center; line-height:14px; color:#556e48; border-radius:2px; }
.plan-drawing .path { background:#d6ccb3; }
.plan-drawing .bench,.plan-drawing .laundry { background:#c7aa83; color:#765b3a; }
.plan-drawing .tree { background:#99b57f; }
.plan-drawing .flowers { background:#d8b69b; }
.plan-drawing .birdbath { background:#b7ceca; }
.plan-drawing .lamp { background:#e0ce87; }
.town-intro { display:flex; align-items:center; justify-content:space-between; gap:20px; margin:20px 0 28px; }
.town-intro h2 { font:500 32px/1.5 var(--serif); margin:12px 0; }
.town-intro p,.yard-explain { color:var(--ink-2); font-size:13px; line-height:1.8; }
.yard-workbench { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(320px,1fr); gap:26px; align-items:start; }
.yard-preview { position:sticky; top:18px; }
.yard-editor { padding:22px; border:1px solid var(--line); border-radius:18px; background:#fffdf6; }
.yard-light { display:flex; gap:8px; align-items:center; margin:12px 0; }
.yard-light button { padding:8px 14px; border:1px solid #bdcbb4; border-radius:7px; background:transparent; color:var(--primary); }
.yard-light button[aria-pressed=true] { background:var(--primary); color:white; }
.yard-light span { font-size:11px; color:var(--ink-2); margin-left:auto; }
.yard-materials { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.yard-materials button { padding:12px; text-align:left; border:1px solid #d5ddcd; background:#f6f8ef; border-radius:8px; color:var(--ink); }
.yard-materials button[aria-pressed=true] { border-color:var(--primary); box-shadow:inset 0 0 0 1px var(--primary); }
.yard-materials strong { display:block; font-size:13px; }
.yard-materials small { display:block; margin-top:6px; font-size:11px; color:var(--ink-2); line-height:1.6; }
.yard-editor h3 { font-size:14px; margin:22px 0 10px; }
.yard-editor h3 small { font-size:11px; font-weight:400; color:var(--ink-2); margin-left:12px; }
.yard-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:5px; }
.yard-grid button { aspect-ratio:1; min-width:0; border:1px solid #c9d6b9; border-radius:5px; background:#e9efdd; color:#607451; font-size:20px; }
.yard-grid .path { background:#e8dfc9; border-color:#d7ccb4; }
.yard-grid .occupied { background:#bed1ac; }
.yard-grid .chosen { outline:2px solid #3e7053; outline-offset:1px; }
.yard-selection,.yard-actions { display:flex; align-items:center; gap:14px; margin-top:15px; }
.yard-selection { justify-content:space-between; font-size:13px; }
.yard-check { font-size:12px; line-height:1.8; color:#64715b; min-height:22px; }
.exterior-options { border:0; padding:0; margin:24px 0; }
.exterior-options legend { font-size:14px; margin-bottom:12px; }
.exterior-options > div { display:flex; flex-wrap:wrap; gap:8px; }
.exterior-options button { display:flex; align-items:center; gap:7px; padding:10px; border:1px solid #d0d8c6; background:white; border-radius:8px; font-size:12px; color:var(--ink); }
.exterior-options button[aria-pressed=true] { border-color:var(--primary); background:#edf3e7; }
.exterior-options i { width:14px; height:14px; border-radius:50%; }
button:focus-visible { outline:2px solid var(--primary); outline-offset:3px; }
@media(max-width:800px) { .yard-workbench { grid-template-columns:1fr; } .yard-preview { position:static; } .town-intro { align-items:flex-start; flex-direction:column; } .town-intro h2 { font-size:27px; } .yard-editor { padding:16px; } }
</style>
