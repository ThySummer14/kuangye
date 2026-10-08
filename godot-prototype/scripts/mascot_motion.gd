class_name XiaoyaMotion
extends RefCounted

# Parameters and damped oscillator are ported from the project's main branch:
# app/src/game/emotions.js at 764e83d9 (MIT). Only the five routed moods below
# are enabled here; the remaining definitions are retained for traceable mapping.
const Art=preload("res://scripts/art.gd")
const ENABLED=["idle","curious","happy","proud","focused"]
const CHANGES={
	"idle":{},"curious":{"roll":-7.0,"leaf":0.22},
	"happy":{"smile":1.0,"arms":0.3},
	"proud":{"smile":0.9,"bodyH":1.05,"bodyW":0.98},
	"celebrate":{"smile":1.0,"arms":1.0},
	"sleepy":{"leftH":0.08,"rightH":0.08,"bodyW":1.14,"bodyH":0.67,"leaf":-0.85,"breathScale":0.5},
	"sad":{"leftH":0.42,"rightH":0.42,"leftTilt":-14.0,"rightTilt":14.0,"leaf":-0.55},
	"worried":{"leftH":0.85,"rightH":0.85,"bodyW":0.9,"bodyH":0.84,"leaf":-0.45},
	"shocked":{"leftH":0.29,"rightH":0.29,"leftW":0.42,"rightW":0.42,"bodyW":1.2,"bodyH":0.58},
	"loved":{"smile":1.0,"hug":1.0},
	"excited":{"leftH":1.12,"rightH":1.12,"leftW":1.06,"rightW":1.06,"leaf":0.65},
	"thinking":{"leftH":0.48,"rightH":0.48,"yaw":-6.0,"pitch":-3.0},
	"focused":{"leftH":0.88,"rightH":0.88,"leftW":0.87,"rightW":0.87,"breathScale":0.0,"gazeScale":0.25},
	"shy":{"leftH":0.7,"rightH":0.85,"leftTilt":-5.0,"rightTilt":5.0,"cheek":1.0,"hug":0.75}}
const DEFAULT={"leftH":1.0,"rightH":1.0,"leftW":1.0,"rightW":1.0,"leftTilt":0.0,"rightTilt":0.0,
	"smile":0.0,"mouth":0.0,"yaw":0.0,"pitch":0.0,"roll":0.0,"bodyW":1.0,"bodyH":1.0,
	"cheek":0.0,"leaf":0.0,"arms":0.0,"hug":0.0,"split":35.0,"gazeX":0.0,"gazeY":0.0,"breathScale":1.0,"gazeScale":1.0}
var body:Node3D
var sprout:Node3D
var hands:Array[Node3D]=[]
var eyes:Array[MeshInstance3D]=[]
var values:Dictionary={}
var velocities:Dictionary={}
var context:="idle"
var reaction:=""
var reaction_left:=0.0
var mood:="idle"
var clock:=0.0
var walk_phase:=0.0
var walk_weight:=0.0
var blink_clock:=0.0
var eye_cache:Vector3=Vector3(-1,-1,-1)
var suspended:=false

static func pose_for(id:String)->Dictionary:
	var pose:Dictionary=DEFAULT.duplicate()
	pose.merge(CHANGES.get(id,{}),true)
	return pose

static func spring_step(x:float,v:float,target:float,dt:float)->Vector2:
	# Exact underdamped solution; interruptions retain velocity.
	var w:=12.0;var z:=0.86;dt=clampf(dt,0.0,1.0)
	var a:=x-target;var wd:float=w*sqrt(1.0-z*z)
	var b:float=(v+z*w*a)/wd;var c:=cos(wd*dt);var s:=sin(wd*dt);var e:=exp(-z*w*dt)
	return Vector2(target+e*(a*c+b*s),e*(-a*wd*s+b*wd*c-z*w*(a*c+b*s)))

func bind(mascot:Node3D)->void:
	body=mascot.get_node("BodyShape")
	sprout=body.get_node("two-leaf-sprout")
	hands.clear();eyes.clear()
	for side in [-1,1]:
		hands.append(body.get_node("hand"+str(side)))
		eyes.append(body.get_node("eye"+str(side)))
	reset()

