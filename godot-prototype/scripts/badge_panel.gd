extends RefCounted
const Catalog=preload("res://scripts/badge_catalog.gd")
const Rules=preload("res://scripts/badge_rules_v1.gd")
const Badges=preload("res://scripts/badges.gd")
var app:Control
var drafts:Dictionary={}
var review_editor:TextEdit
var confirmation_boxes:Array[CheckBox]=[]
var evidence_boxes:Array[CheckBox]=[]
var work_selector:OptionButton
func _init(owner:Control)->void:app=owner
func model():return app.state.badges
func creative():return app.state.creative
func ui():return app.creative_panel
func today()->String:return Time.get_date_string_from_system()
func body(title:String)->VBoxContainer:
	review_editor=null;confirmation_boxes.clear();evidence_boxes.clear();work_selector=null
	var v:VBoxContainer=ui().body(title)
	if app.unsaved_changes:
		var warning:Label=app.label("这次变化还没存到本机，仍在本次运行中。",13,"f0c195")
		warning.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;warning.set_meta("badge_save_warning",true);v.add_child(warning)
		if app.save_locked:warning.text="原存档无法识别，已保留原文件。这次变化只留在本次运行中。"
		else:
			var retry:Button=app.button("重试保存",func():
				if app.save():warning.text="已保存到本机。"
				else:warning.text="仍未写入本机。当前记录还在，请保留此页面后再试。")
			v.add_child(retry)
	return v
func prose(v:VBoxContainer,text:String,small:=false)->void:ui().prose(v,text,small)
func action(v:VBoxContainer,text:String,callback:Callable)->Button:return ui().action(v,text,callback)
func confirm(text:String,callback:Callable)->void:ui().confirm(text,callback)
func persisted(message:String,celebrate:=false)->bool:
	var ok:bool=app.save();app.saved_status(ok,message)
	if ok and celebrate:app.mascot_feedback("proud")
	return ok
func inline_error(v:VBoxContainer)->Label:
	var line:Label=app.label("",13,"f0c195");line.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;v.add_child(line);return line
func show_error(line:Label,text:String)->void:
	if not is_instance_valid(line) or not is_instance_valid(app.modal) or not app.modal.is_ancestor_of(line):return
	line.text=text
	app.note_body_scroll.call_deferred("ensure_control_visible",line)
func fit(v:VBoxContainer)->void:
	app.modal.set_meta("fit_content",true)
	var id:int=app.modal.get_instance_id()
	v.minimum_size_changed.connect(func():
		if is_instance_valid(app.modal) and app.modal.get_instance_id()==id:app.call_deferred("layout_ui"))
	app.call_deferred("layout_ui")
func thumbnail(id:String)->Texture2D:
	return load("res://assets/badges/"+id+(".webp" if id.begins_with("life-") else ".png"))
func image(v:Control,id:String,height:float)->void:
	var art:=TextureRect.new();art.texture=thumbnail(id);art.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;art.custom_minimum_size.y=height;art.mouse_filter=Control.MOUSE_FILTER_IGNORE
	v.add_child(art)
