extends SceneTree
const Scene=preload("res://main.tscn")
const State=preload("res://scripts/state.gd")
const Fixtures=preload("res://tests/studio_image_fixtures.gd")
const Images=preload("res://scripts/studio_images.gd")
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,message:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+message)
func click(app,text:String)->bool:
	for b in app.modal.find_children("*","Button",true,false):
		if b.text==text:b.pressed.emit();return true
	return false
func selected(panel,id:String,paths:PackedStringArray)->void:
	panel.file_io.cancel()
	panel.media_request={"token":panel.file_io.token,"work_id":id,"modal":panel.app.modal.get_instance_id()}
	panel.file_io.read_selected_paths(panel.file_io.token,paths)
func write_file(path:String,bytes:PackedByteArray)->void:
	var f:=FileAccess.open(path,FileAccess.WRITE);f.store_buffer(bytes);f.close()
func snap(name:String)->void:
	if DisplayServer.get_name()=="headless":return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/"+name+".png")
func run()->void:
	var good:="user://original-colors.png";var second:="user://original-transparency.png";var bad:="user://disguised-html.png"
	write_file(good,Fixtures.corners().save_png_to_buffer());write_file(second,Fixtures.transparent());write_file(bad,"<html><script>bad()</script></html>".to_utf8_buffer())
	root.size=Vector2i(375,812)
	var app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(375,812);root.position=Vector2i(20,40)
	app.state.path="user://studio-media-ui-fixture.json";var panel=app.creative_panel
	panel.studio();check(click(app,"新建自己的作品"),"portfolio has a direct-art entry without a new HUD button")
	await process_frame
	panel.fields.title.text="窗边的四色习作";panel.fields.criterion.text="从一天的光里选出四种颜色。"
	check(click(app,"接下创作"),"direct work can be started with title and agreement")
	await process_frame
	var id:String=app.state.creative.home.studio.works[0].id
	check(app.state.creative.home.observations.entries.is_empty(),"UI did not fabricate a source observation")
	panel.fields.note.text="这是不默认导出的测试私语。";panel.fields.note.text_changed.emit()
	selected(panel,id,PackedStringArray([good]));await process_frame;await process_frame
	check(panel.draft_images(id).size()==1 and app.state.creative.work(id).images.is_empty(),"selected image stays in draft until explicit save")
	check(panel.fields.note.text=="这是不默认导出的测试私语。","image redraw preserves unsaved text")
	check(app.modal.find_children("*","TextureRect",true,false).filter(func(n):return n.has_meta("studio_image")).size()==1,"draft renders one bounded thumbnail")
	selected(panel,id,PackedStringArray([good]));await process_frame
	check(panel.draft_images(id).size()==1 and panel.media_status.text.contains("无需重复"),"reimporting same image is deduplicated without second slot")
	selected(panel,id,PackedStringArray([second,bad]));await process_frame
	check(panel.draft_images(id).size()==1 and not panel.media_status.text.is_empty(),"bad file rolls back whole selected batch")
	app.close_modal();await process_frame
	check(app.state.creative.work(id).images.is_empty(),"closing editor does not persist draft pictures")
	panel.edit_work(id);await process_frame
	check(panel.draft_images(id).size()==1,"picture draft remains in current session when reopened")
	check(click(app,"移除第1张") and panel.draft_images(id).is_empty(),"remove affects candidate images only")
	selected(panel,id,PackedStringArray([good,second]));await process_frame
	check(panel.draft_images(id).size()==2,"two original pictures can be added together")
	var two_pictures:Array=panel.draft_images(id)
	panel.drafts[id].images=two_pictures+[Images.normalize(Fixtures.jpeg_exif(6)).data,Images.normalize(Fixtures.corners(200,320).save_png_to_buffer()).data]
	panel.edit_work(id);await process_frame
	check(panel.draft_images(id).size()==4,"four-picture draft remains available in one editor")
	for scenario in [{"size":Vector2i(375,812),"keyboard":330.0,"safe":Rect2(0,24,375,766)},{"size":Vector2i(812,375),"keyboard":180.0,"safe":Rect2(0,0,812,375)}]:
		root.size=scenario.size;app.keyboard_height_override=scenario.keyboard;app.safe_area_override=scenario.safe;panel.edit_work(id)
		await process_frame;await process_frame;app.layout_ui()
		var usable:Rect2=scenario.safe;usable.size.y=minf(usable.end.y,scenario.size.y-scenario.keyboard)-usable.position.y
		check(usable.encloses(panel.primary.get_global_rect()),"image editor save remains above keyboard proxy "+str(scenario.size))
		var close_found:=false
		for b in app.modal.find_children("*","Button",true,false):
			if b.text=="×":close_found=usable.encloses(b.get_global_rect())
		check(close_found and app.note_body_scroll.follow_focus,"close and focused-field scrolling survive image gallery "+str(scenario.size))
	panel.drafts[id].images=two_pictures
	root.size=Vector2i(375,812);app.keyboard_height_override=0;app.safe_area_override=Rect2();panel.edit_work(id);await process_frame;await process_frame
	check(root.size==Vector2i(375,812),"actual portrait root is 375 by 812")
	await snap("media-editor-portrait")
	var late_token:int=panel.file_io.token;panel.media_request={"token":late_token,"work_id":id,"modal":app.modal.get_instance_id()}
	var before:Array=panel.draft_images(id);panel.studio();panel.receive_images(late_token,[Images.normalize(Fixtures.transparent()).data],"")
	check(panel.draft_images(id)==before,"late result cannot change a closed editor or another page")
	panel.edit_work(id);await process_frame
	check(click(app,"保存这一版"),"explicit save commits draft pictures")
	await process_frame
	var reopened:=State.new();reopened.path=app.state.path
	check(reopened.load_data() and reopened.creative.work(id).images.size()==2 and reopened.creative.work(id).images==before,"reopen reads complete image bytes without original path")
	check(click(app,"确认完成"),"image-only result opens existing completion confirmation")
	await process_frame
	for box in app.modal.find_children("*","CheckBox",true,false):box.button_pressed=true
	check(click(app,"收好作品") and app.state.creative.done.size()==1,"explicit agreement completes image-only artwork once")
	await process_frame;await process_frame
	await snap("media-work-portrait")
	check(click(app,"陈列到小家"),"image work uses existing home display action")
	await process_frame
	app.close_modal();app.change_location("home");await process_frame;await process_frame
	var shown=app.world.get_node_or_null("DisplayedCreation")
	check(shown!=null and shown.get_children().any(func(n):return n is MeshInstance3D and n.material_override!=null and n.material_override.albedo_texture!=null),"real desk object displays the first picture texture")
	await snap("media-home-portrait")
	panel.edit_work(id);await process_frame;var count:int=app.state.coins;var normal_path:String=app.state.path;app.state.path="user://absent-media-ui-folder/save.json"
	panel.fields.body.text="保存失败仍可重试的补记。"
	click(app,"保存这一版");await process_frame
	check(app.unsaved_changes and app.state.creative.work(id).images.size()==2 and app.state.coins==count,"write failure retains pictures and cannot award again")
	var retry:=false
	for b in app.modal.find_children("*","Button",true,false):
		if b.text=="重试保存":retry=true
	check(retry,"failed save exposes a panel-local retry")
	app.state.path=normal_path;check(click(app,"重试保存") and not app.unsaved_changes,"retry persists retained image state")
	root.size=Vector2i(1280,720);panel.work_page(id);await process_frame;await process_frame
	check(root.size==Vector2i(1280,720),"actual desktop root is 1280 by 720")
	await snap("media-work-desktop")
	var f:=FileAccess.open("res://artifacts/studio-media-ui-results.json",FileAccess.WRITE);f.store_string(JSON.stringify({"passed":passed,"failed":failed,"native_graphics":DisplayServer.get_name()!="headless","physical_phone":false,"file_chooser_clicked":false},"\t"));f.close()
	print("STUDIO MEDIA UI ",passed," passed, ",failed," failed");quit(0 if failed==0 else 1)
