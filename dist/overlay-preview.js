(()=>{
'use strict';
const api=window.NX_PORTABLE_PROJECT;
const panel=document.createElement('section');panel.className='buddy-panel';panel.id='buddyPanel';
panel.innerHTML=`<div class="section-title"><div><span class="eyebrow">OVERLAY BUDDY · WEB PROTOTYPE</span><h2>Your shortcut tree, one layer at a time.</h2><p>This preview only works in this browser. It does not overlay NX, monitor desktop keys, or run commands.</p></div></div>
<div class="buddy-tools"><label>Workspace<select id="buddyWorkspace"><option value="modeling">Modeling</option><option value="sketch">Sketching</option></select></label><label>Declared NX release<input id="buddyNxVersion" value="2606" inputmode="numeric" maxlength="4" pattern="[0-9]{4}"></label><label>Corner<select id="buddyPosition"><option value="top-right">Top right</option><option value="top-left">Top left</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option></select></label><label>Text size<select id="buddyFontSize"><option value="14">Small</option><option value="16" selected>Medium</option><option value="20">Large</option></select></label></div>
<div id="buddyLayers" class="buddy-layers" role="group" aria-label="Exact modifier combination"></div>
<div id="buddyStage" class="buddy-stage"><article id="buddyTree" class="buddy-tree"><h3 id="buddyLayerTitle"></h3><ul id="buddyRows"></ul><p id="buddyEmpty"></p></article></div>
<div class="buddy-actions"><button id="refreshBuddy" class="subtle" type="button">Refresh from assignments</button><button id="exportProject" class="primary" type="button">Download portable project</button><button id="importProject" class="subtle" type="button">Import portable project</button><input id="projectFile" type="file" accept=".nxstudio.json,.json,application/json" hidden></div>
<p class="buddy-note">Shareable projects omit personal journal IDs and file-backed palette paths. Recipients register their own journals. Only Ctrl/Alt/Shift shortcuts are supported by this prototype.</p><p id="buddyStatus" class="buddy-note" role="status"></p>`;
document.querySelector('.keyboard-panel').after(panel);
const dialog=document.createElement('dialog');dialog.id='projectReview';dialog.className='project-review';
dialog.innerHTML=`<h2>Review portable project</h2><p id="projectSummary"></p><p>Import changes this browser editor, not NX. The baseline role remains required for MTX export.</p><label class="project-option"><input id="projectApplyShortcuts" type="checkbox" checked> Replace built-in shortcuts; keep my local journal bindings</label><label class="project-option"><input id="projectApplyTabs" type="checkbox"> Apply matching ribbon and sidebar visibility choices</label><p class="buddy-note">Imported journals stay in the preview only: their IDs are deliberately omitted. Register each journal in your NX and add its own command ID to the editor. File-backed palette choices are not shared.</p><p id="projectImportError" role="alert"></p><div class="buddy-actions"><button id="cancelProjectImport" type="button" class="subtle">Cancel</button><button id="applyProjectImport" type="button" class="primary">Apply to browser editor</button></div>`;
document.body.append(dialog);
const $=id=>document.getElementById(id);let layer='none',pending=null,importedPreview=null,overlaySettings={...api.defaults};
function settings(){return {...overlaySettings,position:$('buddyPosition').value,fontSize:Number($('buddyFontSize').value)};}
function currentProject(){return api.create(window.NX_STUDIO_EDITOR.getShortcuts(),window.NX_ROLE_VISIBILITY.getState(),$('buddyNxVersion').value,settings());}
function status(message){$('buddyStatus').textContent=message;}
function label(value){return value==='none'?'No modifier':value.split('+').map(x=>({ctrl:'Ctrl',alt:'Alt',shift:'Shift'})[x]).join(' + ');}
for(const value of api.layers){const button=document.createElement('button');button.type='button';button.textContent=label(value);button.dataset.layer=value;button.onclick=()=>{layer=value;render();};$('buddyLayers').append(button);}
function render(){
 for(const button of $('buddyLayers').children)button.setAttribute('aria-pressed',String(button.dataset.layer===layer));
 $('buddyStage').dataset.position=$('buddyPosition').value;$('buddyTree').style.fontSize=$('buddyFontSize').value+'px';
 const box=$('buddyRows');box.replaceChildren();$('buddyLayerTitle').textContent=label(layer)+' · '+($('buddyWorkspace').value==='sketch'?'Sketching':'Modeling');
 try{
  const project=importedPreview||currentProject().project,rows=api.layerRows(project,$('buddyWorkspace').value,layer);
  for(const row of rows){const item=document.createElement('li'),key=document.createElement('kbd'),name=document.createElement('span');key.textContent=row.base;name.textContent=row.label;item.append(key,name);if(row.kind==='journal'){const note=document.createElement('small');note.textContent=importedPreview?'Journal · needs your NX ID':'Local journal · ID omitted from sharing';item.append(note);}box.append(item);}
  $('buddyEmpty').textContent=rows.length?'':'No assigned commands in this exact layer.';
 }catch(error){$('buddyEmpty').textContent=error.message;}
}
for(const id of ['buddyWorkspace','buddyPosition','buddyFontSize'])$(id).onchange=render;
$('buddyNxVersion').oninput=render;
$('refreshBuddy').onclick=()=>{importedPreview=null;status('Preview refreshed from current editor assignments.');render();};
document.addEventListener('nx:editor-changed',()=>{if(!importedPreview)render();});
$('exportProject').onclick=()=>{
 try{const {project,omittedTabs}=currentProject();download('NX-'+project.nxVersion+'.nxstudio.json',JSON.stringify(project,null,2),'application/json');status('Portable project downloaded. Journal IDs excluded; '+omittedTabs+' non-portable tab choices omitted.');}catch(error){status('Project not exported: '+error.message);}
};
$('importProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>api.MAX_BYTES)throw Error('Project exceeds the 256 KB limit.');pending=api.parse(await file.text());
  const all=Object.values(pending.workspaces).flat(),journals=all.filter(row=>row.kind==='journal').length;
  $('projectSummary').textContent='NX '+pending.nxVersion+' · '+all.length+' bindings · '+journals+' journals without personal IDs. Version is declared, not verified compatibility.';
  $('projectApplyShortcuts').checked=true;$('projectApplyTabs').checked=false;$('projectImportError').textContent='';dialog.showModal();
 }catch(error){pending=null;status('Project not imported: '+error.message);}
 event.target.value='';
};
$('cancelProjectImport').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{pending=null;});
$('applyProjectImport').onclick=()=>{
 if(!pending)return;
 try{
  // Preflight every selected change before touching browser state.
  const prepared=$('projectApplyShortcuts').checked?api.prepareShortcuts(pending,window.NX_STUDIO_EDITOR.getShortcuts()):null;
  const current=window.NX_ROLE_VISIBILITY.getState(),next=JSON.parse(JSON.stringify(current));let applied=0,unmatched=0;
  if($('projectApplyTabs').checked)for(const kind of ['ribbon','side'])for(const [scope,choices] of Object.entries(pending.tabs[kind]))for(const [id,visible] of Object.entries(choices)){if(Object.hasOwn(next[kind]?.[scope]||{},id)){next[kind][scope][id]=visible;applied++;}else unmatched++;}
  if(prepared)window.NX_STUDIO_EDITOR.loadShortcuts(prepared.maps);
  if($('projectApplyTabs').checked)window.NX_ROLE_VISIBILITY.importState(next);
  importedPreview=pending;overlaySettings={...pending.overlay};$('buddyNxVersion').value=pending.nxVersion;$('buddyPosition').value=pending.overlay.position;
  const sizeOption=[...$('buddyFontSize').options].find(x=>Number(x.value)===pending.overlay.fontSize);if(!sizeOption){const option=document.createElement('option');option.value=String(pending.overlay.fontSize);option.textContent=pending.overlay.fontSize+' px';$('buddyFontSize').append(option);}$('buddyFontSize').value=String(pending.overlay.fontSize);
  status('Imported project preview. '+(prepared?'Built-in shortcuts updated; local journals retained. ':'Editor shortcuts unchanged. ')+applied+' tab choices applied; '+unmatched+' unmatched choices skipped. Imported journal assignments are preview-only. Refresh to view the editor.');
  dialog.close();render();
 }catch(error){$('projectImportError').textContent=error.message;}
};
render();
})();
