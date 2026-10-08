class_name TownState
extends RefCounted

const Catalog = preload("res://scripts/catalog.gd")
const VERSION := 2
const Creative = preload("res://scripts/creative.gd")
var creative := Creative.new()
var coins := 120 # Isolated prototype allowance, not a production reward or paid currency.
var inventory: Dictionary = {}
var placements: Array[Dictionary] = []
var notes: Array[Dictionary] = []
var rewarded_dates: Array[String] = []
var next_id := 1
var last_error := ""
var path := "user://town-prototype-v1.json"

func _init() -> void:
	for kind in Catalog.ITEMS:
		inventory[kind] = 0
	inventory.stool = 1
	inventory.plant = 1

func buy(kind: String) -> bool:
	if not Catalog.ITEMS.has(kind):
		return false
	var price: int = Catalog.ITEMS[kind].price
	if coins < price:
		last_error = "微光不够，先用家里已有的家具吧。"
		return false
	coins -= price
	inventory[kind] = int(inventory.get(kind, 0)) + 1
	return true

func can_place(kind: String, x: int, z: int, rotation: int, except_id := -1) -> bool:
	if not Catalog.ITEMS.has(kind):
		return false
	var candidate := Rect2i(Vector2i(x, z), Catalog.footprint(kind, rotation))
	if not Catalog.ROOM.encloses(candidate) or candidate.intersects(Catalog.DOOR):
		return false
	# The fireplace and writing nook stay accessible. Door clearance is never sellable space.
	if candidate.intersects(Rect2i(-8, -7, 4, 3)) or candidate.intersects(Rect2i(4, -7, 4, 3)):
		return false
	for p in placements:
		if int(p.id) != except_id and candidate.intersects(Catalog.placement_rect(p)):
			return false
	return true

func place(kind: String, x: int, z: int, rotation: int) -> int:
	if int(inventory.get(kind, 0)) < 1 or not can_place(kind, x, z, rotation):
		return -1
	var id := next_id
	next_id += 1
	inventory[kind] = int(inventory[kind]) - 1
	placements.append({"id": id, "kind": kind, "x": x, "z": z, "rotation": posmod(rotation, 4)})
	return id

func move_item(id: int, x: int, z: int, rotation: int) -> bool:
	for p in placements:
		if int(p.id) == id and can_place(p.kind, x, z, rotation, id):
			p.x = x
			p.z = z
			p.rotation = posmod(rotation, 4)
			return true
	return false

func return_item(id: int) -> bool:
	for i in placements.size():
		var p := placements[i]
		if int(p.id) == id:
			inventory[p.kind] = int(inventory.get(p.kind, 0)) + 1
			placements.remove_at(i)
			return true
	return false

func add_note(text: String, date: String) -> bool:
	var clean := text.strip_edges().left(600)
	if clean.is_empty() or not is_date(date):
		return false
	notes.append({"text": clean, "date": date})
	if not rewarded_dates.has(date):
		rewarded_dates.append(date)
		coins += 5 # At most one 5-light memory per real day, no streak or loss.
	return true

func serialize() -> Dictionary:
	return {"version": VERSION, "coins": coins, "inventory": inventory, "placements": placements,
		"notes": notes, "rewarded_dates": rewarded_dates, "next_id": next_id, "creative":creative.serialize()}

func save_data() -> bool:
	var file := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	if file == null:
		last_error = "存档写入失败，当前进度仍在内存中。"
		return false
	file.store_string(JSON.stringify(serialize(), "\t"))
	file.flush()
	file.close()
	var result := DirAccess.rename_absolute(path + ".tmp", path)
	if result != OK:
		last_error = "无法替换存档，旧存档未删除。"
	return result == OK

