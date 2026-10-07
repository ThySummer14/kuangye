import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildChallengeMedal, disposeChallengeMedal } from './challenge-medals.js';

import { MEDAL_ASSETS } from '../data/challenge-medal-assets.js';
const artworkSources=new Map();
function loadArtwork(motif) {
  const asset=MEDAL_ASSETS[motif];
  if(!asset)throw new Error('Unknown medal motif');
  const key=asset.artwork;
  if(!artworkSources.has(key)){
    if(artworkSources.size>=3)artworkSources.delete(artworkSources.keys().next().value);
    artworkSources.set(key,new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,image.width,image.height).data;
        // Bilinear samples prevent pixel-sized spikes in the physical relief.
        const value=(x,y)=>{const i=(y*image.width+x)*4;return (.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])/255;};
        const sample=(u,v)=>{
          const x=THREE.MathUtils.clamp(u*(image.width-1),0,image.width-2),y=THREE.MathUtils.clamp((1-v)*(image.height-1),0,image.height-2),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
          return THREE.MathUtils.lerp(THREE.MathUtils.lerp(value(ix,iy),value(ix+1,iy),fx),THREE.MathUtils.lerp(value(ix,iy+1),value(ix+1,iy+1),fx),fy);
        };
        let faceCorners;
        if(asset.series==='LC'){
          // Find the opaque medal boundary; ignore faint transparent edge halos.
          let left=image.width,right=0,top=image.height,bottom=0;
          for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>230){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          if(right<=left||bottom<=top)throw new Error('Empty medal artwork');
          const cx=(left+right)/2,h=bottom-top;
          faceCorners=[[cx,top],[left,top+h*.25],[left,bottom-h*.25],[cx,bottom],[right,bottom-h*.25],[right,top+h*.25]].map(([x,y])=>[x/image.width,1-y/image.height]);
        }
        resolve({image,sample,faceCorners});
      }catch(error){reject(error);}
    };
    image.onerror=()=>reject(new Error('Medal artwork could not be loaded'));
    image.src=`${import.meta.env.BASE_URL}${key}`;
  }).catch(error=>{artworkSources.delete(key);throw error;}));
  }
  return artworkSources.get(key);
}

function studioEnvironment() {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#101515');
  for(const [w,h,pos,color,intensity] of [
    [3,6,[-3,1,5],'#f8e5c8',4], [1.3,5,[4,1,2],'#bdd8ff',3],
    [3,5,[-2,1,-5],'#f5f1de',3], [4,2,[0,4,-3],'#ffffff',5], [2,3,[-4,-2,-3],'#d59b57',2],
  ]){
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity)});
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);panel.position.fromArray(pos);panel.lookAt(0,0,0);scene.add(panel);
  }
  return scene;
}
function grainTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#999';ctx.fillRect(0,0,256,256);
  let seed=437;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<2500;i++){
    const v=Math.round(100+random()*100);ctx.strokeStyle=`rgb(${v},${v},${v})`;ctx.lineWidth=.35;
    const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*48+4,y+.3);ctx.stroke();
  }
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
}
function backInscription(motif) {
  const asset=MEDAL_ASSETS[motif],n=String(asset.ordinal).padStart(2,'0');
  const c=document.createElement('canvas');c.width=512;c.height=512;
  const x=c.getContext('2d');x.clearRect(0,0,512,512);x.textAlign='center';
  x.strokeStyle='#a49471';x.lineWidth=2;x.strokeRect(50,48,412,370);
  x.fillStyle='#e0ce9c';x.font='22px monospace';x.fillText(asset.series==='LC'?'THE LONG WAY':'THE CHALLENGER',256,107);
  x.font='bold 104px monospace';x.fillText(n,256,227);
  x.font='20px monospace';x.fillText('ON YOUR TERMS.',256,289);
  x.font='17px monospace';x.fillText(`KY / ${asset.series}-${n}`,256,344);
  for(let i=0;i<27;i++)x.fillRect(137+i*9,373, i%3===0 ? 4:1,18);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.93,.93),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.6,metalness:.15,emissive:'#7f724d',emissiveIntensity:.2,depthWrite:false}));
  m.rotation.y=Math.PI;m.position.set(0,-.005,-.157);m.name='reverse-inscription';return m;
}

