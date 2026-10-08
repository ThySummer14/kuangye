class_name StudioFiles
extends Node
const Bytes=preload("res://scripts/local_bytes.gd")
const Images=preload("res://scripts/studio_images.gd")
signal imported(token:int,copies:Array,error:String)
signal exported(token:int,ok:bool,message:String)
var token:=0
var dialog:FileDialog
var bridge:Object
var callback:Variant
var pending:Array=[]
const PICKER_SCRIPT="""
(()=>{
 if(window.__kuangyeLocalImages)return;
 let active=null;
 window.__kuangyeLocalImages={
  cancel(){if(active){active.dead=true;active.input.remove();active=null;}},
  choose(id,cb){
   this.cancel();
   const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.multiple=true;
   input.style.display='none';document.body.appendChild(input);
   const state={input,dead:false};active=state;
   const finish=(kind,detail='')=>{if(state.dead)return;state.dead=true;input.remove();if(active===state)active=null;cb(kind,id,detail);};
   input.addEventListener('cancel',()=>finish('cancel'),{once:true});
   input.addEventListener('change',async()=>{
    const files=Array.from(input.files||[]);
    if(!files.length){finish('cancel');return;}
    if(files.length>4){finish('error','一次最多选择4张图片。');return;}
    if(files.some(f=>!f.size||f.size>20*1024*1024)){finish('error','请选择非空且不超过20 MiB的图片。');return;}
    try{
     for(const file of files){
      const bytes=await file.arrayBuffer();if(state.dead)return;
      cb('image',id,new Uint8Array(bytes),file.type);
     }
     finish('done');
    }catch(e){finish('error','文件没能读完；已有图片仍保留。');}
   },{once:true});
   input.click();
  }
 };
})();
"""
func _ready()->void:
	if OS.has_feature("web") and Engine.has_singleton("JavaScriptBridge"):
		bridge=Engine.get_singleton("JavaScriptBridge")
		bridge.eval(PICKER_SCRIPT,true)
		callback=bridge.create_callback(_web_event)
func _exit_tree()->void:
	cancel()
func cancel()->void:
	token+=1;pending.clear()
	if is_instance_valid(dialog):dialog.queue_free();dialog=null
	if bridge!=null:bridge.get_interface("window").__kuangyeLocalImages.cancel()
func choose()->int:
	cancel();var current:=token
	if bridge!=null:
		bridge.get_interface("window").__kuangyeLocalImages.choose(current,callback)
	else:
		dialog=FileDialog.new();dialog.file_mode=FileDialog.FILE_MODE_OPEN_FILES;dialog.access=FileDialog.ACCESS_FILESYSTEM
		dialog.filters=PackedStringArray(["*.png ; PNG","*.jpg,*.jpeg ; JPEG","*.webp ; WebP"])
		dialog.deleting_enabled=false;dialog.folder_creation_enabled=false;dialog.show_hidden_files=false;dialog.hidden_files_toggle_enabled=false
		dialog.favorites_enabled=false;dialog.recent_list_enabled=false;dialog.use_native_dialog=true
		add_child(dialog)
		dialog.files_selected.connect(func(paths):read_selected_paths(current,paths))
		dialog.canceled.connect(func():finish(current,[],""))
		dialog.popup_centered_clamped(Vector2i(700,520),.9)
	return current
func finish(current:int,copies:Array,error:String)->void:
	if current!=token:return
	if is_instance_valid(dialog):dialog.queue_free();dialog=null
	pending.clear();imported.emit(current,copies,error)
func normalize_one(current:int,bytes:PackedByteArray,mime:="")->bool:
	if current!=token:return false
	var result:=Images.normalize(bytes,mime)
	if not result.ok:finish(current,[],result.error);token+=1;return false
	if not pending.has(result.data):pending.append(result.data)
	return true
