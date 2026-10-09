extends SceneTree

const Scene=preload("res://main.tscn")
var passed:=0
var failed:=0

func check(ok:bool,message:String) -> void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+message)

func touch(app,index:int,p:Vector2,pressed:bool,canceled:bool=false) -> void:
	var e:=InputEventScreenTouch.new()
	e.index=index
	e.position=p
	e.pressed=pressed
	e.canceled=canceled
	app._input(e)

func drag(app,index:int,p:Vector2) -> void:
	var e:=InputEventScreenDrag.new()
	e.index=index
	e.position=p
	app._input(e)

func cell_at(app,p:Vector2) -> Vector2i:
	var point:Vector3=app.ground_point(p)
	return Vector2i(floori(point.x/0.5),floori(point.z/0.5))

func _initialize() -> void:call_deferred("run")

func run() -> void:
	for density in [1.0,3.0]:
		root.size=Vector2i(375,812)*int(density)
		var app=Scene.instantiate()
		app.fixture_mode=true
		app.ui_density_override=density
		root.add_child(app)
		await process_frame
		await process_frame
		app.change_location("home")
		app.state.path="user://touch-furnishing-fixture.json"
		app.state.inventory["stool"]=2
		app.toggle_build()
		app.choose_item("stool")
		await process_frame
		await process_frame
		var a:Vector2=app.image.get_global_rect().get_center()-Vector2(35,20)*density
		var b:Vector2=a+Vector2(65,30)*density
		check(not app.screen_over_controls(a) and not app.screen_over_controls(b),"fixture uses world surface at density "+str(density))
		var original:Vector2i=app.selected_cell
		var inventory:Dictionary=app.state.inventory.duplicate(true)
		var placements:Array=app.state.placements.duplicate(true)
		touch(app,7,a,true)
		drag(app,7,b)
		check(app.selected_cell==cell_at(app,b) and app.selected_cell!=original,"touch drag follows ground projection")
		var preview_id:int=app.ghost.get_instance_id()
		drag(app,7,b)
		check(app.ghost.get_instance_id()==preview_id,"same-cell touch samples reuse preview geometry")
		check(app.touch_movement==Vector2.ZERO and not app.touch_joystick,"furniture touch never becomes movement joystick")
		touch(app,8,a,true)
		drag(app,8,a)
		touch(app,8,a,false)
		check(app.touch_id==7 and app.selected_cell==cell_at(app,b),"second finger cannot steal or end preview gesture")
		app.commit_placement()
		check(app.state.placements==placements,"second-finger toolbar confirm cannot commit active gesture")
		touch(app,7,b,false)
		check(app.touch_id==-1 and app.selected_cell==cell_at(app,b),"release retains preview without placing")
		check(app.state.inventory==inventory and app.state.placements==placements,"drag and release preserve saved model and inventory")
		original=app.selected_cell
		touch(app,1,b,true)
		drag(app,1,a)
		touch(app,1,a,false,true)
		check(app.selected_cell==original and app.touch_id==-1,"OS touch cancel restores pre-gesture preview")
		touch(app,1,b,true)
		drag(app,1,a)
		app.pause_input()
		check(app.selected_cell==original and app.touch_id==-1,"focus loss restores preview and releases owner")
		var ui:Vector2=app.build_bar.get_global_rect().get_center()
		touch(app,1,ui,true)
		drag(app,1,a)
		touch(app,1,a,false)
		check(app.touch_id==-1 and app.selected_cell==original,"toolbar scrolling cannot start world preview")
		touch(app,1,b,true)
		drag(app,1,a)
		touch(app,1,ui,false)
		check(app.selected_cell==original,"release over toolbar cancels preview instead of placing")
		touch(app,1,b,true)
		drag(app,1,a)
		touch(app,1,Vector2(-30,-30),false)
		check(app.selected_cell==original,"release outside world rolls back preview")
		var mouse:=InputEventMouseMotion.new()
		mouse.device=InputEvent.DEVICE_ID_EMULATION
		mouse.position=a
		app._unhandled_input(mouse)
		check(app.selected_cell==original,"emulated touch mouse motion does not move preview twice")
		# Explicit action still owns the actual inventory mutation and save.
		for x in range(-7,7):
			for z in range(-6,5):
				app.selected_cell=Vector2i(x,z)
				app.refresh_ghost()
				if app.ghost_valid:break
			if app.ghost_valid:break
		check(app.ghost_valid,"explicit commit fixture uses valid free cell")
		app.commit_placement()
		check(app.state.placements.size()==placements.size()+1 and app.state.inventory.stool==1,"explicit 放下 commits once after release")
		var reloaded=load("res://scripts/state.gd").new()
		reloaded.path=app.state.path
		check(reloaded.load_data() and reloaded.placements==app.state.placements,"explicit placement survives saved-state reopen")
		var placed:Dictionary=app.state.placements.back().duplicate(true)
		app.select_existing_id(int(placed.id))
		touch(app,1,a,true)
		drag(app,1,b)
		app.change_location("town")
		check(not app.build_mode and app.ghost==null and app.touch_id==-1,"room exit clears preview and gesture")
		check(app.state.placements.back()==placed,"room exit preserves existing furniture at saved location")
		app.queue_free()
		await process_frame
	print("Touch furnishing: %d passed, %d failed" % [passed,failed])
	quit(1 if failed else 0)
