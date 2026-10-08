extends SceneTree
const Scene=preload("res://main.tscn")
const State=preload("res://scripts/state.gd")
const Motion=preload("res://scripts/mascot_motion.gd")
const Art=preload("res://scripts/art.gd")
var app
var passed:=0
var failed:=0
func _initialize()->void:call_deferred("run")
func check(ok:bool,text:String)->void:
	if ok:passed+=1
	else:failed+=1
	print(("PASS " if ok else "FAIL ")+text)
func advance(motion,seconds:float,moving:=false)->void:
	for i in ceili(seconds*60):motion.step(1.0/60.0,moving)
func click_text(text:String)->bool:
	for node in app.modal.find_children("*","Button",true,false):
		if node.text==text:node.pressed.emit();return true
	return false
func run()->void:
	check(Motion.CHANGES.size()==14 and Motion.ENABLED.size()==5,"source maps fourteen moods with five active contexts")
	var a:=Motion.spring_step(0.0,0.0,1.0,0.04)
	var b:=Motion.spring_step(a.x,a.y,1.0,0.06)
	var single:=Motion.spring_step(0.0,0.0,1.0,0.10)
	check(b.distance_to(single)<0.00001,"damped oscillator gives the same result across frame subdivision")
	var interrupted:=Motion.spring_step(a.x,a.y,-0.4,0.01)
	check(absf(interrupted.x-a.x)<0.12 and is_finite(interrupted.y),"interrupted expression retains continuous finite motion")
	app=Scene.instantiate();app.fixture_mode=true;root.add_child(app)
	await process_frame;await process_frame
	app.set_physics_process(false);app.state.path="user://mascot-motion-fixture.json"
	var m=app.mascot_motion
	m.set_suspended(false)
	var position:Vector3=app.player.position
	advance(m,2.0,true)
	check(app.player.position==position and m.body.position==Vector3.ZERO,"walking animation never changes collision position or adds a hop")
	check(absf(m.body.rotation.z)>0.001,"walking uses a visible small side sway")
	m.set_context("curious");advance(m,1.0)
	check(absf(rad_to_deg(m.body.rotation.z)+7.0)<0.1 and m.sprout.rotation.z>0,"curious routes original head tilt and sprout lift")
	m.set_context("focused");advance(m,1.0)
	var scale:Vector3=m.body.scale;var leaf:Vector3=m.sprout.rotation
	advance(m,0.5)
	check(scale.distance_to(m.body.scale)<0.0001 and leaf.distance_to(m.sprout.rotation)<0.0001,"focused editing settles breathing and sprout movement")
	m.set_context("idle");check(m.react("proud",2.0),"completed work can trigger a bounded proud reaction")
	advance(m,1.0)
	check(m.body.scale.y>1.035 and m.values.smile>0.85,"proud uses gentle tall posture and smiling eyes")
	advance(m,2.0)
	check(m.reaction=="" and m.mood=="idle" and absf(m.values.bodyH-1)<0.001,"one-shot reaction settles back to idle")
	check(not m.react("shocked") and not m.react("unknown"),"unported and unknown moods do not activate")
	m.reset();advance(m,4.47)
	var ey=m.eyes[0].mesh.get_aabb()
	check(ey.size.y<0.025,"idle has a short natural blink")
	advance(m,0.2)
	check(m.eyes[0].mesh.get_aabb().size.y>0.085,"blink reopens to the solid oval eye")
	m.react("happy");advance(m,0.8)
	for eye in m.eyes:
		var vertices:PackedVector3Array=eye.mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
		var clear:=true
		for p in vertices:clear=clear and p.z>=Art.body_depth(p.x,p.y)+0.012
		var normals:PackedVector3Array=eye.mesh.surface_get_arrays(0)[Mesh.ARRAY_NORMAL]
		check(clear and normals[0].z>0,"smiling eye surface and normals remain outside the body")
	check(m.body.get_node("horn-left-tall").scale.y>m.body.get_node("horn-right-short").scale.y,"unequal soft horns preserve left-tall silhouette")
	check(m.sprout.has_node("leaf-1") and m.sprout.has_node("leaf1") and m.sprout.get_children().filter(func(n):return n.name.begins_with("leaf")).size()==2,"sprout retains exactly two leaves")
	check(m.body.get_children().filter(func(n):return String(n.name).begins_with("mouth-w")).size()==6,"small original w mouth remains unchanged")
	var old_body:Node3D=m.body
	app.pending_mascot_reaction="happy";app.change_location("shop");await process_frame
	check(m.body!=old_body and is_instance_valid(m.body) and m.body==app.mascot.get_node("BodyShape"),"room switch binds only the new mascot")
	check(app.pending_mascot_reaction=="" and m.reaction=="" and m.context=="idle","room switch clears pending old-room emotion")
	app.show_note();await process_frame
	check(app.modal.get_meta("mascot_mood","")=="focused","note editor requests focused context")
	app.note_editor.text="今天的风把树叶翻亮了。"
	check(click_text("收进生活小记"),"note can be saved through its normal action")
	advance(m,0.5)
	check(not is_instance_valid(app.modal) and m.reaction=="happy" and m.values.smile>0.9,"saved note smiles after its panel has closed")
	app.show_note();app.mascot_feedback("proud")
	app.creative_panel.book();await process_frame
	check(app.pending_mascot_reaction=="proud","switching modal pages preserves queued completion feedback")
	app.close_modal();advance(m,0.3)
	check(app.pending_mascot_reaction=="" and m.reaction=="proud","returning to world plays queued feedback once")
	app.pause_input();advance(m,0.5)
	check(m.suspended and m.reaction=="" and m.context=="idle" and m.velocities.values().all(func(v):return v==0),"focus loss clears reactions and spring velocities")
	m.set_suspended(false);advance(m,0.2)
	check(not m.suspended and m.mood=="idle","focus resume returns to idle without stale feedback")
	app.close_modal();app.show_note();app.note_editor.text="";click_text("收进生活小记")
	check(is_instance_valid(app.modal) and m.reaction=="" and app.pending_mascot_reaction=="","rejected blank note cannot celebrate")
	app.close_modal();m.reset()
	var c=app.state.creative;var date:=Time.get_date_string_from_system()
	var observation:String=c.start_observation(date)
	c.update_observation(observation,{"place":"窗边","body":"叶子被风吹亮。"});c.keep_observation(observation,date)
	var work:String=c.start_work(observation,"叶子的一面","留下两句话。",date)
	c.update_work(work,"叶子的一面","风让叶子翻过来，光落进房间。","",date)
	app.creative_panel.completion(work);await process_frame
	click_text("收好作品")
	check(app.pending_mascot_reaction=="" and c.done.is_empty(),"unchecked completion has no proud reaction")
	for node in app.modal.find_children("*","CheckBox",true,false):node.button_pressed=true
	click_text("收好作品");await process_frame
	check(app.pending_mascot_reaction=="proud" and c.done.size()==1,"actual confirmed completion queues proud after successful save")
	app.close_modal();advance(m,0.4)
	check(m.reaction=="proud","completed-work panel close plays its real queued reaction")
	m.reset();app.state.path="user://missing-motion-directory/failed.json"
	app.show_note();app.note_editor.text="本次不能写盘的记录。";click_text("收进生活小记")
	check(app.unsaved_changes and m.reaction=="" and app.pending_mascot_reaction=="","save failure keeps memory progress without a success reaction")
	app.state.path="user://mascot-motion-fixture.json"
	check(app.save() and not app.unsaved_changes,"retry on restored normal path clears unsaved state")
	var reopened:=State.new();reopened.path=app.state.path
	check(reopened.load_data() and reopened.serialize()==app.state.serialize(),"normal-path retry restores complete persistent state")
	if DisplayServer.get_name()!="headless" and "--capture-motion" in OS.get_cmdline_user_args():await capture_preview()
	var report:={"passed":passed,"failed":failed,"enabled_moods":Motion.ENABLED,"native":DisplayServer.get_name()!="headless"}
	var f:=FileAccess.open("res://artifacts/mascot-motion-results.json",FileAccess.WRITE);f.store_string(JSON.stringify(report,"\t"));f.close()
	print("MASCOT MOTION ",passed," passed, ",failed," failed")
	quit(0 if failed==0 else 1)

