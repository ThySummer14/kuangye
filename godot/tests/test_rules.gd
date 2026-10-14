extends SceneTree

const Rules = preload("res://scripts/rules.gd")

var failed := 0

func _init() -> void:
	_expect(Rules.lumen_reward(25) == 15, "task xp 25 pays 15")
	_expect(Rules.lumen_reward(50) == 30, "xp 50 pays 30")
	_expect(Rules.lumen_reward(0) == 0, "xp 0 pays 0")
	_expect(Rules.refund_for(15) == 10, "refund 15 -> 10")
	_expect(Rules.refund_for(5) == 3, "refund 5 -> 3")
	_expect(Rules.refund_for(40) == 28, "refund 40 -> 28")
	_expect(Rules.footprint(Rules.furniture("shelf"), 1) == Vector2i(1, 2), "rotation swaps footprint")
	_expect(Rules.footprint(Rules.furniture("shelf"), 0) == Vector2i(2, 1), "unrotated shelf")

	var state := Rules.fresh_state()
	_expect(int(state.lumens) == 80, "seed pocket is 80")
	_expect(not Rules.buy(state, "stringlights").ok, "gifts are not sold")
	_expect(not Rules.buy(state, "bed").ok, "cannot afford the bed")
	var bought: Dictionary = Rules.buy(state, "stool")
	_expect(bought.ok and int(state.lumens) == 65, "stool costs 15")
	var uid := str(bought.item.uid)
	_expect(Rules.place_item(state, uid, 4, 2, 0).ok, "stool places")
	_expect(not Rules.place_item(state, uid, 6, 5, 0).ok, "stool stays inside")
	var mat: Dictionary = Rules.buy(state, "mat")
	_expect(Rules.place_item(state, mat.item.uid, 4, 2, 0).ok, "floor layer can share a cell")
	_expect(not Rules.place_item(state, uid, 0, 0, 0, Rules.home_blocked()).ok, "counter cells stay clear")
	var rotated: Dictionary = Rules.rotate_item(state, uid)
	_expect(rotated.ok, "square stool still rotates")
	var refund: Dictionary = Rules.recycle_item(state, uid)
	_expect(refund.ok and int(refund.refund) == 10, "recycle returns 70 percent")
	_expect(Rules._find_inventory(state, uid).is_empty(), "recycled item leaves the pocket")

	_expect(Rules.add_task(state, "  ").ok == false, "blank task rejected")
	_expect(Rules.add_task(state, "出门走一走").ok, "first task")
	_expect(Rules.add_task(state, "把桌子擦一下").ok, "second task")
	_expect(Rules.add_task(state, "看一页书").ok, "third task")
	_expect(not Rules.add_task(state, "第四件").ok, "fourth active task blocked")
	var before := int(state.lumens)
	var done: Dictionary = Rules.complete_task(state, state.tasks[0].id, "2026-10-08")
	_expect(done.ok and int(done.reward) == 15, "completion pays the shared formula")
	_expect(int(state.lumens) == before + 15, "lumens increase once")
	_expect(state.tasks.size() == 2, "completed task leaves the active list")
	_expect(state.done.size() == 1, "completed task is kept")
	_expect(Rules.drop_task(state, state.tasks[0].id).ok, "drop has no fee")
	_expect(int(state.lumens) == before + 15, "dropping does not charge")
	_expect(state.released.size() == 1, "dropped task is kept")

	var packed := Rules.to_json(state)
	var restored := Rules.from_json(packed)
	_expect(int(restored.lumens) == int(state.lumens), "json keeps lumens")
	_expect(restored.placed.size() == state.placed.size(), "json keeps placement")
	_expect(restored.done.size() == 1 and restored.released.size() == 1, "json keeps task history")
	var broken := Rules.from_json("{\"placed\":[{\"uid\":\"nope\",\"x\":0,\"z\":0}],\"lumens\":-4}")
	_expect(broken.placed.is_empty() and int(broken.lumens) == 0, "bad placement and negative light are dropped")

	var touches := [
		{"id": 3, "x": 40.0, "down": true},
		{"id": 8, "x": 30.0, "down": true},
	]
	_expect(Rules.claim_stick(touches, 400.0, -1) == 3, "first left finger owns the stick")
	touches.append({"id": 9, "x": 20.0, "down": true})
	_expect(Rules.claim_stick(touches, 400.0, 3) == 3, "a second finger does not steal the stick")
	touches[0].down = false
	_expect(Rules.claim_stick(touches, 400.0, 3) == 8, "stick moves on only after release")
	_expect(Rules.stick_vector(Vector2.ZERO, Vector2(0, -80), 100).is_equal_approx(Vector2(0, -0.8)), "stick points up")

	if failed == 0:
		print("rules ok")
	else:
		print("rules failed ", failed)
	quit(failed)

func _expect(cond: bool, label: String) -> void:
	if not cond:
		failed += 1
		push_error(label)
