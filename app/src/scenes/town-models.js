import * as THREE from 'three';
import { EXTERIOR } from '../data/town.js';
import { yardFootprint } from '../game/town.js';
function warm(mesh, intensity = .7) { mesh.material.emissive.copy(mesh.material.color); mesh.material.emissiveIntensity = intensity; return mesh; }

// Pitched roof with a real gable, separate eaves, ridge caps and tile courses.
function cottageRoof(e, g, wall, color, width=3, depth=2.25, base=1.88, rise=.92) {
  // A triangular prism needs eight faces, not the full extrusion/triangulation pipeline.
  const points=[[-width/2,0,0],[width/2,0,0],[0,rise,0],[-width/2,0,depth],[width/2,0,depth],[0,rise,depth]];
  const indices=[0,2,1,3,4,5,0,1,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,4];
  const positions=indices.flatMap(i=>points[i]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(indices.flatMap(i=>[points[i][0]/width+.5,points[i][1]/rise]),2));
  geometry.computeVertexNormals();
  const face=e.box(1,1,1,wall,0,base,-depth/2,g);
  face.geometry.dispose();face.geometry=geometry;
  const run=width/2+.2, angle=Math.atan2(rise,run), slope=Math.hypot(run,rise);
  for(const sign of [-1,1]) {
    const panel=e.box(slope+.12,.12,depth+.45,color,sign*run/2,base+rise/2,0,g);panel.rotation.z=-sign*angle;
    for(let i=1;i<5;i++) {
      const t=i/5;
      const seam=e.box(.045,.035,depth+.46,color,sign*run*t,base+rise*(1-t)+.078,0,g);seam.rotation.z=-sign*angle;
    }
    for(let i=0;i<7;i++) {
      const joint=e.box(slope,.018,.02,color,sign*run/2,base+rise/2+.075,-depth/2-.15+i*(depth+.3)/6,g);joint.rotation.z=-sign*angle;
    }
    for(const z of [-depth/2-.24,depth/2+.24]) {
      const fascia=e.box(slope+.2,.14,.1,'#e4d2ac',sign*run/2,base+rise/2-.06,z,g);fascia.rotation.z=-sign*angle;
    }
    e.box(.12,.13,depth+.5,'#b29c77',sign*run,base-.015,0,g);
  }
  for(let i=0;i<8;i++)e.box(.21,.12,(depth+.5)/8-.012,color,0,base+rise+.07,-(depth+.5)/2+(i+.5)*(depth+.5)/8,g);
}

