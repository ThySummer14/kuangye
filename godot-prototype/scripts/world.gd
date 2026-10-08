class_name TownWorld
extends Node3D

const Art = preload("res://scripts/art.gd")
var hotspots: Array[Dictionary] = []
var blockers: Array[Rect2] = []
var location := "town"
var furniture_root: Node3D
var grid_root: Node3D
var memory_root: Node3D
var npc_model: Node3D
var sun: DirectionalLight3D
var wind_objects: Array[Node3D] = []
var batch_stats: Dictionary = {}
var light_budget_stats: Dictionary = {}

func _init(place := "town") -> void:
	location = place

func _ready() -> void:
	var environment := WorldEnvironment.new()
	var settings := Environment.new()
	settings.background_mode = Environment.BG_COLOR
	settings.background_color = Color("344b53")
	settings.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	settings.ambient_light_color = Color("c8d6da")
	settings.ambient_light_energy = 0.40 if location == "town" else 0.38
	settings.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	settings.tonemap_exposure = 0.82
	environment.environment = settings
	add_child(environment)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-32, -38, 0)
	sun.light_color = Color("fff0d9")
	sun.light_energy = 0.60 if location == "town" else 0.24
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45.0
	sun.shadow_blur = 0.4
	add_child(sun)
	if location == "town":
		build_town()
	else:
		build_room()
	batch_static()
	furniture_root = Art.group(self)
	furniture_root.name = "PlacedFurniture"
	memory_root = Art.group(self)
	memory_root.name = "RealMemories"
	grid_root = Art.group(self)
	grid_root.visible = false
	if location == "home":
		for x in range(-8,9):
			var line := Art.box(grid_root,Vector3(x*0.5,0.027,0),Vector3(0.011,0.003,7),"b8c4aa")
			line.material_override = Art.mat("b8c4aa",0,0.35)
		for z in range(-7,8):
			var line := Art.box(grid_root,Vector3(0,0.028,z*0.5),Vector3(8,0.003,0.011),"b8c4aa")
			line.material_override = Art.mat("b8c4aa",0,0.35)

func batch_static() -> void:
	# Material batches preserve collision proxies, lamps and labels. Furniture/player/NPC
	# remain independent. Do not draw thousands of decorative roof tiles separately.
	var groups: Dictionary = {}
	var source_count := 0
	for node in find_children("*","MeshInstance3D",true,false):
		if is_instance_valid(npc_model) and npc_model.is_ancestor_of(node):
			continue
		var material: Material = node.material_override
		if material == null or node.mesh == null:
			continue
		if material is ShaderMaterial:
			continue # Keep water and future animated surfaces independently culled.
		if material is StandardMaterial3D and material.transparency != BaseMaterial3D.TRANSPARENCY_DISABLED:
			continue # Transparent shafts must retain their own sorting origin.
		var key := material.get_instance_id()
		if not groups.has(key):
			var builder := SurfaceTool.new()
			builder.begin(Mesh.PRIMITIVE_TRIANGLES)
			groups[key] = {"tool":builder,"material":material}
		for surface in node.mesh.get_surface_count():
			groups[key].tool.append_from(node.mesh,surface,global_transform.affine_inverse()*node.global_transform)
		source_count += 1
		node.queue_free()
	for key in groups:
		var combined: Mesh = groups[key].tool.commit()
		Art.mesh(self,combined,Vector3.ZERO,groups[key].material).name = "StaticMaterialBatch"
	wind_objects.clear()
	batch_stats = {"original_meshes":source_count,"static_batches":groups.size()}

func solid(p: Vector3, size: Vector3, visible_color := "") -> StaticBody3D:
	if not visible_color.is_empty():
		Art.box(self,p,size,visible_color)
	var body := StaticBody3D.new()
	body.position = p
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	add_child(body)
	if size.y > 0.5:
		blockers.append(Rect2(Vector2(p.x-size.x*0.5,p.z-size.z*0.5),Vector2(size.x,size.z)).grow(0.30))
	return body

