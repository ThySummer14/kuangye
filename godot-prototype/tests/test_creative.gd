extends SceneTree
const State=preload("res://scripts/state.gd")
const Creative=preload("res://scripts/creative.gd")
const Scene=preload("res://main.tscn")
var passed:=0
var failed:=0
func check(ok:bool,message:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+message)
func _initialize()->void:call_deferred("run")
func fixture_observation(c,at:="2026-10-08")->String:
	var id:String=c.start_observation(at)
	c.update_observation(id,{"place":"桥边","body":"同一阵风吹过，叶子先亮后暗。","kind":"plant","hint":"明天再看看。"})
	c.keep_observation(id,at)
	return id
func emit_button(app,text:String)->bool:
	for b in app.modal.find_children("*","Button",true,false):
		if b.text==text:b.pressed.emit();return true
	return false
func snap(name:String)->void:
	if DisplayServer.get_name()=="headless":return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/"+name+".png")
func run()->void:
	var state:=State.new();var c=state.creative
	check(c.start_observation("2026-02-30").is_empty(),"invalid real date rejected")
	var draft:String=c.start_observation("2026-10-08")
	check(c.start_observation("2026-10-08")==draft,"one draft reused")
	check(not c.keep_observation(draft,"2026-10-08"),"blank observation cannot be kept")
	check(not c.update_observation(draft,{"body":"x".repeat(3001)}),"oversized observation rejected without truncation")
	var id:=fixture_observation(c)
	check(c.observation(id).status=="kept" and c.observation(id).hint=="明天再看看。","complete observation fields retained")
	check(c.start_work(id,"","约定","2026-10-08").is_empty(),"blank work title rejected")
	var work:String=c.start_work(id,"风把叶子翻了一页","写成一段能留下的文字。","2026-10-08")
	check(not work.is_empty() and c.work(work).body=="","source is separate from blank creative output")
	check(c.start_work(id,"different","different","2026-10-08")==work and c.active.size()==1,"repeat start returns original work without duplicate task")
	c.update_observation(id,{"body":"后来又看见新的变化。"})
	check(c.source_for(work).body=="同一阵风吹过，叶子先亮后暗。","source snapshot survives later observation edit")
	check(not c.update_observation(id,{"place":" "}),"kept observation cannot lose required place")
	check(not state.complete_creative_work(work,"2026-10-08"),"blank work cannot complete")
	check(not c.display_work(work),"unfinished work cannot be displayed")
	check(c.update_work(work,"风把叶子翻了一页","风先走过水面，再把树梢翻成浅绿。","只给自己看。","2026-10-08"),"title body private note saved")
	check(c.rest_work(work,"2026-10-08") and c.status(c.work(work))=="rest","rest preserves result and frees active slot")
	check(c.resume_work(work,"2026-10-08") and c.work(work).taskIds.size()==2,"resume retains old task history")
	state.add_note("生活里的另一点发现","2026-10-08")
	var before:int=state.coins
	check(state.complete_creative_work(work,"2026-10-08") and state.coins==before,"completion shares already-rewarded daily light budget")
	check(not state.complete_creative_work(work,"2026-10-09") and state.coins==before,"repeat completion never pays a later day")
	check(not c.update_work(work,"标题"," ","","2026-10-08"),"completed work cannot become blank")
	check(c.display_work(work),"completed work displayed")
	var raw:Dictionary=c.serialize().duplicate(true);var recovered:=Creative.new()
	check(recovered.load_data(raw) and recovered.serialize()==raw,"all creative fields round-trip exactly")
	var bad:Dictionary=raw.duplicate(true);bad.home.observationWorks[0].workId="missing"
	check(not recovered.load_data(bad) and recovered.serialize()==raw,"invalid link rejects candidate atomically")
	bad=raw.duplicate(true);bad.home.studio.works[0].images=["future-image"]
	check(not recovered.load_data(bad),"unsupported image data protected rather than silently dropped")
	bad=raw.duplicate(true);bad.next_id=1
	check(not recovered.load_data(bad),"ID counter cannot reuse existing identities")
	for n in 3:c.start_work(fixture_observation(c),"作品"+str(n),"写一句话。","2026-10-08")
	check(c.active.size()==3 and c.start_work(fixture_observation(c),"第四件","写一句话。","2026-10-08").is_empty(),"three active works limit enforced")
	state.path="user://creative-roundtrip.json"
	check(state.save_data(),"full prototype save succeeds")
	var loaded:=State.new();loaded.path=state.path
	check(loaded.load_data() and loaded.serialize()==state.serialize(),"furniture notes economy and creative data survive reopening")
	var old:Dictionary=state.serialize().duplicate(true);old.version=1;old.erase("creative")
	var f:=FileAccess.open(state.path,FileAccess.WRITE);f.store_string(JSON.stringify(old));f.close()
	check(loaded.load_data() and loaded.creative.home.studio.works.is_empty() and loaded.notes==state.notes,"v6 version1 save upgrades without losing existing progress")
	root.size=Vector2i(375,812)
	var app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(375,812);root.position=Vector2i(20,40)
	await process_frame;await process_frame
	check(root.size==Vector2i(375,812),"actual portrait root size is 375 by 812")
	app.state=state;app.state.path="user://creative-ui.json"
	var panel=app.creative_panel
	panel.edit_observation(id)
	await process_frame
	var original:String=c.observation(id).body
	panel.fields.body.text="未保存的草稿";panel.fields.body.text_changed.emit()
	panel.fields.body.grab_focus()
	app.close_modal();await process_frame
	check(root.gui_get_focus_owner()==null,"closing editor releases text focus for virtual keyboard dismissal")
	check(c.observation(id).body==original,"closing editor does not commit unsaved edits")
	panel.edit_observation(id);await process_frame
	check(panel.fields.body.text=="未保存的草稿","cancelled editor draft survives reopening in same session")
	panel.fields.body.text=original;panel.fields.body.text_changed.emit()
	check(emit_button(app,"保存修改"),"editor exposes reachable save action")
	for scenario in [{"size":Vector2i(375,812),"keyboard":330.0,"safe":Rect2(0,24,375,766)},{"size":Vector2i(812,375),"keyboard":180.0,"safe":Rect2(0,0,812,375)}]:
		root.size=scenario.size;app.keyboard_height_override=scenario.keyboard;app.safe_area_override=scenario.safe
		for editor in ["observation","work","start"]:
			if editor=="observation":panel.edit_observation(id)
			elif editor=="work":panel.edit_work(work)
			else:panel.begin_work(c.home.observations.entries[0].id)
			app.layout_ui();await process_frame;await process_frame
			var usable:Rect2=scenario.safe;usable.size.y=minf(usable.end.y,scenario.size.y-scenario.keyboard)-usable.position.y
			check(is_instance_valid(panel.primary) and usable.encloses(panel.primary.get_global_rect()),editor+" confirmation stays above keyboard proxy at "+str(scenario.size))
			check(app.note_body_scroll.follow_focus,"editor scroll follows focused input")
	app.close_modal();app.keyboard_height_override=0;app.safe_area_override=Rect2();root.size=Vector2i(375,812)
	app.change_location("home");await process_frame;await process_frame
	check(app.world.has_node("DisplayedCreation") and app.world.hotspots.any(func(h):return h.kind=="displayed-work"),"displayed work has a real home object and reachable reading interaction")
	for repeat in 4:app.world.show_creation(c.work(work))
	await process_frame
	check(app.world.get_children().filter(func(n):return n.get_meta("creative_display",false)).size()==1,"repeated saves do not duplicate display objects")
	await snap("creative-home-portrait")
	panel.work_page(work);await process_frame;await process_frame
	await snap("creative-work-portrait")
	check(emit_button(app,"从小家收回"),"display can be removed through panel")
	await process_frame
	check(c.home.studio.displayId=="" and c.work(work).body!="" and not app.world.has_node("DisplayedCreation"),"removing display preserves original work and removes scene object")
	app.close_modal();root.size=Vector2i(1280,720);await process_frame
	panel.book();await process_frame;await process_frame
	await snap("creative-book-desktop")
	# Exercise every user-facing form action on fresh data, in native portrait size.
	app.close_modal();root.size=Vector2i(375,812);app.state=State.new();app.state.path="user://creative-e2e.json";panel.drafts.clear()
	panel.book();await process_frame
	check(emit_button(app,"留一页观察"),"UI begins one observation")
	await process_frame
	panel.fields.place.text="河边的傍晚";panel.fields.body.text="桥下的倒影被一只飞过的鸟划开。";panel.fields.hint.text="下次看水面的颜色。"
	check(emit_button(app,"收进观察册"),"UI keeps filled observation")
	await process_frame
	check(emit_button(app,"带到画室创作"),"UI opens source-to-work form")
	await process_frame
	panel.fields.title.text="一只鸟经过";panel.fields.criterion.text="写出一段关于河边倒影的短文。"
	check(emit_button(app,"接下创作"),"UI creates linked task and blank work")
	await process_frame
	panel.fields.body.text="倒影本来是一整块天空。