func read_selected_paths(current:int,paths:PackedStringArray)->void:
	if current!=token:return
	if paths.size()>4:finish(current,[],"一次最多选择4张图片。");return
	for path in paths:
		var file:=FileAccess.open(path,FileAccess.READ)
		if file==null:finish(current,[],"没能打开所选图片；已有图片仍保留。");return
		var length:=file.get_length()
		if length<=0 or length>Images.SOURCE_BYTES:file.close();finish(current,[],"请选择非空且不超过20 MiB的图片。");return
		var bytes:=file.get_buffer(length);file.close()
		if bytes.size()!=length:finish(current,[],"文件没能读完；已有图片仍保留。");return
		var extension:=path.get_extension().to_lower();var mime:String={"png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg","webp":"image/webp"}.get(extension,"")
		if mime.is_empty():finish(current,[],"请选择PNG、JPEG或WebP文件。");return
		if not normalize_one(current,bytes,mime):return
	finish(current,pending.duplicate(),"")
func _web_event(args:Array)->void:
	if args.size()<2 or int(args[1])!=token:return
	var current:=int(args[1]);var kind:=str(args[0])
	if kind=="image":
		if args.size()!=4 or not bridge.is_js_buffer(args[2]):finish(current,[],"浏览器未交付完整图片。");token+=1;return
		normalize_one(current,bridge.js_buffer_to_packed_byte_array(args[2]),str(args[3]))
	elif kind=="done":finish(current,pending.duplicate(),"")
	elif kind=="cancel":finish(current,[],"")
	elif kind=="error":finish(current,[],str(args[2]) if args.size()>2 else "图片读取失败。")

func export_bytes(bytes:PackedByteArray,filename:String,mime:String)->int:
	cancel();var current:=token
	if bytes.is_empty():exported.emit(current,false,"导出内容为空，未写入文件。");return current
	if not filename in ["kuangye-work.png","kuangye-album.html"]:exported.emit(current,false,"导出文件名无法识别。");return current
	if bridge!=null:
		bridge.download_buffer(bytes,filename,mime)
		exported.emit(current,true,"已请求浏览器下载，请在下载列表确认文件。")
	else:
		dialog=FileDialog.new();dialog.file_mode=FileDialog.FILE_MODE_SAVE_FILE;dialog.access=FileDialog.ACCESS_FILESYSTEM
		dialog.filters=PackedStringArray(["*.png ; PNG作品选页"] if filename.ends_with(".png") else ["*.html ; 离线HTML作品集"])
		dialog.current_file=filename;dialog.deleting_enabled=false;dialog.folder_creation_enabled=false;dialog.overwrite_warning_enabled=true
		dialog.favorites_enabled=false;dialog.recent_list_enabled=false;dialog.use_native_dialog=true;add_child(dialog)
		dialog.file_selected.connect(func(path):save_selected_path(current,path,bytes,filename.get_extension()))
		dialog.canceled.connect(func():
			if current==token:exported.emit(current,false,"已取消导出，作品仍保留。"))
		dialog.popup_centered_clamped(Vector2i(700,520),.9)
	return current
func save_selected_path(current:int,path:String,bytes:PackedByteArray,extension:String)->void:
	if current!=token:return
	if not extension in ["png","html"] or path.get_extension().to_lower()!=extension:
		exported.emit(current,false,"文件后缀需为 ."+extension+"，未写入文件。");return
	var temporary:=path+".kuangye-"+str(OS.get_process_id())+"-"+str(Time.get_ticks_usec())+".tmp"
	if FileAccess.file_exists(temporary):exported.emit(current,false,"临时文件名已存在，未写入。请重试。");return
	var file:=FileAccess.open(temporary,FileAccess.WRITE)
	if file==null:exported.emit(current,false,"导出文件无法写入，作品仍在本机。请换一个保存位置。");return
	var written:=file.store_buffer(bytes);file.flush();var error:=file.get_error();file.close()
	if not written or error!=OK or not Bytes.matches(temporary,bytes) or DirAccess.rename_absolute(temporary,path)!=OK:
		var cleaned:=DirAccess.remove_absolute(temporary)==OK
		exported.emit(current,false,"文件没有完整保存，旧文件未替换。请换一个位置重试。" if cleaned else "导出失败，临时副本未能清理。请在所选目录检查 .kuangye 临时文件，作品原记录仍保留。")
		return
	if is_instance_valid(dialog):dialog.queue_free();dialog=null
	exported.emit(current,true,"文件已保存；作品原记录仍在本机。")
