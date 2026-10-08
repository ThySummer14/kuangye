class_name TownBadges
extends RefCounted
const Catalog=preload("res://scripts/badge_catalog.gd")
const Rules=preload("res://scripts/badge_rules_v1.gd")
const Creative=preload("res://scripts/creative.gd")
var attempts:Array=[]
var next_id:=1
var last_error:=""
func fail(message:String)->bool:last_error=message;return false
func active_count()->int:return attempts.filter(func(a):return a.status=="active").size()
func find(id:String)->Dictionary:
	for a in attempts:
		if a.id==id:return a
	return {}
static func supported(operation:String)->bool:return operation in ["life-novel","field-study"]
static func frozen_challenge(operation:String,term_ids:Array)->Dictionary:
	if operation=="life-novel" and term_ids.is_empty():return Rules.NOVEL.duplicate(true)
	if operation!="field-study" or term_ids.size()>3:return {}
	var result:Dictionary=Rules.FIELD.duplicate(true);result.terms=[]
	for id in term_ids:
		if not id is String or term_ids.count(id)!=1 or not Rules.FIELD.terms.any(func(t):return t.id==id):return {}
	# Preserve the catalogue's order regardless of checkbox clicking order.
	for term in Rules.FIELD.terms:
		if term.id in term_ids:result.terms.append(term.duplicate(true))
	return result
static func criteria(challenge:Dictionary)->Array:
	var result:Array=[{"id":"objective","condition":challenge.objective}]
	for term in challenge.get("terms",[]):result.append({"id":term.id,"condition":term.condition})
	return result
static func rating(challenge:Dictionary)->int:
	var result:=int(challenge.get("baseRating",0))
	for term in challenge.get("terms",[]):result+=int(term.weight)
	return result
func has_completed(operation:String,work_id:="")->bool:
	return attempts.any(func(a):return a.status=="done" and a.challenge.operationId==operation and (work_id.is_empty() or a.linked.workId==work_id))
func start(operation:String,term_ids:Array,creative:TownCreative,at:String)->String:
	if not supported(operation):fail("这项记录流程尚未接入，暂时只展示条件。");return ""
	if operation=="life-novel" and has_completed(operation):fail("世界落笔已留下完成记录，可以回看原约定。");return ""
	if active_count()+creative.active.size()>=3:fail("手上最多放3件事，先完成或暂放一件。");return ""
	if attempts.any(func(a):return a.status=="active" and a.challenge.operationId==operation):fail("这项尝试正在进行，先回去继续。");return ""
	if attempts.size()>=200 or not Creative.date_valid(at):fail("记录已满或日期不正确。");return ""
	var challenge:=frozen_challenge(operation,term_ids)
	if challenge.is_empty():fail("接取条件无法识别，原记录未改变。");return ""
	var id:="attempt-%012d"%next_id;next_id+=1
	attempts.append({"id":id,"challenge":challenge,"acceptedAt":at,"status":"active","linked":{"workId":"","observationIds":[]},"completedAt":"","review":"","confirmed":[],"evidence":{}})
	return id
func put_aside(id:String)->bool:
	var a:=find(id)
	if a.is_empty() or a.status!="active":return fail("这项尝试不在进行中。")
	a.status="rest";return true
func resume(id:String,creative:TownCreative)->bool:
	var a:=find(id)
	if a.is_empty() or a.status!="rest":return fail("这项尝试不能重新接起。")
	if active_count()+creative.active.size()>=3:return fail("手上最多放3件事，先完成或暂放一件。")
	if attempts.any(func(other):return other.status=="active" and other.challenge.operationId==a.challenge.operationId):return fail("同一项挑战已有一次进行中。")
	if a.challenge.operationId=="life-novel" and has_completed("life-novel"):return fail("世界落笔已留下完成记录。")
	a.status="active";return true
func link_evidence(id:String,work_id:String,page_ids:Array,creative:TownCreative)->bool:
	var a:=find(id)
	if a.is_empty() or a.status=="done":return fail("完成记录已冻结。")
	var linked:={"workId":work_id,"observationIds":page_ids.duplicate()}
	if not links_valid(linked,creative,a.challenge.operationId):return fail("请选择现有作品和已收好的观察；不使用重复记录。")
	a.linked=linked;return true
