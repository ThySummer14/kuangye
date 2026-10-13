extends RefCounted

# Display-only profiles. No clock, save or economic rules live in the renderer.
# Linear tonemapping is shared by native OpenGL and WebGL Compatibility.
const MODES := ["day", "sunset", "night"]
const LABELS := {"day":"午后晴光", "sunset":"日落时分", "night":"温柔夜晚"}
const PROFILES := {
	"day": {"sky":"e4e7dc", "ambient":"e3e9df", "ambient_energy":0.64,
		"sun":"fff1d9", "energy":0.85, "rotation":Vector3(-42,-155,0), "lamps":0.22,
		"window":"dce9df", "window_energy":0.12, "fill":0.30},
	"sunset": {"sky":"697878", "ambient":"c5cdda", "ambient_energy":0.46,
		"sun":"ffd09c", "energy":0.72, "rotation":Vector3(-23,-145,0), "lamps":0.65,
		"window":"e8bb8d", "window_energy":0.24, "fill":0.18},
	"night": {"sky":"263c4a", "ambient":"a8bdd6", "ambient_energy":0.29,
		"sun":"bad4f4", "energy":0.24, "rotation":Vector3(-38,-155,0), "lamps":1.0,
		"window":"607f9f", "window_energy":0.15, "fill":0.08},
}

static func apply(world: Node3D, mode: String) -> void:
	var profile: Dictionary = PROFILES[mode]
	world.settings.background_color = Color(profile.sky)
	world.settings.ambient_light_color = Color(profile.ambient)
	world.settings.ambient_light_energy = profile.ambient_energy
	world.sun.light_color = Color(profile.sun)
	world.sun.light_energy = profile.energy
	world.sun.rotation_degrees = profile.rotation
	world.fill.light_energy = profile.fill if world.location != "town" else 0.0
	world.fill.shadow_enabled = world.location != "town"
	world.fill.light_color = Color(profile.ambient)
	for light in world.find_children("*", "OmniLight3D", true, false):
		light.light_energy = float(light.get_meta("base_energy", 0.0)) * float(profile.lamps)
	# Window material is local to the room, not an entry in Art's shared cache.
	if is_instance_valid(world.window_glass):
		var glass: StandardMaterial3D = world.window_glass.material_override
		glass.albedo_color = Color(profile.window)
		glass.emission = Color(profile.window)
		glass.emission_energy_multiplier = profile.window_energy
