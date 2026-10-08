extends Control

const PIXEL := Vector2i(480, 216)
const SPEED := 2.35
const RADIUS := 0.26

var vp: SubViewport
var container: SubViewportContainer
var camera: Camera3D
var world_env: WorldEnvironment
var sun: DirectionalLight3D
var cam_offset := Vector3.ZERO
var cam_look := Vector3(0, 0.32, 0)
var cam_fixed := false
var cam_basis := Basis.IDENTITY
var places := {}
var items: Node3D
var grid: MeshInstance3D
var npc: Node3D
var plaques: Array = []
var player: Node3D
var mascot: Node3D
var state: Dictionary = {}
var place_id := "town"
var build_mode := false
var shop_open := false
var editor_open := false
var held_uid := ""
var selected_uid := ""
var ghost: MeshInstance3D
var font: Font
var stick_id := -1
var stick_origin := Vector2.ZERO
var stick_vec := Vector2.ZERO
var touch_seen := false
var door_cool := 0.0
var ui_hits: Array = []
var coin_label: Label
var coin_icon: TextureRect
var build_icon: Texture2D
var walk_icon: Texture2D
var build_button: Button
var near_button: Button
var shop_panel: PanelContainer
var shop_list: VBoxContainer
var build_bar: HBoxContainer
var rotate_button: Button
var sell_button: Button
var editor_panel: PanelContainer
var task_field: LineEdit
var task_row: HBoxContainer
var joy_base: Panel
var joy_knob: Panel
var fade: ColorRect
var shot_mode := false
var busy := false

func _ready() -> void:
	font = load("res://fonts/wqy-microhei.ttc")
	if font == null:
		var fallback := SystemFont.new()
		fallback.font_names = PackedStringArray(["WenQuanYi Micro Hei", "Droid Sans Fallback"])
		font = fallback
	var theme := Theme.new()
	theme.default_font = font
	theme.default_font_size = 28
	self.theme = theme
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_view()
	var built := WorldBuild.build(font)
	vp.add_child(built.root)
	places = built.places
	items = built.items
	grid = built.grid
	npc = built.npc
	plaques = built.plaques
	player = Node3D.new()
	player.name = "Player"
	mascot = Mascot.create()
	player.add_child(mascot)
	vp.add_child(player)
	_build_ui()
	state = SaveStore.load_state()
	_enter(str(state.get("place", "town")), false)
	if state.get("pos") is Array and state.pos.size() >= 2:
		_move_player(Vector3(float(state.pos[0]), 0, float(state.pos[1])), float(state.get("yaw", 0)))
	_sync_items()
	_refresh_ui()
	var args := OS.get_cmdline_user_args()
	if args.has("--shot"):
		shot_mode = true
		var which := "all"
		var idx := args.find("--shot")
		if idx >= 0 and idx + 1 < args.size():
			which = args[idx + 1]
		call_deferred("_run_shots", which)

func _build_view() -> void:
	container = SubViewportContainer.new()
	container.stretch = true
	container.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	container.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(container)
	vp = SubViewport.new()
	vp.size = PIXEL
	vp.own_world_3d = true
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.msaa_3d = Viewport.MSAA_DISABLED
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_DISABLED
	vp.positional_shadow_atlas_size = 2048
	vp.handle_input_locally = false
	container.add_child(vp)
	world_env = WorldEnvironment.new()
	world_env.environment = _make_env(false)
	vp.add_child(world_env)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -28, 0)
	sun.light_color = Color.html("#ffc48a")
	sun.light_energy = 0.66
	sun.shadow_enabled = true
	sun.shadow_blur = 1.35
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 30.0
	sun.shadow_bias = 0.05
	sun.shadow_normal_bias = 0.08
	sun.light_angular_distance = 1.15
	vp.add_child(sun)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.current = true
	camera.near = 0.05
	camera.far = 80.0
	vp.add_child(camera)
	ghost = MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.45, 0.06, 0.45)
	ghost.mesh = box
	ghost.visible = false
	ghost.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	vp.add_child(ghost)