func build_town() -> void:
	solid(Vector3(0,-0.25,-1.6),Vector3(24,0.48,23.2),"657f6f")
	Art.box(self,Vector3(0,-0.58,-1.6),Vector3(24.6,0.32,23.8),"657365")
	Art.box(self,Vector3(0,-0.85,-1.6),Vector3(25,0.30,24.2),"485957")
	# Warm limestone lanes, with offset slabs and crushed-stone edging.
	var rng := RandomNumberGenerator.new()
	rng.seed = 417
	for x in range(-18,19):
		for z in range(-22,15):
			var wx := x*0.5
			var wz := z*0.5
			if absf(wx)<1.3 or (wz>-0.6 and wz<1.4) or (wz>-2.1 and wz<-0.6 and absf(wx-4.5)<0.9):
				Art.box(self,Vector3(wx,0.005,wz),Vector3(0.498,0.018,0.498),["aaa68e","a8a48b","b0ab93","a6a38a"][rng.randi_range(0,3)])
	for place in [{"id":"home","pos":Vector3(-5,0,-2.5),"name":"小家"},{"id":"shop","pos":Vector3(4.7,0,-3.0),"name":"木匠铺"},{"id":"studio","pos":Vector3(-0.5,0,-8.5),"name":"画室"}]:
		Art.house(self,place.pos,place.id)
		var building_body:=solid(place.pos+Vector3(0,1.3,0),Vector3(4.3,2.6,3.35))
		building_body.set_meta("door_id",place.id)
		hotspots.append({"id":place.id,"name":"走进"+place.name,"pos":place.pos+Vector3(0,0,2.60),"kind":"door"})
		Art.label(self,place.pos+Vector3(0,2.55,2.1),place.name,24)
	# A low stream is a foreground layer, and the bridge is genuinely traversable.
	var stream := Art.box(self,Vector3(0,-0.03,7.4),Vector3(24,0.07,2.4),"789b97")
	var water := ShaderMaterial.new()
	water.shader = load("res://assets/water.gdshader")
	stream.material_override = water
	solid(Vector3(-6.5,0.35,7.4),Vector3(10,0.7,2.6))
	solid(Vector3(6.5,0.35,7.4),Vector3(10,0.7,2.6))
	for i in 12:
		Art.box(self,Vector3(0,0.045,6.1+i*0.235),Vector3(2.8,0.08,0.205),"a69473" if i%3 else "bdab85")
	for side in [-1,1]:
		for z in [6.1,7.4,8.6]:
			Art.box(self,Vector3(side*1.48,0.48,z),Vector3(0.13,1.0,0.13),"8b8065")
		Art.box(self,Vector3(side*1.48,0.84,7.4),Vector3(0.10,0.12,2.8),"c0ab83")
	for i in 45:
		var p := Vector3(rng.randf_range(-11.5,11.5),0,rng.randf_range(-12.5,9.6))
		if (absf(p.x)>8.4 or p.z < -11 or p.z>8.9) and not (absf(p.x)<2.0 and p.z>5):
			var tree := Art.tree(self,p,rng.randf_range(0.7,1.25),i%3==0)
			wind_objects.append(tree)
	for i in 95:
		var p := Vector3(rng.randf_range(-10.8,10.8),0.04,rng.randf_range(-10.8,5.8))
		if absf(p.x)>1.5 and (p.z<-2.1 or p.z>1.7):
			for j in 3:
				var blade := Art.box(self,p+Vector3(j*0.048,0.06,0),Vector3(0.034,0.12,0.034),"91a482" if i%3 else "b5b18a")
				blade.rotation.z = -0.18+j*0.18
	for p in [Vector3(-2,0,2.3),Vector3(2.4,0,-4),Vector3(-6.8,0,0.5),Vector3(6.8,0,0.6),Vector3(1.9,0,5.9)]:
		Art.lantern(self,p)
	for p in [Vector3(-7.6,0,-0.1),Vector3(7.4,0,-0.1),Vector3(-2.3,0,-5.6),Vector3(4.6,0,2.1)]:
		Art.flowers(self,p,"dec38b")
	# The town noticeboard is an optional invitation, never a blocker before the quick note.
	Art.box(self,Vector3(-3.0,0.66,2.3),Vector3(1.10,0.10,0.44),"b29770")
	for x in [-3.43,-2.57]:
		Art.box(self,Vector3(x,0.31,2.3),Vector3(0.10,0.63,0.33),"81765b")
	Art.box(self,Vector3(-3,1.04,2.11),Vector3(1.10,0.38,0.09),"bba078")
	hotspots.append({"id":"bench","name":"坐一会儿 · 翻开观察册","pos":Vector3(-3,0,3.0),"kind":"observation"})
	# Garden boundary collision, separated from decorative terrain.
	solid(Vector3(-11.6,0.5,-1.5),Vector3(0.4,1,22.8))
	solid(Vector3(11.6,0.5,-1.5),Vector3(0.4,1,22.8))
	solid(Vector3(0,0.5,-12.6),Vector3(23.6,1,0.4))
	solid(Vector3(0,0.5,9.4),Vector3(23.6,1,0.4))

