import { createApp } from 'vue'
import { initializeNativeStorage, nativePlatform } from './services/native.js'
import './style.css'
import './world.css'

// App.vue (and therefore store.js) must not be evaluated until the storage
// driver holds the restored save: the store snapshots state at module load.
// Native waits for the Application Support files; web resolves immediately.
function showStartupError(error) {
  const root = document.querySelector('#app');
  const title = document.createElement('h1');
  title.textContent = '先保住你的记录';
  const message = document.createElement('p');
  message.textContent = `暂时无法读取存档：${error.message}。没有覆盖原文件，请勿卸载或清理数据。`;
  const retry = document.createElement('button');
  retry.className = 'primary-button';
  retry.textContent = '重新读取';
  retry.onclick = () => location.reload();
  root.className = 'startup-error';
  root.replaceChildren(title, message, retry);
}

async function start() {
  try {
    await initializeNativeStorage();
    const { default: App } = await import('./App.vue');
    createApp(App).mount('#app');
  } catch (error) {
    if (nativePlatform) showStartupError(error);
    else throw error;
  }
}
start();
