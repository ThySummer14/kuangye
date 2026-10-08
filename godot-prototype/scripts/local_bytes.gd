class_name LocalBytes
extends RefCounted
# Godot 4.6 Unix flush does not update last_error. Reopen the owned temporary
# file before atomic rename so a failed buffered write cannot replace old data.
# This checks bytes visible to the OS, not power-loss/fsync or Web IndexedDB sync.
static func matches(path:String,expected:PackedByteArray)->bool:
	var file:=FileAccess.open(path,FileAccess.READ)
	if file==null:return false
	if file.get_length()!=expected.size():file.close();return false
	var actual:=file.get_buffer(expected.size());file.close()
	return actual==expected
