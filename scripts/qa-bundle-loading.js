async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.waitForSelector('.app-main');
 const resources=()=>page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.endsWith('.js')).map(e=>({file:new URL(e.name).pathname.split('/').pop(),decodedBytes:e.decodedBodySize})));
 const textOnly=await resources();if(textOnly.some(r=>r.file.startsWith('three-')))throw Error('Task entry downloaded Three');
 await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.locator('.world-canvas[data-ready=true]').waitFor();
 const map=await resources();const three=map.filter(r=>r.file.startsWith('three-'));if(three.length!==2)throw Error('Three chunks not loaded exactly once');
 await page.screenshot({path:'output/playwright/bundle-production-map.png',timeout:10000});
 await page.locator('[data-place=shop]').click();await page.getByRole('button',{name:'近看栗木小凳与尺寸',exact:true}).click();
 await page.locator('.detail-canvas[data-ready=true]').waitFor();await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 await page.getByRole('button',{name:'← 回到地图',exact:true}).click();await page.locator('.world-canvas[data-ready=true]').waitFor();
 const revisit=await resources();if(revisit.filter(r=>r.file.startsWith('three-')).length!==2)throw Error('Three fetched twice');
 if(errors.length)throw Error(errors.join('\n'));return {taskPage:{scripts:textOnly,totalDecodedBytes:textOnly.reduce((n,r)=>n+r.decodedBytes,0),threeRequests:0},mapThree:three,revisitedThreeRequests:2,errors};
}
