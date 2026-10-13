using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
namespace NxBuddy;

public sealed record Binding(string Label,string Key,string Layer,string Base,bool Journal);
public sealed record OverlayOptions(string Position,double Opacity,int FontSize,int ShowDelayMs);
public sealed record BuddyProject(IReadOnlyList<Binding> Modeling,IReadOnlyList<Binding> Sketch,OverlayOptions Overlay)
{
 public static BuddyProject Parse(string text){
  if(Encoding.UTF8.GetByteCount(text)>262144)throw new FormatException("Project exceeds 256 KB.");
  using var doc=JsonDocument.Parse(text,new JsonDocumentOptions{MaxDepth=20});var r=doc.RootElement;
  Fields(r,"format","schemaVersion","nxVersion","workspaces","tabs","overlay");
  if(r.GetProperty("format").GetString()!="nx-studio-project"||r.GetProperty("schemaVersion").GetInt32()!=1||!Regex.IsMatch(r.GetProperty("nxVersion").GetString()!,@"^\d{4}$"))throw new FormatException("Use a version 1 portable project with a declared release.");
  var w=r.GetProperty("workspaces");Fields(w,"modeling","sketch");var model=Read(w.GetProperty("modeling"));var sketch=Read(w.GetProperty("sketch"));
  var tabs=r.GetProperty("tabs");Fields(tabs,"ribbon","side");
  foreach(var kind in new[]{"ribbon","side"}){var scopes=tabs.GetProperty(kind);Allowed(scopes,"UG_APP_MODELING","UG_APP_SKETCH_TASK","UG_APP_NOPART");foreach(var scope in scopes.EnumerateObject()){
   if(scope.Value.ValueKind!=JsonValueKind.Object)throw new FormatException("Invalid tab scope.");var names=scope.Value.EnumerateObject().Select(x=>x.Name).ToArray();Allowed(scope.Value,names);if(names.Length>200)throw new FormatException("Too many tab choices.");
   foreach(var tab in scope.Value.EnumerateObject())if(!Regex.IsMatch(tab.Name,@"^[A-Za-z0-9_:./-]{1,160}$")||tab.Name.StartsWith('/')||Regex.IsMatch(tab.Name,@"^[A-Za-z]:")||tab.Name.Contains("..")||new[]{"__proto__","constructor","prototype"}.Contains(tab.Name)||tab.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))throw new FormatException("Invalid tab choice.");
  }}
  var o=r.GetProperty("overlay");Fields(o,"position","opacity","fontSize","showDelayMs","hideDelayMs");var p=o.GetProperty("position").GetString()!;if(!new[]{"top-left","top-right","bottom-left","bottom-right"}.Contains(p))throw new FormatException("Invalid corner.");
  var opacity=Number(o,"opacity",.75,1,false);var font=(int)Number(o,"fontSize",12,24,true);var delay=(int)Number(o,"showDelayMs",0,1000,true);Number(o,"hideDelayMs",0,1000,true);
  return new(model,sketch,new(p,opacity,font,delay));
 }
 private static IReadOnlyList<Binding> Read(JsonElement list){
  if(list.ValueKind!=JsonValueKind.Array||list.GetArrayLength()>200)throw new FormatException("At most 200 bindings per workspace.");var result=new List<Binding>();var keys=new HashSet<string>();var slots=new HashSet<string>();
  foreach(var row in list.EnumerateArray()){
   var kind=row.GetProperty("kind").GetString();if(kind=="builtin")Fields(row,"label","key","kind","commandId");else if(kind=="journal")Fields(row,"label","key","kind","commandId","slot");else throw new FormatException("Invalid command kind.");
   var label=row.GetProperty("label").GetString()!;if(string.IsNullOrWhiteSpace(label)||label.Length>99||label.Any(char.IsControl))throw new FormatException("Invalid label.");var parts=KeyParts(row.GetProperty("key").GetString()!);if(parts.Key!=""&&!keys.Add(parts.Key))throw new FormatException("Duplicate key.");
   if(kind=="builtin"){var id=row.GetProperty("commandId").GetString()!;if(!Regex.IsMatch(id,@"^[A-Za-z0-9_.:-]{1,128}$")||Regex.IsMatch(id,@"^(USRCMD_|NX_SHORTCUT_STUDIO_|NX_STUDIO_JOURNAL_)",RegexOptions.IgnoreCase))throw new FormatException("Invalid builtin ID.");}
   else {var slot=row.GetProperty("slot").GetString()!;if(row.GetProperty("commandId").ValueKind!=JsonValueKind.Null||!Regex.IsMatch(slot,@"^journal-[1-9]\d{0,2}$")||!slots.Add(slot))throw new FormatException("Journal IDs must be omitted; use unique slots.");}
   result.Add(new(label,parts.Key,parts.Layer,parts.Base,kind=="journal"));
  }return result.AsReadOnly();
 }
 public static (string Key,string Layer,string Base) KeyParts(string key){
  if(key is null||key.Length>60)throw new FormatException("Invalid key.");if(key=="")return("","none","");var parts=key.Split('+').Select(x=>x.Trim()).ToArray();var mods=new HashSet<string>();
  foreach(var m in parts.SkipLast(1)){var n=m.ToLowerInvariant();if(!new[]{"ctrl","alt","shift"}.Contains(n)||!mods.Add(n))throw new FormatException("Invalid modifiers.");}
  var aliases=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){["escape"]="Esc",["esc"]="Esc",["space"]="Space",["enter"]="Enter",["tab"]="Tab",["backspace"]="Backspace",["delete"]="Delete",["insert"]="Insert",["home"]="Home",["end"]="End",["pageup"]="PageUp",["pagedown"]="PageDown",["up"]="Up",["down"]="Down",["left"]="Left",["right"]="Right",["capslock"]="CapsLock"};
  var b=aliases.TryGetValue(parts[^1],out var alias)?alias:parts[^1].ToUpperInvariant();if(!(Regex.IsMatch(b,@"^[A-Z0-9]$|^F([1-9]|1\d|2[0-4])$")||aliases.Values.Contains(b)||b.Length==1&&"[];',./-=`".Contains(b)))throw new FormatException("Unsupported key.");
  var ordered=new[]{"ctrl","alt","shift"}.Where(mods.Contains).ToArray();return(string.Join('+',ordered.Select(m=>char.ToUpperInvariant(m[0])+m[1..]).Append(b)),ordered.Length==0?"none":string.Join('+',ordered),b);
 }
 private static double Number(JsonElement obj,string name,double min,double max,bool integer){var n=obj.GetProperty(name).GetDouble();if(!double.IsFinite(n)||n<min||n>max||integer&&n!=Math.Truncate(n))throw new FormatException("Invalid "+name);return n;}
 private static void Fields(JsonElement obj,params string[] names){Allowed(obj,names);if(obj.EnumerateObject().Count()!=names.Length||names.Any(n=>!obj.TryGetProperty(n,out _)))throw new FormatException("Missing field.");}
 private static void Allowed(JsonElement obj,params string[] names){if(obj.ValueKind!=JsonValueKind.Object)throw new FormatException("Expected object.");var seen=new HashSet<string>();foreach(var f in obj.EnumerateObject())if(!names.Contains(f.Name)||!seen.Add(f.Name))throw new FormatException("Unknown/duplicate field.");}
}
public sealed record Observation(double At,bool VerifiedNx,bool Minimized,bool Ctrl,bool Alt,bool Shift,string Workspace,bool Paused);
public sealed record GuideState(string Status,string Reason,string? Workspace,string? Layer,IReadOnlyList<Binding> Rows,double? ShowAt);
public sealed class DisplayController {
 private BuddyProject? project;private double? lastAt,showAt;private string? signature;
 public DisplayController(BuddyProject value){project=value;}
 public void Replace(BuddyProject? value){project=value;lastAt=null;Clear();}
 private void Clear(){signature=null;showAt=null;}
 private GuideState Hide(string reason){Clear();return new("hidden",reason,null,null,Array.Empty<Binding>(),null);}
 public GuideState Step(Observation s){
  if(!double.IsFinite(s.At)||s.At<0||s.Workspace is not ("modeling" or "sketch")){lastAt=null;return Hide("invalid-observation");}if(lastAt.HasValue&&s.At<lastAt.Value){lastAt=s.At;return Hide("clock-reversed");}lastAt=s.At;
  if(project is null)return Hide("invalid-project");if(s.Paused)return Hide("paused");if(!s.VerifiedNx)return Hide("not-nx-foreground");if(s.Minimized)return Hide("nx-minimized");
  var layer=string.Join('+',new[]{s.Ctrl?"ctrl":"",s.Alt?"alt":"",s.Shift?"shift":""}.Where(x=>x!=""));if(layer=="")layer="none";
  var rows=(s.Workspace=="modeling"?project.Modeling:project.Sketch).Where(b=>b.Key!=""&&b.Layer==layer).OrderBy(b=>b.Base,StringComparer.Ordinal).ToArray();if(rows.Length==0)return Hide("no-bindings");
  var current=s.Workspace+":"+layer;if(signature!=current){signature=current;showAt=s.At+project.Overlay.ShowDelayMs;}
  return s.At<showAt!.Value?new("waiting","show-delay",s.Workspace,layer,Array.Empty<Binding>(),showAt):new("visible","ready",s.Workspace,layer,rows,showAt);
 }
}
