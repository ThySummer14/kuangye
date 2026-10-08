class_name StudioImages
extends RefCounted
const SOURCE_BYTES=20*1024*1024
const SOURCE_PIXELS=16000000
const SOURCE_EDGE=8192
const IMAGE_CHARS=240000
const ALL_IMAGE_CHARS=1800000
const MAX_IMAGES=4
const MIME={"png":"image/png","jpeg":"image/jpeg","webp":"image/webp"}
static func failed(message:String)->Dictionary:return {"ok":false,"error":message}
static func u16(b:PackedByteArray,p:int,little:=false)->int:
	return int(b[p])+(int(b[p+1])<<8) if little else (int(b[p])<<8)+int(b[p+1])
static func u24(b:PackedByteArray,p:int)->int:return int(b[p])+(int(b[p+1])<<8)+(int(b[p+2])<<16)
static func u32(b:PackedByteArray,p:int,little:=false)->int:
	return int(b[p])+(int(b[p+1])<<8)+(int(b[p+2])<<16)+(int(b[p+3])<<24) if little else (int(b[p])<<24)+(int(b[p+1])<<16)+(int(b[p+2])<<8)+int(b[p+3])
static func tag(b:PackedByteArray,p:int,n:=4)->String:return b.slice(p,p+n).get_string_from_ascii()
static func dimensions(w:int,h:int,format:String,orientation:=1)->Dictionary:
	if w<=0 or h<=0 or w>SOURCE_EDGE or h>SOURCE_EDGE or w*h>SOURCE_PIXELS:return failed("图片像素过大；请先缩小到1600万像素、最长边8192以内。原图未改变。")
	return {"ok":true,"format":format,"width":w,"height":h,"orientation":orientation}
static func inspect(b:PackedByteArray,mime_hint:="")->Dictionary:
	if b.is_empty() or b.size()>SOURCE_BYTES:return failed("请选择非空且不超过20 MiB的PNG、JPEG或WebP图片。")
	var result:Dictionary
	if b.size()>=8 and b.slice(0,8)==PackedByteArray([137,80,78,71,13,10,26,10]):result=png_header(b)
	elif b.size()>=4 and b[0]==255 and b[1]==216:result=jpeg_header(b)
	elif b.size()>=12 and tag(b,0)=="RIFF" and tag(b,8)=="WEBP":result=webp_header(b)
	else:return failed("文件内容不是受支持的静态PNG、JPEG或WebP图片。")
	if result.ok and mime_hint!="" and mime_hint.to_lower()!=MIME[result.format]:return failed("图片标记与实际内容不一致，请重新导出图片。")
	return result
static func png_header(b:PackedByteArray)->Dictionary:
	var p:=8;var w:=0;var h:=0;var data_seen:=false;var end_seen:=false;var orientation:=1
	while p+12<=b.size():
		var length:=u32(b,p);var kind:=tag(b,p+4)
		if length>b.size()-p-12:return failed("PNG不完整，已有图片保留。")
		if p==8:
			if kind!="IHDR" or length!=13:return failed("PNG头部无法识别。")
			w=u32(b,p+8);h=u32(b,p+12)
			var size_check:=dimensions(w,h,"png")
			if not size_check.ok:return size_check
		elif kind=="IHDR":return failed("PNG头部重复，未读取。")
		if kind=="acTL" or kind=="fcTL" or kind=="fdAT":return failed("本轮只接静态图片，请先导出一张静态PNG。")
		if kind=="eXIf":
			orientation=tiff_orientation(b,p+8,length)
			if orientation==0:return failed("PNG方向资料无法识别，请重新转存图片。")
		if kind=="IDAT":data_seen=true
		if kind=="IEND":
			if length!=0 or p+12!=b.size():return failed("PNG结束标记不正确。")
			end_seen=true;break
		p+=length+12
	if not end_seen or not data_seen:return failed("PNG不完整，已有图片保留。")
	return dimensions(w,h,"png",orientation)
static func exif_orientation(b:PackedByteArray,begin:int,length:int)->int:
	if b.slice(begin,begin+6)!=PackedByteArray([69,120,105,102,0,0]):return 1
	if length<14:return 0
	return tiff_orientation(b,begin+6,length-6)
