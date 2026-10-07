import { Capacitor, registerPlugin } from '@capacitor/core';

export const androidPlatform = Capacitor.getPlatform() === 'android';

export function initializeAndroid() {
  if (!androidPlatform) return;
  document.documentElement.classList.add('android-app');
  // Android back dismisses the top modal first; the map remains the root.
  window.kuangyeAndroidBack = () => {
    const dialogs = document.querySelectorAll('dialog[open]');
    const dialog = dialogs[dialogs.length - 1];
    if (dialog) {
      if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
      return true;
    }
    if (location.hash && location.hash !== '#map') {
      location.hash = location.hash === '#challenger' ? 'tasks' : 'map';
      return true;
    }
    return false;
  };
}

export async function exportAndroidFile(data, name, mime) {
  if (!androidPlatform) return false;
  const plugin = registerPlugin('KuangyeBackup');
  if (data instanceof Blob) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(Error('未能读取导出图片'));
      reader.readAsDataURL(data);
    });
    await plugin.exportFile({ name, mime: mime.split(';')[0], base64 });
  } else {
    await plugin.exportFile({ name, mime: mime.split(';')[0], text: data });
  }
  return true;
}
