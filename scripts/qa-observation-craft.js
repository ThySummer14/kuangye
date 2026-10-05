async (page) => {
  const errors = [], results = [], browser = page.context().browser();
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const body = '  叶缘是一排细齿。\n背面的颜色更浅。\n', revision = '第二次观察：叶柄带着一点红。';
  for (const mode of ['dev', 'release']) for (const width of [1280, 375]) {
    const context = await browser.newContext({viewport:{width,height:900}}), p = await context.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const origin = mode === 'dev' ? 'http://127.0.0.1:5192/?qa' : 'http://127.0.0.1:5193/';
    const read = () => p.evaluate(() => JSON.parse(localStorage.getItem(location.search.includes('qa') ? 'kuangye.qa.v3' : 'kuangye.v3')));
    const back = async () => { await p.getByRole('button',{name:'← 回到地图',exact:true}).click(); await p.locator('.world-canvas[data-ready=true]').waitFor(); };
    const enter = async () => { await p.locator('[data-place=yard]').click(); await p.getByRole('tab',{name:/观察册/}).click(); await p.locator('.observation-book').waitFor(); };
    const capture = async name => {
      await p.locator('.toast').waitFor({state:'hidden'});
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} ${width} ${name} overflow`);
      const modal = await p.getByRole('dialog').count() > 0;
      if (!modal) await p.evaluate(() => scrollTo(0,0));
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await p.screenshot({path:`output/playwright/observation-craft-${mode}-${name}-${width}.png`,fullPage:!modal});
    };
    try {
      await p.goto(origin+'#map'); await p.locator('.world-canvas[data-ready=true]').waitFor(); await enter();
      check(await p.locator('[data-observation-prompt]').count() === (mode==='dev'?3:0), 'content gate wrong');
      await p.getByRole('button',{name:'开始自己的观察',exact:true}).click();
      check(await p.getByRole('button',{name:'把这个发现带到画室 ↗',exact:true}).count()===0, 'draft can start artwork');
      await p.locator('#observation-place').fill('楼下长椅旁'); await p.locator('#observation-kind').selectOption('plant'); await p.locator('#observation-date').fill('2026-10-03'); await p.locator('#observation-body').fill(body);
      const data = await p.evaluate(() => { const c=document.createElement('canvas'); c.width=640; c.height=480; const x=c.getContext('2d'); x.fillStyle='#f0ecd8'; x.fillRect(0,0,640,480); x.fillStyle='#9caf82'; x.beginPath(); x.ellipse(330,240,160,90,-.6,0,Math.PI*2); x.fill(); x.strokeStyle='#5f7854'; x.lineWidth=5; x.beginPath(); x.moveTo(190,340); x.lineTo(460,160); x.stroke(); return c.toDataURL('image/png'); });
      await p.getByLabel('选择观察图片').setInputFiles({name:'leaf-fixture.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')}); await p.locator('.observation-editor-images img').waitFor();
      await p.getByRole('button',{name:'收进观察册',exact:true}).click(); await p.locator('.observation-finding').waitFor();
      const id = await p.locator('[data-observation-page]').getAttribute('data-observation-page');
      const before = JSON.stringify(await read());
      const trigger = p.getByRole('button',{name:'把这个发现带到画室 ↗',exact:true});
      await trigger.click(); await p.getByRole('dialog',{name:'把发现带到画室'}).waitFor();
      check(JSON.stringify(await read())===before, 'preview mutated data');
      check(await p.locator('.source-finding').textContent()===body, 'preview lost whitespace');
      await p.getByLabel('带上这 1 张素材图片').uncheck(); check(await p.locator('.source-images img').count()===0, 'photo toggle failed'); await p.getByLabel('带上这 1 张素材图片').check();
      check(await p.locator('.source-images img').evaluate(img=>img.complete&&img.naturalWidth===640), 'preview photo not decoded');
      await capture('preview',width);
      await p.getByRole('dialog').press('Escape'); await p.getByRole('dialog').waitFor({state:'hidden'});
      check(JSON.stringify(await read())===before, 'cancel mutated data'); check(await trigger.evaluate(el=>el===document.activeElement), 'cancel lost focus');
      await trigger.click(); await p.locator('#craft-title').fill('叶子的两面'); await p.locator('#craft-criterion').fill('画出叶缘，再写下三处细节。');
      check(await p.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth), 'dialog overflow');
      await p.getByRole('button',{name:'接下这件创作，去画室',exact:true}).scrollIntoViewIfNeeded(); await capture('confirm');
      await p.getByRole('button',{name:'接下这件创作，去画室',exact:true}).click(); await p.locator('[data-studio-work]').waitFor();
      const workId = await p.locator('[data-studio-work]').getAttribute('data-studio-work');
      check(await p.locator('.work-title').evaluate(el=>el===document.activeElement), 'studio did not focus work');
      check(await p.locator('#studio-body').inputValue()==='', 'source became artifact'); check(await p.locator('.editor-images img').count()===0,'source photo became artifact');
      check(await p.getByRole('button',{name:'我做好了，收好这件作品',exact:true}).isDisabled(), 'empty artifact completed');
      await p.locator('.work-source summary').click(); check(await p.locator('.source-finding').textContent()===body, 'snapshot missing'); await capture('blank');
      const source = (await read()).home.observationWorks[0].source;
      await p.getByRole('button',{name:'回到原观察页 ↗',exact:true}).click(); await p.locator(`[data-observation-page="${id}"]`).waitFor();
      check(await p.locator('.observation-page h4').evaluate(el=>el===document.activeElement), 'source return did not focus');
      await p.getByRole('button',{name:'再补一点发现',exact:true}).click(); await p.locator('#observation-body').fill(revision); await p.getByRole('button',{name:'看收好的记录',exact:true}).click();
      await p.getByRole('button',{name:'回到这一页的作品 ↗',exact:true}).click(); await p.locator(`[data-studio-work="${workId}"]`).waitFor();
      check(JSON.stringify((await read()).home.observationWorks[0].source)===JSON.stringify(source), 'revision changed snapshot');
      check((await read()).home.studio.works.length===1 && (await read()).active.length===1, 'repeat entry duplicated work');
      await p.locator('#studio-body').fill('我画出了两面的差别。\n浅色的背面，像把光藏在里面。'); await p.locator('#studio-note').fill('私人创作备注');
      await p.getByRole('button',{name:'先放一放',exact:true}).click(); await p.locator('#rest-reason').fill('明天再看一眼'); await p.getByRole('button',{name:'暂时放下',exact:true}).click();
      await p.getByRole('button',{name:'回到原观察页 ↗',exact:true}).click(); await p.getByRole('button',{name:'回到这一页的作品 ↗',exact:true}).click();
      check((await read()).active.length===0, 'repeat auto resumed resting work');
      await p.getByRole('button',{name:'接着做这件作品',exact:true}).click();
      check((await read()).home.studio.works[0].taskIds.length===2 && (await read()).home.observationWorks.length===1, 'resume replaced history');
      await p.reload(); await p.getByRole('button',{name:'我的作品集 · 1',exact:true}).click(); await p.locator(`[data-work="${workId}"]`).click(); await p.locator(`[data-studio-work="${workId}"]`).waitFor();
      check((await read()).home.observationWorks[0].source.body===body, 'refresh lost source');
      await p.getByRole('button',{name:'我做好了，收好这件作品',exact:true}).click(); await p.getByRole('button',{name:'完成，记下这一刻',exact:true}).click(); await capture('completed');
      await p.getByRole('button',{name:'去画室看看这件作品 ↗',exact:true}).click(); await p.locator('.studio-work-preview').waitFor();
      const saved = await read(); check(saved.done.length===1 && saved.done[0].xp===0 && saved.home.lumens===0 && saved.home.glimmerDays.length===1, 'incorrect rewards');
      const htmlPromise = p.waitForEvent('download'); await p.getByRole('button',{name:'导出 1 件作品的 HTML 作品集 ↗',exact:true}).click(); const htmlDownload = await htmlPromise;
      await htmlDownload.saveAs(`output/playwright/observation-craft-${mode}-album-${width}.html`);
      await p.getByRole('button',{name:'陈列到小家',exact:true}).click(); await p.getByRole('button',{name:'去小家看看 ↗',exact:true}).click(); await p.locator('.home-canvas[data-ready=true]').waitFor();
      for(const light of ['day','night']) { await p.getByRole('combobox',{name:/光线/}).selectOption(light); await capture('home-'+light); }
      await back(); await p.getByRole('button',{name:'瞭望台 · 成长手记',exact:true}).click(); await p.locator('.backup-section').waitFor();
      const backupPromise = p.waitForEvent('download'); await p.getByRole('button',{name:'导出备份',exact:true}).click(); const download = await backupPromise;
      await download.saveAs(`output/playwright/observation-craft-${mode}-backup-${width}.json`);
      const backupState = await read();
      const bad = {version:3,state:structuredClone(backupState)}; bad.state.home.observationWorks[0].workId='missing';
      await p.locator('.backup-section input[type=file]').setInputFiles({name:'invalid-local-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
      check(await p.getByRole('button',{name:'恢复这份备份',exact:true}).count()===0, 'invalid backup offered restore');
      const fixture = {version:3,state:backupState};
      await p.locator('.backup-section input[type=file]').setInputFiles({name:'valid-local-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))}); await p.getByRole('button',{name:'恢复这份备份',exact:true}).click();
      await back(); await enter(); await p.locator(`[data-observation="${id}"]`).click(); await p.getByRole('button',{name:'回到这一页的作品 ↗',exact:true}).click(); await p.locator(`[data-studio-work="${workId}"]`).waitFor();
      const restored=await read(); check(restored.home.observationWorks.length===1 && restored.home.observationWorks[0].source.body===body && restored.home.observations.entries[0].body===revision && restored.home.studio.works[0].taskIds.length===2 && restored.home.studio.displayId===workId, 'backup lost source/history/revision/display');
      await p.locator('.work-source summary').click(); await capture('restored');
      results.push({mode,width,status:'PASS',mapTwoClicks:true,realLocalImage:true,previewCancelReadOnly:true,photoChoice:true,emptyArtifactBlocked:true,sourceRevisionIsolated:true,bidirectionalFocus:true,oneWork:true,restResumeHistory:true,refresh:true,completedWithoutExtraRewards:true,htmlDownload:true,backupDownloadRestore:true,homeDayNight:true});
    } finally { await context.close(); }
  }
  check(!errors.length,JSON.stringify(errors)); return {results,errors,fixture:'isolated browser contexts; local Canvas leaf fixture, no production access'};
}