func build_room() -> void:
	solid(Vector3(0,-0.15,0),Vector3(9.5,0.30,8.4),"776957")
	for x in 19:
		for z in 7:
			var start := maxf(-4.0,-4.9+z*1.35+(x%3)*0.45)
			var finish := minf(4.0,-3.55+z*1.35+(x%3)*0.45)
			if finish>start:
				Art.box(self,Vector3(-4.5+x*0.5,0.001,(start+finish)*0.5),Vector3(0.498,0.028,finish-start-0.006),["a48c6e","a78f72","aa9275","a48d70"][(x+z*3)%4])
	solid(Vector3(0,1.45,-4.1),Vector3(9.5,2.9,0.20),"d4c2a1")
	solid(Vector3(-4.65,1.45,0),Vector3(0.20,2.9,8.4),"b8b394")
	# Front/right cutaway walls are only knee high, so movement and furniture remain visible.
	solid(Vector3(4.65,0.30,0),Vector3(0.20,0.60,8.4),"b4a183")
	for x in [-3.0,3.0]:
		solid(Vector3(x,0.3,4.1),Vector3(3.1,0.6,0.20),"c0ac8b")
	for y in [0.13,2.8]:
		Art.box(self,Vector3(0,y,-3.95),Vector3(9.4,0.15,0.14),"8e7659")
		Art.box(self,Vector3(-4.5,y,0),Vector3(0.14,0.15,8.2),"8e7659")
	for x in [-4.45,-1.45,1.45,4.45]:
		Art.box(self,Vector3(x,1.45,-3.92),Vector3(0.14,2.8,0.14),"947d60")
	Art.window_front(self,0,1.75,-3.84,1.65)
	# Crossed paper-like shafts are local geometry, supported in both Mobile and Compatibility.
	var shaft := Art.box(self,Vector3(0.15,0.10,-2.55),Vector3(1.63,0.012,2.5),"f8d39a")
	shaft.material_override = Art.mat("f8d39a",0.2,0.20)
	shaft.rotation.y = -0.18
	Art.light(self,Vector3(0,1.8,-2.6),"ffd7a5",0.38,5.0)
	var main_light := Art.light(self,Vector3(0.9,2.7,1.2),"ffdcaf",0.52,7.5)
	main_light.shadow_enabled = true
	main_light.set_meta("priority_light",true)
	Art.box(self,Vector3(0,-0.035,4.2),Vector3(1.7,0.08,0.7),"d2bb91")
	# The threshold is a real landing, not only a visible mesh. Back/side stops
	# protect the open cutaway while a transition is cancelled or paused.
	solid(Vector3(0,-0.08,4.35),Vector3(2.9,0.16,1.10))
	solid(Vector3(0,0.50,4.75),Vector3(3.2,1.0,0.16))
	for side in [-1,1]:
		solid(Vector3(side*1.53,0.50,4.43),Vector3(0.16,1.0,0.80))
	hotspots.append({"id":"town","name":"出门回小镇","pos":Vector3(0,0,3.45),"kind":"door"})
	match location:
		"home":
			fireplace(Vector3(-3.3,0,-3.1))
			writing_desk(Vector3(3,0,-3.0))
			solid(Vector3(-3.3,0.7,-3.1),Vector3(1.65,1.4,0.85))
			solid(Vector3(3,0.45,-3),Vector3(1.5,0.9,0.75))
			Art.furniture(self,"shelf",Vector3(-4.0,0,-1.25))
			Art.furniture(self,"rug",Vector3(-2.8,0,-1.2)).scale = Vector3(2.1,1,2.1)
			hotspots.append({"id":"desk","name":"整理今天的发现","pos":Vector3(2.7,0,-1.95),"kind":"note"})
			hotspots.append({"id":"medal-shelf","name":"看看蚀刻章柜","pos":Vector3(-3.45,0,-0.85),"kind":"badges"})
		"shop":
			for x in [-3.2,-2.0,2.8,4.0]:
				Art.furniture(self,"shelf",Vector3(x,0,-3.2))
			solid(Vector3(1.8,0.45,-1.15),Vector3(3.0,0.9,0.75),"9c7a55")
			Art.box(self,Vector3(1.8,0.94,-1.15),Vector3(3.14,0.12,0.92),"cfaa78")
			Art.furniture(self,"lamp",Vector3(2.5,1.02,-1.15))
			npc_model = Art.npc(self,Vector3(1.3,0,-2.0))
			for spec in [["table",-2.7,0.0],["stool",-1.3,0.5],["plant",-3.8,1.5],["lamp",3.5,1.6],["rug",0.5,1.6]]:
				Art.furniture(self,spec[0],Vector3(spec[1],0,spec[2]))
			Art.label(self,Vector3(1.5,2.55,-2.1),"木匠 · 阿榆",24)
			hotspots.append({"id":"woodworker","name":"和木匠看看家具","pos":Vector3(1.5,0,-0.3),"kind":"shop"})
		"studio":
			writing_desk(Vector3(3.0,0,-3.0))
			Art.furniture(self,"shelf",Vector3(-3.8,0,-3.3))
			for x in [-2.3,0.0]:
				Art.beam(self,Vector3(x-0.45,0,-1.8),Vector3(x,2.25,-2.2),0.065,"9d805e")
				Art.beam(self,Vector3(x+0.45,0,-1.8),Vector3(x,2.25,-2.2),0.065,"9d805e")
				Art.box(self,Vector3(x,1.48,-2.08),Vector3(1.10,1.25,0.08),"866f54")
				Art.box(self,Vector3(x,1.48,-2.02),Vector3(0.94,1.09,0.035),"e8d8b6")
				Art.box(self,Vector3(x,1.21,-1.99),Vector3(0.72,0.31,0.015),"7e9a87")
				Art.box(self,Vector3(x-0.15,1.56,-1.98),Vector3(0.26,0.34,0.015),"c4ab77")
			Art.furniture(self,"stool",Vector3(0.1,0,0))
			Art.planter(self,Vector3(3.6,0,2.8))
			hotspots.append({"id":"easel","name":"打开画室作品集","pos":Vector3(-0.8,0,-0.8),"kind":"creative"})

