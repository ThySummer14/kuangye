import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTick } from 'vue';

const webFiles = new Map();
globalThis.localStorage = {
  getItem: key => webFiles.get(key) ?? null,
  setItem: (key, value) => webFiles.set(key, value),
  removeItem: key => webFiles.delete(key),
};

const { useStorageDriver } = await import('../src/services/persistence.js');
const { createFileStorage } = await import('../src/services/storage.js');
const store = await import('../src/store.js');

test('waitForSave waits for the watched native write, rejects both failure forms, and allows retry', async () => {
  const files = new Map();
  let gateNextWrite = false;
  let releaseBlockedWrite;
  let blockedWriteStarted;
  let failKey = '';
  const io = {
    read: async key => files.get(key) ?? null,
    writeAtomic: async (key, text) => {
      if (key === failKey) throw new Error('native write failed');
      if (gateNextWrite) {
        gateNextWrite = false;
        blockedWriteStarted();
        await new Promise(resolve => { releaseBlockedWrite = resolve; });
      }
      files.set(key, text);
    },
    deleteAll: async () => files.clear(),
  };
  const nativeDriver = await createFileStorage(io, globalThis.localStorage);
  useStorageDriver(nativeDriver);

  gateNextWrite = true;
  const started = new Promise(resolve => { blockedWriteStarted = resolve; });
  store.state.settings.devDate = '2026-10-06';
  let settled = false;
  const firstWait = store.waitForSave().then(
    () => { settled = true; },
    error => { settled = true; throw error; },
  );
  await nextTick();
  await started;
  assert.equal(settled, false, 'waitForSave must stay pending while native I/O is blocked');
  releaseBlockedWrite();
  await firstWait;
  assert.equal(JSON.parse(files.get('current')).state.settings.devDate, '2026-10-06');

  failKey = 'previous';
  store.state.settings.devDate = '2026-10-07';
  await assert.rejects(store.waitForSave(), /native write failed/);

  failKey = '';
  store.state.settings.devDate = '2026-10-08';
  await store.waitForSave();
  assert.equal(JSON.parse(files.get('current')).state.settings.devDate, '2026-10-08');

  const syncFailure = new Error('native save threw');
  useStorageDriver({
    kind: 'native',
    notice: '',
    load: () => null,
    save() { throw syncFailure; },
  });
  store.state.settings.devDate = '2026-10-09';
  await assert.rejects(store.waitForSave(), error => error === syncFailure);

  useStorageDriver(nativeDriver);
  store.state.settings.devDate = '2026-10-10';
  await store.waitForSave();
  assert.equal(JSON.parse(files.get('current')).state.settings.devDate, '2026-10-10');
  assert.equal(store.saveWarning.pending, false);
  assert.equal(store.saveWarning.text, '');
});
