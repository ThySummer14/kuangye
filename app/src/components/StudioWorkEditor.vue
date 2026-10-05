<script setup>
import { ref } from 'vue';
import { saveStudioWork, saveWarning } from '../store.js';
import { STUDIO_LIMITS } from '../game/studio.js';
import { readStudioImage } from '../services/studio-media.js';
const props = defineProps({ work: Object });
const emit = defineEmits(['saved']);
const title = ref(props.work.title), body = ref(props.work.body), note = ref(props.work.note), images = ref([...props.work.images]);
const error = ref(''), busy = ref(false), saved = ref(false);
function persist(explicit = false) {
  if (explicit && !title.value.trim()) { error.value = '给这件作品留一个名字。'; return false; }
  const result = saveStudioWork(props.work.id, { title: title.value.trim() || props.work.title, body: body.value, note: note.value, images: images.value });
  error.value = result.ok ? '' : result.why;
  saved.value = result.ok;
  if (explicit && result.ok) emit('saved');
  return result.ok;
}
async function addImages(e) {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  if (files.length + images.value.length > STUDIO_LIMITS.images) { error.value = '每件作品最多保留四张图片。已有图片都还在。'; return; }
  busy.value = true; error.value = '';
  try {
    const added = [];
    for (const file of files) added.push(await readStudioImage(file));
    const previous = images.value;
    images.value = [...images.value, ...added];
    if (!persist()) images.value = previous;
  } catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}
function removeImage(i) {
  const previous = images.value;
  images.value = images.value.filter((_, index) => index !== i);
  if (!persist()) images.value = previous;
}
</script>
<template>
  <form class="studio-editor" @submit.prevent="persist(true)">
    <label for="studio-title">作品名字</label>
    <input id="studio-title" v-model="title" :maxlength="STUDIO_LIMITS.title" required @input="persist()" />
    <label for="studio-body">带回来的正文 <small>也可以写图片的说明</small></label>
    <textarea id="studio-body" v-model="body" :maxlength="STUDIO_LIMITS.body" rows="9" placeholder="写下你做出的那一版，不需要先修成完美的样子。" @input="persist()" />
    <div class="image-heading"><span>作品图片 · {{ images.length }} / 4</span><label class="soft-button upload-button">{{ busy ? '正在收下图片…' : '选择本地图片 ＋' }}<input aria-label="选择作品图片" type="file" accept="image/png,image/jpeg,image/webp" multiple :disabled="busy || images.length >= 4" @change="addImages" /></label></div>
    <p class="editor-help">PNG、JPEG 或 WebP，每张原图小于 20 MB。图片会缩小后保存在这台设备里，请另留原图。</p>
    <div v-if="images.length" class="editor-images"><figure v-for="(src, i) in images" :key="i"><img :src="src" :alt="'作品图片 ' + (i + 1)" /><button type="button" class="text-button" :disabled="busy" @click="removeImage(i)">移除第 {{ i + 1 }} 张</button></figure></div>
    <label for="studio-note">留给自己的话 <small>可选，导出时默认不带上</small></label>
    <textarea id="studio-note" v-model="note" :maxlength="STUDIO_LIMITS.note" rows="3" placeholder="创作时遇见了什么，或下次还想试什么。" @input="persist()" />
    <p class="editor-help">文字修改会自动保存。收好作品前，需要有正文或至少一张图片。</p>
    <p v-if="error" class="editor-error" role="alert">这一版未保存：{{ error }}</p>
    <p v-else role="status" class="editor-save">{{ saveWarning.text || (busy ? '正在处理图片…' : saveWarning.pending ? '正在保存到本地…' : saved ? '这一版已保存在本地。' : '作品保存在本地，可以慢慢改。') }}</p>
    <button class="soft-button" type="submit" :disabled="busy">保存这一版</button>
  </form>
</template>
<style scoped>
.studio-editor { min-width: 0; }
label { display: block; font-size: 14px; font-weight: 600; color: var(--ink); margin: 22px 0 9px; }
label:first-child { margin-top: 0; }
label small { color: var(--ink-3); font-size: 11px; font-weight: 400; margin-left: 8px; }
input:not([type=file]),textarea { width: 100%; box-sizing: border-box; background: var(--card); color: var(--ink); border: 1px solid var(--line-2); border-radius: var(--r-s); padding: 12px 14px; font: 14px/1.9 var(--sans); }
textarea { resize: vertical; }
.image-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 24px; font-size: 14px; }
.upload-button { position: relative; overflow: hidden; margin: 0; cursor: pointer; font-weight: 400; }
.upload-button input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
.upload-button:focus-within { outline: 2px solid var(--primary); outline-offset: 3px; }
.editor-help,.editor-save { font-size: 12px; color: var(--ink-3); line-height: 1.8; }
.editor-save { color: var(--primary); }
.editor-error { font-size: 13px; color: var(--ember); line-height: 1.8; }
.editor-images { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin: 18px 0; }
figure { margin: 0; min-width: 0; }
figure img { display: block; width: 100%; height: 170px; object-fit: contain; background: var(--paper-2); }
figure button { font-size: 12px; margin-top: 4px; }
@media(max-width:600px) { figure img { height: 130px; } label small { display: block; margin: 3px 0 0; } }
</style>
