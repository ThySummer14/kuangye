extends RefCounted

const Export=preload("res://scripts/studio_export.gd")
const ExportPage=preload("res://scripts/studio_export_page.gd")
const Images=preload("res://scripts/studio_images.gd")
const Files=preload("res://scripts/studio_files.gd")
var file_io:StudioFiles
var media_request:Dictionary={}
var media_status:Label
var app:Control
var drafts:Dictionary={}
var fields:Dictionary={}
var primary:Button

func _init(owner:Control) -> void:
	app=owner;file_io=Files.new();app.add_child(file_io);file_io.imported.connect(receive_images);file_io.exported.connect(export_result)
func cancel_media()->void:
	media_request.clear()
	if is_instance_valid(file_io):file_io.cancel()
func today() -> String:return Time.get_date_string_from_system()
func model():return app.state.creative

func body(title:String) -> VBoxContainer:
	var v:VBoxContainer=app.make_modal(title,620.0,630.0)
	var scroll:=ScrollContainer.new()
	scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus=true
	app.note_body_scroll=scroll
	v.add_child(scroll)
	var content:=VBoxContainer.new()
	content.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",10)
	scroll.add_child(content)
	fields={}
	primary=null
	app.layout_ui()
	return content

func prose(v:VBoxContainer,text:String,small:=false) -> void:
	var line:Label=app.label(text,13 if small else 16,"bac7b4" if small else "eee2cb")
	line.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	v.add_child(line)

func action(v:VBoxContainer,text:String,callback:Callable) -> Button:
	var b:Button=app.button(text,callback)
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	v.add_child(b)
	return b

func confirm(text:String,callback:Callable) -> void:
	primary=action(app.modal.get_child(0),text,callback)
	var style:StyleBoxFlat=app.panel_style("d3c09a",10)
	primary.add_theme_stylebox_override("normal",style)
	primary.add_theme_color_override("font_color",Color("253d34"))
	app.layout_ui()

func persisted(message:String,reaction:="happy") -> void:
	var ok:bool=app.save()
	if ok:app.mascot_feedback(reaction)
	app.world.show_creation(model().work(model().home.studio.displayId))
	app.saved_status(ok,message)

func book() -> void:
	var v:=body("观察册")
	action(v,"去画室看作品 · %d" % model().home.studio.works.size(),studio)
	if model().home.observations.entries.is_empty():prose(v,"在近处停一下，留下一处具体发现。")
	for entry in model().home.observations.entries:
		var id:String=entry.id
		action(v,("继续写 · " if entry.status=="draft" else "")+(entry.place if not entry.place.is_empty() else "新的一页"),func():observation_page(id))
	confirm("留一页观察",func():
		var id:String=model().start_observation(today())
		if id.is_empty():app.status(model().last_error);return
		persisted("新的一页已留在本机。")
		edit_observation(id))

func observation_page(id:String) -> void:
	var entry:Dictionary=model().observation(id)
	if entry.is_empty():book();return
	if entry.status=="draft":edit_observation(id);return
	var v:=body("这一页发现")
	prose(v,entry.observedOn+" · "+entry.place,true)
	prose(v,entry.body)
	if not entry.hint.is_empty():prose(v,"还想看看："+entry.hint,true)
	action(v,"修改这一页",func():edit_observation(id))
	action(v,"回到观察册",book)
	confirm("带到画室创作",func():begin_work(id))

func field(v:VBoxContainer,key:String,title:String,value:String,limit:int,multiline:=false) -> void:
	app.modal.set_meta("mascot_mood","focused")
	prose(v,title,true)
	if multiline:
		var edit:=TextEdit.new()
		edit.text=value
		edit.custom_minimum_size.y=125
		edit.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY
		edit.text_changed.connect(func():
			if edit.text.length()>limit:edit.text=edit.text.left(limit))
		v.add_child(edit);fields[key]=edit
	else:
		var edit:=LineEdit.new()
		edit.text=value
		edit.max_length=limit
		edit.custom_minimum_size.y=44
		v.add_child(edit);fields[key]=edit

func cache_fields(key:String) -> void:
	for name in fields:
		var editor:Control=fields[name]
		var callback:=func():
			if not drafts.has(key):drafts[key]={}
			drafts[key][name]=editor.text
		if editor is LineEdit:editor.text_changed.connect(func(_value):callback.call())
		else:editor.text_changed.connect(callback)

