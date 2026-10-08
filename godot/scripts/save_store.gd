extends RefCounted
class_name SaveStore

const FILE_PATH := "user://kuangye-godot-v1.json"

static func load_state() -> Dictionary:
	var from_browser := _read_local_storage()
	if not from_browser.is_empty():
		return GameRules.from_json(from_browser)
	if FileAccess.file_exists(FILE_PATH):
		var file := FileAccess.open(FILE_PATH, FileAccess.READ)
		if file:
			var text := file.get_as_text()
			file.close()
			return GameRules.from_json(text)
	return GameRules.fresh_state()

static func save_state(state: Dictionary) -> void:
	var text := GameRules.to_json(state)
	var file := FileAccess.open(FILE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(text)
		file.close()
	_write_local_storage(text)

static func _write_local_storage(text: String) -> void:
	if not OS.has_feature("web"):
		return
	var b64 := Marshalls.utf8_to_base64(text)
	JavaScriptBridge.eval(
		"(function(b){var bin=atob(b);var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);localStorage.setItem('%s', new TextDecoder('utf-8').decode(bytes));})('%s');" % [GameRules.SAVE_KEY, b64],
		true
	)

static func _read_local_storage() -> String:
	if not OS.has_feature("web"):
		return ""
	var b64 = JavaScriptBridge.eval(
		"(function(){var s=localStorage.getItem('%s');if(!s)return '';var bytes=new TextEncoder().encode(s);var bin='';for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin);})()" % GameRules.SAVE_KEY,
		true
	)
	if typeof(b64) != TYPE_STRING or b64.is_empty():
		return ""
	return Marshalls.base64_to_utf8(b64)
