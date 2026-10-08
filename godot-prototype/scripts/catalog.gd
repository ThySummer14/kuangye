class_name TownCatalog
extends RefCounted

# Ported from app/src/data/furniture.js. Units remain 0.5m and prices are not duplicated in UI.
const ITEMS := {
	"stool": {"name": "栗木小凳", "price": 15, "size": Vector2i(1, 1), "color": "b68b62"},
	"plant": {"name": "陶盆绿植", "price": 20, "size": Vector2i(1, 1), "color": "77a26a"},
	"lamp": {"name": "蘑菇台灯", "price": 40, "size": Vector2i(1, 1), "color": "e2b86f"},
	"table": {"name": "橡木圆桌", "price": 65, "size": Vector2i(2, 2), "color": "bc9469"},
	"shelf": {"name": "原木书架", "price": 110, "size": Vector2i(2, 1), "color": "b98e61"},
	"rug": {"name": "奶油圆毯", "price": 25, "size": Vector2i(2, 2), "color": "ddbd85"},
}
const CELL := 0.5
const ROOM := Rect2i(-8, -7, 16, 14)
const DOOR := Rect2i(-2, 5, 4, 2)

static func footprint(kind: String, rotation: int) -> Vector2i:
	var result: Vector2i = ITEMS[kind].size
	return Vector2i(result.y, result.x) if posmod(rotation, 2) == 1 else result

static func placement_rect(item: Dictionary) -> Rect2i:
	return Rect2i(Vector2i(int(item.x), int(item.z)), footprint(item.kind, int(item.rotation)))
