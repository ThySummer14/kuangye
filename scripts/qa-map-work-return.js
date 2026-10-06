async (page) => {
  const browser = page.context().browser(), results = [], errors = [];
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const names = [
    '最近后写暂放 · 边界标题'.repeat(5).slice(0, 60),
    '同日较早暂放作品', '前一日暂放作品', '最近作品的旧任务记录', '同日作品的旧任务记录',
    '手里正在做的作品', '已经收好的作品', '没有成果的暂放作品', '普通放弃任务',
  ];
  const longBody = ('正文是一段本地长成果，用来观察三行节选、完整预览和窄屏换行。\n').repeat(6);
  const imageData = (await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 160; c.height = 120;
    const x = c.getContext('2d'); x.fillStyle = '#efe9d7'; x.fillRect(0, 0, 160, 120);
    x.fillStyle = '#88a076'; x.beginPath(); x.ellipse(80, 60, 55, 25, -.6, 0, Math.PI * 2); x.fill();
    return c.toDataURL('image/png');
  }));

  for (const mode of ['dev', 'release']) for (const width of [1280, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }), p = await context.newPage();
    p.on('pageerror', e => errors.push(`${mode}/${width}: ${e.message}`));
    const origin = mode === 'dev' ? 'http://127.0.0.1:5192/?qa' : 'http://127.0.0.1:5193/';
    const key = mode === 'dev' ? 'kuangye.qa.v3' : 'kuangye.v3';
    const read = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const back = async () => { await p.getByRole('button', { name: '← 回到地图', exact: true }).click(); await p.locator('.world-canvas[data-ready=true]').waitFor(); };
    const capture = async label => {
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode}/${width}/${label}: horizontal overflow`);
      await p.evaluate(() => { scrollTo({ top: 0, left: 0, behavior: 'instant' }); return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      await p.screenshot({ path: `output/playwright/map-work-return-${mode}-${label}-${width}.png`, fullPage: true });
    };
    const mapCard = id => p.locator(`[data-rest-work="${id}"]`);
    const mapExpected = async (id, active) => {
      const card = mapCard(id);
      check(await p.locator('[data-rest-work]').count() === 1 && await card.count() === 1, `${mode}/${width}: expected exactly one resting work card`);
      check((await card.getAttribute('data-rest-work')) === id, 'wrong recent resting work');
      const order = await p.evaluate(workId => {
        const c = document.querySelector(`[data-rest-work="${workId}"]`), t = document.querySelector('.ticket');
        const r = c.getBoundingClientRect(), q = t.getBoundingClientRect();
        return { domBefore: !!(c.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING), visualBefore: r.top < q.top };
      }, id);
      check(order.domBefore === !active, `${mode}/${width}: resting card DOM order wrong for active=${active}`);
      check(order.visualBefore === !active, `${mode}/${width}: resting card visual order wrong for active=${active}`);
      const box = await card.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
      check(box.scroll <= box.width, `${mode}/${width}: resting card overflows its box`);
      return card;
    };
    const openRest = async id => {
      const before = JSON.stringify(await read());
      await mapCard(id).getByRole('button', { name: '回画室看这一版 ↗', exact: true }).click();
      await p.locator(`[data-studio-work="${id}"]`).waitFor();
      check(JSON.stringify(await read()) === before, 'opening a resting work changed the save');
      check(await p.locator('.work-title').evaluate(el => el === document.activeElement), 'work title did not receive focus');
      check(await p.locator('#studio-body').count() === 0, 'resting work opened in the editor');
      return p.locator('.studio-work-preview');
    };
    try {
      await p.goto(origin + '#map'); await p.locator('.world-canvas[data-ready=true]').waitFor();
      check(await p.locator('[data-rest-work]').count() === 0, 'zero-rest map should hide the whole card');
      await capture('empty');

      // Generate every qid and work id through the real UI, then make an isolated, schema-valid fixture.
      await p.locator('[data-place=atelier]').click(); await p.locator('.studio').waitFor();
      const generated = [];
      for (let i = 0; i < names.length; i++) {
        await p.getByRole('button', { name: '开始创作', exact: true }).click();
        await p.getByRole('button', { name: '开始自己的作品 ＋', exact: true }).click();
        const dialog = p.getByRole('dialog', { name: '开始一件作品' });
        await dialog.locator('#studio-start-title').fill(names[i]);
        await dialog.locator('#studio-start-criterion').fill(`完成条件：为「${names[i]}」留下一版。`);
        await dialog.getByRole('button', { name: '接下这件创作', exact: true }).click();
        await p.locator('.studio-editor').waitFor();
        const entry = await p.evaluate(k => {
          const s = JSON.parse(localStorage.getItem(k)), w = s.home.studio.works[0], qid = w.taskIds.at(-1);
          const i = s.active.findIndex(a => a.qid === qid); if (i < 0) throw Error('UI-created task missing');
          const a = s.active.splice(i, 1)[0];
          s.abandoned.push({ qid, reason: `fixture-private-reason-${qid.slice(-8)}`, at: '2026-10-06', logs: a.logs });
          s.settings.devDate = '2026-10-06'; localStorage.setItem(k, JSON.stringify(s));
          return { id: w.id, qid };
        }, key);
        generated.push(entry);
        await p.reload(); await p.locator('.studio').waitFor();
      }
      const ids = await p.evaluate(({ k, list, image, body }) => {
        const s = JSON.parse(localStorage.getItem(k)), works = s.home.studio.works;
        const w = list.map(({ title, entry }) => ({ title, work: works.find(w => w.id === entry.id), qid: entry.qid }));
        if (w.some(x => !x.work)) throw Error('fixture work missing');
        const record = qid => s.abandoned.find(r => r.qid === qid);
        const historyRecent = w[3], historyEarlier = w[4], recent = w[0], sameDayEarlier = w[1], older = w[2], working = w[5], done = w[6], empty = w[7], ordinary = w[8];
        recent.work.taskIds = [historyRecent.qid, recent.qid];
        sameDayEarlier.work.taskIds = [historyEarlier.qid, sameDayEarlier.qid];
        recent.work.body = body; recent.work.images = [image]; recent.work.note = 'PRIVATE_NOTE_MAP_RETURN'; recent.work.updated = '2026-01-01';
        sameDayEarlier.work.body = '同一天更早放下的正文。'; sameDayEarlier.work.updated = '2026-12-31';
        older.work.body = '前一天放下的正文。';
        working.work.body = '正在做的作品正文。';
        done.work.body = '已经收好的作品正文。';
        empty.work.body = ' \n '; empty.work.images = []; empty.work.note = '';
        const oldRecent = record(historyRecent.qid), oldEarlier = record(historyEarlier.qid), tieEarlier = record(sameDayEarlier.qid), tieRecent = record(recent.qid), prev = record(older.qid), blank = record(empty.qid), plain = record(ordinary.qid);
        oldRecent.at = '2026-10-07'; oldEarlier.at = '2026-10-07'; tieEarlier.at = '2026-10-06'; tieRecent.at = '2026-10-06'; prev.at = '2026-10-05'; blank.at = '2026-10-04'; plain.at = '2026-10-07';
        oldRecent.reason = 'PRIVATE_REASON_MAP_RETURN'; tieRecent.reason = 'PRIVATE_REASON_MAP_RETURN';
        oldRecent.logs = [{ d: '2026-10-02', v: 1, note: '旧任务留下的记录' }];
        s.abandoned = [oldRecent, oldEarlier, tieEarlier, tieRecent, prev, blank, plain];
        s.home.studio.works = works.filter(item => item.id !== historyRecent.work.id && item.id !== historyEarlier.work.id && item.id !== ordinary.work.id);
        s.active = [{ qid: working.qid, start: '2026-10-06', logs: [], shields: 2 }];
        s.done = [{ qid: done.qid, xp: 0, at: '2026-10-06', review: '', units: [], logs: [] }];
        s.home.studio.displayId = done.work.id;
        localStorage.setItem(k, JSON.stringify(s));
        return { recent: recent.work.id, recentQid: recent.qid, priorQid: historyRecent.qid, sameDay: sameDayEarlier.work.id,
          sameDayPriorQid: historyEarlier.qid,
          older: older.work.id, working: working.work.id, workingQid: working.qid, done: done.work.id, empty: empty.work.id,
          emptyQid: empty.qid, historyWorkId: historyRecent.work.id, ordinaryWorkId: ordinary.work.id, criterion: `完成条件：为「${recent.title}」留下一版。` };
      }, { k: key, list: names.map((title, i) => ({ title, entry: generated[i] })), image: imageData, body: longBody });
      await p.reload(); await p.locator('.studio').waitFor(); await back();

      const card = await mapExpected(ids.recent, true); await capture('map-active');
      const mapText = await card.innerText();
      check(mapText.includes(names[0]) && mapText.includes('2026-10-06'), 'map card lost title/date');
      check(!mapText.includes('PRIVATE_NOTE_MAP_RETURN') && !mapText.includes('PRIVATE_REASON_MAP_RETURN'), 'private note or abandon reason leaked into map');
      check(await card.locator('.resting-version p').evaluate(el => getComputedStyle(el).webkitLineClamp === '3'), 'map body is not clamped to three lines');
      check(await card.locator('img').evaluate(img => img.complete && img.naturalWidth === 160), 'local Canvas thumbnail did not decode');

      // Zero active must put the resting entry before the recommendation; active work does the inverse.
      await p.evaluate(({ k, qid }) => {
        const s = JSON.parse(localStorage.getItem(k)), i = s.active.findIndex(a => a.qid === qid), a = s.active.splice(i, 1)[0];
        s.abandoned.push({ qid, reason: 'fixture-working-rest', at: '2026-10-03', logs: a.logs }); localStorage.setItem(k, JSON.stringify(s));
      }, { k: key, qid: ids.workingQid });
      await p.reload(); await p.locator('.world-canvas[data-ready=true]').waitFor();
      await mapExpected(ids.recent, false); await capture('map-zero-active');
      await p.evaluate(({ k, qid }) => {
        const s = JSON.parse(localStorage.getItem(k)), i = s.abandoned.findIndex(a => a.qid === qid), a = s.abandoned.splice(i, 1)[0];
        s.active.push({ qid, start: '2026-10-06', logs: a.logs || [], shields: 2 }); localStorage.setItem(k, JSON.stringify(s));
      }, { k: key, qid: ids.workingQid });
      await p.reload(); await p.locator('.world-canvas[data-ready=true]').waitFor();

      // Fill the three-task limit and prove map viewing stays read-only while resume is disabled.
      await p.evaluate(({ k, qids }) => {
        const s = JSON.parse(localStorage.getItem(k));
        for (const qid of qids) { const i = s.abandoned.findIndex(a => a.qid === qid); const a = s.abandoned.splice(i, 1)[0]; s.active.push({ qid, start: '2026-10-06', logs: a.logs || [], shields: 2 }); }
        localStorage.setItem(k, JSON.stringify(s));
      }, { k: key, qids: [generated[1].qid, generated[2].qid] });
      await p.reload(); await p.locator('.world-canvas[data-ready=true]').waitFor();
      const fullCard = await mapExpected(ids.recent, true); check((await fullCard.innerText()).includes('手里已有三件事'), 'full-capacity map hint missing'); await capture('map-full');
      let saved = JSON.stringify(await read()), preview = await openRest(ids.recent);
      check(await p.getByRole('button', { name: '接着做这件作品', exact: true }).isDisabled(), 'full-capacity resume should be disabled');
      check(JSON.stringify(await read()) === saved, 'full-capacity preview caused a side effect');
      check(await preview.locator('p').evaluate((el, body) => el.textContent === body, longBody), 'full preview lost the original body');
      check(!((await preview.innerText()).includes('PRIVATE_NOTE_MAP_RETURN')), 'rest preview exposed the private note');
      check(await preview.locator('img').evaluate(img => img.complete && img.naturalWidth === 160), 'full preview image did not decode');
      await capture('preview-full'); await back();

      // Empty works remain previewable at capacity and are not mistaken for completed artifacts.
      await p.evaluate(({ k, qid }) => { const s = JSON.parse(localStorage.getItem(k)); s.abandoned.find(a => a.qid === qid).at = '2026-10-07'; localStorage.setItem(k, JSON.stringify(s)); }, { k: key, qid: ids.emptyQid });
      await p.reload(); await p.locator('.world-canvas[data-ready=true]').waitFor();
      const emptyCard = await mapExpected(ids.empty, true);
      check((await emptyCard.innerText()).includes('第一版还在路上') && await emptyCard.locator('.resting-version').count() === 0, 'blank-only work was presented as an artifact');
      await capture('map-empty-rest'); saved = JSON.stringify(await read());
      check((await emptyCard.innerText()).includes('第一版还在路上'), 'map card implies the empty work already has an artifact');
      preview = await openRest(ids.empty);
      check((await preview.innerText()).includes('这一版还在路上') && (await preview.innerText()).includes('成果还没带回来'), 'empty preview copy is missing');
      check(await p.getByRole('button', { name: '我做好了，收好这件作品', exact: true }).count() === 0, 'empty rest work was offered completion');
      check(await p.getByRole('button', { name: '接着做这件作品', exact: true }).isDisabled(), 'empty work should remain blocked at capacity');
      check(JSON.stringify(await read()) === saved, 'empty preview caused a side effect'); await capture('preview-empty'); await back();

      // Day/night screenshots cover the displayed completed work in the small home.
      await p.locator('[data-place=home]').click(); await p.locator('.home-canvas[data-ready=true]').waitFor();
      check(await p.locator('.home-portfolio-frame').count() === 1, 'completed work was not displayed in the home');
      for (const light of ['day', 'night']) { await p.getByRole('combobox', { name: /光线/ }).selectOption(light); await capture(`home-${light}`); }
      await back();

      // Free two slots, then explicitly resume the map candidate and retain its old task history.
      await p.evaluate(({ k, qids, emptyQid }) => {
        const s = JSON.parse(localStorage.getItem(k));
        for (const [i, qid] of qids.entries()) { const index = s.active.findIndex(a => a.qid === qid), a = s.active.splice(index, 1)[0]; s.abandoned.push({ qid, reason: 'fixture-freed-slot', at: i ? '2026-10-04' : '2026-10-05', logs: a.logs || [] }); }
        s.abandoned.find(a => a.qid === emptyQid).at = '2026-10-03';
        localStorage.setItem(k, JSON.stringify(s));
      }, { k: key, qids: [generated[1].qid, generated[2].qid], emptyQid: ids.emptyQid });
      await p.reload(); await p.locator('.world-canvas[data-ready=true]').waitFor();
      await mapExpected(ids.recent, true); saved = await read(); const beforeResume = structuredClone(saved);
      await mapCard(ids.recent).getByRole('button', { name: '回画室看这一版 ↗', exact: true }).click(); await p.locator(`[data-studio-work="${ids.recent}"]`).waitFor();
      await p.getByRole('button', { name: '接着做这件作品', exact: true }).click(); await p.locator('.studio-editor').waitFor();
      let after = await read();
      check(after.home.studio.works.find(w => w.id === ids.recent).taskIds.length === 3, 'resume did not append a new task id');
      check(after.home.studio.works.find(w => w.id === ids.recent).taskIds[0] === ids.priorQid, 'resume changed old task history');
      check(after.abandoned.some(a => a.qid === ids.priorQid) && after.active.length === beforeResume.active.length + 1, 'resume lost old abandon record or failed to add one active task');
      check(after.customTasks.length === beforeResume.customTasks.length + 1, 'resume did not create one associated personal task');
      check(JSON.stringify(after.abandoned.find(a => a.qid === ids.priorQid)) === JSON.stringify(beforeResume.abandoned.find(a => a.qid === ids.priorQid)), 'resume changed the old abandon log');
      check(after.done.length === beforeResume.done.length && after.home.lumens === beforeResume.home.lumens && JSON.stringify(after.home.glimmerDays) === JSON.stringify(beforeResume.home.glimmerDays), 'resume granted an extra reward');
      await back(); check(await mapCard(ids.sameDay).count() === 1, 'resumed work did not leave the map candidate; next candidate missing'); await capture('map-after-resume');

      // Put the resumed work down through its normal UI; the new record becomes the newest same-day pause.
      await p.locator('[data-place=atelier]').click(); await p.locator('.studio').waitFor();
      await p.getByRole('button', { name: /我的作品集/ }).click(); await p.locator(`[data-work="${ids.recent}"]`).click(); await p.locator('.studio-editor').waitFor();
      await p.getByRole('button', { name: '先放一放', exact: true }).click();
      await p.getByRole('dialog', { name: '暂时放下任务' }).locator('#rest-reason').fill('再次暂放的私密原因');
      await p.getByRole('dialog', { name: '暂时放下任务' }).getByRole('button', { name: '暂时放下', exact: true }).click();
      await p.locator('.studio-work-preview').waitFor(); after = await read();
      const newestQid = after.home.studio.works.find(w => w.id === ids.recent).taskIds.at(-1);
      check(after.home.studio.works.find(w => w.id === ids.recent).taskIds.length === 3 && after.abandoned.some(a => a.qid === ids.priorQid), 'putting down removed history');
      check(after.abandoned.some(a => a.qid === newestQid), 'repause did not create a new abandoned record');
      await back(); await mapExpected(ids.recent, true); await capture('map-after-pause');

      // Complete the resumed version and ensure a done work leaves the resting candidate.
      await mapCard(ids.recent).getByRole('button', { name: '回画室看这一版 ↗', exact: true }).click(); await p.locator('.studio-work-preview').waitFor();
      await p.getByRole('button', { name: '接着做这件作品', exact: true }).click(); await p.locator('.studio-editor').waitFor();
      const completedQid = (await read()).active.find(a => a.qid !== ids.workingQid)?.qid;
      await p.getByRole('button', { name: '我做好了，收好这件作品', exact: true }).click();
      const beforeComplete = await read();
      await p.getByRole('dialog', { name: '记录完成的任务' }).getByRole('button', { name: '完成，记下这一刻', exact: true }).click();
      after = await read(); check(after.done.some(d => d.qid === completedQid), 'completed task was not recorded');
      check(after.done.find(d => d.qid === completedQid).xp === 0 && after.home.lumens === beforeComplete.home.lumens, 'personal work completion added light or XP');
      check(after.abandoned.some(a => a.qid === ids.priorQid), 'completion discarded the old abandoned record');
      await p.getByRole('dialog', { name: '这一件事，收好了' }).getByRole('button', { name: /回到地图/ }).click(); await p.locator('.world-canvas[data-ready=true]').waitFor();
      check(await mapCard(ids.sameDay).count() === 1, 'completed work remained the map candidate'); await capture('map-after-complete');
      await p.reload(); await p.locator('.world-canvas[data-ready=true]').waitFor();
      check(await mapCard(ids.sameDay).count() === 1, 'refresh changed the recent candidate');

      // Export a real JSON backup and feed that exact file through the app's parseImport/restore path.
      await p.locator('[data-place=journal]').click(); await p.locator('.backup-section').waitFor();
      const downloadPromise = p.waitForEvent('download'); await p.getByRole('button', { name: '导出备份', exact: true }).click();
      const download = await downloadPromise, backupPath = `output/playwright/map-work-return-${mode}-backup-${width}.json`;
      await download.saveAs(backupPath);
      await p.locator('.backup-section input[type=file]').setInputFiles(backupPath);
      await p.getByRole('button', { name: '恢复这份备份', exact: true }).waitFor();
      await p.getByRole('button', { name: '恢复这份备份', exact: true }).click();
      after = await read(); const restored = after.home.studio.works.find(w => w.id === ids.recent);
      check(restored.taskIds.length === 4 && restored.taskIds[0] === ids.priorQid && restored.body === longBody && restored.images[0] === imageData, 'JSON restore lost work, image, or task history');
      check(after.abandoned.some(a => a.qid === ids.priorQid) && after.done.some(d => d.qid === completedQid), 'JSON restore lost old source record or completion');
      await back(); check(await mapCard(ids.sameDay).count() === 1, 'restored save changed the recent candidate');
      results.push({ mode, width, status: 'PASS', zeroRestHidden: true, recentByAbandonDateAndArrayOrder: true, ignoresUpdatedAndOldTaskIds: true,
        activeTicketPriority: true, oneClickReadOnlyPreviewAndFocus: true, canvasImageDecoded: true, privateNoteAndReasonHidden: true,
        fullCapacityPreviewOnly: true, emptyRestPreview: true, explicitResumeAndHistory: true, repauseBecomesRecent: true,
        completionLeavesCandidate: true, backupParseImportRestore: true, homeDayNight: true });
    } finally { await context.close(); }
  }
  check(!errors.length, JSON.stringify(errors));
  return { results, errors, fixture: 'UI-created task identities, isolated browser contexts, local Canvas image; no production access' };
}
