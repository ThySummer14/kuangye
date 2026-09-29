<script setup>
import { computed, nextTick, ref } from 'vue';
const props = defineProps({ books: { type: Array, default: () => [] } });
const emit = defineEmits(['open']);
const query = ref(''), filter = ref('all'), selected = ref(''), detail = ref(null);
const filters = [{ id:'all', label:'全部' }, { id:'finished', label:'读完了' }, { id:'paused', label:'暂放着' }, { id:'notes', label:'有摘记' }];
const archived = computed(() => props.books.filter(b => b.status !== 'reading'));
const found = computed(() => {
  const term = query.value.trim().toLocaleLowerCase();
  return archived.value.filter(b => {
    if (filter.value === 'finished' && !b.finished) return false;
    if (filter.value === 'paused' && b.finished) return false;
    if (filter.value === 'notes' && !b.notes.length) return false;
    return !term || [b.title, b.author, ...b.notes.map(n => n.text)].some(text => text.toLocaleLowerCase().includes(term));
  }).slice().sort((a,b) => lastDate(b).localeCompare(lastDate(a)));
});
const book = computed(() => archived.value.find(b => b.id === selected.value));
const timeline = computed(() => book.value ? book.value.notes.slice().reverse().sort((a,b) => a.at.localeCompare(b.at)) : []);
function lastDate(b) { return [b.started,b.finished,...b.notes.map(n=>n.at)].filter(Boolean).sort().at(-1) || ''; }
async function open(id) { selected.value = id; await nextTick(); detail.value?.focus(); detail.value?.scrollIntoView({ block:'start', behavior:'auto' }); }
async function back() { const id=selected.value; selected.value=''; await nextTick(); document.getElementById(`revisit-${id}`)?.focus(); }
function clear() { query.value=''; filter.value='all'; }
</script>
<template>
  <section class="retrospect" aria-label="阅读回望">
    <header class="revisit-heading"><div><span class="eyebrow">翻过的页，也留下了你</span><h3>阅读回望</h3><p>有些书读到了最后，有些暂时合上。都可以回来翻翻。</p></div><span class="revisit-total">{{ archived.filter(b=>b.finished).length }} 本读完 · {{ archived.reduce((n,b)=>n+b.notes.length,0) }} 段摘记</span></header>
    <article v-if="book" ref="detail" class="revisit-detail" tabindex="-1" aria-label="这本书的阅读来路">
      <button class="text-button" @click="back">← 回到阅读回望</button>
      <div class="revisit-title"><span class="eyebrow">{{ book.finished ? '读完的一本' : '暂时合上的一本' }}</span><h4>{{ book.title }}</h4><p v-if="book.author">{{ book.author }}</p><span>{{ book.started ? book.started+' 开始' : '开始日期未记录' }}<template v-if="book.finished"> · {{ book.finished }} 读完</template></span></div>
      <ol class="revisit-timeline">
        <li class="timeline-end"><time>{{ book.started || '日期未记录' }}</time><h5>把这本书拿到手里。</h5></li>
        <li v-for="(entry,index) in timeline" :key="index"><time>{{ entry.at || '日期未记录' }}</time><span v-if="entry.bookmark" class="revisit-page">{{ entry.bookmark }}</span><p>{{ entry.text }}</p></li>
        <li v-if="!timeline.length" class="no-notes"><p>这本书还没有摘记。读过的经历，也不必每次都留下文字。</p></li>
        <li class="timeline-end"><time v-if="book.finished">{{ book.finished }}</time><h5>{{ book.finished ? '读到最后，把它留在书架。' : '先合上，下一次再见。' }}</h5><p v-if="book.bookmark">最后的书签 · {{ book.bookmark }}</p></li>
      </ol>
      <div v-if="!book.finished && book.next" class="revisit-next"><span>当时留给下次的线索</span><p>{{ book.next }}</p></div>
      <footer><p>还有一句话想写，或想再读一遍？</p><button class="soft-button" @click="emit('open',book.id)">把这本带回阅读桌 ↗</button></footer>
    </article>
    <template v-else>
      <template v-if="archived.length">
        <div class="revisit-tools"><label>找一本书或一句话<input v-model="query" type="search" placeholder="书名、作者、摘记里的词" /></label><div class="revisit-filters" role="group" aria-label="筛选阅读记录"><button v-for="item in filters" :key="item.id" :aria-pressed="filter===item.id" @click="filter=item.id">{{ item.label }}</button></div></div>
        <p class="revisit-result" role="status">{{ found.length }} 本{{ query.trim() ? '与「'+query.trim()+'」有关' : '，按最近留下记录的时间排列' }}</p>
        <div v-if="found.length" class="revisit-grid"><button v-for="(item,index) in found" :id="`revisit-${item.id}`" :key="item.id" class="revisit-book" @click="open(item.id)"><div class="revisit-cover" :class="'cover-'+index%3"><span>{{ item.finished?'已读完':'暂放书架' }}</span><h4>{{ item.title }}</h4><p>{{ item.author || '我的阅读记录' }}</p></div><div class="revisit-excerpt"><time>{{ item.finished ? item.finished+' 读完' : '上次留在 '+(lastDate(item)||'未记录日期') }}</time><p>{{ item.notes[0]?.text || (item.finished?'没有留下摘记，但你读到了最后。':item.next || '书签还在，想读的时候再回来。') }}</p><span>{{ item.notes.length }} 段摘记 · 翻开回望 ↗</span></div></button></div>
        <div v-else class="revisit-empty"><h4>这次没有找到。</h4><p>换一个词，或看看书架上的全部记录。</p><button class="soft-button" @click="clear">查看全部记录</button></div>
      </template>
      <div v-else class="revisit-empty"><h4>书架，给读过的日子留了位置。</h4><p>在阅读桌把一本书标记为读完，或先放回书架，<br />它的书签与摘记就会在这里等你。</p></div>
    </template>
  </section>
