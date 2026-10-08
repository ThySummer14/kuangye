extends RefCounted
class_name Mascot

const HEIGHT := 1.18
const IMG_BOTTOM := 226.0
const IMG_SPAN := 137.0
const SCALE := HEIGHT / IMG_SPAN
const DEPTH := 0.84

const PROFILE := [
	[226.0, 0.0], [225.0, 43.0], [221.0, 67.0], [212.0, 80.0], [196.0, 87.0],
	[172.0, 86.0], [149.0, 78.0], [127.0, 65.0], [108.0, 47.0], [95.0, 25.0], [89.0, 0.0],
]

static func create() -> Node3D:
	var root := Node3D.new()
	root.name = "Xiaoya"
	var visual := Node3D.new()
	visual.name = "Visual"
	root.add_child(visual)

	var body_mesh := _lathe(PROFILE)
	var body := MeshInstance3D.new()
	body.mesh = body_mesh
	body.material_override = _skin()
	visual.add_child(body)

	var shell := MeshInstance3D.new()
	shell.mesh = body_mesh
	shell.scale = Vector3(1.035, 1.028, 1.035)
	var outline := Visuals.flat(Color.html("#8a6d60"))
	outline.cull_mode = BaseMaterial3D.CULL_FRONT
	outline.render_priority = -1
	shell.material_override = outline
	shell.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	visual.add_child(shell)

	_horn(visual, 91.0, 87.0, 22.0, 28.0, 18.0)
	_horn(visual, 174.0, 101.0, 17.0, 20.0, 15.0)
	_sprout(visual)
	var face := Node3D.new()
	face.name = "Face"
	var face_y := (IMG_BOTTOM - 156.0) * SCALE
	var face_z := _radius_at(156.0) * SCALE * DEPTH
	face.position = Vector3(0, face_y, face_z * 0.72)
	face.rotation.x = -1.05
	visual.add_child(face)
	_eye(face, -34.0)
	_eye(face, 34.0)
	_blush(face, -40.0)
	_blush(face, 40.0)
	_mouth(face)
	_hand(visual, -1.0)
	_hand(visual, 1.0)

	var shadow := Visuals.cyl(root, Vector3(0, 0.012, 0.02), 0.28, 0.02, Visuals.flat(Color(0.25, 0.16, 0.12, 0.34), 0.34), 10)
	shadow.scale = Vector3(1.15, 1, 0.72)
	root.set_meta("visual", visual)
	return root

static func animate(root: Node3D, moving: bool, time: float) -> void:
	var visual := root.get_node_or_null("Visual") as Node3D
	if visual == null:
		return
	if moving:
		var hop := absf(sin(time * 9.0))
		visual.position.y = hop * 0.055
		visual.scale = Vector3(1.0 + hop * 0.04, 1.0 - hop * 0.07, 1.0 + hop * 0.04)
	else:
		var breath := sin(time * 1.6) * 0.012
		visual.position.y = 0.0
		visual.scale = Vector3(1.0 - breath, 1.0 + breath, 1.0 - breath)
	var sprout := visual.get_node_or_null("Sprout") as Node3D
	if sprout:
		sprout.rotation.z = sin(time * 1.3) * 0.08

static func _skin() -> StandardMaterial3D:
	var mat := Visuals.flat(Color.html("#fdf7f1"))
	mat.vertex_color_use_as_albedo = true
	return mat

static func _lathe(profile: Array) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings: Array = []
	for row in profile:
		var iy := float(row[0])
		var rad := float(row[1])
		rings.append([(IMG_BOTTOM - iy) * SCALE, rad * SCALE, rad * SCALE * DEPTH])
	var top_y: float = rings.back()[0]
	var segs := 12
	for i in rings.size() - 1:
		for s in segs:
			var a0 := TAU * float(s) / float(segs)
			var a1 := TAU * float(s + 1) / float(segs)
			var p00 := _pt(rings[i], a0)
			var p01 := _pt(rings[i], a1)
			var p10 := _pt(rings[i + 1], a0)
			var p11 := _pt(rings[i + 1], a1)
			_vert(st, p00, top_y)
			_vert(st, p10, top_y)
			_vert(st, p11, top_y)
			_vert(st, p00, top_y)
			_vert(st, p11, top_y)
			_vert(st, p01, top_y)
	st.generate_normals()
	return st.commit()

static func _pt(ring: Array, angle: float) -> Vector3:
	return Vector3(cos(angle) * float(ring[1]), float(ring[0]), sin(angle) * float(ring[2]))

static func _vert(st: SurfaceTool, p: Vector3, top_y: float) -> void:
	var u := clampf(p.y / top_y, 0.0, 1.0)
	st.set_color(Color.html("#f7ece3").lerp(Color.html("#fdf7f1"), u))
	st.add_vertex(p)

