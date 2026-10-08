class_name TownCreative
extends RefCounted

# Text-only port of main's observations/studio/observation-craft rules. Canonical
# field names and immutable source snapshots are retained. This is not an importer.
var home := {"observations":{"entries":[]},"studio":{"works":[],"displayId":""},"observationWorks":[]}
var customTasks: Array = []
var active: Array = []
var done: Array = []
var abandoned: Array = []
var next_id := 1
var last_error := ""

func fail(message:String) -> bool:
	last_error=message
	return false

func identity(prefix:String) -> String:
	var value:="%s-%012d" % [prefix,next_id]
	next_id+=1
	return value

func observation(id:String) -> Dictionary:
	for entry in home.observations.entries:
		if entry.id==id:return entry
	return {}

func work(id:String) -> Dictionary:
	for item in home.studio.works:
		if item.id==id:return item
	return {}

func source_for(id:String) -> Dictionary:
	for link in home.observationWorks:
		if link.workId==id:return link.source
	return {}

func status(item:Dictionary) -> String:
	for qid in item.taskIds:
		if done.any(func(r):return r.qid==qid):return "done"
	return "working" if active.any(func(r):return r.qid==item.taskIds[-1]) else "rest"

func start_observation(at:String) -> String:
	if not date_valid(at):fail("日期格式不正确。");return ""
	for entry in home.observations.entries:
		if entry.status=="draft":return entry.id
	if home.observations.entries.size()>=200:fail("观察册已满，请先保留备份。");return ""
	var id:=identity("observation")
	home.observations.entries.push_front({"id":id,"place":"","body":"","hint":"","kind":"other","observedOn":at,"images":[],"status":"draft","createdAt":at,"keptAt":""})
	return id

func update_observation(id:String,fields:Dictionary) -> bool:
	var entry:=observation(id)
	if entry.is_empty():return fail("没有找到这页观察。")
	var next:Dictionary=entry.duplicate(true)
	for key in fields:
		if not ["place","body","hint","kind","observedOn"].has(key):return fail("不支持的观察字段，原内容未改变。")
		next[key]=fields[key]
	if not observation_fields(next):return fail("检查地点、日期与内容长度。")
	next.place=next.place.strip_edges()
	if next.status=="kept" and (next.place.is_empty() or next.body.strip_edges().is_empty()):return fail("已收好的观察需要保留地点与具体发现。")
	entry.merge(next,true)
	return true

func keep_observation(id:String,at:String) -> bool:
	var entry:=observation(id)
	if entry.is_empty() or not date_valid(at):return fail("没有找到观察，或日期不正确。")
	if entry.status=="kept":return true
	if entry.place.strip_edges().is_empty() or entry.body.strip_edges().is_empty():return fail("写下地点和一个具体发现，再收好。")
	entry.status="kept";entry.keptAt=at
	return true

func task_for(item:Dictionary) -> Dictionary:
	for task in customTasks:
		if task.id==item.taskIds[-1]:return task
	return {}

func add_task(title:String,criterion:String,at:String) -> String:
	var qid:=identity("personal")
	customTasks.append({"id":qid,"title":title,"desc":criterion,"cat":"create","type":"once","diff":"E","tier":"personal","personal":true})
	active.append({"qid":qid,"at":at,"logs":[]})
	return qid

func start_work(observation_id:String,title:String,criterion:String,at:String) -> String:
	for link in home.observationWorks:
		if link.observationId==observation_id:return link.workId
	var entry:=observation(observation_id)
	if entry.is_empty() or entry.status!="kept":fail("先把具体发现收进观察册。");return ""
	if active.size()>=3:fail("手里最多放 3 件事，先完成或暂放一件。");return ""
	if home.studio.works.size()>=200 or not text_valid(title,60,true) or not text_valid(criterion,240,true) or not date_valid(at):fail("给作品起名，并写下完成时会留下什么。");return ""
	var id:=identity("work")
	var qid:=add_task(title.strip_edges(),criterion.strip_edges(),at)
	home.studio.works.push_front({"id":id,"title":title.strip_edges(),"body":"","note":"","images":[],"theme":"notice","exerciseId":"","taskIds":[qid],"created":at,"updated":at})
	home.observationWorks.append({"observationId":observation_id,"workId":id,"startedAt":at,"source":{"place":entry.place,"body":entry.body,"kind":entry.kind,"observedOn":entry.observedOn,"images":[]}})
	return id

