extends SceneTree
const Export=preload("res://scripts/studio_export.gd")
const Page=preload("res://scripts/studio_export_page.gd")
const Files=preload("res://scripts/studio_files.gd")
const Images=preload("res://scripts/studio_images.gd")
const Fixtures=preload("res://tests/studio_image_fixtures.gd")
var passed:=0
var failed:=0
var saved_ok:=false
var message:=""
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func _initialize()->void:call_deferred("run")
func run()->void:
	var image:String=Images.normalize(Fixtures.corners().save_png_to_buffer()).data
	var other:String=Images.normalize(Fixtures.transparent()).data
	var work:={"title":"<script>标题 & \"引号\" '单引号'</script>","body":"第一行\n<img src=x onerror=bad()>\n最后一行。","note":"PRIVATE_NOTE_NEVER_BY_DEFAULT","updated":"2026-10-08","images":[image,other]}
	var result:=Export.album([work]);var text:String=result.bytes.get_string_from_utf8()
	var html_file:=FileAccess.open("res://artifacts/media-export-album.html",FileAccess.WRITE);html_file.store_buffer(result.bytes);html_file.close()
	check(result.ok and not result.include_note and not text.contains(work.note),"private note is absent unless explicitly selected")
	check(text.contains("&lt;script&gt;") and not text.contains("<script>") and text.contains("&quot;引号&quot;") and text.contains("&#39;单引号&#39;"),"title quotes and script-like text are escaped")
	check(text.contains("&lt;img src=x onerror=bad()&gt;") and not text.contains("<img src=x"),"body markup is displayed as literal text")
	check(text.contains(image) and text.contains(other) and text.contains("最后一行。"),"full HTML retains every picture and full body")
	check(text.contains("default-src 'none'") and text.contains("img-src data:") and not text.contains("https://") and not text.contains("fetch("),"offline album allows only embedded pictures with no external loads or scripts")
	check(Export.album([work],true).bytes.get_string_from_utf8().contains(work.note),"explicit note choice includes private note")
	check(not Export.album([]).ok,"empty album refuses an empty success")
	var invalid:Dictionary=work.duplicate(true);invalid.images=["data:image/svg+xml;base64,PHN2Zz4="]
	check(not Export.album([invalid]).ok,"invalid active image format blocks incomplete export")
	var font:Font=load("res://assets/NotoSansSC-Regular.otf")
	var lines:=Export.lines("长文字".repeat(1000),font,30,990,4)
	check(lines.lines.size()==4 and lines.truncated and lines.lines[-1].ends_with("…"),"long page text has a bounded layout with visible ellipsis")
	check(Export.lines("第一行\n第二行",font,30,990,4).lines==["第一行","第二行"],"explicit line breaks are retained")
	var page:=Page.new();root.add_child(page);page.configure(work,false)
	check(page.size==Vector2(1200,1600) and page.selected_page and page.note_lines.lines.is_empty(),"PNG uses 1200 by 1600 and marks multiple pictures as a selected page")
	check(page.picture_rect.size.x<=990 and page.picture_rect.size.y<=620,"first image respects original page image area")
	var long:Dictionary=work.duplicate(true);long.title="很长的作品标题".repeat(8);long.body="正文里的每一个字都应完整保留在HTML。".repeat(500);long.note="留给自己的话".repeat(30)
	page.configure(long,true)
	check(page.title_lines.lines.size()<=3 and page.note_lines.lines.size()<=3 and page.selected_page,"long title and note get bounded line counts with selected-page disclosure")
	check(page.body_y+page.body_lines.lines.size()*48<=1318,"body stops before private-note footer instead of overlapping it")
	var file_io:=Files.new();root.add_child(file_io)
	file_io.exported.connect(func(_token,ok,detail):saved_ok=ok;message=detail)
	var path:="user://original-qa-album.html"
	file_io.save_selected_path(file_io.token,path,result.bytes,"html")
	check(saved_ok and FileAccess.get_file_as_bytes(path)==result.bytes,"native export writes exact complete HTML bytes")
	var original:=FileAccess.get_file_as_bytes(path);saved_ok=false
	file_io.save_selected_path(file_io.token,path,"wrong".to_utf8_buffer(),"png")
	check(not saved_ok and FileAccess.get_file_as_bytes(path)==original,"wrong export extension cannot overwrite an existing file")
	file_io.save_selected_path(file_io.token,"user://absent-export-directory/album.html",result.bytes,"html")
	check(not saved_ok and message.contains("无法写入"),"native denied destination reports failure without losing work")
	var blocked:="user://qa-export-blocked.html"
	DirAccess.make_dir_recursive_absolute(blocked)
	file_io.save_selected_path(file_io.token,blocked,Export.album([work],true).bytes,"html")
	var directory:=DirAccess.open("user://");var leaked:=false
	for name in directory.get_files():
		if name.begins_with("qa-export-blocked.html.kuangye-"):leaked=true
	check(not saved_ok and not leaked and DirAccess.dir_exists_absolute(blocked),"rename failure cleans its own temporary album including selected private note")
	DirAccess.remove_absolute(blocked)
	var old_token:int=file_io.token;file_io.cancel();saved_ok=false
	file_io.save_selected_path(old_token,path,"late".to_utf8_buffer(),"html")
	check(not saved_ok and FileAccess.get_file_as_bytes(path)==original,"canceled export callback cannot write stale content")
	if DisplayServer.get_name()!="headless":
		var viewport:=SubViewport.new();viewport.size=Vector2i(1200,1600);viewport.render_target_update_mode=SubViewport.UPDATE_ONCE;root.add_child(viewport)
		page.reparent(viewport);page.configure(work,false)
		await process_frame;await RenderingServer.frame_post_draw
		var pixels:=viewport.get_texture().get_image();var png:=pixels.save_png_to_buffer()
		check(pixels.get_size()==Vector2i(1200,1600) and png.size()>1000,"native renderer emits a real 1200 by 1600 PNG")
		check(page.draw_bounds.all(func(r):return Rect2(56,56,1088,1488).encloses(r)),"all actual drawing bounds remain inside paper")
		var f:=FileAccess.open("res://artifacts/media-export-page.png",FileAccess.WRITE);f.store_buffer(png);f.close()
		viewport.queue_free()
	else:page.queue_free()
	file_io.queue_free()
	var report:=FileAccess.open("res://artifacts/studio-export-results.json",FileAccess.WRITE);report.store_string(JSON.stringify({"passed":passed,"failed":failed,"native_png_rendered":DisplayServer.get_name()!="headless","browser_download_received":false},"\t"));report.close()
	print("STUDIO EXPORT ",passed," passed, ",failed," failed");quit(0 if failed==0 else 1)
