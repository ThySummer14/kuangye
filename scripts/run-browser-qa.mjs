import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const scenario = process.argv[2] || "navigation";
if (!["navigation", "woodshop", "emotion", "home"].includes(scenario))
  throw new Error("Unknown scenario");
mkdirSync("output/playwright", { recursive: true });
const result = spawnSync(
  process.env.HOME + "/.codex/skills/playwright/scripts/playwright_cli.sh",
  [
    "-s=kuangye-batch",
    "run-code",
    readFileSync("scripts/qa-" + scenario + ".js", "utf8"),
  ],
  { encoding: "utf8" },
);
writeFileSync(
  "output/playwright/" + scenario + "-verification.txt",
  result.stdout + result.stderr,
);
console.log(result.stdout + result.stderr);
if (result.status || /### Error/.test(result.stdout)) process.exit(1);
