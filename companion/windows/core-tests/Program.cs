using NxBuddy;
using System.Text.Json;
// Test-only strings need literal '+' so mutation coverage is not silently skipped.
var projectText=JsonSerializer.Serialize(new{format="nx-studio-project",schemaVersion=1,nxVersion="2606",workspaces=new{modeling=new[]{new{label="Fit fixture",key="Ctrl+F",kind="builtin",commandId="UG_VIEW_FIT"}},sketch=Array.Empty<object>()},tabs=new{ribbon=new{},side=new{}},overlay=new{position="top-right",opacity=.9,fontSize=16,showDelayMs=120,hideDelayMs=180}},new JsonSerializerOptions{Encoder=System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping});
var checks=0;
void Check(bool condition,string name){if(!condition)throw new Exception(name);checks++;}
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
// All eight layers are executed, not just normalized. Fixture labels are not
// supplied NX shortcuts; this console test never starts the desktop adapter.
var layers=new[]{"none","shift","ctrl","alt","ctrl+shift","alt+shift","ctrl+alt","ctrl+alt+shift"};
foreach(var layer in layers){
 var key=layer=="none"?"F1":string.Join('+',layer.Split('+').Select(m=>char.ToUpperInvariant(m[0])+m[1..]))+"+F1";
 var row=new Binding("Fixture "+layer,key,layer,"F1",false);
 var c=new DisplayController(new BuddyProject(new[]{row},Array.Empty<Binding>(),new("top-right",.9,16,0)));
 var parts=layer.Split('+');var state=c.Step(new(0,true,false,parts.Contains("ctrl"),parts.Contains("alt"),parts.Contains("shift"),"modeling",false));
 Check(state.Status=="visible"&&state.Rows.Count==1&&state.Layer==layer,"exact layer "+layer);
 Check(c.Step(new(1,true,false,true,false,true,"sketch",false)).Rows.Count==0,"workspace isolation");
 Check(c.Step(new(2,true,false,true,false,false,"modeling",true)).Reason=="paused","pause");
}
void Reject(string input,string name){var rejected=false;try{BuddyProject.Parse(input);}catch{rejected=true;}Check(rejected,name);}
foreach(var edit in new (string From,string To)[]{
 ("\"fontSize\":16","\"fontSize\":25"),("\"fontSize\":16","\"fontSize\":16.5"),
 ("\"opacity\":0.9","\"opacity\":0.5"),("\"hideDelayMs\":180","\"hideDelayMs\":1001"),
 ("\"position\":\"top-right\"","\"position\":\"center\""),
 ("\"nxVersion\":\"2606\"","\"nxVersion\":\"unknown\""),
 ("\"key\":\"Ctrl+F\"","\"key\":\"Ctrl+Ctrl+F\""),
 ("\"key\":\"Ctrl+F\"","\"key\":\"Meta+F\""),
 ("\"kind\":\"builtin\"","\"kind\":\"unknown\""),
 ("\"schemaVersion\":1","\"schemaVersion\":1,\"schemaVersion\":1"),
 ("\"tabs\":{","\"extra\":true,\"tabs\":{")
}){Check(projectText.Contains(edit.From),"mutation exists");Reject(projectText.Replace(edit.From,edit.To),"reject "+edit.From);}
Reject("{}","missing required fields");Reject(" "+new string(' ',262144),"oversized input");
var duplicate=projectText.Replace("\"modeling\":[", "\"modeling\":[{\"label\":\"Duplicate\",\"key\":\"Ctrl+F\",\"kind\":\"builtin\",\"commandId\":\"UG_DUPLICATE\"},");Reject(duplicate,"duplicate accelerator");
var reversed=new DisplayController(project);reversed.Step(Sample(200));Check(reversed.Step(Sample(100)).Reason=="clock-reversed","backward clock hides");Check(reversed.Step(Sample(101)).ShowAt==221,"backward clock resets delay");
Check(reversed.Step(Sample(double.NaN)).Reason=="invalid-observation","invalid clock hides");
foreach(var corner in new[]{"top-left","top-right","bottom-left","bottom-right"})foreach(var dpi in new uint[]{96,144,192}){
 var frame=GuideLayout.Frame(-1600,-200,0,700,dpi,corner,96)!;
 Check(frame.Width==360*dpi/96&&frame.Height==96*dpi/96,"compact scaled size");
 Check(frame.Left>=-1584&&frame.Top>=-184&&frame.Left+frame.Width<=-16&&frame.Top+frame.Height<=684,"inside negative monitor bounds");
 Check(frame.Left==(corner.EndsWith("right")?-frame.Width-16:-1584)&&frame.Top==(corner.StartsWith("bottom")?684-frame.Height:-184),"selected corner");
}
var capped=GuideLayout.Frame(0,0,1600,900,96,"top-left",1000)!;Check(capped.Height==380,"long content height capped");
var narrow=GuideLayout.Frame(0,0,240,180,96,"bottom-right",300)!;Check(narrow.Width==208&&narrow.Height==148,"small NX rectangle bounded");
Check(GuideLayout.Frame(0,0,120,120,96,"top-left",100) is null,"insufficient width hidden");
Check(GuideLayout.Frame(0,0,400,80,96,"top-left",100) is null,"insufficient height hidden");
foreach(var height in new[]{double.NaN,double.PositiveInfinity,-1,0})Check(GuideLayout.Frame(0,0,1600,900,96,"top-left",height) is null,"invalid measurement hidden");
Check(GuideLayout.Frame(0,0,1600,900,0,"top-left",100) is null,"invalid DPI hidden");
Check(GuideLayout.Frame(0,0,1600,900,96,"center",100) is null,"invalid corner hidden");
Check(GuideLayout.Frame(400,0,0,900,96,"top-left",100) is null,"reversed rectangle hidden");
var order=new[]{"F24","F2","F10","F1","Z","A",";","1","CapsLock"}.OrderBy(x=>x,BaseKeyComparer.Instance).ToArray();
Check(order.SequenceEqual(new[]{"1",";","A","CapsLock","F1","F2","F10","F24","Z"}),"shared deterministic base-key order");
Console.WriteLine("PASS: "+checks+" native core assertions, including eight shared vectors (no desktop observer).");
// Console-only bridge for actual browser downloads. Never invokes Desktop.cs.
if(args.Length>0){
 if(args.Length!=2||args[0]!="--verify-export")throw new ArgumentException("Use --verify-export <portable file>.");
 var file=new FileInfo(args[1]);if(file.Length>262144)throw new FormatException("Project exceeds 256 KB.");
 var exported=BuddyProject.Parse(File.ReadAllText(file.FullName));var snapshots=new List<object>();
 foreach(var workspace in new[]{"modeling","sketch"})foreach(var layer in layers){
  var parts=layer.Split('+');var c=new DisplayController(exported);
  Observation Input(double at)=>new(at,true,false,parts.Contains("ctrl"),parts.Contains("alt"),parts.Contains("shift"),workspace,false);
  c.Step(Input(0));var value=c.Step(Input(exported.Overlay.ShowDelayMs));
  snapshots.Add(new{workspace,layer,status=value.Status,rows=value.Rows.Select(row=>new{label=row.Label,key=row.Key,journal=row.Journal}).ToArray()});
 }
 Console.WriteLine("PORTABLE_VERIFY:"+JsonSerializer.Serialize(new{overlay=new{position=exported.Overlay.Position,opacity=exported.Overlay.Opacity,fontSize=exported.Overlay.FontSize,showDelayMs=exported.Overlay.ShowDelayMs},snapshots}));
}