func _make_env(indoors: bool) -> Environment:
	var env := Environment.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color.html("#56748c")
	sky_mat.sky_horizon_color = Color.html("#e2b08a")
	sky_mat.sky_curve = 0.18
	sky_mat.ground_horizon_color = Color.html("#b08968")
	sky_mat.ground_bottom_color = Color.html("#5c4b3e")
	sky_mat.sun_angle_max = 8.0
	sky_mat.energy_multiplier = 0.22
	var sky := Sky.new()
	sky.sky_material = sky_mat
	if indoors:
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color.html("#1a1410")
	else:
		env.background_mode = Environment.BG_SKY
		env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.html("#a08068") if indoors else Color.html("#cbb59a")
	env.ambient_light_energy = 0.42 if indoors else 0.4
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.8 if indoors else 0.8
	env.tonemap_white = 4.2 if indoors else 6.0
	env.glow_enabled = false
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.16 if indoors else 1.06
	env.adjustment_saturation = 1.02 if indoors else 1.08
	return env

func _build_ui() -> void:
	fade = ColorRect.new()
	fade.color = Color("#1c171400")
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(fade)
	coin_icon = TextureRect.new()
	coin_icon.texture = _coin_texture()
	coin_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	coin_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	coin_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(coin_icon)
	coin_label = Label.new()
	coin_label.position = Vector2(28, 22)
	coin_label.add_theme_font_size_override("font_size", 34)
	coin_label.add_theme_color_override("font_color", Color.html("#e6b15a"))
	coin_label.add_theme_color_override("font_shadow_color", Color.html("#3a2a22"))
	coin_label.add_theme_constant_override("shadow_offset_x", 2)
	coin_label.add_theme_constant_override("shadow_offset_y", 2)
	add_child(coin_label)
	ui_hits.append(coin_label)
	build_icon = _mode_texture(false)
	walk_icon = _mode_texture(true)
	build_button = _button("布置")
	build_button.icon = build_icon
	build_button.expand_icon = true
	build_button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	build_button.pressed.connect(_toggle_build)
	add_child(build_button)
	ui_hits.append(build_button)
	near_button = _button("买")
	near_button.pressed.connect(_open_shop)
	add_child(near_button)
	ui_hits.append(near_button)
	rotate_button = _button("转")
	rotate_button.pressed.connect(_rotate_selected)
	add_child(rotate_button)
	ui_hits.append(rotate_button)
	sell_button = _button("收")
	sell_button.pressed.connect(_recycle_selected)
	add_child(sell_button)
	ui_hits.append(sell_button)
	build_bar = HBoxContainer.new()
	build_bar.add_theme_constant_override("separation", 8)
	add_child(build_bar)
	ui_hits.append(build_bar)
	shop_panel = PanelContainer.new()
	shop_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.23, 0.16, 0.13, 0.94)))
	shop_panel.visible = false
	add_child(shop_panel)
	ui_hits.append(shop_panel)
	shop_list = VBoxContainer.new()
	shop_list.add_theme_constant_override("separation", 6)
	shop_panel.add_child(shop_list)
	editor_panel = PanelContainer.new()
	editor_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.23, 0.16, 0.13, 0.94)))
	editor_panel.visible = false
	add_child(editor_panel)
	ui_hits.append(editor_panel)
	var editor_box := VBoxContainer.new()
	editor_panel.add_child(editor_box)
	task_field = LineEdit.new()
	task_field.placeholder_text = "今天这一件"
	task_field.max_length = 24
	task_field.custom_minimum_size = Vector2(280, 56)
	editor_box.add_child(task_field)
	var editor_buttons := HBoxContainer.new()
	editor_box.add_child(editor_buttons)
	var ok := _button("记下")
	ok.pressed.connect(_commit_task)
	editor_buttons.add_child(ok)
	var cancel := _button("取消")
	cancel.pressed.connect(_close_editor)
	editor_buttons.add_child(cancel)
	task_row = HBoxContainer.new()
	task_row.add_theme_constant_override("separation", 8)
	add_child(task_row)
	ui_hits.append(task_row)
	joy_base = _circle(148, Color(1, 0.86, 0.7, 0.22))
	joy_knob = _circle(64, Color(1, 0.86, 0.7, 0.45))
	add_child(joy_base)
	add_child(joy_knob)
	joy_base.visible = false
	joy_knob.visible = false

