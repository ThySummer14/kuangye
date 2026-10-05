import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.env.HOME+'/.codex/skills/playwright/scripts/playwright_cli.sh', ['-s=kuangye-craft','run-code',readFileSync('scripts/qa-observation-craft.js','utf8').trim()], {encoding:'utf8'});
const output = result.stdout + result.stderr;
const match = output.match(/### Result\n([^\n]+)/);
const summary = match ? JSON.stringify(JSON.parse(match[1]),null,2)+'\n' : output;
writeFileSync('output/observation-craft-browser.txt',summary); console.log(summary);
if(result.status || /### Error/.test(output)) process.exit(1);
