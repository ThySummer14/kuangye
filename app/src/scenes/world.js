import { paintEye } from "./face-paint.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { EXPRESSIONS, springStep } from "../game/emotions.js";

// Batch static meshes while leaving animated characters and picking surfaces independent.
export function mergeStatic(root, keep = [], perPoi = false) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(),
    buckets = new Map(),
    original = [];
  root.traverse((o) => {
    if (!o.isMesh || keep.includes(o)) return;
    let p = o;
    while (p) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    const key = o.material.uuid + ":" + (perPoi ? o.userData.poi || "" : "");
    if (!buckets.has(key))
      buckets.set(key, {
        geometry: [],
        material: o.material,
        poi: o.userData.poi,
      });
    let geometry = o.geometry.clone();
    // Rounded boxes are non-indexed; spheres and tubes are indexed. Normalize
    // before batching so one detailed model cannot make a material group vanish.
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    buckets.get(key).geometry.push(geometry);
    original.push(o);
  });
  for (const o of original) {
    o.removeFromParent();
    o.geometry.dispose();
  }
  const meshes = [];
  for (const b of buckets.values()) {
    const geometry = mergeGeometries(b.geometry, false);
    b.geometry.forEach((g) => g.dispose());
    if (!geometry) continue;
    const m = new THREE.Mesh(geometry, b.material);
    m.castShadow = true;
    m.receiveShadow = true;
    if (perPoi && b.poi) m.userData.poi = b.poi;
    root.add(m);
    meshes.push(m);
  }
  return meshes;
}