func reset()->void:
	values=pose_for("idle");velocities.clear()
	for key in values:velocities[key]=0.0
	context="idle";reaction="";reaction_left=0;clock=0;blink_clock=0;walk_weight=0;walk_phase=0;mood="idle"
	eye_cache=Vector3(-1,-1,-1)
	apply_pose(1.0)

func set_context(next:String)->void:
	context=next if next in ENABLED else "idle"

func react(next:String,seconds:=1.6)->bool:
	if not next in ENABLED or suspended:return false
	reaction=next;reaction_left=clampf(seconds,0.1,4.0)
	return true

func set_suspended(value:bool)->void:
	suspended=value
	if value:reset()

func step(delta:float,moving:bool)->void:
	if not is_instance_valid(body) or suspended:return
	var dt:=clampf(delta,0.0,0.1)
	clock+=dt;blink_clock=fmod(blink_clock+dt,4.6)
	reaction_left=maxf(0,reaction_left-dt)
	if reaction_left==0:reaction=""
	mood=context if context!="idle" else (reaction if not reaction.is_empty() else "idle")
	var target:=pose_for(mood)
	for key in values:
		var result:=spring_step(values[key],velocities[key],target[key],dt)
		values[key]=result.x;velocities[key]=result.y
	walk_weight=lerpf(walk_weight,1.0 if moving else 0.0,1.0-exp(-dt*14.0))
	walk_phase+=dt*9.0*walk_weight
	var blink:=1.0
	if blink_clock>4.34:blink=1.0-sin((blink_clock-4.34)/0.26*PI)*0.94
	apply_pose(blink)

func apply_pose(blink:float)->void:
	if not is_instance_valid(body):return
	var breath:float=sin(clock*2.0)*0.010*values.breathScale
	# Motion is attached to the existing no-leg silhouette and never moves the
	# collision body or lifts it off the floor. Walking uses a small side sway.
	body.position=Vector3.ZERO
	body.scale=Vector3(values.bodyW*(1.0-breath*0.35),values.bodyH*(1.0+breath),values.bodyW)
	body.rotation=Vector3(deg_to_rad(values.pitch),deg_to_rad(values.yaw),deg_to_rad(values.roll)+sin(walk_phase)*0.027*walk_weight)
	sprout.rotation.z=values.leaf*0.30+sin(clock*1.7)*0.022*values.breathScale
	for i in 2:
		var side:float=-1.0 if i==0 else 1.0
		hands[i].position=Vector3(side*(0.425+values.arms*0.02-values.hug*0.10),0.20+values.arms*0.11,0.08)
		hands[i].rotation.z=side*values.arms*0.35+sin(walk_phase+side*0.8)*0.08*walk_weight
	var eye_state:=Vector3(values.leftH*blink,values.leftW,values.smile)
	if eye_state.distance_to(eye_cache)>0.006:
		eye_cache=eye_state
		for i in 2:
			var prefix:="left" if i==0 else "right"
			set_eye(eyes[i],Vector2(-0.17 if i==0 else 0.17,0.43),values[prefix+"W"],values[prefix+"H"]*blink,values.smile)

static func set_eye(eye:MeshInstance3D,center:Vector2,width:float,height:float,smile:float)->void:
	# Reproject the changing eye surface onto the original radial body profile.
	# Scaling an already curved patch in local Y can bury it under the body.
	var vertices:=PackedVector3Array();var normals:=PackedVector3Array()
	for i in 16:
		var corners:Array[Vector3]=[]
		for pair in [[i,-1.0],[i,1.0],[i+1,-1.0],[i+1,1.0]]:
			var x:float=-1.0+float(pair[0])/8.0
			var curve:=sqrt(maxf(0,1.0-x*x))
			var px:float=center.x+x*lerpf(0.030*width,0.037,smile)
			var neutral:float=pair[1]*curve*0.0495*maxf(0.035,height)
			var happy:float=curve*0.021+pair[1]*curve*0.0065
			var py:float=center.y+lerpf(neutral,happy,clampf(smile,0,1))
			corners.append(Vector3(px,py,Art.body_depth(px,py)+0.013))
		for n in [0,1,2,1,3,2]:vertices.append(corners[n]);normals.append(Vector3.BACK)
	var arrays:Array=[];arrays.resize(Mesh.ARRAY_MAX);arrays[Mesh.ARRAY_VERTEX]=vertices;arrays[Mesh.ARRAY_NORMAL]=normals
	var mesh:=ArrayMesh.new();mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays)
	eye.mesh=mesh