func cabinet()->void:
	var v:=body("蚀刻章柜")
	var medals:Array=model().honors();var earned_count:int=medals.filter(func(m):return m.earned).size()
	prose(v,"%d / 18 枚已刻印 · 来自你确认完成的记录"%earned_count,true)
	var ongoing:Array=model().attempts.filter(func(a):return a.status!="done")
	for attempt in ongoing:
		var id:String=attempt.id
		action(v,attempt.challenge.title+(" · 在做" if attempt.status=="active" else " · 暂放"),func():attempt_page(id))
	action(v,"实地求证 · 看看这项行动",func():start_page("field-study"))
	var grid:=GridContainer.new();grid.columns=2 if app.get_viewport_rect().size.x/app.ui_density<760 else 3
	grid.add_theme_constant_override("h_separation",10);grid.add_theme_constant_override("v_separation",10);v.add_child(grid)
	app.modal.set_meta("badge_grid",grid)
	var modal_id:int=app.modal.get_instance_id()
	grid.minimum_size_changed.connect(func():
		if is_instance_valid(app.modal) and app.modal.get_instance_id()==modal_id:app.call_deferred("layout_ui"))
	for medal in medals:
		var id:String=medal.id
		var card:Button=app.button("",func():medal_page(id));card.custom_minimum_size=Vector2(130,145);card.size_flags_horizontal=Control.SIZE_EXPAND_FILL;card.tooltip_text=medal.name+" · "+medal.condition;grid.add_child(card)
		var content:=VBoxContainer.new();content.mouse_filter=Control.MOUSE_FILTER_IGNORE;card.add_child(content)
		content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);content.offset_left=8;content.offset_right=-8;content.offset_top=8;content.offset_bottom=-8
		image(content,id,81)
		content.get_child(0).modulate=Color.WHITE if medal.earned else Color(0.67,0.71,0.67,0.84)
		var name:Label=app.label(medal.name,16);name.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;content.add_child(name)
		var state:Label=app.label("已刻印" if medal.earned else ("待刻印" if medal.supported else "记录流程未接入"),12,"e9c58c" if medal.earned else "afbdab");state.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;content.add_child(state)
	if model().attempts.any(func(a):return a.status=="done"):action(v,"回看完成记录",history)
	action(v,"旧系列图样 · 仅外观预览",preview_page)
func medal_page(id:String)->void:
	var found:Array=model().honors().filter(func(m):return m.id==id)
	if found.is_empty():cabinet();return
	var medal:Dictionary=found[0];var v:=body(medal.name)
	image(v,id,154);prose(v,medal.condition)
	if medal.earned:
		prose(v,"已刻印"+(" · "+medal.earnedAt if medal.earnedAt!="" else ""),true)
		var records:Array=model().attempts.filter(func(a):return a.status=="done" and (a.challenge.operationId==id if id.begins_with("life-") else a.challenge.album=="challenger"))
		for record in records:
			var record_id:String=record.id
			action(v,record.completedAt+" · "+record.challenge.title,func():record_page(record_id))
	elif not medal.supported:
		prose(v,"这项记录流程尚未接入。这里保留原条件，暂时不能接取或领取。",true)
		if id=="versatile":prose(v,"目前只有实地求证一种行动。",true)
		if id=="summit":prose(v,"目前实地求证最高10级，达不到12级。",true)
	elif id=="life-novel":
		prose(v,"节选或完成记录只能作为关联材料；整本小说是否已写到结尾，需要你本人确认。",true)
		confirm("接下小说挑战",func():start_page("life-novel"))
	else:
		prose(v,"当前可从实地求证留下完成记录。",true)
		confirm("看看实地求证",func():start_page("field-study"))
	action(v,"回到章柜",cabinet);fit(v)
func start_page(operation:String)->void:
	for a in model().attempts:
		if a.status=="active" and a.challenge.operationId==operation:attempt_page(a.id);return
	var challenge:Dictionary=Badges.frozen_challenge(operation,[])
	if challenge.is_empty():cabinet();return
	var v:=body(challenge.title);prose(v,challenge.objective)
	var selected:Array=[]
	if operation=="life-novel":prose(v,"可先接取，稍后关联节选或完成记录。保存一篇短文不会自动算作写完小说。",true)
	else:
		prose(v,"观察条目与文字结论帮助保留证据；系统不验证现实访问、访谈或地点。",true)
		var level:Label=app.label("挑战等级 4",18,"e9c58c");v.add_child(level)
		for term in Rules.FIELD.terms:
			var term_id:String=term.id
			var box:=CheckBox.new();box.text="+%d %s\n%s"%[term.weight,term.title,term.condition];box.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;box.custom_minimum_size.y=48;v.add_child(box)
			box.toggled.connect(func(on):
				if on:selected.append(term_id)
				else:selected.erase(term_id)
				level.text="挑战等级 %d"%Badges.rating(Badges.frozen_challenge(operation,selected)))
		prose(v,"访谈先征得同意，只留匿名摘记，不填敏感信息。额外条款提高等级；基础目标完成也计入一次行动。",true)
	prose(v,"接取后条件冻结，可暂放，不设期限。",true)
	var error:=inline_error(v)
	confirm("确认接取",func():
		var id:String=model().start(operation,selected,creative(),today())
		if id=="":show_error(error,model().last_error);return
		persisted("接取时的约定已留存。")
		attempt_page(id))
