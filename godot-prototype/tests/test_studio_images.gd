extends SceneTree
const Media=preload("res://scripts/studio_images.gd")
const Fixtures=preload("res://tests/studio_image_fixtures.gd")
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func color_distance(a:Color,b:Color)->float:return Vector3(a.r,a.g,a.b).distance_to(Vector3(b.r,b.g,b.b))
func run()->void:
	var original:=Fixtures.corners()
	var sources:={"png":original.save_png_to_buffer(),"jpeg":original.save_jpg_to_buffer(.92),"webp":original.save_webp_to_buffer()}
	for format in sources:
		var raw:PackedByteArray=sources[format];var info:=Media.inspect(raw,Media.MIME[format])
		check(info.ok and info.width==320 and info.height==200,format+" header dimensions read before decode")
		var result:=Media.normalize(raw,Media.MIME[format])
		check(result.ok and result.data.length()<=Media.IMAGE_CHARS and Media.valid_data(result.data),format+" becomes a complete bounded JPEG data copy")
		var again:=Media.normalize(raw,Media.MIME[format])
		check(again.ok and again.data==result.data,format+" repeated import yields the same normalized bytes")
	check(not Media.inspect(sources.png,"image/jpeg").ok,"conflicting MIME does not override byte signature")
	check(not Media.inspect(PackedByteArray()).ok,"empty file rejected")
	check(not Media.inspect("<svg onload='bad()'></svg>".to_utf8_buffer(),"image/png").ok,"SVG disguised as PNG rejected without execution")
	check(not Media.inspect("<html>not an image</html>".to_utf8_buffer(),"image/png").ok,"HTML disguised as image rejected")
	check(not Media.inspect(Fixtures.huge_png_header()).ok,"huge compressed-image dimensions rejected before allocation")
	check(not Media.dimensions(4096,4096,"png").ok and Media.dimensions(4000,4000,"png").ok,"sixteen-million-pixel boundary is enforced")
	check(not Media.dimensions(8193,1,"png").ok,"maximum individual edge is enforced")
	var oversized:=PackedByteArray();oversized.resize(Media.SOURCE_BYTES+1)
	check(not Media.inspect(oversized).ok,"source larger than twenty MiB rejected before decode")
	check(not Media.inspect(sources.png.slice(0,sources.png.size()-10)).ok,"truncated PNG rejected")
	check(not Media.inspect(sources.jpeg.slice(0,sources.jpeg.size()-1)).ok,"truncated JPEG rejected")
	check(not Media.inspect(sources.webp.slice(0,sources.webp.size()-1)).ok,"truncated WebP rejected")
	var apng:PackedByteArray=sources.png.slice(0,33);apng.append_array(Fixtures.chunk("acTL",PackedByteArray([0,0,0,2,0,0,0,0])));apng.append_array(sources.png.slice(33))
	check(not Media.inspect(apng).ok,"animated PNG rejected as unsupported static input")
	var animated:=PackedByteArray([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,2,0,0,0,10,0,0,10,0,0])
	check(not Media.inspect(animated).ok,"animated WebP rejected before decode")
	var flat:=Media.normalize(Fixtures.transparent())
	var flat_bytes:=Media.data_bytes(flat.data);var decoded:=Media.decode(flat_bytes.bytes,flat_bytes.format)
	check(color_distance(decoded.get_pixel(10,10),Color("fffdf8"))<.025,"transparent input is placed on the documented warm white paper")
	var expected=[ [Fixtures.RED,Fixtures.BLUE,Fixtures.GREEN,Fixtures.GOLD], [Fixtures.BLUE,Fixtures.RED,Fixtures.GOLD,Fixtures.GREEN], [Fixtures.GOLD,Fixtures.GREEN,Fixtures.BLUE,Fixtures.RED], [Fixtures.GREEN,Fixtures.GOLD,Fixtures.RED,Fixtures.BLUE], [Fixtures.RED,Fixtures.GREEN,Fixtures.BLUE,Fixtures.GOLD], [Fixtures.GREEN,Fixtures.RED,Fixtures.GOLD,Fixtures.BLUE], [Fixtures.GOLD,Fixtures.BLUE,Fixtures.GREEN,Fixtures.RED], [Fixtures.BLUE,Fixtures.GOLD,Fixtures.RED,Fixtures.GREEN] ]
	for orientation in range(1,9):
		var source:=Fixtures.jpeg_exif(orientation);var result:=Media.normalize(source,"image/jpeg")
		check(result.ok and result.source_orientation==orientation,"JPEG EXIF orientation "+str(orientation)+" is recognized")
		var content:=Media.data_bytes(result.data);var image:=Media.decode(content.bytes,content.format)
		var samples=[Vector2(.25,.25),Vector2(.75,.25),Vector2(.25,.75),Vector2(.75,.75)];var correct:=true
		for i in 4:
			var actual:=image.get_pixel(int(image.get_width()*samples[i].x),int(image.get_height()*samples[i].y));var wanted:Color=expected[orientation-1][i]
			correct=correct and Vector3(actual.r,actual.g,actual.b).distance_to(Vector3(wanted.r,wanted.g,wanted.b))<.12
		check(correct and image.get_size()==(Vector2i(200,320) if orientation>=5 else Vector2i(320,200)),"orientation "+str(orientation)+" has the expected pixel corners and dimensions")
		check(Media.jpeg_header(content.bytes).orientation==1 and not content.bytes.get_string_from_ascii().contains("PRIVATE_QA_METADATA_ONLY"),"orientation "+str(orientation)+" normalized copy omits source metadata")
	for format in ["png","webp"]:
		var oriented:=Fixtures.png_exif(6) if format=="png" else Fixtures.webp_exif(6)
		var result:=Media.normalize(oriented,Media.MIME[format])
		check(result.ok and result.source_orientation==6 and result.width==200 and result.height==320,format+" TIFF orientation is applied before metadata removal")
		var malformed:=Fixtures.png_exif(9) if format=="png" else Fixtures.webp_exif(9)
		check(not Media.inspect(malformed).ok,format+" invalid orientation metadata rejected before decode")
	var safe:String=Media.normalize(sources.png).data
	check(not Media.valid_data("https://example.com/picture.png"),"external image URL cannot enter saved fields")
	check(not Media.valid_data("data:image/svg+xml;base64,PHN2Zz4="),"active image formats cannot enter saved fields")
	check(not Media.valid_data("data:image/png;base64,aGVsbG8="),"base64 text pretending to be a PNG is rejected")
	check(not Media.valid_data(safe+"garbage"),"noncanonical base64 tail rejected")
	var f:=FileAccess.open("res://artifacts/studio-image-results.json",FileAccess.WRITE);f.store_string(JSON.stringify({"passed":passed,"failed":failed,"source_pixel_limit":Media.SOURCE_PIXELS,"input_fixture_source":"original procedural color patterns"},"\t"));f.close()
	print("STUDIO IMAGES ",passed," passed, ",failed," failed");quit(0 if failed==0 else 1)
