import test from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, pickBackup } from '../src/services/backup.js';

// Outside Capacitor the bridge is inert: callers must fall back to the web
// Blob download and file input, never lose the backup silently.
test('backup bridge falls back to web semantics outside the native shell', async () => {
  assert.equal(await exportBackup('kuangye-2026-09-25.json', '{}'), false);
  assert.equal(await pickBackup(), null);
});
