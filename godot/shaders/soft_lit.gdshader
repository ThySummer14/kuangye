shader_type spatial;
render_mode specular_disabled, cull_back;

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_nearest, repeat_enable;
uniform bool use_tex = false;
uniform vec2 uv_scale = vec2(1.0);
uniform vec4 emission_color : source_color = vec4(0.0);
uniform float emission_strength = 0.0;
uniform float wrap = 0.5;
uniform float light_cap = 0.7;

void fragment() {
	vec3 base = albedo.rgb;
	if (use_tex) {
		base *= texture(albedo_tex, UV * uv_scale).rgb;
	}
	ALBEDO = base;
	EMISSION = emission_color.rgb * emission_strength;
	ROUGHNESS = 1.0;
	METALLIC = 0.0;
	SPECULAR = 0.0;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	float wrapped = clamp(ndl * (1.0 - wrap) + wrap, 0.0, 1.0);
	DIFFUSE_LIGHT += LIGHT_COLOR * wrapped * ATTENUATION * light_cap;
}
