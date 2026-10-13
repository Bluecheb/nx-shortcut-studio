(function(root){
'use strict';
const FORMAT='nx-studio-project',VERSION=1,MAX_BYTES=256*1024;
const scopes=['UG_APP_MODELING','UG_APP_SKETCH_TASK','UG_APP_NOPART'];
const layers=['none','shift','ctrl','alt','ctrl+shift','alt+shift','ctrl+alt','ctrl+alt+shift'];
const defaults={position:'top-right',opacity:0.9,fontSize:16,showDelayMs:120,hideDelayMs:180};
const clone=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw Error(message);};
function object(value,name){if(!value||typeof value!=='object'||Array.isArray(value))fail(name+' must be an object.');}
function fields(value,allowed,name){object(value,name);for(const key of Object.keys(value))if(!allowed.includes(key))fail('Unsupported '+name+' field: '+key);}
function text(value,max,name){if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f\x7f]/.test(value))fail('Invalid '+name+'.');return value;}
function keyParts(value){
 if(typeof value!=='string'||value.length>60)fail('Invalid shortcut.');
 if(!value)return {key:'',layer:'none',base:''};
 const parts=value.split('+').map(x=>x.trim());const base=parts.pop();const mods=[];
 for(const part of parts){const mod={ctrl:'Ctrl',alt:'Alt',shift:'Shift'}[part.toLowerCase()];if(!mod||mods.includes(mod))fail('Use Ctrl, Alt, and Shift once each in shortcuts.');mods.push(mod);}
 const aliases={escape:'Esc',esc:'Esc',space:'Space',enter:'Enter',tab:'Tab',backspace:'Backspace',delete:'Delete',insert:'Insert',home:'Home',end:'End',pageup:'PageUp',pagedown:'PageDown',up:'Up',down:'Down',left:'Left',right:'Right',capslock:'CapsLock'};
 const normalized=aliases[base?.toLowerCase()]||base?.toUpperCase();
 if(!normalized||!(/^[A-Z0-9]$/.test(normalized)||/^F(?:[1-9]|1\d|2[0-4])$/.test(normalized)||Object.values(aliases).includes(normalized)||/^[\[\];',.\/\-=`]$/.test(normalized)))fail('Unsupported shortcut key: '+base);
 const ordered=['Ctrl','Alt','Shift'].filter(x=>mods.includes(x));
 return {key:[...ordered,normalized].join('+'),layer:ordered.map(x=>x.toLowerCase()).join('+')||'none',base:normalized};
}
function portableTab(id){return typeof id==='string'&&/^[A-Za-z0-9_:.\/-]{1,160}$/.test(id)&&!/^([A-Za-z]:|\/)/.test(id)&&!id.includes('..')&&!['__proto__','constructor','prototype'].includes(id);}
function visibility(value){
 fields(value,['ribbon','side'],'tabs');const result={ribbon:{},side:{}};
 for(const kind of ['ribbon','side']){
  fields(value[kind],scopes,kind+' tabs');
  for(const [scope,entries] of Object.entries(value[kind])){
   object(entries,'tab choices');if(Object.keys(entries).length>200)fail('Too many tab choices.');result[kind][scope]={};
   for(const [id,visible] of Object.entries(entries)){if(!portableTab(id)||typeof visible!=='boolean')fail('Invalid portable tab choice.');result[kind][scope][id]=visible;}
  }
 }
 return result;
}
function bindings(list){
 if(!Array.isArray(list)||list.length>200)fail('Each workspace supports at most 200 bindings.');
 const seen=new Set(),slots=new Set();
 return list.map(row=>{
  fields(row,['label','key','kind','commandId','slot'],'binding');text(row.label,99,'command name');
  const key=keyParts(row.key).key;if(key&&seen.has(key))fail('Duplicate shortcut: '+key);if(key)seen.add(key);
  if(!['builtin','journal'].includes(row.kind))fail('Invalid command kind.');
  if(row.kind==='builtin'){
   if(typeof row.commandId!=='string'||!/^[A-Za-z0-9_.:-]{1,128}$/.test(row.commandId)||/^USRCMD_|^NX_SHORTCUT_STUDIO_|^NX_STUDIO_JOURNAL_/i.test(row.commandId)||row.slot!==undefined)fail('Invalid built-in command ID.');
   return {label:row.label,key,kind:'builtin',commandId:row.commandId};
  }
  if(row.commandId!==null||typeof row.slot!=='string'||!/^journal-[1-9]\d{0,2}$/.test(row.slot)||slots.has(row.slot))fail('Journal entries need a unique local slot, not a personal command ID.');slots.add(row.slot);
  return {label:row.label,key,kind:'journal',commandId:null,slot:row.slot};
 });
}
function validate(value){
 fields(value,['format','schemaVersion','nxVersion','workspaces','tabs','overlay'],'project');
 if(value.format!==FORMAT||value.schemaVersion!==VERSION)fail('Unsupported project format/version. Use a version 1 .nxstudio.json project.');
 if(typeof value.nxVersion!=='string'||!/^\d{4}$/.test(value.nxVersion))fail('Declare a four-digit NX release, such as 2606.');
 fields(value.workspaces,['modeling','sketch'],'workspaces');
 const workspaces={modeling:bindings(value.workspaces.modeling),sketch:bindings(value.workspaces.sketch)};
 const tabs=visibility(value.tabs);fields(value.overlay,Object.keys(defaults),'overlay');
 if(!['top-left','top-right','bottom-left','bottom-right'].includes(value.overlay.position))fail('Invalid overlay position.');
 for(const [name,min,max] of [['opacity',0.75,1],['fontSize',12,24],['showDelayMs',0,1000],['hideDelayMs',0,1000]])if(typeof value.overlay[name]!=='number'||!Number.isFinite(value.overlay[name])||value.overlay[name]<min||value.overlay[name]>max||(name!=='opacity'&&!Number.isInteger(value.overlay[name])))fail('Invalid overlay '+name+'.');
 const result={format:FORMAT,schemaVersion:VERSION,nxVersion:value.nxVersion,workspaces,tabs,overlay:clone(value.overlay)};
 if(new TextEncoder().encode(JSON.stringify(result)).length>MAX_BYTES)fail('Project exceeds the 256 KB limit.');
 return result;
}
function parse(source){if(typeof source!=='string'||new TextEncoder().encode(source).length>MAX_BYTES)fail('Project exceeds the 256 KB limit.');return validate(JSON.parse(source));}
function isJournal(row){return row.kind==='journal'||/^USRCMD_|^NX_SHORTCUT_STUDIO_|^NX_STUDIO_JOURNAL_/i.test(row.id);}
function shareableLabel(row,fallback){
 const label=row.id?row.label.replaceAll(row.id,fallback):row.label;
 return /[A-Za-z]:[\\/]|\\|^\//.test(label)?fallback:label;
}
function create(maps,tabs,nxVersion,overlay=defaults){
 const workspaces={};let omittedTabs=0;
 for(const scope of ['modeling','sketch']){let slot=0;workspaces[scope]=maps[scope].map(row=>{if(isJournal(row)){slot++;return {label:shareableLabel(row,'Journal '+slot),key:row.key,kind:'journal',commandId:null,slot:'journal-'+slot};}return {label:shareableLabel(row,row.id),key:row.key,kind:'builtin',commandId:row.id};});}
 const portable={ribbon:{},side:{}};
 for(const kind of ['ribbon','side'])for(const scope of scopes){portable[kind][scope]={};for(const [id,visible] of Object.entries(tabs?.[kind]?.[scope]||{})){if(portableTab(id))portable[kind][scope][id]=visible;else omittedTabs++;}}
 return {project:validate({format:FORMAT,schemaVersion:VERSION,nxVersion,workspaces,tabs:portable,overlay:clone(overlay)}),omittedTabs};
}
function layerRows(project,scope,layer){if(!['modeling','sketch'].includes(scope)||!layers.includes(layer))fail('Invalid preview layer.');return project.workspaces[scope].filter(row=>row.key&&keyParts(row.key).layer===layer).map(row=>({...row,base:keyParts(row.key).base})).sort((a,b)=>a.base.localeCompare(b.base,undefined,{numeric:true}));}
function prepareShortcuts(project,current){
 const maps={};let deferred=0;
 for(const scope of ['modeling','sketch']){
  const local=current[scope].filter(isJournal).map(row=>({...row}));
  const incoming=project.workspaces[scope];deferred+=incoming.filter(row=>row.kind==='journal').length;
  maps[scope]=incoming.filter(row=>row.kind==='builtin').map(row=>({label:row.label,id:row.commandId,key:row.key})).concat(local);
  const keys=new Set();for(const row of maps[scope]){const key=keyParts(row.key).key;if(key&&keys.has(key))fail('Imported shortcut '+key+' conflicts with a retained local journal in '+scope+'. Edit one assignment first.');if(key)keys.add(key);row.key=key;}
 }
 return {maps,deferred};
}
const api={FORMAT,VERSION,MAX_BYTES,defaults,layers,keyParts,portableTab,validate,parse,create,layerRows,prepareShortcuts,isJournal};
if(typeof module==='object'&&module.exports)module.exports=api;else root.NX_PORTABLE_PROJECT=api;
})(typeof window==='object'?window:globalThis);
