import { cpSync, mkdirSync, rmSync } from "node:fs";
// Only replaces this build's generated root output. The Vue checkout stays in app/.
rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
mkdirSync(new URL("../dist", import.meta.url), { recursive: true });
cpSync(
  new URL("../app/dist/", import.meta.url),
  new URL("../dist/", import.meta.url),
  { recursive: true },
);
