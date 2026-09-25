import { QA } from '../game/qa.js';
import { createWebStorage } from './storage.js';
let driver = createWebStorage(() => globalThis.localStorage, QA);
export const persistence = {
  get kind() { return driver.kind; },
  get notice() { return driver.notice || ''; },
  load: () => driver.load(),
  save: text => driver.save(text),
  purge: () => driver.purge ? driver.purge() : undefined,
};
export function useStorageDriver(next) { driver = next; }
