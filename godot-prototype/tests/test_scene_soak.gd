extends SceneTree

const Scene = preload("res://main.tscn")
var records: Array[Dictionary] = []
var failed := 0

func sample(label: String) -> Dictionary:
	return {"label":label,"nodes":int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)),
		"resources":int(Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT)),
		"static_bytes":int(Performance.get_monitor(Performance.MEMORY_STATIC))}

func check(ok: bool, text: String) -> void:
	print(("PASS " if ok else "FAIL ")+text)
	if not ok: failed+=1

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	root.size=Vector2i(1280,720)
	var app=Scene.instantiate()
	app.fixture_mode=true
	root.add_child(app)
	await process_frame
	app.state.path="user://soak-test-fixture.json"
	# Warm each scene once so font and material caching does not look like a leak.
	for place in ["home","shop","studio","town"]:
		app.change_location(place)
		await process_frame
		await process_frame
	var baseline:=sample("baseline-town")
	records.append(baseline)
	var start:=Time.get_ticks_msec()
	for round_index in 8:
		for place in ["home","shop","studio","town"]:
			var begin:=Time.get_ticks_msec()
			app.change_location(place)
			await process_frame
			await process_frame
			var entry:=sample("%d-%s" % [round_index,place])
			entry.scene_build_ms=Time.get_ticks_msec()-begin
			records.append(entry)
			check(app.scene_view.get_child_count()==1,"one live world after cycle %d %s" % [round_index,place])
	var last:Dictionary=records[-1]
	check(last.nodes==baseline.nodes,"town node count returns to exact baseline after 32 swaps")
	check(last.resources<=baseline.resources+8,"resource count has no per-swap accumulation")
	check(last.static_bytes<baseline.static_bytes+8*1024*1024,"static memory remains within 8 MiB of warmed baseline")
	check(Time.get_ticks_msec()-start<120000,"headless swap stress completes within bounded 120-second budget")
	var report:Dictionary={"engine":Engine.get_version_info().string,"mode":"headless; no GPU frame-rate claim","cycles":32,"failed":failed,"elapsed_ms":Time.get_ticks_msec()-start,"baseline":baseline,"final":last,"samples":records}
	var file:=FileAccess.open("res://artifacts/scene-soak.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"\t"))
	file.close()
	print("SOAK: %d checks passed, %d failed; %d ms" % [36-failed,failed,report.elapsed_ms])
	quit(0 if failed==0 else 1)
