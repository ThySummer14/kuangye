import assert from 'node:assert/strict';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../app/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildExterior, buildLibrary, buildAtelier, buildWoodshop } from '../app/src/scenes/town-models.js';
import { mergeStatic } from '../app/src/scenes/world.js';
const materials = new Map();
const mesh = (geometry, color, x, y, z, parent) => {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color }));
  const m = new THREE.Mesh(geometry, materials.get(color)); m.position.set(x, y, z); parent.add(m); return m;
};
const e = {
  box: (w,h,d,c,x,y,z,p) => mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.12),c,x,y,z,p),
  ball: (r,c,x,y,z,p) => mesh(new THREE.SphereGeometry(r,12,8),c,x,y,z,p),
  cyl: (a,b,h,c,x,y,z,p,n=12) => mesh(new THREE.CylinderGeometry(a,b,h,n),c,x,y,z,p),
};
const scenarios = [];
for (const [i, wall] of ['cream','sage','rose'].entries()) for (const top of ['clay','moss','blue']) for (const porch of ['open','canopy'])
  scenarios.push([`house-${wall}-${top}-${porch}`, root => buildExterior(e,root,{wall,roof:top,door:['oak','green','blue'][i],porch},0,0)]);
for (let level = 0; level <= 3; level++) scenarios.push([`library-${level}`, root => buildLibrary(e,root,level)]);
scenarios.push(['atelier', root => buildAtelier(e,root)], ['woodshop', root => buildWoodshop(e,root)]);
const report = [];
for (const [name, build] of scenarios) {
  const root = new THREE.Group(); build(root);
  let triangles = 0, meshes = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    const attributes = o.geometry.attributes;
    for (const key of ['position','normal','uv']) {
      assert.ok(attributes[key], `${name}: missing ${key}`);
      for (const value of attributes[key].array) assert.ok(Number.isFinite(value), `${name}: invalid ${key}`);
    }
    triangles += (o.geometry.index?.count || attributes.position.count) / 3;
  });
  const before = new THREE.Box3().setFromObject(root, true);
  assert.ok(before.min.y >= -.001 && before.max.y <= 3.2, `${name}: unreasonable height`);
  assert.ok(before.min.x >= -2 && before.max.x <= 2 && before.min.z >= -1.6 && before.max.z <= 2.4, `${name}: building envelope`);
  assert.ok(triangles < 18000, `${name}: excessive geometry`);
  const merged = mergeStatic(root), after = new THREE.Box3().setFromObject(root, true);
  assert.equal(merged.reduce((sum,m) => sum + m.geometry.attributes.position.count/3,0), triangles, `${name}: lost geometry`);
  assert.ok(before.min.distanceTo(after.min) < .0001 && before.max.distanceTo(after.max) < .0001, `${name}: changed envelope after batching`);
  assert.ok(merged.length <= 32, `${name}: excessive material groups`);
  report.push({name,triangles,sourceMeshes:meshes,materialGroups:merged.length,size:before.getSize(new THREE.Vector3()).toArray().map(n=>+n.toFixed(3))});
  root.traverse(o => o.geometry?.dispose());
}
for (const material of materials.values()) material.dispose();
console.log(JSON.stringify({scenarios:report.length,finiteGeometry:'PASS',materialBatching:'PASS',envelopes:'PASS',priorHouseCanopyTriangles:30464,priorLibrary3Triangles:21644,models:report},null,2));
