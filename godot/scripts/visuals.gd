extends RefCounted
class_name Visuals

static var _shader: Shader

static func shader() -> Shader:
	if _shader == null:
		_shader = load("res://shaders/soft_lit.gdshader")
	return _shader

static func lit(color: Color, tex: Texture2D = null, uv_scale := Vector2.ONE, emission := Color(0, 0, 0), emission_strength := 0.0, wrap := 0.5, light_cap := 0.7) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = shader()
	mat.set_shader_parameter("albedo", color)
	mat.set_shader_parameter("use_tex", tex != null)
	if tex != null:
		mat.set_shader_parameter("albedo_tex", tex)
		mat.set_shader_parameter("uv_scale", uv_scale)
	mat.set_shader_parameter("emission_color", emission)
	mat.set_shader_parameter("emission_strength", emission_strength)
	mat.set_shader_parameter("wrap", wrap)
	mat.set_shader_parameter("light_cap", light_cap)
	return mat

static func room(color: Color, tex: Texture2D = null, uv_scale := Vector2.ONE) -> ShaderMaterial:
	return lit(color, tex, uv_scale, Color(0, 0, 0), 0.0, 0.16, 0.88)

static func flat(color: Color, alpha := 1.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	mat.albedo_color = color
	mat.albedo_color.a = alpha
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	if alpha < 0.999:
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return mat

static func box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material, rot := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.position = pos
	mi.rotation = rot
	mi.material_override = mat
	parent.add_child(mi)
	return mi

static func cyl(parent: Node3D, pos: Vector3, radius: float, height: float, mat: Material, segments := 7) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = segments
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	parent.add_child(mi)
	return mi

static func sphere(parent: Node3D, pos: Vector3, radius: float, mat: Material, scale := Vector3.ONE, segments := 8) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = segments
	mesh.rings = maxi(4, segments / 2)
	mi.mesh = mesh
	mi.position = pos
	mi.scale = scale
	mi.material_override = mat
	parent.add_child(mi)
	return mi

static func cobble_tex() -> ImageTexture:
	var n := 96
	var img := Image.create(n, n, false, Image.FORMAT_RGB8)
	var mortar := Color.html("#5a4e44")
	var stones := [
		Color.html("#8d7866"), Color.html("#a08b76"), Color.html("#6f5e50"),
		Color.html("#b39a84"), Color.html("#7d6a58"), Color.html("#967f6c"),
	]
	img.fill(mortar)
	var rng := RandomNumberGenerator.new()
	rng.seed = 14
	for i in 42:
		var w := rng.randi_range(7, 16)
		var h := rng.randi_range(6, 13)
		var x0 := rng.randi_range(1, n - w - 2)
		var y0 := rng.randi_range(1, n - h - 2)
		var tone: Color = stones[rng.randi_range(0, stones.size() - 1)]
		var chip := rng.randf_range(-0.04, 0.05)
		for y in h:
			for x in w:
				if x == 0 or y == 0 or x == w - 1 or y == h - 1:
					continue
				var px := x0 + x
				var py := y0 + y
				if img.get_pixel(px, py).is_equal_approx(mortar) or rng.randf() > 0.35:
					img.set_pixel(px, py, tone.lightened(chip))
	return ImageTexture.create_from_image(img)

static func path_tex() -> ImageTexture:
	var n := 32
	var img := Image.create(n, n, false, Image.FORMAT_RGB8)
	var colors := [Color.html("#b7a08c"), Color.html("#c4ad96"), Color.html("#a89078")]
	var stone := 8
	for y in n:
		for x in n:
			var c: Color = colors[((x / stone) + (y / stone) * 2) % colors.size()]
			if x % stone == 0 or y % stone == 0:
				c = Color.html("#6e6256")
			img.set_pixel(x, y, c)
	return ImageTexture.create_from_image(img)

static func plank_tex() -> ImageTexture:
	var w := 32
	var h := 32
	var img := Image.create(w, h, false, Image.FORMAT_RGB8)
	var bands: Array[Color] = [Color.html("#a67c52"), Color.html("#d7b48a"), Color.html("#7a5438"), Color.html("#c49a6a")]
	for y in h:
		var band: Color = bands[int(y / 8) % bands.size()]
		for x in w:
			var c: Color = band
			if y % 8 == 0:
				c = Color.html("#4e3424")
			elif x % 16 == 0:
				c = Color.html("#5c4030")
			img.set_pixel(x, y, c)
	return ImageTexture.create_from_image(img)

static func stone_tex() -> ImageTexture:
	var n := 32
	var img := Image.create(n, n, false, Image.FORMAT_RGB8)
	var colors := [Color.html("#b7aa9a"), Color.html("#c4b8a8"), Color.html("#a39888")]
	for y in n:
		for x in n:
			var c: Color = colors[((x / 10) + (y / 10)) % colors.size()]
			if x % 10 == 0 or y % 10 == 0:
				c = Color.html("#7d7368")
			img.set_pixel(x, y, c)
	return ImageTexture.create_from_image(img)

static func gable_mesh(span_x: float, span_z: float, rise: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hx := span_x * 0.5
	var hz := span_z * 0.5
	var a := Vector3(-hx, 0, -hz)
	var b := Vector3(hx, 0, -hz)
	var c := Vector3(hx, 0, hz)
	var d := Vector3(-hx, 0, hz)
	var e := Vector3(-hx, rise, 0)
	var f := Vector3(hx, rise, 0)
	_tri(st, a, f, b)
	_tri(st, a, e, f)
	_tri(st, d, c, f)
	_tri(st, d, f, e)
	_tri(st, d, e, a)
	_tri(st, b, f, c)
	st.generate_normals()
	return st.commit()

static func _tri(st: SurfaceTool, p: Vector3, q: Vector3, r: Vector3) -> void:
	st.add_vertex(p)
	st.add_vertex(q)
	st.add_vertex(r)

static func add_mesh(parent: Node3D, mesh: Mesh, pos: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	parent.add_child(mi)
	return mi

static func grid_tex() -> ImageTexture:
	var n := 48
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var line := Color(0.42, 0.3, 0.18, 0.72)
	for i in 7:
		var p := mini(i * 8, n - 1)
		for t in n:
			img.set_pixel(p, t, line)
			img.set_pixel(t, p, line)
	return ImageTexture.create_from_image(img)

static func furniture_node(fid: String) -> Node3D:
	var root := Node3D.new()
	root.name = fid
	var shade := flat(Color(0.2, 0.1, 0.06, 0.45), 0.45)
	var shadow := cyl(root, Vector3(0, 0.015, 0.02), 0.22, 0.012, shade, 8)
	shadow.scale = Vector3(1.2, 1, 0.75)
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var item := GameRules.furniture(fid)
	var tint := Color.html(str(item.get("color", "#b68b62")))
	match fid:
		"mat":
			box(root, Vector3(0, 0.025, 0), Vector3(0.92, 0.04, 0.92), lit(tint))
			box(root, Vector3(0, 0.05, 0), Vector3(0.72, 0.02, 0.55), lit(tint.darkened(0.08)))
		"rug":
			cyl(root, Vector3(0, 0.02, 0), 0.46, 0.03, lit(tint), 10)
		"stool":
			cyl(root, Vector3(0, 0.34, 0), 0.16, 0.07, lit(tint), 8)
			cyl(root, Vector3(0.1, 0.16, 0.06), 0.025, 0.3, lit(tint.darkened(0.18)), 5)
			cyl(root, Vector3(-0.08, 0.16, 0.08), 0.025, 0.3, lit(tint.darkened(0.18)), 5)
			cyl(root, Vector3(-0.02, 0.16, -0.1), 0.025, 0.3, lit(tint.darkened(0.18)), 5)
		"plant":
			cyl(root, Vector3(0, 0.12, 0), 0.11, 0.16, lit(Color.html("#c47a52")), 7)
			cyl(root, Vector3(0, 0.2, 0), 0.13, 0.05, lit(Color.html("#a86440")), 7)
			sphere(root, Vector3(0, 0.38, 0), 0.13, lit(Color.html("#6f9a58")), Vector3(1, 0.8, 1))
			sphere(root, Vector3(0.08, 0.46, 0.02), 0.08, lit(Color.html("#8fb56a")))
		"lamp":
			cyl(root, Vector3(0, 0.16, 0), 0.035, 0.28, lit(Color.html("#8a5a3c")), 6)
			sphere(root, Vector3(0, 0.36, 0), 0.16, lit(tint, null, Vector2.ONE, Color.html("#e09048"), 0.28), Vector3(1.15, 0.55, 1.15), 8)
			var glow := OmniLight3D.new()
			glow.position = Vector3(0, 0.32, 0)
			glow.light_color = Color.html("#e09048")
			glow.light_energy = 0.22
			glow.omni_range = 1.35
			glow.shadow_enabled = false
			root.add_child(glow)
		"books":
			box(root, Vector3(-0.05, 0.08, 0), Vector3(0.22, 0.14, 0.16), lit(Color.html("#8d4d45")))
			box(root, Vector3(0.08, 0.1, 0.02), Vector3(0.18, 0.18, 0.15), lit(Color.html("#3f5c4e")))
			box(root, Vector3(0.0, 0.2, -0.01), Vector3(0.2, 0.06, 0.14), lit(tint))
		"flowers":
			cyl(root, Vector3(0, 0.1, 0), 0.07, 0.16, lit(Color.html("#d8c3a4")), 6)
			sphere(root, Vector3(0, 0.28, 0), 0.07, flat(Color.html("#d7a179")))
			sphere(root, Vector3(0.08, 0.33, 0.02), 0.05, flat(Color.html("#c46a4a")))
			sphere(root, Vector3(-0.06, 0.32, 0.04), 0.05, flat(Color.html("#e6c98a")))
		"cushion":
			sphere(root, Vector3(0, 0.1, 0), 0.16, lit(tint), Vector3(1.2, 0.55, 1.0), 8)
		_:
			var fp := GameRules.footprint(item, 0)
			box(root, Vector3(0, 0.18, 0), Vector3(fp.x * 0.42, 0.32, fp.y * 0.42), lit(tint))
	return root

static func cell_to_world(x: int, z: int, rotation: int, item: Dictionary) -> Vector3:
	var fp := GameRules.footprint(item, rotation)
	return Vector3(-1.5 + (float(x) + float(fp.x) * 0.5) * GameRules.CELL, 0.0, -1.5 + (float(z) + float(fp.y) * 0.5) * GameRules.CELL)