func update_work(id:String,title:String,body:String,note:String,at:String) -> bool:
	var item:=work(id)
	if item.is_empty() or not text_valid(title,60,true) or not text_valid(body,12000) or not text_valid(note,240) or not date_valid(at):return fail("标题必填，正文最多 12000 字，私语最多 240 字。")
	if status(item)=="done" and body.strip_edges().is_empty():return fail("已收好的作品需要保留正文。原版还在。")
	item.title=title.strip_edges();item.body=body;item.note=note;item.updated=at
	return true

func complete_work(id:String,at:String) -> bool:
	var item:=work(id)
	if item.is_empty() or status(item)!="working" or not date_valid(at):return fail("这件作品不在进行中。")
	if item.body.strip_edges().is_empty():return fail("先保存作品正文，再确认完成。")
	var qid:String=item.taskIds[-1]
	done.append({"qid":qid,"xp":0,"at":at,"review":"","units":[],"logs":[]})
	active=active.filter(func(r):return r.qid!=qid)
	return true

func rest_work(id:String,at:String) -> bool:
	var item:=work(id)
	if item.is_empty() or status(item)!="working" or not date_valid(at):return fail("这件作品不在进行中。")
	var qid:String=item.taskIds[-1]
	abandoned.append({"qid":qid,"at":at,"reason":""})
	active=active.filter(func(r):return r.qid!=qid)
	return true

func resume_work(id:String,at:String) -> bool:
	var item:=work(id)
	if item.is_empty() or status(item)!="rest" or not date_valid(at):return fail("这件作品不能重新接起。")
	if active.size()>=3:return fail("手里最多放 3 件事，先完成或暂放一件。")
	var original:=task_for(item)
	item.taskIds.append(add_task(item.title,original.desc,at))
	return true

func display_work(id:String) -> bool:
	if not id.is_empty():
		var item:=work(id)
		if item.is_empty() or status(item)!="done":return fail("作品收好后，才能陈列到小家。")
	home.studio.displayId=id
	return true

func serialize() -> Dictionary:
	return {"schema":1,"home":home,"customTasks":customTasks,"active":active,"done":done,"abandoned":abandoned,"next_id":next_id}

static func text_valid(v:Variant,limit:int,required:=false) -> bool:
	return v is String and v.length()<=limit and (not required or not v.strip_edges().is_empty())

static func date_valid(v:Variant) -> bool:
	if not v is String or v.length()!=10:return false
	var parts:Array=Array(v.split("-"))
	if parts.size()!=3 or not parts[0].is_valid_int() or not parts[1].is_valid_int() or not parts[2].is_valid_int():return false
	var y:=int(parts[0]);var m:=int(parts[1]);var d:=int(parts[2])
	if y<1970 or m<1 or m>12 or parts[0].length()!=4 or parts[1].length()!=2 or parts[2].length()!=2:return false
	var days:=[31,29 if y%4==0 and (y%100!=0 or y%400==0) else 28,31,30,31,30,31,31,30,31,30,31]
	return d>0 and d<=days[m-1]

static func keys_exact(raw:Variant,keys:Array) -> bool:
	return raw is Dictionary and raw.size()==keys.size() and raw.has_all(keys)

static func observation_fields(entry:Dictionary) -> bool:
	return text_valid(entry.get("place"),100) and text_valid(entry.get("body"),3000) and text_valid(entry.get("hint"),500) and ["plant","sky","street","other"].has(entry.get("kind")) and date_valid(entry.get("observedOn")) and entry.get("images") is Array and entry.images.is_empty()

