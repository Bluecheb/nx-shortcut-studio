'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.NX_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);await page.waitForSelector('#advisorPanel');
 const before=await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts()));assert.equal(await page.locator('.advisor-card').count(),6);
 await page.getByRole('button',{name:'Dimension zoom',exact:true}).click();assert.equal(await page.locator('.advisor-card').first().getAttribute('data-advice-id'),'dimension-height');
 await page.locator('.advisor-card').first().locator('summary').click();assert((await page.locator('.advisor-card').first().textContent()).includes('Restore the recorded checkbox'));
 await page.locator('#advisorRelease').fill('2706');await page.locator('#advisorQuery').fill('hide ribbon tabs');await page.locator('#advisorQuery').press('Tab');await page.getByRole('button',{name:'Find possibilities',exact:true}).click();assert((await page.locator('.advisor-card').first().textContent()).includes('Not verified for NX 2706'));
 await page.locator('#advisorQuery').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Find possibilities',exact:true}).click();assert.equal(await page.locator('#advisorResults img').count(),0);assert((await page.locator('#advisorStatus').textContent()).includes('No verified match'));
 assert.equal(await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts())),before);assert.equal(await page.locator('#exportMtxBtn').isDisabled(),true);
 await page.locator('#bindings .shortcut').first().click();await page.locator('#advisorQuery').fill('');await page.locator('#advisorQuery').pressSequentially('dimension zoom');assert.equal(await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts())),before,'Advisor typing cannot assign an armed recorder');await page.locator('h1').click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Fewer ribbons',exact:true}).click();await page.setViewportSize({width:390,height:844});assert(await page.locator('#advisorPanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.locator('.advisor-card').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert.deepEqual(errors,[]);console.log('PASS: Advisor real search/details/version warning, safe query, unchanged editor/baseline gate, mobile layout, local-file launch and zero page errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
