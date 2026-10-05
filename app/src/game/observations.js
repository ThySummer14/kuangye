import { OBSERVATION_KINDS } from '../data/observations.js';
import { STUDIO_LIMITS, studioImage } from './studio.js';
export const OBSERVATION_LIMITS = { place:100, body:3000, hint:500, images:2 };
export const emptyObservations = () => ({ entries:[] });
const invalid = () => { throw Error('观察册资料不完整，请保留原内容或备份。'); };
export function observationDate(value) {
  if (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) invalid();
  return value;
}
export function observationFields(input={}) {
  for(const key of ['place','body','hint']) if(input[key]!=null && (typeof input[key]!=='string' || input[key].length>OBSERVATION_LIMITS[key])) invalid();
  if(!OBSERVATION_KINDS.some(kind=>kind.id===input.kind)) invalid();
  if(input.images!=null && (!Array.isArray(input.images) || input.images.length>OBSERVATION_LIMITS.images)) invalid();
  return { place:(input.place||'').trim(), body:input.body||'', hint:input.hint||'', kind:input.kind,
    observedOn:observationDate(input.observedOn), images:(input.images||[]).map(studioImage) };
}
export const observationReady = entry => !!entry?.place.trim() && !!entry.body.trim();
export const observationImageSize = book => book.entries.reduce((size,entry)=>size+entry.images.reduce((n,image)=>n+image.length,0),0);
export function normalizeObservations(raw) {
  if(raw==null) return emptyObservations();
  if(!Array.isArray(raw.entries)) invalid();
  const ids=new Set();let draft=false;
  const entries=raw.entries.map(entry=>{
    if(typeof entry?.id!=='string' || !entry.id.trim() || entry.id!==entry.id.trim() || entry.id.length>100 || ids.has(entry.id) || !['draft','kept'].includes(entry.status)) invalid();
    ids.add(entry.id);
    const fields=observationFields(entry),createdAt=observationDate(entry.createdAt);
    if(entry.status==='draft' && (draft || entry.keptAt)) invalid();
    if(entry.status==='draft') draft=true;
    if(entry.status==='kept' && !observationReady(fields)) invalid();
    return { id:entry.id,...fields,status:entry.status,createdAt,keptAt:entry.status==='kept'?observationDate(entry.keptAt):'' };
  });
  const book={entries};
  if(observationImageSize(book)>STUDIO_LIMITS.allImageChars) throw Error('观察册图片超过保存容量，请保留原备份。');
  return book;
}
function capacity(entries,otherImageChars) {
  if(observationImageSize({entries})+otherImageChars>STUDIO_LIMITS.allImageChars)
    return { ok:false,why:'图片保存空间快满了。画室与观察册共用空间，请换较小的图片；已有内容都保留着。' };
  return { ok:true };
}
export function startObservation(book,input,id,at,otherImageChars=0) {
  const current=book.entries.find(entry=>entry.status==='draft');
  if(current) return { ok:true,entry:current,existing:true };
  if(!id || book.entries.some(entry=>entry.id===id)) return { ok:false,why:'这一页已经在观察册里。' };
  const fields=observationFields({place:'',body:'',images:[],kind:'other',observedOn:at,...input});
  const entry={id,...fields,status:'draft',createdAt:observationDate(at),keptAt:''};
  const result=capacity([entry,...book.entries],otherImageChars);
  if(!result.ok) return result;
  book.entries.unshift(entry);return { ok:true,entry };
}
export function updateObservation(book,id,input,otherImageChars=0) {
  const entry=book.entries.find(entry=>entry.id===id);
  if(!entry) return { ok:false,why:'没有找到这张观察页。' };
  const fields=observationFields({...entry,...input});
  if(entry.status==='kept' && !observationReady(fields)) return { ok:false,why:'已收好的观察需要保留地点与具体发现，原来的记录仍在。' };
  const result=capacity(book.entries.map(item=>item.id===id?{...item,...fields}:item),otherImageChars);
  if(!result.ok) return result;
  Object.assign(entry,fields);return { ok:true,entry };
}
export function keepObservation(book,id,at) {
  const entry=book.entries.find(entry=>entry.id===id);
  if(!entry) return { ok:false,why:'没有找到这张观察页。' };
  if(entry.status==='kept') return { ok:true,entry,unchanged:true };
  if(!observationReady(entry)) return { ok:false,why:'写下地点和一个具体发现，再收进观察册。' };
  entry.keptAt=observationDate(at);entry.status='kept';return { ok:true,entry };
}
export function observationEntries(book,{query='',kind='all'}={}) {
  const term=query.trim().toLowerCase();
  return book.entries.filter(entry=>entry.status==='kept' && (kind==='all'||entry.kind===kind) && (!term||`${entry.place}\n${entry.body}\n${entry.observedOn}`.toLowerCase().includes(term)))
    .slice().sort((a,b)=>b.observedOn.localeCompare(a.observedOn));
}
