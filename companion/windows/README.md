# Windows Buddy — locally built source candidate

No executable is shipped. Local SDK 10.0.401 compilation passed with zero warnings
and errors, and 134 console core assertions pass. An approved disposable-session
trial passed foreground hide/re-entry, pause and empty manual workspace hiding;
the user reported Shift/Alt+Shift/release layer switching works. This is partial
acceptance, not a fully verified native release. The browser Advisor is independent.
The rebuilt guide also passed one-row compact fit, 20-row wrapped-label overflow,
an underlying NX Menu click-through check and invalid-import display disabling.
These observations are limited to the tested NX 2606 desktop setup.

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
memory; nothing is auto-saved. Target/project selection pauses the guide; successful
project loading requires explicit unpause. Close the control window to exit. Invalid/cancelled
import disables the previous configuration. Imported journals are guide-only and
remain unresolved; portable files carry no personal command IDs.

The adapter compares foreground process executable path, ignores owned dialogs,
fails closed on lookup errors/minimize, polls only Ctrl/Alt/Shift, and rechecks the
foreground handle. Polling is 40 ms: focus hiding is bounded by the next successful
UI-thread tick, not literally instantaneous. No display guarantees under a hung
dispatcher are claimed. Exact layer/workspace changes restart show delay; hide
delay never keeps stale rows visible. Text is rendered as text, not XAML/HTML.

Native acceptance still required: additional click-through controls,
foreground race and privilege failures, real NX owned-window behavior, restart and
multiple sessions, high DPI/mixed monitors and resized target bounds.
The compact view measures its contents, caps height at 380 DIPs and shows at most
ten rows. It trims trailing rows to reserve a remaining-count notice; use Studio
for the full list. Insufficient room hides the guide. Pure geometry tests cover
corner/DPI/bounds calculations; compact/overflow visual checks passed in one setup.
This is not a claim that the remaining runtime behaviors passed.

Latest source positions/measures the guide before Show and rechecks NX foreground
after layout. These updated view paths require fresh visual acceptance. Display
ordering now matches the browser: numeric F1..F24, otherwise canonical ordinal
base-key order. Bindings are not modified by ordering. Source safeguards and
ordered actual-browser-download-to-C# tests are separate from native UI acceptance.

Primary design references: Microsoft GetForegroundWindow/GetWindowThreadProcessId,
GetAsyncKeyState (high bit), layered windows and WS_EX_NOACTIVATE; .NET 10 lifecycle.
The tested JS controller in ../display-controller.cjs defines the behavior contract.