static func links_valid(linked:Variant,creative:TownCreative,operation:String)->bool:
	if not Creative.keys_exact(linked,["workId","observationIds"]) or not linked.workId is String or not linked.observationIds is Array or linked.observationIds.size()>200:return false
	if linked.workId!="" and creative.work(linked.workId).is_empty():return false
	if operation=="life-novel" and not linked.observationIds.is_empty():return false
	for id in linked.observationIds:
		if not id is String or linked.observationIds.count(id)!=1:return false
		var page:=creative.observation(id)
		if page.is_empty() or page.status!="kept":return false
	return true
static func nonspace_length(value:String)->int:
	var regex:=RegEx.new();regex.compile("\\s")
	return regex.sub(value,"",true).length()
static func evidence_valid(challenge:Dictionary,evidence:Variant,work_id:String,completed_at:String)->bool:
	if not Creative.keys_exact(evidence,["work","observations"]):return false
	var work=evidence.work
	if not Creative.keys_exact(work,["id","title","body","updated"]) or work.id!=work_id or not Creative.text_valid(work.title,60,true) or not Creative.text_valid(work.body,12000,true) or not Creative.date_valid(work.updated) or work.updated>completed_at:return false
	if not evidence.observations is Array:return false
	if challenge.album=="lifetime":return evidence.observations.is_empty()
	if evidence.observations.size()<12 or evidence.observations.size()>200 or nonspace_length(work.body)<600:return false
	var ids:Dictionary={};var places:Dictionary={}
	for page in evidence.observations:
		if not Creative.keys_exact(page,["id","place","body","kind","observedOn"]) or not Creative.text_valid(page.id,100,true) or ids.has(page.id) or not Creative.text_valid(page.place,100,true) or not Creative.text_valid(page.body,3000,true) or not page.kind in ["plant","sky","street","other"] or not Creative.date_valid(page.observedOn) or page.observedOn>completed_at:return false
		ids[page.id]=true
		var place:String=page.place.strip_edges().to_lower()
		if not places.has(place):places[place]=[]
		if not places[place].has(page.observedOn):places[place].append(page.observedOn)
	if places.size()<3:return false
	if challenge.terms.any(func(t):return t.id=="revisit"):
		if places.values().filter(func(days):return days.size()>=2).size()<3:return false
	return true
func collect_evidence(a:Dictionary,creative:TownCreative)->Dictionary:
	var work:=creative.work(a.linked.workId)
	if work.is_empty() or creative.status(work)!="done":return {}
	var result:={"work":{"id":work.id,"title":work.title,"body":work.body,"updated":work.updated},"observations":[]}
	for id in a.linked.observationIds:
		var page:=creative.observation(id)
		if page.is_empty() or page.status!="kept":return {}
		result.observations.append({"id":page.id,"place":page.place,"body":page.body,"kind":page.kind,"observedOn":page.observedOn})
	return result
func ready_issue(id:String,creative:TownCreative,at:String)->String:
	var a:=find(id)
	if a.is_empty() or a.status!="active":return "这项尝试不在进行中。"
	if not Creative.date_valid(at) or at<a.acceptedAt:return "完成日期早于接取，或无法识别。"
	var work:=creative.work(a.linked.workId)
	if work.is_empty() or creative.status(work)!="done":return "先关联并在画室收好一件文字作品。"
	if has_completed(a.challenge.operationId,a.linked.workId):return "这件作品已经留下同项完成记录，请使用新的成果。"
	if not evidence_valid(a.challenge,collect_evidence(a,creative),a.linked.workId,at):return "实地求证需12条观察、3处地点、600非空白字结论；二次求证还需三个地点各有两天记录。"
	return ""
func complete(id:String,creative:TownCreative,review:String,confirmed:Array,at:String)->bool:
	var issue:=ready_issue(id,creative,at)
	if not issue.is_empty():return fail(issue)
	var a:=find(id)
	if not Creative.text_valid(review,1000,true):return fail("写下一句真实完成的结果，再收好这次尝试。")
	var required:Array=criteria(a.challenge).map(func(c):return c.id)
	if confirmed.size()!=required.size() or confirmed.any(func(key):return not key is String or confirmed.count(key)!=1 or not required.has(key)):return fail("逐项确认接取时的条件；还没做到可以继续。")
	a.evidence=collect_evidence(a,creative).duplicate(true);a.review=review.strip_edges();a.confirmed=required.duplicate();a.completedAt=at;a.status="done"
	return true
