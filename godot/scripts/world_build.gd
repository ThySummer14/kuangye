extends RefCounted
class_name WorldBuild

const TOWN_CAM := Vector3(0.85, 5.15, 5.45)
const TOWN_SIZE := 5.25
const ROOM_CAM := Vector3(0.28, 5.05, 4.35)
const ROOM_SIZE := 3.72
const BUILD_CAM := Vector3(0.12, 5.55, 3.55)
const BUILD_SIZE := 4.05

static func build(font: Font) -> Dictionary:
	var root := Node3D.new()
	root.name = "World"
	var cobble := Visuals.cobble_tex()
	var path := Visuals.path_tex()
	var plank := Visuals.plank_tex()
	var stone := Visuals.stone_tex()

	var town := Node3D.new()
	town.name = "Town"
	root.add_child(town)
	_ground(town, cobble, path)
	_hills(town)
	_fountain(town)
	var places := {}
	var town_boxes: Array = []
	var town_doors: Array = []
	for spec in _buildings():
		var built := _house(town, spec, font)
		town_boxes.append_array(built.boxes)
		town_doors.append({
			"to": spec.id,
			"rect": built.trigger,
			"spawn": built.outside,
			"yaw": PI,
		})
	_dress_town(town, font)
	for trunk in _tree_boxes():
		town_boxes.append(trunk)
	town_boxes.append(Rect2(-0.85, -1.15, 1.7, 1.7))
	places["town"] = {
		"node": town,
		"boxes": town_boxes,
		"doors": town_doors,
		"spawn": Vector3(0.2, 0, 1.85),
		"yaw": 0.0,
		"cam_offset": TOWN_CAM,
		"cam_size": TOWN_SIZE,
	}

	var home := _home(root, plank, font)
	places["home"] = home.place
	var tasks := _tasks(root, stone, font)
	places["tasks"] = tasks.place
	places["library"] = _library(root, plank, font)
	places["atelier"] = _atelier(root, plank, font)
	for id in ["home", "tasks", "library", "atelier"]:
		places[id].node.visible = false
	return {
		"root": root,
		"places": places,
		"items": home.items,
		"grid": home.grid,
		"npc": home.npc,
		"plaques": tasks.plaques,
		"home_door": _buildings()[0],
	}

static func _buildings() -> Array:
	return [
		{"id": "home", "name": "小家", "rect": Rect2(2.25, -6.65, 4.25, 3.35), "door": "s", "wall": "#f1e2cc", "trim": "#7a5340", "roof": "#c46245", "chimney": true},
		{"id": "atelier", "name": "画室", "rect": Rect2(-1.85, -6.85, 3.75, 3.25), "door": "s", "wall": "#ead8c8", "trim": "#6e4e55", "roof": "#8ea572", "window": "big"},
		{"id": "library", "name": "书屋", "rect": Rect2(-6.85, -6.45, 4.15, 3.2), "door": "s", "wall": "#8d6249", "trim": "#5c4032", "roof": "#6a4634", "awning": true},
		{"id": "tasks", "name": "岩壁", "rect": Rect2(-7.15, -0.55, 3.55, 3.15), "door": "s", "wall": "#b7aa9a", "trim": "#6e655c", "roof": "#8d847a", "stone": true},
	]

static func _ground(town: Node3D, cobble: Texture2D, path: Texture2D) -> void:
	var grass := Visuals.lit(Color.html("#6f8a52"))
	Visuals.box(town, Vector3(0, -0.08, -0.4), Vector3(24, 0.12, 20), grass)
	Visuals.box(town, Vector3(0.1, 0.02, -0.6), Vector3(16.5, 0.08, 13.2), Visuals.lit(Color.WHITE, cobble, Vector2(5, 4)))
	Visuals.box(town, Vector3(0.2, 0.07, 0.4), Vector3(1.7, 0.06, 8.2), Visuals.lit(Color.WHITE, path, Vector2(1, 6)))
	Visuals.box(town, Vector3(2.3, 0.07, -1.6), Vector3(4.6, 0.06, 1.35), Visuals.lit(Color.WHITE, path, Vector2(4, 1)))
	Visuals.box(town, Vector3(-3.4, 0.07, -1.5), Vector3(5.2, 0.06, 1.25), Visuals.lit(Color.WHITE, path, Vector2(4, 1)))

