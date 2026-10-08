extends RefCounted

var app:Control
var drafts:Dictionary={}
var fields:Dictionary={}
var primary:Button

func _init(owner:Control) -> void:app=owner
func today() -> String:return Time.get_date_string_from_system()
func model():return app.state.creative

func body(title:String) -> VBoxContainer:
	var v:VBoxContainer=app.make_modal(title)
	var scroll:=ScrollContainer.new()
	scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus=true
	app.note_body_scroll=scroll
	v.add_child(scroll)
	var content:=VBoxContainer.new()
	content.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",10)
	scroll.add_child(content)
	fields={}
	primary=null
	app.layout_ui()
	return content

func prose(v:VBoxContainer,text:String,small:=false) -> void:
	var line:Label=app.label(text,13 if small else 16,"bac7b4" if small else "eee2cb")
	line.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	v.add_child(line)

func action(v:VBoxContainer,text:String,callback:Callable) -> Button:
	var b:Button=app.button(text,callback)
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	v.add_child(b)
	return b

func confirm(text:String,callback:Callable) -> void:
	primary=action(app.modal.get_child(0),text,callback)
	app.layout_ui()

func persisted(message:String) -> void:
	var ok:bool=app.save()
	app.world.show_creation(model().work(model().home.studio.displayId))
	app.saved_status(ok,message)

func book() -> void:
	var v:=body("观察册")
	action(v,"去画室看作品 · %d" % model().home.studio.works.size(),studio)
	if model().home.observations.entries.is_empty():prose(v,"在近处停一下，留下一处具体发现。")
	for entry in model().home.observations.entries:
		var id:String=entry.id
		action(v,("继续写 · " if entry.status=="draft" else "")+(entry.place if not entry.place.is_empty() else "新的一页"),func():observation_page(id))
	confirm("留一页观察",func():
		var id:String=model().start_observation(today())
		if id.is_empty():app.status(model().last_error);return
		persisted("新的一页已留在本机。")
		edit_observation(id))

func observation_page(id:String) -> void:
	var entry:Dictionary=model().observation(id)
	if entry.is_empty():book();return
	if entry.status=="draft":edit_observation(id);return
	var v:=body("这一页发现")
	prose(v,entry.observedOn+" · "+entry.place,true)
	prose(v,entry.body)
	if not entry.hint.is_empty():prose(v,"还想看看："+entry.hint,true)
	action(v,"修改这一页",func():edit_observation(id))
	action(v,"回到观察册",book)
	confirm("带到画室创作",func():begin_work(id))

func field(v:VBoxContainer,key:String,title:String,value:String,limit:int,multiline:=false) -> void:
	prose(v,title,true)
	if multiline:
		var edit:=TextEdit.new()
		edit.text=value
		edit.custom_minimum_size.y=125
		edit.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY
		edit.text_changed.connect(func():
			if edit.text.length()>limit:edit.text=edit.text.left(limit))
		v.add_child(edit);fields[key]=edit
	else:
		var edit:=LineEdit.new()
		edit.text=value
		edit.max_length=limit
		edit.custom_minimum_size.y=44
		v.add_child(edit);fields[key]=edit

func cache_fields(key:String) -> void:
	for name in fields:
		var editor:Control=fields[name]
		var callback:=func():
			if not drafts.has(key):drafts[key]={}
			drafts[key][name]=editor.text
		if editor is LineEdit:editor.text_changed.connect(func(_value):callback.call())
		else:editor.text_changed.connect(callback)

func edit_observation(id:String) -> void:
	var entry:Dictionary=model().observation(id)
	var v:=body("写下观察")
	var draft:Dictionary=entry.duplicate(true)
	draft.merge(drafts.get(id,{}),true)
	field(v,"place","在哪里",draft.place,100)
	field(v,"observedOn","观察日期 · YYYY-MM-DD",draft.observedOn,10)
	prose(v,"是哪一种发现",true)
	var kind:=OptionButton.new()
	for title in ["花草与树木","天空与光","路边与声音","其他发现"]:kind.add_item(title)
	kind.selected=["plant","sky","street","other"].find(draft.kind)
	kind.custom_minimum_size.y=44
	v.add_child(kind)
	kind.item_selected.connect(func(index):
		if not drafts.has(id):drafts[id]={}
		drafts[id].kind=["plant","sky","street","other"][index])
	field(v,"body","具体发现",draft.body,3000,true)
	field(v,"hint","还想看看什么 · 可不填",draft.hint,500,true)
	prose(v,"关闭后，没保存的文字会暂留本次会话。",true)
	cache_fields(id)
	var captured:=fields.duplicate()
	var store:=func(keep:bool):
		var values:Dictionary={"kind":["plant","sky","street","other"][kind.selected]}
		for key in captured:values[key]=captured[key].text
		if keep and (values.place.strip_edges().is_empty() or values.body.strip_edges().is_empty()):app.status("写下地点和一个具体发现，再收好。");return
		if not model().update_observation(id,values):app.status(model().last_error);return
		if keep and not model().keep_observation(id,today()):app.status(model().last_error);return
		drafts.erase(id);persisted("这一页已保存。")
		if keep:observation_page(id)
		else:book()
	if entry.status=="draft":action(v,"先保存草稿",func():store.call(false))
	confirm("保存修改" if entry.status=="kept" else "收进观察册",func():store.call(true))

