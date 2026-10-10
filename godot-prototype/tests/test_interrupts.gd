extends SceneTree
# Interruption, touch ownership, safe-area, and walk-spot persistence checks.
const Scene=preload("res://main.tscn")
const State=preload("res://scripts/state.gd")
const WalkSpot=preload("res://scripts/walk_spot.gd")
const Main=preload("res://scripts/main.gd")
var passed:=0
var failed:=0

func check(ok:bool,message:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+message)

func _initialize()->void:call_deferred("run")

func write_text(path:String,text:String)->void:
	var f:=FileAccess.open(path,FileAccess.WRITE);f.store_string(text);f.close()

func touch(app,index:int,p:Vector2,pressed:bool,canceled:=false)->void:
	var e:=InputEventScreenTouch.new();e.index=index;e.position=p;e.pressed=pressed;e.canceled=canceled;app._input(e)

func drag(app,index:int,p:Vector2)->void:
	var e:=InputEventScreenDrag.new();e.index=index;e.position=p;app._input(e)

func key(code:Key,pressed:bool)->void:
	var e:=InputEventKey.new();e.keycode=code;e.physical_keycode=code;e.pressed=pressed
	Input.parse_input_event(e);Input.flush_buffered_events()

func clear_saves()->void:
	for file in [State.SAVE_PATH,State.PREVIOUS_PATH,State.LEGACY_PATH,WalkSpot.PATH,WalkSpot.PATH+".tmp"]:
		if FileAccess.file_exists(file):DirAccess.remove_absolute(file)

func open_app(fixture:bool):
	var app=Scene.instantiate();app.fixture_mode=fixture;root.add_child(app)
	await process_frame;await process_frame
	return app

func close_app(app)->void:
	app.queue_free();await process_frame