func _button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_stylebox_override("normal", _panel_style(Color.html("#6e4b38")))
	button.add_theme_stylebox_override("hover", _panel_style(Color.html("#81573f")))
	button.add_theme_stylebox_override("pressed", _panel_style(Color.html("#5c3e2e")))
	button.add_theme_color_override("font_color", Color.html("#f6ead8"))
	button.add_theme_font_size_override("font_size", 28)
	return button

func _panel_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(6)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style

func _park_joystick(s: Vector2) -> void:
	var d := s.y * 0.2
	joy_base.size = Vector2(d, d)
	joy_knob.size = Vector2(d * 0.42, d * 0.42)
	_paint_circle(joy_base, Color(0.95, 0.86, 0.74, 0.4))
	_paint_circle(joy_knob, Color(0.98, 0.92, 0.84, 0.82))
	var origin := Vector2(s.x * 0.1, s.y * 0.78)
	joy_base.position = origin - joy_base.size * 0.5
	joy_knob.position = origin - joy_knob.size * 0.5
	joy_base.visible = true
	joy_knob.visible = true

func _paint_circle(panel: Panel, color: Color) -> void:
	var style := panel.get_theme_stylebox("panel") as StyleBoxFlat
	if style == null:
		style = StyleBoxFlat.new()
		panel.add_theme_stylebox_override("panel", style)
	style.bg_color = color
	style.set_corner_radius_all(int(maxf(panel.size.x, panel.size.y)))

func _coin_texture() -> Texture2D:
	var n := 32
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	for y in n:
		for x in n:
			var d := Vector2(x - 15.5, y - 16.5).length()
			if d < 12.5 and d > 9.2:
				img.set_pixel(x, y, Color.html("#c4923e"))
			elif d <= 9.2:
				img.set_pixel(x, y, Color.html("#f0d48a"))
			if y < 13 and y > 5 and abs(x - 16) <= 1:
				img.set_pixel(x, y, Color.html("#7dae4a"))
			if y == 6 and x >= 12 and x <= 20 and abs(x - 16) > 1:
				img.set_pixel(x, y, Color.html("#c7ef90"))
	return ImageTexture.create_from_image(img)

func _mode_texture(walking: bool) -> Texture2D:
	var n := 32
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var ink := Color.html("#f6ead8")
	if walking:
		img.fill_rect(Rect2i(6, 18, 7, 5), ink)
		img.fill_rect(Rect2i(16, 10, 7, 5), ink)
	else:
		for gx in 2:
			for gy in 2:
				img.fill_rect(Rect2i(6 + gx * 11, 6 + gy * 11, 8, 8), ink)
	return ImageTexture.create_from_image(img)

func _circle(diameter: float, color: Color) -> Panel:
	var panel := Panel.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.size = Vector2(diameter, diameter)
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(int(diameter))
	panel.add_theme_stylebox_override("panel", style)
	return panel

func _process(delta: float) -> void:
	_layout_ui()
	if not shot_mode:
		_walk(delta)
	Mascot.animate(mascot, stick_vec.length() > 0.2 or _keys_down(), Time.get_ticks_msec() / 1000.0)
	_follow_camera()
	if door_cool > 0.0:
		door_cool = maxf(0.0, door_cool - delta)
	_refresh_near()

func _keys_down() -> bool:
	return Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_DOWN) or Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_RIGHT)

