# Component integration fixture. This scene is excluded from the production export.
extends Node
const Scene=preload("res://main.tscn")
const State=preload("res://scripts/state.gd")
var app:Control
var bridge:Object
var callback:Variant
var work_id:=""
func _ready()->void:call_deferred("begin")
func report(kind:String,data:Dictionary)->void:
	var json:=JSON.stringify({"kind":kind,"data":data})
	print("MEDIA_QA "+json)
	if bridge!=null:bridge.get_interface("window").kuangyeQAReport(json)
func begin()->void:
	bridge=Engine.get_singleton("JavaScriptBridge") if Engine.has_singleton("JavaScriptBridge") else null
	if bridge!=null:
		bridge.eval("""window.kuangyeQAReport=(text)=>{const e=document.getElementById('qa-result');if(e)e.textContent=text;console.log('MEDIA_QA '+text)};""",true)
	app=Scene.instantiate();app.fixture_mode=true;add_child(app)
	await get_tree().process_frame;await get_tree().process_frame
	app.state.path="user://web-media-fixture.json"
	var reopened:bool=app.state.load_data()
	if app.state.creative.home.studio.works.is_empty():
		work_id=app.state.creative.start_direct_work("原创四色习作","留一张颜色习作。","2026-10-08")
		app.state.creative.update_work(work_id,"原创四色习作","这是一份本地浏览器测试，含 <script> 字面文字。","PRIVATE_QA_NOTE_DEFAULT_OFF","2026-10-08")
	else:work_id=app.state.creative.home.studio.works[0].id
	app.creative_panel.edit_work(work_id)
	app.creative_panel.file_io.imported.connect(func(_token,copies,error):
		report("chooser",{"count":copies.size(),"error":error})
		if not copies.is_empty():call_deferred("save_and_finish"))
	app.creative_panel.file_io.exported.connect(func(_token,ok,message):report("download_request",{"ok":ok,"message":message}))
	if bridge!=null:
		callback=bridge.create_callback(command)
		bridge.get_interface("window").kuangyeQACommand=callback
	report("ready",{"reopened":reopened,"images":app.state.creative.work(work_id).images.size(),"fixture_only":true})
func press(text:String)->bool:
	for button in app.modal.find_children("*","Button",true,false):
		if button.text==text:button.pressed.emit();return true
	return false
func save_and_finish()->void:
	press("保存这一版")
	if app.state.creative.status(app.state.creative.work(work_id))=="working":app.state.complete_creative_work(work_id,"2026-10-08");app.save()
	var copy:=State.new();copy.path=app.state.path;var ok:bool=copy.load_data()
	report("saved",{"images":app.state.creative.work(work_id).images.size(),"byte_match":ok and copy.creative.work(work_id).images==app.state.creative.work(work_id).images,"unsaved":app.unsaved_changes})
func command(args:Array)->void:
	if args.size()!=1:return
	match str(args[0]):
		"choose":
			app.creative_panel.edit_work(work_id);press("选择本地图片")
		"html":
			app.creative_panel.export_options(work_id);press("生成完整HTML作品集");press("下载HTML作品集")
		"png":app.creative_panel.export_options(work_id);press("生成PNG选页")
		"download_png":
			if not press("下载PNG选页"):report("png_not_ready",{})
		"show":app.creative_panel.work_page(work_id)