export async function createMedalViewer(host,{motif='summit',autoRotate=false,onInteraction=()=>{},onError=()=>{},onChange=()=>{},capture=false,signal}={}) {
  const source=await loadArtwork(motif);
  if(signal?.aborted)throw new DOMException('Medal viewer closed','AbortError');
  let renderer,controls,environment,observer,intersection,model,raf=0,disposed=false,last=0,visible=true;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,40);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let spinning=autoRotate&&!reduced.matches;
  const light=new THREE.DirectionalLight('#fff1da',1.6);light.position.set(-3,4,6);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});light.shadow.normalBias=.002;light.shadow.bias=-.00015;scene.add(light);
  const rim=new THREE.DirectionalLight('#c6e0ff',2.2);rim.position.set(4,1,-2);scene.add(rim);
  const fill=new THREE.DirectionalLight('#fff2dd',.6);fill.position.set(0,-3,5);scene.add(fill);
  const reverse=new THREE.DirectionalLight('#e9e4d4',2.3);reverse.position.set(-2,3,-5);scene.add(reverse);
  scene.add(new THREE.HemisphereLight('#e8efff','#24251c',.65));
  function draw(){if(!disposed)renderer.render(scene,camera);}
  function describe(){
    host.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');
    host.dataset.zoom=(camera.position.length()).toFixed(3);
    onChange({spinning});
  }
  function changed(){describe();draw();}
  function frame(now){
    raf=0;if(disposed||!visible||document.hidden||!spinning)return;
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    const p=new THREE.Spherical().setFromVector3(camera.position);p.theta+=dt*.22;camera.position.setFromSpherical(p);controls.update();
    raf=requestAnimationFrame(frame);
  }
  function schedule(){cancelAnimationFrame(raf);raf=0;last=0;if(spinning&&visible&&!document.hidden&&!disposed)raf=requestAnimationFrame(frame);}
  function spin(value){spinning=!!value;describe();schedule();}
  function interaction(){if(spinning)spin(false);onInteraction();}
  function motionChanged(){if(reduced.matches)spin(false);}
  function lost(event){event.preventDefault();if(!disposed){spin(false);onError();}}
  function resize(){
    const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);draw();
  }
  function pose(side='front'){
    spin(false);const distance=camera.aspect<.9?9.15:7.8;
    camera.position.set(side==='back'?-.22:.32,.16,side==='back'?-distance:distance);controls.target.set(0,.03,0);controls.update();changed();
  }
  function orbit(x,y=0){interaction();const p=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));p.theta+=x;p.phi=THREE.MathUtils.clamp(p.phi+y,.16,Math.PI-.16);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(p));controls.update();changed();}
  function zoom(factor){interaction();const direction=camera.position.clone().sub(controls.target);direction.setLength(THREE.MathUtils.clamp(direction.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(direction);controls.update();changed();}
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();intersection?.disconnect();
    document.removeEventListener('visibilitychange',schedule);reduced.removeEventListener('change',motionChanged);
    if(renderer){renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('pointerdown',interaction);}
    controls?.dispose();if(model)disposeChallengeMedal(model);environment?.dispose();light.shadow.map?.dispose();scene.clear();
    if(renderer){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
    delete host.dataset.ready;
  }
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:capture,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
    renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
    const pmrem=new THREE.PMREMGenerator(renderer),room=studioEnvironment();
    try{environment=pmrem.fromScene(room,.04);}finally{room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});room.clear();pmrem.dispose();}
    scene.environment=environment.texture;scene.environmentIntensity=1.05;
    const artwork=new THREE.Texture(source.image);artwork.colorSpace=THREE.SRGBColorSpace;artwork.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());artwork.needsUpdate=true;
    model=buildChallengeMedal(motif,{artwork,sampleEngraving:source.sample,faceCorners:source.faceCorners});model.add(backInscription(motif));scene.add(model);
    const grain=grainTexture();model.traverse(o=>{if(o.isMesh&&['silver','edge','armor','copper'].includes(o.material.name)){o.material.bumpMap=grain;o.material.bumpScale=.0012;o.material.needsUpdate=true;}});
    controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=false;controls.minDistance=4.7;controls.maxDistance=12;controls.minPolarAngle=.16;controls.maxPolarAngle=Math.PI-.16;controls.rotateSpeed=.7;controls.zoomSpeed=.65;
    controls.addEventListener('change',changed);
    renderer.domElement.addEventListener('pointerdown',interaction);
    renderer.domElement.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',motionChanged);
    observer=new ResizeObserver(resize);observer.observe(host);
    intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();});intersection.observe(host);
    resize();pose();spin(autoRotate&&!reduced.matches);host.dataset.ready='true';
    return {dispose,pose,orbit,zoom,spin,draw,capture:(format='image/png',quality)=>{draw();return renderer.domElement.toDataURL(format,quality);}};
  }catch(error){dispose();throw error;}
}
