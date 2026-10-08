extends Control

const State = preload("res://scripts/state.gd")
const Catalog = preload("res://scripts/catalog.gd")
const Art = preload("res://scripts/art.gd")
const World = preload("res://scripts/world.gd")
const MascotMotion = preload("res://scripts/mascot_motion.gd")
var mascot_motion := MascotMotion.new()
var pending_mascot_reaction := ""
const BadgePanel=preload("res://scripts/badge_panel.gd")
var badge_panel:RefCounted
const CreativePanel = preload("res://scripts/creative_panel.gd")
var creative_panel:RefCounted
var state := State.new()
var world: TownWorld
var scene_view: SubViewport
var image: TextureRect
var camera: Camera3D
var player: CharacterBody3D
var mascot: Node3D
var navigation: AStarGrid2D
var route := PackedVector2Array()
var queued_interaction := ""
var location := "town"
var previous_door := "home"
var camera_target := Vector3(0,0,-1.5)
var camera_offset := Vector3(14,20,26)
var elapsed := 0.0
var hud: Control
var title_label: Label
var subtitle_label: Label
var coins_label: Label
var hint_label: Label
var action_button: Button
var note_button: Button
var build_button: Button
var status_label: Label
var modal: PanelContainer
var modal_shade: ColorRect
var build_bar: PanelContainer
var build_mode := false
var selected_kind := ""
var selected_rotation := 0
var selected_cell := Vector2i.ZERO
var moving_id := -1
var ghost: Node3D
var ghost_valid := false
var nearby: Dictionary = {}
var touch_id := -1
var touch_origin := Vector2.ZERO
var touch_current := Vector2.ZERO
var touch_movement := Vector2.ZERO
var touch_joystick := false
var joystick_base: Panel
var joystick_knob: Panel
var transitioning := false
var room_exit_latched := false
var fade: ColorRect
var transition_tween: Tween
var save_locked := false
var unsaved_changes := false
var retry_save_button: Button
var qa_mode := false
var fixture_mode := false
var test_results: Array[Dictionary] = []
var note_draft := ""
var note_editor: TextEdit
var ui_density := 1.0
var ui_density_override := 0.0
var light_update_timer := 0.0
var safe_area_override := Rect2()
var keyboard_height_override := -1.0
var ui_metrics_timer := 0.0
var last_keyboard_height := 0.0
var last_safe_rect := Rect2()
var note_body_scroll: ScrollContainer
var note_history_button: Button
var qa_target_size := Vector2i.ZERO

func _ready() -> void:
	qa_mode = OS.get_cmdline_user_args().has("--qa")
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--qa-size="):
			var dimensions := argument.trim_prefix("--qa-size=").split("x")
			if dimensions.size()==2:qa_target_size=Vector2i(int(dimensions[0]),int(dimensions[1]))
	ui_density = ui_density_override if ui_density_override>0 else (clampf(DisplayServer.screen_get_scale(),1.0,3.5) if OS.has_feature("mobile") else 1.0)
	Art.font = load("res://assets/NotoSansSC-Regular.otf")
	setup_theme()
	if qa_mode or fixture_mode:
		state.path = "user://town-qa-fixture.json"
	else:
		state.load_data()
		# Never overwrite an unrecognized save simply by opening the prototype.
		save_locked = not state.last_error.is_empty()
	scene_view = SubViewport.new()
	scene_view.size = Vector2i(640,360)
	scene_view.own_world_3d = true
	scene_view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	scene_view.msaa_3d = Viewport.MSAA_DISABLED
	add_child(scene_view)
	image = TextureRect.new()
	image.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	image.texture = scene_view.get_texture()
	image.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(image)
	setup_hud()
	creative_panel=CreativePanel.new(self)
	badge_panel=BadgePanel.new(self)
	change_location("town")
	get_viewport().size_changed.connect(layout_ui)
	get_window().focus_exited.connect(pause_input)
	get_window().focus_entered.connect(func():mascot_motion.set_suspended(false))
	layout_ui()
	if save_locked:
		status(state.last_error)
	if qa_mode:
		call_deferred("run_integration_qa")

func setup_theme() -> void:
	var t := Theme.new()
	t.default_font = Art.font
	t.default_font_size = 17
	t.set_color("font_color","Label",Color("eee2cb"))
	t.set_color("font_color","Button",Color("efe3cc"))
	t.set_color("font_hover_color","Button",Color("fff3d3"))
	t.set_color("font_disabled_color","Button",Color("7d897e"))
	for style in ["normal","hover","pressed","disabled","focus"]:
		var color := "354a43" if style=="normal" else ("516c56" if style=="hover" else "283b37")
		var b := panel_style(color,12)
		b.content_margin_left = 17
		b.content_margin_right = 17
		b.content_margin_top = 10
		b.content_margin_bottom = 10
		if style == "focus":
			b.bg_color.a = 0.0
			b.border_color = Color("d6c899")
			b.set_border_width_all(2)
		t.set_stylebox(style,"Button",b)
	t.set_stylebox("panel","PanelContainer",panel_style("233a35",18))
	t.set_stylebox("normal","TextEdit",panel_style("1b302c",10))
	t.set_color("font_color","TextEdit",Color("f3e9d5"))
	t.set_color("caret_color","TextEdit",Color("edc78e"))
	t.set_stylebox("normal","LineEdit",panel_style("1b302c",10))
	t.set_color("font_color","LineEdit",Color("f3e9d5"))
	t.set_color("caret_color","LineEdit",Color("edc78e"))
	t.set_constant("line_spacing","Label",4)
	theme = t

func panel_style(color: String, radius: int) -> StyleBoxFlat:
	var b := StyleBoxFlat.new()
	b.bg_color = Color(color)
	b.set_corner_radius_all(radius)
	b.set_content_margin_all(14)
	b.border_color = Color("627266")
	b.set_border_width_all(1)
	return b

func label(text: String, size := 17, color := "eee2cb") -> Label:
	var n := Label.new()
	n.text = text
	n.add_theme_font_size_override("font_size",size)
	n.add_theme_color_override("font_color",Color(color))
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return n

func button(text: String, action: Callable) -> Button:
	var n := Button.new()
	n.text = text
	n.custom_minimum_size.y = 46
	n.pressed.connect(action)
	return n

