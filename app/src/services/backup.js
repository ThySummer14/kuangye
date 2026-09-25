import { Capacitor, registerPlugin } from '@capacitor/core';
import { nativePlatform } from './native.js';

export { nativePlatform };

// Backup goes through user-visible channels only: the share sheet / Documents
// folder on native, the browser download and file input on web. The JS layer
// keeps parseImport/importData semantics, so the payload format never forks.
const plugin = nativePlatform ? registerPlugin('KuangyeBackup') : null;

export async function exportBackup(name, text, { interactive = true } = {}) {
  if (!plugin) return false;
  await plugin.exportBackup({ name, text, interactive });
  return true;
}

export async function pickBackup() {
  if (!plugin) return null;
  const result = await plugin.importBackup();
  return result?.text ?? null;
}
