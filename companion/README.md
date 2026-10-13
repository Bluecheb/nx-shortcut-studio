# Overlay Buddy display controller

This is pure design logic, not a runnable Windows overlay. It has no desktop
access, timers, foreground detector, keyboard hook, or command execution.

Run `node tests/display-controller.test.cjs` from the source checkout. The
controller consumes a validated version 1 portable project and injected samples:

```js
const {createController} = require('./display-controller.cjs');
const guide = createController(project);
const state = guide.step({
  at: 1000, // monotonic milliseconds, supplied by the future adapter
  foreground: {verifiedNx: true, minimized: false},
  modifiers: {ctrl: false, alt: false, shift: true},
  workspace: 'sketch', // manually selected, not inferred from the NX title
  paused: false
});
```

The adapter must resolve foreground process identity before asserting verifiedNx;
unknown identity must be false. A true flag here is an input assertion, not proof.
Poll only the three modifiers after the foreground check; do not collect ordinary
keys. Repeated samples drive show delay; no asynchronous callback can show stale
rows. A changed combination/workspace restarts that delay. Focus loss, pause,
minimization, invalid observations, or backward time immediately clear rows.

`hideDelayMs` is deliberately not used to keep content visible: misleading rows
and non-NX foreground display must not linger. It is reserved for a future visual
animation without command content. Journal slots stay unresolved. No default
bindings are provided. Invalid project replacement disables display until a valid
project is supplied; returned snapshots are isolated from controller state.

The WPF/.NET 10 source candidate lives in windows/. It has compiled locally and
passed console tests plus partial native disposable-session checks. It is not a
downloadable binary or a fully certified native release. Eight shared vectors and
actual browser downloads have been checked against the compiled C# reader.
Native focus/pause/compact-list/menu-click-through/invalid-import observations
passed in one setup; monitor/DPI, resize, session/dialog coverage remains pending.
The updated pre-show positioning path requires a separately approved visual trial.
See windows/README.md for privacy boundaries and remaining native acceptance.