static func _horn(parent: Node3D, ix: float, iy: float, rx: float, ry: float, rz: float) -> void:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 1.0
	mesh.height = 2.0
	mesh.radial_segments = 8
	mesh.rings = 4
	mi.mesh = mesh
	mi.position = Vector3((ix - 128.0) * SCALE, (IMG_BOTTOM - iy) * SCALE, 0.02)
	mi.scale = Vector3(rx * SCALE, ry * SCALE, rz * SCALE)
	mi.material_override = Visuals.flat(Color.html("#fdf7f1"))
	parent.add_child(mi)

static func _eye(parent: Node3D, ix: float) -> void:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	mesh.radial_segments = 8
	mesh.rings = 4
	mi.mesh = mesh
	mi.position = Vector3(ix * SCALE, 0.03, 0.09)
	mi.scale = Vector3(0.28, 0.32, 0.08)
	var mat := Visuals.flat(Color.html("#d9af68"))
	mat.emission_enabled = true
	mat.emission = Color.html("#d9af68")
	mat.emission_energy_multiplier = 0.22
	mat.render_priority = 2
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.sorting_offset = 0.08
	parent.add_child(mi)

static func _blush(parent: Node3D, ix: float) -> void:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	mesh.radial_segments = 8
	mesh.rings = 3
	mi.mesh = mesh
	mi.position = Vector3(ix * SCALE, -0.07, 0.055)
	mi.scale = Vector3(0.16, 0.1, 0.04)
	var mat := Visuals.flat(Color.html("#fdd1cf"))
	mat.render_priority = 2
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.sorting_offset = 0.08
	parent.add_child(mi)

static func _mouth(parent: Node3D) -> void:
	var mat := Visuals.flat(Color.html("#c46a62"))
	mat.render_priority = 2
	var root := Node3D.new()
	root.position = Vector3(0, -0.12, 0.06)
	parent.add_child(root)
	var specs: Array = [
		[Vector3(-0.055, 0.016, 0), Vector3(0.07, 0.016, 0.014), Vector3(0, 0, 0.55)],
		[Vector3(0.0, -0.006, 0), Vector3(0.055, 0.016, 0.014), Vector3(0, 0, -0.1)],
		[Vector3(0.055, 0.016, 0), Vector3(0.07, 0.016, 0.014), Vector3(0, 0, -0.55)],
	]
	for piece in specs:
		var part := Visuals.box(root, piece[0], piece[1], mat, piece[2])
		part.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		part.sorting_offset = 0.08

static func _hand(parent: Node3D, side: float) -> void:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.07
	mesh.height = 0.15
	mesh.radial_segments = 8
	mesh.rings = 4
	mi.mesh = mesh
	mi.position = Vector3(side * 0.5, (IMG_BOTTOM - 196.0) * SCALE, 0.05)
	mi.material_override = Visuals.flat(Color.html("#fdf7f1"))
	parent.add_child(mi)

static func _sprout(parent: Node3D) -> void:
	var sprout := Node3D.new()
	sprout.name = "Sprout"
	var base_y := (IMG_BOTTOM - 93.0) * SCALE
	sprout.position = Vector3(0, base_y, 0)
	parent.add_child(sprout)
	Visuals.cyl(sprout, Vector3(0.01, 0.07, 0), 0.012, 0.14, Visuals.flat(Color.html("#a7e160")), 5)
	var leaf_mat := Visuals.flat(Color.html("#c7ef90"))
	leaf_mat.emission_enabled = true
	leaf_mat.emission = Color.html("#c7ef90")
	leaf_mat.emission_energy_multiplier = 0.45
	leaf_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var left := Visuals.box(sprout, Vector3(-0.045, 0.15, 0), Vector3(0.09, 0.045, 0.02), leaf_mat, Vector3(0, 0, 0.7))
	left.rotation.z = 0.8
	var right := Visuals.box(sprout, Vector3(0.05, 0.145, 0), Vector3(0.085, 0.04, 0.02), leaf_mat, Vector3(0, 0, -0.55))
	right.rotation.z = -0.65
	var halo := Visuals.sphere(sprout, Vector3(0.01, 0.16, 0), 0.09, Visuals.flat(Color(0.78, 0.94, 0.56, 0.28), 0.28))
	halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

static func _radius_at(iy: float) -> float:
	for i in PROFILE.size() - 1:
		var a: Array = PROFILE[i]
		var b: Array = PROFILE[i + 1]
		var ay := float(a[0])
		var by := float(b[0])
		if iy <= ay and iy >= by:
			var u := (ay - iy) / maxf(0.001, ay - by)
			return lerpf(float(a[1]), float(b[1]), u)
	return 40.0
