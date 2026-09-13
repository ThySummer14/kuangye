import * as THREE from "three";
export function createAtmosphere(engine, room) {
  const group = new THREE.Group();
  group.userData.dynamic = true;
  engine.world.add(group);
  let kind = "clear",
    day = 1;
  const particles = [];
  const material = new THREE.MeshBasicMaterial({
    color: "#d7e8f2",
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  for (let i = 0; i < 70; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), material);
    p.position.set(
      (Math.random() - 0.5) * (room.w + 6),
      Math.random() * 5,
      -room.d / 2 - 1 - Math.random() * 3,
    );
    group.add(p);
    particles.push(p);
  }
  const clouds = new THREE.Group();
  group.add(clouds);
  const cloudMat = new THREE.MeshBasicMaterial({ color: "#dce5e1" });
  for (let j = 0; j < 3; j++) {
    const c = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), cloudMat);
      s.position.set(i * 0.38, Math.sin(i) * 0.15, 0);
      s.scale.set(1.2, 0.6, 0.7);
      c.add(s);
    }
    c.position.set(-room.w / 2 + j * 3, 3.5, -room.d / 2 - 1.5);
    clouds.add(c);
  }
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 24, 16),
    new THREE.MeshBasicMaterial({ color: "#fff1bc" }),
  );
  moon.position.set(room.w / 2 - 1, 4, -room.d / 2 - 2);
  group.add(moon);
  const frost = new THREE.Mesh(
    new THREE.BoxGeometry(room.w, 0.012, 0.2),
    new THREE.MeshBasicMaterial({
      color: "#e3f2ef",
      transparent: true,
      opacity: 0.75,
    }),
  );
  frost.position.set(0, 0.94, -room.d / 2);
  group.add(frost);
  const warmLamp = new THREE.PointLight("#ffdaa0", 0, 12, 1.5);
  warmLamp.position.set(room.w / 2 - 1.5, 2.2, -room.d / 2 + 1);
  group.add(warmLamp);
  let previous = 0;
  return {
    set(v) {
      kind = v.weather;
      day = v.day;
      warmLamp.intensity = (1 - day) * 3;
      engine.setDaylight(kind === "moon" ? 0 : day, v.hour, kind);
    },
    tick(t) {
      const dt = Math.min(0.05, (t - previous) / 1000 || 0.016);
      previous = t;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      moon.visible = kind === "moon" || day < 0.15;
      clouds.visible = ["cloud", "rain", "snow", "wind"].includes(kind);
      frost.visible = kind === "frost";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.visible = ["rain", "snow", "wind"].includes(kind);
        p.scale.set(
          kind === "rain" ? 0.45 : kind === "wind" ? 3 : 1,
          kind === "rain" ? 5 : 1,
          1,
        );
        if (!reduced) {
          p.position.y -=
            dt * (kind === "rain" ? 4 : kind === "wind" ? 0.3 : 0.65);
          p.position.x +=
            dt * (kind === "wind" ? 1.5 : Math.sin(t * 0.001 + i) * 0.15);
          if (p.position.y < 0) p.position.y = 5;
          if (p.position.x > room.w / 2 + 3) p.position.x = -room.w / 2 - 3;
        }
      }
      if (!reduced) clouds.position.x = Math.sin(t * 0.00015) * 0.6;
    },
    dispose() {
      group.removeFromParent();
      group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