func setup_hud() -> void:
	hud = Control.new()
	hud.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hud)
	title_label = label("旷野",26)
	title_label.add_theme_constant_override("outline_size",5)
	title_label.add_theme_color_override("font_outline_color",Color("34483d"))
	hud.add_child(title_label)
	subtitle_label = label("暮色小镇 · Godot 2.5D 试作",13,"dad9bd")
	subtitle_label.add_theme_constant_override("outline_size",3)
	subtitle_label.add_theme_color_override("font_outline_color",Color("34483d"))
	hud.add_child(subtitle_label)
	coins_label = label("",16,"f7d9a1")
	coins_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	coins_label.add_theme_constant_override("outline_size",4)
	coins_label.add_theme_color_override("font_outline_color",Color("34483d"))
	hud.add_child(coins_label)
	retry_save_button = button("重试保存",func():
		if save(): status("现在已经保存到本机。"))
	retry_save_button.visible = false
	hud.add_child(retry_save_button)
	note_button = button("随手记  N",show_note)
	hud.add_child(note_button)
	build_button = button("布置小家  B",toggle_build)
	hud.add_child(build_button)
	action_button = button("",interact)
	hud.add_child(action_button)
	hint_label = label("WASD / 方向键移动 · 点击地面走过去 · E 互动",13,"e2dbc1")
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.add_theme_constant_override("outline_size",4)
	hint_label.add_theme_color_override("font_outline_color",Color("34483d"))
	hud.add_child(hint_label)
	status_label = label("",15,"ffe5ab")
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.add_theme_constant_override("outline_size",5)
	status_label.add_theme_color_override("font_outline_color",Color("293c32"))
	hud.add_child(status_label)
	joystick_base = Panel.new()
	var base_style := panel_style("344d43",50)
	base_style.bg_color.a = 0.6
	base_style.border_color.a = 0.45
	joystick_base.add_theme_stylebox_override("panel",base_style)
	joystick_base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(joystick_base)
	joystick_knob = Panel.new()
	var knob_style := panel_style("b7c3a0",25)
	knob_style.bg_color.a = 0.55
	joystick_knob.add_theme_stylebox_override("panel",knob_style)
	joystick_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	joystick_base.add_child(joystick_knob)
	fade = ColorRect.new()
	fade.color = Color(0.08,0.13,0.11,0)
	fade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fade)
	refresh_hud()

func layout_ui() -> void:
	if not is_instance_valid(hud):
		return
	var physical_size := get_viewport_rect().size
	var safe_rect := ui_safe_rect()
	var keyboard_height := ui_keyboard_height()
	var s := safe_rect.size/ui_density
	var usable_height := maxf(120,(minf(safe_rect.end.y,physical_size.y-keyboard_height)-safe_rect.position.y)/ui_density)
	hud.position = safe_rect.position
	hud.scale = Vector2.ONE*ui_density
	hud.size = s
	last_keyboard_height = keyboard_height
	last_safe_rect = safe_rect
	# Use an integer enlargement. Odd window dimensions get at most a few pixels of
	# neutral gutter, instead of uneven world pixel widths. UI keeps its own DPI scale.
	var pixel_scale := maxi(2,maxi(ceili(physical_size.x/960.0),ceili(physical_size.y/640.0)))
	scene_view.size = Vector2i(maxi(1,int(physical_size.x/pixel_scale)),maxi(1,int(physical_size.y/pixel_scale)))
	image.size = Vector2(scene_view.size)*pixel_scale
	image.position = ((physical_size-image.size)*0.5).floor()
	var mobile := s.x < 760
	title_label.position = Vector2(24,17)
	subtitle_label.position = Vector2(25,53)
	coins_label.position = Vector2(s.x-228,23 if not mobile else 61)
	coins_label.size = Vector2(200,30)
	retry_save_button.position = Vector2(s.x-151,61 if not mobile else 94)
	retry_save_button.size = Vector2(127,46)
	title_label.add_theme_font_size_override("font_size",26 if not mobile else 22)
	subtitle_label.visible = not mobile and not is_instance_valid(modal)
	note_button.position = Vector2(s.x-159,s.y-78)
	note_button.size = Vector2(135,48)
	build_button.position = Vector2(s.x-159,s.y-134)
	build_button.size = Vector2(135,48)
	action_button.size = Vector2(minf(350,s.x-44),48)
	action_button.position = Vector2((s.x-action_button.size.x)/2,s.y-80 if not mobile else s.y-214)
	hint_label.position = Vector2(0,s.y-27)
	hint_label.size = Vector2(s.x,20)
	hint_label.visible = not mobile and not build_mode and not is_instance_valid(modal)
	var status_y := 100.0 if mobile else 88.0
	if unsaved_changes and not save_locked: status_y = retry_save_button.position.y+retry_save_button.size.y+8
	status_label.position = Vector2(16,status_y)
	status_label.size = Vector2(s.x-32,44)
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	joystick_base.position = Vector2(28,s.y-157)
	joystick_base.size = Vector2(104,104)
	joystick_base.visible = (mobile or OS.has_feature("mobile") or touch_id>=0) and not build_mode and not is_instance_valid(modal)
	joystick_knob.size = Vector2(44,44)
	joystick_knob.position = Vector2(30,30)+touch_movement*26
	if is_instance_valid(modal):
		var badge_grid:GridContainer=modal.get_meta("badge_grid") if modal.has_meta("badge_grid") else null
		if is_instance_valid(badge_grid):badge_grid.columns=2 if mobile else 3
		# In a landscape keyboard viewport, retain both touch targets without
		# reducing the editable body to a single clipped label.
		var compact:bool=usable_height<300
		var modal_stack:VBoxContainer=modal.get_child(0)
		modal_stack.add_theme_constant_override("separation",6 if compact else 13)
		if compact:
			var compact_style:StyleBoxFlat=get_theme_stylebox("panel","PanelContainer").duplicate()
			compact_style.set_content_margin_all(8)
			modal.add_theme_stylebox_override("panel",compact_style)
		else:modal.remove_theme_stylebox_override("panel")
		var fixed_buttons:Array[Button]=[]
		for node in modal_stack.get_children():
			if node is Button:fixed_buttons.append(node)
			elif node is HBoxContainer:
				for child in node.get_children():
					if child is Button:fixed_buttons.append(child)
		for fixed in fixed_buttons:
			if not fixed.has_meta("normal_spacing"):
				var original:Dictionary={}
				for style_name in ["normal","hover","pressed","disabled","focus"]:
					original[style_name]=fixed.get_theme_stylebox(style_name).duplicate()
				fixed.set_meta("normal_spacing",original)
			for style_name in fixed.get_meta("normal_spacing"):
				var fixed_style:StyleBoxFlat=fixed.get_meta("normal_spacing")[style_name].duplicate()
				if compact:fixed_style.content_margin_top=8;fixed_style.content_margin_bottom=8
				fixed.add_theme_stylebox_override(style_name,fixed_style)
			fixed.custom_minimum_size.y=44 if compact else 46
		var preferred_width:float=float(modal.get_meta("preferred_width",500.0))
		var preferred_height:float=float(modal.get_meta("preferred_height",520.0))
		var margin:=12.0 if mobile else 24.0
		var modal_width:=minf(preferred_width,s.x-margin*2)
		var modal_height:=minf(preferred_height,usable_height-(8 if compact else 32))
		if modal.get_meta("fit_content",false):
			var stack:VBoxContainer=modal.get_child(0)
			var wanted:float=modal.get_theme_stylebox("panel").get_minimum_size().y
			var visible_count:=0
			for child in stack.get_children():
				if child is Control and child.visible:
					visible_count+=1
					if child is ScrollContainer and child.get_child_count()>0:
						wanted+=child.get_child(0).get_combined_minimum_size().y
					else:wanted+=child.get_combined_minimum_size().y
			wanted+=maxi(0,visible_count-1)*stack.get_theme_constant("separation")
			modal_height=minf(wanted,minf(usable_height-24,usable_height*0.8 if not mobile else usable_height-24))
		var top:=4.0 if compact else (maxf(16,usable_height-modal_height-12) if mobile else maxf(16,(usable_height-modal_height)*0.5))
		if is_instance_valid(note_body_scroll):
			note_body_scroll.custom_minimum_size.y=clampf(modal_height-(116 if compact else 175),44 if compact else 24,80)
		if is_instance_valid(note_editor):
			note_editor.custom_minimum_size.y=120 if keyboard_height>0 or usable_height<600 else 190
		if is_instance_valid(note_history_button):
			note_history_button.visible=usable_height>=380 and keyboard_height<=0
		modal.position=Vector2((s.x-modal_width)*0.5,top)
		modal.size=Vector2(modal_width,modal_height)
	if is_instance_valid(build_bar):
		build_bar.position = Vector2(12,s.y-181)
		build_bar.size = Vector2(s.x-24,156)
	if is_instance_valid(camera):
		camera.size = 13.5 if location=="town" else 10.0
		if mobile:
			camera.keep_aspect = Camera3D.KEEP_WIDTH
			camera.size = 10.0 if location=="town" else 8.5
		else:
			camera.keep_aspect = Camera3D.KEEP_HEIGHT

