#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const plist = require('./../app/node_modules/plist');
const xcode = require('./../app/node_modules/xcode');

export const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const paths = {
  app: path.join(root, 'app'),
  dist: path.join(root, 'app/dist'),
  lock: path.join(root, 'app/package-lock.json'),
  index: path.join(root, 'docs/THIRD-PARTY-LICENSES.json'),
  licenses: path.join(root, 'app/public/licenses'),
  manifest: path.join(root, 'app/public/etchings/manifest.json'),
  privacy: path.join(root, 'app/ios/App/App/PrivacyInfo.xcprivacy'),
  info: path.join(root, 'app/ios/App/App/Info.plist'),
  pbx: path.join(root, 'app/ios/App/App.xcodeproj/project.pbxproj'),
  resolved: path.join(root, 'app/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'),
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const bytes = (file) => fs.readFileSync(file);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message) => { throw new Error(message); };
const exists = (file) => fs.existsSync(file);
const rel = (file) => path.relative(root, file);

function repositoryUrl(repository) {
  let value = typeof repository === 'object' ? repository?.url : repository;
  if (!value) return null;
  value = value.replace(/^git\+/, '').replace(/\.git$/, '');
  if (!/^https?:\/\//.test(value)) value = `https://github.com/${value}`;
  return value;
}

export function productionPackages(lock) {
  return Object.entries(lock.packages)
    .filter(([name, pkg]) => name.startsWith('node_modules/') && pkg.dev !== true && pkg.optional !== true)
    .map(([name, pkg]) => ({ name: name.slice('node_modules/'.length), version: pkg.version, license: pkg.license }))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export function installedPackage(name) {
  return readJson(path.join(paths.app, 'node_modules', name, 'package.json'));
}

function licenseFile(name) {
  const dir = path.join(paths.app, 'node_modules', name);
  const file = fs.readdirSync(dir).find((entry) => /^(?:license|notice)(?:\.|$)/i.test(entry));
  return file ? path.join(dir, file) : null;
}

export function parsePlist(file) {
  try { return plist.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${rel(file)} is not a valid plist: ${error.message}`); }
}

export function xcodeResourceNames(file) {
  const project = xcode.project(file);
  project.parseSync();
  const appTarget = project.findTargetKey('App');
  if (!appTarget) throw new Error('App native target is missing');
  const phase = project.pbxResourcesBuildPhaseObj(appTarget);
  const refs = project.pbxFileReferenceSection();
  const files = project.pbxBuildFileSection();
  return phase.files.map(({ value }) => {
    const build = files[value];
    const ref = build && refs[build.fileRef];
    return ref?.path || ref?.name || build?.fileRef_comment || phase.files.find((entry) => entry.value === value)?.comment;
  }).filter(Boolean);
}

export function verifyRelease({ rootDir = root, distDir = path.join(rootDir, 'app/dist') } = {}) {
  const projectPaths = {
    app: path.join(rootDir, 'app'),
    privacy: path.join(rootDir, 'app/ios/App/App/PrivacyInfo.xcprivacy'),
    info: path.join(rootDir, 'app/ios/App/App/Info.plist'),
    pbx: path.join(rootDir, 'app/ios/App/App.xcodeproj/project.pbxproj'),
    resolved: path.join(rootDir, 'app/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'),
    manifest: path.join(rootDir, 'app/public/etchings/manifest.json'),
  };
  const installed = (name) => readJson(path.join(projectPaths.app, 'node_modules', name, 'package.json'));
  const installedLicense = (name) => {
    const dir = path.join(projectPaths.app, 'node_modules', name);
    const file = fs.readdirSync(dir).find((entry) => /^(?:license|notice)(?:\.|$)/i.test(entry));
    return file ? path.join(dir, file) : null;
  };
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const index = readJson(path.join(rootDir, 'docs/THIRD-PARTY-LICENSES.json'));
  const lock = readJson(path.join(rootDir, 'app/package-lock.json'));
  const packages = productionPackages(lock);
  const indexed = [...(index.runtime || [])].map((entry) => entry.name).sort();
  const packageNames = packages.map((pkg) => pkg.name);
  check(JSON.stringify(packageNames) === JSON.stringify(indexed), `runtime license index differs from lockfile (${packages.length} vs ${indexed.length})`);

  for (const packageRecord of packages) {
    const name = packageRecord.name;
    const entry = index.runtime.find((item) => item.name === name);
    const pkg = installed(name);
    const source = installedLicense(name);
    check(Boolean(entry), `missing runtime index entry ${name}`);
    if (!entry) continue;
    check(entry.version === packageRecord.version, `${name} version differs from lockfile`);
    check(entry.license === packageRecord.license, `${name} license differs from lockfile`);
    check(entry.version === pkg.version, `${name} version differs from installed package`);
    check(entry.license === pkg.license, `${name} license differs from installed package`);
    check(entry.source === repositoryUrl(pkg.repository), `${name} source differs from installed repository`);
    check(Boolean(source), `${name} has no installed LICENSE/NOTICE file`);
    const asset = path.join(rootDir, entry.text || '');
    check(exists(asset), `${name} missing published license text ${entry.text}`);
    if (source && exists(asset)) {
      const sourceBytes = bytes(source);
      const assetBytes = bytes(asset);
      check(Buffer.compare(sourceBytes, assetBytes) === 0, `${name} published license bytes differ from installed source`);
      check(entry.sha256 === sha256(sourceBytes), `${name} license sha256 differs from source`);
    }
    check(/^https:\/\//.test(entry.source || ''), `${name} source URL must be HTTPS`);
  }

  const resolved = readJson(projectPaths.resolved);
  const pin = resolved.pins.find((item) => item.identity === 'capacitor-swift-pm');
  check(Boolean(pin), 'Package.resolved is missing capacitor-swift-pm pin');
  const native = Array.isArray(index.native) ? index.native : [];
  const nativeProducts = native.map((entry) => entry.product).sort();
  check(JSON.stringify(nativeProducts) === JSON.stringify(['Capacitor', 'Cordova']), 'native license index must contain exactly Capacitor and Cordova');
  for (const entry of native) {
    check(entry.version === pin?.state?.version, `${entry.name} SwiftPM version differs from Package.resolved`);
    check(entry.revision === pin?.state?.revision, `${entry.name} SwiftPM revision differs from Package.resolved`);
    check(entry.source === pin?.location, `${entry.name} SwiftPM source differs from Package.resolved`);
    const asset = path.join(rootDir, entry.text || '');
    check(exists(asset), `${entry.name} missing published license text`);
    if (exists(asset)) check(entry.sha256 === sha256(bytes(asset)), `${entry.name} license sha256 is stale`);
    check(entry.product === 'Capacitor' ? entry.license === 'MIT' : entry.product === 'Cordova' ? entry.license === 'Apache-2.0' : false, `${entry.name} license does not match verified native source`);
    check(['Capacitor', 'Cordova'].includes(entry.product), `${entry.name} must identify its binary product`);
  }

  const privacy = parsePlist(projectPaths.privacy);
  check(privacy.NSPrivacyTracking === false, 'PrivacyInfo.xcprivacy must disable tracking');
  check(Array.isArray(privacy.NSPrivacyCollectedDataTypes) && privacy.NSPrivacyCollectedDataTypes.length === 0, 'Privacy manifest collected data must be empty');
  check(Array.isArray(privacy.NSPrivacyAccessedAPITypes) && privacy.NSPrivacyAccessedAPITypes.length === 0, 'Privacy manifest accessed APIs must be empty');
  const info = parsePlist(projectPaths.info);
  check(info.CFBundleIdentifier === '$(PRODUCT_BUNDLE_IDENTIFIER)', 'Info.plist bundle identifier changed');
  check(typeof info.CFBundleDisplayName === 'string' && info.CFBundleDisplayName.length > 0, 'Info.plist display name missing');
  let resources = [];
  try { resources = xcodeResourceNames(projectPaths.pbx); } catch (error) { errors.push(`cannot parse Xcode project: ${error.message}`); }
  check(resources.includes('PrivacyInfo.xcprivacy'), 'PrivacyInfo.xcprivacy is not referenced by App Resources');

  const manifest = readJson(projectPaths.manifest);
  check(Array.isArray(manifest) && manifest.length > 0, 'etchings manifest is empty or invalid');
  for (const entry of manifest) {
    const source = path.join(projectPaths.app, 'public/etchings', entry.file);
    const output = path.join(distDir, 'etchings', entry.file);
    check(exists(source), `missing etching source ${entry.file}`);
    check(exists(output), `missing dist etching ${entry.file}`);
    if (exists(source)) {
      check(bytes(source).length === entry.bytes, `${entry.file} source byte length differs from manifest`);
      check(entry.sha256 ? sha256(bytes(source)) === entry.sha256 : true, `${entry.file} source hash differs from manifest`);
    }
    if (exists(output)) {
      check(bytes(output).length === entry.bytes, `${entry.file} dist byte length differs from manifest`);
      check(exists(source) && Buffer.compare(bytes(source), bytes(output)) === 0, `${entry.file} dist bytes differ from source`);
    }
  }
  const indexHtml = path.join(distDir, 'index.html');
  check(exists(indexHtml), 'dist/index.html is missing');
  check(exists(path.join(rootDir, 'LICENSE')), 'root LICENSE is missing');
  const licenseFiles = [...(index.runtime || []), ...(index.native || []), ...(index.source || [])].map((entry) => entry.text).filter(Boolean);
  for (const text of licenseFiles) {
    const source = path.join(rootDir, text);
    const output = path.join(distDir, text.replace(/^app\/public\//, ''));
    check(exists(output), `dist is missing license ${text}`);
    if (exists(source) && exists(output)) check(Buffer.compare(bytes(source), bytes(output)) === 0, `dist license differs from source ${text}`);
  }
  for (const entry of index.source || []) {
    const source = path.join(rootDir, entry.text || '');
    check(exists(source), `source license text is missing ${entry.text}`);
    if (exists(source) && entry.sha256) check(entry.sha256 === sha256(bytes(source)), `source license sha256 is stale ${entry.text}`);
  }
  const forbidden = ['furnished', 'map-navigation', 'fixture reset'];
  if (exists(distDir)) {
    for (const file of fs.readdirSync(distDir, { recursive: true })) {
      const full = path.join(distDir, file);
      if (fs.statSync(full).isFile() && /\.(?:js|html|css|json)$/.test(file)) {
        const text = fs.readFileSync(full, 'utf8');
        for (const marker of forbidden) check(!text.includes(marker), `production bundle contains QA marker ${marker} in ${path.relative(root, full)}`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { runtimePackages: packages.length, etchings: manifest.length, resources };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const result = verifyRelease({ distDir: process.argv[2] ? path.resolve(process.argv[2]) : paths.dist }); console.log(`release assets OK: ${result.etchings} etchings, ${result.runtimePackages} runtime packages, Privacy Manifest included`); }
  catch (error) { console.error(`release check failed:\n${error.message}`); process.exitCode = 1; }
}