func _layout_ui() -> void:
	var s := get_viewport_rect().size
	if s.y < 10:
		return
	var pad := s.y * 0.045
	var bh := s.y * 0.11
	var icon := s.y * 0.055
	coin_icon.position = Vector2(pad, pad * 0.7)
	coin_icon.size = Vector2(icon, icon)
	coin_label.position = Vector2(pad + icon + 8, pad * 0.55)
	coin_label.add_theme_font_size_override("font_size", int(clampf(s.y * 0.05, 22, 54)))
	build_button.add_theme_constant_override("icon_max_width", int(bh * 0.55))
	build_button.position = Vector2(s.x - pad - bh * 2.3, s.y - pad - bh)
	build_button.size = Vector2(bh * 2.1, bh)
	if stick_id == -1:
		_park_joystick(s)
	near_button.position = Vector2(s.x - pad - bh * 1.6, s.y * 0.4)
	near_button.size = Vector2(bh * 1.5, bh)
	rotate_button.position = Vector2(s.x - pad - bh * 3.6, s.y - pad - bh)
	rotate_button.size = Vector2(bh * 1.15, bh)
	sell_button.position = Vector2(s.x - pad - bh * 3.6, s.y - pad - bh * 2.2)
	sell_button.size = Vector2(bh * 1.15, bh)
	build_bar.position = Vector2(pad, s.y - pad - bh)
	shop_panel.position = Vector2(s.x * 0.62, pad)
	shop_panel.size = Vector2(s.x * 0.34, s.y - pad * 2)
	editor_panel.position = Vector2(s.x * 0.28, s.y * 0.38)
	task_row.position = Vector2(pad, s.y - pad - 78)

func _walk(delta: float) -> void:
	if busy or shop_open or editor_open or build_mode:
		return
	var screen := _move_axes()
	if screen.length() < 0.08:
		return
	var forward := Vector3(-cam_basis.z.x, 0, -cam_basis.z.z).normalized()
	var right := Vector3(cam_basis.x.x, 0, cam_basis.x.z).normalized()
	var wish := (right * screen.x + forward * screen.y)
	if wish.length() < 0.01:
		return
	wish = wish.normalized()
	var step := wish * SPEED * delta
	var pos := player.global_position
	var xtry := pos + Vector3(step.x, 0, 0)
	if not _blocked(xtry):
		pos.x = xtry.x
	var ztry := pos + Vector3(0, 0, step.z)
	if not _blocked(ztry):
		pos.z = ztry.z
	_move_player(pos, atan2(wish.x, wish.z))
	if door_cool <= 0.0:
		var door := _door_under(pos)
		if not door.is_empty():
			_enter(str(door.to), true)
			if door.has("spawn"):
				_move_player(door.spawn, float(door.yaw))
			door_cool = 0.45
			_remember()
			SaveStore.save_state(state)

func _move_axes() -> Vector2:
	var v := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		v.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		v.x += 1
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		v.y += 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		v.y -= 1
	if stick_vec.length() > 0.12:
		v = Vector2(stick_vec.x, -stick_vec.y)
	return v.limit_length(1.0)

func _blocked(pos: Vector3) -> bool:
	var point := Vector2(pos.x, pos.z)
	for box in places[place_id].boxes:
		var rect: Rect2 = box
		var grown := Rect2(rect.position - Vector2(RADIUS, RADIUS), rect.size + Vector2(RADIUS * 2, RADIUS * 2))
		if grown.has_point(point):
			return true
	return false

func _door_under(pos: Vector3) -> Dictionary:
	var point := Vector2(pos.x, pos.z)
	for door in places[place_id].doors:
		if (door.rect as Rect2).has_point(point):
			return door
	return {}

func _move_player(pos: Vector3, yaw: float) -> void:
	player.global_position = Vector3(pos.x, 0, pos.z)
	player.rotation.y = yaw

func _follow_camera() -> void:
	var anchor := cam_look if cam_fixed else player.global_position + Vector3(0, 0.32, 0)
	var desired := anchor + cam_offset
	var pixel := camera.size / float(PIXEL.y)
	desired.x = round(desired.x / pixel) * pixel
	desired.y = round(desired.y / pixel) * pixel
	desired.z = round(desired.z / pixel) * pixel
	camera.global_transform = Transform3D(cam_basis, desired)