func ui_safe_rect() -> Rect2:
	var screen_rect := Rect2(Vector2.ZERO,get_viewport_rect().size)
	if safe_area_override.size.x>0 and safe_area_override.size.y>0:
		return screen_rect.intersection(safe_area_override)
	if OS.has_feature("mobile"):
		var native_rect := Rect2(DisplayServer.get_display_safe_area())
		native_rect.position -= Vector2(get_window().position)
		var safe := screen_rect.intersection(native_rect)
		if safe.size.x>0 and safe.size.y>0:return safe
	return screen_rect

func ui_keyboard_height() -> float:
	if keyboard_height_override>=0:return keyboard_height_override
	return float(DisplayServer.virtual_keyboard_get_height()) if OS.has_feature("mobile") else 0.0

func change_location(place: String) -> void:
	pending_mascot_reaction=""
	room_exit_latched = false
	clear_touch()
	route.clear()
	queued_interaction = ""
	close_modal()
	end_build()
	if is_instance_valid(world):
		scene_view.remove_child(world)
		world.queue_free()
	location = place
	world = World.new(place)
	scene_view.add_child(world)
	player = CharacterBody3D.new()
	player.name = "Player"
	var collision := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.29
	shape.height = 0.9
	collision.shape = shape
	collision.position.y = 0.45
	player.add_child(collision)
	world.add_child(player)
	mascot = Art.mascot(player)
	mascot.scale = Vector3.ONE*1.25
	mascot_motion.bind(mascot)
	if place == "town":
		player.position = Vector3(0,0.12,3.8)
		if previous_door != "":
			for point in world.hotspots:
				if point.id == previous_door and elapsed > 1:
					player.position = point.pos+Vector3(0,0.12,0.45)
		camera_target = Vector3(0,0,-1.6)
	else:
		player.position = Vector3(0,0.12,2.55)
		camera_target = Vector3(0,0,0)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 13.5 if place=="town" else 10.0
	camera.far = 100
	world.add_child(camera)
	camera.position = camera_target+camera_offset
	camera.look_at(camera_target)
	setup_navigation()
	refresh_furniture()
	world.show_memories(state.notes)
	world.show_creation(state.creative.work(state.creative.home.studio.displayId))
	refresh_hud()
	layout_ui()

func setup_navigation() -> void:
	navigation = AStarGrid2D.new()
	navigation.region = Rect2i(-24,-26,48,46) if location=="town" else Rect2i(-9,-8,19,17)
	navigation.cell_size = Vector2(0.5,0.5)
	navigation.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	navigation.update()
	for x in range(navigation.region.position.x,navigation.region.end.x):
		for z in range(navigation.region.position.y,navigation.region.end.y):
			var p := Vector2(x*0.5,z*0.5)
			for area in world.blockers:
				if area.has_point(p):
					navigation.set_point_solid(Vector2i(x,z))
	if location == "home":
		for item in state.placements:
			if item.kind == "rug":
				continue
			var r := Catalog.placement_rect(item)
			for x in range(r.position.x,r.end.x+1):
				for z in range(r.position.y,r.end.y+1):
					if navigation.is_in_boundsv(Vector2i(x,z)):
						navigation.set_point_solid(Vector2i(x,z))

