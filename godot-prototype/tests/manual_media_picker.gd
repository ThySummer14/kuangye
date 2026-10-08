extends SceneTree
const Scene=preload("res://main.tscn")
const Fixtures=preload("res://tests/studio_image_fixtures.gd")
var app:Control
var events:Array=[]
var end_at:=0
var work_id:=""
var capturing:=false
func _process(_delta:float)->bool:
	if end_at>0 and Time.get_ticks_msec()>end_at:quit()
	if is_instance_valid(app) and not work_id.is_empty() and not capturing and app.state.creative.work(work_id).images.size()>0:
		capturing=true;call_deferred("capture_success",work_id)
	return false
func _initialize()->void:call_deferred("run")
func write_fixture(name:String,bytes:PackedByteArray)->void:
	var f:=FileAccess.open("res://artifacts/picker_inputs/"+name,FileAccess.WRITE);f.store_buffer(bytes);f.close()
func record(kind:String,data:Dictionary)->void:
	events.append({"kind":kind,"data":data,"at_ms":Time.get_ticks_msec()})
	var f:=FileAccess.open("res://artifacts/manual-media-events.json",FileAccess.WRITE);f.store_string(JSON.stringify(events,"\t"));f.close()
func run()->void:
	DirAccess.make_dir_recursive_absolute("res://artifacts/picker_inputs")
	end_at=Time.get_ticks_msec()+90000
	write_fixture("qa-colors.png",Fixtures.corners().save_png_to_buffer());write_fixture("qa-transparent.png",Fixtures.transparent());write_fixture("qa-oriented.jpg",Fixtures.jpeg_exif(6));write_fixture("qa-webp.webp",Fixtures.corners(200,320).save_webp_to_buffer())
	app=Scene.instantiate();app.fixture_mode=true;root.add_child(app);await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(1000,800);root.position=Vector2i(160,60)
	app.state.path="user://manual-media-fixture.json"
	var id:String=app.state.creative.start_direct_work("本地图片选择测试","保留自己选的图。","2026-10-08");work_id=id;app.creative_panel.edit_work(id)
	app.creative_panel.file_io.child_entered_tree.connect(func(node):
		if node is FileDialog:node.current_dir=ProjectSettings.globalize_path("res://artifacts/picker_inputs"))
	app.creative_panel.file_io.imported.connect(func(_token,copies,error):
		record("chooser_result",{"count":copies.size(),"error":error})
		if not copies.is_empty():call_deferred("save_through_ui"))
	app.creative_panel.file_io.exported.connect(func(_token,ok,message):record("export_result",{"ok":ok,"message":message}))
	record("started",{"size":str(root.size),"fixture_only":true})
	await process_frame;await process_frame
	app.note_body_scroll.scroll_vertical=100000
	for button in app.modal.find_children("*","Button",true,false):
		if button.text=="选择本地图片":button.pressed.emit();break
	await create_timer(90).timeout
	record("end",{"saved_images":app.state.creative.work(id).images.size(),"draft_images":app.creative_panel.draft_images(id).size()})
	quit()

func capture_success(id:String)->void:
	await process_frame;await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/manual-picker-success.png")
	var reopened=preload("res://scripts/state.gd").new();reopened.path=app.state.path;var loaded:bool=reopened.load_data()
	record("actual_selection_and_save",{"draft_count":app.creative_panel.draft_images(id).size(),"saved_count":app.state.creative.work(id).images.size(),"disk_reopen_images":reopened.creative.work(id).get("images",[]).size() if loaded else 0,"byte_match":loaded and reopened.creative.work(id).images==app.state.creative.work(id).images})
	quit()

func save_through_ui()->void:
	for button in app.modal.find_children("*","Button",true,false):
		if button.text=="保存这一版":button.pressed.emit();record("automated_save_button",{});return
