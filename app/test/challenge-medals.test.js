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

test('四种奖章都是有厚度的有限几何，法线有效且按材质合并为少量 draw meshes', () => {
  assert.equal(MEDAL_MOTIFS.length, 4);
  assert.equal(new Set(MEDAL_MOTIFS).size, 4);
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
      assert.ok(size.z > 0.5, `${motif} must have real front-to-back thickness`);

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
  assert.equal(fingerprints.size, 4, 'each motif should have distinct geometry');
});

test('释放奖章会 dispose 所有几何和材质并清空组节点', () => {
  for (const motif of MEDAL_MOTIFS) {
    const medal = buildChallengeMedal(motif);
    const geometries = new Set();
    const materials = new Set();
    medal.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
        }
      }
    });
    assert.ok(geometries.size > 0, `${motif} should own geometries`);
    assert.ok(materials.size > 0, `${motif} should own materials`);
    const disposed = new Map([...geometries, ...materials].map(resource => [resource, 0]));
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

test('未知奖章 motif 会明确拒绝', () => {
  assert.throws(() => buildChallengeMedal('unknown-motif'), /Unknown medal motif/);
});