static func _hills(town: Node3D) -> void:
	var far := Visuals.lit(Color.html("#7f9a68"))
	var near := Visuals.lit(Color.html("#6d8758"))
	Visuals.sphere(town, Vector3(-6.5, -0.4, -9.2), 3.2, far, Vector3(1.4, 0.55, 1.1), 10)
	Visuals.sphere(town, Vector3(0.4, -0.6, -9.6), 3.6, near, Vector3(1.6, 0.48, 1.2), 10)
	Visuals.sphere(town, Vector3(7.2, -0.5, -8.8), 2.8, far, Vector3(1.3, 0.5, 1.0), 10)
	for x in [-9.2, -8.4, 8.6, 9.3]:
		Visuals.box(town, Vector3(x, 0.38, -1.5), Vector3(0.7, 0.7, 12.5), Visuals.lit(Color.html("#5f7a45")))

static func _fountain(town: Node3D) -> void:
	var stone := Visuals.lit(Color.html("#a89888"))
	Visuals.cyl(town, Vector3(0.15, 0.18, -0.25), 0.95, 0.28, stone, 10)
	Visuals.cyl(town, Vector3(0.15, 0.34, -0.25), 0.72, 0.16, Visuals.lit(Color.html("#8f8276")), 10)
	Visuals.cyl(town, Vector3(0.15, 0.4, -0.25), 0.48, 0.08, Visuals.flat(Color.html("#6e8f88")), 10)
	Visuals.cyl(town, Vector3(0.15, 0.62, -0.25), 0.12, 0.4, stone, 6)
	Visuals.sphere(town, Vector3(0.15, 0.86, -0.25), 0.14, Visuals.lit(Color.html("#c4b8a8")))

static func _house(town: Node3D, spec: Dictionary, font: Font) -> Dictionary:
	var rect: Rect2 = spec.rect
	var x0 := rect.position.x
	var z0 := rect.position.y
	var x1 := x0 + rect.size.x
	var z1 := z0 + rect.size.y
	var cx := (x0 + x1) * 0.5
	var cz := (z0 + z1) * 0.5
	var wall_h := 2.02
	var thick := 0.24
	var door_w := 0.86
	var wall := Visuals.lit(Color.html(spec.wall))
	var trim := Visuals.lit(Color.html(spec.trim))
	var roof := Visuals.lit(Color.html(spec.roof))
	Visuals.box(town, Vector3(cx, 0.1, cz), Vector3(rect.size.x + 0.3, 0.16, rect.size.y + 0.3), trim)
	_perimeter(town, x0, z0, x1, z1, wall_h, thick, door_w, wall, "s")
	var roof_mi := Visuals.add_mesh(town, Visuals.gable_mesh(rect.size.x + 0.55, rect.size.y + 0.5, 0.72), Vector3(cx, wall_h, cz), roof)
	roof_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	if spec.get("chimney", false):
		Visuals.box(town, Vector3(cx + 0.7, wall_h + 0.48, cz - 0.15), Vector3(0.32, 0.78, 0.32), trim)
		Visuals.box(town, Vector3(cx + 0.7, wall_h + 0.9, cz - 0.15), Vector3(0.42, 0.1, 0.42), Visuals.lit(Color.html("#5c5148")))
	_facade_windows(town, spec, x0, z0, x1, z1, cx, trim)
	if spec.get("awning", false):
		Visuals.box(town, Vector3(cx, 1.35, z1 + 0.38), Vector3(rect.size.x * 0.72, 0.08, 0.7), Visuals.lit(Color.html("#6e8f6a")))
	var door := Vector3(cx, 0.62, z1 + 0.02)
	Visuals.box(town, door, Vector3(door_w * 0.62, 1.05, 0.08), Visuals.flat(Color.html("#3a2a22")))
	Visuals.box(town, door + Vector3(0, 0.05, 0.03), Vector3(door_w * 0.36, 0.62, 0.04), Visuals.flat(Color.html("#e09048")))
	_sign(town, spec.name, Vector3(cx, 1.62, z1 + 0.16), font)
	var trigger := Rect2(cx - 0.42, z1 + 0.05, 0.84, 0.62)
	var outside := Vector3(cx, 0, z1 + 1.15)
	return {"boxes": [rect], "trigger": trigger, "outside": outside}

static func _perimeter(parent: Node3D, x0: float, z0: float, x1: float, z1: float, wall_h: float, thick: float, door_w: float, mat: Material, door: String) -> void:
	var cx := (x0 + x1) * 0.5
	var cz := (z0 + z1) * 0.5
	var w := x1 - x0
	var d := z1 - z0
	Visuals.box(parent, Vector3(cx, wall_h * 0.5, z0), Vector3(w, wall_h, thick), mat)
	Visuals.box(parent, Vector3(x0, wall_h * 0.5, cz), Vector3(thick, wall_h, d), mat)
	Visuals.box(parent, Vector3(x1, wall_h * 0.5, cz), Vector3(thick, wall_h, d), mat)
	if door == "s":
		var gap0 := cx - door_w * 0.5
		var gap1 := cx + door_w * 0.5
		var left_w := gap0 - x0
		var right_w := x1 - gap1
		Visuals.box(parent, Vector3(x0 + left_w * 0.5, wall_h * 0.5, z1), Vector3(maxf(left_w, 0.05), wall_h, thick), mat)
		Visuals.box(parent, Vector3(gap1 + right_w * 0.5, wall_h * 0.5, z1), Vector3(maxf(right_w, 0.05), wall_h, thick), mat)
		Visuals.box(parent, Vector3(cx, wall_h - 0.28, z1), Vector3(door_w, 0.56, thick), mat)
	else:
		Visuals.box(parent, Vector3(cx, wall_h * 0.5, z1), Vector3(w, wall_h, thick), mat)

