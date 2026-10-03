import * as THREE from 'three';
import { EXTERIOR } from '../data/town.js';

// A shared, texture-free building language. Small joinery uses plain geometry;
// larger silhouettes keep the engine's soft edges. Everything remains static.
function craft(e, parent) {
  return {
    box(w, h, d, color, x, y, z) {
      const m = e.box(w, h, d, color, x, y, z, parent);
      if (Math.min(w, h, d) <= .08) {
        m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(w, h, d);
      }
      return m;
    },
    ball(r, color, x, y, z) {
      const m = e.ball(r, color, x, y, z, parent);
      if (r <= .085) { m.geometry.dispose(); m.geometry = new THREE.SphereGeometry(r, 8, 6); }
      return m;
    },
    cyl(a, b, h, color, x, y, z, n = 12) { return e.cyl(a, b, h, color, x, y, z, parent, n); },
  };
}
const tint = (color, amount) => '#' + new THREE.Color(color).lerp(new THREE.Color(amount > 0 ? '#fff4da' : '#514b40'), Math.abs(amount)).getHexString();
function group(parent, x = 0, y = 0, z = 0, angle = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = angle; parent.add(g); return g;
}
function beam(k, from, to, width, depth, color) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
  const mid = a.add(b).multiplyScalar(.5);
  const m = k.box(width, direction.length(), depth, color, mid.x, mid.y, mid.z);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return m;
}
function solid(k, positions, color, x, y, z) {
  const m = k.box(1, 1, 1, color, x, y, z), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(Array(positions.length / 3 * 2).fill(0), 2));
  geometry.computeVertexNormals(); m.geometry.dispose(); m.geometry = geometry; return m;
}
function roof(e, parent, { width, depth, base, rise, wall, color, gable = true, rows = 6 }) {
  const k = craft(e, parent), half = width / 2, run = half + .18;
  const pitch = rise / half, angle = Math.atan(pitch), slope = run / Math.cos(angle), peak = base + rise;
  const span = depth + .42, eave = peak - run * pitch;
  if (gable) {
    const points = [[-half, 0, 0], [half, 0, 0], [0, rise, 0], [-half, 0, depth], [half, 0, depth], [0, rise, depth]];
    solid(k, [0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4].flatMap(i => points[i]), wall, 0, base, -depth / 2);
  }
  const colors = [color, tint(color, .045), tint(color, -.07)];
  // Separate overlapping courses and staggered joints give the roof a real edge.
  for (const sign of [-1, 1]) {
    k.box(slope + .04, .075, span, tint(color, -.07), sign * run / 2, peak - run * pitch / 2, 0).rotation.z = -sign * angle;
    const columns = Math.max(5, Math.round(span / .34)), tileDepth = span / columns;
    for (let row = 0; row < rows; row++) {
      const t = (row + .5) / rows, shift = (row % 2) * .5;
      for (let col = 0; col <= columns; col++) {
        const start = Math.max(0, col - shift), end = Math.min(columns, col + 1 - shift);
        if (end <= start) continue;
        const m = k.box(slope / rows + .04, .045, (end - start) * tileDepth - .014,
          colors[(row + col * 2 + (sign + 1)) % colors.length], sign * run * t,
          peak - run * pitch * t + .055 + row * .003, -span / 2 + (start + end) / 2 * tileDepth);
        m.rotation.z = -sign * angle;
      }
    }
    for (const z of [-span / 2, span / 2]) {
      k.box(slope + .08, .13, .09, '#d5bf99', sign * run / 2, peak - run * pitch / 2 - .055, z).rotation.z = -sign * angle;
      beam(k, [sign * (half - .1), base - .1, z], [sign * (half - .4), base + .1, z], .06, .065, '#b3936d');
    }
    k.box(.1, .12, span + .06, '#b3936d', sign * run, eave - .025, 0);
  }
  for (let i = 0; i < Math.ceil(span / .25); i++) {
    const d = span / Math.ceil(span / .25);
    const cap = k.cyl(.085, .085, d - .015, colors[i % 3], 0, peak + .07, -span / 2 + (i + .5) * d, 8);
    cap.rotation.x = Math.PI / 2;
  }
  return { angle, peak, eave, run };
}
function foundation(e, parent, width, depth, wallHeight, trim = '#e5d4b1') {
  const k = craft(e, parent);
  k.box(width + .23, .16, depth + .23, '#b9ac91', 0, .09, 0);
  const stone = ['#c5b9a0', '#b9ac91'];
  for (const [w, x, z, a] of [[width, 0, depth / 2 + .018, 0], [width, 0, -depth / 2 - .018, Math.PI], [depth, width / 2 + .018, 0, Math.PI / 2], [depth, -width / 2 - .018, 0, -Math.PI / 2]]) {
    const side = craft(e, group(parent, x, 0, z, a)), n = Math.ceil(w / .43);
    for (let row = 0; row < 2; row++) for (let i = 0; i <= n; i++) {
      const start = Math.max(0, i - row * .5), end = Math.min(n, i + 1 - row * .5);
      if (end > start) side.box((end - start) * w / n - .012, .105, .04, stone[(i + row) % 2], -w / 2 + (start + end) * w / n / 2, .17 + row * .112, 0);
    }
    side.box(w + .08, .055, .085, trim, 0, .34, .025);
  }
  for (const x of [-width / 2 + .025, width / 2 - .025]) for (const z of [-depth / 2 + .025, depth / 2 - .025])
    k.box(.11, wallHeight - .27, .11, trim, x, (wallHeight + .38) / 2, z);
}
function windowFrame(e, parent, { x = 0, y = 1.12, z, angle = 0, width = .62, height = .64, glass = '#a2c3bd', shutters, flowers = false, glow = false }) {
  const g = group(parent, x, y, z, angle), k = craft(e, g), trim = '#f0e3c3';
  k.box(width, height, .035, '#718678', 0, 0, .02);
  const panes = k.box(width - .075, height - .075, .035, glass, 0, 0, .045);
  if (glow) { panes.material.emissive.copy(panes.material.color); panes.material.emissiveIntensity = .55; }
  for (const px of [-width / 2, width / 2]) k.box(.055, height + .09, .12, trim, px, 0, .04);
  for (const py of [-height / 2, height / 2]) k.box(width + .055, .055, .12, trim, 0, py, .04);
  k.box(.033, height, .105, trim, 0, 0, .079);
  k.box(width, .033, .105, trim, 0, .025, .079);
  k.box(width + .18, .065, .22, '#b3936d', 0, -height / 2 - .064, .07);
  if (shutters) for (const sign of [-1, 1]) {
    const sx = sign * (width / 2 + .14);
    k.box(.19, height + .04, .045, tint(shutters, -.08), sx, 0, .038);
    for (let i = 0; i < 6; i++) k.box(.16, .065, .04, shutters, sx, -height / 2 + .055 + i * (height - .05) / 6, .072).rotation.x = -.18;
    for (const py of [-height / 2 + .075, height / 2 - .075]) k.box(.08, .025, .025, '#667166', sign * (width / 2 + .04), py, .097);
  }
  if (flowers) {
    k.box(width + .2, .14, .25, '#b3936d', 0, -height / 2 - .19, .08);
    k.box(width + .25, .035, .29, '#d0b48a', 0, -height / 2 - .1, .08);
    k.box(width + .14, .018, .17, '#78674c', 0, -height / 2 - .079, .08);
    for (let i = 0; i < 4; i++) {
      const px = -width / 2 + .08 + i * (width - .16) / 3;
      k.ball(.065, '#829667', px, -height / 2 - .05, .1);
      for (let j = 0; j < 3; j++) k.ball(.033, i % 2 ? '#e3b19e' : '#ead391', px + Math.cos(j * 2.1) * .033, -height / 2 + .012, .1 + Math.sin(j * 2.1) * .033);
    }
  }
  return g;
}
function attic(e, parent, width, y, z, glass = '#a2c3bd') {
  const k = craft(e, parent), radius = width / 2;
  k.cyl(radius, radius, .07, '#b3936d', 0, y, z, 20).rotation.x = Math.PI / 2;
  k.cyl(radius - .035, radius - .035, .03, '#f0e3c3', 0, y, z + .042, 20).rotation.x = Math.PI / 2;
  k.cyl(radius - .065, radius - .065, .024, glass, 0, y, z + .062, 20).rotation.x = Math.PI / 2;
  k.box(.024, width - .13, .025, '#f0e3c3', 0, y, z + .08);
  k.box(width - .13, .024, .025, '#f0e3c3', 0, y, z + .08);
}
function door(e, parent, x, z, color, { width = .6, height = 1.24, ajar = false } = {}) {
  const k = craft(e, parent), bottom = .22, center = bottom + height / 2;
  k.box(width + .07, height + .03, .045, '#655f4d', x, center, z);
  for (const px of [x - width / 2 - .04, x + width / 2 + .04]) k.box(.065, height + .11, .13, '#e5d4b1', px, center, z + .025);
  k.box(width + .15, .075, .14, '#e5d4b1', x, bottom + height + .025, z + .025);
  k.box(width + .15, .065, .28, '#c5b9a0', x, bottom - .025, z + .045);
  const panel = group(parent, x - width / 2, center, z + .045, ajar ? -.2 : 0), leaf = craft(e, panel);
  leaf.box(width, height, .065, color, width / 2, 0, 0);
  for (const y of [-.32, .12]) {
    leaf.box(width - .13, .32, .028, tint(color, -.08), width / 2, y, .04);
    leaf.box(width - .18, .265, .02, color, width / 2, y, .063);
  }
  leaf.box(.19, .025, .025, '#c5ac76', width / 2, .4, .043);
  leaf.box(.065, .14, .021, '#c5ac76', width - .08, -.03, .047);
  leaf.ball(.032, '#d9c58e', width - .075, -.015, .083);
  for (const y of [-.42, .4]) leaf.box(.08, .035, .025, '#667166', .05, y, .043);
}
function lantern(e, parent, x, y, z) {
  const k = craft(e, parent), metal = '#667166';
  const glass = k.box(.11, .17, .11, '#f6d995', x, y, z);
  glass.material.emissive.copy(glass.material.color); glass.material.emissiveIntensity = .7;
  for (const px of [-.065, .065]) for (const pz of [-.065, .065]) k.box(.018, .21, .018, metal, x + px, y, z + pz);
  k.cyl(0, .125, .085, metal, x, y + .145, z, 4).rotation.y = Math.PI / 4;
  k.box(.15, .025, .15, metal, x, y - .11, z);
  k.box(.025, .15, .025, metal, x, y + .23, z);
  k.box(.025, .025, .18, metal, x, y + .295, z - .055);
}
function porch(e, parent, { width, depth, z, base, rise, color }) {
  const g = group(parent, 0, 0, z), k = craft(e, g), wood = '#b3936d';
  for (const px of [-width / 2 + .1, width / 2 - .1]) {
    k.box(.08, base - .16, .08, wood, px, (base + .16) / 2, depth / 2 - .07);
    k.box(.15, .08, .15, '#c5b9a0', px, .23, depth / 2 - .07);
    beam(k, [px, base - .35, depth / 2 - .07], [px + (px > 0 ? -.24 : .24), base - .04, depth / 2 - .07], .055, .055, wood);
  }
  for (const side of [-1, 1]) k.box(.075, .08, depth, wood, side * (width / 2 - .1), base - .08, 0);
  k.box(width, .09, .085, wood, 0, base - .08, depth / 2 - .07);
  roof(e, g, { width, depth, base, rise, color, gable: false, rows: 4 });
}
function step(e, parent, width, z) {
  const k = craft(e, parent);
  k.box(width + .18, .08, .82, '#c5b9a0', 0, .055, z + .12);
  k.box(width, .1, .59, '#b3936d', 0, .15, z);
  for (let i = 0; i < 7; i++) k.box(width / 7 - .012, .035, .6, '#d0b48a', -width / 2 + (i + .5) * width / 7, .218, z);
}