static func tiff_orientation(b:PackedByteArray,t:int,length:int)->int:
	var end:=t+length
	if length<8 or t<0 or end>b.size():return 0
	var order:=tag(b,t,2)
	if not order in ["II","MM"] or t+8>end:return 0
	var little:=order=="II"
	if u16(b,t+2,little)!=42:return 0
	var offset:=u32(b,t+4,little)
	if offset>length-8:return 0
	var ifd:=t+offset
	if ifd+2>end:return 0
	var count:=u16(b,ifd,little)
	if count>256 or ifd+2+count*12>end:return 0
	for i in count:
		var p:=ifd+2+i*12
		if u16(b,p,little)==274:
			if u16(b,p+2,little)!=3 or u32(b,p+4,little)!=1:return 0
			var value:=u16(b,p+8,little)
			return value if value>=1 and value<=8 else 0
	return 1
static func jpeg_header(b:PackedByteArray)->Dictionary:
	if b.size()<4 or b[b.size()-2]!=255 or b[b.size()-1]!=217:return failed("JPEG不完整，请换一份可打开的图片。")
	var p:=2;var w:=0;var h:=0;var orientation:=1
	while p<b.size():
		if b[p]!=255:return failed("JPEG头部无法识别。")
		while p<b.size() and b[p]==255:p+=1
		if p>=b.size():break
		var marker:int=b[p];p+=1
		if marker==218:break
		if marker==217:break
		if marker==1 or (marker>=208 and marker<=215):continue
		if p+2>b.size():return failed("JPEG不完整。")
		var length:=u16(b,p)
		if length<2 or p+length>b.size():return failed("JPEG不完整。")
		if marker==225:
			var parsed:=exif_orientation(b,p+2,length-2)
			if parsed==0:return failed("JPEG方向资料无法识别，请转存为PNG或普通JPEG。")
			if parsed!=1:orientation=parsed
		if marker>=192 and marker<=207 and not marker in [196,200,204]:
			if length<8 or b[p+2]!=8:return failed("当前支持8位JPEG，请转存普通JPEG或PNG。")
			var next_h:=u16(b,p+3);var next_w:=u16(b,p+5)
			if w!=0 and (next_w!=w or next_h!=h):return failed("JPEG包含冲突的尺寸信息。")
			w=next_w;h=next_h
			var size_check:=dimensions(w,h,"jpeg",orientation)
			if not size_check.ok:return size_check
		p+=length
	return dimensions(w,h,"jpeg",orientation)
static func webp_header(b:PackedByteArray)->Dictionary:
	if u32(b,4,true)+8!=b.size():return failed("WebP不完整或容器长度不正确。")
	var p:=12;var w:=0;var h:=0;var canvas_w:=0;var canvas_h:=0;var orientation:=1;var frames:=0
	while p+8<=b.size():
		var kind:=tag(b,p);var length:=u32(b,p+4,true);var d:=p+8
		if length>b.size()-d:return failed("WebP数据不完整。")
		if kind in ["ANIM","ANMF"]:return failed("本轮只接静态图片，请先导出一张静态WebP。")
		if kind=="EXIF":
			orientation=exif_orientation(b,d,length) if b.slice(d,d+6)==PackedByteArray([69,120,105,102,0,0]) else tiff_orientation(b,d,length)
			if orientation==0:return failed("WebP方向资料无法识别，请重新转存图片。")
		if kind in ["VP8 ","VP8L"]:
			frames+=1
			if frames>1:return failed("WebP包含重复帧，未读取。")
		if kind=="VP8X":
			if length<10 or (b[d]&2)!=0:return failed("动画或无法识别的WebP。")
			canvas_w=u24(b,d+4)+1;canvas_h=u24(b,d+7)+1
			var size_check:=dimensions(canvas_w,canvas_h,"webp")
			if not size_check.ok:return size_check
		elif kind=="VP8 ":
			if length<10 or b.slice(d+3,d+6)!=PackedByteArray([157,1,42]):return failed("WebP帧头无法识别。")
			w=u16(b,d+6,true)&16383;h=u16(b,d+8,true)&16383
		elif kind=="VP8L":
			if length<5 or b[d]!=47:return failed("WebP帧头无法识别。")
			var packed:=u32(b,d+1,true);w=(packed&16383)+1;h=((packed>>14)&16383)+1
		if w>0:
			var size_check:=dimensions(w,h,"webp")
			if not size_check.ok:return size_check
		p=d+length+(length%2)
	if p!=b.size():return failed("WebP容器尾部不完整。")
	if canvas_w>0 and (canvas_w!=w or canvas_h!=h):return failed("WebP尺寸信息不一致。")
	return dimensions(w,h,"webp",orientation)
