extends SceneTree
const Scene=preload("res://main.tscn")
var app
var rows:Array=[]
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,label:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+label)
func key(pressed:bool)->void:
	var e:=InputEventKey.new();e.keycode=KEY_S;e.physical_keycode=KEY_S;e.pressed=pressed;Input.parse_input_event(e)
func stick()->void:
	var p:Vector2=app.joystick_base.get_global_rect().get_center()
	var press:=InputEventScreenTouch.new();press.index=0;press.position=p;press.pressed=true;app._input(press)
	var drag:=InputEventScreenDrag.new();drag.index=0;drag.position=p+Vector2(0,52);app._input(drag)
func sample(label:String,expected:String)->void:
	var row:={"label":label,"place":app.location,"position":[app.player.position.x,app.player.position.y,app.player.position.z],"floor":app.player.is_on_floor()}
	rows.append(row);print(JSON.stringify(row))
	check(app.location==expected and app.player.position.y> -0.2 and app.player.is_on_floor(),label+" stays on the correct supported floor")
func shot(name:String)->void:
	if DisplayServer.get_name()=="headless":return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/exit-fixed-"+name+".png")
func run()->void:
	app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(375,812);root.position=Vector2i(30,50)
	await create_timer(.5).timeout
	check(root.size==Vector2i(375,812),"native portrait size is 375 by 812")
	for cycle in 2:
		for room in ["home","shop","studio"]:
			app.transition_to(room);await create_timer(.7).timeout
			if cycle==0:key(true)
			else:stick()
			await create_timer(1.35).timeout
			key(false);app.clear_touch();await create_timer(.2).timeout
			sample("%s-%s-exit" % ["keyboard" if cycle==0 else "touch",room],"town")
			check(app.scene_view.get_child_count()==1,"one live world after "+room+" exit")
			if cycle==0:await shot(room)
	for room in ["home","shop","studio"]:
		app.transition_to(room);await create_timer(.7).timeout
		key(true)
		var began:=Time.get_ticks_msec()
		while not app.transitioning and Time.get_ticks_msec()-began<2000:await physics_frame
		check(app.transitioning,"walking reaches automatic exit in "+room)
		app.cancel_transition()
		await create_timer(1.1).timeout
		key(false);await create_timer(.1).timeout
		sample(room+"-cancelled-held-input",room)
		check(not app.transitioning,"cancelled automatic exit does not immediately retrigger")
		await shot(room+"-cancelled")
		# Click the existing interaction control through Godot's real input route.
		app.update_nearby()
		check(app.action_button.visible,"exit interaction remains available after cancelling")
		var point:Vector2=app.action_button.get_global_rect().get_center()
		var mouse:=InputEventMouseButton.new();mouse.position=point;mouse.button_index=MOUSE_BUTTON_LEFT;mouse.pressed=true;Input.parse_input_event(mouse)
		await process_frame
		mouse=InputEventMouseButton.new();mouse.position=point;mouse.button_index=MOUSE_BUTTON_LEFT;mouse.pressed=false;Input.parse_input_event(mouse)
		await create_timer(.8).timeout
		sample(room+"-mouse-exit-after-cancel","town")
	# A cancelled threshold can be rearmed by stepping back inside.
	app.transition_to("home");await create_timer(.7).timeout
	app.room_exit_latched=true;app.player.position=Vector3(0,.12,2.6)
	await create_timer(.2).timeout
	check(not app.room_exit_latched,"returning inside rearms the walk-through threshold")
	var file:=FileAccess.open("res://artifacts/room-return.json",FileAccess.WRITE)
	file.store_string(JSON.stringify({"passed":passed,"failed":failed,"samples":rows,"native":DisplayServer.get_name()!="headless","physical_phone":false},"\t"));file.close()
	print("ROOM RETURN ",passed," passed, ",failed," failed")
	quit(0 if failed==0 else 1)
