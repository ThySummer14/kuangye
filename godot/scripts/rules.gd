extends RefCounted
class_name GameRules

# Mirrors app/src/data/furniture.js, app/src/game/home.js and placement.js.
# Cell size is 0.5 m. Gifts are not sold. Refund is floor(price * 0.7).

const CELL := 0.5
const ROOM_W := 6
const ROOM_D := 6
const MAX_TASKS := 3
const SEED_LUMENS := 80
const TASK_XP := 25
const SAVE_KEY := "kuangye.godot.v1"

const SHOP := ["mat", "stool", "rug", "plant", "flowers", "cushion", "lamp", "books"]

const FURNITURE := {
	"mat": {"id": "mat", "name": "编织草席", "price": 5, "w": 2, "d": 2, "color": "#d5bd83", "stall": "general", "model": "mat"},
	"stool": {"id": "stool", "name": "栗木小凳", "price": 15, "w": 1, "d": 1, "color": "#b68b62", "stall": "general", "model": "stool"},
	"rug": {"id": "rug", "name": "奶油圆毯", "price": 25, "w": 2, "d": 2, "color": "#ddbd85", "stall": "general", "model": "rug"},
	"chime": {"id": "chime", "name": "微风风铃", "price": 30, "w": 1, "d": 1, "color": "#93b5a4", "stall": "general", "model": "chime"},
	"plant": {"id": "plant", "name": "陶盆绿植", "price": 20, "w": 1, "d": 1, "color": "#77a26a", "stall": "flower", "model": "plant"},
	"lamp": {"id": "lamp", "name": "蘑菇台灯", "price": 40, "w": 1, "d": 1, "color": "#e2b86f", "stall": "general", "model": "lamp"},
	"books": {"id": "books", "name": "旧书箱", "price": 45, "w": 1, "d": 1, "color": "#b37d5f", "stall": "general", "model": "books"},
	"table": {"id": "table", "name": "橡木圆桌", "price": 65, "w": 2, "d": 2, "color": "#bc9469", "stall": "wood", "model": "table"},
	"sofa": {"id": "sofa", "name": "云朵沙发", "price": 90, "w": 2, "d": 2, "color": "#8caa8c", "stall": "general", "model": "sofa"},
	"shelf": {"id": "shelf", "name": "原木书架", "price": 110, "w": 2, "d": 1, "color": "#b98e61", "stall": "wood", "model": "shelf"},
	"bed": {"id": "bed", "name": "软绵绵小床", "price": 140, "w": 2, "d": 3, "color": "#c1caaa", "stall": "wood", "model": "bed"},
	"desk": {"id": "desk", "name": "长工作台", "price": 130, "w": 3, "d": 1, "color": "#bc9872", "stall": "wood", "model": "desk"},
	"fireplace": {"id": "fireplace", "name": "石砌壁炉", "price": 160, "w": 2, "d": 1, "color": "#b7aa97", "stall": "wood", "model": "fireplace"},
	"flowers": {"id": "flowers", "name": "一束干花", "price": 35, "w": 1, "d": 1, "color": "#d7a179", "stall": "flower", "model": "flowers"},
	"stand": {"id": "stand", "name": "阶梯花架", "price": 75, "w": 2, "d": 1, "color": "#8eaa75", "stall": "flower", "model": "stand"},
	"moss": {"id": "moss", "name": "苔玉小森林", "price": 55, "w": 1, "d": 1, "color": "#719471", "stall": "flower", "model": "moss"},
	"radio": {"id": "radio", "name": "旧时光收音机", "price": 85, "w": 1, "d": 1, "color": "#bc8460", "stall": "vintage", "model": "radio"},
	"lantern": {"id": "lantern", "name": "黄铜提灯", "price": 70, "w": 1, "d": 1, "color": "#c4a260", "stall": "vintage", "model": "lantern"},
	"tapestry": {"id": "tapestry", "name": "山野挂毯", "price": 100, "w": 2, "d": 1, "color": "#98aea0", "stall": "vintage", "model": "tapestry"},
	"cushion": {"id": "cushion", "name": "南瓜抱枕", "price": 30, "w": 1, "d": 1, "color": "#d3a174", "stall": "general", "model": "cushion"},
	"stringlights": {"id": "stringlights", "name": "星星暖灯", "price": 0, "w": 2, "d": 1, "color": "#ebd087", "stall": "gift", "model": "chime"},
	"telescope": {"id": "telescope", "name": "观星望远镜", "price": 0, "w": 1, "d": 2, "color": "#b6b2a1", "stall": "gift", "model": "telescope"},
	"musicchime": {"id": "musicchime", "name": "会唱歌的风铃", "price": 0, "w": 1, "d": 1, "color": "#afbe9c", "stall": "gift", "model": "chime"},
	"skylight": {"id": "skylight", "name": "星空天窗", "price": 0, "w": 2, "d": 1, "color": "#8eb6bf", "stall": "gift", "model": "tapestry"},
}

