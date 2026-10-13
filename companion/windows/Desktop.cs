using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;
using Microsoft.Win32;
namespace NxBuddy;

public static class Program {
 [STAThread] public static void Main(){var app=new Application{ShutdownMode=ShutdownMode.OnMainWindowClose};app.Run(new ControlWindow());}
}
public sealed class ControlWindow:Window {
 private readonly TextBlock status=new(){Text="Source candidate: native acceptance pending.",TextWrapping=TextWrapping.Wrap};
 private readonly ComboBox workspace=new(){ItemsSource=new[]{"modeling","sketch"},SelectedIndex=0};
 private readonly CheckBox paused=new(){Content="Pause guide",IsChecked=true};
 private readonly DispatcherTimer timer=new(){Interval=TimeSpan.FromMilliseconds(40)};
 private readonly Stopwatch clock=Stopwatch.StartNew();private readonly GuideWindow guide=new();
 private string? nxPath;private BuddyProject? project;private DisplayController? controller;private string? rendered;
 public ControlWindow(){
  Title="NX Overlay Buddy · source candidate";Width=520;Height=360;var panel=new StackPanel{Margin=new Thickness(24)};Content=panel;
  panel.Children.Add(new TextBlock{Text="Display only · no NX writes or command execution",TextWrapping=TextWrapping.Wrap,Margin=new Thickness(0,0,0,12)});
  Button Add(string label,RoutedEventHandler action){var b=new Button{Content=label,Margin=new Thickness(0,5,0,5),Padding=new Thickness(8)};b.Click+=action;panel.Children.Add(b);return b;}
  Add("Choose installed NX ugraf.exe",(_,_)=>{guide.Hide();var d=new OpenFileDialog{Filter="NX executable|ugraf.exe",CheckFileExists=true};if(d.ShowDialog(this)==true){nxPath=Path.GetFullPath(d.FileName);status.Text="NX target selected. Load a portable project, then unpause.";}controller?.Replace(project);});
  Add("Load .nxstudio.json project",(_,_)=>{guide.Hide();controller?.Replace(null);project=null;var d=new OpenFileDialog{Filter="Portable NX project|*.nxstudio.json",CheckFileExists=true};if(d.ShowDialog(this)!=true)return;try{if(new FileInfo(d.FileName).Length>262144)throw new FormatException("Project exceeds 256 KB.");project=BuddyProject.Parse(File.ReadAllText(d.FileName));controller=new(project);status.Text="Project loaded. Workspace is manual; journal slots stay unresolved.";}catch{status.Text="Invalid project: display disabled. Load a valid version 1 project.";}});
  panel.Children.Add(workspace);panel.Children.Add(paused);panel.Children.Add(status);
  workspace.SelectionChanged+=(_,_)=>{guide.Hide();controller?.Replace(project);};paused.Checked+=(_,_)=>{guide.Hide();controller?.Replace(project);};paused.Unchecked+=(_,_)=>controller?.Replace(project);
  timer.Tick+=(_,_)=>Tick();timer.Start();Closed+=(_,_)=>{timer.Stop();guide.Close();};
 }
 private void Tick(){
  try{
   var h=Native.GetForegroundWindow();var verified=false;
   if(h!=IntPtr.Zero&&nxPath is not null&&Native.GetAncestor(h,3)==h&&Native.GetWindowThreadProcessId(h,out var pid)!=0){using var p=Process.GetProcessById((int)pid);var image=p.MainModule?.FileName;verified=image is not null&&string.Equals(Path.GetFullPath(image),nxPath,StringComparison.OrdinalIgnoreCase);}
   if(controller is null||project is null){guide.Hide();rendered=null;return;}
   var minimized=h==IntPtr.Zero||Native.IsIconic(h);bool Down(int key)=>(Native.GetAsyncKeyState(key)&0x8000)!=0;
   // Ordinary keys are never polled. Do not poll modifiers outside verified NX.
   var ctrl=verified&&Down(0x11);var alt=verified&&Down(0x12);var shift=verified&&Down(0x10);
   if(Native.GetForegroundWindow()!=h)verified=false;
   var s=controller.Step(new(clock.Elapsed.TotalMilliseconds,verified,minimized,ctrl,alt,shift,(string)workspace.SelectedItem,paused.IsChecked!=false));
   if(s.Status!="visible"){guide.Hide();rendered=null;return;}
   if(!Native.GetWindowRect(h,out var rect)||rect.Right-rect.Left<120||rect.Bottom-rect.Top<120){guide.Hide();rendered=null;controller.Replace(project);return;}
   var identity=s.Workspace+":"+s.Layer;if(rendered!=identity){guide.Render(s,project.Overlay);rendered=identity;}
   // ShowActivated=false and native extended styles prevent focus transfer.
   guide.Show();guide.Position(h,rect,project.Overlay);
  }catch{guide.Hide();controller?.Replace(project);rendered=null;status.Text="Guide hidden: foreground identity or native adapter unavailable.";}
 }
}
public sealed class GuideWindow:Window {
 private readonly StackPanel rows=new();private bool stylesReady;
 public GuideWindow(){WindowStyle=WindowStyle.None;AllowsTransparency=true;Background=Brushes.Transparent;ShowActivated=false;ShowInTaskbar=false;Topmost=true;Focusable=false;IsHitTestVisible=false;Width=360;Height=380;
  Content=new Border{Background=new SolidColorBrush(Color.FromRgb(30,24,48)),CornerRadius=new CornerRadius(14),Padding=new Thickness(18),Child=rows};
  SourceInitialized+=(_,_)=>{var h=new WindowInteropHelper(this).Handle;var old=Native.GetWindowLongPtr(h,-20).ToInt64();Marshal.SetLastPInvokeError(0);Native.SetWindowLongPtr(h,-20,new IntPtr(old|0x20|0x80|0x08000000));stylesReady=Marshal.GetLastPInvokeError()==0;if(!stylesReady)throw new InvalidOperationException("Overlay styles could not be applied.");};
 }
 public void Render(GuideState state,OverlayOptions options){rows.Children.Clear();Opacity=options.Opacity;var color=Brushes.White;
  rows.Children.Add(new TextBlock{Text=state.Workspace+" · "+state.Layer,Foreground=color,FontWeight=FontWeights.Bold,Margin=new Thickness(0,0,0,10)});
  foreach(var b in state.Rows.Take(10))rows.Children.Add(new TextBlock{Text=b.Base+" → "+b.Label+(b.Journal?" [journal ID needed]":""),TextWrapping=TextWrapping.Wrap,Foreground=color,FontSize=options.FontSize,Margin=new Thickness(0,3,0,3)});
  if(state.Rows.Count>10)rows.Children.Add(new TextBlock{Text="+ "+(state.Rows.Count-10)+" more · inspect full list in Studio",Foreground=color,TextWrapping=TextWrapping.Wrap});
 }
 public void Position(IntPtr nx,Native.Rect rect,OverlayOptions options){if(!stylesReady){Hide();return;}var dpi=Native.GetDpiForWindow(nx);if(dpi==0){Hide();return;}var scale=dpi/96.0;var width=Math.Min((int)(360*scale),rect.Right-rect.Left-32);var height=Math.Min((int)(380*scale),rect.Bottom-rect.Top-32);var left=options.Position.EndsWith("right")?rect.Right-width-16:rect.Left+16;var top=options.Position.StartsWith("bottom")?rect.Bottom-height-16:rect.Top+16;if(!Native.SetWindowPos(new WindowInteropHelper(this).Handle,IntPtr.Zero,left,top,width,height,0x0010|0x0004))Hide();}
}
public static class Native {
 [StructLayout(LayoutKind.Sequential)] public struct Rect{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")]public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")][return:MarshalAs(UnmanagedType.Bool)]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll")][return:MarshalAs(UnmanagedType.Bool)]public static extern bool GetWindowRect(IntPtr h,out Rect rect);
 [DllImport("user32.dll")]public static extern uint GetDpiForWindow(IntPtr h);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")]public static extern IntPtr GetWindowLongPtr(IntPtr h,int index);
 [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW",SetLastError=true)]public static extern IntPtr SetWindowLongPtr(IntPtr h,int index,IntPtr value);
 [DllImport("user32.dll")][return:MarshalAs(UnmanagedType.Bool)]public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int width,int height,uint flags);
}
