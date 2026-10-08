// Unit scope only: browser chooser/download still requires actual browser QA.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../scripts/studio_files.gd',import.meta.url),'utf8').match(/const PICKER_SCRIPT="""([\s\S]*?)"""/)[1];
let inputs=[],events=[];
const document={createElement(){const input={style:{},listeners:{},files:[],removed:false,clicked:false,addEventListener(name,fn){this.listeners[name]=fn;},remove(){this.removed=true;},click(){this.clicked=true;}};inputs.push(input);return input;},body:{appendChild(){}}};
const window={};vm.runInNewContext(source,{window,document,Uint8Array});const picker=window.__kuangyeLocalImages;
const callback=(...e)=>events.push(e);let passed=0;const check=(value,label)=>{assert.ok(value,label);passed++;console.log('PASS '+label);};
const data=async()=>new Uint8Array([1,2,3]).buffer;
picker.choose(1,callback);const first=inputs.at(-1);check(first.clicked&&first.multiple&&first.accept==='image/png,image/jpeg,image/webp','explicit choose opens only allowed MIME selector');
first.listeners.cancel();check(events.length===1&&events[0][0]==='cancel'&&first.removed,'native cancel emits no image and removes input');
events=[];picker.choose(2,callback);inputs.at(-1).files=Array.from({length:5},()=>({size:3,type:'image/png',arrayBuffer:data}));await inputs.at(-1).listeners.change();check(events[0][0]==='error'&&events.every(e=>e[0]!=='image'),'five files rejected before any bytes are read');
events=[];let read=false;picker.choose(3,callback);inputs.at(-1).files=[{size:20*1024*1024+1,arrayBuffer(){read=true;return data();}}];await inputs.at(-1).listeners.change();check(!read&&events[0][0]==='error','oversize source rejected before arrayBuffer allocation');
events=[];let release;picker.choose(4,callback);const old=inputs.at(-1);old.files=[{size:3,type:'image/png',arrayBuffer:()=>new Promise(r=>{release=r;})}];const pending=old.listeners.change();picker.cancel();release(await data());await pending;check(events.length===0&&old.removed,'cancel during pending read cannot emit a stale image');
events=[];picker.choose(5,callback);const next=inputs.at(-1);next.files=[{size:3,type:'image/png',arrayBuffer:data},{size:3,type:'image/webp',arrayBuffer:data}];await next.listeners.change();check(events.map(e=>e[0]).join(',')==='image,image,done'&&events.every(e=>e[1]===5),'sequential bounded files carry exact active token');
events=[];picker.choose(6,callback);const broken=inputs.at(-1);broken.files=[{size:3,type:'image/png',arrayBuffer:async()=>{throw new Error('unreadable');}}];await broken.listeners.change();check(events[0][0]==='error'&&broken.removed,'read exception reports error and removes input');
picker.choose(7,callback);const previous=inputs.at(-1);picker.choose(8,callback);check(previous.removed&&inputs.at(-1)!==previous,'new selection detaches prior input');
fs.writeFileSync(new URL('../artifacts/browser-picker-unit-results.json',import.meta.url),JSON.stringify({passed,actual_browser:false},null,2));