func run()->void:
	if OS.get_environment("KUANGYE_DISPOSABLE_TEST_DATA")!="1":
		printerr("Use tests/run_all.py: this test reads and replaces the default user files.");quit(2);return
	root.size=Vector2i(375,812)
	clear_saves()

	check(Main.pick_ui_density(false,true,3.0)==3.0,"web canvas uses device pixel ratio for UI density")
	check(Main.pick_ui_density(false,false,2.0)==1.0,"native desktop density is unchanged")
	check(Main.pick_ui_density(true,false,2.5)==2.5 and Main.pick_ui_density(false,true,6.0)==3.5,"mobile density stays bounded")
	var portrait:=Main.web_inset_rect(Vector2(1170,2532),[47.0,0.0,34.0,0.0,390.0])
	check(portrait==Rect2(0,141,1170,2532-141-102),"CSS safe-area insets convert to canvas pixels")
	var landscape:=Main.web_inset_rect(Vector2(2532,1170),[0.0,47.0,21.0,47.0,844.0])
	check(landscape.position.x==141 and landscape.end.x==2532-141 and landscape.end.y==1170-63,"landscape notch and home bar both inset")
	check(Main.web_inset_rect(Vector2(800,600),[0,0,0,0,0])==Rect2() and Main.web_inset_rect(Vector2(800,600),"bad")==Rect2() and Main.web_inset_rect(Vector2(800,600),[500,0,500,0,800])==Rect2(),"invalid or implausible insets are ignored")

	var spot:=WalkSpot.new();spot.path="user://walk-spot-unit-fixture.json"
	check(spot.write("home",1.234,-0.5) and spot.read()=={"place":"home","x":1.23,"z":-0.5},"walk spot round-trips place and position")
	for bad in ["{bad",JSON.stringify({"version":2,"place":"home","x":0,"z":0}),JSON.stringify({"version":1,"place":"attic","x":0,"z":0}),JSON.stringify({"version":1,"place":"home","x":0,"z":0,"coins":9}),JSON.stringify({"version":1,"place":"home","x":"1","z":0}),JSON.stringify({"version":1,"place":"home","x":90,"z":0})]:
		write_text(spot.path,bad)
		check(spot.read().is_empty() and FileAccess.get_file_as_string(spot.path)==bad,"unreadable walk spot is ignored without rewriting: "+bad.left(24))
	check(not spot.write("attic",0,0) and not spot.write("home",NAN,0),"walk spot refuses unknown places and non-finite values")
	DirAccess.remove_absolute(spot.path)

	# Startup restores the last place from the sidecar, without touching the v4 save.
	write_text(WalkSpot.PATH,JSON.stringify({"version":1,"place":"home","x":1.5,"z":0.5}))
	var app=await open_app(false)
	check(app.location=="home" and Vector2(app.player.position.x,app.player.position.z).distance_to(Vector2(1.5,0.5))<0.01,"reopening resumes the saved room and position")
	check(app.previous_door=="home" and app.camera_target.distance_to(app.player_focus())<0.01,"resumed room exits to its own door and camera starts on the player")
	check(not FileAccess.file_exists(State.SAVE_PATH),"opening never creates or rewrites the progress save")
	app.player.position=Vector3(-1.0,0.12,1.0)
	app.pause_input()
	var stored:=WalkSpot.new();stored.path=WalkSpot.PATH
	check(stored.read()=={"place":"home","x":-1.0,"z":1.0},"focus loss records the latest walk spot")
	app.transition_to("town")
	await create_timer(0.7).timeout
	check(stored.read().get("place","")=="town","entering another place records it")
	var blocker:Rect2=app.world.blockers[0]
	app.player.position=Vector3(2.0,0.12,2.0)
	app.walk_unsettled=true;app.walk_still_time=0.0
	await create_timer(0.9).timeout
	var settled:=stored.read()
	check(settled.get("place","")=="town" and absf(settled.x-app.player.position.x)<0.02 and absf(settled.z-app.player.position.z)<0.02,"standing still after walking records the spot while visible")
	await close_app(app)

	var center:=blocker.get_center()
	write_text(WalkSpot.PATH,JSON.stringify({"version":1,"place":"town","x":center.x,"z":center.y}))
	app=await open_app(false)
	check(app.location=="town" and Vector2(app.player.position.x,app.player.position.z).distance_to(center)>0.5,"a spot inside scenery falls back to the normal entrance")
	await close_app(app)
	write_text(WalkSpot.PATH,JSON.stringify({"version":1,"place":"shop","x":0.0,"z":3.3}))
	app=await open_app(false)
	check(app.location=="shop" and app.player.position.z<3.1 and not app.transitioning,"a spot on the exit landing resumes inside, not straight back out")
	await close_app(app)

	# A locked (unrecognized) save keeps every file on disk untouched.
	clear_saves()
	write_text(State.SAVE_PATH,"{not a save")
	app=await open_app(false)
	check(app.save_locked,"unrecognized progress save opens read-only")
	app.player.position=Vector3(1.0,0.12,1.0)
	app.unsaved_changes=true
	app._on_page_event([true])
	check(not FileAccess.file_exists(WalkSpot.PATH) and FileAccess.get_file_as_string(State.SAVE_PATH)=="{not a save","hidden page in a locked session writes nothing")
	await close_app(app)
	clear_saves()

	app=await open_app(true)
	app.state.path="user://interrupt-save-fixture.json"
	app.unsaved_changes=true
	app._on_page_event([true])
	check(not app.unsaved_changes and FileAccess.file_exists(app.state.path),"hidden page retries a pending save")
	check(app.mascot_motion.suspended and app.touch_id==-1,"hidden page suspends motion and releases touch")
	app._on_page_event([false])
	check(not app.mascot_motion.suspended,"visible page resumes motion even without a focus event")
	DirAccess.remove_absolute(app.state.path)

	# Keys held across an interruption must be released once before walking again.
	app.player.position=Vector3(0,0.12,2.0)
	key(KEY_D,true)
	await physics_frame
	app.pause_input()
	check(app.movement_keys_latched,"keys held at interruption are latched")
	var held:Vector3=app.player.position
	for i in 8:await physics_frame
	check(Vector2(app.player.position.x,app.player.position.z).distance_to(Vector2(held.x,held.z))<0.01,"stale held key does not walk after return")
	key(KEY_D,false)
	await physics_frame
	check(not app.movement_keys_latched,"releasing the key clears the latch")
	key(KEY_D,true)
	for i in 8:await physics_frame
	key(KEY_D,false)
	check(app.player.position.distance_to(held)>0.1,"a fresh key press walks normally")

	# Rotation or resize releases an in-flight finger.
	var stick:Vector2=app.joystick_base.get_global_rect().get_center()
	touch(app,0,stick,true);drag(app,0,stick+Vector2(30,0))
	check(app.touch_id==0 and app.touch_movement.x>0,"joystick fixture is steering")
	root.size=Vector2i(812,375)
	await process_frame
	check(app.touch_id==-1 and app.touch_movement==Vector2.ZERO,"rotation clears the steering finger")
	touch(app,0,stick+Vector2(30,0),false)
	root.size=Vector2i(375,812)
	await process_frame;await process_frame

	# A second finger can press HUD buttons while the first one steers.
	app.player.position=Vector3(-3,0.1,3)
	app.update_nearby()
	stick=app.joystick_base.get_global_rect().get_center()
	var action:Vector2=app.action_button.get_global_rect().get_center()
	check(app.action_button.visible and app.nearby.id=="bench","bench interaction button is shown")
	touch(app,0,stick,true)
	touch(app,1,action,true);drag(app,1,action+Vector2(40,0));touch(app,1,action+Vector2(40,0),false)
	check(not is_instance_valid(app.modal) and app.touch_id==0,"dragged second finger does not trigger a button")
	touch(app,1,action,true);touch(app,1,action,false,true)
	check(not is_instance_valid(app.modal),"cancelled second finger does not trigger a button")
	touch(app,1,action,true);touch(app,1,action,false)
	check(is_instance_valid(app.modal) and app.touch_id==-1,"second-finger tap opens the bench while steering")
	app.close_modal()
	touch(app,0,stick,false)
	await process_frame
	app.update_nearby()
	touch(app,0,stick,true)
	touch(app,1,app.note_button.get_global_rect().get_center(),true)
	touch(app,0,stick,false)
	touch(app,1,app.note_button.get_global_rect().get_center(),false)
	check(is_instance_valid(app.modal) and is_instance_valid(app.note_editor),"tap finishes even if the steering finger lifts first")
	app.close_modal()

	app.web_safe_rect=Rect2(0,40,375,740)
	app.layout_ui()
	check(app.hud.position==Vector2(0,40) and app.note_button.get_global_rect().end.y<=780,"web safe area moves HUD clear of notch and home bar")
	app.web_safe_rect=Rect2()
	await close_app(app)
	clear_saves()
	print("INTERRUPTS: %d passed, %d failed" % [passed,failed])
	quit(0 if failed==0 else 1)
