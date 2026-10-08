extends SceneTree
const Scene=preload("res://main.tscn")
const State=preload("res://scripts/state.gd")
var app
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func click_text(text:String)->bool:
	for node in app.modal.find_children("*","Button",true,false):
		if node.text==text:node.pressed.emit();return true
	return false
func frame()->void:
	await process_frame;await process_frame;await create_timer(.1).timeout
func snapshot(name:String)->void:
	await frame()
	if DisplayServer.get_name()=="headless":return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/badges-"+name+".png")
func bounds()->void:
	check(app.ui_safe_rect().encloses(app.modal.get_global_rect()),"badge panel fits the actual safe rectangle")
	for node in app.modal.find_children("*","Button",true,false):
		if node.text=="×":check(app.ui_safe_rect().encloses(node.get_global_rect()) and node.size.y>=44,"badge close is visible with a full touch target")
func observe(c,place:String,day:String)->String:
	var id:String=c.start_observation(day);c.update_observation(id,{"place":place,"body":"路过这里时，记录树荫与步道的变化。"});c.keep_observation(id,day);return id
func make_work(c,title:String,text:String)->String:
	var id:String=c.start_work(observe(c,"窗边","2026-10-08"),title,"留下本次完成的文字。","2026-10-08")
	c.update_work(id,title,text,"","2026-10-08");c.complete_work(id,"2026-10-08");return id