</template>
<style scoped>
.retrospect{margin:42px 0 50px;color:var(--ink)}.revisit-heading{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:24px}.revisit-heading h3{font:500 29px/1.5 var(--serif);margin:8px 0}.revisit-heading p,.revisit-total,.revisit-result{font-size:13px;line-height:1.8;color:var(--ink-2)}.revisit-total{white-space:nowrap}.revisit-tools{display:flex;align-items:end;justify-content:space-between;gap:24px}.revisit-tools label{display:grid;gap:9px;font-size:12px;flex:1;max-width:400px}.revisit-tools input{font:inherit;font-size:16px;padding:12px 14px;width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:7px;background:#fffdf5;color:var(--ink)}.revisit-filters{display:flex;gap:6px;flex-wrap:wrap}.revisit-filters button{border:1px solid var(--line);border-radius:6px;background:transparent;padding:10px 13px;font-size:13px;color:var(--ink-2)}.revisit-filters button[aria-pressed=true]{background:var(--primary);color:#fff}.revisit-result{margin:18px 0}.revisit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.revisit-book{display:grid;grid-template-columns:minmax(115px,.8fr) minmax(0,1fr);padding:0;text-align:left;color:var(--ink);background:#fffdf5;border:1px solid var(--line);border-radius:4px 12px 12px 4px;overflow:hidden}.revisit-cover{padding:23px 20px;border-left:7px solid #87967b;background:#e5eadf;min-height:195px;display:flex;flex-direction:column}.revisit-cover.cover-1{background:#ece4d8;border-color:#ad957b}.revisit-cover.cover-2{background:#e2e8e8;border-color:#859b9b}.revisit-cover span{font-size:11px;color:var(--ink-2)}.revisit-cover h4{font:500 23px/1.6 var(--serif);margin:22px 0;overflow-wrap:anywhere}.revisit-cover p{font-size:12px;margin-top:auto;line-height:1.8}.revisit-excerpt{padding:24px 20px;display:flex;flex-direction:column;min-width:0}.revisit-excerpt time,.revisit-excerpt span{font-size:11px;line-height:1.8;color:var(--ink-2)}.revisit-excerpt p{font:400 16px/1.9 var(--serif);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.revisit-excerpt span{margin-top:auto;padding-top:12px;color:var(--primary)}.revisit-book:hover{border-color:#87967b}.retrospect button:focus-visible,.revisit-detail:focus-visible{outline:2px solid var(--primary);outline-offset:4px}.revisit-empty{padding:30px 24px;background:#edf0e8;border-radius:12px}.revisit-empty h4{font:500 23px/1.6 var(--serif);margin:0 0 12px}.revisit-empty p{font-size:14px;line-height:1.9;color:var(--ink-2)}.revisit-detail{max-width:760px;margin:auto;padding:30px 44px;background:#fffdf5;border:1px solid var(--line);border-radius:12px;scroll-margin-top:24px}.revisit-title{margin:28px 0 36px}.revisit-title h4{font:500 32px/1.6 var(--serif);margin:12px 0;overflow-wrap:anywhere}.revisit-title p,.revisit-title>span:last-child{font-size:13px;color:var(--ink-2);line-height:1.9}.revisit-timeline{list-style:none;padding:0 0 0 24px;border-left:1px solid #c8d0bd;margin-left:5px}.revisit-timeline li{position:relative;padding:0 0 30px}.revisit-timeline li:before{content:'';position:absolute;width:7px;height:7px;top:7px;left:-28px;border-radius:50%;background:#87967b}.revisit-timeline time,.revisit-page{font-size:12px;color:var(--ink-2);line-height:1.9}.revisit-page{display:block}.revisit-timeline p{font:400 18px/1.9 var(--serif);white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0}.revisit-timeline h5{font:500 17px/1.8 var(--serif);margin:9px 0 0}.revisit-timeline .timeline-end p,.revisit-timeline .no-notes p{font-size:14px;color:var(--ink-2)}.revisit-next{padding:18px;background:#f5efdd;overflow-wrap:anywhere}.revisit-next span,.revisit-detail footer p{font-size:12px;color:var(--ink-2)}.revisit-next p{font:400 17px/1.8 var(--serif)}.revisit-detail footer{border-top:1px solid var(--line);margin-top:25px;padding-top:18px}
@media(max-width:750px){.revisit-heading,.revisit-tools{display:block}.revisit-tools label{max-width:none}.revisit-filters{margin-top:15px}.revisit-grid{grid-template-columns:1fr}.revisit-detail{padding:22px 20px}.revisit-heading h3{font-size:25px}.revisit-title h4{font-size:27px}.revisit-cover{padding:19px 14px}.revisit-excerpt{padding:20px 15px}.revisit-cover h4{font-size:21px}}
</style>
