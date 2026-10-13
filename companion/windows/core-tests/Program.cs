using NxBuddy;
using System.Text.Json;
var projectText=JsonSerializer.Serialize(new{format="nx-studio-project",schemaVersion=1,nxVersion="2606",workspaces=new{modeling=new[]{new{label="Fit fixture",key="Ctrl+F",kind="builtin",commandId="UG_VIEW_FIT"}},sketch=Array.Empty<object>()},tabs=new{ribbon=new{},side=new{}},overlay=new{position="top-right",opacity=.9,fontSize=16,showDelayMs=120,hideDelayMs=180}});
void Check(bool condition,string name){if(!condition)throw new Exception(name);}
var project=BuddyProject.Parse(projectText);var controller=new DisplayController(project);
Observation Sample(double at,bool focus=true,bool ctrl=true)=>new(at,focus,false,ctrl,false,false,"modeling",false);
Check(controller.Step(Sample(0)).Status=="waiting","delay starts");Check(controller.Step(Sample(119)).Status=="waiting","delay boundary");Check(controller.Step(Sample(120)).Rows[0].Base=="F","exact row");
Check(controller.Step(Sample(121,false)).Rows.Count==0,"focus hides");Check(controller.Step(Sample(122)).Status=="waiting","reentry delay");Check(controller.Step(Sample(123,true,false)).Reason=="no-bindings","empty layer");
controller.Replace(null);Check(controller.Step(Sample(124)).Reason=="invalid-project","invalid replacement");
foreach(var key in new[]{"F1","Shift+F1","Ctrl+F1","Alt+F1","Ctrl+Shift+F1","Alt+Shift+F1","Ctrl+Alt+F1","Ctrl+Alt+Shift+F1"})Check(BuddyProject.KeyParts(key).Key==key,"key normalization");
foreach(var bad in new[]{projectText.Replace("\"schemaVersion\":1","\"schemaVersion\":99"),projectText.Replace("\"showDelayMs\":120","\"showDelayMs\":-1"),projectText.Replace("\"UG_VIEW_FIT\"","\"USRCMD_PRIVATE\"")}){var rejected=false;try{BuddyProject.Parse(bad);}catch{rejected=true;}Check(rejected,"invalid configuration rejected");}
using var vectorDoc=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"controller-vectors.json")));
var vectorController=new DisplayController(BuddyProject.Parse(vectorDoc.RootElement.GetProperty("project").GetRawText()));
foreach(var item in vectorDoc.RootElement.GetProperty("samples").EnumerateArray()){
 var f=item.GetProperty("foreground");var m=item.GetProperty("modifiers");var e=item.GetProperty("expected");
 var state=vectorController.Step(new(item.GetProperty("at").GetDouble(),f.GetProperty("verifiedNx").GetBoolean(),f.GetProperty("minimized").GetBoolean(),m.GetProperty("ctrl").GetBoolean(),m.GetProperty("alt").GetBoolean(),m.GetProperty("shift").GetBoolean(),item.GetProperty("workspace").GetString()!,item.GetProperty("paused").GetBoolean()));
 Check(state.Status==e.GetProperty("status").GetString()&&state.Reason==e.GetProperty("reason").GetString()&&state.Layer==e.GetProperty("layer").GetString()&&state.Rows.Count==e.GetProperty("count").GetInt32(),"shared vector state");
 Check(state.ShowAt==(e.GetProperty("showAt").ValueKind==JsonValueKind.Null?null:e.GetProperty("showAt").GetDouble()),"shared vector deadline");
}
Console.WriteLine("PASS: native core smoke checks and eight shared vectors (no desktop observer).");