export function buildExterior(e, parent, exterior, x = 0, z = -2.1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const wall = EXTERIOR.wall[exterior.wall].color, roof = EXTERIOR.roof[exterior.roof].color;
  e.box(3, 1.85, 2.25, wall, 0, .96, 0, g);
  e.box(3.25, .16, 2.5, '#bdad8a', 0, .09, 0, g);
  cottageRoof(e,g,wall,roof);
  e.box(.6, 1.13, .08, EXTERIOR.door[exterior.door].color, 0, .67, 1.17, g);
  e.ball(.045, '#e4c889', .21, .65, 1.24, g);
  for (const wx of [-.94, .94]) {
    e.box(.65, .68, .1, '#faf0d4', wx, 1.13, 1.17, g);
    e.box(.53, .56, .12, '#9cc5c2', wx, 1.13, 1.22, g);
    e.box(.035, .57, .14, '#fff2d5', wx, 1.13, 1.27, g);
    e.box(.57, .035, .14, '#fff2d5', wx, 1.13, 1.27, g);
    e.box(.8, .13, .27, '#a57f57', wx, .74, 1.3, g);
  }
  // Recessed door panels, stone plinth, shutters and a planted window box.
  for(const y of [.43,.91])e.box(.44,.35,.035,'#b4b89a',0,y,1.224,g);
  for(const x of [-1.46,1.46])e.box(.13,1.82,.13,'#eee0bf',x,1,1.13,g);
  for(let i=0;i<7;i++)e.box(.39,.2,.07,i%2?'#b5aa92':'#c8bba2',-1.27+i*.42,.22,1.15,g);
  for(const wx of [-.94,.94]) {
    for(const sign of [-1,1])for(let i=0;i<5;i++)e.box(.17,.08,.06,EXTERIOR.door[exterior.door].color,wx+sign*.43,.91+i*.11,1.23,g);
    for(let i=0;i<4;i++) {
      e.ball(.09,'#829667',wx-.27+i*.18,.86,1.35,g);
      e.ball(.055,i%2?'#e7b39d':'#f0da98',wx-.27+i*.18,.94,1.35,g);
    }
  }
  e.box(.4,.92,.4,'#dfceb0',.95,2.52,-.4,g);
  for(const y of [2.26,2.5,2.74])e.box(.415,.03,.415,'#bda785',.95,y,-.4,g);
  e.box(.51,.12,.51,'#bca180',.95,3,-.4,g);
  e.box(.3,.015,.3,'#726650',.95,3.067,-.4,g);
  e.box(1.6, .15, .75, '#d1b58a', 0, .12, 1.49, g);
  if (exterior.porch === 'canopy') {
    for (const px of [-.83,.83]) e.box(.09, 1.55, .09, '#b39c74', px, .82, 1.93, g);
    e.box(1.95,.13,1.1,roof,0,1.63,1.59,g).rotation.x=.1;
  }
  return g;
}
export function buildYardItem(e, parent, p) {
  const size = yardFootprint(p.id,p.rotation), g = new THREE.Group();
  g.position.set(p.x - 3 + size.w/2, .03, p.z + size.d/2);
  g.rotation.y = -p.rotation * Math.PI / 180;
  g.userData.uid = p.id; parent.add(g);
  const box = (w,h,d,c,x,y,z) => e.box(w,h,d,c,x,y,z,g);
  const ball = (r,c,x,y,z) => e.ball(r,c,x,y,z,g);
  const cyl = (a,b,h,c,x,y,z,n=12) => e.cyl(a,b,h,c,x,y,z,g,n);
  if(p.id==='bench') {
    box(1.7,.13,.65,'#bc966b',0,.51,0); box(1.7,.42,.11,'#ba9262',0,.88,-.3);
    for(const x of [-.62,.62]) {box(.12,.48,.52,'#63725c',x,.25,0);box(.08,.5,.08,'#63725c',x,.68,-.31);}
  } else if(p.id==='tree') {
    cyl(.08,.13,1.1,'#98734d',0,.55,0);ball(.43,'#97b66f',0,1.35,0);ball(.34,'#b7c77d',.15,1.64,.04);ball(.3,'#70965e',-.21,1.4,.1);
  } else if(p.id==='flowers') {
    box(.8,.32,.68,'#b27d59',0,.17,0);box(.7,.04,.57,'#736345',0,.35,0);
    for(const [x,z,c] of [[-.2,-.15,'#e5b5ad'],[.2,.15,'#ebd28d'],[.15,-.18,'#f7ecce'],[-.18,.17,'#d9adbc']]) {
      cyl(.02,.02,.27,'#739166',x,.47,z);ball(.13,c,x,.62,z);
    }
  } else if(p.id==='lamp') {
    cyl(.17,.23,.12,'#68786a',0,.07,0);cyl(.045,.06,1.65,'#627362',0,.88,0);
    warm(box(.3,.4,.3,'#ffe1a0',0,1.76,0));cyl(0,.28,.23,'#657b67',0,2.07,0,4);
  } else if(p.id==='laundry') {
    for(const x of [-.8,.8]) {cyl(.035,.035,1.6,'#a28562',x,.8,0);box(.4,.07,.45,'#8b7a60',x,.06,0);}
    box(1.65,.025,.025,'#d4c7a7',0,1.52,0);
    box(.5,.61,.035,'#eae5ca',-.36,1.19,0);box(.48,.46,.035,'#9eb4ba',.35,1.26,0);
    for(const x of [-.54,-.17,.18,.51])box(.04,.12,.06,'#ae8661',x,1.5,0);
  } else {
    cyl(.21,.3,.15,'#b1b7a7',0,.08,0);cyl(.065,.12,.48,'#c5c8b5',0,.37,0);
    cyl(.4,.25,.16,'#c7cebb',0,.67,0);cyl(.33,.33,.015,'#99c7c1',0,.758,0,20);
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
export function buildLibrary(e, parent, level, x=0, z=0) {
  const g=new THREE.Group(); g.position.set(x,0,z); parent.add(g);
  const wall=level ? '#e6d8b5':'#b9b49a', roof=level===3?'#688b7d':'#87968a';
  e.box(3.4,.16,2.8,'#b8b09a',0,.09,0,g);
  e.box(3,1.8,2.3,wall,0,1,0,g);
  cottageRoof(e,g,wall,roof,3,2.3,1.92,.88);
  e.box(.76,1.26,.08,level?'#6e8e7d':'#8d8875',0,.73,1.18,g);
  for(const wx of [-1,1]) {
    e.box(.72,.78,.1,'#f3e7c8',wx,1.13,1.18,g);
    const window = e.box(.58,.65,.12,level===3?'#f8d48b':'#9dbeb7',wx,1.13,1.25,g);
    if(level===3)warm(window,.9);
    e.box(.04,.67,.14,'#f5e9c9',wx,1.13,1.31,g);
    if(!level) for(const y of [.95,1.3])e.box(.95,.13,.14,'#9a8565',wx,y,1.4,g).rotation.z=.15;
  }
  e.box(1.7,.29,.13,'#ece0b7',0,1.87,1.27,g);
  for(let i=0;i<3;i++) e.box(.12,.18,.04,['#899b79','#bf936c','#8eada6'][i],-.18+i*.18,1.89,1.36,g);
  if(!level) {
    for(let i=0;i<3;i++)e.box(.7,.12,.2,'#a08a67',-.6+i*.4,.2,1.6,g).rotation.y=.4+i*.3;
  }
  for(const x of [-1.46,1.46])e.box(.13,1.83,.13,'#d8c6a1',x,1,1.15,g);
  if(level>=2) {
    e.box(.75,.92,.38,'#a68960',-1.04,.48,1.55,g);
    for(const y of [.27,.59]) for(let i=0;i<5;i++)e.box(.075,.23,.2,['#aabe9b','#dab992','#8cacba'][i%3],-1.31+i*.13,y,1.68,g);
    e.box(1.22,.12,.48,'#bf9d73',.93,.48,1.65,g);
    for(const x of [.5,1.35])e.box(.09,.42,.35,'#776d55',x,.25,1.65,g);
  }
  if(level>=3) {
    for(const x of [-1.6,1.6])e.box(.08,1.8,.08,'#c6b087',x,.94,2,g);
    e.box(3.55,.12,1.08,'#709184',0,1.82,1.63,g);
    for(const x of [-1.32,1.32])warm(e.ball(.11,'#ffdf95',x,1.62,1.97,g),1.2);
    e.box(.8,.13,.65,'#cdb990',0,.14,1.53,g);
  }
  return g;
}