func frozen_summary(v:VBoxContainer,a:Dictionary)->void:
	prose(v,a.challenge.objective)
	if a.challenge.album=="challenger":prose(v,"冻结等级 %d · 接于 %s"%[Badges.rating(a.challenge),a.acceptedAt],true)
	else:prose(v,"接于 "+a.acceptedAt,true)
	for term in a.challenge.get("terms",[]):prose(v,"+%d %s · %s"%[term.weight,term.title,term.condition],true)
func attempt_page(id:String)->void:
	var a:Dictionary=model().find(id)
	if a.is_empty():cabinet();return
	if a.status=="done":record_page(id);return
	var v:=body(a.challenge.title);frozen_summary(v,a)
	var work:Dictionary=creative().work(a.linked.workId)
	prose(v,"关联作品："+("还没选择" if work.is_empty() else work.title+" · "+{"done":"已收好","working":"在做","rest":"暂放"}[creative().status(work)]),true)
	if a.challenge.album=="challenger":prose(v,"已选 %d 条观察；结论正文 %d 个非空白字。"%[a.linked.observationIds.size(),0 if work.is_empty() else Badges.nonspace_length(work.body)],true)
	action(v,"选择或调整证据",func():evidence_page(id))
	action(v,"去作品集",ui().studio)
	var error:=inline_error(v)
	if a.status=="rest":
		confirm("重新接起",func():
			if not model().resume(id,creative()):show_error(error,model().last_error);return
			persisted("约定保持原样，可以继续。")
			attempt_page(id))
	else:
		action(v,"先放一放",func():
			if model().put_aside(id):persisted("条件和已选证据都保留了。");cabinet())
		confirm("准备完成",func():completion_page(id))
	action(v,"回到章柜",cabinet)
func evidence_page(id:String)->void:
	var a:Dictionary=model().find(id)
	if a.is_empty() or a.status=="done":cabinet();return
	var v:=body("关联证据")
	prose(v,"先选现有文字作品，收好作品后才能完成挑战。",true)
	if a.challenge.album=="lifetime":prose(v,"关联节选或完成记录即可；这里的文字不代表整本小说已完成。",true)
	var selector:=OptionButton.new();work_selector=selector;selector.custom_minimum_size.y=46;selector.add_item("选择一件文字作品")
	var work_ids:Array=[""]
	for item in creative().home.studio.works:
		work_ids.append(item.id);selector.add_item(item.title)
		if item.id==a.linked.workId:selector.selected=work_ids.size()-1
	v.add_child(selector)
	var pages:Array=a.linked.observationIds.duplicate()
	if a.challenge.album=="challenger":
		prose(v,"选择实际用到的发现。每条保留地点、日期和具体观察。",true)
		for page in creative().home.observations.entries:
			if page.status!="kept":continue
			var page_id:String=page.id
			var box:=CheckBox.new();box.text=page.place+" · "+page.observedOn+"\n"+page.body.left(42);box.set_meta("observation_id",page_id);box.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;box.custom_minimum_size.y=52;box.button_pressed=page_id in pages;v.add_child(box);evidence_boxes.append(box)
			box.toggled.connect(func(on):
				if on:pages.append(page_id)
				else:pages.erase(page_id))
	var error:=inline_error(v)
	confirm("保存证据选择",func():
		if not model().link_evidence(id,work_ids[selector.selected],pages,creative()):show_error(error,model().last_error);return
		persisted("证据选择已保存，完成时会留下独立副本。")
		attempt_page(id))
