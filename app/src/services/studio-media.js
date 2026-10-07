import { STUDIO_LIMITS } from '../game/studio.js';
import { exportAndroidFile } from './android.js';
const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(Error('这张图片没能打开，请换一张 PNG、JPEG 或 WebP 图片。'));
  image.src = source;
});
export async function readStudioImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('请选择 PNG、JPEG 或 WebP 图片。');
  if (file.size > 20 * 1024 * 1024) throw Error('这张原图太大，请选一张小于 20 MB 的图片。');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url), canvas = document.createElement('canvas');
    for (const edge of [1024, 768, 512]) {
      const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.48]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= STUDIO_LIMITS.imageChars) return data;
      }
    }
    throw Error('这张图片仍然太大，请换一张较小的图片。');
  } finally { URL.revokeObjectURL(url); }
}
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function albumDocument(works, { includeNote = false } = {}) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>我的第一本作品集 · 旷野</title><style>body{margin:0;background:#f4efe4;color:#1f332a;font:16px/1.9 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:48px 24px}header{margin-bottom:64px}h1,h2{font-family:serif}article{break-inside:avoid;margin:0 0 64px;padding-top:24px;border-top:1px solid #d2c8b2}img{display:block;max-width:100%;max-height:720px;margin:16px auto;object-fit:contain}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#56665c}footer{margin-top:48px;color:#56665c}@media print{body{background:white}main{padding:0}article{break-before:page}header{break-after:page}img{max-height:65vh}}</style><main><header><small>旷野 · 自己做出来的东西</small><h1>我的第一本作品集</h1><p>${works.length} 件作品，都是从一小步开始的。</p></header>${works.map(work => `<article><small>${escape(work.created)}</small><h2>${escape(work.title)}</h2>${work.images.map((src, i) => `<img src="${escape(src)}" alt="${escape(work.title)} · 第 ${i + 1} 张">`).join('')}<p>${escape(work.body)}</p>${includeNote && work.note ? `<p><small>留给自己的话</small><br>${escape(work.note)}</p>` : ''}</article>`).join('')}<footer>在旷野里收好，带到生活里。</footer></main></html>`;
}
function wrapped(ctx, value, x, y, width, lineHeight, maxLines) {
  let line = '', lines = 0, consumed = 0;
  const chars = [...value];
  for (const char of chars) {
    if (char === '\n' || ctx.measureText(line + char).width > width) {
      ctx.fillText(line, x, y); y += lineHeight; lines++; line = '';
      if (lines >= maxLines) return { y, clipped: consumed < chars.length };
    }
    if (char !== '\n') line += char;
    consumed++;
  }
  if (line) { ctx.fillText(line, x, y); y += lineHeight; }
  return { y, clipped: false };
}
export async function workCard(work, { includeNote = false } = {}) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe4'; ctx.fillRect(0, 0, 1200, 1600);
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(56, 56, 1088, 1488);
  ctx.strokeStyle = '#d2c8b2'; ctx.strokeRect(56.5, 56.5, 1087, 1487);
  ctx.fillStyle = '#56665c'; ctx.font = '26px sans-serif'; ctx.fillText('旷野 · 我的作品集', 104, 132);
  ctx.fillStyle = '#1f332a'; ctx.font = 'bold 54px serif';
  const heading = wrapped(ctx, work.title, 104, 232, 990, 76, 3);
  let y = heading.y + 24;
  let selectedPage = heading.clipped;
  if (work.images.length) {
    const image = await loadImage(work.images[0]), maxHeight = 620;
    const ratio = Math.min(990 / image.naturalWidth, maxHeight / image.naturalHeight);
    const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio;
    ctx.drawImage(image, (1200 - w) / 2, y, w, h); y += h + 52;
    selectedPage ||= work.images.length > 1;
  }
  ctx.fillStyle = '#1f332a'; ctx.font = '30px sans-serif';
  const maxLines = Math.max(1, Math.floor(((includeNote && work.note ? 1290 : 1400) - y) / 48));
  const content = wrapped(ctx, work.body, 104, y, 990, 48, Math.floor(maxLines)); y = content.y;
  selectedPage ||= content.clipped;
  if (includeNote && work.note) {
    ctx.fillStyle = '#56665c'; ctx.font = '24px sans-serif';
    const note = wrapped(ctx, work.note, 104, Math.max(y + 24, 1300), 990, 36, 3);
    selectedPage ||= note.clipped;
  }
  ctx.fillStyle = '#56665c'; ctx.font = '24px sans-serif';
  ctx.fillText(`${work.created}${selectedPage ? ' · 作品选页' : ''}`, 104, 1490);
  ctx.textAlign = 'right'; ctx.fillText('从一小步开始。', 1096, 1490);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('作品卡片没能生成，请再试一次。')), 'image/png'));
}
export async function downloadStudioFile(data, name, type) {
  if (await exportAndroidFile(data, name, type)) return;
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
