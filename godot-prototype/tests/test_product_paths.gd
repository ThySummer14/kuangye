extends SceneTree

const Scene=preload("res://main.tscn")
var passed:=0
var failed:=0
var evidence:Array[Dictionary]=[]

func check(ok:bool,message:String) -> void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+message)

func _initialize() -> void:call_deferred("run")

func confirm_rect(app:Control) -> Rect2:
	for b in app.modal.find_children("*","Button",true,false):
		if b.text=="收进生活小记":return b.get_global_rect()
	return Rect2()

func run() -> void:
	root.size=Vector2i(375,812)
	var app=Scene.instantiate()
	app.fixture_mode=true
	root.add_child(app)
	await process_frame
	await process_frame
	app.player.position=Vector3(-3,0.1,3)
	app.update_nearby()
	var action:Rect2=app.action_button.get_global_rect()
	var stick:Rect2=app.joystick_base.get_global_rect()
	check(app.action_button.visible and not action.intersects(stick),"visible interaction button and joystick do not overlap")
	var press:=InputEventScreenTouch.new()
	press.index=0
	press.pressed=true
	press.position=action.position+Vector2(25,25)
	app._input(press)
	var drag:=InputEventScreenDrag.new()
	drag.index=0
	drag.position=press.position+Vector2(25,0)
	app._input(drag)
	check(app.touch_id==-1 and app.touch_movement.is_zero_approx(),"drag starting on interaction UI never becomes joystick movement")
	evidence.append({"case":"interaction","action":str(action),"joystick":str(stick),"movement":str(app.touch_movement)})
	app.clear_touch()
	app.unsaved_changes=true
	app.refresh_hud()
	app.status("这次变化仍在本次会话里，还没存到本机；请点「重试保存」。")
	await process_frame
	var retry:Rect2=app.retry_save_button.get_global_rect()
	var status:Rect2=app.status_label.get_global_rect()
	check(not retry.intersects(status),"save retry and multiline failure text do not overlap")
	check(app.get_viewport_rect().encloses(retry),"retry target remains within viewport")
	evidence.append({"case":"failed-save","retry":str(retry),"status":str(status)})
	app.unsaved_changes=false
	app.refresh_hud()
	app.state.notes.append({"date":"2026-10-08","text":"已有小记也不能把确认按钮推到屏幕外。"})
	for scenario in [
		{"name":"reduced-height","size":Vector2i(375,480),"density":1.0,"keyboard":0.0,"safe":Rect2(0,0,375,480)},
		{"name":"portrait-keyboard-safe-area","size":Vector2i(375,812),"density":1.0,"keyboard":330.0,"safe":Rect2(0,24,375,766)},
		{"name":"hidpi-keyboard-safe-area","size":Vector2i(1080,2340),"density":3.0,"keyboard":990.0,"safe":Rect2(0,72,1080,2202)},
		{"name":"landscape-keyboard","size":Vector2i(812,375),"density":1.0,"keyboard":180.0,"safe":Rect2(0,0,812,375)}]:
		app.close_modal()
		root.size=scenario.size
		app.ui_density=scenario.density
		app.safe_area_override=scenario.safe
		app.keyboard_height_override=scenario.keyboard
		await process_frame
		app.show_note()
		app.layout_ui()
		await process_frame
		await process_frame
		var confirmation:=confirm_rect(app)
		var usable:Rect2=scenario.safe
		usable.size.y=minf(usable.end.y,scenario.size.y-scenario.keyboard)-usable.position.y
		check(confirmation.has_area() and usable.encloses(confirmation),"confirmation stays reachable in "+scenario.name)
		check(app.note_body_scroll.vertical_scroll_mode!=ScrollContainer.SCROLL_MODE_DISABLED,"writing content remains scrollable in "+scenario.name)
		evidence.append({"case":scenario.name,"usable":str(usable),"modal":str(app.modal.get_global_rect()),"confirmation":str(confirmation),"native_ime_verified":false})
	app.keyboard_height_override=0
	app.close_modal()
	root.size=Vector2i(812,375)
	app.ui_density=1
	app.safe_area_override=Rect2(0,0,812,375)
	app.show_shop()
	await process_frame
	await process_frame
	check(app.get_viewport_rect().encloses(app.modal.get_global_rect()),"existing shop panel fits low-height landscape viewport")
	app.show_history()
	await process_frame
	await process_frame
	check(app.get_viewport_rect().encloses(app.modal.get_global_rect()),"existing history panel fits low-height landscape viewport")
	app.close_modal()
	root.size=Vector2i(375,812)
	app.ui_density=1
	app.safe_area_override=Rect2(0,24,375,766)
	app.layout_ui()
	await process_frame
	check(app.ui_safe_rect().encloses(app.note_button.get_global_rect()),"quick record control respects top and bottom device-safe insets")
	check(app.ui_safe_rect().encloses(app.joystick_base.get_global_rect()),"joystick respects device-safe insets")
	var file:=FileAccess.open("res://artifacts/product-paths.json",FileAccess.WRITE)
	file.store_string(JSON.stringify({"passed":passed,"failed":failed,"evidence":evidence,"limit":"synthetic viewport, keyboard-height and safe-area proxies; not actual IME/device validation"},"\t"))
	file.close()
	print("PRODUCT PATHS: %d passed, %d failed" % [passed,failed])
	quit(0 if failed==0 else 1)
