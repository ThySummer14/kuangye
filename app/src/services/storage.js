import { normalizeState, parseImport } from '../game/save.js';

export function createWebStorage(storage, qa = false) {
  const key = qa ? 'kuangye.qa.v3' : 'kuangye.v3';
  return {
    kind: 'web',
    load() {
      for (const candidate of qa ? [key] : [key, 'kuangye.v2', 'kuangye.v1']) {
        try {
          const state = normalizeState(JSON.parse(storage().getItem(candidate)));
          if (state) return state;
        } catch { /* Keep the existing web recovery path and legacy keys. */ }
      }
      return null;
    },
    save(text) { storage().setItem(key, text); },
    // A reset means the old generation is really gone, not renamed to backup.
    purge() { storage().removeItem(key); },
  };
}

// Syntax damage may fall back. Recognizable but unsupported data must never be
// replaced with an older state just because this version cannot understand it.
function decode(text) {
  if (text == null) return null;
  try { JSON.parse(text); } catch { return null; }
  return parseImport(text);
}

export async function createFileStorage(io, legacyStorage) {
  const current = await io.read('current');
  let good = current, initial = decode(current), notice = '';
  if (!initial) {
    const previous = await io.read('previous');
    initial = decode(previous);
    good = initial ? previous : null;
    if (initial) notice = '已从上一份有效存档恢复，请在成长手记导出备份。';
    if (!initial && (current != null || previous != null))
      throw Error('本地存档无法读取，原文件已保留。请勿卸载应用或清理数据。');
  }
  let queue = Promise.resolve();
  const verifiedWrite = async (name, text) => {
    await io.writeAtomic(name, text);
    if (await io.read(name) !== text) throw Error('存档写入后的校验不一致');
  };
  const driver = {
    kind: 'native',
    notice,
    load: () => initial,
    save(text) {
      // Snapshot each call before queuing, and reject unsupported content.
      parseImport(text);
      const envelope = JSON.stringify({ app: 'kuangye', version: 3, state: JSON.parse(text) });
      const operation = queue.catch(() => {}).then(async () => {
        // A purge empties the vault: nothing is preserved as backup, so the
        // next save starts a brand-new generation.
        if (good != null) await verifiedWrite('previous', good);
        await verifiedWrite('current', envelope);
        good = envelope;
      });
      queue = operation;
      return operation;
    },
    purge() {
      const operation = queue.catch(() => {}).then(async () => {
        await io.deleteAll();
        good = null;
      });
      queue = operation;
      return operation;
    },
  };
  if (!initial) {
    for (const key of ['kuangye.v3', 'kuangye.v2', 'kuangye.v1']) {
      const raw = legacyStorage.getItem(key);
      if (raw == null) continue;
      // Migration is copy-and-verify, never a destructive move or lossy fallback.
      initial = parseImport(raw);
      await driver.save(JSON.stringify(initial));
      break;
    }
  }
  return driver;
}
