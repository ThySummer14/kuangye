<script setup>
import { ref, computed } from 'vue';
import { saveObservationPage, keepObservationPage, saveWarning } from '../store.js';
import { OBSERVATION_LIMITS, observationReady, observationFields } from '../game/observations.js';
import { OBSERVATION_KINDS } from '../data/observations.js';
import { readStudioImage } from '../services/studio-media.js';
const props=defineProps({entry:Object});
const emit=defineEmits(['saved','kept']);
const place=ref(props.entry.place),body=ref(props.entry.body),kind=ref(props.entry.kind),observedOn=ref(props.entry.observedOn),images=ref([...props.entry.images]);
const error=ref(''),busy=ref(false),saved=ref(false);
const fields=()=>({place:place.value,body:body.value,kind:kind.value,observedOn:observedOn.value,images:images.value});
const ready=computed(()=>{try{return observationReady(observationFields(fields()));}catch{return false;}});
function persist(explicit=false) {
  const result=saveObservationPage(props.entry.id,fields());
  error.value=result.ok?'':result.why;saved.value=result.ok;
  if(explicit&&result.ok)emit('saved');
  return result.ok;
}
function keep() {
  if(busy.value||!persist())return;
  const result=keepObservationPage(props.entry.id);
  if(!result.ok){error.value=result.why;return;}
  emit('kept');
}
async function addImages(e) {
  const files=[...e.target.files];e.target.value='';if(!files.length)return;
  if(files.length+images.value.length>OBSERVATION_LIMITS.images){error.value='每页最多两张图片，已有图片都还在。';return;}
  busy.value=true;error.value='';
  try {
    const added=[];for(const file of files)added.push(await readStudioImage(file));
    const previous=images.value;images.value=[...images.value,...added];
    if(!persist())images.value=previous;
  }catch(err){error.value=err.message;}finally{busy.value=false;}
}
function removeImage(i) {const previous=images.value;images.value=images.value.filter((_,index)=>index!==i);if(!persist())images.value=previous;}
</script>
<template>
  <form class="observation-editor" @submit.prevent="persist(true)">
    <div class="observation-fields"><div><label for="observation-place">在哪里看见的</label><input id="observation-place" v-model="place" :maxlength="OBSERVATION_LIMITS.place" placeholder="比如：楼下长椅旁" @input="persist()" /></div><div><label for="observation-date">看见的日子</label><input id="observation-date" v-model="observedOn" type="date" @change="persist()" /></div></div>
    <label for="observation-kind">这次留意了什么</label><select id="observation-kind" v-model="kind" @change="persist()"><option v-for="item in OBSERVATION_KINDS" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    <p v-if="entry.hint" class="observation-hint"><strong>这次想留意的</strong>{{ entry.hint }}</p>
    <label for="observation-body">一个具体发现 <small>写你真的看见、听见或摸到的细节</small></label><textarea id="observation-body" v-model="body" :maxlength="OBSERVATION_LIMITS.body" rows="7" placeholder="不用写成一篇文章。颜色、形状、声音，或今天与上次有什么不同，都可以。" @input="persist()" />
    <div class="observation-image-heading"><span>本地图片 · {{ images.length }} / {{ OBSERVATION_LIMITS.images }}</span><label class="soft-button observation-upload">{{ busy?'正在收下图片…':'带回一张照片 ＋' }}<input type="file" aria-label="选择观察图片" accept="image/png,image/jpeg,image/webp" multiple :disabled="busy || images.length>=OBSERVATION_LIMITS.images" @change="addImages" /></label></div>
    <p class="observation-help">图片可选。原图小于 20 MB，会在本地缩小后保存；请另留原图。画室与观察册共用图片保存空间。</p>
    <div v-if="images.length" class="observation-editor-images"><figure v-for="(src,i) in images" :key="i"><img :src="src" :alt="'本次观察图片 '+(i+1)" /><button type="button" class="text-button" :disabled="busy" @click="removeImage(i)">移除第 {{ i+1 }} 张</button></figure></div>
    <p v-if="error" role="alert" class="observation-error">这一版未保存：{{ error }}</p><p v-else role="status" class="observation-save">{{ saveWarning.text || (busy?'正在处理图片…':saveWarning.pending?'正在保存到本地…':saved?'这一版已经保存在本地。':'草稿在这里，可以慢慢写。') }}</p>
    <div class="observation-edit-actions"><button class="soft-button" type="submit" :disabled="busy">保存这一页</button><button v-if="entry.status==='draft'" class="primary-button" type="button" :disabled="busy || !ready" @click="keep">收进观察册</button></div><p class="observation-help">写全地点与具体发现，就可以收好。修改自动保存，记录不另发奖励。</p>
  </form>
</template>
<style scoped>
.observation-fields { display:grid; grid-template-columns:minmax(0,1fr) 180px; gap:18px; }
label { display:block; margin:20px 0 9px; font-size:13px; font-weight:500; }
.observation-fields label { margin-top:0; }
label small { font-size:11px; font-weight:400; color:var(--ink-3); display:block; margin-top:6px; }
input:not([type=file]),select,textarea { box-sizing:border-box; width:100%; min-width:0; padding:12px 14px; border:1px solid var(--line-2); background:var(--card); color:var(--ink); border-radius:5px; font:14px/1.8 var(--sans); }
textarea { resize:vertical; }
.observation-hint { padding:16px 18px; background:var(--moss-wash); font-size:12px; line-height:1.9; color:var(--ink-2); margin-top:22px; }
.observation-hint strong { display:block; font-weight:500; color:var(--primary); margin-bottom:5px; }
.observation-image-heading { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; margin-top:22px; font-size:13px; }
.observation-upload { position:relative; margin:0; cursor:pointer; overflow:hidden; font-weight:400; }
.observation-upload input { position:absolute; inset:0; width:100%; opacity:0; cursor:pointer; }
.observation-upload:focus-within { outline:2px solid var(--primary); outline-offset:3px; }
.observation-help { color:var(--ink-3); font-size:11px; line-height:1.9; }
.observation-editor-images { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin:20px 0; }
figure { margin:0; min-width:0; }
figure img { display:block; width:100%; height:170px; object-fit:contain; background:var(--paper); }
figure button { font-size:11px; margin-top:8px; }
.observation-edit-actions { display:flex; flex-wrap:wrap; gap:14px; margin-top:16px; }
.observation-error { color:var(--ember); font-size:13px; line-height:1.9; }
.observation-save { color:var(--primary); font-size:12px; line-height:1.9; }
@media(max-width:600px) { .observation-fields { grid-template-columns:1fr; gap:20px; } figure img { height:130px; } }
</style>
