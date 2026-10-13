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

Next: port this tested contract into a selected native view implementation and
verify process gating, non-activation, click-through, monitor/DPI placement, and
minimize/restart behavior. No native build or runtime capability is claimed.

An unbuilt WPF/.NET 10 source candidate now lives in windows/. Its management
window, strict portable-file reader, exact-layer controller, and foreground-gated
modifier adapter are authored but not compiled or run. Eight shared vectors pass
on the JS side; a console C# test project is provided for the SDK-enabled build.
See windows/README.md for privacy boundaries and remaining native acceptance.
