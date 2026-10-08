extends SceneTree
const State=preload("res://scripts/state.gd")
const Files=preload("res://scripts/studio_files.gd")
var export_ok:=true
func _initialize()->void:call_deferred("run")
func run()->void:
	if OS.get_environment("KUANGYE_WRITE_LIMIT_TEST")!="512":quit(2);return
	var probe:=FileAccess.open("user://buffered-probe.tmp",FileAccess.WRITE)
	var reported:=probe.store_buffer("x".repeat(2000).to_utf8_buffer());probe.flush();var flush_error:=probe.get_error();probe.close()
	var actual:=FileAccess.get_file_as_bytes("user://buffered-probe.tmp").size()
	var original:="original QA bytes".to_utf8_buffer()
	var state:=State.new();state.path="user://short-write-state.json"
	var file:=FileAccess.open(state.path,FileAccess.WRITE);file.store_buffer(original);file.close()
	state.add_note("短写失败测试".repeat(80),"2026-10-08")
	var state_ok:=not state.save_data() and FileAccess.get_file_as_bytes(state.path)==original
	var io:=Files.new();root.add_child(io);io.exported.connect(func(_token,ok,_message):export_ok=ok)
	var path:="user://short-write-album.html";file=FileAccess.open(path,FileAccess.WRITE);file.store_buffer(original);file.close()
	io.save_selected_path(io.token,path,"PRIVATE_QA_NOTE".repeat(180).to_utf8_buffer(),"html")
	var export_preserved:=not export_ok and FileAccess.get_file_as_bytes(path)==original
	var clean:=true
	for name in DirAccess.open("user://").get_files():
		if name.begins_with("short-write-album.html.kuangye-"):clean=false
	print(JSON.stringify({"state_rejected_and_old_preserved":state_ok,"export_rejected_and_old_preserved":export_preserved,"export_temporary_removed":clean,"file_size_limit":512,"raw_store_return":reported,"raw_flush_error":flush_error,"raw_bytes_visible":actual}))
	quit(0 if state_ok and export_preserved and clean else 1)
