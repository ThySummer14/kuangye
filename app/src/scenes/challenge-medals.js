import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const MEDAL_MOTIFS = ['breach', 'resolve', 'versatile', 'summit'];
// Six boundary landmarks of the original orthographic engraving atlas (1254²).
// Clockwise in the image, counter-clockwise in model space, starting at the tip.
const ATLAS_CORNERS = {
  breach: [[325,12],[46,173],[46,476],[325,640],[604,476],[604,173]],
  resolve: [[930,12],[651,174],[651,478],[930,640],[1208,478],[1208,174]],
  versatile: [[324,621],[47,781],[46,1075],[324,1235],[604,1075],[604,781]],
  summit: [[930,620],[651,781],[651,1075],[930,1235],[1208,1075],[1208,781]],
};
const hex = (radius) => Array.from({length:6},(_,i)=>{
  const a=Math.PI/2+i*Math.PI/3;return [Math.cos(a)*radius,Math.sin(a)*radius];
});
function polygon(points) {
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return shape;
}

// The face is a sampled die relief: 55,296 triangles, not a flat image plane.
// Artwork supplies fine engraving; its luminance supplies actual shallow height.
// Independent solid rim, reeds, reverse and working pin supply the object structure.
function engravedFace(motif,sampleEngraving) {
  const corners=ATLAS_CORNERS[motif].map(([x,y])=>[x/1254,1-y/1254]);
  const center=[corners.reduce((s,p)=>s+p[0],0)/6,corners.reduce((s,p)=>s+p[1],0)/6];
  const edge=hex(1.974),positions=[],uvs=[],indices=[],n=96;
  for(let side=0;side<6;side++){
    const a=edge[side],b=edge[(side+1)%6],ta=corners[side],tb=corners[(side+1)%6],rows=[];
    for(let i=0;i<=n;i++){
      rows[i]=[];
      for(let j=0;j<=n-i;j++){
        const wa=i/n,wb=j/n,wc=1-wa-wb;
        const x=a[0]*wa+b[0]*wb,y=a[1]*wa+b[1]*wb;
        const u=ta[0]*wa+tb[0]*wb+center[0]*wc,v=ta[1]*wa+tb[1]*wb+center[1]*wc;
        // Ease the outer shoulder into the milled rim; no disconnected relief edges.
        const shoulder=THREE.MathUtils.smoothstep(wc,0,.035);
        const engraving=THREE.MathUtils.clamp(sampleEngraving?.(u,v)??0,0,1);
        const z=.076+shoulder*(.012+engraving*.036);
        rows[i][j]=positions.length/3;positions.push(x,y,z);uvs.push(u,v);
      }
    }
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      indices.push(rows[i][j],rows[i+1][j],rows[i][j+1]);
      if(j<n-i-1)indices.push(rows[i+1][j],rows[i+1][j+1],rows[i][j+1]);
    }
  }
  const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));raw.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));raw.setIndex(indices);
  const geometry=mergeVertices(raw,.00001);raw.dispose();geometry.computeVertexNormals();return geometry;
}

