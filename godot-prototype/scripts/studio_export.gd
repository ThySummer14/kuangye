class_name StudioExport
extends RefCounted
const Images=preload("res://scripts/studio_images.gd")
const MAX_HTML_BYTES=16*1024*1024
static func escape(value:String)->String:
	return value.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;").replace("'","&#39;")
static func album(works:Array,include_note:=false)->Dictionary:
	if works.is_empty():return {"ok":false,"error":"先在画室收好一件作品，再导出。"}
	var sections:=PackedStringArray()
	for work in works:
		var html:="<article><h2>"+escape(work.title)+"</h2><p class=meta>"+escape(work.updated)+"</p>"
		for picture in work.images:
			if not Images.valid_data(picture):return {"ok":false,"error":"有一张图片副本无法读取，未生成缺图作品集。"}
			html+='<figure><img alt="'+escape(work.title)+'" src="'+escape(picture)+'"></figure>'
		html+="<p class=body>"+escape(work.body).replace("\n","<br>\n")+"</p>"
		if include_note and not work.note.is_empty():html+="<aside><h3>留给自己的话</h3><p>"+escape(work.note).replace("\n","<br>\n")+"</p></aside>"
		html+="</article>";sections.append(html)
	var document:="""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>旷野 · 我的作品集</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4efe4;color:#283e35;font-family:system-ui,'Noto Sans SC',sans-serif;line-height:1.8}main{max-width:840px;margin:auto;padding:40px 24px}header{margin-bottom:32px}h1{font-size:26px}h2{font-size:24px;line-height:1.5;overflow-wrap:anywhere}h3{font-size:16px}.meta{color:#66766b;font-size:14px}article{padding:28px;background:#fffdf8;border:1px solid #ded7c7;margin:24px 0;border-radius:12px;break-inside:auto}.body,aside{overflow-wrap:anywhere;white-space:normal}figure{margin:20px 0}img{max-width:100%;height:auto;display:block;margin:auto}aside{border-top:1px solid #ded7c7;padding-top:16px;color:#606e62}footer{font-size:13px;color:#66766b}@media print{body{background:white}main{max-width:none;padding:0}article{border:0;border-radius:0;break-before:page}img{max-height:80vh;object-fit:contain}header{break-after:avoid}}
</style></head><body><main><header><h1>旷野 · 我的作品集</h1><p>已收好的图文作品。图片是保存在本机的缩小副本，原图请另留。</p></header>"""
	document+="\n".join(sections)+"<footer>可离线打开，也可使用浏览器的打印功能。</footer></main></body></html>"
	var bytes:=document.to_utf8_buffer()
	if bytes.size()>MAX_HTML_BYTES:return {"ok":false,"error":"完整作品集超过本轮导出容量，内容未被截断。请先逐件导出，保留当前存档。"}
	return {"ok":true,"bytes":bytes,"count":works.size(),"include_note":include_note,"mime":"text/html;charset=utf-8","filename":"kuangye-album.html"}
static func lines(value:String,font:Font,font_size:int,width:float,max_lines:int)->Dictionary:
	var result:Array[String]=[];var line:="";var truncated:=false;var chars:=0
	for ch in value:
		if ch=="\r":continue
		if ch=="\n" or (not line.is_empty() and font.get_string_size(line+ch,HORIZONTAL_ALIGNMENT_LEFT,-1,font_size).x>width):
			result.append(line);line=""
			if result.size()>=max_lines:truncated=true;break
			if ch=="\n":chars+=1;continue
		line+=ch;chars+=1
	if not truncated and not line.is_empty():result.append(line)
	if truncated and not result.is_empty():
		var last:String=result[-1]
		while not last.is_empty() and font.get_string_size(last+"…",HORIZONTAL_ALIGNMENT_LEFT,-1,font_size).x>width:last=last.left(last.length()-1)
		result[-1]=last+"…"
	return {"lines":result,"truncated":truncated,"characters":chars}
