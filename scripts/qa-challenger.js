async (page) => {
  const browser=page.context().browser(), results=[];
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  for(const mode of ['dev','release']) for(const width of [1280,375]) {
    const context=await browser.newContext({viewport:{width,height:900}}), p=await context.newPage(), errors=[];
    p.on('pageerror',error=>errors.push(error.message));
    const origin=mode==='dev'?'http://127.0.0.1:5192/':'http://127.0.0.1:5193/';
    const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('kuangye.v3')));
    const capture=async(name,modal=false)=>{
      check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}: page overflow`);
      if(modal) check(await p.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),`${name}: dialog overflow`);
      else { await p.locator('.toast').waitFor({state:'detached'}); await p.evaluate(()=>{scrollTo({top:0,behavior:'instant'});return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}); }
      await p.waitForTimeout(350);
      await p.screenshot({path:`output/playwright/challenger-${mode}-${name}-${width}.png`,fullPage:!modal});
    };
    const tab=async(name)=>p.locator('.challenge-tabs').getByRole('button',{name:new RegExp(name)}).click();
    const selectContractAlbum=async(target=p)=>{
      await target.getByRole('button',{name:/加码行动\s*06/}).click();
      await target.locator('.operation-card').first().waitFor();
    };
    const inspect=async(id)=>{await p.locator(`[data-operation="${id}"]`).click();await p.getByRole('dialog').waitFor();};
    const take=async(id,terms=[])=>{
      await tab('挑战一览');await inspect(id);
      const boxes=p.locator('.challenge-terms input');
      for(const i of terms) await boxes.nth(i).check();
      await p.getByRole('button',{name:'接下挑战',exact:false}).click();
      await p.getByRole('dialog').waitFor({state:'detached'});
      return (await read()).active.at(-1).qid;
    };
    const finish=async(qid,review)=>{
      await p.locator(`[data-challenge-active="${qid}"]`).getByRole('button',{name:'我完成了，留下刻印'}).click();
      for(const box of await p.locator('.challenge-confirm input').all()) await box.check();
      await p.locator('#quest-review').fill(review);
      await p.getByRole('button',{name:'确认完成，留下刻印',exact:true}).click();
      await p.getByRole('heading',{name:'突破，已刻印。'}).waitFor();
      await p.getByRole('button',{name:'回挑战者，查看蚀刻章与档案 ↗',exact:true}).click();
    };
    try {
      await p.goto(origin+'#map');await p.locator('.world-canvas[data-ready=true]').waitFor();
      await p.locator('[data-place=tasks]').click();await p.locator('.challenger-entry').waitFor();
      await capture('entry');
      const initial=JSON.stringify(await read());
      await p.locator('.challenger-entry').click();await selectContractAlbum();
      check(await p.locator('.operation-card').count()===6,'six operations not available');
      check(JSON.stringify(await read())===initial,'browsing wrote save');
      await p.waitForTimeout(1100);await capture('overview');
      await p.getByRole('group',{name:'筛选挑战领域'}).getByRole('button',{name:'头脑',exact:true}).click();
      check(await p.locator('.operation-card').count()===2,'mind filter');
      await p.getByRole('group',{name:'筛选挑战领域'}).getByRole('button',{name:'全部挑战',exact:true}).click();
      await tab('蚀刻章');check(await p.locator('.challenge-medal.earned').count()===0,'unearned medals appear earned');
      await capture('medals-locked');
      await p.locator('[data-medal=summit]').click();await p.getByText('图样预览 / 尚未获得',{exact:true}).waitFor();await p.locator('.medal-canvas[data-ready=true]').waitFor();await p.getByRole('button',{name:'正面',exact:true}).click();
      await capture('medal-preview',true);await p.keyboard.press('Escape');
      await tab('挑战一览');await inspect('prototype');await p.keyboard.press('Escape');
      check(await p.locator('[data-operation=prototype]').evaluate(el=>el===document.activeElement),'cancel focus not restored');
      check(JSON.stringify(await read())===initial,'preview/cancel wrote save');
      await inspect('prototype');
      for(const box of await p.locator('.challenge-terms input').all()) await box.check();
      check((await p.locator('.challenge-rating strong').innerText())==='12','rating does not sum');
      await capture('configuration',true);
      await p.getByRole('button',{name:'接下挑战',exact:false}).click();await p.getByRole('dialog').waitFor({state:'detached'});
      let saved=await read();const first=saved.active[0].qid;
      check(saved.customTasks[0].challenge.terms.length===3 && saved.home.lumens===0 && saved.done.length===0,'accept not frozen or pays');
      await inspect('prototype');check(await p.getByRole('button',{name:'此项目正在进行'}).isDisabled(),'duplicate project allowed');await p.keyboard.press('Escape');
      await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('.world-canvas[data-ready=true]').waitFor();
      await p.getByRole('button',{name:'打开进行中',exact:true}).click();await p.locator('.challenger').waitFor();await selectContractAlbum();
      check(p.url().endsWith('#challenger'),'map active does not return to album');
      await capture('active');
      // Complete via the ordinary task wall too: the same game boundary must hold.
      await p.getByRole('button',{name:'← 任务岩壁',exact:true}).click();
      const card=p.locator(`[data-active-task="${first}"]`);
      check(await card.getByRole('button',{name:'修改这件事 ↗',exact:true}).count()===0,'challenge can be edited as personal task');
      await card.getByRole('button',{name:'我完成了',exact:true}).click();
      const confirm=p.getByRole('button',{name:'确认完成，留下刻印',exact:true});
      check(await confirm.isDisabled(),'unchecked completion enabled');
      const confirmations=await p.locator('.challenge-confirm input').all();check(confirmations.length===4,'criteria not fully listed');
      for(const box of confirmations) await box.check();
      check(await confirm.isDisabled(),'blank review completion enabled');
      await p.locator('#quest-review').fill('测试记录：独立做出原型，三人试用后完成修订。');
      await confirmations[0].uncheck();check(await confirm.isDisabled(),'missing base condition accepted');await confirmations[0].check();
      await capture('confirmation',true);await confirm.click();await p.getByRole('heading',{name:'突破，已刻印。'}).waitFor();
      await capture('completed',true);
      saved=await read();check(saved.done.length===1 && saved.done[0].xp===0 && saved.home.lumens===0 && saved.home.glimmerDays.length===1,'completion rewards wrong');
      await p.getByRole('button',{name:'回挑战者，查看蚀刻章与档案 ↗',exact:true}).click();
      await tab('蚀刻章');check(await p.locator('.challenge-medal.earned').count()===3,'rank12 should earn three medals');await capture('medals-earned');
      await tab('行动档案');check(await p.locator('.challenge-record').count()===1,'record missing');
      await p.locator('.challenge-record summary').click();check(await p.locator('.challenge-record li').count()===4,'frozen terms missing');await capture('records');
      await p.reload();await p.locator('.challenger').waitFor();await selectContractAlbum();check((await read()).done.length===1,'reload lost completion');
      const second=await take('deep-work',[0]);const third=await take('hard-book');await take('speak');
      const full=JSON.stringify(await read());await inspect('field-study');check(await p.getByRole('button',{name:'手里已经有 3 件事'}).isDisabled(),'fourth challenge allowed');await capture('full',true);await p.keyboard.press('Escape');
      check(JSON.stringify(await read())===full,'full state changed');
      await p.locator(`[data-challenge-active="${third}"]`).getByRole('button',{name:'先放一放',exact:true}).click();await p.locator('#rest-reason').fill('测试：换一组条件再来。');await capture('resting',true);await p.getByRole('button',{name:'暂时放下',exact:true}).click();
      const retry=await take('hard-book',[2]);check(retry!==third,'retry reused qid');
      saved=await read();check(saved.abandoned.length===1 && saved.customTasks.find(t=>t.id===third).challenge.terms.length===0 && saved.customTasks.find(t=>t.id===retry).challenge.terms.length===1,'retry rewrote original');
      await finish(second,'测试记录：解出难题并关闭了消息。');await finish(retry,'测试记录：读完指定页数，完成理解与反向论证。');
      await tab('蚀刻章');check(await p.locator('.challenge-medal.earned').count()===4,'three project medal not earned');await capture('all-medals');
      await tab('行动档案');await p.locator('.challenge-resting>summary').click();await p.locator('.challenge-resting article details summary').click();check(await p.locator('.challenge-resting li').count()===1,'rested snapshot missing');
      await capture('history');
      // Actual download and UI import in a separate, otherwise empty context.
      await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('[data-place=journal]').click();
      const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'导出备份',exact:true}).click();const download=await downloadPromise;
      const backupPath=`output/playwright/challenger-${mode}-backup-${width}.json`;await download.saveAs(backupPath);
      const exported=await read();
      const restoreContext=await browser.newContext({viewport:{width,height:900}}), restore=await restoreContext.newPage();
      restore.on('pageerror',e=>errors.push(e.message));await restore.goto(origin+'#panel');await restore.locator('.backup-section input').setInputFiles(backupPath);
      await restore.getByRole('button',{name:'恢复这份备份',exact:true}).click();await restore.getByText('备份已恢复，原进度也已自动导出',{exact:true}).waitFor();
      const recovered=await restore.evaluate(()=>JSON.parse(localStorage.getItem('kuangye.v3')));
      check(JSON.stringify(recovered.customTasks)===JSON.stringify(exported.customTasks),'restored challenge snapshots differ');
      check(JSON.stringify(recovered.done)===JSON.stringify(exported.done),'restored history differs');
      check(recovered.abandoned.length===1 && recovered.home.glimmerDays.length===1 && recovered.home.lumens===0,'restore changes economics/history');
      await restore.goto(origin+'#challenger');await selectContractAlbum(restore);await restore.locator('.challenge-tabs').getByRole('button',{name:/蚀刻章/}).click();check(await restore.locator('.challenge-medal.earned').count()===4,'restored medals lost');await restoreContext.close();
      // No animations remain in the album when the system asks to reduce motion.
      await p.emulateMedia({reducedMotion:'reduce'});await p.goto(origin+'#challenger');await selectContractAlbum();
      const animated=await p.locator('.challenger').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
      check(animated===0,'reduced motion still animates album');
      await inspect('skill');await p.locator('.challenge-terms input').first().check();
      check(await p.locator('dialog').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)===0,'reduced motion still animates terms');await p.keyboard.press('Escape');
      await p.emulateMedia({reducedMotion:'no-preference'});
      // Existing home remains reachable and light mode controls still work.
      await p.getByRole('button',{name:'← 回到地图',exact:true}).click();await p.locator('[data-place=home]').click();await p.locator('.home-canvas[data-ready=true]').waitFor();
      for(const light of ['day','night']) {
        await p.getByRole('combobox', {name:/光线/}).selectOption(light);
        await p.waitForTimeout(250);await capture('home-'+light);
      }
      check(errors.length===0,errors.join('\n'));
      results.push({mode,width,status:'PASS',done:exported.done.length,active:exported.active.length,abandoned:exported.abandoned.length,medals:4,errors,backupPath});
    } catch(error) {await p.screenshot({path:`output/playwright/challenger-${mode}-FAILED-${width}.png`,fullPage:true});results.push({mode,width,status:'FAIL',error:error.message,errors});}
    await context.close();
  }
  return {results};
}