static func _facade_windows(town: Node3D, spec: Dictionary, x0: float, z0: float, x1: float, z1: float, cx: float, trim: Material) -> void:
	var z := z1 + 0.02
	if spec.get("window", "") == "big":
		Visuals.box(town, Vector3(cx, 1.25, z), Vector3(1.5, 0.95, 0.1), trim)
		Visuals.box(town, Vector3(cx, 1.25, z + 0.04), Vector3(1.28, 0.75, 0.05), Visuals.flat(Color.html("#e09048")))
		return
	for side_value in [-1.0, 1.0]:
		var side := float(side_value)
		var px := cx + side * 1.15
		if px < x0 + 0.4 or px > x1 - 0.4:
			continue
		Visuals.box(town, Vector3(px, 1.2, z), Vector3(0.58, 0.62, 0.1), trim)
		Visuals.box(town, Vector3(px, 1.2, z + 0.04), Vector3(0.4, 0.44, 0.04), Visuals.flat(Color.html("#e09048")))

static func _sign(parent: Node3D, text: String, pos: Vector3, font: Font) -> void:
	Visuals.box(parent, pos, Vector3(0.86, 0.34, 0.06), Visuals.lit(Color.html("#e7d3b4")))
	var label := Label3D.new()
	label.text = text
	label.font = font
	label.font_size = 72
	label.pixel_size = 0.0036
	label.position = pos + Vector3(0, 0, 0.05)
	label.modulate = Color.html("#3a2a22")
	label.outline_size = 10
	label.outline_modulate = Color.html("#f4e6d4")
	label.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	label.double_sided = false
	parent.add_child(label)

static func _dress_town(town: Node3D, font: Font) -> void:
	var spots := [
		Vector3(-2.4, 0, 2.5), Vector3(2.5, 0, 2.7), Vector3(-4.6, 0, -2.2),
		Vector3(6.6, 0, -1.4), Vector3(7.0, 0, 2.2), Vector3(-8.2, 0, 3.6),
		Vector3(1.2, 0, -2.55), Vector3(6.2, 0, -4.6),
	]
	for i in spots.size():
		_tree(town, spots[i], 0.85 + float(i % 3) * 0.12, i)
	_lantern(town, Vector3(-1.15, 0, 1.15))
	_lantern(town, Vector3(1.55, 0, 1.05))
	_lantern(town, Vector3(3.3, 0, -2.15))
	_lantern(town, Vector3(-3.2, 0, -2.05))
	_flowers(town, Vector3(3.15, 0, -2.55), Color.html("#d7a179"))
	_flowers(town, Vector3(5.7, 0, -2.5), Color.html("#e6c98a"))
	_flowers(town, Vector3(-2.2, 0, -2.45), Color.html("#c46a4a"))
	_flowers(town, Vector3(-5.4, 0, -2.4), Color.html("#f0d0c8"))
	_bench(town, Vector3(-1.55, 0, 0.85))
	_bench(town, Vector3(2.15, 0, 0.55))
	_crate(town, Vector3(6.35, 0, -2.85))
	_crate(town, Vector3(6.7, 0, -2.45))
	_cart(town, Vector3(6.9, 0, 0.4))
	_laundry(town)
	_bulbs(town)
	for bush_at in [Vector3(-0.9, 0, 3.15), Vector3(1.4, 0, 3.25), Vector3(4.8, 0, 1.6), Vector3(-5.6, 0, 1.2)]:
		Visuals.sphere(town, bush_at + Vector3(0, 0.22, 0), 0.28, Visuals.lit(Color.html("#5f7a45")), Vector3(1.3, 0.7, 1.1), 7)
		Visuals.sphere(town, bush_at + Vector3(0.16, 0.3, 0.05), 0.16, Visuals.lit(Color.html("#7e9a5c")), Vector3.ONE, 6)