func _apply_rig(offset: Vector3, size: float, look := Vector3(0, 0.32, 0), fixed := false) -> void:
	cam_offset = offset
	cam_look = look
	cam_fixed = fixed
	camera.size = size
	var anchor := look if fixed else Vector3(0, 0.32, 0)
	camera.global_position = anchor + offset
	camera.look_at(anchor, Vector3.UP)
	cam_basis = camera.global_transform.basis

func _enter(id: String, do_save: bool) -> void:
	if not places.has(id):
		id = "town"
	place_id = id
	for key in places.keys():
		places[key].node.visible = key == id
	var place: Dictionary = places[id]
	_move_player(place.spawn, float(place.yaw))
	var offset: Vector3 = place.cam_offset
	var size: float = place.cam_size
	var look: Vector3 = place.get("cam_look", Vector3(0, 0.32, 0))
	var fixed: bool = bool(place.get("cam_fixed", false))
	if id == "home" and build_mode:
		offset = WorldBuild.BUILD_CAM
		size = WorldBuild.BUILD_SIZE
		look = WorldBuild.BUILD_LOOK
		fixed = true
	_apply_rig(offset, size, look, fixed)
	var indoors := id != "town"
	world_env.environment = _make_env(indoors)
	sun.light_energy = 0.5 if indoors else 0.66
	sun.rotation_degrees = Vector3(-54, 36, 0) if indoors else Vector3(-48, -28, 0)
	sun.shadow_blur = 0.2 if indoors else 1.35
	sun.shadow_bias = 0.02 if indoors else 0.05
	if id != "home":
		build_mode = false
		shop_open = false
		grid.visible = false
		ghost.visible = false
	shop_panel.visible = shop_open
	state.place = id
	if do_save and not shot_mode:
		_remember()
		SaveStore.save_state(state)
	_refresh_ui()

func _remember() -> void:
	state.place = place_id
	state.pos = [player.global_position.x, player.global_position.z]
	state.yaw = player.rotation.y

func _toggle_build() -> void:
	if place_id != "home":
		return
	_set_build(not build_mode)

func _set_build(on: bool) -> void:
	build_mode = on and place_id == "home"
	grid.visible = build_mode
	if not build_mode:
		ghost.visible = false
		selected_uid = ""
	if place_id == "home":
		if build_mode:
			_apply_rig(WorldBuild.BUILD_CAM, WorldBuild.BUILD_SIZE, WorldBuild.BUILD_LOOK, true)
		else:
			_apply_rig(WorldBuild.ROOM_CAM, WorldBuild.ROOM_SIZE, WorldBuild.ROOM_LOOK, true)
	_refresh_ui()

func _open_shop() -> void:
	if place_id != "home":
		return
	shop_open = true
	shop_panel.visible = true
	_set_build(false)
	_refresh_ui()

func _close_shop() -> void:
	shop_open = false
	shop_panel.visible = false

func _refresh_near() -> void:
	var show := false
	if place_id == "home" and not build_mode and not shop_open and npc != null:
		show = player.global_position.distance_to(npc.global_position) < 1.25
	near_button.visible = show
	build_button.visible = place_id == "home"
	build_button.text = "走动" if build_mode else "布置"
	build_button.icon = walk_icon if build_mode else build_icon
	rotate_button.visible = build_mode and selected_uid != ""
	sell_button.visible = build_mode and selected_uid != ""
	task_row.visible = place_id == "tasks" and not editor_open
	editor_panel.visible = editor_open

func _refresh_ui() -> void:
	coin_label.text = str(int(state.get("lumens", 0)))
	_refresh_shop()
	_refresh_bar()
	_refresh_tasks()
	_refresh_near()

