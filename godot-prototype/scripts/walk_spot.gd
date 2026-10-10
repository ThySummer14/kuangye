class_name WalkSpot
extends RefCounted
# Where the player last stood, kept beside the v4 save rather than inside it so
# older builds still accept v4 files. It holds no progress: an unreadable file is
# ignored and later replaced, while the main save keeps its read-only protection.
const Bytes=preload("res://scripts/local_bytes.gd")
const VERSION:=1
const PATH:="user://town-prototype-v4-walk.json"
const PLACES:=["town","home","shop","studio"]
var path:=""
var last_written:={}

func read()->Dictionary:
	if path.is_empty() or not FileAccess.file_exists(path):return {}
	var parser:=JSON.new()
	if parser.parse(FileAccess.get_file_as_string(path))!=OK:return {}
	var raw=parser.data
	if not raw is Dictionary or raw.size()!=4 or not raw.has_all(["version","place","x","z"]):return {}
	if not (raw.version is float or raw.version is int) or int(raw.version)!=VERSION or float(raw.version)!=float(VERSION):return {}
	if not raw.place is String or not PLACES.has(raw.place):return {}
	for axis in ["x","z"]:
		var value=raw[axis]
		if not (value is float or value is int) or not is_finite(float(value)) or absf(float(value))>50.0:return {}
	var spot:={"place":str(raw.place),"x":float(raw.x),"z":float(raw.z)}
	last_written=spot.duplicate()
	return spot

func write(place:String,x:float,z:float)->bool:
	if path.is_empty() or not PLACES.has(place) or not is_finite(x) or not is_finite(z):return false
	var spot:={"place":place,"x":snappedf(x,0.01),"z":snappedf(z,0.01)}
	if spot==last_written:return true
	var expected:=JSON.stringify({"version":VERSION,"place":spot.place,"x":spot.x,"z":spot.z}).to_utf8_buffer()
	var file:=FileAccess.open(path+".tmp",FileAccess.WRITE)
	if file==null:return false
	var written:=file.store_buffer(expected);file.flush();var error:=file.get_error();file.close()
	if not written or error!=OK or not Bytes.matches(path+".tmp",expected):return false
	if DirAccess.rename_absolute(path+".tmp",path)!=OK:return false
	last_written=spot
	return true
