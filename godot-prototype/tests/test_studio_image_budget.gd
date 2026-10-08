extends SceneTree
const Images=preload("res://scripts/studio_images.gd")
const Fixtures=preload("res://tests/studio_image_fixtures.gd")
func _initialize()->void:call_deferred("run")
func run()->void:
	var started:=Time.get_ticks_usec()
	var source:=Fixtures.corners(4000,4000).save_png_to_buffer()
	var result:=Images.normalize(source,"image/png")
	var ok:bool=result.ok and result.width==1024 and result.height==1024 and result.data.length()<=Images.IMAGE_CHARS and Images.valid_data(result.data)
	var report:={"passed":ok,"source_pixels":16000000,"source_bytes":source.size(),"normalized_chars":result.get("data","").length(),"elapsed_seconds":(Time.get_ticks_usec()-started)/1000000.0,"fixture":"original four-color PNG; not an Android/iOS performance measurement"}
	var f:=FileAccess.open("res://artifacts/studio-image-budget.json",FileAccess.WRITE);f.store_string(JSON.stringify(report,"\t"));f.close()
	print("PASS maximum allowed image normalizes within documented bounds" if ok else "FAIL maximum image normalization");quit(0 if ok else 1)
