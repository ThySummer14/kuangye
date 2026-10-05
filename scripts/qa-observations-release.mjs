import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { OBSERVATION_DRAFTS } from '../app/src/data/observation-drafts.js';
const code=readFileSync('scripts/qa-observations-release.js','utf8').trim().replace('__OBSERVATION_HINT__',JSON.stringify(OBSERVATION_DRAFTS[0].note));
const r=spawnSync(process.env.HOME+'/.codex/skills/playwright/scripts/playwright_cli.sh',['-s=kuangye-portfolio','run-code',code],{encoding:'utf8'});
const output=r.stdout+r.stderr;writeFileSync('output/observations-release-browser.txt',output);console.log(output);
if(r.status||/### Error/.test(output))process.exit(1);