func run()->void:
	app=Scene.instantiate();app.fixture_mode=true;root.add_child(app);await frame()
	app.state.path="user://badge-ui-fixture.json"
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(1280,720);root.position=Vector2i(30,50);await frame()
	var panel=app.badge_panel;var b=app.state.badges;var c=app.state.creative
	app.change_location("home");await frame();app.creative_panel.studio();await frame()
	check(click_text("蚀刻章柜"),"cabinet is reachable from the existing portfolio")
	await frame();bounds()
	check(root.size==Vector2i(1280,720) and app.modal.get_meta("badge_grid").columns==3,"desktop cabinet uses real 1280 by 720 and three columns")
	check(app.modal.get_meta("badge_grid").get_child_count()==18,"all eighteen original medal cards are present")
	check(app.world.hotspots.any(func(h):return h.kind=="badges"),"home's existing bookshelf has a physical cabinet interaction")
	await snapshot("desktop-cabinet-empty")
	root.size=Vector2i(375,812);app.safe_area_override=Rect2(0,24,375,766);await frame();app.layout_ui();await frame();bounds()
	check(root.size==Vector2i(375,812) and app.modal.get_meta("badge_grid").columns==2,"open cabinet reflows to two columns on portrait resize")
	await snapshot("phone-cabinet-empty")
	panel.medal_page("life-compose");await frame()
	check(not is_instance_valid(app.creative_panel.primary),"unported goal shows its condition without a claim action")
	panel.start_page("life-novel");await frame();app.close_modal()
	check(b.attempts.is_empty(),"closing acceptance leaves no attempt or occupied slot")
	panel.start_page("life-novel");await frame()
	var accept:Button=app.creative_panel.primary;accept.pressed.emit();accept.pressed.emit();await frame()
	check(b.attempts.size()==1,"repeated same-frame acceptance creates one frozen attempt")
	var novel:String=b.attempts[0].id
	var work:=make_work(c,"长篇小说完成记录","故事已经写到结尾；此处保存节选与手稿位置的说明。")
	panel.evidence_page(novel);await frame();panel.work_selector.selected=1;app.close_modal()
	check(b.find(novel).linked.workId=="","closing evidence selection does not silently link it")
	panel.evidence_page(novel);await frame();panel.work_selector.selected=1
	check(click_text("保存证据选择"),"evidence choice saves through its normal action")
	await frame();check(b.find(novel).linked.workId==work,"selected existing work is linked")
	panel.completion_page(novel);await frame();bounds()
	check(panel.confirmation_boxes.size()==1,"novel requires explicit whole-novel confirmation")
	check(click_text("确认完成并留下刻印") and b.find(novel).status=="active","blank completion leaves attempt active")
	panel.review_editor.text="整本小说已经写到结尾。原手稿另存，这里只放完成记录。";panel.review_editor.text_changed.emit()
	app.close_modal();panel.completion_page(novel);await frame()
	check(panel.review_editor.text.contains("整本小说"),"cancelled result draft remains available in the same session")
	app.keyboard_height_override=330;app.layout_ui();await frame()
	check(app.creative_panel.primary.get_global_rect().end.y<=482,"portrait confirmation stays above keyboard-height proxy")
	panel.review_editor.grab_focus();await frame()
	check(app.note_body_scroll.follow_focus,"result editor scroll follows the focused text")
	var touch:=InputEventScreenTouch.new();touch.index=7;touch.position=app.creative_panel.primary.get_global_rect().get_center();touch.pressed=true;app._input(touch)
	check(app.touch_id==-1 and app.touch_movement==Vector2.ZERO,"confirmation touch cannot start the world joystick")
	touch.pressed=false;app._input(touch)
	await snapshot("phone-confirmation-keyboard-proxy")
	root.size=Vector2i(812,375);app.safe_area_override=Rect2(16,0,780,359);app.keyboard_height_override=180;app.layout_ui();await frame()
	check(Rect2(16,0,780,195).encloses(app.creative_panel.primary.get_global_rect()),"landscape confirmation stays above keyboard-height proxy")
	check(app.note_body_scroll.size.y>=58,"landscape badge editor retains a usable text strip")
	app.keyboard_height_override=0;root.size=Vector2i(375,812);app.safe_area_override=Rect2(0,24,375,766);app.layout_ui();await frame()
	for box in panel.confirmation_boxes:box.button_pressed=true
	var complete:Button=app.creative_panel.primary;var coins:int=app.state.coins
	complete.pressed.emit();complete.pressed.emit();await frame()
	check(b.find(novel).status=="done" and app.state.coins==coins+5,"explicit completed novel records once and awards one daily light amount")
	check(b.honors().filter(func(m):return m.earned).size()==1,"one real lifetime completion unlocks exactly one medal")
	var loaded:=State.new();loaded.path=app.state.path
	check(loaded.load_data() and loaded.badges.find(novel).evidence.work.body==c.work(work).body,"UI completion survives a new disk load with frozen evidence")
	panel.medal_page("life-novel");await snapshot("phone-novel-earned")
	panel.start_page("field-study");await frame()
	check(app.status_label.text=="","new acceptance page does not retain a previous earned-medal toast")
	var options=app.modal.find_children("*","CheckBox",true,false)
	options[0].button_pressed=true;options[2].button_pressed=true
	await snapshot("phone-field-accept")
	click_text("确认接取");await frame()
	var field:String=b.attempts[-1].id;check(b.find(field).challenge.terms.size()==2,"survey freezes the two selected modifiers")
	var pages:Array=[]
	for i in 12:pages.append(observe(c,["河岸","桥边","广场"][i%3],"2026-10-07" if i<6 else "2026-10-08"))
	var report:=make_work(c,"公共步道的树荫调查",("比较三个地点在两天中树荫与行走空间的变化，标出观察依据和仍不确定的部分。\n").repeat(22))
	panel.evidence_page(field);await frame();panel.work_selector.selected=1
	for box in panel.evidence_boxes:box.button_pressed=box.get_meta("observation_id") in pages
	click_text("保存证据选择");await frame()
	check(b.find(field).linked.workId==report and b.find(field).linked.observationIds.size()==12,"UI selects exact twelve findings and the conclusion")
	panel.completion_page(field);await frame()
	check(panel.confirmation_boxes.size()==3,"survey requires base objective plus each selected modifier")
	panel.review_editor.text="比较了三处公共地点的两次观察，并写出变化和局限。"
	for box in panel.confirmation_boxes:box.button_pressed=true
	click_text("确认完成并留下刻印");await frame()
	check(b.find(field).status=="done" and b.honors().filter(func(m):return m.earned).size()==3,"qualifying survey unlocks only breach and resolve alongside the novel medal")
	check(app.state.coins==coins+5,"second same-day completion does not duplicate the daily reward")
	panel.cabinet();await snapshot("phone-cabinet-earned")
	root.size=Vector2i(1280,720);app.safe_area_override=Rect2();await frame();app.layout_ui();await frame();bounds()
	await snapshot("desktop-cabinet-earned")
	panel.record_page(field);await snapshot("desktop-frozen-record")
	app.close_modal();check(root.gui_get_focus_owner()==null,"closing the result flow releases text focus")
	check(loaded.load_data() and loaded.badges.honors().filter(func(m):return m.earned).size()==3,"all three genuine medal states survive reopening")
	# A failed disk write must remain visible inside the modal, where world UI is hidden.
	var retry_attempt:String=b.start("field-study",[],c,"2026-10-08")
	var retry_work:=make_work(c,"另一份调查结论","新的观察结论。".repeat(110))
	b.link_evidence(retry_attempt,retry_work,pages,c);app.save()
	var normal_path:String=app.state.path;app.state.path="user://missing-badge-directory/failed.json"
	panel.completion_page(retry_attempt);await frame();panel.review_editor.text="另一个真实问题的调查结论，重新整理后完成。"
	for box in panel.confirmation_boxes:box.button_pressed=true
	click_text("确认完成并留下刻印");await frame()
	check(app.unsaved_changes and b.find(retry_attempt).status=="done","failed write retains one in-memory completion for retry")
	check(app.modal.find_children("*","Label",true,false).any(func(label):return label.get_meta("badge_save_warning",false)),"save failure remains visible inside the current badge panel")
	check(b.attempts.filter(func(a):return a.status=="done").size()==3 and app.state.coins==coins+5,"failed save does not duplicate completion or daily reward")
	app.state.path=normal_path;check(click_text("重试保存") and not app.unsaved_changes,"modal retry writes the retained state without completing again")
	check(loaded.load_data() and loaded.badges.attempts.filter(func(a):return a.status=="done").size()==3 and loaded.coins==coins+5,"successful retry reopens with exactly the retained records and currency")
	var f:=FileAccess.open("res://artifacts/badge-ui-results.json",FileAccess.WRITE)
	f.store_string(JSON.stringify({"passed":passed,"failed":failed,"native":DisplayServer.get_name()!="headless","physical_keyboard":false},"\t"));f.close()
	print("BADGE UI ",passed," passed, ",failed," failed");quit(0 if failed==0 else 1)