func begin_work(id:String) -> void:
	for link in model().home.observationWorks:
		if link.observationId==id:work_page(link.workId);return
	var v:=body("从发现开始")
	prose(v,"素材保留此刻的观察。成果从空白开始。",true)
	var key:="start-"+id
	var cached:Dictionary=drafts.get(key,{})
	field(v,"title","作品叫什么",cached.get("title",""),60)
	field(v,"criterion","完成时，会留下什么",cached.get("criterion",""),240,true)
	cache_fields(key)
	var captured:=fields.duplicate()
	confirm("接下创作",func():
		var work_id:String=model().start_work(id,captured.title.text,captured.criterion.text,today())
		if work_id.is_empty():app.status(model().last_error);return
		drafts.erase(key);persisted("作品已开始，观察原页仍然保留。")
		edit_work(work_id))

func studio() -> void:
	var v:=body("我的作品集")
	prose(v,"正在做 %d / 3 件" % model().active.size(),true)
	action(v,"从观察册开始",book)
	if model().home.studio.works.is_empty():prose(v,"把一页发现，做成真正属于你的一版。")
	for item in model().home.studio.works:
		var id:String=item.id
		var tag:String={"working":"在做","rest":"暂放","done":"收好"}[model().status(item)]
		action(v,tag+" · "+item.title,func():work_page(id))

func edit_work(id:String) -> void:
	var item:Dictionary=model().work(id)
	if item.is_empty():studio();return
	var v:=body("这一版作品")
	var draft:Dictionary=item.duplicate(true)
	draft.merge(drafts.get(id,{}),true)
	field(v,"title","作品名",draft.title,60)
	field(v,"body","你的成果",draft.body,12000,true)
	field(v,"note","留给自己的话 · 可不填",draft.note,240,true)
	prose(v,"关闭后，没保存的文字会暂留本次会话。",true)
	cache_fields(id)
	var captured:=fields.duplicate()
	confirm("保存这一版",func():
		if not model().update_work(id,captured.title.text,captured.body.text,captured.note.text,today()):app.status(model().last_error);return
		drafts.erase(id);persisted("这一版，保存好了。")
		work_page(id))

func work_page(id:String) -> void:
	var item:Dictionary=model().work(id)
	if item.is_empty():studio();return
	var v:=body("作品 · "+item.title.left(10))
	prose(v,item.title)
	prose(v,item.body if not item.body.strip_edges().is_empty() else "成果还空着，先写下你做出的这一版。")
	if not item.note.is_empty():prose(v,"留给自己的话："+item.note,true)
	var source:Dictionary=model().source_for(id)
	if not source.is_empty():
		prose(v,"当时的素材 · "+source.observedOn+" · "+source.place,true)
		prose(v,source.body,true)
	action(v,"编辑这一版",func():edit_work(id))
	action(v,"回到作品集",studio)
	match model().status(item):
		"working":
			action(v,"先放一放",func():
				if model().rest_work(id,today()):persisted("成果已保留，随时可以继续。");work_page(id))
			confirm("确认完成",func():completion(id))
		"rest":
			confirm("接着做这一版",func():
				if model().resume_work(id,today()):persisted("已接起这一版。");edit_work(id)
				else:app.status(model().last_error))
		"done":
			var shown:bool=model().home.studio.displayId==id
			confirm("从小家收回" if shown else "陈列到小家",func():
				if model().display_work("" if shown else id):persisted("作品和记录都还在。" if shown else "小家的桌上，多了你的作品。");work_page(id))

func completion(id:String) -> void:
	var item:Dictionary=model().work(id)
	var v:=body("收好这一版")
	prose(v,model().task_for(item).desc)
	var checked:=CheckBox.new()
	checked.text="我完成了自己写下的约定"
	checked.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	checked.custom_minimum_size.y=48
	v.add_child(checked)
	prose(v,"与随手记共用每天一次的 5 微光。",true)
	action(v,"还没完成，回去看看",func():work_page(id))
	confirm("收好作品",func():
		if not checked.button_pressed:app.status("做到时再勾选，现在也可以回去继续。");return
		if not app.state.complete_creative_work(id,today()):app.status(model().last_error);return
		persisted("你做出的这一版，收好了。")
		work_page(id))
