class_name TownArt
extends RefCounted

# All environment geometry is original procedural art. 小芽's silhouette and palette are
# ported from the existing app, following docs/mascot.md and its approved turnaround.
static var materials: Dictionary = {}
static var font: Font

static func mat(hex: String, glow := 0.0, alpha := 1.0) -> StandardMaterial3D:
	var key := hex + str(glow) + str(alpha)
	if materials.has(key):
		return materials[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.albedo_color.a = alpha
	m.roughness = 0.94
	m.metallic_specular = 0.15
	if glow > 0:
		m.emission_enabled = true
		m.emission = Color(hex)
		m.emission_energy_multiplier = glow
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	materials[key] = m
	return m

static func mesh(parent: Node3D, geometry: Mesh, position: Vector3, material: Material) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	n.mesh = geometry
	n.material_override = material
	n.position = position
	parent.add_child(n)
	return n

static func box(parent: Node3D, p: Vector3, s: Vector3, color: String) -> MeshInstance3D:
	var g := BoxMesh.new()
	g.size = s
	return mesh(parent, g, p, mat(color))

static func sphere(parent: Node3D, p: Vector3, s: Vector3, color: String, glow := 0.0) -> MeshInstance3D:
	var g := SphereMesh.new()
	g.radius = 0.5
	g.height = 1.0
	g.radial_segments = 16
	g.rings = 8
	var n := mesh(parent, g, p, mat(color, glow))
	n.scale = s
	return n

static func cylinder(parent: Node3D, p: Vector3, radius: float, height: float, color: String, top := -1.0, segments := 12) -> MeshInstance3D:
	var g := CylinderMesh.new()
	g.top_radius = radius if top < 0 else top
	g.bottom_radius = radius
	g.height = height
	g.radial_segments = segments
	return mesh(parent, g, p, mat(color))

static func beam(parent: Node3D, a: Vector3, b: Vector3, width: float, color: String) -> MeshInstance3D:
	var n := box(parent, (a + b) * 0.5, Vector3(width, a.distance_to(b), width), color)
	if not a.is_equal_approx(b):
		n.quaternion = Quaternion(Vector3.UP, (b - a).normalized())
	return n

static func group(parent: Node3D, p := Vector3.ZERO) -> Node3D:
	var n := Node3D.new()
	n.position = p
	parent.add_child(n)
	return n

static func label(parent: Node3D, p: Vector3, text: String, size := 26) -> Label3D:
	var n := Label3D.new()
	n.text = text
	n.font = font
	n.font_size = size
	n.pixel_size = 0.008
	n.modulate = Color("fff0ce")
	n.outline_modulate = Color("302d2c")
	n.outline_size = 7
	n.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	n.position = p
	parent.add_child(n)
	return n

static func light(parent: Node3D, p: Vector3, color: String, energy: float, radius: float) -> OmniLight3D:
	var n := OmniLight3D.new()
	n.position = p
	n.light_color = Color(color)
	n.light_energy = energy
	n.set_meta("base_energy",energy)
	n.omni_range = radius
	n.omni_attenuation = 1.5
	n.shadow_enabled = false
	parent.add_child(n)
	return n

static func lantern(parent: Node3D, p: Vector3, pole := true) -> Node3D:
	var n := group(parent, p)
	if pole:
		box(n, Vector3(0, 0.8, 0), Vector3(0.10, 1.6, 0.10), "61574b")
		box(n, Vector3(0, 1.57, 0), Vector3(0.46, 0.07, 0.07), "73634e")
	var y := 1.62 if pole else 0.0
	box(n, Vector3(0, y, 0), Vector3(0.28, 0.08, 0.28), "453f3c")
	var glow := box(n, Vector3(0, y + 0.23, 0), Vector3(0.23, 0.38, 0.23), "ffce85")
	glow.material_override = mat("ffd396", 1.5)
	box(n, Vector3(0, y + 0.44, 0), Vector3(0.34, 0.10, 0.34), "615345")
	for x in [-0.125, 0.125]:
		for z in [-0.125, 0.125]:
			box(n, Vector3(x, y + 0.23, z), Vector3(0.025, 0.44, 0.025), "635745")
	light(n, Vector3(0, y + 0.20, 0.1), "ffd0a0", 0.65, 3.0)
	return n

static func mascot(parent: Node3D) -> Node3D:
	var root := group(parent)
	root.name = "Xiaoya"
	var shape := group(root)
	shape.name = "BodyShape"
	# The same bottom-to-top radial profile as app/src/game/mascot.js.
	var profile := [[226, 0], [225, 43], [221, 67], [212, 80], [196, 87], [172, 86], [149, 78], [127, 65], [108, 47], [95, 25], [89, 0]]
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for j in profile.size() - 1:
		for i in 32:
			var quad: Array[Vector3] = []
			for v in [[j, i], [j, i + 1], [j + 1, i], [j + 1, i + 1]]:
				var row: Array = profile[v[0]]
				var a: float = float(v[1]) / 32.0 * TAU
				quad.append(Vector3(cos(a) * row[1] / 190.0, (226.0 - row[0]) / 190.0 + 0.02, sin(a) * row[1] / 190.0 * 0.84))
			# Godot uses clockwise front faces; the original Three.js winding is reversed.
			for idx in [0, 1, 2, 1, 3, 2]:
				st.add_vertex(quad[idx])
	st.generate_normals()
	mesh(shape, st.commit(), Vector3.ZERO, mat("fdf7f1", 0.18)).name = "body"
	sphere(shape, Vector3(-37.0 / 190.0, 139.0 / 190.0, -0.015), Vector3(44.0, 56.0, 36.0) / 190.0, "fdf7f1", 0.18).name = "horn-left-tall"
	sphere(shape, Vector3(46.0 / 190.0, 125.0 / 190.0, -0.015), Vector3(34.0, 40.0, 30.0) / 190.0, "fdf7f1", 0.18).name = "horn-right-short"
	for side in [-1, 1]:
		sphere(shape, Vector3(side * 0.425, 0.20, 0.08), Vector3(0.15, 0.16, 0.13), "fdf7f1", 0.18).name = "hand" + str(side)
		sphere(shape, Vector3(side * 0.17, 0.43, 0.306), Vector3(0.060, 0.099, 0.012), "d9af68", 0.22).name = "eye" + str(side)
		sphere(shape, Vector3(side * 0.255, 0.31, 0.292), Vector3(0.12, 0.049, 0.009), "fdd1cf", 0.10)
	var mouth := [Vector3(-0.048,0.358,0.364), Vector3(-0.035,0.337,0.366), Vector3(-0.015,0.337,0.367), Vector3(0,0.353,0.368), Vector3(0.015,0.337,0.367), Vector3(0.035,0.337,0.366), Vector3(0.048,0.358,0.364)]
	for i in mouth.size() - 1:
		beam(shape, mouth[i], mouth[i+1], 0.012, "d9af68").name = "mouth-w"
	var sprout := group(shape, Vector3(0, 0.72, 0))
	sprout.name = "two-leaf-sprout"
	beam(sprout, Vector3.ZERO, Vector3(0.035, 0.17, 0), 0.024, "a7e160")
	for side in [-1, 1]:
		var leaf := sphere(sprout, Vector3(0.035 + side * 0.064, 0.19, 0), Vector3(0.16, 0.085, 0.055), "c7ef90", 0.55)
		leaf.rotation.z = side * 0.4
		leaf.name = "leaf" + str(side)
	root.rotation.y = 0.35
	return root

static func tree(parent: Node3D, p: Vector3, scale_value := 1.0, autumn := false) -> Node3D:
	var n := group(parent, p)
	n.scale = Vector3.ONE * scale_value
	cylinder(n, Vector3(0, 0.95, 0), 0.14, 1.9, "5e5145", 0.10, 7)
	beam(n, Vector3(0,1.15,0), Vector3(0.5,1.6,0.05), 0.13, "5e5145")
	var colors := ["8b9760", "a4ac71", "b8b982"] if autumn else ["597969", "74927b", "91a17e"]
	for j in 3:
		var t := sphere(n, Vector3(sin(j * 2.3) * 0.46, 1.75 + j * 0.22, cos(j * 2.3) * 0.40), Vector3(1.7-j*0.17, 1.5-j*0.12, 1.7-j*0.17), colors[j])
		t.rotation.y = j * 1.1
	return n

static func flowers(parent: Node3D, p: Vector3, color := "dea083") -> void:
	for i in 5:
		var a := i * 2.4
		var pos := p + Vector3(sin(a) * 0.22, 0, cos(a) * 0.20)
		beam(parent, pos, pos + Vector3(0, 0.20 + i * 0.012, 0), 0.025, "6e8764")
		box(parent, pos + Vector3(0, 0.21 + i * 0.012, 0), Vector3(0.105, 0.04, 0.105), color)

static func planter(parent: Node3D, p: Vector3) -> void:
	cylinder(parent, p + Vector3(0,0.18,0), 0.21, 0.36, "a87455", 0.29)
	cylinder(parent, p + Vector3(0,0.37,0), 0.29, 0.08, "bb8865")
	flowers(parent, p + Vector3(0,0.42,0))

static func furniture(parent: Node3D, kind: String, p := Vector3.ZERO) -> Node3D:
	var n := group(parent, p)
	n.name = kind
	match kind:
		"stool":
			cylinder(n, Vector3(0,0.40,0), 0.22, 0.12, "ba9167", -1, 16)
			cylinder(n, Vector3(0,0.469,0), 0.19, 0.016, "d0a777", -1, 16)
			for x in [-0.13, 0.13]:
				for z in [-0.13, 0.13]:
					beam(n, Vector3(x*1.3,0,z*1.3), Vector3(x,0.38,z), 0.06, "80604b")
		"plant":
			cylinder(n, Vector3(0,0.15,0),0.13,0.28,"b67b59",0.19)
			cylinder(n, Vector3(0,0.30,0),0.20,0.06,"d49b73")
			cylinder(n, Vector3(0,0.32,0),0.17,0.01,"5d5140")
			for i in 7:
				var a := i * 2.4
				var leaf := sphere(n, Vector3(sin(a)*0.12,0.48+i*0.014,cos(a)*0.12), Vector3(0.13,0.31,0.06), "82a579" if i%2 else "6b8d60")
				leaf.rotation = Vector3(cos(a)*0.65,a,sin(a)*0.65)
		"lamp":
			cylinder(n,Vector3(0,0.04,0),0.18,0.07,"836c51")
			cylinder(n,Vector3(0,0.23,0),0.045,0.38,"d0b680")
			var cap := sphere(n,Vector3(0,0.44,0),Vector3(0.45,0.20,0.45),"f5ce87",0.65)
			cap.name = "warm-shade"
			light(n,Vector3(0,0.45,0),"ffd694",0.5,2.0)
		"table":
			cylinder(n,Vector3(0,0.72,0),0.46,0.12,"bd9469",-1,24)
			cylinder(n,Vector3(0,0.785,0),0.43,0.015,"d2ac7e",-1,24)
			for x in [-0.28,0.28]:
				for z in [-0.28,0.28]:
					box(n,Vector3(x,0.35,z),Vector3(0.075,0.7,0.075),"88684f")
			cylinder(n,Vector3(0.15,0.82,0.03),0.08,0.06,"e7dbc2")
			cylinder(n,Vector3(0.15,0.85,0.03),0.059,0.015,"67543c")
		"shelf":
			for x in [-0.43,0.43]:
				box(n,Vector3(x,0.7,0),Vector3(0.08,1.4,0.40),"a67a55")
			for y in [0.10,0.55,1.0,1.38]:
				box(n,Vector3(0,y,0),Vector3(0.94,0.065,0.43),"c29767")
			for row in 3:
				for i in 7:
					box(n,Vector3(-0.34+i*0.095,0.28+row*0.45,0.01),Vector3(0.067,0.25+(i%3)*0.035,0.25),["b38366","81978d","d2bb8d","697e85"][i%4])
		"rug":
			cylinder(n,Vector3(0,0.015,0),0.48,0.022,"c39f6f",-1,32)
			cylinder(n,Vector3(0,0.03,0),0.40,0.012,"e3c998",-1,32)
			cylinder(n,Vector3(0,0.039,0),0.34,0.008,"d6b680",-1,32)
	return n

static func window_front(parent: Node3D, x: float, y: float, z: float, width := 0.8) -> void:
	box(parent,Vector3(x,y,z),Vector3(width+0.17,0.99,0.13),"655846")
	var glass := box(parent,Vector3(x,y,z+0.08),Vector3(width,0.82,0.02),"eebc77")
	glass.material_override = mat("f9c884",0.75)
	for dx in [-width*0.50,0,width*0.50]:
		box(parent,Vector3(x+dx,y,z+0.11),Vector3(0.055,0.88,0.045),"847052")
	box(parent,Vector3(x,y,z+0.11),Vector3(width,0.05,0.045),"847052")
	box(parent,Vector3(x,y-0.49,z+0.12),Vector3(width+0.28,0.12,0.32),"b2936e")

static func house(parent: Node3D, p: Vector3, kind: String) -> Node3D:
	var n := group(parent,p)
	var roof_color := "767e78" if kind == "studio" else ("95755d" if kind == "shop" else "ad735f")
	var wall_color := "c4ba9b" if kind == "studio" else ("b6a383" if kind == "shop" else "dfcaae")
	box(n,Vector3(0,0.17,0),Vector3(4.7,0.35,3.7),"7b8275")
	box(n,Vector3(0,1.40,0),Vector3(4.35,2.4,3.35),wall_color)
	# Timber framing and shallow weatherboarding stay legible in the low-resolution world.
	for x in [-2.1,-0.78,0.78,2.1]:
		box(n,Vector3(x,1.38,1.70),Vector3(0.13,2.45,0.13),"75654f")
	for y in [0.37,2.48]:
		box(n,Vector3(0,y,1.72),Vector3(4.42,0.14,0.15),"8c7558")
	for i in 12:
		box(n,Vector3(2.19,0.52+i*0.16,0),Vector3(0.035,0.018,3.32),"b4a286")
	box(n,Vector3(0,0.91,1.725),Vector3(0.98,1.49,0.11),"6a7770")
	for x in [-0.38,-0.19,0,0.19,0.38]:
		box(n,Vector3(x,0.84,1.793),Vector3(0.015,1.30,0.02),"506159")
	sphere(n,Vector3(0.3,0.94,1.83),Vector3(0.075,0.075,0.065),"dbbd7d")
	box(n,Vector3(0,0.12,2.0),Vector3(1.6,0.2,0.64),"baa991")
	box(n,Vector3(0,0.055,2.35),Vector3(1.85,0.10,0.3),"9b9c86")
	window_front(n,-1.42,1.42,1.74,0.69)
	window_front(n,1.42,1.42,1.74,0.69)
	# Stepped gable roof with individually offset shingles. Geometric texture has no external assets.
	for side in [-1,1]:
		var slope := box(n,Vector3(side*1.16,2.95,0),Vector3(2.65,0.15,4.05),roof_color)
		slope.rotation.z = -side * 0.44
		for row in 7:
			for column in 12:
				var x: float = side * (0.13+row*0.35)
				var tile := box(n,Vector3(x,3.52-abs(x)*0.47,-1.93+column*0.35+(row%2)*0.12),Vector3(0.38,0.062,0.34),roof_color if (row+column)%4 else ("a48d73" if kind=="shop" else "b58b72"))
				tile.rotation.z = -side*0.44
	box(n,Vector3(0,3.55,0),Vector3(0.17,0.14,4.2),"c09d78")
	for z in [-2.02,2.02]:
		beam(n,Vector3(-2.5,2.34,z),Vector3(0,3.55,z),0.12,"715d4c")
		beam(n,Vector3(0,3.55,z),Vector3(2.5,2.34,z),0.12,"715d4c")
	box(n,Vector3(-1.20,3.22,-0.65),Vector3(0.52,1.38,0.58),"918e80")
	box(n,Vector3(-1.20,3.94,-0.65),Vector3(0.67,0.15,0.73),"b2aa97")
	for j in 4:
		box(n,Vector3(-1.20,2.74+j*0.27,-0.348),Vector3(0.52,0.035,0.02),"6c7069")
	lantern(n,Vector3(0.75,1.22,1.99),false)
	planter(n,Vector3(-1.86,0.35,2.12))
	if kind == "shop":
		# Cloth awning and a tangible furniture display distinguish the shop from a panel facade.
		for i in 7:
			var stripe := box(n,Vector3(-1.22+i*0.40,2.13,2.15),Vector3(0.41,0.045,1.0),"a8b3a0" if i%2 else "e9d8b2")
			stripe.rotation.x = 0.15
		for x in [-1.44,1.44]:
			box(n,Vector3(x,1.05,2.64),Vector3(0.065,2.10,0.065),"867151")
		furniture(n,"stool",Vector3(1.7,0.35,2.55))
		furniture(n,"plant",Vector3(1.7,0.82,2.55))
	elif kind == "studio":
		box(n,Vector3(1.62,0.4,2.45),Vector3(0.73,0.1,0.50),"9f8b6c")
		for i in 3:
			box(n,Vector3(1.38+i*0.2,0.49,2.45),Vector3(0.16,0.09,0.24),["d3b68a","aa7466","798f83"][i])
	else:
		for x in [-2.78,-2.12]:
			box(n,Vector3(x,0.38,2.0),Vector3(0.09,0.75,0.08),"bba17b")
		box(n,Vector3(-2.45,0.69,2),Vector3(0.81,0.08,0.08),"c9b38c")
	return n

static func npc(parent: Node3D, p: Vector3) -> Node3D:
	var n := group(parent,p)
	n.name = "Woodworker"
	for x in [-0.12,0.12]:
		box(n,Vector3(x,0.2,0),Vector3(0.18,0.4,0.19),"596961")
	box(n,Vector3(0,0.63,0),Vector3(0.52,0.62,0.33),"b7a582")
	box(n,Vector3(0,0.57,0.185),Vector3(0.36,0.48,0.04),"927258")
	box(n,Vector3(0,0.48,0.215),Vector3(0.20,0.13,0.025),"b28d66")
	sphere(n,Vector3(0,1.12,0),Vector3(0.50,0.51,0.43),"e3c298")
	cylinder(n,Vector3(0,1.34,0),0.34,0.08,"8c7961",-1,16)
	cylinder(n,Vector3(0,1.42,0),0.23,0.16,"a8946e",0.19,16)
	for x in [-0.1,0.1]:
		sphere(n,Vector3(x,1.13,0.215),Vector3(0.04,0.05,0.02),"665547")
	for x in [-0.32,0.32]:
		box(n,Vector3(x,0.68,0),Vector3(0.13,0.48,0.16),"b7a582")
	return n
