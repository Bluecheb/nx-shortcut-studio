const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const visibility=fs.readFileSync(require('path').join(__dirname,'../dist/role-visibility.js'),'utf8');
const autofill=visibility.slice(visibility.indexOf('function autofill(use)'),visibility.indexOf('window.NX_ROLE_VISIBILITY='));
const scopes=['UG_APP_MODELING','UG_APP_SKETCH_TASK','UG_APP_NOPART'];
const state={ribbon:{},side:{}};for(const scope of scopes){state.ribbon[scope]={'rbn_modeling_home.rtb':false,'rbn_assemblies.rtb':false,'rbn_modeling_surface.rtb':false,'rbn_sketch_te_home.rtb':false,'rbn_nopart_home.rtb':false,'rbn_internal.rtb':true};state.side[scope]={PARTNT:false,ANT:false,CNAV:false,BROWSER_1001:true,'UG/ROLE_SYSTEM_PAL:Roles':false}}
const presetContext={SCOPES:scopes,state,save:()=>{}};vm.createContext(presetContext);vm.runInContext(autofill+';autofill("assemblies");',presetContext);
assert(state.ribbon.UG_APP_MODELING['rbn_assemblies.rtb']);assert(state.side.UG_APP_MODELING.ANT);
assert(!state.ribbon.UG_APP_MODELING['rbn_internal.rtb']);assert(!state.side.UG_APP_MODELING.BROWSER_1001);
assert(state.ribbon.UG_APP_SKETCH_TASK['rbn_sketch_te_home.rtb']);assert(state.ribbon.UG_APP_NOPART['rbn_nopart_home.rtb']);
vm.runInContext('autofill("minimal");',presetContext);assert(!state.ribbon.UG_APP_MODELING['rbn_assemblies.rtb']);assert(!state.side.UG_APP_MODELING.ANT);
console.log('PASS: workspace-aware tab-only autofill. XML merge preservation is tested with the browser DOM in safe-role.test.cjs.');