static func _tree(town: Node3D, pos: Vector3, scale: float, salt: int) -> void:
	var greens := [Color.html("#6f8f52"), Color.html("#7e9a5c"), Color.html("#5d7844")]
	var leaf := Visuals.lit(greens[salt % greens.size()])
	Visuals.cyl(town, pos + Vector3(0, 0.38 * scale, 0), 0.09 * scale, 0.7 * scale, Visuals.lit(Color.html("#6b4a34")), 6)
	Visuals.sphere(town, pos + Vector3(0, 1.05 * scale, 0), 0.48 * scale, leaf, Vector3(1.05, 0.85, 1.0), 7)
	Visuals.sphere(town, pos + Vector3(0.12 * scale, 1.32 * scale, 0.05), 0.32 * scale, Visuals.lit(greens[(salt + 1) % 3]), Vector3.ONE, 6)

static func _tree_boxes() -> Array:
	var boxes: Array = []
	for pos in [Vector3(-2.4, 0, 2.5), Vector3(2.5, 0, 2.7), Vector3(-4.6, 0, -2.2), Vector3(6.6, 0, -1.4), Vector3(7.0, 0, 2.2), Vector3(-8.2, 0, 3.6), Vector3(1.2, 0, -2.55), Vector3(6.2, 0, -4.6)]:
		boxes.append(Rect2(pos.x - 0.22, pos.z - 0.22, 0.44, 0.44))
	return boxes

static func _lantern(town: Node3D, pos: Vector3) -> void:
	Visuals.cyl(town, pos + Vector3(0, 0.55, 0), 0.04, 1.05, Visuals.lit(Color.html("#5c4032")), 5)
	Visuals.box(town, pos + Vector3(0, 1.15, 0), Vector3(0.22, 0.28, 0.22), Visuals.flat(Color.html("#ffb15e")))
	var light := OmniLight3D.new()
	light.position = pos + Vector3(0, 1.15, 0)
	light.light_color = Color.html("#ffb060")
	light.light_energy = 0.34
	light.omni_range = 2.3
	light.shadow_enabled = false
	town.add_child(light)

static func _flowers(town: Node3D, pos: Vector3, petal: Color) -> void:
	Visuals.box(town, pos + Vector3(0, 0.16, 0), Vector3(0.7, 0.28, 0.38), Visuals.lit(Color.html("#8a6248")))
	Visuals.sphere(town, pos + Vector3(0, 0.36, 0), 0.16, Visuals.lit(Color.html("#6f9a58")), Vector3(1.4, 0.6, 0.8), 6)
	Visuals.sphere(town, pos + Vector3(-0.16, 0.42, 0.02), 0.07, Visuals.flat(petal), Vector3.ONE, 6)
	Visuals.sphere(town, pos + Vector3(0.14, 0.44, 0), 0.06, Visuals.flat(Color.html("#f2d3c4")), Vector3.ONE, 6)

static func _bench(town: Node3D, pos: Vector3) -> void:
	var wood := Visuals.lit(Color.html("#a07858"))
	Visuals.box(town, pos + Vector3(0, 0.32, 0), Vector3(0.9, 0.08, 0.34), wood)
	Visuals.box(town, pos + Vector3(0, 0.52, -0.14), Vector3(0.9, 0.32, 0.08), wood)
	Visuals.box(town, pos + Vector3(-0.36, 0.16, 0), Vector3(0.08, 0.28, 0.3), wood)
	Visuals.box(town, pos + Vector3(0.36, 0.16, 0), Vector3(0.08, 0.28, 0.3), wood)

static func _crate(town: Node3D, pos: Vector3) -> void:
	Visuals.box(town, pos + Vector3(0, 0.2, 0), Vector3(0.42, 0.4, 0.42), Visuals.lit(Color.html("#b68b62")))
	Visuals.box(town, pos + Vector3(0, 0.42, 0), Vector3(0.44, 0.05, 0.44), Visuals.lit(Color.html("#8a6248")))

static func _cart(town: Node3D, pos: Vector3) -> void:
	var wood := Visuals.lit(Color.html("#8a6248"))
	Visuals.box(town, pos + Vector3(0, 0.38, 0), Vector3(0.9, 0.28, 0.6), wood)
	Visuals.cyl(town, pos + Vector3(-0.28, 0.16, 0.22), 0.14, 0.08, Visuals.lit(Color.html("#5c4032")), 8)
	Visuals.cyl(town, pos + Vector3(0.28, 0.16, 0.22), 0.14, 0.08, Visuals.lit(Color.html("#5c4032")), 8)
	Visuals.sphere(town, pos + Vector3(-0.15, 0.62, 0), 0.12, Visuals.lit(Color.html("#c46a4a")))
	Visuals.sphere(town, pos + Vector3(0.12, 0.66, 0.05), 0.1, Visuals.lit(Color.html("#e2b86f")))