func honors()->Array:
	var result:Array=[];var cleared:Array=attempts.filter(func(a):return a.status=="done")
	for definition in Catalog.LIFETIME:
		var records:Array=cleared.filter(func(a):return a.challenge.operationId==definition.id)
		result.append({"id":definition.id,"name":definition.name,"condition":definition.objective,"supported":definition.supported,"earned":not records.is_empty(),"progress":0 if records.is_empty() else 1,"target":1,"earnedAt":"" if records.is_empty() else records[0].completedAt})
	var contracts:Array=cleared.filter(func(a):return a.challenge.album=="challenger")
	var best:=0;var kinds:Dictionary={}
	for a in contracts:best=maxi(best,rating(a.challenge));kinds[a.challenge.operationId]=true
	var stats:={"clears":contracts.size(),"best":best,"variety":kinds.size()}
	for definition in Catalog.CONTRACT:
		result.append({"id":definition.id,"name":definition.name,"condition":definition.condition,"supported":definition.supported,"earned":stats[definition.metric]>=definition.target,"progress":mini(stats[definition.metric],definition.target),"target":definition.target,"earnedAt":""})
	return result
static func same_rule(actual:Variant,expected:Variant)->bool:
	if expected is Dictionary:
		if not Creative.keys_exact(actual,expected.keys()):return false
		for key in expected:
			if not same_rule(actual[key],expected[key]):return false
		return true
	if expected is Array:
		if not actual is Array or actual.size()!=expected.size():return false
		for i in expected.size():
			if not same_rule(actual[i],expected[i]):return false
		return true
	if expected is int:return (actual is int or actual is float) and is_finite(float(actual)) and float(actual)==float(expected)
	return actual is String and expected is String and actual==expected
func serialize()->Dictionary:return {"schema":1,"ruleset":Rules.REVISION,"next_id":next_id,"attempts":attempts}
func load_data(raw:Variant,creative:TownCreative)->bool:
	if not Creative.keys_exact(raw,["schema","ruleset","next_id","attempts"]) or not (raw.schema is int or raw.schema is float) or raw.schema!=1 or raw.ruleset!=Rules.REVISION or not raw.attempts is Array or raw.attempts.size()>200:return false
	if not (raw.next_id is int or raw.next_id is float) or not is_finite(float(raw.next_id)) or raw.next_id<1 or raw.next_id>100000000 or float(raw.next_id)!=floorf(float(raw.next_id)):return false
	var seen:Dictionary={};var ongoing:Dictionary={};var completed:Dictionary={};var candidate:Array=[]
	for a in raw.attempts:
		if not Creative.keys_exact(a,["id","challenge","acceptedAt","status","linked","completedAt","review","confirmed","evidence"]) or not Creative.valid_id(a.id,"attempt",seen,int(raw.next_id)) or not a.challenge is Dictionary or not Creative.date_valid(a.acceptedAt) or not a.status in ["active","rest","done"]:return false
		if not a.challenge.get("operationId") is String or not supported(a.challenge.operationId):return false
		var terms=a.challenge.get("terms",[])
		if not terms is Array or terms.any(func(t):return not t is Dictionary or not t.get("id") is String):return false
		var expected:=frozen_challenge(a.challenge.operationId,terms.map(func(t):return t.id))
		if expected.is_empty() or not same_rule(a.challenge,expected) or not links_valid(a.linked,creative,a.challenge.operationId):return false
		if a.status=="active":
			if ongoing.has(a.challenge.operationId):return false
			ongoing[a.challenge.operationId]=true
		if a.status=="done":
			if not Creative.date_valid(a.completedAt) or a.completedAt<a.acceptedAt or not Creative.text_valid(a.review,1000,true) or not a.confirmed is Array or not evidence_valid(expected,a.evidence,a.linked.workId,a.completedAt):return false
			var required:Array=criteria(expected).map(func(c):return c.id)
			if a.confirmed.size()!=required.size() or a.confirmed.any(func(key):return not key is String or a.confirmed.count(key)!=1 or not required.has(key)):return false
			var work:=creative.work(a.linked.workId)
			if work.is_empty() or creative.status(work)!="done":return false
			if a.evidence.observations.map(func(page):return page.id)!=a.linked.observationIds:return false
			var unique_key:String=a.challenge.operationId+(":"+a.linked.workId if a.challenge.album=="challenger" else "")
			if completed.has(unique_key):return false
			completed[unique_key]=true
		else:
			if a.completedAt!="" or a.review!="" or not a.confirmed is Array or not a.confirmed.is_empty() or not a.evidence is Dictionary or not a.evidence.is_empty():return false
		var clean:Dictionary=a.duplicate(true);clean.challenge=expected
		candidate.append(clean)
	if ongoing.has("life-novel") and completed.has("life-novel"):return false
	if ongoing.size()+creative.active.size()>3:return false
	attempts=candidate;next_id=int(raw.next_id);return true
