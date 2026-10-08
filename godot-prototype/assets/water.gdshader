shader_type spatial;
render_mode unshaded;
void fragment() {
	vec2 cell = floor(UV * vec2(180.0, 22.0));
	float ripple = sin(cell.x * 0.27 + TIME * 0.75 + sin(cell.y * 0.8)) * cos(cell.y * 1.4 + TIME * 0.4);
	vec3 deep = vec3(0.30,0.46,0.47);
	vec3 shallow = vec3(0.49,0.65,0.61);
	ALBEDO = mix(deep, shallow, floor((ripple+1.0)*2.0)/4.0);
}