func _refresh_shop() -> void:
	for child in shop_list.get_children():
		child.queue_free()
	var title := Label.new()
	title.text = "木匠"
	title.add_theme_color_override("font_color", Color.html("#f6ead8"))
	title.add_theme_font_size_override("font_size", 32)
	shop_list.add_child(title)
	for fid in GameRules.SHOP:
		var item := GameRules.furniture(fid)
		var row := Button.new()
		var owned := 0
		for entry in state.inventory:
			if str(entry.fid) == fid:
				owned += 1
		row.text = "%s   %d%s" % [item.name, int(item.price), ("  ×%d" % owned) if owned else ""]
		row.focus_mode = Control.FOCUS_NONE
		row.disabled = int(state.lumens) < int(item.price)
		row.alignment = HORIZONTAL_ALIGNMENT_LEFT
		row.add_theme_font_size_override("font_size", int(clampf(get_viewport_rect().size.y * 0.038, 22, 42)))
		row.add_theme_color_override("font_color", Color.html("#f6ead8"))
		row.add_theme_stylebox_override("normal", _panel_style(Color.html(item.color).darkened(0.45)))
		row.pressed.connect(_buy.bind(fid))
		shop_list.add_child(row)

func _refresh_bar() -> void:
	for child in build_bar.get_children():
		child.queue_free()
	build_bar.visible = build_mode
	if not build_mode:
		return
	var used := {}
	for placed in state.placed:
		used[str(placed.uid)] = true
	for entry in state.inventory:
		if used.has(str(entry.uid)):
			continue
		var item := GameRules.furniture(str(entry.fid))
		var button := _button(item.name)
		button.custom_minimum_size = Vector2(120, 64)
		if str(entry.uid) == held_uid:
			button.add_theme_stylebox_override("normal", _panel_style(Color.html("#e6b15a")))
		button.pressed.connect(_hold.bind(str(entry.uid)))
		build_bar.add_child(button)

func _refresh_tasks() -> void:
	for child in task_row.get_children():
		child.queue_free()
	var tasks: Array = state.get("tasks", [])
	for i in 3:
		var text := "+"
		var id := ""
		if i < tasks.size():
			text = str(tasks[i].text)
			id = str(tasks[i].id)
		var button := _button(text)
		button.custom_minimum_size = Vector2(180, 70)
		button.pressed.connect(_tap_task.bind(id))
		task_row.add_child(button)
		if i < plaques.size():
			plaques[i].label.text = text

func _hold(uid: String) -> void:
	held_uid = uid
	selected_uid = ""
	_refresh_bar()

func _buy(fid: String) -> void:
	var result := GameRules.buy(state, fid)
	if not result.ok:
		return
	held_uid = str(result.item.uid)
	_persist()
	_refresh_ui()

func _tap_task(id: String) -> void:
	if id.is_empty():
		editor_open = true
		task_field.text = ""
		_refresh_near()
		return
	var result := GameRules.complete_task(state, id, Time.get_date_string_from_system())
	if result.ok:
		_persist()
		_refresh_ui()

func _commit_task() -> void:
	if GameRules.add_task(state, task_field.text).ok:
		_persist()
	_close_editor()
	_refresh_ui()

func _close_editor() -> void:
	editor_open = false
	task_field.release_focus()
	_refresh_near()

func _rotate_selected() -> void:
	if selected_uid == "":
		return
	if GameRules.rotate_item(state, selected_uid, GameRules.home_blocked()).ok:
		_sync_items()
		_persist()

func _recycle_selected() -> void:
	if selected_uid == "":
		return
	if GameRules.recycle_item(state, selected_uid).ok:
		selected_uid = ""
		_sync_items()
		_persist()
		_refresh_ui()

func _sync_items() -> void:
	for child in items.get_children():
		child.queue_free()
	for placed in state.placed:
		var owned := _inventory_row(str(placed.uid))
		if owned.is_empty():
			continue
		var node := Visuals.furniture_node(str(owned.fid))
		var item := GameRules.furniture(str(owned.fid))
		node.position = Visuals.cell_to_world(int(placed.x), int(placed.z), int(placed.rotation), item)
		node.rotation.y = float(int(placed.rotation) % 4) * (PI * 0.5)
		node.set_meta("uid", str(placed.uid))
		items.add_child(node)

