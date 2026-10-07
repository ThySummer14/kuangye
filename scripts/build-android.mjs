import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npm', ['run', 'build']);
run('npm', ['run', 'check:release']);
run('npx', ['--no-install', 'cap', 'sync', 'android'], path.join(root, 'app'));
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug', 'lintDebug'], path.join(root, 'app/android'));
const output = path.join(root, 'output/android');
mkdirSync(output, { recursive: true });
const apk = path.join(output, 'kuangye-android-preview.apk');
copyFileSync(path.join(root, 'app/android/app/build/outputs/apk/debug/app-debug.apk'), apk);
const sha = createHash('sha256').update(readFileSync(apk)).digest('hex');
writeFileSync(path.join(output, 'kuangye-android-preview.sha256'), `${sha}  kuangye-android-preview.apk\n`);
console.log(`Android preview: ${apk}\nSHA-256: ${sha}`);