一只鸟经过，把水面轻轻翻开。
等它飞远，河又把晚霞收好了。";panel.fields.note.text="下次试着把这一幕画下来。"
	check(emit_button(app,"保存这一版"),"UI saves original body and private note")
	await process_frame
	await snap("creative-new-work-portrait")
	check(emit_button(app,"确认完成"),"UI opens completion criteria")
	await process_frame
	check(emit_button(app,"收好作品") and app.state.creative.done.is_empty(),"unchecked completion cannot proceed")
	for checkbox in app.modal.find_children("*","CheckBox",true,false):checkbox.button_pressed=true
	check(emit_button(app,"收好作品") and app.state.creative.done.size()==1,"confirmed completion creates exactly one result")
	await process_frame
	check(emit_button(app,"陈列到小家"),"UI displays completed work")
	await process_frame
	var from_disk:=State.new();from_disk.path=app.state.path
	check(from_disk.load_data() and from_disk.creative.home.studio.displayId!="" and from_disk.creative.home.studio.works[0].note=="下次试着把这一幕画下来。","UI flow persists complete body private note and display selection")
	app.close_modal();app.change_location("home");await process_frame;await process_frame
	await snap("creative-new-home-portrait")
	root.size=Vector2i(1280,720);await process_frame;await process_frame
	check(root.size==Vector2i(1280,720),"actual desktop root size is 1280 by 720")
	await snap("creative-new-home-desktop")
	var result:={"passed":passed,"failed":failed,"native_graphics":DisplayServer.get_name()!="headless","physical_phone":false}
	f=FileAccess.open("res://artifacts/creative-results.json",FileAccess.WRITE);f.store_string(JSON.stringify(result));f.close()
	print("CREATIVE ",passed," passed, ",failed," failed")
	quit(0 if failed==0 else 1)
