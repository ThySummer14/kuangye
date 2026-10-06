import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const codexHome = process.env.CODEX_HOME || `${process.env.HOME}/.codex`;
const result = spawnSync(`${codexHome}/skills/playwright/scripts/playwright_cli.sh`, [
  '-s=kuangye-return', 'run-code', readFileSync('scripts/qa-map-work-return.js', 'utf8').trim(),
], { encoding: 'utf8' });
const output = result.stdout + result.stderr;
const match = output.match(/### Result\n([^\n]+)/);
const summary = match ? `${JSON.stringify(JSON.parse(match[1]), null, 2)}\n` : output;
mkdirSync('output', { recursive: true });
writeFileSync('output/map-work-return-browser.txt', summary);
console.log(summary);
if (result.status || /### Error/.test(output)) process.exit(1);
if (!match || JSON.parse(match[1]).results?.length !== 4 || JSON.parse(match[1]).results.some(r => r.status !== 'PASS')) process.exit(1);