static func _laundry(town: Node3D) -> void:
	Visuals.cyl(town, Vector3(-0.2, 0.7, -2.7), 0.04, 1.4, Visuals.lit(Color.html("#5c4032")), 5)
	Visuals.cyl(town, Vector3(1.5, 0.7, -2.7), 0.04, 1.4, Visuals.lit(Color.html("#5c4032")), 5)
	Visuals.box(town, Vector3(0.65, 1.28, -2.7), Vector3(1.8, 0.03, 0.03), Visuals.lit(Color.html("#d7c4b0")))
	Visuals.box(town, Vector3(0.15, 1.05, -2.7), Vector3(0.34, 0.4, 0.04), Visuals.lit(Color.html("#c47b6a")))
	Visuals.box(town, Vector3(0.7, 1.08, -2.7), Vector3(0.3, 0.34, 0.04), Visuals.lit(Color.html("#e6d3a1")))
	Visuals.box(town, Vector3(1.15, 1.02, -2.7), Vector3(0.28, 0.42, 0.04), Visuals.lit(Color.html("#8ea8b0")))

static func _bulbs(town: Node3D) -> void:
	for i in 6:
		var x := -1.2 + float(i) * 0.55
		var y := 1.7 + sin(float(i) * 0.8) * 0.05
		Visuals.sphere(town, Vector3(x, y, -2.15), 0.05, Visuals.flat(Color.html("#ffb15e")), Vector3.ONE, 6)

static func _home(root: Node3D, plank: Texture2D, font: Font) -> Dictionary:
	var node := Node3D.new()
	node.name = "Home"
	root.add_child(node)
	var floor_mat := Visuals.lit(Color(0.92, 0.9, 0.86), plank, Vector2(1.15, 1.15))
	Visuals.box(node, Vector3(0, -0.05, 0), Vector3(3.15, 0.1, 3.15), floor_mat)
	var wall := Visuals.lit(Color.html("#aeb99a"))
	var trim := Visuals.lit(Color.html("#edf0dc"))
	Visuals.box(node, Vector3(0, 0.85, -1.58), Vector3(3.2, 1.7, 0.16), wall)
	Visuals.box(node, Vector3(-1.58, 0.85, 0), Vector3(0.16, 1.7, 3.2), wall)
	Visuals.box(node, Vector3(1.58, 0.85, 0), Vector3(0.16, 1.7, 3.2), wall)
	Visuals.box(node, Vector3(0, 0.14, 1.58), Vector3(3.2, 0.28, 0.16), trim)
	Visuals.box(node, Vector3(-0.85, 0.7, 1.58), Vector3(0.28, 1.15, 0.16), wall)
	Visuals.box(node, Vector3(0.85, 0.7, 1.58), Vector3(0.28, 1.15, 0.16), wall)
	Visuals.box(node, Vector3(0, 0.16, 0), Vector3(2.7, 0.08, 0.08), trim)
	var frame := Visuals.lit(Color.html("#7a5340"))
	Visuals.box(node, Vector3(1.5, 1.05, -0.15), Vector3(0.1, 0.85, 0.7), frame)
	Visuals.box(node, Vector3(1.46, 1.05, -0.15), Vector3(0.04, 0.62, 0.48), Visuals.flat(Color.html("#e09048")))
	var window_light := OmniLight3D.new()
	window_light.position = Vector3(1.15, 1.05, -0.15)
	window_light.light_color = Color.html("#ffc48a")
	window_light.light_energy = 0.7
	window_light.omni_range = 3.2
	node.add_child(window_light)
	Visuals.box(node, Vector3(-1.35, 1.45, -0.2), Vector3(0.16, 0.12, 2.4), Visuals.lit(Color.html("#7a5340")))
	Visuals.box(node, Vector3(1.35, 1.45, 0.15), Vector3(0.16, 0.12, 2.2), Visuals.lit(Color.html("#7a5340")))
	Visuals.box(node, Vector3(-1.42, 1.15, 0.7), Vector3(0.18, 0.5, 0.7), Visuals.lit(Color.html("#8a6248")))
	Visuals.sphere(node, Vector3(-1.42, 1.48, 0.5), 0.08, Visuals.lit(Color.html("#c47a52")))
	Visuals.sphere(node, Vector3(-1.42, 1.5, 0.78), 0.07, Visuals.lit(Color.html("#6f9a58")))
	Visuals.box(node, Vector3(1.0, 1.15, -1.48), Vector3(0.16, 0.22, 0.16), Visuals.flat(Color.html("#ffb15e")))
	var sconce := OmniLight3D.new()
	sconce.position = Vector3(0.85, 1.05, -1.2)
	sconce.light_color = Color.html("#ffb060")
	sconce.light_energy = 0.55
	sconce.omni_range = 2.6
	node.add_child(sconce)
	var fill := OmniLight3D.new()
	fill.position = Vector3(0.1, 1.25, 0.1)
	fill.light_color = Color.html("#ffd2a4")
	fill.light_energy = 0.45
	fill.omni_range = 3.4
	fill.shadow_enabled = false
	node.add_child(fill)
	Visuals.box(node, Vector3(-1.35, 1.05, 0.15), Vector3(0.08, 0.7, 0.46), Visuals.lit(Color.html("#c47b6a")))
	Visuals.box(node, Vector3(-1.35, 1.05, -0.45), Vector3(0.08, 0.55, 0.36), Visuals.lit(Color.html("#8ea572")))
	Visuals.box(node, Vector3(1.42, 0.22, 0.85), Vector3(0.22, 0.28, 0.22), Visuals.lit(Color.html("#c47a52")))
	Visuals.sphere(node, Vector3(-1.42, 1.72, 0.95), 0.06, Visuals.flat(Color.html("#d7a179")), Vector3.ONE, 6)
	Visuals.sphere(node, Vector3(-1.42, 1.66, 1.1), 0.05, Visuals.flat(Color.html("#e6c98a")), Vector3.ONE, 6)
	Visuals.box(node, Vector3(-1.0, 0.38, -1.18), Vector3(1.05, 0.72, 0.46), Visuals.lit(Color.html("#8a6248")))
	Visuals.box(node, Vector3(-0.55, 0.78, -1.18), Vector3(0.16, 0.08, 0.2), Visuals.lit(Color.html("#c47a52")))
	var npc := _npc(node)
	var grid := Visuals.box(node, Vector3(0, 0.025, 0), Vector3(3.0, 0.01, 3.0), _grid_material())
	grid.visible = false
	grid.name = "Grid"
	var items := Node3D.new()
	items.name = "Items"
	node.add_child(items)
	var place := {
		"node": node,
		"boxes": [Rect2(-1.7, -1.7, 0.28, 3.4), Rect2(1.45, -1.7, 0.28, 3.4), Rect2(-1.5, -1.7, 3.0, 0.28), Rect2(-1.5, 1.45, 0.7, 0.3), Rect2(0.55, 1.45, 1.0, 0.3), Rect2(-1.35, -1.55, 0.7, 0.45)],
		"doors": [{"to": "town", "rect": Rect2(-0.45, 1.2, 0.9, 0.45), "spawn": Vector3(4.35, 0, -1.95), "yaw": PI}],
		"spawn": Vector3(0.05, 0, 0.85),
		"yaw": PI,
		"cam_offset": ROOM_CAM,
		"cam_size": ROOM_SIZE,
	}
	return {"place": place, "items": items, "grid": grid, "npc": npc}

