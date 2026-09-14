import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { homeLife } from "../src/scenes/home-life.js";
import { emptyHome } from "../src/game/home.js";

test("idle stays put; explicit furniture actions remain available without hopping", () => {
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.document = { createElement: () => ({ getContext: () => ({ clearRect(){}, fillText(){} }) }) };
  for (const [fid, action] of [["plant","water"],["stool","sit"],["bed","sleep"],["books","read"],["radio","dance"]]) {
    const home = emptyHome();
    home.inventory = [{ uid: "fixture", fid }];
    home.placed = [{ uid: "fixture", x: 0, z: 0, rotation: 0 }];
    let tick, moment;
    const engine = { world: new THREE.Group(), camera: new THREE.PerspectiveCamera(), setHomeTick(fn){tick=fn;} };
    const life = homeLife(engine, () => home, (a) => {moment=a;});
    const buddy = new THREE.Group();
    for(let t=16;t<10000;t+=16) tick(t,buddy);
    const idle = buddy.position.clone();
    for(let t=10000;t<20000;t+=16) tick(t,buddy);
    assert.ok(idle.distanceTo(buddy.position)<1e-6);
    assert.equal(life.walk, undefined);
    assert.ok(life.interact("fixture"));
    for(let t=20000;t<28000;t+=16) tick(t,buddy);
    assert.equal(moment.action, action);
    assert.equal(home.lumens, 0);
  }
  delete globalThis.document; delete globalThis.matchMedia;
});
