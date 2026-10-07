import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import {
  buildChallengeMedal,
  disposeChallengeMedal,
  MEDAL_MOTIFS,
} from '../src/scenes/challenge-medals.js';

function geometryFingerprint(root) {
  const batches = root.children.map(mesh => ({
    material: mesh.material.name,
    positions: mesh.geometry.getAttribute('position').array,
  })).sort((a, b) => a.material.localeCompare(b.material));
  const hash = createHash('sha256');
  for (const batch of batches) {
    hash.update(batch.material);
    hash.update(Buffer.from(batch.positions.buffer, batch.positions.byteOffset, batch.positions.byteLength));
  }
  return hash.digest('hex');
}

test('十八种奖章都是有厚度的有限几何，法线有效且按材质合并为少量 draw meshes', () => {
  assert.equal(MEDAL_MOTIFS.length, 18);
  assert.equal(new Set(MEDAL_MOTIFS).size, 18);
  const fingerprints = new Set();

  for (const motif of MEDAL_MOTIFS) {
    const medal = buildChallengeMedal(motif);
    try {
      medal.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(medal);
      const size = box.getSize(new THREE.Vector3());
      for (const value of [...box.min.toArray(), ...box.max.toArray(), ...size.toArray()]) {
        assert.ok(Number.isFinite(value), `${motif} bounds must be finite`);
      }
      assert.ok(size.z > 0.2, `${motif} must have real front-to-back thickness`);
      assert.ok(size.z < Math.min(size.x, size.y) * 0.2, `${motif} should be a thin die-struck medal`);

      assert.ok(medal.children.length > 0 && medal.children.length <= 8, `${motif} draw mesh count`);
      assert.ok(medal.children.every(mesh => mesh.isMesh), `${motif} batches must be meshes`);
      assert.equal(new Set(medal.children.map(mesh => mesh.material)).size, medal.children.length,
        `${motif} should have one merged mesh per material`);
      for (const mesh of medal.children) {
        const positions = mesh.geometry.getAttribute('position');
        const normals = mesh.geometry.getAttribute('normal');
        assert.ok(positions?.count > 0, `${motif}/${mesh.material.name} positions`);
        assert.ok(normals && normals.count === positions.count, `${motif}/${mesh.material.name} normals`);
        assert.ok(normals.array.every(Number.isFinite), `${motif}/${mesh.material.name} normals must be finite`);
      }
      fingerprints.add(geometryFingerprint(medal));
    } finally {
      disposeChallengeMedal(medal);
    }
  }
  assert.equal(fingerprints.size, 14, 'edition indexing produces fourteen distinct solid reverses');
});

test('释放奖章会 dispose 所有几何、材质和贴图，atlas UV 有效且组节点清空', () => {
  for (const motif of MEDAL_MOTIFS) {
    const artwork = new THREE.Texture();
    const medal = buildChallengeMedal(motif, { artwork });
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    medal.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      }
    });
    assert.ok(geometries.size > 0, `${motif} should own geometries`);
    assert.ok(materials.size > 0, `${motif} should own materials`);
    assert.ok(textures.has(artwork), `${motif} engraving material should own the supplied texture`);
    const face = medal.getObjectByName('engraved-face');
    const uv = face.geometry.getAttribute('uv');
    assert.ok(uv?.count > 0, `${motif} engraved face should have atlas UVs`);
    assert.ok(uv.array.every(value => Number.isFinite(value) && value >= 0 && value <= 1),
      `${motif} atlas UVs should stay in the valid texture range`);
    const disposed = new Map([...geometries, ...materials, ...textures].map(resource => [resource, 0]));
    for (const resource of disposed.keys()) {
      resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
    }

    disposeChallengeMedal(medal);

    assert.equal(medal.children.length, 0, `${motif} group should be clear`);
    for (const [resource, count] of disposed) {
      assert.equal(count, 1, `${motif} resource should be disposed exactly once`);
    }
  }
});

test('非恒定纹样采样会让正面顶点产生可测的高度变化', () => {
  const flat = buildChallengeMedal('summit', { sampleEngraving: () => 0 });
  let sampleCalls = 0;
  const relief = buildChallengeMedal('summit', {
    sampleEngraving: u => { sampleCalls++; return u; },
  });
  try {
    const flatPositions = flat.getObjectByName('engraved-face').geometry.getAttribute('position');
    const reliefPositions = relief.getObjectByName('engraved-face').geometry.getAttribute('position');
    assert.equal(reliefPositions.count, flatPositions.count);
    assert.ok(sampleCalls > 100, 'sampling should be applied across the face mesh');

    const zRange = positions => {
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < positions.count; i++) {
        min = Math.min(min, positions.getZ(i));
        max = Math.max(max, positions.getZ(i));
      }
      return max - min;
    };
    assert.ok(zRange(reliefPositions) > zRange(flatPositions) + .01,
      'sampled engraving should add relief beyond the flat face shoulder');
    let changedVertices = 0;
    for (let i = 0; i < reliefPositions.count; i++) {
      if (Math.abs(reliefPositions.getZ(i) - flatPositions.getZ(i)) > .005) changedVertices++;
    }
    assert.ok(changedVertices > 100, 'sampling should move many face vertices in Z');
  } finally {
    disposeChallengeMedal(flat);
    disposeChallengeMedal(relief);
  }
});

test('未知奖章 motif 会明确拒绝', () => {
  assert.throws(() => buildChallengeMedal('unknown-motif'), /Unknown medal motif/);
});