func edit_observation(id:String) -> void:
	var entry:Dictionary=model().observation(id)
	var v:=body("写下观察")
	var draft:Dictionary=entry.duplicate(true)
	draft.merge(drafts.get(id,{}),true)
	field(v,"place","在哪里",draft.place,100)
	field(v,"observedOn","观察日期 · YYYY-MM-DD",draft.observedOn,10)
	prose(v,"是哪一种发现",true)
	var kind:=OptionButton.new()
	for title in ["花草与树木","天空与光","路边与声音","其他发现"]:kind.add_item(title)
	kind.selected=["plant","sky","street","other"].find(draft.kind)
	kind.custom_minimum_size.y=44
	v.add_child(kind)
	kind.item_selected.connect(func(index):
		if not drafts.has(id):drafts[id]={}
		drafts[id].kind=["plant","sky","street","other"][index])
	field(v,"body","具体发现",draft.body,3000,true)
	field(v,"hint","还想看看什么 · 可不填",draft.hint,500,true)
	prose(v,"关闭后，没保存的文字会暂留本次会话。",true)
	cache_fields(id)
	var captured:=fields.duplicate()
	var store:=func(keep:bool):
		var values:Dictionary={"kind":["plant","sky","street","other"][kind.selected]}
		for key in captured:values[key]=captured[key].text
		if keep and (values.place.strip_edges().is_empty() or values.body.strip_edges().is_empty()):app.status("写下地点和一个具体发现，再收好。");return
		if not model().update_observation(id,values):app.status(model().last_error);return
		if keep and not model().keep_observation(id,today()):app.status(model().last_error);return
		drafts.erase(id);persisted("这一页已保存。")
		if keep:observation_page(id)
		else:book()
	if entry.status=="draft":action(v,"先保存草稿",func():store.call(false))
	confirm("保存修改" if entry.status=="kept" else "收进观察册",func():store.call(true))

func begin_work(id:String) -> void:
	for link in model().home.observationWorks:
		if link.observationId==id:work_page(link.workId);return
	var v:=body("从发现开始")
	prose(v,"素材保留此刻的观察。成果从空白开始。",true)
	var key:="start-"+id
	var cached:Dictionary=drafts.get(key,{})
	field(v,"title","作品叫什么",cached.get("title",""),60)
	field(v,"criterion","完成时，会留下什么",cached.get("criterion",""),240,true)
	cache_fields(key)
	var captured:=fields.duplicate()
	confirm("接下创作",func():
		var work_id:String=model().start_work(id,captured.title.text,captured.criterion.text,today())
		if work_id.is_empty():app.status(model().last_error);return
		drafts.erase(key);persisted("作品已开始，观察原页仍然保留。")
		edit_work(work_id))

func studio() -> void:
	var v:=body("我的作品集")
	prose(v,"手上进行中 %d / 3 · 作品 %d 件" % [model().busy_count(),model().home.studio.works.size()],true)
	action(v,"蚀刻章柜",app.badge_panel.cabinet)
	action(v,"从观察册开始",book)
	action(v,"新建自己的作品",begin_direct_work)
	if model().home.studio.works.any(func(w):return model().status(w)=="done"):action(v,"导出完整作品集",func():export_options(""))
	if model().home.studio.works.is_empty():prose(v,"把一页发现，做成真正属于你的一版。")
	for item in model().home.studio.works:
		var id:String=item.id
		var tag:String={"working":"在做","rest":"暂放","done":"收好"}[model().status(item)]
		action(v,tag+" · "+item.title,func():work_page(id))

func begin_direct_work()->void:
	var v:=body("自己的作品");var key:="direct-work";var cached:Dictionary=drafts.get(key,{})
	prose(v,"文字、绘画或摄影，都可以留下一版。",true)
	field(v,"title","作品叫什么",cached.get("title",""),60)
	field(v,"criterion","完成时，会留下什么",cached.get("criterion",""),240,true)
	cache_fields(key);var captured:=fields.duplicate()
	confirm("接下创作",func():
		var id:String=model().start_direct_work(captured.title.text,captured.criterion.text,today())
		if id.is_empty():app.status(model().last_error);return
		drafts.erase(key);persisted("作品已开始。")
		edit_work(id))

func image_view(v:VBoxContainer,value:String,height:=170.0)->void:
	var image:=TextureRect.new();image.texture=Images.thumbnail(value,512);image.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	image.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;image.custom_minimum_size.y=height;image.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	image.set_meta("studio_image",true);v.add_child(image)

func draft_images(id:String)->Array:
	return drafts.get(id,{}).get("images",model().work(id).get("images",[])).duplicate()