export function buildExterior(e, parent, exterior, x = 0, z = -2.1) {
  const g = group(parent, x, 0, z), k = craft(e, g);
  const wall = EXTERIOR.wall[exterior.wall].color, top = EXTERIOR.roof[exterior.roof].color, timber = EXTERIOR.door[exterior.door].color;
  k.box(3, 1.85, 2.25, wall, 0, .96, 0);
  foundation(e, g, 3, 2.25, 1.88);
  const cover = roof(e, g, { width: 3, depth: 2.25, base: 1.88, rise: .92, wall, color: top });
  attic(e, g, .44, 2.3, 1.16);
  door(e, g, 0, 1.145, timber);
  for (const wx of [-.98, .98]) windowFrame(e, g, { x: wx, z: 1.145, shutters: timber, flowers: true });
  for (const sign of [-1, 1]) {
    windowFrame(e, g, { x: sign * 1.52, y: 1.15, z: -.1, angle: sign * Math.PI / 2, width: .7, height: .66 });
    k.cyl(.035, .035, 2.67, '#8a9a89', sign * cover.run, cover.eave - .055, 0, 8).rotation.x = Math.PI / 2;
  }
  windowFrame(e, g, { x: .62, y: 1.12, z: -1.145, angle: Math.PI, width: .56, height: .57 });
  k.cyl(.035, .035, cover.eave - .18, '#8a9a89', -cover.run, (cover.eave + .18) / 2, 1.22, 8);
  beam(k, [-cover.run, .18, 1.22], [-cover.run, .12, 1.36], .055, .055, '#8a9a89');
  // Brick courses, roof flashing, a dark flue and four separate coping stones.
  k.box(.47, .79, .44, '#d7c3a4', .92, 2.62, -.45);
  for (let row = 0; row < 5; row++) {
    const y = 2.31 + row * .145;
    for (const sign of [-1, 1]) {
      k.box(.48, .02, .018, '#b3936d', .92, y, -.45 + sign * .23);
      k.box(.018, .02, .44, '#b3936d', .92 + sign * .244, y, -.45);
      k.box(.014, .12, .018, '#b3936d', .92 + (row % 2 ? .08 : -.08), y + .065, -.45 + sign * .23);
    }
  }
  k.box(.54, .035, .52, '#8a9a89', .92, 2.25, -.45).rotation.z = -cover.angle;
  k.box(.32, .025, .29, '#655f4d', .92, 3.04, -.45);
  for (const sign of [-1, 1]) {
    k.box(.13, .11, .57, '#c5b9a0', .92 + sign * .23, 3.08, -.45);
    k.box(.33, .11, .12, '#c5b9a0', .92, 3.08, -.45 + sign * .225);
  }
  step(e, g, 1.62, 1.48);
  if (exterior.porch === 'canopy') porch(e, g, { width: 1.82, depth: .94, z: 1.6, base: 1.78, rise: .29, color: top });
  lantern(e, g, .43, 1.55, 1.31);
  return g;
}

