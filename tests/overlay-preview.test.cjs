'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const api=require('../dist/portable-project.js');
const root=path.resolve(__dirname,'../dist'),fixture=fs.readFileSync(path.join(__dirname,'fixtures/native-docked-role.mtx'),'utf8');
const maps={modeling:[{id:'UG_VIEW_FIT',label:'Fit View',key:'W'},{id:'UG_TOP',label:'Top View',key:'Shift+W'},{id:'UG_EXTRUDE',label:'Extrude',key:'Alt+Shift+E'}],sketch:[{id:'UG_SKETCH_LINE',label:'Line',key:'L'},{id:'USRCMD_LOCAL_FIXTURE',label:'Local journal',key:'R',kind:'journal'}]};
(async()=>{
 const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.NX_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#buddyPanel');
  await page.evaluate(m=>window.NX_STUDIO_EDITOR.loadShortcuts(m),maps);
  assert.equal(await page.locator('#buddyRows li').count(),1);assert((await page.locator('#buddyRows').textContent()).includes('Fit View'));
  await page.click('[data-layer="shift"]');assert.equal(await page.locator('#buddyRows li').count(),1);assert((await page.locator('#buddyRows').textContent()).includes('Top View'));
  await page.click('[data-layer="alt+shift"]');assert.equal(await page.locator('#buddyRows li').count(),1);assert((await page.locator('#buddyRows').textContent()).includes('Extrude'));assert(!(await page.locator('#buddyRows').textContent()).includes('Top View'));
  await page.selectOption('#buddyWorkspace','sketch');assert.equal(await page.locator('#buddyRows li').count(),0);
  await page.click('[data-layer="none"]');assert.equal(await page.locator('#buddyRows li').count(),2);
  const download=page.waitForEvent('download');await page.click('#exportProject');const downloaded=await download;
  assert(downloaded.suggestedFilename().endsWith('.nxstudio.json'));const source=fs.readFileSync(await downloaded.path(),'utf8'),project=api.parse(source);assert(!source.includes('USRCMD_LOCAL_FIXTURE'));assert.equal(project.workspaces.sketch[1].commandId,null);
  assert.equal(await page.locator('#exportMtxBtn').isDisabled(),true);
  const before=await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts()));
  await page.locator('#projectFile').setInputFiles({name:'future.nxstudio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...project,schemaVersion:99}))});await page.waitForFunction(()=>document.getElementById('buddyStatus').textContent.startsWith('Project not imported:'));
  assert.equal(await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts())),before);assert.equal(await page.locator('#projectReview').isVisible(),false);
  const incoming=structuredClone(project);incoming.workspaces.modeling[0].key='Ctrl+F';incoming.workspaces.sketch[0].key='R';incoming.workspaces.sketch[1].key='X';incoming.tabs={ribbon:{UG_APP_SKETCH_TASK:{'rbn_tools.rtb':false,UNKNOWN_TAB:true}},side:{}};
  await page.locator('#projectFile').setInputFiles({name:'review.nxstudio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});await page.waitForSelector('#projectReview:visible');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts())),before,'Review cannot modify editor');
  await page.click('#applyProjectImport');assert((await page.locator('#projectImportError').textContent()).includes('conflicts'));assert.equal(await page.evaluate(()=>JSON.stringify(window.NX_STUDIO_EDITOR.getShortcuts())),before,'Preflight rejection is atomic');await page.click('#cancelProjectImport');
  incoming.workspaces.sketch[0].key='L';
  await page.locator('#projectFile').setInputFiles({name:'valid.nxstudio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});await page.waitForSelector('#projectReview:visible');await page.click('#applyProjectImport');
  const imported=await page.evaluate(()=>window.NX_STUDIO_EDITOR.getShortcuts());assert.equal(imported.modeling[0].key,'Ctrl+F');assert.equal(imported.sketch.find(row=>row.kind==='journal').id,'USRCMD_LOCAL_FIXTURE');assert.equal(imported.sketch.find(row=>row.kind==='journal').key,'R');
  assert((await page.locator('#buddyRows').textContent()).includes('needs your NX ID'));assert((await page.locator('#buddyRows').textContent()).includes('X'));assert.equal(await page.locator('#exportMtxBtn').isDisabled(),true);
  await page.click('#refreshBuddy');assert((await page.locator('#buddyRows').textContent()).includes('R'));assert(!(await page.locator('#buddyRows').textContent()).includes('needs your NX ID'));
  // A baseline is needed independently; journal IDs from it are not overwritten by the portable file.
  await page.locator('#baselineFile').setInputFiles({name:'native.mtx',mimeType:'application/xml',buffer:Buffer.from(fixture)});await page.waitForFunction(()=>document.getElementById('baselineStatus').textContent.startsWith('native.mtx loaded.'));
  await page.locator('#projectFile').setInputFiles({name:'tabs.nxstudio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});await page.waitForSelector('#projectReview:visible');await page.uncheck('#projectApplyShortcuts');await page.check('#projectApplyTabs');await page.click('#applyProjectImport');
  assert((await page.locator('#buddyStatus').textContent()).includes('1 tab choices applied; 1 unmatched'));
  assert.equal(await page.evaluate(()=>window.NX_ROLE_VISIBILITY.getState().ribbon.UG_APP_SKETCH_TASK['rbn_tools.rtb']),false);
  await page.evaluate(()=>window.NX_STUDIO_EDITOR.loadShortcuts({modeling:[{id:'UG_TEST',label:'<img src=x onerror=alert(1)>',key:'F1'}],sketch:[]}));await page.click('#refreshBuddy');await page.selectOption('#buddyWorkspace','modeling');assert.equal(await page.locator('#buddyRows img').count(),0);
  await page.selectOption('#buddyPosition','bottom-left');assert.equal(await page.locator('#buddyStage').getAttribute('data-position'),'bottom-left');await page.selectOption('#buddyFontSize','20');assert.equal(await page.locator('#buddyTree').evaluate(e=>getComputedStyle(e).fontSize),'20px');
  // Use representative assignments for the visual handoff after the injection test.
  await page.evaluate(m=>window.NX_STUDIO_EDITOR.loadShortcuts(m),maps);await page.click('#refreshBuddy');await page.selectOption('#buddyWorkspace','modeling');await page.click('[data-layer="alt+shift"]');
  await page.setViewportSize({width:390,height:844});await page.locator('#buddyPanel').scrollIntoViewIfNeeded();
  assert(await page.locator('#buddyPanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Mobile Buddy panel must not overflow');assert(await page.locator('#buddyTree').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Mobile tree must not overflow');
  await page.locator('#buddyPanel').screenshot({path:path.join(__dirname,'../../verification/overlay-preview-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});await page.locator('#buddyPanel').screenshot({path:path.join(__dirname,'../../verification/overlay-preview-desktop.png')});
  assert.deepEqual(errors,[]);console.log('PASS: Buddy exact layers/workspaces, portable download/redaction, reviewed import, atomic conflict rejection, retained local journals, baseline gate, matching-only tabs, safe labels, responsive layout, and zero page errors.');
  const offline=await browser.newPage();const offlineErrors=[];offline.on('pageerror',e=>offlineErrors.push(e.message));await offline.goto(require('node:url').pathToFileURL(path.join(root,'index.html')).href);await offline.waitForSelector('#buddyPanel');assert.equal(await offline.locator('#exportMtxBtn').isDisabled(),true);assert.deepEqual(offlineErrors,[]);await offline.close();console.log('PASS: direct local-file launch loads Buddy with no page errors and baseline gate intact.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