func navigate_to(target: Vector3) -> bool:
	var start := Vector2i(roundi(player.position.x/0.5),roundi(player.position.z/0.5))
	var end := Vector2i(roundi(target.x/0.5),roundi(target.z/0.5))
	if not navigation.is_in_boundsv(end) or navigation.is_point_solid(end):
		return false
	if navigation.is_point_solid(start):
		# A placed item can be next to the player. Find a safe adjacent start without teleporting.
		for offset in [Vector2i(1,0),Vector2i(-1,0),Vector2i(0,1),Vector2i(0,-1)]:
			if navigation.is_in_boundsv(start+offset) and not navigation.is_point_solid(start+offset):
				start += offset
				break
	route = navigation.get_point_path(start,end)
	if not route.is_empty() and Vector2(player.position.x,player.position.z).distance_to(route[0])<0.3:
		route.remove_at(0)
	return not route.is_empty()

func _physics_process(delta: float) -> void:
	if not is_instance_valid(player):
		return
	elapsed += delta
	ui_metrics_timer-=delta
	if ui_metrics_timer<=0:
		ui_metrics_timer=0.15
		if not is_equal_approx(ui_keyboard_height(),last_keyboard_height) or ui_safe_rect()!=last_safe_rect:
			layout_ui()
	light_update_timer-=delta
	if light_update_timer<=0:
		world.update_light_budget(player.position)
		light_update_timer=0.35
	var direction := Vector2.ZERO
	if not transitioning and not build_mode and not is_instance_valid(modal):
		var keys := Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
		if keys.length()>0 or touch_movement.length()>0.1:
			keys += touch_movement
			keys = keys.limit_length()
			var right := Vector2(camera.global_basis.x.x,camera.global_basis.x.z).normalized()
			var down := Vector2(camera.global_basis.z.x,camera.global_basis.z.z).normalized()
			direction = (right*keys.x+down*keys.y).limit_length()
			route.clear()
			queued_interaction = ""
		elif not route.is_empty():
			var offset := route[0]-Vector2(player.position.x,player.position.z)
			if offset.length()<0.13:
				route.remove_at(0)
			else:
				direction = offset.normalized()
	player.velocity.x = direction.x*3.0
	player.velocity.z = direction.y*3.0
	player.velocity.y = -1.0 if player.is_on_floor() else maxf(-10,player.velocity.y-18*delta)
	player.move_and_slide()
	# Walking through a doorway is an interaction too. Trigger on the supported
	# indoor threshold, before the decorative cutaway's former drop-off.
	if location!="town" and not transitioning and not build_mode and not is_instance_valid(modal):
		if player.position.z<3.2:room_exit_latched=false
		if not room_exit_latched and player.position.z>=3.6 and absf(player.position.x)<=1.45 and direction.y>0.01:
			room_exit_latched=true
			transition_to("town")
	if direction.length()>0.1:
		mascot.rotation.y = lerp_angle(mascot.rotation.y,atan2(direction.x,direction.y),minf(1,delta*12))
	mascot_motion.set_context(str(modal.get_meta("mascot_mood","curious")) if is_instance_valid(modal) else ("focused" if build_mode else "idle"))
	mascot_motion.step(delta,direction.length()>0.1)
	update_nearby()
	if not queued_interaction.is_empty() and route.is_empty():
		var target := queued_interaction
		queued_interaction = ""
		if not nearby.is_empty() and nearby.id==target:
			interact()
	var small_screen := get_viewport_rect().size.x/ui_density < 760
	var target_focus := Vector3(player.position.x*0.62,0,player.position.z*0.62-0.5) if location=="town" else Vector3.ZERO
	if small_screen:
		target_focus = Vector3(player.position.x,0,player.position.z-0.4)
	camera_target = camera_target.lerp(target_focus,1-exp(-delta*2.3))
	# Snap the orthographic camera focus to world pixels, avoiding subpixel swimming.
	var focus := snap_camera_focus(camera_target)
	camera.position = focus+camera_offset
	camera.look_at(focus)
	for i in world.wind_objects.size():
		world.wind_objects[i].rotation.z = sin(elapsed*0.7+i)*0.009
	if is_instance_valid(world.npc_model):
		world.npc_model.rotation.y = sin(elapsed*0.35)*0.10

func snap_camera_focus(target: Vector3) -> Vector3:
	var pixel := camera.size/float(scene_view.size.x if camera.keep_aspect==Camera3D.KEEP_WIDTH else scene_view.size.y)
	# Quantize the camera's screen axes, not world X/Z: at an oblique angle a
	# world-grid step is fractional in screen pixels and causes visible crawling.
	var right := camera.basis.x
	var up := camera.basis.y
	var depth := camera.basis.z
	return right*snappedf(target.dot(right),pixel)+up*snappedf(target.dot(up),pixel)+depth*target.dot(depth)

func update_nearby() -> void:
	nearby = {}
	var best := 1.45
	for point in world.hotspots:
		var distance := Vector2(player.position.x-point.pos.x,player.position.z-point.pos.z).length()
		var on_exit_landing:bool = location!="town" and point.id=="town" and absf(player.position.x)<=1.35 and player.position.z>=3.1
		if distance<best or on_exit_landing:
			nearby = point
			best = distance
	action_button.visible = not nearby.is_empty() and not build_mode and not is_instance_valid(modal) and not transitioning
	if not nearby.is_empty():
		action_button.text = nearby.name + "  E"

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode==KEY_ESCAPE:
			if transitioning:
				cancel_transition()
			elif is_instance_valid(modal):
				close_modal()
			elif build_mode:
				end_build()
			else:
				route.clear()
				queued_interaction = ""
			get_viewport().set_input_as_handled()
			return
		if is_instance_valid(modal) or transitioning:
			return
		match event.keycode:
			KEY_E: interact()
			KEY_N: show_note()
			KEY_B: toggle_build()
			KEY_R:
				if build_mode: rotate_ghost()
			KEY_ENTER:
				if build_mode: commit_placement()
			KEY_DELETE:
				if build_mode and moving_id>=0: return_selected()
			KEY_F6:
				capture("manual-"+str(Time.get_unix_time_from_system()).replace(".","-"))
	if event is InputEventMouseButton and event.pressed:
		if event.button_index==MOUSE_BUTTON_RIGHT:
			if build_mode: end_build()
			else: route.clear()
		elif event.button_index==MOUSE_BUTTON_LEFT and touch_id<0:
			world_click(event.position)
	if event is InputEventMouseMotion and build_mode and not selected_kind.is_empty() and not is_instance_valid(modal):
		update_ghost_at(event.position)