static func furniture(fid: String) -> Dictionary:
	if not FURNITURE.has(fid):
		return {}
	return (FURNITURE[fid] as Dictionary).duplicate()

static func lumen_reward(xp: float) -> int:
	if not is_finite(xp):
		return 0
	return maxi(0, int(round((xp * 0.6) / 5.0)) * 5)

static func refund_for(price: int) -> int:
	return int(floor(float(maxi(0, price)) * 0.7))

static func layer_of(item: Dictionary) -> String:
	if str(item.get("model", "")) in ["mat", "rug"]:
		return "floor"
	return "object"

static func footprint(item: Dictionary, rotation: int) -> Vector2i:
	var turn := int(rotation) % 2
	if turn != 0:
		return Vector2i(int(item.d), int(item.w))
	return Vector2i(int(item.w), int(item.d))

static func _whole(v) -> bool:
	if typeof(v) != TYPE_INT and typeof(v) != TYPE_FLOAT:
		return false
	return is_equal_approx(float(v), floor(float(v)))

static func placement_check(item: Dictionary, at: Dictionary, placed: Array, inventory: Array, ignore_id: String, blocked: Array = []) -> Dictionary:
	if item.is_empty() or not _whole(at.get("x")) or not _whole(at.get("z")):
		return {"ok": false, "why": "off"}
	var x := int(at.x)
	var z := int(at.z)
	var rot := int(at.get("rotation", 0)) % 4
	var fp := footprint(item, rot)
	if x < 0 or z < 0 or x + fp.x > ROOM_W or z + fp.y > ROOM_D:
		return {"ok": false, "why": "bounds"}
	for dx in fp.x:
		for dz in fp.y:
			if Vector2i(x + dx, z + dz) in blocked:
				return {"ok": false, "why": "blocked"}
	var mine := layer_of(item)
	for p in placed:
		if str(p.get("uid", "")) == ignore_id:
			continue
		var other_item := _item_for_uid(inventory, str(p.get("uid", "")))
		if other_item.is_empty() or layer_of(other_item) != mine:
			continue
		var ofp := footprint(other_item, int(p.get("rotation", 0)))
		var ox := int(p.x)
		var oz := int(p.z)
		if x < ox + ofp.x and x + fp.x > ox and z < oz + ofp.y and z + fp.y > oz:
			return {"ok": false, "why": "overlap"}
	return {"ok": true, "why": "ok"}

static func _item_for_uid(inventory: Array, uid: String) -> Dictionary:
	for entry in inventory:
		if str(entry.get("uid", "")) == uid:
			return furniture(str(entry.get("fid", "")))
	return {}

static func _find_inventory(state: Dictionary, uid: String) -> Dictionary:
	for entry in state.inventory:
		if str(entry.get("uid", "")) == uid:
			return entry
	return {}

static func fresh_state() -> Dictionary:
	return {
		"v": 1,
		"lumens": SEED_LUMENS,
		"earned": SEED_LUMENS,
		"spent": 0,
		"refunded": 0,
		"next_id": 1,
		"inventory": [],
		"placed": [],
		"tasks": [],
		"done": [],
		"released": [],
		"place": "town",
		"pos": [0.15, 1.7],
		"yaw": PI,
	}

static func buy(state: Dictionary, fid: String) -> Dictionary:
	var item := furniture(fid)
	if item.is_empty() or str(item.stall) == "gift" or int(state.lumens) < int(item.price):
		return {"ok": false}
	var uid := "item-%d" % int(state.next_id)
	state.next_id = int(state.next_id) + 1
	var paid := int(item.price)
	state.lumens = int(state.lumens) - paid
	state.spent = int(state.spent) + paid
	var row := {"uid": uid, "fid": fid, "paid": paid}
	state.inventory.append(row)
	return {"ok": true, "item": row}