static func _grid_material() -> Material:
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_texture = Visuals.grid_tex()
	mat.albedo_color = Color(1, 1, 1, 0.9)
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return mat

static func _npc(parent: Node3D) -> Node3D:
	var npc := Node3D.new()
	npc.name = "Carpenter"
	npc.position = Vector3(-1.0, 0, -1.32)
	parent.add_child(npc)
	Visuals.cyl(npc, Vector3(0, 0.38, 0), 0.16, 0.46, Visuals.lit(Color.html("#8d5a45")), 8)
	Visuals.sphere(npc, Vector3(0, 0.74, 0), 0.15, Visuals.lit(Color.html("#e6c39a")), Vector3(1, 1.05, 0.95), 8)
	Visuals.box(npc, Vector3(0, 0.9, 0), Vector3(0.24, 0.08, 0.22), Visuals.lit(Color.html("#6e8f6a")))
	Visuals.sphere(npc, Vector3(-0.05, 0.76, 0.11), 0.022, Visuals.flat(Color.html("#3a2a22")), Vector3.ONE, 6)
	Visuals.sphere(npc, Vector3(0.05, 0.76, 0.11), 0.022, Visuals.flat(Color.html("#3a2a22")), Vector3.ONE, 6)
	return npc

static func _tasks(root: Node3D, stone: Texture2D, font: Font) -> Dictionary:
	var node := Node3D.new()
	node.name = "Tasks"
	root.add_child(node)
	Visuals.box(node, Vector3(0, -0.05, 0), Vector3(3.3, 0.1, 3.3), Visuals.lit(Color.WHITE, stone, Vector2(2, 2)))
	var wall := Visuals.lit(Color.html("#b7aa9a"))
	Visuals.box(node, Vector3(0, 0.9, -1.6), Vector3(3.3, 1.8, 0.18), wall)
	Visuals.box(node, Vector3(-1.6, 0.9, 0), Vector3(0.18, 1.8, 3.3), wall)
	Visuals.box(node, Vector3(1.6, 0.9, 0), Vector3(0.18, 1.8, 3.3), wall)
	Visuals.box(node, Vector3(0, 0.16, 1.6), Vector3(3.3, 0.32, 0.18), Visuals.lit(Color.html("#6e655c")))
	var plaques: Array = []
	for i in 3:
		var x := -0.9 + float(i) * 0.9
		var board := Visuals.box(node, Vector3(x, 1.05, -1.42), Vector3(0.7, 0.85, 0.08), Visuals.lit(Color.html("#c4a574")))
		var label := Label3D.new()
		label.text = "+"
		label.font = font
		label.font_size = 48
		label.pixel_size = 0.004
		label.position = Vector3(x, 1.05, -1.34)
		label.modulate = Color.html("#3a2a22")
		label.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
		label.width = 160
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		node.add_child(label)
		plaques.append({"label": label, "x": x})
	Visuals.box(node, Vector3(1.2, 1.15, -1.15), Vector3(0.16, 0.24, 0.16), Visuals.flat(Color.html("#ffb15e")))
	var lamp := OmniLight3D.new()
	lamp.position = Vector3(0.9, 1.1, -0.8)
	lamp.light_color = Color.html("#ffb060")
	lamp.light_energy = 0.4
	lamp.omni_range = 2.6
	node.add_child(lamp)
	Visuals.box(node, Vector3(-1.15, 0.28, 0.4), Vector3(0.7, 0.1, 0.36), Visuals.lit(Color.html("#8a6248")))
	var place := {
		"node": node,
		"boxes": [Rect2(-1.75, -1.75, 0.3, 3.5), Rect2(1.45, -1.75, 0.3, 3.5), Rect2(-1.6, -1.75, 3.2, 0.3), Rect2(-1.5, 1.4, 3.0, 0.35)],
		"doors": [{"to": "town", "rect": Rect2(-0.5, 1.15, 1.0, 0.5), "spawn": Vector3(-5.38, 0, 3.85), "yaw": PI}],
		"spawn": Vector3(0, 0, 0.7),
		"yaw": PI,
		"cam_offset": ROOM_CAM,
		"cam_size": ROOM_SIZE,
	}
	return {"place": place, "plaques": plaques}