func _input(event: InputEvent) -> void:
	if transitioning and ((event is InputEventScreenTouch and event.pressed) or (event is InputEventMouseButton and event.pressed and event.button_index==MOUSE_BUTTON_LEFT)):
		cancel_transition()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventScreenTouch:
		if event.pressed and touch_id<0 and not is_instance_valid(modal) and not transitioning:
			# UI owns its touch for the whole gesture, including a drag off the button.
			# Checking only on release lets the joystick move the actor under a button.
			if screen_over_controls(event.position):return
			touch_id = event.index
			touch_origin = event.position
			touch_current = event.position
			var local_touch:Vector2 = (event.position-hud.position)/ui_density
			touch_joystick = local_touch.x<hud.size.x*0.36 and local_touch.y>hud.size.y*0.60 and not build_mode
		elif not event.pressed and event.index==touch_id:
			if not event.canceled and not touch_joystick and touch_origin.distance_to(event.position)<18*ui_density:
				# UI controls receive their own tap. Only the world rectangle is handled here.
				if not screen_over_controls(event.position):
					world_click(event.position)
			clear_touch()
	if event is InputEventScreenDrag and event.index==touch_id:
		touch_current = event.position
		if touch_joystick:
			touch_movement = ((touch_current-touch_origin)/(52*ui_density)).limit_length()
			joystick_knob.position = Vector2(30,30)+touch_movement*26

func screen_over_controls(p: Vector2) -> bool:
	for control in [note_button,build_button,action_button,retry_save_button,build_bar,modal]:
		if is_instance_valid(control) and control.visible and control.get_global_rect().has_point(p):
			return true
	return false

func clear_touch() -> void:
	touch_id = -1
	touch_movement = Vector2.ZERO
	touch_joystick = false
	if is_instance_valid(joystick_knob):
		joystick_knob.position = Vector2(30,30)

func pause_input() -> void:
	pending_mascot_reaction=""
	mascot_motion.set_suspended(true)
	clear_touch()
	route.clear()
	queued_interaction=""

func _notification(what:int) -> void:
	if what==NOTIFICATION_APPLICATION_RESUMED:mascot_motion.set_suspended(false)
	if what==NOTIFICATION_APPLICATION_PAUSED and is_instance_valid(hud):
		pause_input()
		if unsaved_changes:save()

func ground_point(screen: Vector2) -> Variant:
	if not image.get_global_rect().has_point(screen): return null
	var point := (screen-image.position)/image.size*Vector2(scene_view.size)
	return Plane(Vector3.UP,0).intersects_ray(camera.project_ray_origin(point),camera.project_ray_normal(point))

func world_click(screen: Vector2) -> void:
	if transitioning or is_instance_valid(modal):
		return
	var p = ground_point(screen)
	if p == null:
		return
	var hit:=pick_world(screen)
	if build_mode:
		if selected_kind.is_empty():
			if not hit.is_empty() and hit.collider.has_meta("furniture_id"):
				select_existing_id(int(hit.collider.get_meta("furniture_id")))
			else:
				select_existing(p)
		else:
			update_ghost_at(screen)
		return
	if not hit.is_empty() and hit.collider.has_meta("door_id"):
		var door_id:String=hit.collider.get_meta("door_id")
		for point in world.hotspots:
			if point.id==door_id:
				if navigate_to(point.pos): queued_interaction=door_id
				elif player.position.distance_to(point.pos)<1.45:
					nearby=point
					interact()
				return
	for point in world.hotspots:
		if Vector2(p.x-point.pos.x,p.z-point.pos.z).length()<1.10:
			if navigate_to(point.pos):
				queued_interaction = point.id
			elif player.position.distance_to(point.pos)<1.45:
				nearby = point
				interact()
			return
	queued_interaction = ""
	navigate_to(p)

func pick_world(screen:Vector2) -> Dictionary:
	if not image.get_global_rect().has_point(screen):return {}
	var point:Vector2=(screen-image.position)/image.size*Vector2(scene_view.size)
	var origin:=camera.project_ray_origin(point)
	var query:=PhysicsRayQueryParameters3D.create(origin,origin+camera.project_ray_normal(point)*100.0)
	query.exclude=[player.get_rid()]
	return world.get_world_3d().direct_space_state.intersect_ray(query)

func interact() -> void:
	if nearby.is_empty() or transitioning or build_mode:
		return
	mascot_motion.react("curious",0.9)
	match nearby.kind:
		"door": transition_to(nearby.id)
		"shop": show_shop()
		"note": show_note()
		"observation": creative_panel.book()
		"creative": creative_panel.studio()
		"badges": badge_panel.cabinet()
		"displayed-work": creative_panel.work_page(state.creative.home.studio.displayId)

func transition_to(place: String) -> void:
	if transitioning:
		return
	transitioning = true
	clear_touch()
	route.clear()
	if location=="town":
		previous_door = place
	transition_tween = create_tween()
	transition_tween.tween_property(fade,"color:a",1.0,0.24)
	transition_tween.tween_callback(func(): change_location(place))
	transition_tween.tween_property(fade,"color:a",0.0,0.28)
	transition_tween.tween_callback(func(): transitioning=false)

func cancel_transition() -> void:
	# A cancelled auto-exit remains cancelled until the player steps back, or
	# explicitly uses E/the interaction button. The physical landing stays safe.
	room_exit_latched = true
	if is_instance_valid(transition_tween):
		transition_tween.kill()
	fade.color.a = 0
	transitioning = false
	clear_touch()

func refresh_hud() -> void:
	if not is_instance_valid(title_label):
		return
	title_label.text = {"town":"旷野 · 暮色小镇","home":"小家","shop":"阿榆的木匠铺","studio":"生活画室"}.get(location,"旷野")
	subtitle_label.text = {"town":"把生活的一点发现，带回家。","home":"你留下的发现，会变成墙上的小画。","shop":"看看实物，再慢慢挑。","studio":"写下一点看见的、完成的、创造的。"}[location]
	title_label.visible=not is_instance_valid(modal)
	coins_label.visible=not is_instance_valid(modal)
	coins_label.text = "微光  %d%s" % [state.coins," · 待保存" if unsaved_changes else ""]
	retry_save_button.visible = unsaved_changes and not save_locked and not is_instance_valid(modal)
	build_button.visible = location=="home" and not build_mode and not is_instance_valid(modal)
	note_button.visible = not build_mode and not is_instance_valid(modal)
	if build_mode or is_instance_valid(modal) or transitioning:
		action_button.visible = false
	layout_ui()

