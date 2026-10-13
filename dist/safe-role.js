(() => {
  'use strict';
  const engine=window.NX_ROLE_PATCH;
  const panel=document.createElement('section');panel.className='role-panel safe-role-panel';
  panel.innerHTML=`<div class="section-title"><div><span class="eyebrow">YOUR NX BASELINE</span><h2>Keep your NX settings</h2><p>Upload a role saved from your current NX setup. Review shortcut and tab changes before downloading a new role.</p></div><button id="loadBaseline" class="primary">Upload my .mtx role</button></div>
    <input id="baselineFile" type="file" accept=".mtx,application/xml,text/xml" hidden>
    <p id="baselineStatus" role="status">A baseline role is required for MTX export. JSON layouts can be used independently.</p>
    <p>In NX, open the Roles resource bar and create a New User Role from your preferred setup. Keep that role for recovery. File contents stay in this browser.</p>
    <div class="merge-choices"><label class="merge-choice"><span><input id="patchShortcuts" type="checkbox" checked> Keyboard shortcuts</span></label><label class="merge-choice"><span><input id="patchRibbons" type="checkbox" checked> Ribbon visibility</span></label><label class="merge-choice"><span><input id="patchSidebar" type="checkbox" checked> Sidebar visibility (normal mode)</span></label></div>
    <p id="baselineScopeNote">The catalog is for NX 2606. Verify your NX release before importing a generated role. Only sidebar tabs with an explicit state for the selected workspace are editable; inherited states and touch-mode settings are retained.</p>
    <p>Docked ribbon tabs use their saved ribbon-stack visibility; detached or full-screen records are not offered. Shortcut changes need an NX-exported edit-mode container, not a command-definition-only role.</p>
    <p>Before testing in NX, finish the active sketch, save your open parts, and keep the original role. Load outside an active sketch, then restart NX and verify the tabs, shortcuts, and dimension behavior. Loading while a sketch is active can leave the current layout unchanged or overwrite saved tab flags.</p>
    <button id="reviewRole" class="subtle" disabled>Review role changes</button><pre id="roleChangeReport" aria-live="polite"></pre>`;
  document.querySelector('.intro').after(panel);
  const dialog=document.createElement('dialog');dialog.className='command-dialog';
  dialog.innerHTML='<div class="dialog-head"><h2>Review your NX role</h2><button id="closeRoleReview" class="remove" aria-label="Close review">×</button></div><pre id="roleReviewText"></pre><label id="skippedLabel" hidden><input type="checkbox" id="ackSkipped"> Export only the supported changes listed above</label><div class="swap-actions"><button id="downloadRoleAudit" class="subtle">Download change report</button><button id="downloadPatchedRole" class="primary">Download .mtx</button></div>';
  document.body.append(dialog);
  let baseline=null,baselineText='',filename='',revision='',candidate=null;
  const byId=id=>document.getElementById(id);
  function report(result) {return [filename,'',result.changes.length+' changes reviewed. Unrelated settings passed structural verification.',...result.changes,'',...(result.skipped.length?['Not applied:',...result.skipped]:[]),'','Verify the new role in NX. Keep your original baseline available.'].join('\n');}
  function request() {
    const maps=window.NX_STUDIO_EDITOR.getShortcuts(),visibility=window.NX_ROLE_VISIBILITY.getState();
    const shortcuts={};
    if(byId('patchShortcuts').checked) {
      if(baseline.querySelector('Repository > Content > Actions'))shortcuts.repository=maps.modeling;
      else if(maps.modeling.some(i=>i.key))throw Error('Baseline has no general shortcut container. Save a general shortcut in NX and export your role again.');
      if(baseline.querySelector('Profile[name="UG_APP_SKETCH_TASK"] > Content > Actions'))shortcuts.UG_APP_SKETCH_TASK=maps.sketch;
      else if(maps.sketch.some(i=>i.key))throw Error('Baseline has no Sketch shortcut container. Save a Sketch shortcut in NX and export your role again.');
    }
    return {shortcuts,visibility:{ribbon:byId('patchRibbons').checked?visibility.ribbon:{},side:byId('patchSidebar').checked?visibility.side:{}},identity:{name:'NX_STUDIO_'+revision,title:'NX Shortcut Studio — '+filename.replace(/\.mtx$/i,'')}};
  }
  function build() {if(!baseline)throw Error('Upload your current NX role first.');const result=engine.patch(baseline,request());return {...result,text:result.changes.length?'<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(result.xml):baselineText};}
  function review() {
    try {candidate=build();byId('roleReviewText').textContent=report(candidate);byId('roleChangeReport').textContent=report(candidate);byId('skippedLabel').hidden=!candidate.skipped.length;byId('ackSkipped').checked=false;byId('downloadPatchedRole').disabled=!!candidate.skipped.length;dialog.showModal();}
    catch(error){byId('roleChangeReport').textContent='Export blocked: '+error.message;}
  }
  byId('loadBaseline').onclick=()=>byId('baselineFile').click();
  byId('baselineFile').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try {
      if(file.size>10*1024*1024)throw Error('File exceeds 10 MB.');
      const text=await file.text(),xml=engine.parse(text),maps=engine.shortcuts(xml,window.NX_COMMANDS || []);
      if(maps.modeling.length>200 || maps.sketch.length>200)throw Error('This role contains more than 200 commands per editor workspace.');
      window.NX_STUDIO_EDITOR.loadShortcuts(maps);
      window.NX_ROLE_VISIBILITY.loadRole(xml);
      baseline=xml;baselineText=text;filename=file.name;revision=String(Date.now());candidate=null;
      byId('baselineStatus').textContent=file.name+' loaded. Existing assignments and tabs are shown below.';
      byId('roleChangeReport').textContent='Review changes when you are ready.';
      byId('reviewRole').disabled=false;byId('exportMtxBtn').disabled=false;
    }catch(error){baseline=null;candidate=null;byId('reviewRole').disabled=true;byId('exportMtxBtn').disabled=true;byId('baselineStatus').textContent='Role not loaded: '+error.message;}
    event.target.value='';
  };
  byId('exportMtxBtn').textContent='Review & export .mtx';byId('exportMtxBtn').disabled=true;byId('exportMtxBtn').onclick=review;
  byId('reviewRole').onclick=review;byId('closeRoleReview').onclick=()=>dialog.close();
  byId('ackSkipped').onchange=()=>{byId('downloadPatchedRole').disabled=!byId('ackSkipped').checked;};
  byId('downloadPatchedRole').onclick=()=>{
    try {const current=build();if(!candidate || current.text!==candidate.text || JSON.stringify(current.skipped)!==JSON.stringify(candidate.skipped))throw Error('Choices changed. Close this review and review again.');
      if(candidate.skipped.length&&!byId('ackSkipped').checked)throw Error('Review unsupported changes first.');
      download('NX Shortcut Studio - Patched.mtx',current.text,'application/xml');dialog.close();
    }catch(error){byId('roleReviewText').textContent='Export blocked: '+error.message;}
  };
  byId('downloadRoleAudit').onclick=()=>{if(candidate)download('NX-role-change-report.txt',report(candidate),'text/plain');};
  window.NX_SAFE_ROLE={build,review};
})();