static func orient(image:Image,value:int)->void:
	match value:
		2:image.flip_x()
		3:image.flip_x();image.flip_y()
		4:image.flip_y()
		5:image.rotate_90(CLOCKWISE);image.flip_x()
		6:image.rotate_90(CLOCKWISE)
		7:image.rotate_90(CLOCKWISE);image.flip_y()
		8:image.rotate_90(COUNTERCLOCKWISE)
static func decode(b:PackedByteArray,format:String)->Image:
	var image:=Image.new();var error:=ERR_FILE_UNRECOGNIZED
	match format:
		"png":error=image.load_png_from_buffer(b)
		"jpeg":error=image.load_jpg_from_buffer(b)
		"webp":error=image.load_webp_from_buffer(b)
	return image if error==OK and not image.is_empty() else null
static func normalize(b:PackedByteArray,mime_hint:="")->Dictionary:
	var info:=inspect(b,mime_hint)
	if not info.ok:return info
	var image:=decode(b,info.format)
	if image==null:return failed("这张图片没能解码，已有图片都保留着。")
	if image.get_width()!=info.width or image.get_height()!=info.height:return failed("图片解码尺寸与头部不一致。")
	orient(image,info.orientation)
	for edge in [1024,768,512]:
		var ratio:=minf(1.0,float(edge)/maxi(image.get_width(),image.get_height()))
		if ratio<1.0:image.resize(maxi(1,roundi(image.get_width()*ratio)),maxi(1,roundi(image.get_height()*ratio)),Image.INTERPOLATE_LANCZOS)
		if image.get_format()!=Image.FORMAT_RGBA8:image.convert(Image.FORMAT_RGBA8)
		var paper:=Image.create(image.get_width(),image.get_height(),false,Image.FORMAT_RGBA8);paper.fill(Color("fffdf8"))
		paper.blend_rect(image,Rect2i(Vector2i.ZERO,image.get_size()),Vector2i.ZERO);paper.convert(Image.FORMAT_RGB8)
		for quality in [0.82,0.65,0.48]:
			var encoded:=paper.save_jpg_to_buffer(quality)
			if encoded.is_empty():continue
			var value:="data:image/jpeg;base64,"+Marshalls.raw_to_base64(encoded)
			if value.length()<=IMAGE_CHARS:return {"ok":true,"data":value,"width":paper.get_width(),"height":paper.get_height(),"bytes":encoded.size(),"source_orientation":info.orientation}
	return failed("这张图片缩小后仍超出保存容量，请换一张较小图片。")
static func data_bytes(value:Variant)->Dictionary:
	if not value is String or value.length()>IMAGE_CHARS:return failed("图片副本超出容量。")
	var regex:=RegEx.new();regex.compile("^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$")
	var match_value:=regex.search(value)
	if match_value==null:return failed("图片只能是本机保存的静态图片副本。")
	var encoded:=match_value.get_string(2);var bytes:=Marshalls.base64_to_raw(encoded)
	if bytes.is_empty() or Marshalls.raw_to_base64(bytes)!=encoded:return failed("图片副本编码不完整。")
	var info:=inspect(bytes,MIME[match_value.get_string(1)])
	if not info.ok:return info
	if maxi(info.width,info.height)>1024:return failed("已保存图片副本的尺寸超出限制。")
	return {"ok":true,"bytes":bytes,"format":info.format}
static func valid_data(value:Variant)->bool:
	var data:=data_bytes(value)
	return data.ok and decode(data.bytes,data.format)!=null
static func thumbnail(value:String,edge:=192)->Texture2D:
	var data:=data_bytes(value)
	if not data.ok:return null
	var image:=decode(data.bytes,data.format)
	if image==null:return null
	var ratio:=minf(1.0,float(edge)/maxi(image.get_width(),image.get_height()))
	if ratio<1:image.resize(maxi(1,roundi(image.get_width()*ratio)),maxi(1,roundi(image.get_height()*ratio)),Image.INTERPOLATE_LANCZOS)
	return ImageTexture.create_from_image(image)
