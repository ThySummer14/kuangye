<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { state, taskById, activeOf, openReadingBook, saveReadingBook, addReadingNote, putReadingBookAway, continueReadingBook } from '../store.js';
import ReadingRetrospect from './ReadingRetrospect.vue';
import { READING_TASKS } from '../game/reading.js';
const emit = defineEmits(['task','tasks']);
const books = computed(() => state.home.reading?.books || []);
const current = computed(() => books.value.find(b => b.status === 'reading'));
const shelf = computed(() => books.value.filter(b => b.status !== 'reading'));
const selected = ref(''), editing = ref(false), note = ref(''), notice = ref('');
const draft = reactive({ title:'', author:'', bookmark:'', next:'', qid:'' });
const shown = computed(() => books.value.find(b => b.id === selected.value) || current.value);
function edit(book) { Object.assign(draft, book || { title:'', author:'', bookmark:'', next:'', qid:'' }); editing.value = true; notice.value = ''; }
function save() {
  const r = current.value ? saveReadingBook(current.value.id, draft) : openReadingBook(draft);
  notice.value = r.ok ? '书签收好了，下次从这里继续。' : r.why;
  if(r.ok) { editing.value = false; selected.value = ''; }
}
function addNote() { const r = addReadingNote(shown.value.id, note.value); notice.value = r.ok ? '这句话已夹进书里。' : r.why; if(r.ok) note.value = ''; }
function shelve(finished) { const id=current.value.id; const r=putReadingBookAway(id,finished); if(r.ok) { selected.value=id; editing.value=false; } notice.value=r.ok ? (finished?'读完的日子，留在书架上了。':'先放回书架，想读时再拿起来。') : r.why; }
function resume(book) { const r=continueReadingBook(book.id); notice.value=r.ok?'翻回上次的书签。':r.why; if(r.ok)selected.value=''; }
const paper = ref(null);
async function revisit(id) { select(id); await nextTick(); paper.value?.focus(); paper.value?.scrollIntoView({block:'start'}); }
function select(id) { selected.value=id; note.value=''; notice.value=''; editing.value=false; }
</script>
<template>
  <section class="reading-desk" aria-label="我的阅读桌">
    <header class="reading-heading"><div><span class="eyebrow">一本书，一点自己的时间</span><h3>把书签留在这里。</h3></div><span class="reading-count">{{ books.length }} 本书 · {{ books.reduce((n,b)=>n+b.notes.length,0) }} 段摘记</span></header>
    <div class="reading-columns">
      <aside class="reading-shelf" aria-label="我的书架">
        <button v-if="current" class="book-spine current" :aria-pressed="shown?.id===current.id" @click="select('')"><small>正在读</small><strong>{{ current.title }}</strong><span>{{ current.bookmark || '书签还空着' }}</span></button>
        <button v-for="book in shelf" :key="book.id" class="book-spine" :aria-pressed="shown?.id===book.id" @click="select(book.id)"><small>{{ book.finished ? '已读完 · '+book.finished : '暂放书架' }}</small><strong>{{ book.title }}</strong><span>{{ book.notes.length }} 段摘记</span></button>
        <button v-if="!current" class="soft-button" @click="selected='';edit()">打开一本书 ＋</button>
        <p>摘记随备份保存。这里不计时，也不用每天来报到。</p>
      </aside>
      <div ref="paper" class="reading-paper" tabindex="-1" aria-label="书签与摘记">
        <form v-if="editing" class="reading-form" @submit.prevent="save">
          <h4>{{ current?'整理这本书的书签':'今天想翻哪一本？' }}</h4>
          <label>书名<input v-model="draft.title" maxlength="80" required placeholder="书的名字" /></label>
          <label>作者（选填）<input v-model="draft.author" maxlength="60" /></label>
          <label>读到哪里了<input v-model="draft.bookmark" maxlength="80" placeholder="例如：第 32 页 / 第二章" /></label>
          <label>下次从这里开始<textarea v-model="draft.next" maxlength="160" rows="2" placeholder="留一个想继续读的问题，或下一小段。" /></label>
          <label>关联阅读旅程<select v-model="draft.qid"><option value="">先自由读一读</option><option v-for="qid in READING_TASKS" :key="qid" :value="qid">{{ taskById[qid].title }}</option></select></label>
          <div class="reading-actions"><button class="primary-button" type="submit">保存书签</button><button class="text-button" type="button" @click="editing=false">取消</button></div>
        </form>
        <template v-else-if="shown">
          <span class="eyebrow">{{ shown.status==='reading'?'手里的这一本':'书架上的日子' }}</span><h4>{{ shown.title }}</h4><p class="book-author">{{ shown.author || '书名记下了，作者可以以后补。' }}</p>
          <div class="reading-bookmark"><span>{{ shown.bookmark || '还没夹上书签' }}</span><p>{{ shown.next || '下次想读的时候，从喜欢的一页开始。' }}</p></div>
          <div class="reading-actions" v-if="shown.status==='reading'"><button class="soft-button" @click="edit(shown)">更新书签</button><button class="text-button" @click="shelve(true)">这本读完了</button><button class="text-button" @click="shelve(false)">先放回书架</button></div>
          <button v-else-if="!current" class="soft-button" @click="resume(shown)">继续读这本</button>
          <button v-if="shown.qid" class="reading-task" @click="activeOf(shown.qid)?emit('tasks'):emit('task',taskById[shown.qid])">{{ taskById[shown.qid].title }} · {{ activeOf(shown.qid)?'回岩壁记录阅读':'查看旅程' }} ↗</button>
          <p class="reading-disclaimer">书签与摘记是自己的记录；任务打卡和完成仍在对应旅程中确认。</p>
          <form class="note-form" @submit.prevent="addNote"><label for="reading-note">夹一张纸条<textarea id="reading-note" v-model="note" maxlength="1500" rows="3" placeholder="一句摘录、一个问题，或读到这里的想法。" /></label><button class="soft-button" :disabled="!note.trim()">收下这段摘记</button></form>
          <ol class="reading-notes"><li v-for="(entry,index) in shown.notes" :key="index"><small>{{ entry.at }}{{ entry.bookmark?' · '+entry.bookmark:'' }}</small><p>{{ entry.text }}</p></li></ol>
        </template>
        <div v-else class="reading-empty"><span class="paper-mark" aria-hidden="true">▤</span><h4>不用先读完，才值得留下。</h4><p>记下手边的一本书，读几页，留一句。<br />下次来，就知道从哪里继续。</p><button class="primary-button" @click="edit()">记下第一本书</button></div>
        <p v-if="notice" class="reading-notice" role="status">{{ notice }}</p>
      </div>
    </div>
  </section>
  <ReadingRetrospect :books="books" @open="revisit" />