static func _library(root: Node3D, plank: Texture2D, font: Font) -> Dictionary:
	var node := Node3D.new()
	node.name = "Library"
	root.add_child(node)
	Visuals.box(node, Vector3(0, -0.05, 0), Vector3(3.2, 0.1, 3.2), Visuals.lit(Color(0.9, 0.86, 0.8), plank, Vector2(1.2, 1.2)))
	var wall := Visuals.lit(Color.html("#6e5344"))
	Visuals.box(node, Vector3(0, 0.95, -1.58), Vector3(3.3, 1.9, 0.16), wall)
	Visuals.box(node, Vector3(-1.58, 0.95, 0), Vector3(0.16, 1.9, 3.3), wall)
	Visuals.box(node, Vector3(1.58, 0.95, 0), Vector3(0.16, 1.9, 3.3), wall)
	Visuals.box(node, Vector3(0, 0.16, 1.58), Vector3(3.3, 0.32, 0.16), Visuals.lit(Color.html("#e7d3b4")))
	var spines := [Color.html("#8d4d45"), Color.html("#3f5c4e"), Color.html("#c4a574"), Color.html("#6e8f9a"), Color.html("#a07858")]
	for shelf_y in [0.4, 0.85, 1.3]:
		Visuals.box(node, Vector3(-0.15, shelf_y, -1.4), Vector3(2.5, 0.06, 0.28), Visuals.lit(Color.html("#5c4032")))
		for i in 8:
			Visuals.box(node, Vector3(-1.15 + float(i) * 0.28, shelf_y + 0.16, -1.4), Vector3(0.16, 0.26, 0.18), Visuals.lit(spines[(i + int(shelf_y * 4.0)) % spines.size()]))
	Visuals.box(node, Vector3(0.85, 0.36, 0.15), Vector3(0.7, 0.08, 0.45), Visuals.lit(Color.html("#8a6248")))
	Visuals.box(node, Vector3(0.85, 0.48, 0.15), Vector3(0.28, 0.08, 0.2), Visuals.lit(Color.html("#8d4d45")))
	Visuals.box(node, Vector3(1.15, 0.72, -1.2), Vector3(0.14, 0.2, 0.14), Visuals.flat(Color.html("#ffb15e")))
	var lamp := OmniLight3D.new()
	lamp.position = Vector3(0.7, 0.7, 0.1)
	lamp.light_color = Color.html("#ffb060")
	lamp.light_energy = 0.45
	lamp.omni_range = 2.4
	node.add_child(lamp)
	_sign(node, "书屋", Vector3(0, 1.55, 1.2), font)
	return {
		"node": node,
		"boxes": [Rect2(-1.75, -1.75, 0.3, 3.5), Rect2(1.45, -1.75, 0.3, 3.5), Rect2(-1.6, -1.75, 3.2, 0.35), Rect2(-1.5, 1.4, 3.0, 0.35)],
		"doors": [{"to": "town", "rect": Rect2(-0.5, 1.15, 1.0, 0.5), "spawn": Vector3(-4.8, 0, -2.4), "yaw": PI}],
		"spawn": Vector3(0, 0, 0.75),
		"yaw": PI,
		"cam_offset": ROOM_CAM,
		"cam_size": ROOM_SIZE,
	}

