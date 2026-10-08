class_name StudioExportPage
extends Control
const Export=preload("res://scripts/studio_export.gd")
const Images=preload("res://scripts/studio_images.gd")
var work:Dictionary
var include_note:=false
var font:Font=preload("res://assets/NotoSansSC-Regular.otf")
var picture:Texture2D
var title_lines:Dictionary
var body_lines:Dictionary
var note_lines:Dictionary
var body_y:=0.0
var title_y:=150.0
var picture_rect:=Rect2()
var selected_page:=false
var draw_bounds:Array[Rect2]=[]
func configure(item:Dictionary,with_note:bool)->void:
	work=item.duplicate(true);include_note=with_note;custom_minimum_size=Vector2(1200,1600);size=custom_minimum_size
	title_lines=Export.lines(work.title,font,54,990,3)
	var y:float=title_y+title_lines.lines.size()*72+38
	if not work.images.is_empty():
		picture=Images.thumbnail(work.images[0],1024)
		if picture!=null:
			var scale:=minf(990.0/picture.get_width(),620.0/picture.get_height())
			var dimensions:=picture.get_size()*scale;picture_rect=Rect2(Vector2(105+(990-dimensions.x)/2,y),dimensions);y+=dimensions.y+40
	body_y=y
	var has_note:bool=include_note and not work.note.strip_edges().is_empty()
	var bottom:=1270.0 if has_note else 1400.0
	body_lines=Export.lines(work.body,font,30,990,maxi(1,floori((bottom-body_y)/48)))
	note_lines=Export.lines(work.note if has_note else "",font,24,990,3)
	selected_page=work.images.size()>1 or title_lines.truncated or body_lines.truncated or note_lines.truncated
	queue_redraw()
func text_lines(values:Array,origin:Vector2,font_size:int,line_height:float,color:Color)->void:
	for i in values.size():
		var point:=origin+Vector2(0,i*line_height)
		draw_string(font,point,values[i],HORIZONTAL_ALIGNMENT_LEFT,-1,font_size,color)
		draw_bounds.append(Rect2(point-Vector2(0,font.get_ascent(font_size)),font.get_string_size(values[i],HORIZONTAL_ALIGNMENT_LEFT,-1,font_size)))
func _draw()->void:
	if work.is_empty():return
	draw_bounds.clear();draw_rect(Rect2(0,0,1200,1600),Color("f4efe4"));draw_rect(Rect2(56,56,1088,1488),Color("fffdf8"))
	text_lines(title_lines.lines,Vector2(105,title_y),54,72,Color("283e35"))
	if picture!=null:draw_texture_rect(picture,picture_rect,false);draw_bounds.append(picture_rect)
	text_lines(body_lines.lines,Vector2(105,body_y+font.get_ascent(30)),30,48,Color("3e5146"))
	if include_note and not note_lines.lines.is_empty():
		draw_line(Vector2(105,1300),Vector2(1095,1300),Color("ded7c7"),2)
		text_lines(note_lines.lines,Vector2(105,1340),24,36,Color("66766b"))
	var caption:String="旷野 · "+work.updated+(" · 作品选页" if selected_page else "")
	text_lines([caption],Vector2(105,1490),22,30,Color("66766b"))