</template>
<style scoped>
.reading-desk{margin:28px 0 44px;color:var(--ink)}.reading-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:20px}.reading-heading h3{font:500 29px/1.5 var(--serif);margin:9px 0}.reading-count{font-size:12px;color:var(--ink-2)}.reading-columns{display:grid;grid-template-columns:235px minmax(0,1fr);border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fffdf5}.reading-shelf{background:#e9eee3;padding:22px;display:flex;flex-direction:column;gap:12px}.reading-shelf>p,.reading-disclaimer{font-size:12px;line-height:1.8;color:var(--ink-2)}.book-spine{text-align:left;background:#faf6e8;border:1px solid #d9d9c7;border-left:6px solid #b5bd9a;padding:13px 14px;color:var(--ink);border-radius:3px 8px 8px 3px;overflow-wrap:anywhere}.book-spine[aria-pressed=true]{border-left-color:#466f58;background:#fffdf5;outline:1px solid #8da086}.book-spine strong,.book-spine span{display:block;margin-top:7px}.book-spine strong{font:500 18px/1.5 var(--serif)}.book-spine small,.book-spine span{font-size:11px;color:var(--ink-2)}.reading-paper{padding:30px 36px;min-width:0}.reading-paper h4{font:500 27px/1.6 var(--serif);margin:10px 0;overflow-wrap:anywhere}.book-author{font-size:13px;color:var(--ink-2)}.reading-bookmark{border-left:3px solid #ba925e;padding:10px 18px;background:#f5efdd;margin:22px 0;overflow-wrap:anywhere}.reading-bookmark span{font-size:12px;color:#8d6d40}.reading-bookmark p{font:400 18px/1.7 var(--serif);margin:8px 0}.reading-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.reading-task{display:block;background:none;border:0;color:var(--primary);padding:16px 0 0;text-align:left;line-height:1.8}.reading-form{display:grid;gap:14px}.reading-form label,.note-form label{display:grid;gap:8px;font-size:13px;color:var(--ink-2)}.reading-desk input,.reading-desk textarea,.reading-desk select{box-sizing:border-box;width:100%;min-width:0;border:1px solid #d3d9ca;background:#fffef8;border-radius:6px;padding:11px;color:var(--ink);font:inherit}.reading-desk textarea{resize:vertical}.note-form{border-top:1px solid var(--line);padding-top:22px;margin-top:24px}.note-form button{margin-top:12px}.reading-notes{padding:0;list-style:none}.reading-notes li{border-top:1px solid var(--line);padding:20px 0}.reading-notes small{font-size:11px;color:var(--ink-2)}.reading-notes p{white-space:pre-wrap;overflow-wrap:anywhere;font:400 17px/1.9 var(--serif);margin-bottom:0}.reading-empty{padding:15px 0 25px}.paper-mark{font-size:40px;color:#9ca982}.reading-empty p{font-size:14px;line-height:1.9;color:var(--ink-2);margin-bottom:24px}.reading-notice{font-size:13px;color:var(--primary);line-height:1.8}.reading-desk button:focus-visible{outline:2px solid var(--primary);outline-offset:3px}.reading-desk button:disabled{opacity:.45}
@media(max-width:600px){.reading-heading{display:block}.reading-heading h3{font-size:25px}.reading-columns{grid-template-columns:1fr}.reading-shelf{padding:16px;max-height:260px;overflow:auto}.reading-paper{padding:22px 18px}.reading-paper h4{font-size:24px}.reading-form input,.reading-form textarea,.reading-form select,.note-form textarea{font-size:16px}.reading-actions{gap:8px}.reading-desk{margin-top:18px}}
</style>