static func _atelier(root: Node3D, plank: Texture2D, font: Font) -> Dictionary:
	var node := Node3D.new()
	node.name = "Atelier"
	root.add_child(node)
	Visuals.box(node, Vector3(0, -0.05, 0), Vector3(3.2, 0.1, 3.2), Visuals.lit(Color(0.94, 0.9, 0.84), plank, Vector2(1.1, 1.1)))
	var wall := Visuals.lit(Color.html("#e4d5c6"))
	Visuals.box(node, Vector3(0, 1.05, -1.58), Vector3(3.3, 2.1, 0.16), wall)
	Visuals.box(node, Vector3(-1.58, 1.05, 0), Vector3(0.16, 2.1, 3.3), wall)
	Visuals.box(node, Vector3(1.58, 1.05, 0), Vector3(0.16, 2.1, 3.3), wall)
	Visuals.box(node, Vector3(0, 0.16, 1.58), Vector3(3.3, 0.32, 0.16), Visuals.lit(Color.html("#6e4e55")))
	Visuals.box(node, Vector3(0, 1.35, -1.46), Vector3(1.5, 1.05, 0.08), Visuals.lit(Color.html("#7a5340")))
	Visuals.box(node, Vector3(0, 1.35, -1.4), Vector3(1.25, 0.82, 0.04), Visuals.flat(Color.html("#f0c4a4")))
	var easel := Node3D.new()
	easel.position = Vector3(-0.35, 0, 0.15)
	node.add_child(easel)
	Visuals.box(easel, Vector3(0, 0.55, 0), Vector3(0.08, 1.05, 0.08), Visuals.lit(Color.html("#8a6248")))
	Visuals.box(easel, Vector3(0, 0.85, 0.08), Vector3(0.62, 0.48, 0.04), Visuals.lit(Color.html("#f4e6d4")))
	Visuals.box(easel, Vector3(-0.08, 0.95, 0.1), Vector3(0.28, 0.16, 0.02), Visuals.flat(Color.html("#7f9a68")))
	Visuals.box(easel, Vector3(0.1, 0.78, 0.1), Vector3(0.22, 0.2, 0.02), Visuals.flat(Color.html("#c46245")))
	Visuals.sphere(easel, Vector3(0.12, 0.98, 0.1), 0.06, Visuals.flat(Color.html("#e6c98a")))
	Visuals.cyl(node, Vector3(0.85, 0.16, -0.4), 0.1, 0.22, Visuals.lit(Color.html("#c47a52")), 6)
	Visuals.sphere(node, Vector3(0.85, 0.32, -0.4), 0.06, Visuals.flat(Color.html("#3f5c4e")))
	Visuals.sphere(node, Vector3(1.05, 0.28, -0.25), 0.05, Visuals.flat(Color.html("#8d4d45")))
	var lamp := OmniLight3D.new()
	lamp.position = Vector3(0.2, 1.2, 0.4)
	lamp.light_color = Color.html("#ffc48a")
	lamp.light_energy = 0.36
	lamp.omni_range = 2.5
	node.add_child(lamp)
	_sign(node, "画室", Vector3(0, 1.55, 1.15), font)
	return {
		"node": node,
		"boxes": [Rect2(-1.75, -1.75, 0.3, 3.5), Rect2(1.45, -1.75, 0.3, 3.5), Rect2(-1.6, -1.75, 3.2, 0.35), Rect2(-1.5, 1.4, 3.0, 0.35), Rect2(-0.7, -0.1, 0.7, 0.5)],
		"doors": [{"to": "town", "rect": Rect2(-0.5, 1.15, 1.0, 0.5), "spawn": Vector3(0.02, 0, -2.15), "yaw": PI}],
		"spawn": Vector3(0.35, 0, 0.7),
		"yaw": PI,
		"cam_offset": ROOM_CAM,
		"cam_size": ROOM_SIZE,
	}
