import * as THREE from 'three';
import { EXTERIOR } from '../data/town.js';
import { yardFootprint } from '../game/town.js';
function warm(mesh, intensity = .7) { mesh.material.emissive.copy(mesh.material.color); mesh.material.emissiveIntensity = intensity; return mesh; }

export { buildExterior, buildLibrary, buildAtelier, buildWoodshop } from './building-models.js';

// Custom static surfaces retain position/normal/uv for the shared material batcher.
function surface(mesh, positions, uv) {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv || Array(positions.length/3*2).fill(0),2));
  geometry.computeVertexNormals();
  mesh.geometry.dispose(); mesh.geometry=geometry;
  return mesh;
}
function cloth(mesh, width, height, phase) {
  const positions=[],uv=[], nx=10, ny=4;
  const point=(x,y,side)=>[(x/nx-.5)*width, -y/ny*height-.025*Math.sin(x/nx*Math.PI),
    .045*Math.sin(x/nx*Math.PI*4+phase)*( .2+y/ny)+side*.008];
  const triangle=(a,b,c,side)=>{for(const [x,y] of side>0?[a,b,c]:[c,b,a]){positions.push(...point(x,y,side));uv.push(x/nx,y/ny);}};
  for(const side of [-1,1])for(let y=0;y<ny;y++)for(let x=0;x<nx;x++) {
    triangle([x,y],[x,y+1],[x+1,y],side);triangle([x+1,y],[x,y+1],[x+1,y+1],side);
  }
  return surface(mesh,positions,uv);
}
function mapleLeaf(mesh) {
  // Five pointed lobes, folded along a raised centre; both faces are geometry.
  const outline=[[-.18,-.72],[-.66,-.4],[-.4,-.23],[-.96,.2],[-.53,.23],[-.57,.68],[-.25,.5],[0,1],[.25,.5],[.57,.68],[.53,.23],[.96,.2],[.4,-.23],[.66,-.4],[.18,-.72]];
  const positions=[];
  for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    positions.push(0,.1,0,a[0],0,a[1],b[0],0,b[1], 0,.075,0,b[0],-.01,b[1],a[0],-.01,a[1]);
  }
  return surface(mesh,positions);
}
export function buildYardItem(e, parent, p) {
  const size = yardFootprint(p.id,p.rotation), g = new THREE.Group();
  g.position.set(p.x - 3 + size.w/2, .03, p.z + size.d/2);
  g.rotation.y = -p.rotation * Math.PI / 180;
  g.userData.uid = p.id; parent.add(g);
  // Tiny joints and hems do not need the rounded-box subdivision budget.
  const box = (w,h,d,c,x,y,z) => {
    const mesh=e.box(w,h,d,c,x,y,z,g);
    if(Math.min(w,h,d)<=.075){mesh.geometry.dispose();mesh.geometry=new THREE.BoxGeometry(w,h,d);}
    return mesh;
  };
  const ball = (r,c,x,y,z) => {
    const mesh=e.ball(r,c,x,y,z,g);
    if(r<=.08){mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(r,8,6);}
    return mesh;
  };
  const cyl = (a,b,h,c,x,y,z,n=12) => e.cyl(a,b,h,c,x,y,z,g,n);
  const wood='#bc966b', darkWood='#98734d', metal='#627362', stone='#c7cebb';
  const branch=(a,b,r)=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from);
    const mid=from.add(to).multiplyScalar(.5), m=cyl(r*.6,r,direction.length(),darkWood,mid.x,mid.y,mid.z,7);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return m;
  };
  const leaf=(x,y,z,scale,color,angle=0)=>{
    const m=mapleLeaf(box(1,1,1,color,x,y,z));m.scale.setScalar(scale);m.rotation.set(.2,angle,.22);return m;
  };
  if(p.id==='bench') {
    // Separate seat/back boards, side frames, arm rests and visible brass pins.
    for(let i=0;i<4;i++)box(1.72,.085,.135,i%2?wood:'#ba9262',0,.51,-.235+i*.155);
    for(let i=0;i<3;i++)box(1.72,.115,.065,i%2?wood:'#ba9262',0,.73+i*.15,-.29-i*.035).rotation.x=-.14;
    for(const x of [-.68,.68]) {
      for(const z of [-.24,.24])box(.08,.46,.08,metal,x,.24,z).rotation.z=x*.07;
      box(.095,.075,.64,metal,x,.445,0);
      box(.075,.61,.075,metal,x,.76,-.33).rotation.x=-.14;
      box(.065,.25,.065,metal,x,.68,.23);
      box(.14,.07,.72,wood,x,.825,-.035);
      for(const y of [.73,.88,1.03])ball(.019,'#d4c7a7',x,y,-.245-(y-.73)*.23);
    }
    box(1.36,.055,.06,metal,0,.25,-.23);
  } else if(p.id==='tree') {
    cyl(.065,.13,1.14,darkWood,0,.57,0,8);
    for(const [x,z] of [[-.18,.1],[.17,.12],[.03,-.2]])branch([x,.04,z],[0,.3,0],.05);
    const tips=[[-.25,1.34,.05],[.24,1.47,-.12],[.05,1.78,.06],[-.13,1.56,-.22],[.22,1.3,.2]];
    for(const [i,t] of tips.entries()) {
      branch([0,.72+i*.1,0],t,.045);
      const crown=box(1,1,1,['#97b66f','#b7c77d','#97b66f','#70965e','#b7c77d'][i],...t);
      crown.geometry.dispose();crown.geometry=new THREE.IcosahedronGeometry(.29,1);crown.scale.set(1,.72,.9);crown.rotation.y=i*.9;
      for(let j=0;j<5;j++) {
        const angle=j*Math.PI*2/5+i*.6;
        leaf(t[0]+Math.cos(angle)*.2,t[1]+.06+(j%2)*.09,t[2]+Math.sin(angle)*.18,.115,
          j%3===0?'#c9b577':i%2?'#b7c77d':'#97b66f',angle);
      }
    }
    for(const [x,z,a] of [[-.3,.23,.4],[.23,-.29,2],[.18,.3,1]])leaf(x,.015,z,.07,'#c9b577',a);
    g.scale.set(.78,1,.78); // Keep the layered canopy inside the original single-cell footprint.
  } else if(p.id==='flowers') {
    box(.76,.27,.64,darkWood,0,.16,0);box(.67,.03,.55,'#736345',0,.305,0);
    for(const z of [-.335,.335])for(let i=0;i<5;i++)box(.142,.29,.04,wood,-.304+i*.152,.18,z);
    for(const x of [-.39,.39])box(.04,.29,.68,wood,x,.18,0);
    for(const z of [-.345,.345])for(const y of [.11,.26])box(.8,.035,.025,darkWood,0,y,z);
    for(const x of [-.34,.34])for(const z of [-.29,.29])box(.05,.09,.05,metal,x,.035,z);
    for(const [i,[x,z]] of [[-.2,-.15],[.2,.15],[.15,-.18],[-.18,.17]].entries()) {
      const top=.56+(i%2)*.09;
      cyl(.013,.016,top-.3,metal,x,(top+.3)/2,z,6);
      for(const sign of [-1,1]){const l=ball(.08,'#70965e',x+sign*.055,top-.13,z);l.scale.set(1,.28,.5);l.rotation.z=sign*.45;}
      const color=['#e5b5ad','#ebd28d','#f7ecce','#d9adbc'][i];
      for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const petal=ball(.057,color,x+Math.cos(angle)*.064,top,z+Math.sin(angle)*.064);petal.scale.y=.48;}
      ball(.032,'#ebd28d',x,top+.023,z);
    }
  } else if(p.id==='lamp') {
    cyl(.17,.23,.12,metal,0,.07,0);cyl(.1,.14,.12,metal,0,.18,0);
    cyl(.045,.06,1.39,metal,0,.9,0);
    for(const y of [.29,1.47])cyl(.075,.075,.055,metal,0,y,0);
    cyl(.25,.18,.075,metal,0,1.56,0,4);
    warm(box(.245,.36,.245,'#ffe1a0',0,1.77,0));
    for(const x of [-.14,.14])for(const z of [-.14,.14])box(.025,.4,.025,metal,x,1.77,z);
    box(.32,.055,.32,metal,0,1.98,0);cyl(0,.3,.23,metal,0,2.12,0,4);ball(.045,metal,0,2.265,0);
  } else if(p.id==='laundry') {
    for(const x of [-.82,.82]) {
      cyl(.037,.05,1.65,darkWood,x,.83,0,8);cyl(.1,.14,.09,stone,x,.045,0);
      box(.07,.065,.47,wood,x,1.58,0);ball(.052,wood,x,1.685,0);
    }
    for(const z of [-.17,.17])box(1.65,.015,.015,'#d4c7a7',0,1.59,z);
    cloth(box(1,1,1,'#eae5ca',-.36,1.585,.17),.51,.64,.4);
    cloth(box(1,1,1,'#9eb4ba',.32,1.585,-.17),.45,.49,1.1);
    // Tiny stitched borders follow the lower cloth edge, not a rigid slab.
    for(const [x,y,z,w,phase,color] of [[-.36,.985,.17,.51,.4,'#d4c7a7'],[.32,1.135,-.17,.45,1.1,'#eae5ca']]) {
      for(let i=0;i<10;i++) {
        const t=(i+.5)/10, dz=.045*Math.sin(t*Math.PI*4+phase)*1.12;
        const hem=box(w/10+.003,.017,.013,color,x+(t-.5)*w,y-.025*Math.sin(t*Math.PI),z+dz+.012);
        hem.rotation.y=-Math.atan(.045*4*Math.PI*Math.cos(t*Math.PI*4+phase)*1.12/w);
      }
    }
    for(const [x,z] of [[-.56,.17],[-.16,.17],[.15,-.17],[.49,-.17]])box(.035,.1,.04,wood,x,1.59,z);
  } else if(p.id==='birdbath') {
    cyl(.22,.3,.13,'#b1b7a7',0,.075,0);cyl(.15,.19,.065,stone,0,.17,0);
    cyl(.075,.12,.37,stone,0,.38,0);cyl(.16,.08,.09,stone,0,.61,0);
    cyl(.4,.25,.12,stone,0,.7,0,24);cyl(.335,.335,.014,'#99c7c1',0,.769,0,24);
    // Continuous raised stone rim: closed ring, water recessed inside.
    const positions=[],n=24,profile=[[.335,.76],[.335,.81],[.4,.81],[.4,.76]];
    for(let i=0;i<n;i++)for(let j=0;j<4;j++) {
      const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,[r1,y1]=profile[j],[r2,y2]=profile[(j+1)%4];
      const points=[[r1*Math.cos(a),y1,r1*Math.sin(a)],[r1*Math.cos(b),y1,r1*Math.sin(b)],[r2*Math.cos(b),y2,r2*Math.sin(b)],[r2*Math.cos(a),y2,r2*Math.sin(a)]];
      for(const k of [0,1,2,0,2,3])positions.push(...points[k]);
    }
    surface(box(1,1,1,stone,0,0,0),positions);
    for(const [x,z] of [[-.13,.05],[.02,.13]]){const glint=box(.1,.003,.014,'#d9e6d5',x,.779,z);glint.rotation.y=-.4;}
  }
  return g;
}
export function buildYardPath(e, parent, exterior) {
  const color=EXTERIOR.path[exterior.path].color;
  for(let i=0;i<7;i++) e.box(1.4,.055,.39,color,0,.025,.1+i*.56,parent);
}
export function buildFence(e, parent) {
  for(const x of [-3.35,3.35]) {
    for(let z=0;z<4.4;z+=.7)e.box(.07,.65,.07,'#d5c6a5',x,.32,z,parent);
    for(const y of [.24,.5])e.box(.045,.055,4.3,'#d5c6a5',x,y,2.1,parent);
  }
}
