import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const r=spawnSync(process.env.HOME+'/.codex/skills/playwright/scripts/playwright_cli.sh',['-s=kuangye-portfolio','run-code',readFileSync('scripts/qa-observations.js','utf8').trim()],{encoding:'utf8'});
const output=r.stdout+r.stderr;writeFileSync('output/observations-browser.txt',output);console.log(output);
if(r.status||/### Error/.test(output))process.exit(1);