export function buildChallengeMedal(motif='summit',{sampleEngraving,artwork}={}) {
  if(!MEDAL_MOTIFS.includes(motif))throw new Error('Unknown medal motif');
  const root=new THREE.Group();root.name=`challenge-medal-${motif}`;
  const materials={
    armor:new THREE.MeshStandardMaterial({color:'#34434b',metalness:.85,roughness:.36}),
    edge:new THREE.MeshStandardMaterial({color:'#d5c6a7',metalness:.86,roughness:.27}),
    silver:new THREE.MeshStandardMaterial({color:'#b7c2c5',metalness:.88,roughness:.3}),
    copper:new THREE.MeshStandardMaterial({color:'#9b8964',metalness:.85,roughness:.4}),
  };
  Object.entries(materials).forEach(([name,m])=>{m.name=name;});
  const buckets=new Map();
  function add(geometry,name){if(!buckets.has(name))buckets.set(name,[]);buckets.get(name).push(geometry);}
  function plate(points,z,depth,material,bevel=.009,holes=[]){
    const s=polygon(points);s.holes=holes.map(polygon);
    const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,steps:1});g.translate(0,0,z);add(g,material);
  }
  function disk(x,y,r,z,depth,name,n=40){const g=new THREE.CylinderGeometry(r,r,depth,n);g.rotateX(Math.PI/2);g.translate(x,y,z);add(g,name);}
  function line(a,b,r,z,name){
    const path=new THREE.LineCurve3(new THREE.Vector3(...a,z),new THREE.Vector3(...b,z));
    add(new THREE.TubeGeometry(path,1,r,6,false),name);
  }
  function ring(r,z,name,tube=.005){const g=new THREE.TorusGeometry(r,tube,6,160);g.translate(0,0,z);add(g,name);}
  const outline=hex(2);
  plate(outline,-.13,.19,'armor',.018);
  plate(hex(2.009),.048,.018,'edge',.012,[hex(1.97)]);
  // A small maker's shield closes the pointed crown above the illustrated field.
  plate([[-.105,1.89],[0,1.995],[.105,1.89],[0,1.82]],.13,.012,'edge',.004);
  plate([[-.061,1.889],[0,1.951],[.061,1.889],[0,1.845]],.146,.003,'armor',.001);
  // Two seams on the edge and 240 individual milled grooves remain visible side-on.
  plate(hex(2.027),-.102,.012,'copper',.004,[hex(1.978)]);
  plate(hex(2.027),-.031,.012,'silver',.004,[hex(1.978)]);
  for(let edge=0;edge<6;edge++){
    const a=outline[edge],b=outline[(edge+1)%6],angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
    for(let i=1;i<=40;i++){
      const f=i/41,g=new THREE.BoxGeometry(.008,.025,.064);
      g.rotateZ(angle);g.translate((a[0]+(b[0]-a[0])*f)*1.014,(a[1]+(b[1]-a[1])*f)*1.014,-.05);add(g,'copper');
    }
  }
  // The reverse is its own machined composition, with a mounting plate and clasp.
  plate(hex(1.83),-.156,.018,'copper',.005,[hex(1.813)]);
  plate(hex(1.76),-.158,.016,'silver',.003,[hex(1.752)]);
  for(const r of [.82,.855,.965])ring(r,-.159,r===.855?'silver':'copper');
  for(let i=0;i<96;i++){
    const a=i*Math.PI/48,r=i%8?.888:.872;
    line([Math.cos(a)*r,Math.sin(a)*r],[Math.cos(a)*.94,Math.sin(a)*.94],i%8?.0025:.004,-.163,'copper');
  }
  for(const x of [-.54,.54]){
    disk(x,.69,.082,-.19,.11,'armor');disk(x,.69,.05,-.247,.018,'edge');
    line([x-.027,.69],[x+.027,.69],.004,-.259,'copper');
  }
  const pin=new THREE.CylinderGeometry(.017,.017,1.16,24);pin.rotateZ(Math.PI/2);pin.translate(0,.69,-.282);add(pin,'silver');
  const clasp=new THREE.TorusGeometry(.059,.011,10,48,Math.PI*1.7);clasp.rotateY(Math.PI/2);clasp.translate(-.55,.69,-.278);add(clasp,'edge');
  // The edition number also has a tangible indexing mark below the inscription.
  const ordinal=MEDAL_MOTIFS.indexOf(motif)+1;
  for(let i=0;i<ordinal;i++)line([(i-(ordinal-1)/2)*.1,-1.28],[(i-(ordinal-1)/2)*.1,-1.12],.007,-.159,'edge');
  for(const [name,parts] of buckets){
    const flat=parts.map(g=>{const f=g.index?g.toNonIndexed():g.clone();f.deleteAttribute('uv');g.dispose();return f;});
    const merged=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());
    const p=merged.getAttribute('position'),uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)*.5;uv[i*2+1]=p.getY(i)*.5;}
    merged.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    const mesh=new THREE.Mesh(merged,materials[name]);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  const faceMaterial=new THREE.MeshStandardMaterial({map:artwork??null,color:artwork?'#ffffff':'#244252',metalness:.42,roughness:.48,envMapIntensity:.6});faceMaterial.name='engraving';
  const face=new THREE.Mesh(engravedFace(motif,sampleEngraving),faceMaterial);face.name='engraved-face';face.castShadow=true;face.receiveShadow=true;root.add(face);
  root.userData={motif,hasBackPin:true,hasRealDepth:true,design:'engraved-relief-v3',relief:'original-artwork-heightfield'};
  return root;
}

export function disposeChallengeMedal(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
  materials.forEach(m=>Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);}));
  textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
}