static func place_item(state: Dictionary, uid: String, x: int, z: int, rotation: int, blocked: Array = []) -> Dictionary:
	var owned := _find_inventory(state, uid)
	if owned.is_empty():
		return {"ok": false, "why": "missing"}
	var item := furniture(str(owned.fid))
	var at := {"uid": uid, "x": x, "z": z, "rotation": int(rotation) % 4}
	var check := placement_check(item, at, state.placed, state.inventory, uid, blocked)
	if not check.ok:
		return check
	var replaced := false
	for i in state.placed.size():
		if str(state.placed[i].get("uid", "")) == uid:
			state.placed[i] = at
			replaced = true
			break
	if not replaced:
		state.placed.append(at)
	return check

static func rotate_item(state: Dictionary, uid: String, blocked: Array = []) -> Dictionary:
	for p in state.placed:
		if str(p.get("uid", "")) == uid:
			return place_item(state, uid, int(p.x), int(p.z), int(p.rotation) + 1, blocked)
	return {"ok": false, "why": "missing"}

static func recycle_item(state: Dictionary, uid: String) -> Dictionary:
	var owned := _find_inventory(state, uid)
	if owned.is_empty():
		return {"ok": false}
	var item := furniture(str(owned.fid))
	if str(item.get("stall", "")) == "gift":
		return {"ok": false}
	var refund := refund_for(int(owned.paid))
	var next_placed: Array = []
	for p in state.placed:
		if str(p.get("uid", "")) != uid:
			next_placed.append(p)
	var next_inv: Array = []
	for entry in state.inventory:
		if str(entry.get("uid", "")) != uid:
			next_inv.append(entry)
	state.placed = next_placed
	state.inventory = next_inv
	state.lumens = int(state.lumens) + refund
	state.refunded = int(state.refunded) + refund
	return {"ok": true, "refund": refund}

static func active_tasks(state: Dictionary) -> Array:
	var open: Array = []
	for task in state.get("tasks", []):
		if not bool(task.get("done", false)):
			open.append(task)
	return open

static func add_task(state: Dictionary, text: String) -> Dictionary:
	var clean := text.strip_edges()
	if clean.length() > 24:
		clean = clean.substr(0, 24)
	if clean.is_empty():
		return {"ok": false, "why": "empty"}
	if active_tasks(state).size() >= MAX_TASKS:
		return {"ok": false, "why": "full"}
	var task := {"id": "task-%d" % int(state.next_id), "text": clean, "done": false}
	state.next_id = int(state.next_id) + 1
	state.tasks.append(task)
	return {"ok": true, "task": task}

static func complete_task(state: Dictionary, id: String, date: String) -> Dictionary:
	for i in state.tasks.size():
		var task: Dictionary = state.tasks[i]
		if str(task.get("id", "")) != id or bool(task.get("done", false)):
			continue
		var reward := lumen_reward(TASK_XP)
		state.lumens = int(state.lumens) + reward
		state.earned = int(state.earned) + reward
		var kept := task.duplicate()
		kept.done = true
		kept.at = date
		state.done.append(kept)
		state.tasks.remove_at(i)
		return {"ok": true, "reward": reward}
	return {"ok": false}

static func drop_task(state: Dictionary, id: String) -> Dictionary:
	for i in state.tasks.size():
		var task: Dictionary = state.tasks[i]
		if str(task.get("id", "")) != id:
			continue
		state.released.append(task.duplicate())
		state.tasks.remove_at(i)
		return {"ok": true}
	return {"ok": false}

