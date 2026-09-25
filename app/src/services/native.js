import { Capacitor, registerPlugin } from '@capacitor/core';
import { createFileStorage } from './storage.js';
import { useStorageDriver } from './persistence.js';
export const nativePlatform = Capacitor.isNativePlatform();
export async function initializeNativeStorage() {
  if (!nativePlatform) return;
  const files = registerPlugin('KuangyeStorage');
  const driver = await createFileStorage({
    read: async name => (await files.read({ name })).text ?? null,
    writeAtomic: (name, text) => files.write({ name, text }),
    deleteAll: () => files.deleteAll(),
  }, localStorage);
  useStorageDriver(driver);
  document.documentElement.classList.add('native-app');
}