func receive_images(request_token:int,copies:Array,error:String)->void:
	if media_request.is_empty() or media_request.token!=request_token:return
	if not is_instance_valid(app.modal) or app.modal.get_instance_id()!=media_request.modal:return
	var id:String=media_request.work_id;media_request.clear()
	if not error.is_empty():media_status.text=error;return
	if copies.is_empty():media_status.text="已取消选择，图片未改变。";return
	var images:=draft_images(id);var count:=images.size()
	for copy in copies:
		if not images.has(copy):images.append(copy)
	if not model().validate_work_images(id,images):media_status.text=model().last_error;return
	if not drafts.has(id):drafts[id]={}
	drafts[id].images=images
	edit_work(id)
	media_status.text="这张图已在草稿里，无需重复添加。" if count==images.size() else "图片已加入草稿，点「保存这一版」后存到本机。"

func media_editor(v:VBoxContainer,id:String)->void:
	var images:=draft_images(id)
	prose(v,"图片 · %d / 4"%images.size(),true)
	prose(v,"保存缩小副本，原图请另留。PNG / JPEG / WebP，单张不超过20 MiB、1600万像素。",true)
	for i in images.size():
		image_view(v,images[i],120)
		var index:=i
		action(v,"移除第%d张"%(i+1),func():
			var next:=draft_images(id);next.remove_at(index)
			if not drafts.has(id):drafts[id]={}
			drafts[id].images=next;edit_work(id))
	media_status=app.label("",13,"f0c195");media_status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;v.add_child(media_status)
	var choose:=action(v,"选择本地图片",func():
		media_status.text="选择后先放入草稿，不会上传图片。"
		var current:int=file_io.choose()
		media_request={"token":current,"work_id":id,"modal":app.modal.get_instance_id()})
	choose.disabled=images.size()>=4

func save_warning(v:VBoxContainer)->void:
	if not app.unsaved_changes:return
	var warning:Label=app.label("这次变化还没存到本机，仍在本次运行中。",13,"f0c195");warning.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;v.add_child(warning)
	if app.save_locked:warning.text="原存档无法识别，已保留原文件。这次变化只留在本次运行中。"
	else:action(v,"重试保存",func():warning.text="已保存到本机。" if app.save() else "仍未写入本机，图片仍在本次运行中。")

func edit_work(id:String) -> void:
	var item:Dictionary=model().work(id)
	if item.is_empty():studio();return
	var v:=body("这一版作品")
	var draft:Dictionary=item.duplicate(true)
	draft.merge(drafts.get(id,{}),true)
	field(v,"title","作品名",draft.title,60)
	field(v,"body","你的成果 · 有图片时可不填",draft.body,12000,true)
	field(v,"note","留给自己的话 · 可不填",draft.note,240,true)
	prose(v,"关闭后，没保存的文字和图片会暂留本次会话。",true)
	cache_fields(id)
	media_editor(v,id)
	save_warning(v)
	var captured:=fields.duplicate()
	confirm("保存这一版",func():
		if not model().update_work(id,captured.title.text,captured.body.text,captured.note.text,today(),draft_images(id)):app.status(model().last_error);return
		drafts.erase(id);persisted("这一版，保存好了。")
		work_page(id))

func work_page(id:String) -> void:
	var item:Dictionary=model().work(id)
	if item.is_empty():studio();return
	var v:=body("作品")
	var work_title:Label=app.label(item.title,25)
	work_title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	v.add_child(work_title)
	save_warning(v)
	for picture in item.images:image_view(v,picture)
	if not item.body.strip_edges().is_empty():prose(v,item.body)
	elif item.images.is_empty():prose(v,"成果还空着，先留下一版文字或图片。")
	if not item.note.is_empty():prose(v,"留给自己的话："+item.note,true)
	var source:Dictionary=model().source_for(id)
	if not source.is_empty():
		prose(v,"当时的素材 · "+source.observedOn+" · "+source.place,true)
		prose(v,source.body,true)
	var secondary:=HBoxContainer.new()
	secondary.add_theme_constant_override("separation",10)
	v.add_child(secondary)
	for spec in [["编辑这一版",func():edit_work(id)],["回到作品集",studio]]:
		var link:Button=app.button(spec[0],spec[1])
		link.flat=true
		link.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		secondary.add_child(link)
	match model().status(item):
		"working":
			action(v,"先放一放",func():
				if model().rest_work(id,today()):persisted("成果已保留，随时可以继续。");work_page(id))
			confirm("确认完成",func():completion(id))
		"rest":
			confirm("接着做这一版",func():
				if model().resume_work(id,today()):persisted("已接起这一版。");edit_work(id)
				else:app.status(model().last_error))
		"done":
			action(v,"导出作品",func():export_options(id))
			var shown:bool=model().home.studio.displayId==id
			confirm("从小家收回" if shown else "陈列到小家",func():
				if model().display_work("" if shown else id):persisted("作品和记录都还在。" if shown else "小家的桌上，多了你的作品。");work_page(id))

	app.modal.set_meta("fit_content",true)
	var modal_id:int=app.modal.get_instance_id()
	v.minimum_size_changed.connect(func():
		if is_instance_valid(app.modal) and app.modal.get_instance_id()==modal_id:app.call_deferred("layout_ui"))
	app.call_deferred("layout_ui")

