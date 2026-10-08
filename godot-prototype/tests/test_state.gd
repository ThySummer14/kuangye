extends SceneTree

const State = preload("res://scripts/state.gd")
const Catalog = preload("res://scripts/catalog.gd")
var passed := 0
var failed := 0

func check(ok: bool, message: String) -> void:
	if ok: passed += 1
	else: failed += 1
	print(("PASS " if ok else "FAIL ")+message)

func _initialize() -> void:
	var s := State.new()
	s.path = "user://state-test-fixture.json"
	check(s.coins==120,"isolated allowance is explicit")
	check(not s.buy("not-real") and s.coins==120,"unknown furniture cannot spend money")
	check(s.buy("lamp") and s.coins==80,"catalog controls purchase price")
	check(not s.buy("shelf") and s.coins==80,"insufficient balance never goes negative")
	check(Catalog.footprint("shelf",1)==Vector2i(1,2),"rotation swaps non-square footprint")
	check(Catalog.footprint("shelf",2)==Vector2i(2,1),"half turn restores footprint")
	check(not s.can_place("lamp",0,6,0),"front door remains accessible")
	check(not s.can_place("shelf",7,0,0),"wide objects respect room edge")
	check(s.can_place("shelf",7,0,1),"rotation fits a narrower gap")
	check(not s.can_place("stool",-7,-6,0),"fixed hearth is reserved")
	check(not s.can_place("stool",6,-6,0),"writing desk is reserved")
	var id := s.place("lamp",0,0,1)
	check(id==1 and s.inventory.lamp==0,"placement consumes exactly one item")
	check(s.place("lamp",2,0,0)==-1,"empty inventory cannot place duplicates")
	check(not s.can_place("plant",0,0,0),"overlap is rejected")
	check(s.move_item(id,1,0,3) and s.inventory.lamp==0,"move neither consumes nor returns inventory")
	check(not s.move_item(id,0,6,0) and s.placements[0].x==1,"invalid move leaves existing object intact")
	check(s.return_item(id) and s.inventory.lamp==1,"return refunds the object without currency")
	check(not s.return_item(id) and s.inventory.lamp==1,"repeated return cannot duplicate furniture")
	check(not s.add_note("   ","2026-10-08"),"empty notes create no rewards")
	check(s.add_note("真实的观察","2026-10-08") and s.coins==85,"first daily note adds five lights")
	s.add_note("同一天的第二条","2026-10-08")
	check(s.coins==85,"second daily note adds no reward")
	s.add_note("另一天","2026-10-09")
	check(s.coins==90,"another real day has its own single allowance")
	s.place("lamp",1,0,2)
	check(s.save_data(),"atomic save succeeds")
	var restored := State.new()
	restored.path = s.path
	check(restored.load_data() and restored.serialize()==s.serialize(),"entire data round trips")
	var before := restored.serialize().duplicate(true)
	for content in ["not json",'{"version":99}',JSON.stringify({"version":1,"coins":1,"inventory":{"stool":[]},"placements":[]}),JSON.stringify({"version":1,"coins":1,"inventory":{},"placements":[{"kind":"lamp","id":1,"x":[],"z":0,"rotation":0}]})]:
		var file := FileAccess.open(s.path,FileAccess.WRITE)
		file.store_string(content)
		file.close()
		check(not restored.load_data() and not restored.last_error.is_empty() and restored.serialize()==before,"malformed save rejected without mutating live data")
		check(FileAccess.get_file_as_string(s.path)==content,"malformed save bytes preserved")
	# Persistence and moving do not depend on render nodes or visual scale.
	s.save_data()
	var max_id := 0
	for p in s.placements: max_id=maxi(max_id,int(p.id))
	restored.load_data()
	check(restored.next_id>max_id,"unique identifiers remain unique after reopen")
	var valid:=s.serialize().duplicate(true)
	var invalids:Array[Dictionary]=[]
	var bad_coin:=valid.duplicate(true)
	bad_coin.coins=1.5
	invalids.append(bad_coin)
	var bad_inventory:=valid.duplicate(true)
	bad_inventory.inventory.future_unknown_furniture=1
	invalids.append(bad_inventory)
	var bad_note:=valid.duplicate(true)
	bad_note.notes.append({"text":42,"date":"2026-10-08"})
	invalids.append(bad_note)
	var long_note:=valid.duplicate(true)
	long_note.notes.append({"text":"记".repeat(601),"date":"2026-10-08"})
	invalids.append(long_note)
	var bad_position:=valid.duplicate(true)
	bad_position.placements[0].x=1.2
	invalids.append(bad_position)
	var duplicate_id:=valid.duplicate(true)
	var extra:Dictionary=duplicate_id.placements[0].duplicate(true)
	extra.x=3
	duplicate_id.placements.append(extra)
	invalids.append(duplicate_id)
	for malformed in invalids:
		var f:=FileAccess.open(s.path,FileAccess.WRITE)
		f.store_string(JSON.stringify(malformed))
		f.close()
		check(not restored.load_data() and restored.serialize()==valid,"unsupported or malformed data is never silently repaired or dropped")
	check(not s.add_note("伪日期","2026-02-31"),"impossible calendar dates cannot mint daily rewards")
	check(s.is_date("2028-02-29") and not s.is_date("2027-02-29"),"date validation handles leap years")
	check(not s.is_date("2026-2-001"),"date validation requires canonical date strings")
	var issued_id:int=s.placements[0].id
	s.return_item(issued_id)
	var next_before:=s.next_id
	s.save_data()
	restored.load_data()
	check(restored.next_id==next_before and restored.place("lamp",0,0,0)>issued_id,"returning every object does not reset persisted identity sequence")
	DirAccess.remove_absolute(s.path)
	print("STATE TESTS: %d passed, %d failed" % [passed,failed])
	quit(0 if failed==0 else 1)
