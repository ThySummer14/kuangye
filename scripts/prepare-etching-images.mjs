// Build-time only. cwebp compresses local generated concepts; runtime needs no image service.
import { mkdirSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const source=new URL('../docs/art/etchings/',import.meta.url);
const target=new URL('../app/public/etchings/',import.meta.url);mkdirSync(target,{recursive:true});
const files=readdirSync(source).filter(f=>/^\d\d-(plain|inlaid|gilded)\.png$/.test(f));
if(files.length!==24)throw Error('Expected 24 individual concepts');
const manifest=[];
for(const file of files){
 const out=file.replace('.png','.webp');
 const r=spawnSync('cwebp',['-quiet','-q','86','-resize','640','640',fileURLToPath(new URL(file,source)),'-o',fileURLToPath(new URL(out,target))],{encoding:'utf8'});
 if(r.status)throw Error(r.stderr||'cwebp failed');
 manifest.push({file:out,bytes:statSync(new URL(out,target)).size});
}
writeFileSync(new URL('manifest.json',target),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${files.length} WebP assets: ${manifest.reduce((n,f)=>n+f.bytes,0)} bytes total.`);
