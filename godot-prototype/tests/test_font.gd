extends SceneTree

func _initialize() -> void:
	var original: Font = load("res://assets/NotoSansSC-Regular.otf")
	var compact: Font = load("res://assets/NotoSansSC-Regular.woff2")
	var checks: Array[bool] = []
	checks.append(original != null and compact != null)
	checks.append(original.get_supported_chars() == compact.get_supported_chars())
	for size in [12,17,26,48]:
		for text in ["旷野 · 小芽，看看窗外的光。", "稀字龘齉𠀀 / 日本語 한국어", "abc 123 ± ∑ → ×，。！？"]:
			checks.append(original.get_string_size(text,HORIZONTAL_ALIGNMENT_LEFT,-1,size) == compact.get_string_size(text,HORIZONTAL_ALIGNMENT_LEFT,-1,size))
	var failed := checks.count(false)
	print("FONT: %d checks, %d failed; supported characters identical" % [checks.size(),failed])
	quit(1 if failed else 0)