func completion_page(id:String)->void:
	var a:Dictionary=model().find(id)
	if a.is_empty() or a.status!="active":cabinet();return
	var v:=body("确认这次完成")
	var issue:String=model().ready_issue(id,creative(),today())
	if issue!="":
		prose(v,issue);action(v,"回去整理证据",func():evidence_page(id));action(v,"回到这次尝试",func():attempt_page(id));fit(v);return
	if a.challenge.album=="lifetime":prose(v,"下面确认的是整本小说已经写到结尾。节选、保存短文或关联材料本身不能替代这一事实。",true)
	else:prose(v,"以下现实观察与访谈由你本人确认，系统只核对本机记录条件。",true)
	var cached:Dictionary=drafts.get(id,{"review":"","confirmed":[]})
	prose(v,"实际完成了什么",true)
	var edit:=TextEdit.new();edit.text=cached.review;edit.custom_minimum_size.y=135;edit.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY;v.add_child(edit);review_editor=edit
	app.modal.set_meta("mascot_mood","focused")
	var checks:Array=cached.confirmed.duplicate()
	var save_draft:=func():drafts[id]={"review":edit.text,"confirmed":checks.duplicate()}
	edit.text_changed.connect(func():
		if edit.text.length()>1000:edit.text=edit.text.left(1000)
		save_draft.call())
	for rule in Badges.criteria(a.challenge):
		var rule_id:String=rule.id
		var box:=CheckBox.new();box.text=rule.condition;box.set_meta("criterion_id",rule_id);box.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;box.custom_minimum_size.y=48;box.button_pressed=rule_id in checks;v.add_child(box);confirmation_boxes.append(box)
		box.toggled.connect(func(on):
			if on:checks.append(rule_id)
			else:checks.erase(rule_id)
			save_draft.call())
	prose(v,"关闭不确认；已填写的文字暂留本次会话。",true)
	var error:=inline_error(v)
	confirm("确认完成并留下刻印",func():
		var before:int=model().honors().filter(func(m):return m.earned).size()
		if not app.state.complete_badge_attempt(id,edit.text,checks,today()):show_error(error,model().last_error);return
		var added:int=model().honors().filter(func(m):return m.earned).size()-before
		drafts.erase(id);persisted("完成记录已收好，章柜新增%d枚刻印。"%added if added>0 else "完成记录已收好，已有刻印保持原样。",true)
		record_page(id))
func record_page(id:String)->void:
	var a:Dictionary=model().find(id)
	if a.is_empty() or a.status!="done":cabinet();return
	var v:=body("这次完成的记录")
	prose(v,a.challenge.title+" · "+a.completedAt)
	prose(v,a.review)
	prose(v,"接取时的约定",true);frozen_summary(v,a)
	prose(v,"完成时的作品 · "+a.evidence.work.title,true);prose(v,a.evidence.work.body)
	for page in a.evidence.observations:prose(v,page.place+" · "+page.observedOn+"\n"+page.body,true)
	prose(v,"这些是完成时的独立副本，原页之后修改也不会改变它们。",true)
	confirm("回到章柜",cabinet)
func history()->void:
	var v:=body("完成记录")
	for record in model().attempts:
		if record.status!="done":continue
		var id:String=record.id
		action(v,record.completedAt+" · "+record.challenge.title,func():record_page(id))
func preview_page()->void:
	var v:=body("旧系列图样")
	prose(v,"四时归灯 · 山径成桥 · 门外初光 · 滴水成湾\n经纬相合 · 林间远路 · 木屑成器 · 湖心回声")
	prose(v,"原项目中这八个系列属于三阶外观预览，完成规则尚未启用。这里不当作已实装章，也没有领取操作。",true)
	confirm("回到章柜",cabinet);fit(v)