func _inventory_row(uid: String) -> Dictionary:
	for entry in state.inventory:
		if str(entry.uid) == uid:
			return entry
	return {}

func _persist() -> void:
	_remember()
	if not shot_mode:
		SaveStore.save_state(state)

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch or event is InputEventScreenDrag:
		touch_seen = true
		_touch(event)
		return
	if touch_seen and event is InputEventMouse:
		return
	if event is InputEventMouseButton:
		_mouse_button(event)
	elif event is InputEventMouseMotion and stick_id == -100:
		_drag_stick(event.position)
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_B:
			_toggle_build()
		elif event.keycode == KEY_E or event.keycode == KEY_ENTER:
			if near_button.visible:
				_open_shop()
		elif event.keycode == KEY_R:
			_rotate_selected()
		elif event.keycode == KEY_Q:
			_recycle_selected()
		elif event.keycode == KEY_ESCAPE:
			_close_shop()
			_close_editor()

func _touch(event: InputEvent) -> void:
	var index := int(event.index)
	var pos: Vector2 = event.position
	if event is InputEventScreenTouch:
		if event.pressed:
			if not build_mode and not shop_open and not _over_control(pos) and pos.x < get_viewport_rect().size.x * 0.42 and stick_id == -1:
				stick_id = index
				stick_origin = pos
				_show_stick(pos, pos)
			elif event.pressed:
				pass
		elif index == stick_id:
			var moved := pos.distance_to(stick_origin)
			_hide_stick()
			if moved < 14.0:
				_tap(pos)
		else:
			if pos.distance_to(event.position) >= 0.0:
				_tap(pos)
	elif event is InputEventScreenDrag and index == stick_id:
		_drag_stick(pos)

func _mouse_button(event: InputEventMouseButton) -> void:
	if event.button_index != MOUSE_BUTTON_LEFT:
		return
	if event.pressed:
		if not build_mode and not shop_open and not _over_control(event.position) and event.position.x < get_viewport_rect().size.x * 0.42:
			stick_id = -100
			stick_origin = event.position
			_show_stick(event.position, event.position)
	else:
		if stick_id == -100:
			var moved := event.position.distance_to(stick_origin)
			_hide_stick()
			if moved < 14.0:
				_tap(event.position)
		elif not _over_control(event.position):
			_tap(event.position)

func _drag_stick(pos: Vector2) -> void:
	stick_vec = GameRules.stick_vector(stick_origin, pos, 78.0)
	var knob := stick_origin + stick_vec * 78.0
	_show_stick(stick_origin, knob)

func _show_stick(origin: Vector2, knob: Vector2) -> void:
	joy_base.visible = true
	joy_knob.visible = true
	joy_base.position = origin - joy_base.size * 0.5
	joy_knob.position = knob - joy_knob.size * 0.5

func _hide_stick() -> void:
	stick_id = -1
	stick_vec = Vector2.ZERO
	joy_base.visible = false
	joy_knob.visible = false

func _over_control(pos: Vector2) -> bool:
	for node in ui_hits:
		var control := node as Control
		if control and control.visible and control.get_global_rect().has_point(pos):
			return true
	return false

func _tap(pos: Vector2) -> void:
	if _over_control(pos) or busy:
		return
	if shop_open:
		_close_shop()
		_refresh_ui()
		return
	if build_mode:
		_tap_build(pos)

func _tap_build(pos: Vector2) -> void:
	var world := _ground_point(pos)
	var cell := Vector2i(int(floor((world.x + 1.5) / GameRules.CELL)), int(floor((world.z + 1.5) / GameRules.CELL)))
	var hit := _object_at(cell)
	if hit != "":
		selected_uid = hit
		held_uid = ""
		_refresh_ui()
		return
	if held_uid == "":
		return
	if GameRules.place_item(state, held_uid, cell.x, cell.y, 0, GameRules.home_blocked()).ok:
		selected_uid = held_uid
		held_uid = ""
		_sync_items()
		_persist()
		_refresh_ui()

