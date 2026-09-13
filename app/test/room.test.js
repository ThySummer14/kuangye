import test from "node:test";
import assert from "node:assert/strict";
import { emptyHome, normalizeHome } from "../src/game/home.js";
import {
  expandRoom,
  expansionOffer,
  roomOf,
  addHomeMoment,
} from "../src/game/room.js";
import {
  walkPath,
  occupiedCells,
  approachFurniture,
} from "../src/game/buddy-walk.js";
import { placementCheck } from "../src/game/placement.js";
import { furnitureById } from "../src/data/furniture.js";
test("expansion charges once per added strip and never spends unavailable light", () => {
  const h = emptyHome();
  assert.equal(expandRoom(h, "w").ok, false);
  h.lumens = 500;
  const r = expandRoom(h, "w");
  assert.equal(r.ok, true);
  assert.equal(r.area, 12);
  assert.equal(h.lumens, 470);
  assert.equal(expansionOffer(h, "d").price, 50);
  assert.equal(expandRoom(h, "invalid").ok, false);
  assert.equal(h.lumens, 470);
  while (expansionOffer(h, "w")) {
    h.lumens = 1000;
    expandRoom(h, "w");
  }
  assert.equal(expandRoom(h, "w").ok, false);
  assert.deepEqual(roomOf(h), { w: 12, d: 6 });
});
test("expanded placements survive normalization and old saves start at nine square metres", () => {
  const h = emptyHome();
  h.room = { w: 10, d: 8 };
  h.inventory = [{ uid: "i1", fid: "stool", paid: 15 }];
  h.placed = [{ uid: "i1", x: 8, z: 7, rotation: 0 }];
  const n = normalizeHome(h, []);
  assert.deepEqual(n.room, h.room);
  assert.equal(n.placed.length, 1);
  assert.deepEqual(roomOf({ room: { w: 100, d: -5 } }), { w: 6, d: 6 });
});
test("rugs support furniture while solid furniture cannot overlap", () => {
  const inventory = [
      { uid: "rug", fid: "rug" },
      { uid: "chair", fid: "stool" },
    ],
    placed = [{ uid: "rug", x: 0, z: 0, rotation: 0 }];
  assert.equal(
    placementCheck(
      furnitureById.stool,
      { x: 0, z: 0, rotation: 0 },
      placed,
      inventory,
      "chair",
    ).ok,
    true,
  );
  placed.push({ uid: "chair", x: 0, z: 0, rotation: 0 });
  assert.equal(
    placementCheck(
      furnitureById.stool,
      { x: 0, z: 0, rotation: 0 },
      placed,
      inventory,
      "another",
    ).ok,
    false,
  );
  assert.equal(occupiedCells({ inventory, placed }).size, 1);
});
test("walking goes around furniture, rejects sealed destinations and finds reachable interaction edge", () => {
  const room = { w: 6, d: 6 },
    wall = new Set(["1,0", "1,1", "1,2"]);
  const path = walkPath({ x: 0, z: 0 }, { x: 2, z: 0 }, room, wall);
  assert.ok(path.length > 3);
  assert.ok(path.every((p) => !wall.has(`${p.x},${p.z}`)));
  assert.deepEqual(walkPath({ x: 0, z: 0 }, { x: 1, z: 0 }, room, wall), []);
  assert.deepEqual(
    walkPath({ x: 0, z: 0 }, { x: 2, z: 0 }, room, new Set(["0,1", "1,0"])),
    [],
  );
  assert.ok(
    approachFurniture(
      { x: 0, z: 0 },
      { x: 3, z: 3, rotation: 0 },
      furnitureById.table,
      room,
      new Set(["3,3", "3,4", "4,3", "4,4"]),
    ).length,
  );
});
test("home discoveries are bounded and cannot be farmed into currency", () => {
  const h = emptyHome();
  assert.equal(addHomeMoment(h, "discovery", "第一盆花", "plant"), true);
  assert.equal(addHomeMoment(h, "discovery", "第一盆花", "plant"), false);
  assert.equal(h.lumens, 0);
  for (let i = 0; i < 80; i++) addHomeMoment(h, "discovery", "故事", String(i));
  assert.equal(h.moments.length, 60);
});

test("wall fixtures share their supporting cutaway group", async () => {
  const THREE = await import("three");
  const { decorateHome } = await import("../src/scenes/furniture.js");
  const world = new THREE.Group();
  const box = (w, h, d, c, x, y, z, p = world) => {
    const o = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: c }),
    );
    o.position.set(x, y, z);
    p.add(o);
    return o;
  };
  const api = {
    world,
    box,
    ball: (r, c, x, y, z, p) => box(r * 2, r * 2, r * 2, c, x, y, z, p),
    cyl: (a, b, h, c, x, y, z, p) => box(a * 2, h, b * 2, c, x, y, z, p),
    mesh: (geo, c, x, y, z, p) => {
      const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c }));
      o.position.set(x, y, z);
      p.add(o);
      return o;
    },
    makeBuddy: () => {},
  };
  decorateHome(api, { w: 8, d: 6 }, { wall: "meadow", floor: "oak" });
  const walls = world.children.filter((g) => g.userData.cutaway);
  assert.equal(walls.length, 2);
  for (const wall of walls) {
    assert.ok(new THREE.Box3().setFromObject(wall).max.y > 2.9);
    wall.visible = false;
    assert.ok(wall.children.every((c) => c.parent === wall));
  }
  for (const o of world.children.filter((o) => o.isMesh))
    assert.ok(
      o.position.y < 0.95,
      "no high fixture can live outside a supporting wall",
    );
  world.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
});

test("static batching keeps rounded boxes, spheres and tubes sharing one material", async () => {
  const THREE = await import("three");
  const { RoundedBoxGeometry } = await import(
    "three/addons/geometries/RoundedBoxGeometry.js"
  );
  const { mergeStatic } = await import("../src/scenes/world.js");
  const g = new THREE.Group(),
    mat = new THREE.MeshBasicMaterial();
  const geometries = [
    new RoundedBoxGeometry(1, 1, 1, 2, 0.1),
    new THREE.SphereGeometry(0.3, 12, 8),
    new THREE.CylinderGeometry(0.1, 0.1, 1, 12),
  ];
  let triangles = 0;
  for (const geo of geometries) {
    triangles +=
      (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    g.add(new THREE.Mesh(geo, mat));
  }
  const result = mergeStatic(g);
  assert.equal(result.length, 1);
  assert.equal(result[0].geometry.attributes.position.count / 3, triangles);
  result[0].geometry.dispose();
  mat.dispose();
});
