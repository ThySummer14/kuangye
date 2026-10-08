extends SceneTree
const State=preload("res://scripts/state.gd")
const Scene=preload("res://main.tscn")
var app
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func snapshot(name:String)->void:
	await create_timer(.18).timeout
	await process_frame;await process_frame
	if DisplayServer.get_name()=="headless":return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/"+name+".png")
func panel_check()->void:
	var safe:Rect2=app.ui_safe_rect()
	var rect:Rect2=app.modal.get_global_rect()
	check(safe.encloses(rect),"dialog stays inside device safe area")
	check(absf(rect.get_center().x-safe.get_center().x)<1,"dialog centers on available width")
	check(not app.joystick_base.visible and not app.note_button.visible,"world controls are hidden during modal work")
	for b in app.modal.find_children("*","Button",true,false):
		if b.text=="×":
			print("CLOSE ",b.get_global_rect()," visible=",b.is_visible_in_tree())
			check(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and safe.encloses(b.get_global_rect()),"close control remains visible with a full touch target")
func activate(text:String)->bool:
	for b in app.modal.find_children("*","Button",true,false):
		if b.text==text:
			b.pressed.emit()
			return true
	return false
func run()->void:
	app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(1280,720);root.position=Vector2i(30,50)
	await create_timer(.3).timeout
	app.state.path="user://ui-layout-fixture.json"
	var c=app.state.creative
	var id:String=c.start_observation("2026-10-08")
	c.update_observation(id,{"place":"河边的傍晚","body":"桥下的倒影被一只飞过的鸟划开。"});c.keep_observation(id,"2026-10-08")
	var work:String=c.start_work(id,"一只鸟经过","写出一段关于河边倒影的短文。","2026-10-08")
	c.update_work(work,"一只鸟经过","倒影本来是一整块天空。\n一只鸟经过，把水面轻轻翻开。\n等它飞远，河又把晚霞收好了。","下次试着把这一幕画下来。","2026-10-08")
	c.complete_work(work,"2026-10-08")
	app.change_location("home");await create_timer(.3).timeout
	await snapshot("ui-desktop-world")
	app.creative_panel.work_page(work);await process_frame;await process_frame
	panel_check();check(root.size==Vector2i(1280,720),"desktop root is actual 1280 by 720")
	check(app.modal.size.y<=576,"desktop reading panel is below 80 percent viewport height")
	check(app.modal.size.y<520,"short content uses a compact reading panel")
	await snapshot("ui-desktop-work")
	app.close_modal();root.size=Vector2i(375,812);app.safe_area_override=Rect2(0,24,375,766)
	await process_frame;await process_frame
	app.creative_panel.work_page(work);await process_frame;await process_frame
	panel_check();check(root.size==Vector2i(375,812),"portrait root is actual 375 by 812")
	await snapshot("ui-phone-work")
	app.creative_panel.edit_work(work);await process_frame;await process_frame
	panel_check();await snapshot("ui-phone-editor")
	app.keyboard_height_override=330;app.layout_ui();await process_frame;await process_frame
	var primary:Rect2=app.creative_panel.primary.get_global_rect()
	check(primary.end.y<=root.size.y-330,"fixed confirm remains above keyboard height proxy")
	check(app.note_body_scroll.follow_focus,"editor content scrolls with focused text field")
	await snapshot("ui-phone-keyboard-proxy")
	var original:String=c.work(work).body
	app.creative_panel.fields.body.text="暂未保存的另一版"
	app.creative_panel.fields.body.text_changed.emit()
	app.creative_panel.fields.body.grab_focus()
	check(activate("×"),"fixed close is connected in keyboard-height layout")
	await process_frame
	check(not is_instance_valid(app.modal) and root.gui_get_focus_owner()==null,"closing editor releases modal and text focus")
	check(c.work(work).body==original,"close does not silently save edited work")
	app.creative_panel.edit_work(work);await process_frame;await process_frame
	check(app.creative_panel.fields.body.text=="暂未保存的另一版","unsaved edit survives same-session reopen")
	app.creative_panel.fields.body.text=" "
	check(activate("保存这一版") and c.work(work).body==original,"blank completed work is rejected without replacing saved text")
	app.creative_panel.fields.body.text=original+"\n这一次，我记住了水的颜色。"
	check(activate("保存这一版"),"fixed primary action saves the edited work")
	await process_frame;await process_frame
	var recovered:=State.new();recovered.path=app.state.path
	check(recovered.load_data() and recovered.creative.work(work).body==c.work(work).body,"confirmed body survives a fresh disk load")
	app.close_modal();root.size=Vector2i(812,375);app.safe_area_override=Rect2(16,0,780,359);app.keyboard_height_override=180
	app.creative_panel.edit_work(work);app.layout_ui();await process_frame;await process_frame
	var available:=Rect2(16,0,780,195)
	check(root.size==Vector2i(812,375),"low-height root is actual 812 by 375")
	check(available.encloses(app.creative_panel.primary.get_global_rect()),"landscape confirmation remains above keyboard proxy and in safe width")
	for b in app.modal.find_children("*","Button",true,false):
		if b.text=="×":check(available.encloses(b.get_global_rect()),"landscape close remains above keyboard proxy")
	check(app.note_body_scroll.size.y>=58,"landscape keyboard proxy retains a usable body strip")
	app.creative_panel.fields.body.grab_focus();await process_frame;await process_frame
	check(app.note_body_scroll.get_global_rect().intersection(app.creative_panel.fields.body.get_global_rect()).size.y>=44,"focused text body remains visible above keyboard proxy")
	await snapshot("ui-landscape-keyboard-proxy")
	app.close_modal();root.size=Vector2i(1280,720);app.safe_area_override=Rect2();app.keyboard_height_override=0
	c.update_work(work,c.work(work).title,original.repeat(25),c.work(work).note,"2026-10-08")
	app.creative_panel.work_page(work);await process_frame;await process_frame;await create_timer(.15).timeout
	check(app.modal.size.y<=576,"long desktop reading stays within 80 percent height")
	check(app.note_body_scroll.get_v_scroll_bar().max_value>app.note_body_scroll.size.y,"long content scrolls instead of growing beyond viewport")
	check(app.modal.get_global_rect().encloses(app.creative_panel.primary.get_global_rect()),"long reading keeps primary outside scrolling content")
	await snapshot("ui-desktop-long-work")
	c.update_work(work,c.work(work).title,original,c.work(work).note,"2026-10-08")
	app.close_modal();root.size=Vector2i(375,812);app.safe_area_override=Rect2(0,24,375,766)
	app.keyboard_height_override=0;app.close_modal();app.show_note();await process_frame;await process_frame
	panel_check();await snapshot("ui-phone-note")
	app.close_modal();app.change_location("shop");await create_timer(.3).timeout
	app.show_shop();await process_frame;await process_frame
	panel_check();await snapshot("ui-phone-shop")
	app.close_modal();app.change_location("home");await create_timer(.3).timeout
	app.toggle_build();await process_frame;await process_frame
	check(app.build_bar.visible and not app.note_button.visible and not app.joystick_base.visible,"building mode keeps only its editing tools")
	await snapshot("ui-phone-build")
	var f:=FileAccess.open("res://artifacts/ui-layout-results.json",FileAccess.WRITE)
	f.store_string(JSON.stringify({"passed":passed,"failed":failed,"native":DisplayServer.get_name()!="headless","actual_mobile_keyboard":false,"stage":"v7.2 responsive interface validation"},"\t"));f.close()
	print("UI LAYOUT ",passed," passed, ",failed," failed")
	quit(0 if failed==0 else 1)