export function buildLibrary(e, parent, level, x = 0, z = 0) {
  const g = group(parent, x, 0, z), k = craft(e, g);
  const wall = level ? '#e6d8b5' : '#b9b49a', top = level === 3 ? '#688b7d' : '#87968a';
  k.box(3, 1.8, 2.3, wall, 0, 1, 0);
  foundation(e, g, 3, 2.3, 1.92, '#d8c6a1');
  roof(e, g, { width: 3, depth: 2.3, base: 1.92, rise: .88, wall, color: top });
  attic(e, g, .43, 2.34, 1.18, level === 3 ? '#f8d48b' : '#a2c3bd');
  door(e, g, 0, 1.17, level ? '#6e8e7d' : '#8d8875', { width: .65, ajar: level > 0 });
  for (const wx of [-1, 1]) {
    windowFrame(e, g, { x: wx, y: 1.2, z: 1.17, width: .7, height: .77, glass: level === 3 ? '#f8d48b' : '#a2c3bd', glow: level === 3 });
    if (!level) for (const [y, angle] of [[1, .13], [1.36, -.11]]) {
      k.box(.92, .12, .055, '#a18a66', wx, y, 1.33).rotation.z = angle;
      for (const sign of [-1, 1]) k.ball(.017, '#667166', wx + sign * .3, y + sign * .3 * Math.sin(angle), 1.37);
    }
  }
  for (const sign of [-1, 1]) windowFrame(e, g, { x: sign * 1.52, z: -.13, angle: sign * Math.PI / 2, width: .72, height: .74, glass: level === 3 ? '#f8d48b' : '#a2c3bd', glow: level === 3 });
  k.box(1.18, .25, .095, '#d8c6a1', 0, 1.79, 1.2);
  k.box(1.08, .185, .03, '#f0e3c3', 0, 1.79, 1.26);
  for (let i = 0; i < 3; i++) {
    const color = ['#829667', '#bd946d', '#8aaca1'][i];
    const book = k.box(.13, .14, .02, color, -.2 + i * .2, 1.79, 1.288); book.rotation.z = (i - 1) * -.09;
    k.box(.09, .015, .025, '#f0e3c3', -.2 + i * .2, 1.76, 1.3);
  }
  step(e, g, 1.23, 1.52);
  if (!level) for (let i = 0; i < 3; i++) k.box(.65, .06, .18, '#a18a66', -.68 + i * .43, .26, 1.64).rotation.y = .2 + i * .3;
  if (level >= 2) {
    const shelf = group(g, -1.08, 0, 1.61), s = craft(e, shelf);
    s.box(.69, .81, .05, '#b3936d', 0, .59, -.17);
    for (const x of [-.37, .37]) s.box(.055, .82, .38, '#b3936d', x, .59, 0);
    for (const y of [.18, .55, .97]) s.box(.79, .055, .39, '#d0b48a', 0, y, 0);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      const h = .22 + (i % 3) * .035, bx = -.28 + i * .11, by = .22 + row * .38 + h / 2;
      s.box(.075, h, .24, ['#aabe9b', '#dab992', '#8cacba'][i % 3], bx, by, .015);
      for (const offset of [-.065, .065]) s.box(.062, .012, .015, '#f0e3c3', bx, by + offset, .143);
    }
    for (let i = 0; i < 3; i++) k.box(1.17, .065, .115, '#d0b48a', 1, .46, 1.51 + i * .13);
    for (const px of [.55, 1.44]) {
      k.box(.055, .4, .35, '#667166', px, .24, 1.65);
      k.box(.045, .28, .045, '#667166', px, .67, 1.44).rotation.x = -.12;
    }
    for (const y of [.64, .79]) k.box(1.22, .09, .06, '#b3936d', 1, y, 1.41);
  }
  if (level >= 3) {
    porch(e, g, { width: 3.32, depth: .86, z: 1.66, base: 1.94, rise: .23, color: top });
    for (const px of [-1.42, 1.42]) lantern(e, g, px, 1.59, 1.9);
  }
  return g;
}

