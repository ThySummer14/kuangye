extends SceneTree
const Scene=preload("res://main.tscn")
var app
var records:Array=[]
func _initialize()->void:call_deferred("run")
func shot(name:String)->void:
	if DisplayServer.get_name()=="headless":return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/"+name+".png")
func key(pressed:bool)->void:
	var e:=InputEventKey.new();e.keycode=KEY_S;e.physical_keycode=KEY_S;e.pressed=pressed
	Input.parse_input_event(e)
func run()->void:
	app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(375,812);root.position=Vector2i(30,50)
	await create_timer(.5).timeout
	for room in ["home","shop","studio"]:
		app.change_location("town");app.transition_to(room)
		await create_timer(.8).timeout
		var before:Vector3=app.player.position
		await shot("exit-before-"+room)
		if room=="shop":
			var center:Vector2=app.joystick_base.get_global_rect().get_center()
			var press:=InputEventScreenTouch.new();press.index=0;press.position=center;press.pressed=true;app._input(press)
			var drag:=InputEventScreenDrag.new();drag.index=0;drag.position=center+Vector2(0,52);app._input(drag)
		else:key(true)
		await create_timer(1.7).timeout
		key(false);app.clear_touch()
		await create_timer(.2).timeout
		var row:={"room":room,"mode":"touch" if room=="shop" else "keyboard","before":[before.x,before.y,before.z],"after":[app.player.position.x,app.player.position.y,app.player.position.z],"location":app.location,"floor":app.player.is_on_floor(),"fell":app.player.position.y < -0.5}
		records.append(row);print(JSON.stringify(row))
		await shot("exit-after-"+room)
	var f:=FileAccess.open("res://artifacts/exit-input-repro.json",FileAccess.WRITE);f.store_string(JSON.stringify(records,"\t"));f.close()
	quit()