func load_data() -> bool:
	if not FileAccess.file_exists(path):
		return false
	var parser := JSON.new()
	if parser.parse(FileAccess.get_file_as_string(path)) != OK:
		return invalid_save()
	var raw = parser.data
	if not raw is Dictionary or not is_integer_in_range(raw.get("version"),1,VERSION):
		return invalid_save()
	for key in raw:
		if not ["version","coins","inventory","placements","notes","rewarded_dates","next_id","creative"].has(key):
			return invalid_save()
	# Load into a candidate, so a malformed file never partly mutates live progress.
	var candidate := TownState.new()
	if not is_integer_in_range(raw.get("coins"),0,999999):
		return invalid_save()
	candidate.coins = int(raw.coins)
	if not raw.get("inventory") is Dictionary or not raw.get("placements") is Array:
		return invalid_save()
	candidate.inventory.clear()
	for kind in raw.inventory:
		if not Catalog.ITEMS.has(kind):return invalid_save()
	for kind in Catalog.ITEMS:
		if not is_integer_in_range(raw.inventory.get(kind, 0),0,9999):
			return invalid_save()
		candidate.inventory[kind] = int(raw.inventory.get(kind, 0))
	var ids: Array[int] = []
	for item in raw.placements:
		if not item is Dictionary or not Catalog.ITEMS.has(item.get("kind", "")):
			return invalid_save()
		if not item.has_all(["id", "x", "z", "rotation"]):
			return invalid_save()
		if not is_integer_in_range(item.id,1,1073741824) or not is_integer_in_range(item.x,-100,100) or not is_integer_in_range(item.z,-100,100) or not is_integer_in_range(item.rotation,0,3):
			return invalid_save()
		var clean := {"id": int(item.id), "kind": str(item.kind), "x": int(item.x), "z": int(item.z), "rotation": posmod(int(item.rotation), 4)}
		if clean.id < 1 or ids.has(clean.id):
			return invalid_save()
		ids.append(clean.id)
		if not candidate.can_place(clean.kind, clean.x, clean.z, clean.rotation):
			return invalid_save()
		candidate.placements.append(clean)
		candidate.next_id = maxi(candidate.next_id, clean.id + 1)
	if raw.has("next_id"):
		if not is_integer_in_range(raw.next_id,candidate.next_id,1073741824):return invalid_save()
		candidate.next_id=int(raw.next_id)
	if not raw.get("notes", []) is Array or not raw.get("rewarded_dates", []) is Array:
		return invalid_save()
	for note in raw.get("notes", []):
		if not note is Dictionary or not note.get("text") is String or not note.get("date") is String:
			return invalid_save()
		if note.text.length()>600 or note.text.strip_edges().is_empty() or not is_date(note.date):
			return invalid_save()
		candidate.notes.append(note.duplicate(true))
	for date in raw.get("rewarded_dates", []):
		if not date is String or not is_date(date) or candidate.rewarded_dates.has(date):
			return invalid_save()
		candidate.rewarded_dates.append(date)
	if raw.has("creative") and not candidate.creative.load_data(raw.creative):return invalid_save()
	if raw.version==VERSION and not raw.has("creative"):return invalid_save()
	creative=candidate.creative
	coins = candidate.coins
	inventory = candidate.inventory
	placements = candidate.placements
	notes = candidate.notes
	rewarded_dates = candidate.rewarded_dates
	next_id = candidate.next_id
	last_error = ""
	return true

func is_number(value: Variant) -> bool:
	return (value is float or value is int) and is_finite(float(value))

func is_integer_in_range(value:Variant,minimum:int,maximum:int) -> bool:
	return is_number(value) and float(value)>=minimum and float(value)<=maximum and float(value)==floorf(float(value))

func is_date(value:String) -> bool:
	var pieces:=value.split("-")
	if pieces.size()!=3 or pieces[0].length()!=4 or pieces[1].length()!=2 or pieces[2].length()!=2:return false
	if not pieces[0].is_valid_int() or not pieces[1].is_valid_int() or not pieces[2].is_valid_int():return false
	var year:=int(pieces[0])
	var month:=int(pieces[1])
	var day:=int(pieces[2])
	if year<1970 or month<1 or month>12 or day<1:return false
	var days:=[31,29 if (year%4==0 and (year%100!=0 or year%400==0)) else 28,31,30,31,30,31,31,30,31,30,31]
	return day<=days[month-1]

func invalid_save() -> bool:
	last_error = "存档格式无法识别；已保留原文件。"
	return false

func complete_creative_work(id:String,date:String) -> bool:
	if not creative.complete_work(id,date):return false
	# Personal creations award zero XP in main. Share the existing daily light
	# ledger with quick notes; completing and noting on one day never doubles it.
	if not rewarded_dates.has(date):
		rewarded_dates.append(date)
		coins+=5
	return true
