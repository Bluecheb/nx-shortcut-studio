(()=>{
const SCOPES=['UG_APP_MODELING','UG_APP_SKETCH_TASK','UG_APP_NOPART'];
const RIBBON_LABELS={
  'rbn_modeling_home.rtb':'Home','rbn_sketch_te_sxline.rtb':'Sketch','rbn_assemblies.rtb':'Assemblies','rbn_analyze.rtb':'Analysis','rbn_application.rtb':'Application','rbn_curves.rtb':'Curve','rbn_display.rtb':'View','rbn_tools.rtb':'Tools','rbn_visualization.rtb':'Visualization','rbn_pmi.rtb':'PMI','RESOURCE_BAR_TAB':'Resource Bar'
};
const SIDE_LABELS={ANT:'Assembly Navigator',CNAV:'Constraint Navigator',PARTNT:'Part Navigator',ONT:'Operation Navigator',TCNAV:'Teamcenter Navigator',MOTION_SNT:'Motion Navigator',SEQNT:'Sequence Navigator','UGS::SketchUI::Nav::SketchNavigator':'Sketch Navigator','UGS::CamUI::FeatureNavigator':'Feature Navigator','UGS::CamUI::OperationNavigator':'CAM Operation Navigator','UG/ROLE_SYSTEM_PAL:Roles':'Roles'};
const roleXml=new DOMParser().parseFromString(window.NX_BASE_ROLE||'<NX_PROFILES/>','application/xml');
const ribbons={};
for(const scope of SCOPES){
  const profile=[...roleXml.querySelectorAll('Profile')].find(x=>x.getAttribute('name')===scope);
  ribbons[scope]=profile?[...profile.querySelectorAll('Layout > ActionLists > ActionList')].filter(x=>x.getAttribute('type')==='ribbontab').map(x=>({id:x.getAttribute('name'),label:ribbonLabel(x.getAttribute('name')),visible:x.querySelector('BarInfo')?.getAttribute('visibility')==='1'})):[];
}
const resourceSetting=roleXml.querySelector('SessionSettings > Setting[name="ResourceBar"]');
const sideTabs=resourceSetting?[...resourceSetting.children].filter(x=>x.tagName==='Tab').map(x=>({id:x.getAttribute('id'),label:sideLabel(x.getAttribute('id')),element:x})):[];
const defaults={ribbon:{},side:{}};
for(const scope of SCOPES){
  defaults.ribbon[scope]=Object.fromEntries(ribbons[scope].map(x=>[x.id,x.visible]));
  defaults.side[scope]=Object.fromEntries(sideTabs.map(tab=>[tab.id,sideDefault(tab.element,scope)]));
}
let state=loadState();
function ribbonLabel(id){return window.NX_TAB_DETAILS?.ribbon?.[id]?.[0]||RIBBON_LABELS[id]||id.replace(/^rbn_/,'').replace(/\.(rtb|stb|crb)$/,'').replace(/_te_/g,' ').replace(/_/g,' ').replace(/\b(tc|pmi|cam|nx)\b/gi,x=>x.toUpperCase()).replace(/\b\w/g,x=>x.toUpperCase()).replace(/^Modeling /,'')}
function sideDetails(id){const known=window.NX_TAB_DETAILS?.side?.[id];if(known)return known;if(/history\.pax$/i.test(id))return ['History','Recently used parts and files.'];if(/CAM_Machine_Samples\.pax$/i.test(id))return ['Manufacturing Machine Samples','Prepackaged CAM machine and setup examples.'];if(/prepackaged_scenes\.pax$/i.test(id))return ['System Scenes','Prepackaged rendering scenes, lighting, and backgrounds.'];if(/^[A-Za-z]:[\\/]/.test(id))return [id.split(/[\\/]/).pop().replace(/\.pax$/i,''),'File-backed NX palette; exact display name not verified.'];return ['Specialized Navigator — '+id,'Internal NX identifier; exact display name not verified.']}
function sideLabel(id){return sideDetails(id)[0]}
function tabDescription(kind,id){return kind==='side'?sideDetails(id)[1]:(window.NX_TAB_DETAILS?.ribbon?.[id]?.[1]||'Context-specific NX ribbon tab; title not verified.')}
function sideDefault(tab,scope){const states=[...tab.children].filter(x=>x.tagName==='State');const exact=states.find(x=>x.getAttribute('app')===scope);const all=states.find(x=>x.getAttribute('app')==='All');return (exact||all)?.getAttribute('suppressed')!=='1'}
function cloneDefaults(){return JSON.parse(JSON.stringify(defaults))}
function loadState(){try{const saved=JSON.parse(localStorage.getItem('nx-role-visibility-v1'));return normalize(saved)}catch{return cloneDefaults()}}
function normalize(value){const result=cloneDefaults();for(const kind of ['ribbon','side'])for(const scope of SCOPES)for(const id of Object.keys(result[kind][scope]))if(typeof value?.[kind]?.[scope]?.[id]==='boolean')result[kind][scope][id]=value[kind][scope][id];return result}
function save(){localStorage.setItem('nx-role-visibility-v1',JSON.stringify(state));render()}
function currentScope(){return document.getElementById('visibilityScope').value}
function renderKind(kind){const scope=currentScope();const source=kind==='ribbon'?ribbons[scope]:sideTabs;const catalog=[...source].sort((a,b)=>Number(/not verified|not identified/.test(tabDescription(kind,a.id)))-Number(/not verified|not identified/.test(tabDescription(kind,b.id)))||a.label.localeCompare(b.label));const query=document.getElementById(kind+'VisibilitySearch').value.trim().toLowerCase();const box=document.getElementById(kind+'Visibility');box.replaceChildren();for(const item of catalog){const description=tabDescription(kind,item.id);const searchable=(item.label+' '+description+' '+item.id).toLowerCase();if(query&&!searchable.includes(query))continue;const row=document.createElement('label');row.className='visibility-item';row.title='NX identifier: '+item.id;const check=document.createElement('input');check.type='checkbox';check.checked=state[kind][scope][item.id]!==false;check.onchange=()=>{state[kind][scope][item.id]=check.checked;save()};const text=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.label;const small=document.createElement('small');small.textContent=description;text.append(strong,small);row.append(check,text);box.append(row)}const total=catalog.length;const allShown=Object.values(state[kind][scope]).filter(Boolean).length;document.getElementById(kind+'VisibilityCount').textContent=allShown+' of '+total+' visible'}
function render(){renderKind('ribbon');renderKind('side')}
function setAll(kind,action){const scope=currentScope();if(action==='reset')state[kind][scope]={...defaults[kind][scope]};else for(const id of Object.keys(state[kind][scope]))state[kind][scope][id]=action==='show';save()}
function applyToXml(xml){
  for(const scope of SCOPES){const profile=[...xml.querySelectorAll('Profile')].find(x=>x.getAttribute('name')===scope);if(profile)for(const actionList of profile.querySelectorAll('Layout > ActionLists > ActionList[type="ribbontab"]')){const id=actionList.getAttribute('name');const visible=state.ribbon[scope]?.[id];if(typeof visible==='boolean')actionList.querySelector('BarInfo')?.setAttribute('visibility',visible?'1':'0')}}
  for(const setting of xml.querySelectorAll('SessionSettings > Setting[name="ResourceBar"], TouchSessionSettings > Setting[name="ResourceBar"]'))for(const tab of [...setting.children].filter(x=>x.tagName==='Tab'))for(const scope of SCOPES){const visible=state.side[scope]?.[tab.getAttribute('id')];if(typeof visible!=='boolean')continue;let target=[...tab.children].find(x=>x.tagName==='State'&&x.getAttribute('app')===scope);if(!target){target=xml.createElement('State');target.setAttribute('app',scope);target.setAttribute('expanded','0');target.setAttribute('width','-1');tab.append(target)}target.setAttribute('suppressed',visible?'0':'1')}
}
document.getElementById('visibilityScope').onchange=render;
document.getElementById('ribbonVisibilitySearch').oninput=()=>renderKind('ribbon');
document.getElementById('sideVisibilitySearch').oninput=()=>renderKind('side');
for(const button of document.querySelectorAll('[data-visibility-action]'))button.onclick=()=>setAll(button.dataset.visibilityKind,button.dataset.visibilityAction);
const JOURNAL=`Option Strict Off\r\nImports System\r\nImports NXOpen\r\nImports NXOpen.UF\r\n\r\nModule NXShortcutStudioToggleReferenceGeometry\r\n    Sub Main()\r\n        Dim theSession As Session = Session.GetSession()\r\n        Dim prefs As NXOpen.Preferences.SessionSketch = theSession.Preferences.Sketch\r\n        prefs.CreateReferenceGeometry = Not prefs.CreateReferenceGeometry\r\n        Dim state As String = If(prefs.CreateReferenceGeometry, "ON", "OFF")\r\n        UFSession.GetUFSession().Ui.SetStatus("Create Reference Geometry: " & state)\r\n    End Sub\r\n\r\n    Public Function GetUnloadOption(ByVal dummy As String) As Integer\r\n        Return Session.LibraryUnloadOption.Immediately\r\n    End Function\r\nEnd Module\r\n`;
document.getElementById('downloadJournalBtn').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JOURNAL],{type:'text/plain'}));a.download='ToggleCreateReferenceGeometry.vb';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
document.getElementById('addJournalCommandBtn').onclick=()=>{const id=document.getElementById('journalCommandId').value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9_]{2,127}$/.test(id)){alert('Enter the uppercase command ID created by NX.');return}document.dispatchEvent(new CustomEvent('nx:add-journal-command',{detail:{id}}))};
function autofill(use){
  const common=['rbn_analyze.rtb','rbn_visualization.rtb','rbn_tools.rtb'];
  const uses={modeling:['rbn_modeling_home.rtb','rbn_curves.rtb'],assemblies:['rbn_modeling_home.rtb','rbn_assemblies.rtb','rbn_curves.rtb'],surfacing:['rbn_modeling_home.rtb','rbn_modeling_surface.rtb','rbn_curves.rtb','rbn_modeling_reverse_engineering.rtb'],manufacturing:['rbn_modeling_home.rtb','rbn_assemblies.rtb','rbn_curves.rtb'],documentation:['rbn_modeling_home.rtb','rbn_pmi.rtb','rbn_visual_reporting.rtb'],minimal:['rbn_modeling_home.rtb']};
  if(!uses[use])return;
  for(const scope of SCOPES){const wanted=new Set([...uses[use],...(use==='minimal'?['rbn_visualization.rtb']:common),...(scope==='UG_APP_SKETCH_TASK'?['rbn_sketch_te_home.rtb']:[]),...(scope==='UG_APP_NOPART'?['rbn_nopart_home.rtb']:[])]);for(const id of Object.keys(state.ribbon[scope]))state.ribbon[scope][id]=wanted.has(id);
    for(const id of Object.keys(state.side[scope]))state.side[scope][id]=id==='PARTNT'||/history\.pax$/i.test(id)||id==='UG/ROLE_SYSTEM_PAL:Roles'||(scope==='UG_APP_SKETCH_TASK'&&id==='UGS::SketchUI::Nav::SketchNavigator')||(['assemblies','manufacturing'].includes(use)&&['ANT','CNAV'].includes(id))||(use==='surfacing'&&id==='UGS::ToolingUI::ReuseLibraryNavigatorFrame')||(use==='manufacturing'&&['ONT','UGS::CamUI::OperationNavigator','UGS::CamUI::FeatureNavigator'].includes(id))||(use==='documentation'&&['UGS::MBD::PMIQueryUI::Frame','UGS::MBD::UI::DataBrowser::Frame'].includes(id));
  }save();
}
window.NX_ROLE_VISIBILITY={getState:()=>JSON.parse(JSON.stringify(state)),importState:value=>{state=normalize(value);save()},applyToXml,autofill,reset:()=>{state=cloneDefaults();save()}};
render();
})();