export function buildAtelier(e, parent) {
  const g = group(parent), k = craft(e, g), wall = '#f0e2c4', top = '#789794';
  k.box(1.9, 1.5, 1.65, wall, 0, .84, 0);
  foundation(e, g, 1.9, 1.65, 1.57);
  const cover = roof(e, g, { width: 1.9, depth: 1.65, base: 1.57, rise: .83, wall, color: top, rows: 5 });
  windowFrame(e, g, { x: -.46, y: 1.04, z: .85, width: .66, height: .67 });
  door(e, g, .49, .85, '#a78561', { width: .43, height: 1.01 });
  windowFrame(e, g, { x: .97, y: 1.07, z: -.06, angle: Math.PI / 2, width: 1.03, height: .78 });
  attic(e, g, .39, 1.98, .855);
  // A framed skylight follows the slope; daylight is suggested with opaque glass.
  const sx = .39, sy = cover.peak - sx * Math.tan(cover.angle) + .09;
  k.box(.44, .055, .77, '#d5bf99', sx, sy, -.3).rotation.z = -cover.angle;
  k.box(.36, .025, .68, '#a2c3bd', sx + .012, sy + .027, -.3).rotation.z = -cover.angle;
  k.box(.025, .035, .7, '#f0e3c3', sx + .018, sy + .05, -.3).rotation.z = -cover.angle;
  step(e, g, 1.64, 1.03);
  k.box(.79, .075, .36, '#b3936d', -.49, .5, 1.03);
  for (const x of [-.79, -.22]) k.box(.045, .31, .24, '#b3936d', x, .31, 1.03);
  for (let i = 0; i < 3; i++) {
    const px = -.76 + i * .25;
    k.cyl(.065, .06, .13, ['#829667', '#e3b19e', '#8aaca1'][i], px, .62, 1.04, 10);
    k.cyl(.048, .048, .012, '#655f4d', px, .693, 1.04, 10);
    for (const shift of [-.018, .018]) {
      beam(k, [px + shift, .66, 1.04], [px + shift * 2, .87, 1.04], .016, .016, '#d0b48a');
      k.box(.02, .04, .02, '#655f4d', px + shift * 2, .87, 1.04);
    }
  }
  lantern(e, g, .83, 1.34, .96);
  return g;
}

