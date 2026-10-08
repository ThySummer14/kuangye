/* Godot 4.6.3 MIT download function, unchanged body.
Source: platform/web/js/libs/library_godot_os.js, godot_js_os_download_buffer.
Copyright (c) 2014-present Godot Engine contributors.
Copyright (c) 2007-2014 Juan Linietsky, Ariel Manzur.
Full notices are in GODOT_ENGINE_NOTICES.txt.
Only the WASM memory/string adapters below are replaced for this component test. */
let HEAP8;
const GodotRuntime={heapSlice:(heap,ptr,size)=>heap.slice(ptr,ptr+size),parseString:(value)=>value};
const godotDownload=function (p_ptr, p_size, p_name, p_mime) {
 const buf = GodotRuntime.heapSlice(HEAP8, p_ptr, p_size);
 const name = GodotRuntime.parseString(p_name);
 const mime = GodotRuntime.parseString(p_mime);
 const blob = new Blob([buf], { type: mime });
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = name;
 a.style.display = 'none';
 document.body.appendChild(a);
 a.click();
 a.remove();
 window.URL.revokeObjectURL(url);
};
const downloads={};
Promise.all([['png','page.png','kuangye-work.png','image/png'],['html','album.html','kuangye-album.html','text/html;charset=utf-8']].map(async([key,url,name,mime])=>{
 const response=await fetch(url);if(!response.ok)throw Error('fixture response');downloads[key]={bytes:new Int8Array(await response.arrayBuffer()),name,mime};document.getElementById(key).disabled=false;
})).catch(e=>document.getElementById('download-status').textContent=String(e));
function downloadFixture(key){const d=downloads[key];HEAP8=d.bytes;godotDownload(0,d.bytes.byteLength,d.name,d.mime);document.getElementById('download-status').textContent='下载请求已发出：'+d.name;}
