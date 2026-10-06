import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const skillRoot=process.env.CODEX_HOME || `${process.env.HOME}/.codex`;
const result=spawnSync(`${skillRoot}/skills/playwright/scripts/playwright_cli.sh`,['-s=kuangye-challenger','run-code',readFileSync('scripts/qa-challenger.js','utf8').trim()],{encoding:'utf8'});
const output=result.stdout+result.stderr, match=output.match(/### Result\n([^\n]+)/);
const summary=match?JSON.parse(match[1]):{error:output};
writeFileSync('output/challenger-browser.txt',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
if(result.status || summary.results?.length!==4 || summary.results.some(r=>r.status!=='PASS'))process.exit(1);