func _object_at(cell: Vector2i) -> String:
	for placed in state.placed:
		var owned := _inventory_row(str(placed.uid))
		if owned.is_empty():
			continue
		var item := GameRules.furniture(str(owned.fid))
		if GameRules.layer_of(item) != "object":
			continue
		var fp := GameRules.footprint(item, int(placed.rotation))
		if cell.x >= int(placed.x) and cell.x < int(placed.x) + fp.x and cell.y >= int(placed.z) and cell.y < int(placed.z) + fp.y:
			return str(placed.uid)
	return ""

func _ground_point(screen: Vector2) -> Vector3:
	var rect := container.get_global_rect()
	var local := screen - rect.position
	var vp_pos := Vector2(local.x / maxf(rect.size.x, 1.0) * PIXEL.x, local.y / maxf(rect.size.y, 1.0) * PIXEL.y)
	var origin := camera.project_ray_origin(vp_pos)
	var dir := camera.project_ray_normal(vp_pos)
	if absf(dir.y) < 0.0001:
		return origin
	var t := -origin.y / dir.y
	return origin + dir * t

func _run_shots(which: String) -> void:
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	DisplayServer.window_set_size(Vector2i(2400, 1080))
	await get_tree().process_frame
	await get_tree().process_frame
	var names: Array = ["town", "door", "build", "shop", "placed"] if which == "all" else [which]
	for name in names:
		_compose(str(name))
		await get_tree().process_frame
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		await _capture(str(name))
	get_tree().quit(0)

func _compose(which: String) -> void:
	shot_mode = true
	shop_open = false
	editor_open = false
	build_mode = false
	match which:
		"town":
			_enter("town", false)
			_move_player(Vector3(0.2, 0, 1.72), 0.0)
		"door":
			_enter("town", false)
			_move_player(Vector3(4.38, 0, -2.05), 1.05)
			Mascot.animate(mascot, true, 1.15)
		"build":
			_enter("home", false)
			_move_player(Vector3(0.15, 0, 0.35), 0.0)
			_set_build(true)
		"shop":
			_enter("home", false)
			_move_player(Vector3(-0.05, 0, -0.05), 0.35)
			if _inventory_row_fid("stool").is_empty():
				GameRules.buy(state, "stool")
			_open_shop()
		"placed":
			_enter("home", false)
			_seed_placed()
			_move_player(Vector3(0.35, 0, 0.45), 0.0)
			_close_shop()
			_set_build(true)
	_sync_items()
	_refresh_ui()
	_follow_camera()

func _inventory_row_fid(fid: String) -> Dictionary:
	for entry in state.inventory:
		if str(entry.fid) == fid:
			return entry
	return {}

func _seed_placed() -> void:
	for fid in ["mat", "stool", "lamp"]:
		if _inventory_row_fid(fid).is_empty():
			GameRules.buy(state, fid)
	var plan := {"mat": Vector2i(2, 2), "stool": Vector2i(4, 1), "lamp": Vector2i(1, 3)}
	for fid in plan.keys():
		var row := _inventory_row_fid(fid)
		var already := false
		for placed in state.placed:
			if str(placed.uid) == str(row.uid):
				already = true
		if not already:
			GameRules.place_item(state, str(row.uid), plan[fid].x, plan[fid].y, 0, GameRules.home_blocked())

func _capture(name: String) -> void:
	var image := get_viewport().get_texture().get_image()
	DirAccess.make_dir_recursive_absolute("/opt/cursor/artifacts/screenshots")
	DirAccess.make_dir_recursive_absolute("/workspace/godot/screenshots")
	image.save_png("/opt/cursor/artifacts/screenshots/%s.png" % name)
	image.save_png("/workspace/godot/screenshots/%s.png" % name)
	print("captured ", name, " ", image.get_width(), "x", image.get_height())
