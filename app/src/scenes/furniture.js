import * as THREE from "three";
import { footprint } from "../game/placement.js";
export function furnitureModel(f, api) {
  const { box, ball, cyl } = api,
    g = new THREE.Group(),
    wood = "#b78a60",
    dark = "#766046",
    cream = "#f5e7c9",
    c = f.color;
  const b = (w, h, d, col, x, y, z) => box(w, h, d, col, x, y, z, g),
    s = (r, col, x, y, z) => ball(r, col, x, y, z, g),
    cy = (a, r, h, col, x, y, z, n = 12) => cyl(a, r, h, col, x, y, z, g, n);
  const legs = (w, d, h) => {
    for (const x of [-w / 2, w / 2])
      for (const z of [-d / 2, d / 2]) b(0.1, h, 0.1, dark, x, h / 2, z);
  };
  switch (f.model) {
    case "mat":
      b(1.85, 0.055, 1.85, c, 0, 0.04, 0);
      for (let i = 0; i < 6; i++)
        b(1.84, 0.012, 0.025, "#b69961", 0, 0.075, -0.77 + i * 0.3);
      break;
    case "rug":
      cy(0.96, 0.96, 0.045, c, 0, 0.045, 0, 32);
      cy(0.8, 0.8, 0.05, "#e9d5af", 0, 0.052, 0, 32);
      break;
    case "stool":
      cy(0.4, 0.4, 0.12, c, 0, 0.52, 0);
      legs(0.45, 0.45, 0.48);
      break;
    case "table":
      cy(0.91, 0.91, 0.14, c, 0, 0.98, 0, 24);
      cy(0.14, 0.28, 0.9, dark, 0, 0.45, 0);
      break;
    case "desk":
      b(2.8, 0.13, 0.86, c, 0, 1, 0);
      legs(2.5, 0.55, 0.95);
      b(0.55, 0.6, 0.75, "#c7aa84", 0.9, 0.64, 0);
      break;
    case "sofa":
      b(1.72, 0.45, 1.7, c, 0, 0.45, 0);
      b(1.72, 0.77, 0.3, c, 0, 0.93, -0.67);
      b(0.26, 0.6, 1.6, c, -0.73, 0.72, 0);
      b(0.26, 0.6, 1.6, c, 0.73, 0.72, 0);
      b(1.2, 0.18, 1.15, "#b0c3a1", 0, 0.75, 0.12);
      b(0.57, 0.55, 0.22, cream, 0.28, 1, -0.4).rotation.z = 0.18;
      legs(1.3, 1.3, 0.2);
      break;
    case "bed":
      b(1.8, 0.3, 2.8, wood, 0, 0.32, 0);
      b(1.86, 0.85, 0.16, wood, 0, 0.67, -1.35);
      b(1.7, 0.25, 2.6, cream, 0, 0.6, 0);
      b(1.7, 0.12, 1.65, c, 0, 0.78, 0.43);
      b(1.2, 0.2, 0.6, "#fff6df", 0, 0.81, -0.8);
      legs(1.4, 2.4, 0.22);
      break;
    case "shelf":
      b(1.85, 1.8, 0.15, wood, 0, 0.95, -0.4);
      for (const x of [-0.85, 0.85]) b(0.13, 1.8, 0.85, wood, x, 0.95, 0);
      for (let i = 0; i < 3; i++) b(1.8, 0.1, 0.85, wood, 0, 0.15 + i * 0.7, 0);
      for (let i = 0; i < 5; i++)
        b(
          0.19,
          0.45,
          0.4,
          ["#91a897", "#cfa875", "#a2b6ba"][i % 3],
          -0.58 + i * 0.27,
          0.43,
          -0.03,
        );
      break;
    case "plant":
    case "flowers":
    case "moss":
    case "stand": {
      if (f.model === "stand") {
        b(1.8, 0.1, 0.8, wood, 0, 0.5, 0);
        legs(1.5, 0.5, 0.45);
      }
      const base = f.model === "stand" ? 0.55 : 0,
        count = f.model === "stand" ? 3 : 1;
      for (let j = 0; j < count; j++) {
        const x = (j - (count - 1) / 2) * 0.55;
        cy(0.26, 0.2, 0.4, "#be8c70", x, base + 0.21, 0);
        cy(0.22, 0.22, 0.03, dark, x, base + 0.42, 0);
        for (let i = 0; i < 3; i++) {
          cy(0.024, 0.024, 0.48, "#6d8a58", x + (i - 1) * 0.13, base + 0.61, 0);
          const leaf = s(
            f.model === "moss" ? 0.22 : 0.23,
            f.model === "flowers" ? ["#d9b077", "#e8c8a1", "#bc8869"][i] : c,
            x + (i - 1) * 0.15,
            base + 0.82 + (i % 2) * 0.12,
            0,
          );
          leaf.scale.set(1, 0.7, 0.65);
        }
      }
      break;
    }
    case "lamp":
    case "lantern":
      cy(0.23, 0.3, 0.09, dark, 0, 0.07, 0);
      cy(0.04, 0.05, 0.65, wood, 0, 0.4, 0);
      cy(f.model === "lamp" ? 0.22 : 0.2, 0.4, 0.38, c, 0, 0.87, 0);
      s(0.17, "#ffe1a2", 0, 0.65, 0);
      break;
    case "books":
      b(0.8, 0.34, 0.78, wood, 0, 0.18, 0);
      for (let i = 0; i < 3; i++)
        b(
          0.57,
          0.12,
          0.6,
          ["#8ea9a1", "#d2b28a", "#bd866e"][i],
          0.03,
          0.42 + i * 0.12,
          0,
        );
      break;
    case "cushion":
      s(0.44, c, 0, 0.3, 0).scale.set(1, 0.6, 1);
      break;
    case "radio":
      b(0.8, 0.62, 0.5, c, 0, 0.38, 0);
      b(0.41, 0.41, 0.03, dark, -0.14, 0.39, 0.27);
      for (let i = 0; i < 5; i++)
        b(0.36, 0.026, 0.02, "#c6ad88", -0.14, 0.24 + i * 0.072, 0.29);
      s(0.075, cream, 0.25, 0.48, 0.26);
      s(0.055, cream, 0.25, 0.26, 0.26);
      cy(0.015, 0.015, 0.6, dark, 0.27, 0.93, 0).rotation.z = -0.2;
      break;
    case "fireplace":
      b(1.8, 1.65, 0.85, c, 0, 0.86, 0);
      b(1.1, 0.95, 0.04, "#655849", 0, 0.66, 0.45);
      b(2, 0.15, 1, c, 0, 1.71, 0);
      s(0.27, "#ecb86a", 0, 0.45, 0.54).scale.set(1, 1.6, 0.4);
      break;
    case "chime":
      cy(0.035, 0.04, 1.5, wood, 0, 0.75, 0);
      cy(0.4, 0.45, 0.12, c, 0, 1.55, 0);
      for (let i = 0; i < 3; i++)
        cy(0.035, 0.035, 0.5, cream, (i - 1) * 0.23, 1.18, 0.1);
      break;
    case "tapestry":
      b(1.85, 1.5, 0.1, c, 0, 0.85, 0);
      b(2, 0.08, 0.14, wood, 0, 1.63, 0);
      cy(0, 0.58, 0.72, "#d8d5bb", -0.2, 0.67, 0.1, 3);
      break;
    case "telescope": {
      legs(0.55, 1.2, 0.8);
      const m = cy(0.2, 0.26, 1.15, c, 0, 1.1, 0);
      m.rotation.x = 0.9;
      break;
    }
  }
  return g;
}
export function decorateHome(api) {
  const { box, world, cyl, ball, makeBuddy } = api;
  const floor = box(6, 0.15, 6, "#d8be93", 0, -0.08, 0);
  for (let i = 0; i < 12; i++)
    box(5.98, 0.015, 0.018, "#c3a881", 0, 0.01, -2.75 + i * 0.5);
  box(6.15, 2.9, 0.13, "#ede3c9", 0, 1.38, -3.07);
  box(0.13, 2.9, 6.15, "#dfdebd", -3.07, 1.38, 0);
  box(6.15, 0.14, 0.2, "#c5b086", 0, 0.15, -2.98);
  box(0.2, 0.14, 6.15, "#c5b086", -2.98, 0.15, 0);
  box(2.05, 1.55, 0.05, "#a4c9c5", 0.8, 1.78, -2.98);
  for (const x of [-0.29, 0.8, 1.89])
    box(0.1, 1.7, 0.14, "#fff3d9", x, 1.78, -2.9);
  for (const y of [0.91, 1.78, 2.64])
    box(2.3, 0.08, 0.18, "#fff3d9", 0.8, y, -2.89);
  box(2.5, 0.12, 0.52, "#c9af82", 0.8, 0.87, -2.75);
  const sunpatch = box(1.85, 0.012, 2.2, "#ead4a8", 1.05, 0.025, -1.45);
  sunpatch.rotation.y = -0.2;
  // Small notebook is permanent, so the room always has an anchor.
  box(0.55, 0.1, 0.7, "#819c79", -2.1, 0.08, -2.15);
  box(0.49, 0.05, 0.65, "#f9eed8", -2.1, 0.1, -2.15);
  makeBuddy(2.25, 2.3, 1.15);
  return floor;
}
export function placeModel(f, placed, api, parent) {
  const g = furnitureModel(f, api),
    size = footprint(f, placed.rotation);
  g.position.set(placed.x - 3 + size.w / 2, 0.04, placed.z - 3 + size.d / 2);
  g.rotation.y = (-placed.rotation * Math.PI) / 2;
  g.traverse((o) => {
    if (o.isMesh) o.userData.uid = placed.uid;
  });
  parent.add(g);
  return g;
}
let thumbnailRenderer, thumbScene, thumbCamera;
const cache = new Map();
export function furnitureThumbnail(f) {
  if (cache.has(f.id)) return cache.get(f.id);
  if (!thumbnailRenderer) {
    thumbnailRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    thumbnailRenderer.setSize(240, 180);
    thumbnailRenderer.setPixelRatio(1);
    thumbScene = new THREE.Scene();
    thumbScene.add(new THREE.HemisphereLight("#ffffff", "#b3ac8d", 3));
    const l = new THREE.DirectionalLight("#fff2d9", 3);
    l.position.set(-3, 6, 4);
    thumbScene.add(l);
    thumbCamera = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 30);
    thumbCamera.position.set(3.5, 3, 4.5);
    thumbCamera.lookAt(0, 0.65, 0);
  }
  const materials = [];
  const mesh = (geo, color, x, y, z, p) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    materials.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    p.add(m);
    return m;
  };
  const api = {
    box: (w, h, d, c, x, y, z, p) =>
      mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z, p),
    ball: (r, c, x, y, z, p) =>
      mesh(new THREE.SphereGeometry(r, 12, 8), c, x, y, z, p),
    cyl: (a, b, h, c, x, y, z, p, n) =>
      mesh(new THREE.CylinderGeometry(a, b, h, n || 12), c, x, y, z, p),
  };
  const g = furnitureModel(f, api);
  thumbScene.add(g);
  thumbnailRenderer.render(thumbScene, thumbCamera);
  const url = thumbnailRenderer.domElement.toDataURL("image/png");
  cache.set(f.id, url);
  thumbScene.remove(g);
  g.traverse((o) => o.geometry?.dispose());
  materials.forEach((m) => m.dispose());
  return url;
}
export function disposeThumbnails() {
  thumbnailRenderer?.dispose();
  thumbnailRenderer = null;
  thumbScene = null;
  cache.clear();
}
