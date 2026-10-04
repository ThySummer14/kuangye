// 先启动 5190 dev server，并用 Playwright CLI 打开 kuangye-resting session。
// npm --prefix app run dev -- --host 127.0.0.1 --port 5190 --strictPort
// ~/.codex/skills/playwright/scripts/playwright_cli.sh -s=kuangye-resting open 'http://127.0.0.1:5190/?qa#map' --headed
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('output/playwright', { recursive: true });
const result = spawnSync(process.env.HOME + '/.codex/skills/playwright/scripts/playwright_cli.sh', [
  '-s=kuangye-resting', 'run-code', readFileSync('scripts/qa-resting.js', 'utf8').trim(),
], { encoding: 'utf8' });
const output = result.stdout + result.stderr;
writeFileSync('output/resting-browser.txt', output);
console.log(output);
if (result.status || /### Error/.test(output)) process.exit(1);