static func sanitize(raw) -> Dictionary:
	var state := fresh_state()
	if typeof(raw) != TYPE_DICTIONARY:
		return state
	for key in ["lumens", "earned", "spent", "refunded"]:
		state[key] = _nonneg(raw.get(key, state[key]))
	state.place = str(raw.get("place", "town"))
	if state.place not in ["town", "home", "tasks", "library", "atelier"]:
		state.place = "town"
	if raw.get("pos") is Array and raw.pos.size() >= 2:
		state.pos = [float(raw.pos[0]), float(raw.pos[1])]
	if _whole(raw.get("yaw", state.yaw)):
		state.yaw = float(raw.yaw)
	elif raw.get("yaw") != null:
		state.yaw = float(raw.yaw)
	var seen := {}
	var max_id := 1
	if raw.get("inventory") is Array:
		for entry in raw.inventory:
			if typeof(entry) != TYPE_DICTIONARY:
				continue
			var uid := str(entry.get("uid", ""))
			var fid := str(entry.get("fid", ""))
			if uid.is_empty() or seen.has(uid) or furniture(fid).is_empty():
				continue
			seen[uid] = true
			var paid := mini(_nonneg(entry.get("paid", 0)), int(furniture(fid).price))
			state.inventory.append({"uid": uid, "fid": fid, "paid": paid})
			max_id = maxi(max_id, _uid_number(uid) + 1)
	state.next_id = maxi(_nonneg(raw.get("next_id", 1)), max_id)
	if raw.get("placed") is Array:
		for p in raw.placed:
			if typeof(p) != TYPE_DICTIONARY:
				continue
			var uid := str(p.get("uid", ""))
			if not seen.has(uid):
				continue
			if state.placed.any(func(a): return str(a.uid) == uid):
				continue
			var item := _item_for_uid(state.inventory, uid)
			var at := {
				"uid": uid,
				"x": int(p.get("x", -1)),
				"z": int(p.get("z", -1)),
				"rotation": _nonneg(p.get("rotation", 0)) % 4,
			}
			if not _whole(p.get("x")) or not _whole(p.get("z")):
				continue
			if placement_check(item, at, state.placed, state.inventory, uid, home_blocked()).ok:
				state.placed.append(at)
	if raw.get("done") is Array:
		for task in raw.done:
			var clean := _clean_task(task, true)
			if not clean.is_empty():
				state.done.append(clean)
	if raw.get("released") is Array:
		for task in raw.released:
			var clean := _clean_task(task, false)
			if not clean.is_empty():
				state.released.append(clean)
	if raw.get("tasks") is Array:
		for task in raw.tasks:
			if active_tasks(state).size() >= MAX_TASKS:
				break
			var clean := _clean_task(task, false)
			if not clean.is_empty():
				state.tasks.append(clean)
	return state

static func home_blocked() -> Array:
	return [Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 5), Vector2i(3, 5)]

static func _clean_task(task, done: bool) -> Dictionary:
	if typeof(task) != TYPE_DICTIONARY:
		return {}
	var text := str(task.get("text", "")).strip_edges()
	if text.is_empty():
		return {}
	if text.length() > 24:
		text = text.substr(0, 24)
	var id := str(task.get("id", ""))
	if id.is_empty():
		return {}
	return {"id": id.substr(0, 40), "text": text, "done": done, "at": str(task.get("at", "")).substr(0, 32)}

static func _nonneg(v) -> int:
	if typeof(v) != TYPE_INT and typeof(v) != TYPE_FLOAT:
		return 0
	return maxi(0, int(floor(float(v))))

static func _uid_number(uid: String) -> int:
	if not uid.begins_with("item-") and not uid.begins_with("task-"):
		return 0
	var tail := uid.split("-")[-1]
	if not tail.is_valid_int():
		return 0
	return int(tail)

static func to_json(state: Dictionary) -> String:
	return JSON.stringify(state)

static func from_json(text: String) -> Dictionary:
	var data = JSON.parse_string(text)
	return sanitize(data)

static func stick_vector(origin: Vector2, point: Vector2, radius: float) -> Vector2:
	var delta := point - origin
	if delta.length() <= 10.0:
		return Vector2.ZERO
	if delta.length() > radius:
		delta = delta.normalized() * radius
	return delta / radius

static func claim_stick(touches: Array, width: float, current_id: int, left_ratio: float = 0.42) -> int:
	var alive := {}
	for touch in touches:
		if bool(touch.get("down", false)):
			alive[int(touch.id)] = true
	if alive.has(current_id):
		return current_id
	for touch in touches:
		if bool(touch.get("down", false)) and float(touch.x) < width * left_ratio:
			return int(touch.id)
	return -1
