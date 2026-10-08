extends RefCounted
const RED=Color("d65b4c")
const BLUE=Color("4e80b0")
const GREEN=Color("60956d")
const GOLD=Color("ddb966")
static func corners(width:=320,height:=200)->Image:
	var image:=Image.create(width,height,false,Image.FORMAT_RGBA8)
	image.fill_rect(Rect2i(0,0,width/2,height/2),RED)
	image.fill_rect(Rect2i(width/2,0,width-width/2,height/2),BLUE)
	image.fill_rect(Rect2i(0,height/2,width/2,height-height/2),GREEN)
	image.fill_rect(Rect2i(width/2,height/2,width-width/2,height-height/2),GOLD)
	return image
static func transparent()->PackedByteArray:
	var image:=Image.create(300,200,false,Image.FORMAT_RGBA8);image.fill(Color(0,0,0,0))
	image.fill_rect(Rect2i(80,40,140,120),GREEN)
	return image.save_png_to_buffer()
static func jpeg_exif(orientation:int)->PackedByteArray:
	var source:=corners().save_jpg_to_buffer(.96)
	var exif:=PackedByteArray([69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0])
	exif.append_array("PRIVATE_QA_METADATA_ONLY".to_utf8_buffer())
	var length:=exif.size()+2;var out:=source.slice(0,2)
	out.append_array(PackedByteArray([255,225,(length>>8)&255,length&255]));out.append_array(exif);out.append_array(source.slice(2));return out
static func chunk(name:String,payload:PackedByteArray)->PackedByteArray:
	var n:=payload.size();var out:=PackedByteArray([(n>>24)&255,(n>>16)&255,(n>>8)&255,n&255]);out.append_array(name.to_ascii_buffer());out.append_array(payload);out.append_array(PackedByteArray([0,0,0,0]));return out
static func huge_png_header()->PackedByteArray:
	var out:=PackedByteArray([137,80,78,71,13,10,26,10]);var data:=PackedByteArray([0,0,195,80,0,0,195,80,8,6,0,0,0])
	out.append_array(chunk("IHDR",data));return out

static func tiff(orientation:int)->PackedByteArray:
	return PackedByteArray([73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0])
static func png_chunk(name:String,payload:PackedByteArray)->PackedByteArray:
	var out:=chunk(name,payload);var crc:=4294967295
	for byte in out.slice(4,out.size()-4):
		crc=crc^byte
		for bit in 8:crc=(crc>>1)^3988292384 if (crc&1)!=0 else crc>>1
	crc=crc^4294967295
	for i in 4:out[out.size()-4+i]=(crc>>(24-8*i))&255
	return out
static func png_exif(orientation:int)->PackedByteArray:
	var original:=corners().save_png_to_buffer();var out:=original.slice(0,33)
	out.append_array(png_chunk("eXIf",tiff(orientation)));out.append_array(original.slice(33));return out
static func webp_exif(orientation:int)->PackedByteArray:
	var original:=corners().save_webp_to_buffer();var out:=original.duplicate()
	var payload:=tiff(orientation);out.append_array("EXIF".to_ascii_buffer());out.append_array(PackedByteArray([payload.size(),0,0,0]));out.append_array(payload)
	var size:=out.size()-8
	for i in 4:out[4+i]=(size>>(i*8))&255
	return out
