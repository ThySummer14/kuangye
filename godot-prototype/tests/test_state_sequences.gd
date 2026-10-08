extends SceneTree

const State=preload("res://scripts/state.gd")
const Catalog=preload("res://scripts/catalog.gd")
var failure:=""

func _initialize() -> void:
	var rng:=RandomNumberGenerator.new()
	rng.seed=20261008
	var state:=State.new()
	state.path="user://sequence-test-fixture.json"
	state.coins=10000
	var expected_coins:=state.coins
	var totals:Dictionary=state.inventory.duplicate()
	var reward_dates:Array[String]=[]
	var kinds:Array=Catalog.ITEMS.keys()
	var completed:=0
	for step in 5000:
		var kind:String=kinds[rng.randi_range(0,kinds.size()-1)]
		var x:=rng.randi_range(-10,10)
		var z:=rng.randi_range(-9,9)
		var rotation:=rng.randi_range(-8,8)
		match rng.randi_range(0,5):
			0:
				if state.buy(kind):
					expected_coins-=int(Catalog.ITEMS[kind].price)
					totals[kind]+=1
			1:state.place(kind,x,z,rotation)
			2:
				if not state.placements.is_empty():
					state.move_item(int(state.placements[rng.randi_range(0,state.placements.size()-1)].id),x,z,rotation)
			3:
				if not state.placements.is_empty():
					state.return_item(int(state.placements[rng.randi_range(0,state.placements.size()-1)].id))
			4:
				var date:="2026-10-%02d" % rng.randi_range(1,31)
				if state.add_note("序列测试中的真实记录占位",date) and not reward_dates.has(date):
					reward_dates.append(date)
					expected_coins+=5
			5:
				if step%25==0:
					if not state.save_data():failure="could not save fixture";break
					var restored:=State.new()
					restored.path=state.path
					if not restored.load_data() or restored.serialize()!=state.serialize():failure="round trip changed data at step %d" % step;break
		if not invariant(state,totals,expected_coins):
			failure+=" at step %d" % step
			break
		completed+=1
	DirAccess.remove_absolute(state.path)
	var result:={"seed":20261008,"operations":completed,"expected_operations":5000,"passed":failure.is_empty(),"error":failure,"notes":state.notes.size(),"placements":state.placements.size(),"coins":state.coins}
	var file:=FileAccess.open("res://artifacts/state-sequences.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(result,"\t"))
	file.close()
	print("SEQUENCE TEST: ",completed," / 5000 operations; ","passed" if failure.is_empty() else failure)
	quit(0 if failure.is_empty() else 1)

func invariant(state:TownState,totals:Dictionary,expected_coins:int) -> bool:
	if state.coins!=expected_coins or state.coins<0:
		failure="currency conservation failed"
		return false
	var actual:Dictionary=state.inventory.duplicate()
	var ids:Array[int]=[]
	for item in state.placements:
		if ids.has(item.id) or int(item.id)>=state.next_id:
			failure="persistent identities collided"
			return false
		ids.append(item.id)
		actual[item.kind]+=1
		if not state.can_place(item.kind,item.x,item.z,item.rotation,item.id):
			failure="accepted furniture became illegal"
			return false
	if actual!=totals:
		failure="furniture conservation failed"
		return false
	return true
