extends SceneTree

const Scene = preload("res://main.tscn")
const Art = preload("res://scripts/art.gd")
const Catalog = preload("res://scripts/catalog.gd")
var passed := 0
var failed := 0
var report: Dictionary = {}

func check(ok: bool, text: String) -> void:
	if ok: passed += 1
	else: failed += 1
	print(("PASS " if ok else "FAIL ")+text)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	# A SceneTree --script starts with a 64px dummy window in headless mode. Explicitly
	# resize the root, rather than assuming --resolution proves a mobile layout.
	var high_dpi := OS.get_cmdline_user_args().has("--hidpi")
	root.size = Vector2i(1080,2340) if high_dpi else (Vector2i(1280,720) if OS.get_cmdline_user_args().has("--desktop") else Vector2i(375,812))
	await process_frame
	var app = Scene.instantiate()
	app.fixture_mode = true
	if high_dpi: app.ui_density_override=3.0
	root.add_child(app)
	await process_frame
	await process_frame
	var expected_size := Vector2i(1080,2340) if high_dpi else (Vector2i(1280,720) if OS.get_cmdline_user_args().has("--desktop") else Vector2i(375,812))
	check(Vector2i(app.get_viewport_rect().size)==expected_size,"root viewport exactly matches requested layout size "+str(expected_size))
	app.state.path = "user://boundary-test-fixture.json"
	var mascot: Node3D = app.mascot
	var body: Node3D = mascot.get_node("BodyShape")
	check(body.get_node("horn-left-tall").position.y>body.get_node("horn-right-short").position.y,"mascot left horn stays taller than right")
	check(body.get_node("two-leaf-sprout").find_children("leaf*","MeshInstance3D",false,false).size()==2,"mascot has exactly two leaves")
	check(body.find_children("hand*","MeshInstance3D",false,false).size()==2,"mascot has two fingerless hands")
	check(body.find_children("*leg*","",true,false).is_empty(),"mascot has no legs")
	var eye: StandardMaterial3D = body.get_node("eye-1").material_override
	check(eye.albedo_color.is_equal_approx(Color("d9af68")),"mascot eyes use approved solid amber")
	var shell: Mesh = body.get_node("body").mesh
	var arrays := shell.surface_get_arrays(0)
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var normals: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
	var outward := 0
	var count := 0
	for i in vertices.size():
		var radial := Vector3(vertices[i].x,0,vertices[i].z)
		if radial.length()>0.30 and absf(normals[i].y)<0.75:
			count+=1
			if radial.dot(normals[i])>0:outward+=1
	check(count>0 and outward==count,"mascot shell normals point outward")
	check(app.world.batch_stats.static_batches<100,"town merges static decoration under 100 material batches")
	report.town = app.world.batch_stats
	check(app.scene_view.size.x>=180,"world resolution is bounded independently of UI")
	var enlargement:Vector2=app.image.size/Vector2(app.scene_view.size)
	check(is_equal_approx(enlargement.x,roundf(enlargement.x)) and is_equal_approx(enlargement.x,enlargement.y),"world pixels enlarge by an equal integer factor")
	var ray_center=app.ground_point(app.image.position+app.image.size*0.5)
	check(ray_center!=null and Vector2(ray_center.x,ray_center.z).distance_to(Vector2(app.camera_target.x,app.camera_target.z))<0.2,"pointer-to-world ray accounts for viewport gutters")
	var snapped_focus:Vector3=app.snap_camera_focus(Vector3(1.237,0,-2.483))
	var world_pixel:float=app.camera.size/float(app.scene_view.size.x if app.camera.keep_aspect==Camera3D.KEEP_WIDTH else app.scene_view.size.y)
	check(absf(snapped_focus.dot(app.camera.basis.x)/world_pixel-roundf(snapped_focus.dot(app.camera.basis.x)/world_pixel))<0.001 and absf(snapped_focus.dot(app.camera.basis.y)/world_pixel-roundf(snapped_focus.dot(app.camera.basis.y)/world_pixel))<0.001,"orthographic focus snaps in screen axes rather than world axes")
	check(app.note_button.get_global_rect().end.x<=app.get_viewport_rect().size.x,"quick note fits visible viewport")
	check(app.note_button.size.y>=44,"quick note keeps touch-sized target")
	check(app.note_button.get_global_rect().position.y>app.get_viewport_rect().size.y*0.6,"quick note stays in reachable lower region")
	# Verify every building has a path from the central lane, not merely a clickable label.
	app.player.position = Vector3(0,0.12,2.0)
	for place in ["home","shop","studio"]:
		var target: Vector3
		for hotspot in app.world.hotspots:
			if hotspot.id==place:target=hotspot.pos
		check(app.navigate_to(target),"walkable route reaches "+place+" door")
	app.route.clear()
	app.camera.position=Vector3(-5,0,-1)+app.camera_offset
	app.camera.look_at(Vector3(-5,0,-1))
	await physics_frame
	var door_view:Vector2=app.camera.unproject_position(Vector3(-5,1,-0.8))
	var door_screen:Vector2=app.image.position+door_view/Vector2(app.scene_view.size)*app.image.size
	var door_hit:Dictionary=app.pick_world(door_screen)
	check(not door_hit.is_empty() and door_hit.collider.get_meta("door_id","")=="home","ray picking identifies the physical house facade")
	app.world_click(door_screen)
	check(app.queued_interaction=="home","tapping house facade queues its reachable door")
	app.route.clear()
	app.queued_interaction=""
	# Drafts survive cancellation and repeated reopening, but do not earn rewards.
	var before: int = app.state.coins
	app.show_note()
	app.note_editor.text = "还没有写完的真实观察"
	app.close_modal()
	app.show_note()
	check(app.note_editor.text=="还没有写完的真实观察","closing note retains unsaved draft")
	check(app.state.notes.is_empty() and app.state.coins==before,"draft and cancel do not issue a reward")
	app.close_modal()
	for i in 25:app.state.notes.append({"date":"2026-10-08","text":"第%d条生活小记，保留完整原文。" % i})
	app.show_history()
	await process_frame
	var history_records:Node=app.modal.find_child("HistoryRecords",true,false)
	check(history_records.get_child_count()==20,"history renders a bounded page instead of every saved note")
	check(app.modal.get_global_rect().end.y<=app.get_viewport_rect().size.y,"history panel fits the actual viewport")
	app.show_history(1)
	await process_frame
	history_records=app.modal.find_child("HistoryRecords",true,false)
	check(history_records.get_child_count()==5,"older history page preserves every remaining record")
	app.show_note()
	check(app.note_editor.text=="还没有写完的真实观察","browsing history preserves the unfinished note draft")
	app.close_modal()
	app.queued_interaction="home"
	app.show_note()
	check(app.queued_interaction.is_empty(),"quick note cancels pending automatic door interaction")
	app.close_modal()
	var valid_save_path: String=app.state.path
	app.state.path="user://directory-that-does-not-exist/progress.json"
	var coins_before_failure: int=app.state.coins
	app.buy_item("plant")
	var in_shop_warning:=false
	for text_node in app.modal.find_children("*","Label",true,false):
		if text_node.text.contains("还没保存到本机"):in_shop_warning=true
	check(in_shop_warning,"save failure remains visible inside the still-open shop panel")
	app.close_modal()
	check(app.unsaved_changes and app.retry_save_button.visible,"failed save is visibly pending with an explicit retry")
	check(app.status_label.text.contains("还没存到本机"),"failed save never reports successful persistence")
	check(app.state.coins==coins_before_failure-20,"failed save keeps one purchase in session memory")
	app.state.path=valid_save_path
	check(app.save() and not app.unsaved_changes and not app.retry_save_button.visible,"retry persists existing progress and clears pending state")
	check(app.state.coins==coins_before_failure-20,"save retry cannot charge for purchase twice")
	app.save_locked=true
	app.buy_item("plant")
	app.close_modal()
	check(app.status_label.text.contains("旧存档") and not app.retry_save_button.visible,"unrecognized save stays protected without offering a destructive retry")
	app.save_locked=false
	app.save()
	# A synthetic screen cancellation must actually pass through the input handler.
	var press := InputEventScreenTouch.new()
	press.index=2
	press.position=Vector2(48*app.ui_density,app.get_viewport_rect().size.y-90*app.ui_density)
	press.pressed=true
	app._input(press)
	var drag := InputEventScreenDrag.new()
	drag.index=2
	drag.position=press.position+Vector2(30*app.ui_density,0)
	app._input(drag)
	check(app.touch_movement.x>0,"touch drag feeds movement vector")
	var cancel := InputEventScreenTouch.new()
	cancel.index=2
	cancel.position=drag.position
	cancel.pressed=false
	cancel.canceled=true
	app._input(cancel)
	check(app.touch_id==-1 and app.touch_movement.is_zero_approx(),"cancelled touch clears the controlling pointer")
	app.change_location("home")
	await process_frame
	var spare_lights: Array[Node3D]=[]
	for i in 12:
		spare_lights.append(Art.furniture(app.world,"lamp",Vector3(-3+(i%6),0,-2+int(i/6))))
	app.world.update_light_budget(app.player.position)
	check(app.world.light_budget_stats.available>8 and app.world.light_budget_stats.active==6,"large lamp collections stay within six active omni lights")
	var priority_visible:=false
	for light in app.world.find_children("*","OmniLight3D",true,false):
		if light.get_meta("priority_light",false):priority_visible=light.visible
	check(priority_visible,"main room shadow light is preserved by budget priority")
	for lamp in spare_lights:lamp.queue_free()
	await process_frame
	app.toggle_build()
	app.choose_item("stool")
	app.player.position=Vector3(0.25,0.08,0.25)
	app.selected_cell=Vector2i(0,0)
	var inventory_before: int=app.state.inventory.stool
	app.commit_placement()
	check(app.state.placements.is_empty() and app.state.inventory.stool==inventory_before,"cannot place solid furniture through mascot")
	app.player.position=Vector3(0,0.08,2.6)
	app.commit_placement()
	check(app.state.placements.size()==1,"same placement succeeds when mascot steps aside")
	var placed: Dictionary = app.state.placements[0].duplicate(true)
	await physics_frame
	var item_view:Vector2=app.camera.unproject_position(Vector3(0.25,0.3,0.25))
	var item_screen:Vector2=app.image.position+item_view/Vector2(app.scene_view.size)*app.image.size
	app.world_click(item_screen)
	check(app.moving_id==int(placed.id),"tapping actual furniture body selects its stored placement")
	app.selected_cell=Vector2i(3,0)
	app.rotate_ghost()
	app.end_build()
	check(app.state.placements[0]==placed,"cancelled furniture move leaves original placement intact")
	app.toggle_build()
	app.select_existing(Vector3(0.25,0,0.25))
	app.return_selected()
	check(app.state.placements.is_empty() and app.state.inventory.stool==inventory_before,"returning furniture restores exact inventory")
	app.end_build()
	# Repeated scene replacement must not retain old world, camera, or player nodes.
	for target in ["town","shop","home","studio","town","home"]:
		app.change_location(target)
		await process_frame
		await process_frame
		check(app.scene_view.get_child_count()==1,"scene replacement frees previous world: "+target)
		check(app.world.find_children("Player","CharacterBody3D",true,false).size()==1,"scene has one player: "+target)
	app.transition_to("town")
	var transition_tap:=InputEventScreenTouch.new()
	transition_tap.pressed=true
	transition_tap.position=Vector2(100,100)
	transition_tap.index=0
	app._input(transition_tap)
	await create_timer(0.6).timeout
	check(app.location=="home" and app.fade.color.a==0,"touch cancel before door swap restores clear view")
	app.transition_to("studio")
	await create_timer(0.3).timeout
	app.cancel_transition()
	check(not app.transitioning and app.fade.color.a==0,"cancel after door swap never leaves black screen")
	report.viewport=Vector2i(app.get_viewport_rect().size)
	report.scene_resolution=app.scene_view.size
	report.ui_density=app.ui_density
	report.passed=passed
	report.failed=failed
	report.note="Headless structural checks, not GPU or device performance."
	var file:=FileAccess.open("res://artifacts/scene-boundaries.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"\t"))
	file.close()
	DirAccess.remove_absolute(app.state.path)
	print("BOUNDARY TESTS: %d passed, %d failed" % [passed,failed])
	quit(0 if failed==0 else 1)