func completion(id:String) -> void:
	var item:Dictionary=model().work(id)
	var v:=body("收好这一版")
	prose(v,model().task_for(item).desc)
	var checked:=CheckBox.new()
	checked.text="我完成了自己写下的约定"
	checked.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	checked.custom_minimum_size.y=48
	v.add_child(checked)
	prose(v,"与随手记共用每天一次的 5 微光。",true)
	action(v,"还没完成，回去看看",func():work_page(id))
	confirm("收好作品",func():
		if not checked.button_pressed:app.status("做到时再勾选，现在也可以回去继续。");return
		if not app.state.complete_creative_work(id,today()):app.status(model().last_error);return
		persisted("你做出的这一版，收好了。","proud")
		work_page(id))

func export_options(id:String)->void:
	var v:=body("带走作品");save_warning(v)
	prose(v,"导出到你选择的位置，不会自动分享或上传。",true)
	var include_note:=CheckBox.new();include_note.text="包含留给自己的话";include_note.button_pressed=false;include_note.custom_minimum_size.y=48;v.add_child(include_note)
	prose(v,"私语默认不导出。HTML保留全部已收好作品的完整正文与图片；PNG是一件作品的首图选页。",true)
	if not id.is_empty():action(v,"生成PNG选页",func():prepare_png(id,include_note.button_pressed))
	action(v,"生成完整HTML作品集",func():
		var works:Array=model().home.studio.works.filter(func(w):return model().status(w)=="done")
		var result:=Export.album(works,include_note.button_pressed)
		if not result.ok:app.status(result.error);return
		export_ready(result.bytes,result.filename,result.mime,null,"包含私语" if include_note.button_pressed else "不包含私语"))

func prepare_png(id:String,include_note:bool)->void:
	var item:Dictionary=model().work(id)
	if item.is_empty() or model().status(item)!="done":app.status("先收好这件作品。");return
	var v:=body("正在生成选页");prose(v,"使用本机的图片副本与文字。",true)
	var modal_id:int=app.modal.get_instance_id()
	var viewport:=SubViewport.new();viewport.size=Vector2i(1200,1600);viewport.transparent_bg=false;viewport.render_target_update_mode=SubViewport.UPDATE_ONCE
	app.add_child(viewport);var page:=ExportPage.new();viewport.add_child(page);page.configure(item,include_note)
	await app.get_tree().process_frame
	await RenderingServer.frame_post_draw
	if not is_instance_valid(app.modal) or app.modal.get_instance_id()!=modal_id:viewport.queue_free();return
	var image:=viewport.get_texture().get_image();var selected:bool=page.selected_page;viewport.queue_free()
	if image==null or image.is_empty():app.status("选页没有生成，作品仍保留。请重试。");return
	var bytes:=image.save_png_to_buffer();var preview:=image.duplicate();preview.resize(300,400,Image.INTERPOLATE_LANCZOS)
	export_ready(bytes,"kuangye-work.png","image/png",ImageTexture.create_from_image(preview),("作品选页 · " if selected else "完整选页 · ")+("包含私语" if include_note else "不包含私语"))

func export_ready(bytes:PackedByteArray,filename:String,mime:String,preview:Texture2D,description:String)->void:
	var v:=body("选好后带走")
	prose(v,description,true)
	if preview!=null:
		var image:=TextureRect.new();image.texture=preview;image.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;image.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;image.custom_minimum_size.y=240;v.add_child(image)
	else:prose(v,"HTML作品集已在本机生成，可离线打开。图片为缩小副本，原图请另留。",true)
	media_status=app.label("",13,"f0c195");media_status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;v.add_child(media_status)
	confirm(("下载" if OS.has_feature("web") else "保存到文件")+("PNG选页" if filename.ends_with(".png") else "HTML作品集"),func():file_io.export_bytes(bytes,filename,mime))

func export_result(_request:int,_ok:bool,message:String)->void:
	if is_instance_valid(media_status):media_status.text=message