func save() -> bool:
	unsaved_changes = true
	if save_locked:
		status("旧存档格式未识别，未覆盖。当前探索只留在本次运行。")
		refresh_hud()
		return false
	if not state.save_data():
		status(state.last_error)
		refresh_hud()
		return false
	unsaved_changes = false
	refresh_hud()
	return true

func mascot_feedback(mood:String) -> void:
	if is_instance_valid(modal):pending_mascot_reaction=mood
	else:mascot_motion.react(mood)

func saved_status(persisted: bool, success_text: String) -> void:
	if persisted:
		status(success_text)
	elif save_locked:
		status("旧存档格式未识别，已保留原文件。这次变化只留在本次运行。")
	else:
		status("这次变化仍在本次会话里，还没存到本机；请点「重试保存」。")

func status(text: String) -> void:
	status_label.text = text
	var this_text := text
	get_tree().create_timer(4.8).timeout.connect(func():
		if is_instance_valid(status_label) and status_label.text==this_text: status_label.text="")

func make_modal(title: String,preferred_width:=500.0,preferred_height:=520.0) -> VBoxContainer:
	close_modal(false)
	if not unsaved_changes:status_label.text=""
	route.clear()
	queued_interaction = ""
	clear_touch()
	modal_shade = ColorRect.new()
	modal_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_shade.color = Color(0.05,0.08,0.07,0.30)
	modal_shade.gui_input.connect(func(e):
		if e is InputEventMouseButton and e.pressed and e.button_index==MOUSE_BUTTON_LEFT: close_modal())
	hud.add_child(modal_shade)
	modal = PanelContainer.new()
	modal.set_meta("preferred_width",preferred_width)
	modal.set_meta("preferred_height",preferred_height)
	hud.add_child(modal)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation",13)
	modal.add_child(v)
	var top := HBoxContainer.new()
	v.add_child(top)
	var heading := label(title,22)
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(heading)
	top.add_child(button("×",close_modal))
	refresh_hud()
	layout_ui()
	return v

func close_modal(resume_world:=true) -> void:
	if creative_panel!=null:creative_panel.cancel_media()
	var focused:=get_viewport().gui_get_focus_owner()
	if is_instance_valid(focused) and is_instance_valid(modal) and modal.is_ancestor_of(focused):focused.release_focus()
	if DisplayServer.has_feature(DisplayServer.FEATURE_VIRTUAL_KEYBOARD):DisplayServer.virtual_keyboard_hide()
	if is_instance_valid(note_editor):
		note_draft = note_editor.text
		if OS.has_feature("mobile"):DisplayServer.virtual_keyboard_hide()
	note_editor = null
	note_body_scroll = null
	note_history_button = null
	if is_instance_valid(modal):
		modal.queue_free()
	modal = null
	if is_instance_valid(modal_shade):
		modal_shade.queue_free()
	modal_shade = null
	if resume_world and not pending_mascot_reaction.is_empty():
		mascot_motion.react(pending_mascot_reaction)
		pending_mascot_reaction=""
	refresh_hud()

func show_shop() -> void:
	var v := make_modal("选一件带回家",540.0,540.0)
	v.add_child(label("手里有 %d 微光" % state.coins,17,"edcf94"))
	var caption_text := "阿榆把木屑拂开，给你看看今天的家具。"
	if unsaved_changes:
		caption_text = "旧存档已保留，这次变化仅在当前会话。" if save_locked else "还没保存到本机，关窗后可点「重试保存」。"
	var caption := label(caption_text,14,"e7c48e" if unsaved_changes else "c3cab5")
	caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(caption)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size.y = 80
	v.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation",8)
	scroll.add_child(list)
	for kind in Catalog.ITEMS:
		var data: Dictionary = Catalog.ITEMS[kind]
		var row := button("%s   ·   %d 微光" % [data.name,data.price],func(): buy_item(kind))
		row.alignment = HORIZONTAL_ALIGNMENT_LEFT
		row.disabled = state.coins<int(data.price)
		list.add_child(row)
	var allowance := label("试作初始 120 微光。无充值、无断签惩罚。",12,"9dad9d")
	allowance.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(allowance)

func buy_item(kind: String) -> void:
	if state.buy(kind):
		var persisted := save()
		saved_status(persisted,"已收好「%s」，回小家就能布置。" % Catalog.ITEMS[kind].name)
		refresh_hud()
		show_shop()
	else:
		status(state.last_error)

func show_note() -> void:
	if build_mode: end_build()
	var v := make_modal("把今天带回来",500.0,500.0)
	note_body_scroll = ScrollContainer.new()
	note_body_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	note_body_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	note_body_scroll.follow_focus = true
	v.add_child(note_body_scroll)
	var writing_body := VBoxContainer.new()
	writing_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	writing_body.add_theme_constant_override("separation",12)
	note_body_scroll.add_child(writing_body)
	var caption := label("写一点真实看见的、做过的，或正在长出来的想法。",14,"c3cab5")
	caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	writing_body.add_child(caption)
	var edit := TextEdit.new()
	modal.set_meta("mascot_mood","focused")
	note_editor = edit
	edit.text = note_draft
	edit.placeholder_text = "比如：路边桂花的香味，走过拐角后才闻见。"
	edit.custom_minimum_size.y = 190
	edit.size_flags_vertical = Control.SIZE_EXPAND_FILL
	edit.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	edit.text_changed.connect(func():
		if edit.text.length()>600:
			var line := edit.get_caret_line()
			var column := edit.get_caret_column()
			edit.text = edit.text.left(600)
			edit.set_caret_line(line)
			edit.set_caret_column(column))
	writing_body.add_child(edit)
	var helper := label("本地保存。每天第一条留下 5 微光，不设连续打卡。",12,"9dad9d")
	helper.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	writing_body.add_child(helper)
	var keep := button("收进生活小记",func():
		var date := Time.get_date_string_from_system()
		if state.add_note(edit.text,date):
			var persisted := save()
			world.show_memories(state.notes)
			edit.text = ""
			note_draft = ""
			close_modal()
			if persisted:mascot_feedback("happy")
			saved_status(persisted,"已收好。小家与画室多了一幅属于今天的小画。")
			refresh_hud()
		else: status("留下一点内容，再收好吧。"))
	v.add_child(keep)
	writing_body.add_child(button("观察册与作品集",func():creative_panel.book()))
	if not state.notes.is_empty():
		note_history_button=button("翻看生活小记 · %d 条" % state.notes.size(),show_history)
		v.add_child(note_history_button)
	layout_ui()
	edit.grab_focus()

