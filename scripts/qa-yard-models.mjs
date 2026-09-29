import assert from 'node:assert/strict';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../app/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildYardItem } from '../app/src/scenes/town-models.js';
import { mergeStatic } from '../app/src/scenes/world.js';
import { YARD_ITEMS } from '../app/src/data/town.js';
import { yardFootprint } from '../app/src/game/town.js';
const mats=new Map();
const mesh=(geo,c,x,y,z,p)=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c}));const m=new THREE.Mesh(geo,mats.get(c));m.position.set(x,y,z);p.add(m);return m;};
const e={box:(w,h,d,c,x,y,z,p)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.12),c,x,y,z,p),ball:(r,c,x,y,z,p)=>mesh(new THREE.SphereGeometry(r,12,8),c,x,y,z,p),cyl:(a,b,h,c,x,y,z,p,n=12)=>mesh(new THREE.CylinderGeometry(a,b,h,n),c,x,y,z,p)};
const report=[];
for(const item of YARD_ITEMS)for(const rotation of [0,90,180,270]) {
 const root=new THREE.Group(), g=buildYardItem(e,root,{id:item.id,x:0,z:0,rotation});
 const size=yardFootprint(item.id,rotation), bounds=new THREE.Box3().setFromObject(g);
 assert.ok(bounds.min.x>=-3-.001 && bounds.max.x<=-3+size.w+.001 && bounds.min.z>=-.001 && bounds.max.z<=size.d+.001,`${item.id}/${rotation}: outside footprint ${JSON.stringify(bounds)}`);
 let triangles=0;g.traverse(o=>{if(o.isMesh){const geo=o.geometry;for(const value of geo.attributes.position.array)assert.ok(Number.isFinite(value));triangles+=(geo.index?.count||geo.attributes.position.count)/3;}});
 const merged=mergeStatic(root);assert.ok(merged.length>0);
 assert.equal(merged.reduce((sum,m)=>sum+m.geometry.attributes.position.count/3,0),triangles,'merge lost surfaces');
 if(rotation===0)report.push({id:item.id,triangles,mergedMeshes:merged.length,height:+(bounds.max.y-bounds.min.y).toFixed(3)});
 root.traverse(o=>o.geometry?.dispose());
}
for(const m of mats.values())m.dispose();
console.log(JSON.stringify({rotationsChecked:24,footprints:'PASS',finiteGeometry:'PASS',materialBatching:'PASS',totalTriangles:report.reduce((sum,m)=>sum+m.triangles,0),models:report},null,2));