func load_data(raw:Variant) -> bool:
	# Strict candidate validation: unsupported images and future fields are retained
	# on disk via TownState's save lock, never silently dropped by this text slice.
	if not keys_exact(raw,["schema","home","customTasks","active","done","abandoned","next_id"]) or not (raw.schema is int or raw.schema is float) or raw.schema!=1:return false
	if not keys_exact(raw.home,["observations","studio","observationWorks"]):return false
	if not keys_exact(raw.home.observations,["entries"]) or not keys_exact(raw.home.studio,["works","displayId"]):return false
	for list in [raw.home.observations.entries,raw.home.studio.works,raw.home.observationWorks,raw.customTasks,raw.active,raw.done,raw.abandoned]:
		if not list is Array:return false
	if raw.home.observations.entries.size()>200 or raw.home.studio.works.size()>200 or raw.active.size()>3:return false
	if not (raw.next_id is int or raw.next_id is float) or raw.next_id<1 or raw.next_id>100000000 or float(raw.next_id)!=floorf(float(raw.next_id)):return false
	var seen:Dictionary={};var drafts:=0
	for entry in raw.home.observations.entries:
		if not keys_exact(entry,["id","place","body","hint","kind","observedOn","images","status","createdAt","keptAt"]) or not valid_id(entry.id,"observation",seen,raw.next_id) or not observation_fields(entry) or not date_valid(entry.createdAt):return false
		if entry.status=="draft":
			drafts+=1
			if drafts>1 or entry.keptAt!="":return false
		elif entry.status=="kept":
			if not date_valid(entry.keptAt) or not text_valid(entry.place,100,true) or not text_valid(entry.body,3000,true):return false
		else:return false
	var task_ids:Dictionary={}
	for task in raw.customTasks:
		if not keys_exact(task,["id","title","desc","cat","type","diff","tier","personal"]) or not valid_id(task.id,"personal",seen,raw.next_id) or not text_valid(task.title,60,true) or not text_valid(task.desc,240,true) or task.cat!="create" or task.type!="once" or task.diff!="E" or task.tier!="personal" or task.personal!=true:return false
		task_ids[task.id]=true
	var recorded:Dictionary={}
	for bucket in ["active","done","abandoned"]:
		for record in raw[bucket]:
			var keys:Array={"active":["qid","at","logs"],"done":["qid","xp","at","review","units","logs"],"abandoned":["qid","at","reason"]}[bucket]
			if not keys_exact(record,keys) or not record.qid is String or not task_ids.has(record.qid) or recorded.has(record.qid) or not date_valid(record.at):return false
			recorded[record.qid]=true
			if bucket!="abandoned" and (not record.logs is Array or not record.logs.is_empty()):return false
			if bucket=="done" and (not (record.xp is int or record.xp is float) or record.xp!=0 or not text_valid(record.review,1000) or not record.units is Array or not record.units.is_empty()):return false
			if bucket=="abandoned" and not text_valid(record.reason,1000):return false
	if recorded.size()!=task_ids.size():return false
	var linked:Dictionary={}
	for item in raw.home.studio.works:
		if not keys_exact(item,["id","title","body","note","images","theme","exerciseId","taskIds","created","updated"]) or not valid_id(item.id,"work",seen,raw.next_id) or not text_valid(item.title,60,true) or not text_valid(item.body,12000) or not text_valid(item.note,240) or item.theme!="notice" or item.exerciseId!="" or not item.images is Array or not item.images.is_empty() or not date_valid(item.created) or not date_valid(item.updated) or not item.taskIds is Array or item.taskIds.is_empty():return false
		for qid in item.taskIds:
			if not qid is String or not task_ids.has(qid) or linked.has(qid):return false
			linked[qid]=true
		if raw.done.any(func(r):return item.taskIds.has(r.qid)) and item.body.strip_edges().is_empty():return false
		for qid in item.taskIds.slice(0,-1):
			if not raw.abandoned.any(func(r):return r.qid==qid):return false
	if linked.size()!=task_ids.size():return false
	var linked_observations:Dictionary={};var linked_works:Dictionary={}
	for link in raw.home.observationWorks:
		if not keys_exact(link,["observationId","workId","startedAt","source"]) or not link.observationId is String or not link.workId is String or linked_observations.has(link.observationId) or linked_works.has(link.workId) or not date_valid(link.startedAt):return false
		if not raw.home.observations.entries.any(func(e):return e.id==link.observationId and e.status=="kept") or not raw.home.studio.works.any(func(w):return w.id==link.workId):return false
		if not keys_exact(link.source,["place","body","kind","observedOn","images"]):return false
		var source:Dictionary=link.source.duplicate(true);source.hint=""
		if not observation_fields(source) or source.place.strip_edges().is_empty() or source.body.strip_edges().is_empty():return false
		linked_observations[link.observationId]=true;linked_works[link.workId]=true
	if linked_works.size()!=raw.home.studio.works.size():return false
	if not raw.home.studio.displayId is String:return false
	if raw.home.studio.displayId!="":
		var shown:Array=raw.home.studio.works.filter(func(w):return w.id==raw.home.studio.displayId)
		if shown.is_empty() or not raw.done.any(func(r):return shown[0].taskIds.has(r.qid)):return false
	home=raw.home.duplicate(true);customTasks=raw.customTasks.duplicate(true);active=raw.active.duplicate(true);done=raw.done.duplicate(true);abandoned=raw.abandoned.duplicate(true);next_id=int(raw.next_id)
	for record in done:record.xp=int(record.xp)
	return true

static func valid_id(value:Variant,prefix:String,seen:Dictionary,next:int) -> bool:
	if not value is String or not value.begins_with(prefix+"-") or seen.has(value):return false
	var tail:String=value.trim_prefix(prefix+"-")
	if tail.length()!=12 or not tail.is_valid_int() or int(tail)<1 or int(tail)>=next:return false
	seen[value]=true
	return true