func capture_preview()->void:
	app.status_label.text=""
	app.close_modal();app.change_location("home");await process_frame;await process_frame
	root.mode=Window.MODE_WINDOWED;root.unresizable=false;root.size=Vector2i(1280,720);root.position=Vector2i(30,50)
	await process_frame;await process_frame
	app.mascot_motion.set_suspended(false)
	app.mascot.rotation.y=0.48
	app.show_note();app.note_editor.text="傍晚的树叶被风吹亮了。";click_text("收进生活小记")
	check(not app.unsaved_changes and not app.retry_save_button.visible and app.mascot_motion.reaction=="happy","normal note save produces a happy world pose without failure UI")
	app.status_label.text=""
	advance(app.mascot_motion,.65)
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://artifacts/motion-world-happy.png")
	if "--world-only" in OS.get_cmdline_user_args():return
	root.size=Vector2i(640,480);app.hud.visible=false
	await process_frame;await process_frame
	app.player.position=Vector3(0,0.02,0.6)
	var target:Vector3=app.player.position+Vector3(0,0.53,0)
	app.camera.size=2.8;app.camera.keep_aspect=Camera3D.KEEP_HEIGHT
	app.camera.position=target+Vector3(2.2,1.8,4.0);app.camera.look_at(target)
	var caption:Label=app.label("",21);caption.position=Vector2(24,20);root.add_child(caption)
	var sub:Label=app.label("小芽 · 现有形象与参数移植",13);sub.position=Vector2(24,51);root.add_child(sub)
	app.mascot_motion.reset();app.mascot_motion.set_suspended(false)
	var frame:=0
	for spec in [["idle","自在 · 呼吸与眨眼"],["walk","走动 · 轻轻摆身"],["curious","互动 · 好奇"],["focused","书写 · 专注"],["happy","收好记录 · 开心"],["proud","完成作品 · 骄傲"],["idle","回到自在"]]:
		caption.text=spec[1]
		app.mascot_motion.set_context("idle" if spec[0]=="walk" else spec[0])
		for i in 22:
			app.mascot_motion.step(1.0/15.0,spec[0]=="walk")
			await process_frame;await RenderingServer.frame_post_draw
			var image:=root.get_texture().get_image()
			image.save_png("res://artifacts/motion-frame-%03d.png"%frame)
			if i==16:image.save_png("res://artifacts/motion-"+spec[0]+".png")
			frame+=1
	caption.queue_free();sub.queue_free()