export function buildWoodshop(e, parent) {
  const g = group(parent), k = craft(e, g), wood = '#dbc49b', top = '#698476';
  k.box(1.65, 1.25, 1.3, wood, 0, .73, 0);
  foundation(e, g, 1.65, 1.3, 1.34, '#b3936d');
  roof(e, g, { width: 1.65, depth: 1.3, base: 1.34, rise: .66, wall: wood, color: top, rows: 5 });
  for (const [w, x, z, a] of [[1.65, 0, .665, 0], [1.3, .84, 0, Math.PI / 2], [1.3, -.84, 0, -Math.PI / 2], [1.65, 0, -.665, Math.PI]]) {
    const face = craft(e, group(g, x, 0, z, a));
    for (let i = 0; i < 6; i++) face.box(w, .025, .015, '#b3936d', 0, .42 + i * .145, 0);
  }
  windowFrame(e, g, { x: -.43, y: .98, z: .684, width: .51, height: .47 });
  door(e, g, .37, .68, '#907047', { width: .43, height: .89 });
  windowFrame(e, g, { x: .848, y: .92, z: -.05, angle: Math.PI / 2, width: .55, height: .49 });
  k.box(.59, .19, .08, '#d0b48a', 0, 1.51, .755);
  k.box(.19, .035, .025, '#667166', -.055, 1.5, .803);
  k.box(.035, .09, .025, '#667166', -.135, 1.525, .803);
  k.box(1.12, .09, .48, '#b3936d', 0, .64, 1.05);
  for (const x of [-.43, .43]) {
    for (const z of [.89, 1.22]) k.box(.055, .54, .055, '#907047', x, .33, z);
    k.box(.065, .07, .38, '#907047', x, .26, 1.05);
  }
  k.box(.87, .045, .21, '#d0b48a', -.04, .73, 1.04);
  for (const y of [.72, .87]) k.box(.08, .035, .19, '#667166', .44, y, 1.15);
  k.cyl(.018, .018, .23, '#667166', .44, .8, 1.16, 8);
  k.box(.17, .024, .024, '#667166', .44, .94, 1.16);
  k.box(.045, .22, .045, '#907047', -.37, .9, 1.06).rotation.z = -.22;
  k.box(.19, .06, .075, '#667166', -.395, 1.02, 1.06);
  for (let i = 0; i < 3; i++) {
    k.box(.17, .115, 1.02, '#b3936d', -1.02, .16 + i * .14, .03);
    k.box(.135, .078, .018, '#d0b48a', -1.02, .16 + i * .14, .55);
    k.box(.079, .035, .02, '#b3936d', -1.02, .16 + i * .14, .563);
  }
  lantern(e, g, .76, 1.13, .79);
  return g;
}
