extends SceneTree
const State=preload("res://scripts/state.gd")
const Creative=preload("res://scripts/creative.gd")
const Images=preload("res://scripts/studio_images.gd")
const Fixtures=preload("res://tests/studio_image_fixtures.gd")
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,message:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+message)
func write_json(path:String,data:Dictionary)->void:
	var f:=FileAccess.open(path,FileAccess.WRITE);f.store_string(JSON.stringify(data));f.close()
func run()->void:
	if OS.get_environment("KUANGYE_DISPOSABLE_TEST_DATA")!="1":
		printerr("Use tests/run_all.py: this migration test requires disposable user data.");quit(2);return
	for file in [State.SAVE_PATH,State.PREVIOUS_PATH,State.SAVE_PATH+".tmp",State.PREVIOUS_PATH+".tmp"]:
		if FileAccess.file_exists(file):DirAccess.remove_absolute(file)
	var s:=State.new();var c=s.creative;var at:="2026-10-08"
	var image:String=Images.normalize(Fixtures.corners().save_png_to_buffer()).data
	var id:String=c.start_direct_work("四格色彩习作","画出四种观察到的颜色。",at)
	check(not id.is_empty() and c.work(id).theme=="own" and c.home.observations.entries.is_empty(),"direct artwork does not fabricate an observation")
	check(not s.complete_creative_work(id,at),"empty own artwork cannot complete")
	check(c.update_work(id,"四格色彩习作","","不默认导出",at,[image]),"image-only work stores full normalized bytes")
	check(s.complete_creative_work(id,at) and c.status(c.work(id))=="done","saved picture can fulfill its own creative agreement")
	check(not s.complete_creative_work(id,at) and s.coins==125,"repeated image completion cannot award again")
	check(c.display_work(id),"finished image work uses existing home display selection")
	var prior:Dictionary=c.serialize().duplicate(true)
	check(not c.update_work(id,"changed","","",at,[]) and c.serialize()==prior,"cannot remove the last result from a completed empty-body work")
	check(not c.update_work(id,"changed","","",at,[image,image]) and c.serialize()==prior,"duplicate normalized image rejects whole edit without text mutation")
	check(not c.update_work(id,"changed","","",at,["https://example.com/image.png"]) and c.serialize()==prior,"external URL cannot replace complete image bytes")
	check(not c.update_work(id,"changed","","",at,"wrong type") and c.serialize()==prior,"non-array images reject atomically")
	check(not c.update_work(id,"changed","","",at,[image,image,image,image,image]) and c.serialize()==prior,"five-image edit rejects without partial save")
	check(c.update_work(id,"四格色彩习作","有文字以后可以移除图片。","不默认导出",at,[]) and c.work(id).images.is_empty(),"removing a picture preserves explicit text result")
	check(c.update_work(id,"四格色彩习作","","不默认导出",at,[image]),"full bytes can be added back")
	var novel:String=s.badges.start("life-novel",[],c,at)
	check(not novel.is_empty() and s.badges.link_evidence(novel,id,[],c) and not s.badges.ready_issue(novel,c,at).is_empty(),"image-only completion cannot satisfy novel written-evidence rules")
	# Save and open exercise the storage contract independent of temporary picker paths.
	s.path="user://studio-media-roundtrip.json";check(s.save_data(),"image-bearing save succeeds")
	var raw_text:=FileAccess.get_file_as_string(s.path)
	var loaded:=State.new();loaded.path=s.path
	check(loaded.load_data() and loaded.creative.work(id).images==[image] and loaded.serialize()==s.serialize(),"reopen retains full image bytes, furniture, badge state and private note")
	var bad:Dictionary=s.serialize().duplicate(true);bad.creative.home.studio.works[0].images=["data:image/svg+xml;base64,PHN2Zz4="]
	write_json(s.path,bad);var previous:=loaded.serialize().duplicate(true)
	check(not loaded.load_data() and loaded.serialize()==previous,"unsafe saved image rejects full candidate without replacing live data")
	var old:=State.new();var oid:String=old.creative.start_observation(at);old.creative.update_observation(oid,{"place":"窗边","body":"今天光照得更远。"});old.creative.keep_observation(oid,at)
	var wid:String=old.creative.start_work(oid,"一段光","留下短文",at);old.creative.update_work(wid,"一段光","今天光照得更远。","原私语",at);old.complete_creative_work(wid,at)
	var old_data:Dictionary=old.serialize().duplicate(true);old_data.version=3;old_data.creative.schema=1
	write_json(State.PREVIOUS_PATH,old_data);var old_bytes:=FileAccess.get_file_as_bytes(State.PREVIOUS_PATH)
	var migrated:=State.new()
	check(migrated.load_data() and migrated.creative.work(wid).note=="原私语" and migrated.badges.serialize()==old.badges.serialize(),"v3 text and badge records migrate when v4 is absent")
	check(migrated.save_data() and FileAccess.get_file_as_bytes(State.PREVIOUS_PATH)==old_bytes,"first v4 save leaves original v3 byte-for-byte unchanged")
	var own_id:String=migrated.creative.start_direct_work("新图片","保留习作",at);migrated.creative.update_work(own_id,"新图片","","",at,[image]);migrated.save_data()
	old_data.coins=777;write_json(State.PREVIOUS_PATH,old_data)
	var reopened:=State.new();check(reopened.load_data() and reopened.creative.work(own_id).images==[image] and reopened.coins!=777,"existing v4 wins over later rollback-era v3 edits")
	var failed_save:=State.new();failed_save.path="user://absent-media-parent/save.json"
	check(failed_save.load_data(State.PREVIOUS_PATH) and not failed_save.save_data() and not FileAccess.file_exists(failed_save.path),"failed first migration creates no false v4 marker")
	var snapshot:=FileAccess.get_file_as_bytes(State.SAVE_PATH);migrated.path=State.SAVE_PATH+"/cannot-save.json"
	check(not migrated.save_data() and FileAccess.get_file_as_bytes(State.SAVE_PATH)==snapshot and migrated.creative.work(own_id).images==[image],"failed save keeps old bytes plus full in-memory picture")
	migrated.path=State.SAVE_PATH;check(migrated.save_data(),"retry writes same in-memory state without repeating completion")
	var corrupt:="{broken v4";var f:=FileAccess.open(State.SAVE_PATH,FileAccess.WRITE);f.store_string(corrupt);f.close()
	check(not reopened.load_data() and FileAccess.get_file_as_string(State.SAVE_PATH)==corrupt,"corrupt existing v4 does not silently roll back to v3")
	# Fill the shared budget with normalized, deterministic original noisy paintings.
	var quota:=Creative.new();var picture:=Image.create(768,768,false,Image.FORMAT_RGB8);var rng:=RandomNumberGenerator.new();rng.seed=87523
	for y in 768:
		for x in 768:picture.set_pixel(x,y,Color(rng.randf(),rng.randf(),rng.randf()))
	var large:String=Images.normalize(picture.save_png_to_buffer()).data
	var reached:=false
	for n in 30:
		var next:String=quota.start_direct_work("习作"+str(n),"留一张图",at);var before:=quota.serialize().duplicate(true)
		if not quota.update_work(next,"习作"+str(n),"","",at,[large]):
			check(quota.serialize()==before and quota.last_error.contains("容量已满"),"full quota keeps every prior picture and rejects whole candidate");reached=true;break
		quota.complete_work(next,at)
	check(reached and quota.image_chars()<=Images.ALL_IMAGE_CHARS,"real normalized picture bytes reach and respect shared quota")
	var invalid:Dictionary=quota.serialize().duplicate(true);invalid.home.studio.works[0].images=[large]
	var candidate:=Creative.new();check(not candidate.load_data(invalid),"over-quota persisted candidate is rejected")
	f=FileAccess.open("res://artifacts/studio-media-model-results.json",FileAccess.WRITE);f.store_string(JSON.stringify({"passed":passed,"failed":failed,"large_image_chars":large.length(),"saved_image_chars":quota.image_chars()},"\t"));f.close()
	for file in [State.SAVE_PATH,State.PREVIOUS_PATH]:
		if FileAccess.file_exists(file):DirAccess.remove_absolute(file)
	print("STUDIO MEDIA MODEL ",passed," passed, ",failed," failed");quit(0 if failed==0 else 1)