func show_history(page:=0) -> void:
	var page_size:=20
	var last_page:=maxi(0,ceili(state.notes.size()/float(page_size))-1)
	page=clampi(page,0,last_page)
	var v:=make_modal("生活小记")
	var scroll:=ScrollContainer.new()
	scroll.custom_minimum_size.y=80
	scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
	v.add_child(scroll)
	var records:=VBoxContainer.new()
	records.name="HistoryRecords"
	records.add_theme_constant_override("separation",15)
	records.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	scroll.add_child(records)
	var start:=state.notes.size()-1-page*page_size
	for index in range(start,maxi(-1,start-page_size),-1):
		var note:Dictionary=state.notes[index]
		var entry:=VBoxContainer.new()
		entry.add_theme_constant_override("separation",5)
		entry.add_child(label(note.date,12,"a8b5a0"))
		var text:=label(note.text,16,"eee2cb")
		text.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
		text.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		entry.add_child(text)
		records.add_child(entry)
	if state.notes.is_empty():records.add_child(label("还没有小记。今天从一句话开始就好。",14))
	var navigation_row:=HBoxContainer.new()
	navigation_row.add_theme_constant_override("separation",7)
	v.add_child(navigation_row)
	if page>0:navigation_row.add_child(button("新一些",func():show_history(page-1)))
	if page<last_page:navigation_row.add_child(button("更早的",func():show_history(page+1)))
	navigation_row.add_child(button("继续写",show_note))
	v.add_child(label("%d / %d 页 · 全部留在本机" % [page+1,last_page+1],12,"9dad9d"))

func toggle_build() -> void:
	if location!="home" or is_instance_valid(modal):
		return
	if build_mode:
		end_build()
		return
	build_mode = true
	route.clear()
	queued_interaction = ""
	clear_touch()
	world.grid_root.visible = true
	show_build_bar()
	refresh_hud()
	status("选家具，指向空格，再按「放下」。点已有家具可移动。")

func show_build_bar() -> void:
	if is_instance_valid(build_bar):
		build_bar.queue_free()
	build_bar = PanelContainer.new()
	hud.add_child(build_bar)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation",7)
	build_bar.add_child(v)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	var items := HBoxContainer.new()
	items.add_theme_constant_override("separation",7)
	scroll.add_child(items)
	for kind in Catalog.ITEMS:
		var amount := int(state.inventory.get(kind,0))
		if amount>0:
			items.add_child(button("%s ×%d" % [Catalog.ITEMS[kind].name,amount],func(): choose_item(kind)))
	if items.get_child_count()==0:
		items.add_child(label("家具都已摆好。点一下房里的家具，可以移动。",14))
	var action_scroll := ScrollContainer.new()
	action_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	action_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(action_scroll)
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation",7)
	action_scroll.add_child(actions)
	actions.add_child(button("旋转",rotate_ghost))
	actions.add_child(button("放下",commit_placement))
	if moving_id>=0:
		actions.add_child(button("收回",return_selected))
	actions.add_child(button("完成" if selected_kind.is_empty() else "取消",end_build))
	layout_ui()

func choose_item(kind: String) -> void:
	selected_kind = kind
	moving_id = -1
	selected_rotation = 0
	selected_cell = Vector2i(0,0)
	refresh_ghost()
	show_build_bar()

func select_existing(p: Vector3) -> void:
	var cell := Vector2i(floori(p.x/0.5),floori(p.z/0.5))
	for item in state.placements:
		if Catalog.placement_rect(item).has_point(cell):
			select_existing_id(int(item.id))
			return

func select_existing_id(id:int) -> void:
	for item in state.placements:
		if int(item.id)==id:
			moving_id = int(item.id)
			selected_kind = item.kind
			selected_rotation = int(item.rotation)
			selected_cell = Vector2i(item.x,item.z)
			refresh_ghost()
			show_build_bar()
			return

func update_ghost_at(screen: Vector2) -> void:
	var p = ground_point(screen)
	if p!=null:
		selected_cell = Vector2i(floori(p.x/0.5),floori(p.z/0.5))
		refresh_ghost()

func rotate_ghost() -> void:
	if selected_kind.is_empty(): return
	selected_rotation = posmod(selected_rotation+1,4)
	refresh_ghost()

func refresh_ghost() -> void:
	if is_instance_valid(ghost):
		ghost.queue_free()
	if selected_kind.is_empty(): return
	var footprint := Catalog.footprint(selected_kind,selected_rotation)
	ghost_valid = state.can_place(selected_kind,selected_cell.x,selected_cell.y,selected_rotation,moving_id)
	ghost_valid = ghost_valid and not placement_over_player()
	var center := Vector3((selected_cell.x+footprint.x*0.5)*0.5,0.03,(selected_cell.y+footprint.y*0.5)*0.5)
	ghost = Art.group(world,center)
	var visual := Art.furniture(ghost,selected_kind)
	visual.rotation.y = selected_rotation*PI/2
	var highlight := Art.box(ghost,Vector3(0,0,0),Vector3(footprint.x*0.5,0.035,footprint.y*0.5),"a3d8a3" if ghost_valid else "df8373")
	highlight.material_override = Art.mat("a3d8a3" if ghost_valid else "df8373",0.2,0.7)
	set_ghost_material(visual,Art.mat("c0e3af" if ghost_valid else "ec9b8a",0.2,0.70))

func set_ghost_material(node: Node, material: Material) -> void:
	if node is MeshInstance3D:
		node.material_override = material
	if node is Light3D:
		node.visible = false
		node.set_meta("preview_light",true)
	for child in node.get_children():
		set_ghost_material(child,material)

