import * as THREE from 'three';
// Render only the supplied visit/display facts; no rewards or task rules here.
export function buildResidentCorner(e, parent, displayed, visitor) {
  const corner = new THREE.Group(); parent.add(corner);
  const box = (w,h,d,c,x,y,z,p=corner) => {
    const m=e.box(w,h,d,c,x,y,z,p);
    m.geometry.dispose(); m.geometry=new THREE.BoxGeometry(w,h,d);
    return m;
  };
  if (displayed) {
    for (const x of [1.84,2.28]) box(.055,1.12,.055,'#a38762',x,.56,1.22);
    box(.66,.62,.065,'#bc9d74',2.06,.99,1.22);
    box(.51,.44,.02,'#fff2d6',2.06,1.01,1.267).rotation.z=-.06;
    box(.055,.08,.04,'#6b7e60',2.07,1.25,1.28);
    box(.21,.14,.012,'#92aa87',1.97,1.055,1.289);
    for (const y of [.94,.895]) box(.27,.014,.012,'#c3b493',2.095,y,1.291);
  }
  if (visitor) {
    const person=new THREE.Group();person.position.set(-2.03,0,1.5);person.rotation.y=.35;corner.add(person);
    for (const x of [-.09,.09]) { box(.12,.35,.15,'#666d5a',x,.225,0,person);box(.14,.075,.23,'#5e604f',x,.045,.045,person); }
    e.cyl(.15,.2,.41,'#829a73',0,.605,0,person,10);
    e.ball(.18,'#f0d5b6',0,.99,0,person);
    const hair=e.ball(.185,'#555e4c',0,1.07,-.025,person);hair.scale.set(1,.68,1);
    for(const x of [-.065,.065]) e.ball(.012,'#565d4b',x,1.005,.164,person);
    box(.29,.19,.035,'#f6e8c9',0,.655,.19,person).rotation.z=-.1;
    for(const x of [-.16,.16]) {const arm=box(.075,.29,.09,'#829a73',x,.69,.09,person);arm.rotation.z=-x; e.ball(.052,'#f0d5b6',x,.565,.17,person);}
  }
  return corner;
}
