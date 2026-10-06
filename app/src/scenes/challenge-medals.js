import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MEDAL_MOTIFS = ['breach', 'resolve', 'versatile', 'summit'];

// Original geometry built from docs/art/challenger-3d/concepts.png. Front is +Z.
// The model is independent from storage, rewards, the renderer and the DOM.
export function buildChallengeMedal(motif = 'summit') {
  if (!MEDAL_MOTIFS.includes(motif)) throw new Error('Unknown medal motif');
  const root = new THREE.Group();
  root.name = `challenge-medal-${motif}`;
  const materials = {
    armor: new THREE.MeshStandardMaterial({ color: '#303933', metalness: .86, roughness: .38 }),
    recess: new THREE.MeshStandardMaterial({ color: '#101716', metalness: .7, roughness: .5 }),
    silver: new THREE.MeshStandardMaterial({ color: '#aeb5bb', metalness: .92, roughness: .3 }),
    edge: new THREE.MeshStandardMaterial({ color: '#eff1e5', metalness: .95, roughness: .2 }),
    copper: new THREE.MeshStandardMaterial({ color: '#b66e30', metalness: .82, roughness: .27 }),
    ember: new THREE.MeshPhysicalMaterial({ color: '#f4660a', metalness: .12, roughness: .17, transmission: .18, thickness: .3, ior: 1.65, attenuationColor: '#ff730f', attenuationDistance: .7, clearcoat: 1, clearcoatRoughness: .1, emissive: '#e94b00', emissiveIntensity: .19, flatShading: true }),
    glow: new THREE.MeshStandardMaterial({ color: '#ff880f', metalness: .15, roughness: .23, emissive: '#ff7300', emissiveIntensity: .22 }),
  };
  Object.entries(materials).forEach(([name, m]) => { m.name = name; });
  const add = (geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.name = name || material;
    root.add(mesh);
    return mesh;
  };
  const outline = points => {
    const p = new THREE.Shape();
    points.forEach(([x,y], i) => i ? p.lineTo(x,y) : p.moveTo(x,y));
    p.closePath();
    return p;
  };
  const poly = (points, z, depth, material, holes = [], bevel = .026) => {
    const shape = outline(points);
    shape.holes = holes.map(outline);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 12 });
    geo.translate(0,0,z);
    return add(geo, material);
  };
  const scaled = (points, n) => points.map(([x,y]) => [x*n,y*n]);
  const mirror = points => points.map(([x,y])=>[-x,y]);
  const rotated = (points, a) => points.map(([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);
  function ring(points, scale, z, depth, material) { return poly(points,z,depth,material,[scaled(points,scale)]); }
  function bar(x1,y1,x2,y2,width,z,depth,mat) {
    const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=-dy/len*width/2,ny=dx/len*width/2;
    return poly([[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]],z,depth,mat,[],.008);
  }
  function screw(x,y,z) {
    const mesh=add(new THREE.CylinderGeometry(.075,.075,.045,12),'copper');
    mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);
    const socket=add(new THREE.CylinderGeometry(.045,.045,.05,6),'recess');
    socket.rotation.x=Math.PI/2;socket.position.set(x,y,z+.012);
    bar(x-.031,y,x+.031,y,.012,z+.04,.008,'silver');
  }
  // Faceted, solid surface with a raised ridge: every blade has a side and a back.
  function facet(points, center, z, height, material='silver') {
    const vertices=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      vertices.push(...a,z,...b,z,...center,z+height);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
    const mesh=add(geo,material);mesh.material.side=THREE.DoubleSide;
    poly(points,z-.06,.06,material,[],.008);
  }
  function crystal(points, center, z, height) {
    poly(scaled(points,1.12),z-.04,.08,'copper');
    facet(points,center,z+.07,height,'ember');
    const small=points.map(([x,y])=>[x*.62+center[0]*.38,y*.72+center[1]*.28]);
    facet(small,center,z+.1,height+.028,'glow');
  }
  const hex=[[0,1.62],[1.22,.88],[1.22,-.9],[0,-1.65],[-1.22,-.9],[-1.22,.88]];
  if(motif==='breach'){
    const chassis=[[.15,1.65],[1.22,1.02],[1.35,-.7],[-.2,-1.64],[-1.28,-.85],[-1.28,.75]];
    ring(chassis,.69,-.19,.22,'armor');ring(scaled(chassis,1.055),.978,-.1,.07,'copper');
    // A real opening, broken in two places; it is not a texture on a plate.
    const gate=[[-1.02,-1.07],[-1.02,.99],[.19,1.37],[.42,1.01],[-.64,.64],[-.64,-.7],[-.25,-.52],[-.5,-1.18]];
    poly(gate,.05,.25,'silver');poly(mirror(gate).map(([x,y])=>[x,-y]),.07,.25,'silver');
    poly([[-1.1,-.79],[-1.1,.9],[-1.04,.96],[-1.04,-.85]],.34,.035,'edge');
    const bolt=[[.82,1.84],[-.27,.3],[.03,.27],[-.9,-1.87],[.38,-.06],[.06,-.06]];
    poly(bolt,.35,.11,'copper');facet(scaled(bolt,.9),[.02,.07],.48,.17,'ember');
    bar(.71,1.6,-.12,.27,.026,.64,.008,'glow');bar(.18,-.08,-.68,-1.45,.027,.6,.008,'glow');
    for(const [x,y] of [[-1.17,.07],[1.19,-.05],[-.79,.82],[.85,-.83]])screw(x,y,.4);
    for(const side of [-1,1])for(let i=0;i<3;i++)bar(side*(.39+i*.15),side*1.27,side*(.62+i*.15),side*1.4,.045,.12,.07,'recess');
    [[-.95,-.71,-.68,-.35],[.71,.85,.84,.54],[-.82,.82,-.65,.55],[.7,-.83,.58,-.56]].forEach(a=>bar(...a,.025,.335,.005,'recess'));
  }else if(motif==='resolve'){
    const diamond=[[0,1.92],[1.35,0],[0,-1.92],[-1.35,0]];
    poly(diamond,-.22,.2,'armor');ring(scaled(diamond,1.04),.966,-.13,.08,'silver');ring(scaled(diamond,.9),.97,.015,.075,'copper');
    const shoulder=[[.88,.55],[1.45,.05],[1.39,-.36],[1.03,-.64],[.9,-.36]];
    for(const pts of [shoulder,mirror(shoulder)])poly(pts,.04,.14,'silver');
    // Flowing cut blades, faceted about their ridges to catch different light.
    const flame=[[0,1.66],[-.15,1.15],[.2,.65],[.32,.19],[.18,-.3],[.48,-.11],[.63,.3],[.43,.88]];
    facet(flame,[.17,.6],.21,.25);
    const plume=[[-.61,.91],[-.67,.36],[-.91,-.18],[-.82,-.57],[0,-1.45],[-.24,-.67],[-.53,-.25],[-.37,.26]];
    facet(plume,[-.64,-.24],.22,.22);facet(mirror(plume),[.64,-.24],.23,.22);
    const inner=[[-.26,.8],[-.44,.2],[-.5,-.34],[0,-1.27],[-.08,-.52],[-.21,-.08]];
    facet(inner,[-.3,-.25],.39,.16);facet(mirror(inner),[.3,-.25],.39,.16);
    crystal([[0,.71],[.36,-.01],[0,-.78],[-.36,-.01]],[0,-.05],.4,.38);
    for(const side of [-1,1])for(let i=0;i<3;i++)bar(side*1.08,.17-i*.14,side*1.25,.05-i*.14,.054,.212,.008,'recess');
    for(const [x,y] of [[-.68,.79],[.68,.79],[-.64,-.91],[.64,-.91]])screw(x,y,.26);
    bar(0,-1.47,0,-1.81,.024,.18,.014,'glow');
  }else if(motif==='versatile'){
    const frame=[[0,1.45],[.91,.85],[1.36,-.67],[.73,-1.2],[-.73,-1.2],[-1.36,-.67],[-.91,.85]];
    ring(frame,.83,-.19,.23,'armor');ring(scaled(frame,1.047),.979,-.08,.07,'copper');
    const torus=add(new THREE.TorusGeometry(.91,.043,8,64),'silver');torus.position.z=.08;
    for(let i=0;i<3;i++){
      const a=i*2*Math.PI/3;
      const blade=rotated([[0,1.96],[-.42,.77],[-.15,.39],[0,.51],[.19,.4],[.42,.77]],a);
      poly(blade,.12,.13,'armor');facet(scaled(blade,.96),rotated([[0,.98]],a)[0],.27,.3);
      const accent=rotated([[-.045,1.66],[.025,1.8],[.025,.62],[-.045,.56]],a);poly(accent,.47,.035,'copper');
      const strut=rotated([[-.18,-.76],[.18,-.76],[.22,-1.37],[0,-1.58],[-.22,-1.37]],a);
      poly(strut,.02,.14,'armor');const s=rotated([[0,-1.05]],a)[0];screw(...s,.22);
    }
    crystal([[0,.51],[-.45,-.28],[.45,-.28]],[0,-.01],.3,.33);
  }else{
    poly(hex,-.24,.18,'armor');ring(scaled(hex,1.05),.975,-.16,.08,'silver');ring(scaled(hex,.91),.971,-.035,.1,'copper');
    poly(scaled(hex,.76),.015,.14,'recess');ring(scaled(hex,.73),.93,.1,.09,'armor');
    for(const side of [-1,1]){
      const wing=[[.63,.1],[1.67,1.98],[1.5,1.03],[1.77,1.43],[1.59,.5],[1.76,.83],[1.55,-.17],[.88,-.78],[.88,-.02]];
      poly(wing.map(([x,y])=>[x*side,y]),.07,.16,'armor');
      const feather1=[[.64,.24],[1.67,1.98],[1.53,1.19],[1.12,.51],[1.18,.26],[1.55,.82],[1.4,.18],[.84,-.32],[.88,.12]];
      facet(feather1.map(([x,y])=>[x*side,y]),[1.21*side,.71],.25,.16);
      const feather2=[[.93,-.08],[1.7,.83],[1.53,.12],[1.15,-.21],[1.09,-.57]];
      facet(feather2.map(([x,y])=>[x*side,y]),[1.28*side,.11],.24,.12);
      bar(side*1.62,1.87,side*1.16,1.11,.029,.41,.015,'copper');
      bar(side*1.39,1.25,side*.96,.47,.009,.415,.006,'recess');
      bar(side*1.43,.34,side*1.13,-.09,.012,.385,.008,'recess');
      bar(side*.91,-.76,side*.91,-1.11,.056,.2,.05,'copper');
      bar(side*.91,-1.11,side*.4,-1.43,.06,.2,.05,'copper');
      screw(side*1.09,-.41,.27);screw(side*.83,.13,.51);
    }
    const peak=[[0,1.75],[.73,.32],[.53,.41],[0,1.38],[-.53,.41],[-.73,.32]];
    poly(peak,.18,.12,'copper');facet(scaled(peak,.93),[0,1.51],.32,.17);
    const peak2=[[0,1.27],[.49,.24],[.35,.33],[0,.96],[-.35,.33],[-.49,.24]];
    poly(peak2,.33,.13,'silver');
    const spear=[[0,.74],[.28,.29],[.28,-.66],[0,-1.1],[-.28,-.66],[-.28,.29]];
    poly(scaled(spear,1.24),.14,.2,'silver');crystal(spear,[0,-.12],.37,.32);
    facet([[-.34,-.87],[0,-1.14],[.34,-.87],[.27,-1.24],[0,-1.48],[-.27,-1.24]],[0,-1.3],.21,.19);
  }
  if(motif==='summit')ring(scaled(hex,.91),.982,-.281,.012,'copper');
  if(motif==='resolve')ring([[0,1.75],[1.19,0],[0,-1.75],[-1.19,0]],.982,-.26,.012,'copper');
  // Back face: inset serial plate, two hinge blocks, and a cylindrical safety pin.
  const back = poly([[-.52,.56],[.52,.56],[.58,-.53],[0,-.76],[-.58,-.53]],-.3,.05,'armor');
  back.name='backplate';
  for(const x of [-.43,.43]){
    const mount=add(new THREE.BoxGeometry(.15,.27,.16),'silver','pin-hinge');mount.position.set(x,.73,-.32);
  }
  const pin=add(new THREE.CylinderGeometry(.027,.027,.88,12),'silver','back-pin');pin.rotation.z=Math.PI/2;pin.position.set(0,.73,-.47);
  const clasp=add(new THREE.TorusGeometry(.073,.022,8,18,Math.PI*1.6),'copper','pin-clasp');clasp.position.set(-.46,.73,-.47);clasp.rotation.y=Math.PI/2;
  for(const x of [-.38,.38]){
    const rivet=add(new THREE.CylinderGeometry(.048,.048,.07,12),'copper','back-rivet');rivet.rotation.x=Math.PI/2;rivet.position.set(x,-.43,-.33);
  }
  root.userData={motif,hasBackPin:true,hasRealDepth:true};
  // Batch only static material groups. Preserve no stale temporary geometries.
  const buckets=new Map();
  root.updateMatrixWorld(true);
  for(const mesh of [...root.children]){
    mesh.updateMatrix();
    let g=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    g.applyMatrix4(mesh.matrix);g.deleteAttribute('uv');
    if(!buckets.has(mesh.material))buckets.set(mesh.material,[]);
    buckets.get(mesh.material).push(g);mesh.geometry.dispose();root.remove(mesh);
  }
  for(const [material,geometries] of buckets){
    const merged=mergeGeometries(geometries,false);
    geometries.forEach(g=>g.dispose());
    // Object-space UVs keep the brushed surface grain consistent across plates.
    const pos=merged.getAttribute('position'),uv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){uv[i*2]=pos.getX(i)*.5;uv[i*2+1]=pos.getY(i)*.5;}
    merged.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    const mesh=new THREE.Mesh(merged,material);mesh.name=material.name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  const used=new Set(root.children.map(m=>m.material));
  Object.values(materials).filter(m=>!used.has(m)).forEach(m=>m.dispose());
  return root;
}

export function disposeChallengeMedal(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
  materials.forEach(m=>Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);}));
  textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
}