func commit_placement() -> void:
	if selected_kind.is_empty(): return
	if placement_over_player():
		status("给小芽留一点站的位置，再摆下去吧。")
		return
	var ok := false
	if moving_id>=0:
		ok = state.move_item(moving_id,selected_cell.x,selected_cell.y,selected_rotation)
	else:
		ok = state.place(selected_kind,selected_cell.x,selected_cell.y,selected_rotation)>=0
	if not ok:
		status("这里放不下，留出门口与家具之间的空间。")
		return
	var persisted := save()
	saved_status(persisted,"摆好了。取消只会收起预览，不会弄丢家具。")
	selected_kind = ""
	moving_id = -1
	if is_instance_valid(ghost): ghost.queue_free()
	ghost = null
	refresh_furniture()
	show_build_bar()

func placement_over_player() -> bool:
	if selected_kind.is_empty() or selected_kind=="rug": return false
	var r := Rect2(Vector2(selected_cell)*0.5,Vector2(Catalog.footprint(selected_kind,selected_rotation))*0.5).grow(0.29)
	return r.has_point(Vector2(player.position.x,player.position.z))

func return_selected() -> void:
	if moving_id<0: return
	if state.return_item(moving_id):
		var persisted := save()
		selected_kind = ""
		moving_id = -1
		if is_instance_valid(ghost): ghost.queue_free()
		ghost = null
		refresh_furniture()
		show_build_bar()
		saved_status(persisted,"已收进家具箱。")

func end_build() -> void:
	build_mode = false
	selected_kind = ""
	moving_id = -1
	if is_instance_valid(ghost): ghost.queue_free()
	ghost = null
	if is_instance_valid(build_bar): build_bar.queue_free()
	build_bar = null
	if is_instance_valid(world) and is_instance_valid(world.grid_root):
		world.grid_root.visible = false
	refresh_hud()

func refresh_furniture() -> void:
	for child in world.furniture_root.get_children():
		world.furniture_root.remove_child(child)
		child.queue_free()
	if location=="home":
		for item in state.placements:
			var size := Catalog.footprint(item.kind,int(item.rotation))
			var p := Vector3((item.x+size.x*0.5)*0.5,0,(item.z+size.y*0.5)*0.5)
			var n := Art.furniture(world.furniture_root,item.kind,p)
			n.rotation.y = int(item.rotation)*PI/2
			if item.kind!="rug":
				var body := StaticBody3D.new()
				body.set_meta("furniture_id",int(item.id))
				body.position = p+Vector3(0,0.30,0)
				var c := CollisionShape3D.new()
				var shape := BoxShape3D.new()
				shape.size = Vector3(size.x*0.46,0.6,size.y*0.46)
				c.shape = shape
				body.add_child(c)
				world.furniture_root.add_child(body)
	setup_navigation()
	world.update_light_budget(player.position)

func capture(name: String) -> void:
	if DisplayServer.get_name()=="headless": return
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute("res://artifacts")
	get_viewport().get_texture().get_image().save_png("res://artifacts/"+name+".png")
	status("截图已保存："+name)

func qa_check(ok: bool, message: String) -> void:
	test_results.append({"passed":ok,"name":message})
	print(("PASS " if ok else "FAIL ")+message)

func run_integration_qa() -> void:
	await get_tree().process_frame
	if qa_target_size!=Vector2i.ZERO:
		get_window().mode=Window.MODE_WINDOWED
		get_window().unresizable=false
		get_window().size=qa_target_size
		get_window().position=Vector2i(80,90)
		await get_tree().process_frame
		await get_tree().process_frame
		layout_ui()
		qa_check(Vector2i(get_viewport_rect().size)==qa_target_size,"native viewport matches requested graphical QA size")
	qa_check(location=="town" and world.hotspots.size()==4,"town has three usable buildings and a memory bench")
	var start := player.position
	qa_check(navigate_to(Vector3(0,0,1.0)),"tap-navigation produces a walkable path")
	await get_tree().create_timer(1.6).timeout
	qa_check(player.position.distance_to(start)>1.5,"mascot physically walks with collisions")
	await capture("01-town")
	transition_to("shop")
	await get_tree().create_timer(0.8).timeout
	qa_check(location=="shop" and is_instance_valid(world.npc_model),"door enters the furnished NPC shop")
	var before := state.coins
	buy_item("lamp")
	qa_check(state.coins==before-40 and state.inventory.lamp==1,"NPC purchase deducts correct price exactly once")
	await capture("02-shop")
	close_modal()
	transition_to("home")
	await get_tree().create_timer(0.8).timeout
	toggle_build()
	choose_item("lamp")
	selected_cell = Vector2i(0,0)
	rotate_ghost()
	commit_placement()
	qa_check(state.placements.size()==1 and state.placements[0].rotation==1,"building places rotated purchased furniture")
	choose_item("plant")
	var amount: int = state.inventory.plant
	end_build()
	qa_check(state.inventory.plant==amount,"cancelled preview does not consume furniture")
	qa_check(not state.can_place("stool",0,0,0),"overlapping furniture is blocked")
	qa_check(not state.can_place("stool",0,6,0),"door clearance is blocked")
	state.add_note("测试：今天在窗边看见一片被风翻过的叶子。","2026-10-08")
	world.show_memories(state.notes)
	save()
	var reloaded := State.new()
	reloaded.path = state.path
	qa_check(reloaded.load_data() and reloaded.placements==state.placements and reloaded.notes==state.notes and reloaded.coins==state.coins,"saved note, coins, and placements survive reopening")
	await capture("03-home")
	transition_to("town")
	cancel_transition()
	await get_tree().create_timer(0.7).timeout
	qa_check(location=="home" and not transitioning,"cancelled transition stays in the room")
	change_location("studio")
	qa_check(world.memory_root.get_child_count()>0,"real note appears on studio wall")
	await capture("04-studio")
	touch_id = 7
	touch_movement = Vector2.ONE
	clear_touch()
	qa_check(touch_id==-1 and touch_movement==Vector2.ZERO,"focus loss clears touch movement")
	var file := FileAccess.open("res://artifacts/integration-results.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(test_results,"\t"))
	file.close()
	var failed := test_results.filter(func(x):return not x.passed).size()
	print("INTEGRATION: %d passed, %d failed" % [test_results.size()-failed,failed])
	get_tree().quit(0 if failed==0 else 1)
