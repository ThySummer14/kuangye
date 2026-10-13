extends SceneTree

const Scene = preload("res://main.tscn")
var failed := 0
var checked := 0
var captures: Array[Dictionary] = []

func check(ok: bool, message: String) -> void:
	checked += 1
	if not ok: failed += 1
	print(("PASS " if ok else "FAIL ")+message)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var portrait := OS.get_cmdline_user_args().has("--portrait")
	root.size = Vector2i(375,812) if portrait else Vector2i(1280,720)
	await process_frame
	var app = Scene.instantiate()
	app.fixture_mode = true
	root.add_child(app)
	await process_frame
	app.set_physics_process(false)
	app.state.path = "user://lighting-never-saved-fixture.json"
	var coins: int = app.state.coins
	var inventory: Dictionary = app.state.inventory.duplicate(true)
	var placements: Array = app.state.placements.duplicate(true)
	# Exercise viewport dispatch: direct world_click calls miss GUI interception.
	await physics_frame
	var ground_screen: Vector2 = app.image.position+app.camera.unproject_position(Vector3(1,0,1))/Vector2(app.scene_view.size)*app.image.size
	var click := InputEventMouseButton.new()
	click.button_index=MOUSE_BUTTON_LEFT
	click.position=ground_screen
	click.pressed=true
	root.push_input(click)
	check(not app.route.is_empty(),"viewport mouse click reaches map navigation")
	click.pressed=false
	root.push_input(click)
	app.route.clear()
	click.position=app.note_button.get_global_rect().get_center()
	click.pressed=true
	root.push_input(click)
	click.pressed=false
	root.push_input(click)
	check(is_instance_valid(app.modal) and app.route.is_empty(),"HUD mouse click opens its panel without walking through it")
	app.close_modal()
	for place in ["home","town","shop","studio"]:
		app.change_location(place)
		app.mascot.rotation.y = 0.45
		if place == "town":
			app.camera_target = Vector3(0,0,-1.6)
		app.camera.position = app.camera_target+app.camera_offset
		app.camera.look_at(app.camera_target)
		await process_frame
		await physics_frame
		var node_count: int = app.world.get_child_count()
		for mode in ["day","sunset","night"]:
			app.light_mode = mode
			check(app.world.set_lighting(mode), place+" accepts "+mode)
			app.world.update_light_budget(app.player.position)
			check(app.world.light_budget_stats.active<=6,place+" respects six local lights in "+mode)
			check(app.world.get_child_count()==node_count,"changing light does not rebuild "+place)
			if place != "town":
				check(app.world.window_glass.cast_shadow==GeometryInstance3D.SHADOW_CASTING_SETTING_OFF,"glazing never occludes the window beam")
				check(app.world.window_glass.get_meta("dynamic_material",false),"glazing remains outside the static batches")
				var ceilings: Array = app.world.find_children("*","MeshInstance3D",false,false).filter(func(node):return node.cast_shadow==GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY)
				check(ceilings.size()==1,"batching preserves the invisible shadow ceiling")
			if DisplayServer.get_name()!="headless":
				for frame in 4: await process_frame
				await RenderingServer.frame_post_draw
				DirAccess.make_dir_recursive_absolute("res://artifacts")
				var suffix := "375" if portrait else "1280"
				root.get_texture().get_image().save_png("res://artifacts/light-%s-%s-%s.png" % [place,mode,suffix])
				var entry := {"place":place,"mode":mode,"window":str(root.size),"viewport":str(app.scene_view.size),
					"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),
					"sun_energy":app.world.sun.light_energy,"ambient_energy":app.world.settings.ambient_light_energy,
					"batches":app.world.batch_stats,"local_lights":app.world.light_budget_stats}
				if place=="home":
					var reference: PackedByteArray = app.scene_view.get_texture().get_image().get_data()
					await process_frame
					await RenderingServer.frame_post_draw
					entry.static_repeat_equal=reference==app.scene_view.get_texture().get_image().get_data()
					check(entry.static_repeat_equal,"fixed home view repeats exactly in "+mode)
					var samples: Array[float] = []
					var previous := Time.get_ticks_usec()
					for frame in 60:
						await process_frame
						var now := Time.get_ticks_usec()
						samples.append((now-previous)/1000.0)
						previous=now
					samples.sort()
					entry.frame_ms_median=samples[30]
					entry.frame_ms_p95=samples[57]
					entry.frame_samples=samples.size()
				captures.append(entry)
		check(not app.world.set_lighting("unknown") and app.world.light_mode=="night","invalid profile cannot alter the current light")
	app.change_location("home")
	check(app.world.light_mode=="night","selected light survives returning home")
	check(app.navigate_to(Vector3(0,0,-2.6)),"the window has a reachable interaction position")
	app.route.clear()
	for point in app.world.hotspots:
		if point.id=="window-light": app.nearby=point
	app.interact()
	await process_frame
	await process_frame
	check(is_instance_valid(app.modal),"window interaction opens the selector")
	var bounds: Rect2 = app.modal.get_global_rect()
	check(Rect2(Vector2.ZERO,Vector2(root.size)).encloses(bounds),"light selector fits the actual viewport")
	check(bounds.size.y<400*app.ui_density,"three light choices keep a compact panel after text wraps")
	for choice in ["day","sunset","night"]:
		var option: Button = app.modal.find_child("Light_"+choice,true,false)
		check(is_instance_valid(option) and option.size.y>=44,"each light has a touch-sized control: "+choice)
	app.modal.find_child("Light_day",true,false).pressed.emit()
	check(app.light_mode=="day" and app.world.light_mode=="day" and not is_instance_valid(app.modal),"selecting daylight applies it and closes the panel")
	app.change_location("shop")
	app.change_location("home")
	await process_frame
	check(app.world.light_mode=="day","daylight persists across room transitions")
	app.state.placements.append({"id":98765,"kind":"lamp","x":0,"z":0,"rotation":0})
	app.refresh_furniture()
	var placed_lights: Array = app.world.furniture_root.find_children("*","OmniLight3D",true,false)
	check(placed_lights.size()==1 and placed_lights[0].light_energy<0.5,"newly placed lamp uses current daylight rather than full night energy")
	app.state.placements=placements
	app.refresh_furniture()
	check(app.state.coins==coins and app.state.inventory==inventory and not app.unsaved_changes,"lighting leaves economy and pending-save state unchanged")
	check(not FileAccess.file_exists(app.state.path),"lighting never writes a save")
	if DisplayServer.get_name()!="headless":
		var report := {"engine":Engine.get_version_info().string,"renderer":RenderingServer.get_current_rendering_method(),
			"adapter":RenderingServer.get_video_adapter_name(),"captures":captures,"checks":checked,"failed":failed,
			"limit":"Short native samples with VSync; not a mobile benchmark. Physics/animation frozen for static comparisons."}
		var file := FileAccess.open("res://artifacts/light-report-%s.json" % ("375" if portrait else "1280"),FileAccess.WRITE)
		file.store_string(JSON.stringify(report,"\t"))
	app.queue_free()
	await process_frame
	print("LIGHTING: %d checks, %d failed" % [checked,failed])
	quit(1 if failed else 0)
