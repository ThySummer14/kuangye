import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const result=spawnSync(process.env.HOME+'/.codex/skills/playwright/scripts/playwright_cli.sh',['-s=kuangye-portfolio','run-code',readFileSync('scripts/qa-portfolio-release.js','utf8').trim()],{encoding:'utf8'});
const output=result.stdout+result.stderr;writeFileSync('output/portfolio-release-browser.txt',output);console.log(output);
if(result.status||/### Error/.test(output))process.exit(1);
