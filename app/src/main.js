import { createApp } from 'vue'
import App from './App.vue'
import { initializeNativeStorage, nativePlatform } from './services/native.js'
import './style.css'
import './world.css'

function mount() {
  createApp(App).mount('#app');
}

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

// Web boots synchronously as before. Native waits for the save files first:
// mounting before the restore finishes would overwrite state with an empty one.
if (nativePlatform) {
  initializeNativeStorage().then(mount, showStartupError);
} else {
  mount();
}
