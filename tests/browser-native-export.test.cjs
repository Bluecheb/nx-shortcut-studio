'use strict';
// Real browser download -> compiled console reader. No desktop adapter or NX input.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {chromium}=require('playwright'),api=require('../dist/portable-project.js');
const root=path.resolve(__dirname,'../dist');
const dotnet=process.env.NX_DOTNET_EXE,dll=process.env.NX_BUDDY_CORE_TEST_DLL;
assert(dotnet&&dll,'Set NX_DOTNET_EXE and NX_BUDDY_CORE_TEST_DLL to the built console verifier (not NxBuddy.exe).');
const maps={modeling:[],sketch:[]};
for(const workspace of Object.keys(maps))for(const [i,layer] of api.layers.entries()){
 const prefix=layer==='none'?'':layer+'+';
 maps[workspace].push({id:'UG_TEST_'+workspace+'_'+i,label:'Display fixture '+workspace+' '+layer+' · Δ',key:prefix+'F2'});
 maps[workspace].push({id:'UG_TEST_OTHER_'+workspace+'_'+i,label:'Second fixture '+layer,key:prefix+'F10'});
}
maps.sketch.push({id:'USRCMD_PRIVATE_EXPORT_FIXTURE',label:'Private local journal',key:'R',kind:'journal'});
maps.modeling.push({id:'UG_TEST_PUNCTUATION',label:'Punctuation fixture',key:'Ctrl+;'});
let cases=0;
(async()=>{
 const server=http.createServer((req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'text/plain'});res.end(fs.readFileSync(file));
 }catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.NX_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#exportProject');
  async function verify(assignments,corner,font){
   await page.evaluate(value=>window.NX_STUDIO_EDITOR.loadShortcuts(value),assignments);
   await page.selectOption('#buddyPosition',corner);await page.selectOption('#buddyFontSize',String(font));
   const wait=page.waitForEvent('download');await page.click('#exportProject');const download=await wait;
   const filename=await download.path(),source=fs.readFileSync(filename,'utf8'),project=api.parse(source);
   assert(download.suggestedFilename().endsWith('.nxstudio.json'));assert(!source.includes('USRCMD_PRIVATE_EXPORT_FIXTURE'));
   assert.equal(await page.locator('#exportMtxBtn').isDisabled(),true,'Portable download cannot bypass baseline gate');
   const result=spawnSync(dotnet,[dll,'--verify-export',filename],{encoding:'utf8',timeout:30000});
   assert.equal(result.status,0,result.stderr||result.stdout);
   const line=result.stdout.split(/\r?\n/).find(s=>s.startsWith('PORTABLE_VERIFY:'));assert(line,'C# verifier JSON response required');
   const native=JSON.parse(line.slice('PORTABLE_VERIFY:'.length));
   assert.deepEqual(native.overlay,{position:corner,opacity:project.overlay.opacity,fontSize:font,showDelayMs:project.overlay.showDelayMs});
   assert.equal(native.snapshots.length,16);
   for(const snapshot of native.snapshots){
    const expected=api.layerRows(project,snapshot.workspace,snapshot.layer).map(row=>({label:row.label,key:row.key,journal:row.kind==='journal'}));
    assert.deepEqual(snapshot.rows,expected,'Native rows and order must match the browser');
    assert.equal(snapshot.status,expected.length?'visible':'hidden');
   }
   cases++;
  }
  await verify(maps,'bottom-left',20);
  await verify({modeling:[],sketch:[]},'top-right',14);
  await verify({modeling:Array.from({length:24},(_,i)=>({id:'UG_LONG_'+i,label:'Long display-only fixture '+i+' with wrapped text, no NX assignment applied',key:'F'+(i+1)})),sketch:[]},'bottom-right',16);
  assert.deepEqual(errors,[]);
  console.log('PASS: '+cases+' actual browser downloads parsed by C#; 48 workspace/layer snapshots, Unicode/punctuation/journal redaction, overlay settings, empty/long lists and baseline gate. No NX desktop observer.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
