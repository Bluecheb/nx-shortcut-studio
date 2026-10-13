(function(root){
'use strict';
const sourceRoles={label:'Siemens: content and presentation roles',url:'https://blogs.sw.siemens.com/designcenter/nx-roles/'};
const observed={label:'Native NX 2606 checks · October 13, 2026',note:'Scoped observations from disposable-part tests; not certification for other releases.'};
const catalog=[
 {id:'dimension-height',title:'Keep sketch dimensions a fixed screen height',category:'Sketch dimensions',release:'2606',
  phrases:['dimensions stay same size','dimensions do not scale','dimension zoom','text too small','dimension size scaling','auto dimension'],tokens:['dimension','dimensions','zoom','text','size','scaling','sketch','annotation'],
  effect:'Fixed Text Height on Screen controls whether sketch dimension text height stays fixed while zooming. Check this preference before replacing an entire role.',
  scope:'Session-scoped sketch preference in the shipped 2606 definition; inspect the active sketch separately. Not an icon-size setting or a proven diagnosis of your issue.',
  steps:['In an active sketch, open Menu → Task → Sketch Settings.','Record the existing Fixed Text Height on Screen value and text/relation sizes.','If fixed screen height is your goal, enable it and choose a readable text height. Compare the same dimension across zoom without hover highlighting.'],
  risk:'Changing text height can affect readability. Modern and legacy sketch preferences are distinct; do not assume their defaults are the same.',
  rollback:'Restore the recorded checkbox and sizes in the same sketch-settings context.',
  limits:'Native preservation was checked visually at 3 mm; exact pixel equality and the cause of the original symptom were not established.',
  sources:[{label:'Shipped NX 2606 UGII/ug_sketcher.dpx',note:'Sketch_fixedTextSize and Sketch_fixedTextHeight_MU declare scope=Session and describe zoom/text height.'},observed]},
 {id:'ribbon-tabs',title:'Show fewer top ribbon tabs without copying a layout',category:'Ribbon tabs',release:'2606',
  phrases:['hide ribbon tabs','fewer top tabs','simplify ribbon','top ribbon','too many tabs'],tokens:['ribbon','top','tabs','hide','show','clutter','layout'],
  effect:'Studio can change visibility of supported existing docked ribbon tabs in your baseline, without transferring tab order, docking, or sizing.',
  scope:'Existing application profile, chosen separately for Modeling, Sketching, or No Part. Detached/full-screen records are unsupported.',
  steps:['Upload your own saved .mtx baseline in Keep your NX settings.','Choose the workspace in Visible NX Tabs and select the existing tabs you want.','Review changes, retain your original role, finish Sketch/save parts, load outside Sketch, then restart and verify.'],
  risk:'A stored visible flag cannot install missing commands/add-ins or guarantee a tab is available in every application.',
  rollback:'Reload your original saved role outside Sketch, restart, and confirm the previous visible tabs.',
  limits:'The nested RibbonStackInfo visibility representation was tested on a docked Tools tab in NX 2606, not every possible layout.',sources:[sourceRoles,observed]},
 {id:'sidebar-tabs',title:'Choose sidebar tabs by workspace',category:'Sidebar tabs',release:'2606',
  phrases:['hide sidebar tabs','part navigator','resource bar','sidebar clutter','side bar'],tokens:['sidebar','navigator','resource','side','tabs','hide','show'],
  effect:'Studio can toggle existing normal-mode sidebar states for the chosen workspace while retaining docking, widths, inherited states, and touch settings.',
  scope:'Existing explicit application state only. A tab available in No Part may not be offered in Sketch.',
  steps:['Upload your own baseline and choose the workspace under Visible NX Tabs.','Select the existing sidebar tabs; review the exact supported changes.','Load outside Sketch with parts saved, restart, and check Resource Bar → Tabs in the intended workspace.'],
  risk:'History was unavailable in Sketch even with an unsuppressed state. Its absence alone is not proof that an edit worked.',
  rollback:'Reload your original saved role and verify the native tab checklist for the same workspace.',
  limits:'Part Navigator suppression and restoration were confirmed in Sketch on NX 2606. No new sidebar state is created.',sources:[observed]},
 {id:'role-recovery',title:'Start from your own role and preserve unrelated settings',category:'Roles and recovery',release:'2606',
  phrases:['restore my role','fresh role','default role','role messed settings','merge roles','preserve settings','reset layout'],tokens:['role','roles','default','restore','reset','backup','merge','settings','preferences'],
  effect:'NX roles concern available tools and UI presentation. Loading one can overwrite user customizations; a broad donor role is not a shortcut-only patch.',
  scope:'Siemens documents content and presentation roles. Studio patches selected shortcut/visibility fields instead of replacing unrelated role sections.',
  steps:['Before changes, export a New Role from your preferred NX setup and keep it locally.','Use that file as Studio’s baseline. Review changes or merge matching visibility only.','For recovery, save parts and finish Sketch; load your own known-good backup through User Interface Preferences → Roles. Restart and verify.'],
  risk:'A personal backup is not a factory default. Factory role availability/names depend on release and installation; no universal default .mtx is supplied.',
  rollback:'Keep separate original and edited files. Reload the original, not a generated catalog role.',
  limits:'No claim that every NX preference lives in a role, or that role replacement caused a particular dimension issue.',sources:[sourceRoles,observed]},
 {id:'reference-journal',title:'Bind the Create Reference Geometry toggle to your own journal button',category:'Journal shortcuts',release:'2606',
  phrases:['reference geometry','construction lines','construction line','journal shortcut','toggle reference','rectangle instead'],tokens:['reference','construction','journal','button','toggle','shortcut','command','rectangle'],
  effect:'Construction Lines creates derived geometry; it is not this preference toggle. Studio’s example journal toggles SessionSketch.CreateReferenceGeometry.',
  scope:'NX journal/button installation is separate from role accelerators. Each user must register their own button and supply its actual command ID.',
  steps:['Test the journal in NX Sketch with Tools → Journal → Play.','Create/register a user button whose Journal File action points to the journal file, not just a folder.','Paste the button’s generated ID in Journal Commands on Your Keyboard; record your chosen shortcut in the correct workspace. Check native conflicts and test in a disposable sketch.'],
  risk:'A shortcut export does not install the journal/button. A conflicting inherited shortcut may run another command instead.',
  rollback:'Remove the assignment or restore your original role; restore the preference to its previous state if the journal toggled it.',
  limits:'No shortcut is supplied automatically. Command definitions stay in create sections; edits require a supported existing edit section.',
  sources:[{label:'Studio example journal source',url:'https://github.com/Bluecheb/nx-shortcut-studio/blob/main/journals/ToggleCreateReferenceGeometry.vb'},observed]},
 {id:'overlay-buddy',title:'See the exact modifier layer as a shortcut guide',category:'Overlay Buddy',release:'2606',
  phrases:['overlay buddy','show shortcuts','press shift','hold alt','modifier tree','shortcut guide'],tokens:['overlay','buddy','guide','shift','alt','ctrl','modifier','tree','shortcuts'],
  effect:'The web preview shows configured commands for one exact Ctrl/Alt/Shift combination. Alt+Shift entries do not appear in Shift alone.',
  scope:'Current public feature is browser-only. Native Windows source is a separate unbuilt candidate; it is not a downloadable working overlay.',
  steps:['Use the Buddy web prototype and select Modeling or Sketching.','Choose a modifier layer and inspect your configured assignments.','Download a portable project for future companion use; journal slots omit personal IDs and remain unresolved.'],
  risk:'The guide does not execute commands, change NX, resolve inherited conflicts, or observe desktop keys from the website.',
  rollback:'Close the preview or remove imported choices from the browser editor. No NX setting is changed by the guide.',
  limits:'Native focus gating, click-through and DPI behavior require compilation and actual Windows testing before release.',
  sources:[{label:'Portable-project contract',note:'Studio version 1 format and exact-layer tests; design evidence, not Siemens behavior.'}]}
];
const copy=value=>JSON.parse(JSON.stringify(value));
function search(query='',release='2606'){
 if(typeof query!=='string'||query.length>1000)throw Error('Describe your change in 1,000 characters or fewer.');
 if(!/^\d{4}$/.test(release))throw Error('Use a four-digit NX release.');
 const q=query.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),words=new Set(q.split(' ').filter(Boolean));
 const aliases={dimention:'dimension',dimentions:'dimensions',dimensons:'dimensions',panels:'sidebar',hotkey:'shortcut',hotkeys:'shortcut',ribbons:'ribbon',keybindings:'shortcuts',restore:'restore'};
 for(const w of [...words])if(aliases[w])words.add(aliases[w]);
 return catalog.map((entry,index)=>{let score=q?0:1;
  if(q)for(const phrase of entry.phrases)if(q.includes(phrase))score+=5;
  for(const word of entry.tokens)if(words.has(word))score++;
  return {entry,index,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(({entry,score})=>({...copy(entry),score,releaseMatches:entry.release===release,evidenceStatus:entry.release===release?'NX 2606 evidence':'Not verified for NX '+release}));
}
const api={search,catalog:()=>copy(catalog)};
if(typeof module==='object'&&module.exports)module.exports=api;else root.NX_ADVISOR=api;
})(typeof window==='object'?window:globalThis);
