extends SceneTree
const State=preload("res://scripts/state.gd")
const Badges=preload("res://scripts/badges.gd")
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func observation(c,place:="河岸",at:="2026-10-08")->String:
	var id:String=c.start_observation(at);c.update_observation(id,{"place":place,"body":"这一处有可以比较的发现。"});c.keep_observation(id,at);return id
func work(c,body:="小说结尾与存放位置的记录。",at:="2026-10-08",finish:=true)->String:
	var id:String=c.start_work(observation(c),"完成记录","写下自己做出的成果。",at)
	if not id.is_empty():
		c.update_work(id,"完成记录",body,"",at)
		if finish:c.complete_work(id,at)
	return id
func earned(b)->Array:return b.honors().filter(func(x):return x.earned).map(func(x):return x.id)
func run()->void:
	var s:=State.new();var c=s.creative;var b=s.badges
	check(b.honors().size()==18 and earned(b).is_empty(),"fresh cabinet lists eighteen definitions and awards nothing")
	check(b.honors().filter(func(x):return x.supported).size()==3,"only three medals have supported unlock dependencies")
	check(b.start("life-pixel",[],c,"2026-10-08")=="","unsupported real-world goals cannot be accepted")
	check(b.start("field-study",["evidence","evidence"],c,"2026-10-08")=="","duplicate modifiers rejected without an attempt")
	check(b.start("field-study",["invented"],c,"2026-10-08")=="","unknown modifiers rejected")
	var novel:String=b.start("life-novel",[],c,"2026-10-08")
	check(novel!="" and b.find(novel).linked.workId=="","challenge can be accepted before selecting evidence")
	check(b.start("life-novel",[],c,"2026-10-08")=="","repeat accept cannot duplicate an active operation")
	var frozen:Dictionary=b.find(novel).challenge.duplicate(true)
	check(not b.complete(novel,c,"已经写完。",["objective"],"2026-10-08"),"no linked finished work cannot complete")
	var wid:=work(c)
	check(b.link_evidence(novel,wid,[],c),"existing completed writing can be linked as evidence")
	check(b.find(novel).challenge==frozen,"linking evidence cannot change frozen objective")
	check(not b.complete(novel,c," ",["objective"],"2026-10-08"),"blank real-result statement rejected")
	check(not b.complete(novel,c,"我已写完故事结尾。",[],"2026-10-08"),"missing objective confirmation rejected")
	check(not b.complete(novel,c,"我已写完故事结尾。",["objective","objective"],"2026-10-08"),"duplicate confirmations rejected")
	check(not b.complete(novel,c,"我已写完故事结尾。",["objective"],"2026-10-07"),"completion cannot predate acceptance")
	s.add_note("同日生活记录","2026-10-08");var coins:int=s.coins
	check(s.complete_badge_attempt(novel,"整本已写到结尾，正文另存手稿；此处为完成记录。",["objective"],"2026-10-08"),"explicit novel result and all confirmations create one completion")
	check(s.coins==coins and earned(b)==["life-novel"],"novel awards one medal and shares existing daily light budget")
	check(not s.complete_badge_attempt(novel,"再次点击",["objective"],"2026-10-09") and s.coins==coins,"repeated completion on another date cannot award again")
	check(b.start("life-novel",[],c,"2026-10-09")=="","already-earned lifetime goal opens history instead of another attempt")
	check(not b.link_evidence(novel,wid,[],c),"completed evidence cannot be relinked")
	var old_body:String=b.find(novel).evidence.work.body
	c.update_work(wid,"修订的记录","后来修订原文。","","2026-10-09")
	check(b.find(novel).evidence.work.body==old_body,"editing original work cannot rewrite historical evidence")
	var field:String=b.start("field-study",["revisit","evidence"],c,"2026-10-08")
	check(Badges.rating(b.find(field).challenge)==8 and b.find(field).challenge.terms[0].id=="evidence","modifier order is canonical and frozen rating is eight")
	check(b.put_aside(field) and b.active_count()==0,"putting aside frees the shared active slot")
	check(b.resume(field,c),"rested attempt can resume with the same conditions")
	var pages:Array=[]
	for n in 12:pages.append(observation(c,["河岸","桥边","广场"][n%3],"2026-10-08"))
	var report:=work(c,"观".repeat(599))
	check(b.link_evidence(field,report,pages,c),"twelve kept observations and one conclusion can be selected")
	check(not b.complete(field,c,"已复查。",["objective","evidence","revisit"],"2026-10-09"),"599 nonspace characters cannot satisfy a 600-character conclusion")
	c.update_work(report,"调查结论","观".repeat(600)+" ","","2026-10-09")
	check(not b.complete(field,c,"已复查。",["objective","evidence","revisit"],"2026-10-09"),"revisit cannot be satisfied by twelve same-day records")
	for i in range(6,12):c.update_observation(pages[i],{"observedOn":"2026-10-09"})
	check(not b.link_evidence(field,report,pages+[pages[0]],c),"duplicate evidence cannot inflate finding count")
	check(s.complete_badge_attempt(field,"比较三处公共地点的两次观察，整理了变化。",["revisit","objective","evidence"],"2026-10-09"),"qualifying survey plus individual confirmations completes rating-eight attempt")
	check(s.coins==coins+5 and earned(b)==["life-novel","breach","resolve"],"only reachable honors unlock and one daily light reward is applied")
	var complete_snapshot:Dictionary=b.find(field).duplicate(true)
	c.update_observation(pages[0],{"body":"后来的新发现。","place":"后来地点"})
	c.update_work(report,"新版本","较短的后记。","","2026-10-10")
	check(b.find(field)==complete_snapshot,"later observation and conclusion revisions do not modify frozen completion")
	var again:String=b.start("field-study",[],c,"2026-10-10");b.link_evidence(again,report,pages,c)
	check(not b.complete(again,c,"重复使用旧结论。",["objective"],"2026-10-10"),"same completed conclusion cannot be reused for the same operation")
	b.put_aside(again)
	var raw:Dictionary=b.serialize().duplicate(true);var recovered:=Badges.new()
	check(recovered.load_data(raw,c) and recovered.serialize()==raw and earned(recovered)==earned(b),"attempts, snapshots, conditions, and honors round-trip exactly")
	for corruption in ["earned","unknown-rule","blank-review","missing-check","bad-weight","future-evidence"]:
		var bad:Dictionary=raw.duplicate(true)
		match corruption:
			"earned":bad.earned=["life-pixel"]
			"unknown-rule":bad.ruleset="future"
			"blank-review":bad.attempts[0].review=" "
			"missing-check":bad.attempts[0].confirmed=[]
			"bad-weight":bad.attempts[1].challenge.terms[0].weight=10
			"future-evidence":bad.attempts[1].evidence.observations[0].observedOn="2099-01-01"
		check(not recovered.load_data(bad,c) and recovered.serialize()==raw,"corrupt "+corruption+" rejects atomically without losing prior data")
	var capacity:=State.new();var cc=capacity.creative;var cb=capacity.badges
	var first:=work(cc,"草稿", "2026-10-08",false);var second:=work(cc,"草稿", "2026-10-08",false)
	var active:String=cb.start("field-study",[],cc,"2026-10-08")
	check(active!="" and cc.busy_count()==3,"creations and accepted challenges share three active slots")
	check(work(cc,"第四项","2026-10-08",false)=="","creation entry cannot bypass challenge slot count")
	check(cb.start("life-novel",[],cc,"2026-10-08")=="","challenge entry cannot bypass creation slot count")
	cb.put_aside(active);check(work(cc,"第三项","2026-10-08",false)!="","resting a challenge permits another creation")
	check(not cb.resume(active,cc),"resume cannot overflow the shared limit")
	cc.rest_work(first,"2026-10-08");check(cb.resume(active,cc),"resume succeeds after another item rests")
	check(not cc.resume_work(first,"2026-10-08"),"creation resume also respects challenge occupancy")
	s.path="user://badge-roundtrip.json";check(s.save_data(),"full current prototype save succeeds")
	var loaded:=State.new();loaded.path=s.path
	check(loaded.load_data() and loaded.serialize()==s.serialize(),"full save preserves furniture, creative records, badge snapshots and daily ledger")
	var valid_text:=FileAccess.get_file_as_string(s.path)
	for legacy in [1,2]:
		var old:Dictionary=s.serialize().duplicate(true);old.version=legacy;old.erase("badges")
		if legacy==1:old.erase("creative")
		var f:=FileAccess.open(s.path,FileAccess.WRITE);f.store_string(JSON.stringify(old));f.close()
		check(loaded.load_data() and loaded.badges.attempts.is_empty() and loaded.coins==s.coins and loaded.notes==s.notes,"v"+str(legacy)+" migrates to an empty cabinet without losing existing progress")
	var f:=FileAccess.open(s.path,FileAccess.WRITE);f.store_string(valid_text);f.close();loaded.load_data()
	var before:Dictionary=loaded.serialize().duplicate(true)
	var broken:Dictionary=s.serialize().duplicate(true);broken.badges.attempts[0].review=""
	f=FileAccess.open(s.path,FileAccess.WRITE);f.store_string(JSON.stringify(broken));f.close()
	check(not loaded.load_data() and loaded.serialize()==before and FileAccess.get_file_as_string(s.path)==JSON.stringify(broken),"invalid badge section preserves original file and full prior in-memory state")
	var legacy_path:="user://migration-source-fixture.json"
	var upgraded_path:="user://migration-target-%d.json"%Time.get_ticks_usec()
	var old:Dictionary=s.serialize().duplicate(true);old.version=2;old.erase("badges")
	var original_text:=JSON.stringify(old)
	f=FileAccess.open(legacy_path,FileAccess.WRITE);f.store_string(original_text);f.close()
	var migrated:=State.new();migrated.path=upgraded_path
	check(migrated.load_data(legacy_path) and migrated.coins==s.coins and migrated.creative.serialize()==s.creative.serialize(),"missing current save reads a complete existing v2 file")
	check(migrated.badges.attempts.is_empty() and migrated.save_data(),"first new-schema save creates a separate current file")
	check(FileAccess.get_file_as_string(legacy_path)==original_text and JSON.parse_string(FileAccess.get_file_as_string(upgraded_path)).version==State.VERSION,"upgrade preserves old file byte-for-byte for rollback")
	migrated.coins+=5;migrated.save_data();var fresh:=State.new();fresh.path=upgraded_path
	check(fresh.load_data(legacy_path) and fresh.coins==migrated.coins,"existing current save takes precedence over the old snapshot")
	f=FileAccess.open(upgraded_path,FileAccess.WRITE);f.store_string("invalid-current-file");f.close()
	check(not fresh.load_data(legacy_path) and FileAccess.get_file_as_string(upgraded_path)=="invalid-current-file","invalid current file is preserved rather than silently falling back")
	old.coins+=17;f=FileAccess.open(legacy_path,FileAccess.WRITE);f.store_string(JSON.stringify(old));f.close()
	migrated.save_data()
	check(fresh.load_data(legacy_path) and fresh.coins==migrated.coins and fresh.coins!=old.coins,"later rollback-era edits in old file do not overwrite an existing current save")
	var failed_upgrade:=State.new();failed_upgrade.path="user://missing-migration-directory/new-v3.json"
	var rollback_bytes:=FileAccess.get_file_as_string(legacy_path)
	check(failed_upgrade.load_data(legacy_path) and not failed_upgrade.save_data() and not FileAccess.file_exists(failed_upgrade.path) and FileAccess.get_file_as_string(legacy_path)==rollback_bytes,"failed first v3 write preserves old bytes and leaves no false migration marker")
	for terms in [[],["revisit"]]:
		var threshold:=State.new();var tc=threshold.creative;var tb=threshold.badges;var tp:Array=[]
		for n in 12:tp.append(observation(tc,["河岸","桥边","广场"][n%3],"2026-10-07" if n<6 else "2026-10-08"))
		var tw:=work(tc,"结".repeat(600));var ta:String=tb.start("field-study",terms,tc,"2026-10-08");tb.link_evidence(ta,tw,tp,tc)
		var checked:Array=Badges.criteria(tb.find(ta).challenge).map(func(rule):return rule.id)
		check(tb.complete(ta,tc,"按冻结条件完成调查。",checked,"2026-10-08") and earned(tb)==["breach"],"rating "+str(Badges.rating(tb.find(ta).challenge))+" grants breach but cannot unlock rating-eight resolve")
	var result:={"passed":passed,"failed":failed,"physical_phone":false}
	f=FileAccess.open("res://artifacts/badge-model-results.json",FileAccess.WRITE);f.store_string(JSON.stringify(result,"\t"));f.close()
	print("BADGE MODEL ",passed," passed, ",failed," failed");quit(0 if failed==0 else 1)
