import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyRelease } from '../../scripts/check-release-assets.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), '旷野-release-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const relative of ['app/public', 'app/ios/App/App', 'app/ios/App/App.xcodeproj', 'docs']) {
    fs.cpSync(path.join(root, relative), path.join(dir, relative), { recursive: true, filter: source => !source.includes('/App/public') });
  }
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(dir, 'LICENSE'));
  fs.copyFileSync(path.join(root, 'app/package-lock.json'), path.join(dir, 'app/package-lock.json'));
  fs.symlinkSync(path.join(root, 'app/node_modules'), path.join(dir, 'app/node_modules'), 'dir');
  const dist = path.join(dir, 'app/dist');
  fs.cpSync(path.join(root, 'app/public'), dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>fixture</title>');
  return { rootDir: dir, distDir: dist };
}

test('release checker accepts isolated inputs without a prior build', t => {
  const result = verifyRelease(fixture(t));
  assert.equal(result.runtimePackages, 28);
  assert.ok(result.resources.includes('PrivacyInfo.xcprivacy'));
});
test('CLI actually executes on Chinese paths and rejects missing dist index', t => {
  const f = fixture(t);
  const args = [path.join(root, 'scripts/check-release-assets.mjs'), f.distDir];
  const ok = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /release assets OK:/);
  fs.unlinkSync(path.join(f.distDir, 'index.html'));
  const bad = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /dist\/index.html is missing/);
});
test('release gate rejects same-length asset changes', t => {
  const f = fixture(t), target = path.join(f.distDir, 'etchings/01-gilded.webp');
  const data = fs.readFileSync(target); data[0] ^= 0xff; fs.writeFileSync(target, data);
  assert.throws(() => verifyRelease(f), /dist bytes differ from source/);
});
test('release gate rejects indexed version drift without modifying repository', t => {
  const f = fixture(t), file = path.join(f.rootDir, 'docs/THIRD-PARTY-LICENSES.json');
  const index = JSON.parse(fs.readFileSync(file)); index.runtime[0].version = 'invalid';
  fs.writeFileSync(file, JSON.stringify(index));
  assert.throws(() => verifyRelease(f), /version differs from lockfile/);
});
test('release gate rejects missing native licenses and fixture code', t => {
  const f = fixture(t), file = path.join(f.rootDir, 'docs/THIRD-PARTY-LICENSES.json');
  const index = JSON.parse(fs.readFileSync(file)); index.native = [];
  fs.writeFileSync(file, JSON.stringify(index));
  fs.writeFileSync(path.join(f.distDir, 'fixture.js'), 'const scenario = "map-navigation";');
  assert.throws(() => verifyRelease(f), error => /exactly Capacitor and Cordova/.test(error.message) && /QA marker/.test(error.message));
});
