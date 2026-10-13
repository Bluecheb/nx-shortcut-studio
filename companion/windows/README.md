# Windows Buddy — unbuilt source candidate

No executable is shipped. No SDK was installed, build run, or desktop observer
started while authoring this candidate. Use only after compilation, core tests and
native acceptance in a disposable NX session. The browser Advisor is independent.

Requires a supported stable .NET 10 SDK; global.json selects stable 10.x feature
updates with a 10.0.100 minimum. The GUI targets net10.0-windows, x64, WPF. It runs
as the current user; no elevation, startup registration, hooks, network, ordinary
key polling, logging, NXOpen, journal execution, or keyboard injection is included.

After a supported SDK is available, from this directory:

```text
dotnet run --project core-tests/CoreTests.csproj
dotnet build NxBuddy.csproj -c Release
```

Do not launch until the build/core results are reviewed. The control window starts
paused. Select the exact installed NX ugraf.exe, load a portable project exported
from Studio, select Modeling/Sketch manually, then unpause. Paths/project stay in
memory; nothing is auto-saved. Close the control window to exit. Invalid/cancelled
import disables the previous configuration. Imported journals are guide-only and
remain unresolved; portable files carry no personal command IDs.

The adapter compares foreground process executable path, ignores owned dialogs,
fails closed on lookup errors/minimize, polls only Ctrl/Alt/Shift, and rechecks the
foreground handle. Polling is 40 ms: focus hiding is bounded by the next successful
UI-thread tick, not literally instantaneous. No display guarantees under a hung
dispatcher are claimed. Exact layer/workspace changes restart show delay; hide
delay never keeps stale rows visible. Text is rendered as text, not XAML/HTML.

Native acceptance still required: style application/non-activation/click-through,
foreground race and privilege failures, real NX owned-window behavior, restart and
multiple sessions, high DPI/mixed monitors, clipped/wrapped labels and target bounds.
The first view caps display at ten rows and shows a remaining-count notice; use
Studio for the full list. This is not a claim that those runtime behaviors passed.

Primary design references: Microsoft GetForegroundWindow/GetWindowThreadProcessId,
GetAsyncKeyState (high bit), layered windows and WS_EX_NOACTIVATE; .NET 10 lifecycle.
The tested JS controller in ../display-controller.cjs defines the behavior contract.