func fireplace(p: Vector3) -> void:
	var n := Art.group(self,p)
	Art.box(n,Vector3(0,0.72,0),Vector3(1.55,1.45,0.68),"929587")
	Art.box(n,Vector3(0,0.58,0.37),Vector3(1.1,0.85,0.035),"4c4940")
	Art.box(n,Vector3(0,1.45,0.08),Vector3(1.75,0.14,0.88),"c0aa85")
	for i in 4:
		Art.box(n,Vector3(-0.7+i*0.47,0.85,0.4),Vector3(0.025,1.15,0.02),"727a6c")
	for i in 3:
		Art.beam(n,Vector3(-0.4,0.12,0.48+i*0.03),Vector3(0.38,0.17,0.43-i*0.02),0.1,"71513b")
		Art.sphere(n,Vector3(-0.28+i*0.25,0.28,0.45),Vector3(0.20,0.32+i*0.08,0.1),"efb36a",1.5)
	Art.light(n,Vector3(0,0.45,0.7),"ffb66d",0.55,3.1)
	Art.furniture(n,"plant",Vector3(-0.48,1.54,0.07))

func writing_desk(p: Vector3) -> void:
	var n := Art.group(self,p)
	Art.box(n,Vector3(0,0.83,0),Vector3(1.45,0.12,0.68),"be9c70")
	for x in [-0.6,0.6]:
		for z in [-0.23,0.23]:
			Art.box(n,Vector3(x,0.4,z),Vector3(0.085,0.8,0.085),"856b50")
	Art.box(n,Vector3(0,0.9,0),Vector3(0.50,0.016,0.39),"e9ddbc")
	for i in 4:
		Art.box(n,Vector3(0,0.911,-0.1+i*0.056),Vector3(0.31,0.006,0.012),"9c9782")
	Art.furniture(n,"lamp",Vector3(0.49,0.91,-0.10))
	Art.furniture(n,"stool",Vector3(0,0,0.7))

