extends SceneTree
const Scene=preload("res://main.tscn")
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func run()->void:
	var app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(375,812);root.position=Vector2i(30,50)
	app.safe_area_override=Rect2(0,24,375,766);app.change_location("home")
	await process_frame;await process_frame
	check(app.navigate_to(Vector3(-3.45,0,-0.85)),"bookshelf interaction has a path from the room entrance")
	app.queued_interaction="medal-shelf"
	var limit:=Time.get_ticks_msec()+3500
	while not is_instance_valid(app.modal) and Time.get_ticks_msec()<limit:await process_frame
	check(is_instance_valid(app.modal) and app.modal.has_meta("badge_grid") and app.player.position.y>-0.1,"physical navigation reaches the bookshelf and opens the cabinet")
	app.close_modal()
	app.status("完成记录已收好，章柜新增1枚刻印。")
	app.badge_panel.start_page("field-study")
	await create_timer(.25).timeout
	var options=app.modal.find_children("*","CheckBox",true,false)
	options[0].button_pressed=true;options[2].button_pressed=true
	await process_frame;await process_frame
	check(root.size==Vector2i(375,812),"notice regression uses actual portrait root size")
	check(app.status_label.text=="","previous success notice is absent from the next acceptance page")
	check(app.state.badges.attempts.is_empty() and app.state.badges.honors().all(func(m):return not m.earned),"previewing modifiers does not accept or award a medal")
	check(app.ui_safe_rect().encloses(app.modal.get_global_rect()),"acceptance panel remains inside safe area")
	if DisplayServer.get_name()!="headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("res://artifacts/badges-phone-field-accept-clean.png")
	app.unsaved_changes=true;app.status("尚未保存")
	app.badge_panel.start_page("field-study");await process_frame;await process_frame
	check(app.status_label.text=="尚未保存" and app.unsaved_changes,"opening another modal does not clear actual unsaved state")
	check(app.modal.find_children("*","Label",true,false).any(func(n):return n.get_meta("badge_save_warning",false)),"unsaved warning remains readable inside the badge page")
	check(app.modal.find_children("*","Button",true,false).any(func(n):return n.text=="重试保存"),"unsaved badge page retains its retry action")
	print("BADGE NOTICE ",passed," passed, ",failed," failed")
	quit(0 if failed==0 else 1)
