'use strict';
// Source safeguards and JS-side vectors only. This does not compile or run C#.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createController}=require('../companion/display-controller.cjs');
const vectors=require('../companion/controller-vectors.json'),c=createController(vectors.project);
for(const {expected,...sample} of vectors.samples){const state=c.step(sample);for(const key of ['status','reason','layer','showAt'])assert.equal(state[key],expected[key]);assert.equal(state.rows.length,expected.count);}
const root=path.resolve(__dirname,'../companion/windows'),desktop=fs.readFileSync(path.join(root,'Desktop.cs'),'utf8');
assert(!/SendInput|SetForegroundWindow|SetWindowsHookEx|HttpClient|File\.Write|Registry\.Set/i.test(desktop));
assert.equal([...desktop.matchAll(/Down\((0x[0-9a-f]+)\)/gi)].map(m=>m[1]).sort().join(','),'0x10,0x11,0x12');
assert(desktop.includes('&0x8000'));assert(desktop.includes('Native.GetForegroundWindow()!=h'));assert(desktop.includes('StringComparison.OrdinalIgnoreCase'));
assert(desktop.includes('0x08000000'));assert(desktop.includes('ShowActivated=false'));assert(desktop.includes('IsChecked=true'));
const project=fs.readFileSync(path.join(root,'NxBuddy.csproj'),'utf8');assert(project.includes('net10.0-windows'));assert(project.includes('<PlatformTarget>x64</PlatformTarget>'));assert(!project.includes('PackageReference'));
const sdk=JSON.parse(fs.readFileSync(path.join(root,'global.json')));assert.equal(sdk.sdk.allowPrerelease,false);
console.log('PASS: eight shared controller vectors in JS and native source safety guards; C# compilation/runtime NOT verified.');