func show_memories(notes: Array[Dictionary]) -> void:
	for child in memory_root.get_children():
		child.queue_free()
	if location != "home" and location != "studio":
		return
	for i in mini(notes.size(),4):
		var p := Vector3(1.9+i*0.68,2.22,-3.79)
		Art.box(memory_root,p,Vector3(0.58,0.45,0.055),"9f835e")
		Art.box(memory_root,p+Vector3(0,0,0.031),Vector3(0.48,0.35,0.015),["d4b888","b7c1a1","c4a796","abbdbe"][i])
		for line in 3:
			Art.box(memory_root,p+Vector3(0,0.08-line*0.065,0.045),Vector3(0.32-line*0.04,0.015,0.012),"7b866e")

func update_light_budget(focus: Vector3) -> void:
	# Mobile/Compatibility support eight omni lights per mesh. Keep a conservative
	# six-light pool even after many lamps are bought; decorative emission remains.
	var lights: Array[Node] = find_children("*","OmniLight3D",true,false).filter(func(n):return not n.get_meta("preview_light",false))
	lights.sort_custom(func(a,b):
		var score_a:float = a.global_position.distance_squared_to(focus)-(10000.0 if a.get_meta("priority_light",false) else 0.0)-(0.6 if a.visible else 0.0)
		var score_b:float = b.global_position.distance_squared_to(focus)-(10000.0 if b.get_meta("priority_light",false) else 0.0)-(0.6 if b.visible else 0.0)
		return score_a<score_b)
	var active:=0
	for i in lights.size():
		lights[i].visible=i<6
		if i<6:active+=1
	light_budget_stats={"available":lights.size(),"active":active,"limit":6}

func show_creation(item:Dictionary) -> void:
	var old:=get_node_or_null("DisplayedCreation")
	if old:
		remove_child(old)
		old.queue_free()
	for h in hotspots:
		if h.id=="desk":
			h.kind="note" if item.is_empty() else "displayed-work"
			h.name="整理今天的发现" if item.is_empty() else "翻开「"+str(item.title).left(12)+"」"
	if location!="home" or item.is_empty():return
	var n:=Art.group(self,Vector3(2.7,0.45,-2.8))
	n.name="DisplayedCreation"
	n.set_meta("creative_display",true)
	Art.box(n,Vector3(0,0.54,0),Vector3(0.53,0.10,0.40),"d9c694")
	Art.box(n,Vector3(0,0.60,0),Vector3(0.45,0.025,0.34),"e4dcc2")
	for i in 4:Art.box(n,Vector3(0,0.62,-0.10+i*0.065),Vector3(0.29,0.005,0.012),"8c8670")