export function createWorld(
  el,
  {
    onNavigate,
    onPick,
    onCell,
    onPet,
    onReady,
    getMood = () => "idle",
    mode = "map",
  } = {},
) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2),
  );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  let angle = 0.73,
    distance = 18,
    elevation = 11;
  const target = new THREE.Vector3(0, 0.1, 0);
  const world = new THREE.Group();
  scene.add(world);
  const mats = new Map();
  function mat(color) {
    if (!mats.has(color))
      mats.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.88 }),
      );
    return mats.get(color);
  }
  function mesh(geometry, color, x = 0, y = 0, z = 0, parent = world) {
    const m = new THREE.Mesh(geometry, mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, c, x, y, z, p) {
    return mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.12),
      c,
      x,
      y,
      z,
      p,
    );
  }
  function ball(r, c, x, y, z, p) {
    return mesh(new THREE.SphereGeometry(r, 12, 8), c, x, y, z, p);
  }
  function cyl(r1, r2, h, c, x, y, z, p, n = 12) {
    return mesh(new THREE.CylinderGeometry(r1, r2, h, n), c, x, y, z, p);
  }
  scene.add(new THREE.HemisphereLight("#f6fcff", "#98a775", 2.1));
  const sun = new THREE.DirectionalLight("#fff0d3", 2.6);
  sun.position.set(-4, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const pois = [],
    interactables = [],
    animated = [];
  function poi(id, x, z, y = 1.5) {
    pois.push({ id, point: new THREE.Vector3(x, y, z) });
  }
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    world.add(g);
    cyl(0.12, 0.19, 1.1, "#876044", 0, 0.45, 0, g, 6);
    ball(0.67, "#69a96f", 0, 1.35, 0, g);
    ball(0.53, "#85b977", 0.34, 1.66, 0.05, g);
    ball(0.5, "#579c70", -0.36, 1.45, 0.1, g);
  }
  function pine(x, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    world.add(g);
    cyl(0.09, 0.14, 0.65, "#846245", 0, 0.25, 0, g, 6);
    cyl(0, 0.7, 1.35, "#448b72", 0, 0.95, 0, g, 7);
    cyl(0, 0.52, 1.15, "#5fa17c", 0, 1.65, 0, g, 7);
  }
  function building(id, x, z, kind) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    world.add(g);
    if (kind === "home") {
      box(1.9, 1.5, 1.65, "#fff2ce", 0, 0.8, 0, g);
      const roof = cyl(0, 1.75, 1.05, "#c77553", 0, 2.05, 0, g, 4);
      roof.rotation.y = Math.PI / 4;
      box(0.45, 0.9, 0.07, "#8a664b", 0.38, 0.5, 0.86, g);
      box(0.48, 0.52, 0.08, "#93cbd0", -0.47, 1, 0.86, g);
      box(0.57, 0.06, 0.13, "#fff3d9", -0.47, 1, 0.92, g);
      box(0.05, 0.54, 0.13, "#fff3d9", -0.47, 1, 0.92, g);
      box(0.32, 0.83, 0.33, "#eedabd", 0.6, 2.05, -0.35, g);
      box(2.2, 0.12, 0.65, "#d8b68a", 0, 0.04, 1.1, g);
      for (let i = 0; i < 4; i++)
        box(0.08, 0.44, 0.08, "#fff3d6", -1.3 + i * 0.31, 0.22, 1.5, g);
      box(1.04, 0.07, 0.07, "#fff3d6", -0.84, 0.32, 1.5, g);
    } else if (kind === "shop") {
      box(2, 0.65, 1.05, "#ae7951", 0, 0.34, 0, g);
      for (const a of [-0.9, 0.9])
        for (const b of [-0.45, 0.45])
          box(0.07, 1.7, 0.07, "#805e43", a, 0.86, b, g);
      for (let i = 0; i < 6; i++) {
        const roof = box(
          0.38,
          0.13,
          1.65,
          i % 2 ? "#fff1d5" : "#dfaa51",
          -0.95 + i * 0.38,
          1.75,
          0,
          g,
        );
        roof.rotation.x = 0.1;
        box(
          0.38,
          0.27,
          0.06,
          i % 2 ? "#fff1d5" : "#dfaa51",
          -0.95 + i * 0.38,
          1.57,
          0.81,
          g,
        );
      }
      for (let i = 0; i < 3; i++) {
        cyl(0.15, 0.12, 0.22, "#b96e50", -0.6 + i * 0.55, 0.78, 0.05, g);
        ball(0.23, "#6d9e69", -0.6 + i * 0.55, 1.03, 0.05, g);
      }
    } else if (kind === "tasks") {
      for (const a of [-0.7, 0.7])
        box(0.12, 1.65, 0.12, "#86674f", a, 0.83, 0, g);
      box(1.85, 1.2, 0.18, "#9a7352", 0, 1.25, 0, g);
      box(1.63, 0.95, 0.05, "#f0deb9", 0, 1.25, 0.13, g);
      for (let i = 0; i < 3; i++) {
        const m = box(
          0.35,
          0.5,
          0.02,
          ["#ffffeb", "#d3dfb4", "#eacdaa"][i],
          -0.5 + i * 0.5,
          1.25,
          0.18,
          g,
        );
        m.rotation.z = (i - 1) * 0.09;
      }
      const r = box(2.05, 0.14, 0.6, "#597e61", 0, 1.91, 0, g);
      r.rotation.x = 0.1;
    } else {
      cyl(1.05, 1.18, 0.25, "#b9b5a0", 0, 0.15, 0, g, 8);
      for (const a of [-0.7, 0.7])
        for (const b of [-0.7, 0.7])
          box(0.09, 1.6, 0.09, "#ceb88c", a, 1, b, g);
      cyl(0, 1.5, 0.9, "#669891", 0, 2.1, 0, g, 4).rotation.y = Math.PI / 4;
      const telescope = cyl(0.13, 0.18, 0.85, "#d8b96e", 0, 1.12, 0, g, 10);
      telescope.rotation.z = -0.95;
      cyl(0.05, 0.05, 0.7, "#6c7266", 0, 0.5, 0, g);
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.poi = id;
        interactables.push(o);
      }
    });
    poi(id, x, z, kind === "home" ? 2.7 : 2.3);
  }
  function makeBuddy(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    g.scale.setScalar(scale);
    g.userData.dynamic = true;
    world.add(g);
    // Pear-shaped seed: a broad soft base, rounded crown, and continuous surface.
    const radiusAt = (y) => {
      const t = THREE.MathUtils.clamp((y - 0.02) / 0.68, 0, 1);
      return 0.35 * Math.pow(Math.sin(Math.PI * t), 0.55) * (1.08 - 0.32 * t);
    };
    const profile = Array.from({ length: 41 }, (_, i) => {
      const y = 0.02 + (0.68 * i) / 40;
      return new THREE.Vector2(radiusAt(y), y);
    });
    const body = mesh(
      new THREE.LatheGeometry(profile, 48),
      "#93b968",
      0,
      0,
      0,
      g,
    );
    body.scale.z = 0.84;
    // Decals follow the seed's curved surface, so the face cannot float or clip into it.
    function skinPatch(w, h, cy) {
      const geo = new THREE.PlaneGeometry(w, h, 32, 24),
        pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          y = pos.getY(i) + cy,
          r = radiusAt(y);
        pos.setXYZ(
          i,
          x,
          y,
          Math.sqrt(Math.max(0.0001, r * r - x * x)) * 0.84 + 0.005,
        );
      }
      geo.computeVertexNormals();
      return geo;
    }
    const bellyCanvas = document.createElement("canvas");
    bellyCanvas.width = 256;
    bellyCanvas.height = 128;
    const bc = bellyCanvas.getContext("2d");
    bc.fillStyle = "#c2d79b";
    bc.beginPath();
    bc.ellipse(128, 64, 124, 58, 0, 0, Math.PI * 2);
    bc.fill();
    const bellyTexture = new THREE.CanvasTexture(bellyCanvas);
    bellyTexture.colorSpace = THREE.SRGBColorSpace;
    const belly = new THREE.Mesh(
      skinPatch(0.43, 0.15, 0.16),
      new THREE.MeshStandardMaterial({
        map: bellyTexture,
        transparent: true,
        depthWrite: false,
        roughness: 1,
      }),
    );
    g.add(belly);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sc = shadowCanvas.getContext("2d"),
      gradient = sc.createRadialGradient(64, 64, 5, 64, 64, 63);
    gradient.addColorStop(0, "rgba(52,59,36,.48)");
    gradient.addColorStop(0.45, "rgba(52,59,36,.22)");
    gradient.addColorStop(1, "rgba(52,59,36,0)");
    sc.fillStyle = gradient;
    sc.fillRect(0, 0, 128, 128);
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.15),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.userData.dynamic = true;
    contact.renderOrder = 2;
    world.add(contact);
    g.userData.contactShadow = contact;
    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const faceCtx = faceCanvas.getContext("2d"),
      texture = new THREE.CanvasTexture(faceCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      skinPatch(0.48, 0.36, 0.4),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    face.renderOrder = 1;
    g.add(face);
    const values = [...EXPRESSIONS.idle],
      vel = [0, 0, 0, 0, 0];
    let previous = 0;
    g.userData.drawFace = (t) => {
      const mood =
          g.userData.moodUntil > Date.now() ? g.userData.mood : getMood(),
        goal = EXPRESSIONS[mood] || EXPRESSIONS.idle,
        dt = Math.min((t - previous) / 1000 || 0.016, 0.04);
      previous = t;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      for (let i = 0; i < 5; i++) {
        if (reduced) {
          values[i] = goal[i];
          vel[i] = 0;
          continue;
        }
        const step = springStep(values[i], vel[i], goal[i], dt);
        values[i] = step.position;
        vel[i] = step.velocity;
      }
      const c = faceCtx;
      c.clearRect(0, 0, 256, 256);
      c.fillStyle = "#344938";
      c.lineWidth = 11;
      c.lineCap = "round";
      c.strokeStyle = "#344938";
      const blink = !reduced && t % 4800 > 4620 ? 0.1 : 1;
      for (const x of [75, 181]) {
        c.beginPath();
        const gaze = Math.sin(t * 0.0006) * 4;
        paintEye(
          c,
          x + gaze,
          110,
          11,
          Math.max(
            1,
            19 * values[0] * blink * (x < 128 ? 1 + values[3] : 1 - values[3]),
          ),
          values[1],
          values[3] * (x < 128 ? -1 : 1),
        );
        c.fillStyle = "#da9e8c88";
        c.beginPath();
        c.ellipse(x + (x < 128 ? -17 : 17), 150, 22, 9, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#344938";
      }
      c.beginPath();
      if (values[2] > 0.55) {
        c.ellipse(128, 155, 17, 17 * values[2], 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.moveTo(112, 151);
        c.quadraticCurveTo(128, 165 + values[1] * 12, 144, 151);
        c.stroke();
      }
      texture.needsUpdate = true;
      g.rotation.z = values[3] * 0.3;
    };
    const leaves = new THREE.Group();
    leaves.position.y = 0.88;
    g.add(leaves);
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.05, 0.2, 0.23, 0.22, 0.36, 0.23);
    leafShape.bezierCurveTo(0.3, 0.03, 0.13, -0.04, 0, 0);
    for (const side of [-1, 1]) {
      const leaf = mesh(
        new THREE.ExtrudeGeometry(leafShape, {
          depth: 0.025,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.015,
          bevelThickness: 0.015,
          curveSegments: 10,
        }),
        side < 0 ? "#7fae54" : "#8fbc60",
        0,
        0,
        0,
        leaves,
      );
      leaf.scale.x = side;
    }
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.65, 0),
      new THREE.Vector3(-0.018, 0.77, 0),
      new THREE.Vector3(0, 0.91, 0),
    ]);
    mesh(
      new THREE.TubeGeometry(stemCurve, 16, 0.019, 8, false),
      "#6f9448",
      0,
      0,
      0,
      g,
    );
    for (const side of [-1, 1]) {
      const vein = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.01, 0.04),
        new THREE.Vector3(side * 0.14, 0.095, 0.045),
        new THREE.Vector3(side * 0.29, 0.19, 0.04),
      ]);
      mesh(
        new THREE.TubeGeometry(vein, 10, 0.007, 5, false),
        "#a5c982",
        0,
        0,
        0,
        leaves,
      );
    }
    g.userData.leaves = leaves;
    animated.push(g);
    if (mode === "home") buddy = g;
    return g;
  }
  let buddy, furnitureGroup, floor, ghost;
  let roomSize = { w: 6, d: 6 },
    homeTick;
  const cutawayWalls = [];
  const furniturePickables = [];
  if (mode === "map") {
    cyl(5.6, 4.8, 0.65, "#bfac83", 0, -0.48, 0, world, 48);
    cyl(5.65, 5.6, 0.22, "#9aba7a", 0, -0.065, 0, world, 48);
    cyl(5.35, 5.55, 0.12, "#b4cd8d", 0, 0.03, 0, world, 48);
    // Organic paths and a small pond keep the island readable from any angle.
    for (let i = 0; i < 13; i++) {
      const t = i / 12;
      const p = cyl(
        0.43,
        0.44,
        0.035,
        "#e0d3ab",
        Math.sin(t * 3.6) * 1.2 - 0.4,
        0.105,
        3.8 - t * 7,
        world,
        10,
      );
      p.scale.x = 1.3;
    }
    for (let i = 0; i < 9; i++)
      cyl(
        0.35,
        0.36,
        0.034,
        "#e0d3ab",
        -3 + i * 0.73,
        0.106,
        0.7 + Math.sin(i * 0.6) * 0.3,
        world,
        10,
      );
    const pond = cyl(1.2, 1.25, 0.03, "#8dbfb6", 2.2, 0.11, 2.15, world, 28);
    pond.scale.set(1.35, 1, 0.75);
    const water = cyl(1.05, 1.08, 0.04, "#a4d2cb", 2.2, 0.13, 2.15, world, 28);
    water.scale.set(1.35, 1, 0.74);
    for (let i = 0; i < 4; i++) {
      const stone = ball(
        0.16,
        "#d3d5bc",
        1.1 + i * 0.48,
        0.19,
        2.65 + Math.sin(i) * 0.1,
      );
      stone.scale.y = 0.45;
    }
    building("home", -2, -1.6, "home");
    building("shop", 2.65, -0.9, "shop");
    building("tasks", -0.9, 2.15, "tasks");
    building("journal", 1, -3.65, "journal");
    [
      [-4, -1, 1.15],
      [-3.7, 1.5, 0.8],
      [-2.9, -3.5, 1],
      [-0.4, -4.5, 0.9],
      [3.8, 1, 0.75],
      [3, -3, 1.1],
    ].forEach((a) => tree(...a));
    [
      [-4.25, -2.6, 0.85],
      [0.1, -3.5, 0.85],
      [4, -1.9, 0.8],
      [-2.5, 3.3, 0.65],
    ].forEach((a) => pine(...a));
    for (let i = 0; i < 23; i++) {
      const a = i * 2.399;
      const r = 3.5 + (i % 4) * 0.36;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      ball(0.06, i % 3 ? "#fff0c4" : "#e6b794", x, 0.16, z);
    }
    buddy = makeBuddy(0.0, 1.3, 1.15);
    interactables.length = 0;
    interactables.push(
      ...mergeStatic(world, [], true).filter((m) => m.userData.poi),
    );
  }
  function resize() {
    const w = el.clientWidth,
      h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = innerWidth < 700 ? 36 : 32;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(el);
  resize();
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let down = null,
    dragged = false;
  function updateRay(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
  }
  const touches = new Map();
  let pinch = null;
  function pointerDown(e) {
    if (e.pointerType === "touch") {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = { span: Math.hypot(a.x - b.x, a.y - b.y), distance };
        dragged = true;
        return;
      }
    }
    down = { x: e.clientX, y: e.clientY, a: angle, elevation };
    dragged = false;
  }
  function pointerMove(e) {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        distance = Math.max(
          5,
          Math.min(
            30,
            (pinch.distance * pinch.span) /
              Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          ),
        );
        dragged = true;
        return;
      }
    }
    if (down) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
        dragged = true;
      angle = down.a - (e.clientX - down.x) * 0.008;
      if (mode === "home")
        elevation = Math.max(
          3,
          Math.min(22, down.elevation + (e.clientY - down.y) * 0.045),
        );
    }
    if (mode === "home") {
      const bounds = renderer.domElement.getBoundingClientRect();
      if (
        e.clientX < bounds.left ||
        e.clientX > bounds.right ||
        e.clientY < bounds.top ||
        e.clientY > bounds.bottom
      )
        return;
      updateRay(e);
      const hit = floor && ray.intersectObject(floor)[0];
      if (hit)
        onCell?.(
          {
            x: Math.floor(hit.point.x + roomSize.w / 2),
            z: Math.floor(hit.point.z + roomSize.d / 2),
          },
          false,
        );
    }
  }
  function pointerUp(e) {
    touches.delete(e.pointerId);
    if (pinch) {
      if (!touches.size) pinch = null;
      down = null;
      return;
    }
    if (down && !dragged) {
      updateRay(e);
      if (mode === "map") {
        const h = ray.intersectObjects(interactables)[0];
        if (h) flyTo(h.object.userData.poi);
      } else {
        if (buddy && ray.intersectObject(buddy, true).length) {
          onPet?.();
          down = null;
          return;
        }
        const h = ray.intersectObjects(furniturePickables, false)[0];
        if (h && onPick?.(h.object.userData.uid)) {
          down = null;
          return;
        }
        const f = floor && ray.intersectObject(floor)[0];
        if (f)
          onCell?.(
            {
              x: Math.floor(f.point.x + roomSize.w / 2),
              z: Math.floor(f.point.z + roomSize.d / 2),
            },
            true,
          );
      }
    }
    down = null;
  }
  function wheel(e) {
    e.preventDefault();
    distance = Math.max(
      mode === "home" ? 5 : 13,
      Math.min(30, distance + e.deltaY * 0.012),
    );
  }
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  renderer.domElement.addEventListener("wheel", wheel, { passive: false });
  let flight = null;
  function flyTo(id) {
    if (flight) return;
    const p = pois.find((p) => p.id === id);
    if (!p) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onNavigate?.(id);
      return;
    }
    flight = {
      id,
      start: performance.now(),
      from: target.clone(),
      to: p.point.clone().setY(0.4),
      distance,
    };
  }
  let frame,
    stopped = false,
    first = true;
  const labels = {};
  function render(t) {
    if (stopped) return;
    if (flight) {
      const progress = Math.min(1, (t - flight.start) / 600),
        ease =
          progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      target.lerpVectors(flight.from, flight.to, ease);
      distance = flight.distance * (1 - 0.35 * ease);
      if (progress === 1) {
        const id = flight.id;
        flight = null;
        onNavigate?.(id);
      }
    }
    camera.position.set(
      Math.sin(angle) * distance,
      elevation,
      Math.cos(angle) * distance,
    );
    camera.lookAt(target);
    animated.forEach((g, i) => {
      g.userData.drawFace?.(t);
      g.position.y =
        0.05 +
        (matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : Math.sin(t * 0.002 + i) * 0.035);
      g.rotation.y =
        0.65 +
        (matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : Math.sin(t * 0.0005) * 0.18);
    });
    homeTick?.(t, buddy);
    for (const g of animated) {
      const contact = g.userData.contactShadow;
      if (contact) {
        const ground = g.userData.supportHeight || 0.028,
          h = Math.max(0, g.position.y - ground);
        contact.position.set(g.position.x, ground + 0.009, g.position.z);
        contact.scale.setScalar(1 + h * 0.6);
        contact.material.opacity = 0.8 / (1 + h * 2.4);
        contact.visible = g.visible;
      }
      if (g.userData.leaves)
        g.userData.leaves.rotation.z = matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? 0
          : Math.sin(t * 0.004) * 0.07 + g.rotation.z * 0.15;
    }
    for (const wall of cutawayWalls) {
      const facing = camera.position
        .clone()
        .sub(target)
        .normalize()
        .dot(wall.userData.normal);
      const opacityTarget = facing > -0.06 ? 0 : 1;
      wall.userData.opacity += (opacityTarget - wall.userData.opacity) * 0.13;
      wall.visible = wall.userData.opacity > 0.01;
      wall.traverse((o) => {
        if (o.isMesh) {
          o.material.opacity = wall.userData.opacity;
          o.material.depthWrite = wall.userData.opacity > 0.98;
          o.castShadow = opacityTarget === 1;
        }
      });
    }
    renderer.render(scene, camera);
    for (const p of pois) {
      const v = p.point.clone().project(camera);
      labels[p.id] = {
        left: (v.x * 0.5 + 0.5) * 100,
        top: (-0.5 * v.y + 0.5) * 100,
      };
    }
    onReady?.(labels, renderer.info.render);
    if (first) {
      first = false;
      el.dataset.ready = "true";
    }
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
  return {
    flyTo,
    scene,
    world,
    renderer,
    camera,
    mat,
    mesh,
    box,
    ball,
    cyl,
    makeBuddy,
    animated,
    setLighting(light) {
      sun.color.set(
        light === "night"
          ? "#ffd291"
          : light === "sunset"
            ? "#ffc88b"
            : "#fff0d3",
      );
      sun.intensity = light === "night" ? 0.9 : light === "sunset" ? 2.1 : 2.6;
      scene.children.find((o) => o.isHemisphereLight).intensity =
        light === "night" ? 0.75 : 2.1;
    },
    setHomeTick(fn) {
      homeTick = fn;
    },
    setRoomSize(size) {
      roomSize = size;
    },
    turn(delta) {
      angle += delta;
    },
    overhead() {
      elevation = 20;
      distance = 3;
    },
    setHome(build) {
      furnitureGroup = new THREE.Group();
      world.add(furnitureGroup);
      floor = build({ world, box, ball, cyl, mesh, mat, makeBuddy });
      world.traverse((g) => {
        if (g.userData.cutaway) cutawayWalls.push(g);
      });
      for (const g of cutawayWalls) {
        mergeStatic(g);
        const cloned = new Map();
        g.traverse((o) => {
          if (o.isMesh) {
            if (!cloned.has(o.material)) {
              const m = o.material.clone();
              m.transparent = true;
              cloned.set(o.material, m);
            }
            o.material = cloned.get(o.material);
          }
        });
        g.userData.dynamic = true;
        g.userData.opacity = 1;
      }
      mergeStatic(world, [floor]);
      angle = 0.72;
      distance =
        Math.max(roomSize.w, roomSize.d) * (innerWidth < 600 ? 2.2 : 2);
      elevation = Math.max(roomSize.w, roomSize.d) * 1.65;
      target.set(0, 0.5, 0);
    },
    setFurniture(build) {
      if (!furnitureGroup) return;
      for (const p of furniturePickables) {
        p.geometry.dispose();
        p.material.dispose();
      }
      furniturePickables.length = 0;
      for (const g of [...furnitureGroup.children]) {
        g.traverse((o) => o.geometry?.dispose());
        furnitureGroup.remove(g);
      }
      build(furnitureGroup);
      furnitureGroup.updateMatrixWorld(true);
      for (const g of furnitureGroup.children) {
        const bounds = new THREE.Box3().setFromObject(g),
          size = bounds.getSize(new THREE.Vector3()),
          center = bounds.getCenter(new THREE.Vector3());
        let uid;
        g.traverse((o) => {
          if (o.userData.uid) uid = o.userData.uid;
        });
        if (!uid) continue;
        const proxy = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.max(0.1, size.x),
            Math.max(0.15, size.y),
            Math.max(0.1, size.z),
          ),
          new THREE.MeshBasicMaterial(),
        );
        proxy.position.copy(center);
        proxy.userData.uid = uid;
        proxy.updateMatrixWorld();
        furniturePickables.push(proxy);
      }
      mergeStatic(furnitureGroup);
    },
    setGhost(build) {
      if (ghost) {
        ghost.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        world.remove(ghost);
      }
      ghost = build?.();
      if (ghost) world.add(ghost);
    },
    zoom(delta) {
      distance = Math.max(
        mode === "home" ? 8 : 13,
        Math.min(40, distance + delta),
      );
    },
    reset() {
      angle = 0.73;
      elevation =
        mode === "home" ? Math.max(roomSize.w, roomSize.d) * 1.65 : 11;
      distance =
        mode === "home"
          ? Math.max(roomSize.w, roomSize.d) * (innerWidth < 600 ? 2.2 : 2)
          : 18;
    },
    dispose() {
      stopped = true;
      cancelAnimationFrame(frame);
      for (const p of furniturePickables) {
        p.geometry.dispose();
        p.material.dispose();
      }
      observer.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("wheel", wheel);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            m.map?.dispose();
            m.dispose();
          }
        }
      });
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
