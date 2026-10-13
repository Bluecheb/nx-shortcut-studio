# Role export preservation release — October 13, 2026

Status: seven test suites passed, and the scoped NX 2606 native release gate passed, including generated-role restart behavior and persisted original-role restoration. Historical checkpoints below describe earlier findings; the latest verification section supersedes their pending status. Native desktop Overlay Buddy and Advisor are not part of this completed release.

## Native-derived correction

Native NX 2606 testing exposed a wrong-field bug in the first candidate: a docked Tools tab enabled through NX itself exported BarInfo.visibility=0 and nested RibbonStackInfo.visibility=1. The corrected shared engine and upload UI use the nested stack flag for verified docked records. BarInfo, index, placement, float dimensions and other fields are not changed alongside it. Detached/full-screen and unknown records are left unsupported. Existing bar-only records retain the previous fallback; they still need native verification for their specific NX representation.

The independent verifier permits only the selected existing visibility field and rejects layout-position mutations. Duplicate BarInfo/stack records are rejected. The sanitized fixture in tests contains no personal baseline or local journal path.

Fresh native roles can contain a create-mode journal definition without shortcut override containers. No-edit/tab-only export is retained; accelerator changes and new shortcut records require existing edit-mode content. The verifier enforces the same mode rule independently.

NX also exports separate create and edit Content sections under the same owner. The engine now accepts one unique section of each mode, validates both, and reads/writes shortcut overrides only in the edit section. Command definitions and their order are preserved. Duplicate modes, unknown mixed modes, definition mutations, and unsupported shortcut owners are rejected. The same command ID can legitimately occur once in its definition section and once in its override section.

During the first native load, the fixed-text-height preference remained enabled at 3 mm, but the active sketch retained/reverted tab flags. Backup reloaded and visible layout restored; fresh NX export confirmed the tested targets matched baseline. This is not restart persistence or constant-pixel-height sign-off. The UI now advises saved parts, loading outside active sketch, restart, and explicit verification. Do not publish until corrected native checks pass.

## Changes

- Upload a role from the user's NX setup before MTX export. Existing shortcuts and supported tab states populate the editor.
- Review shortcut/tab changes and download a change report before exporting.
- Preserve action definitions, presentation/session settings, windows, docking, widths, and touch settings.
- Tab merging now transfers matching visibility values only. Missing donor targets block merge export.
- No-edit MTX downloads return the original file text exactly.
- General shortcuts use the repository container; the Sketch editor uses its application container. A missing shortcut container currently requires saving a shortcut in NX and exporting the baseline again. Modeling-specific overrides are detected as conflicts.
- Sidebar visibility supports existing exact application states; inherited `All` states remain untouched.

## Verification

Node v22.20.0; existing bundled Playwright and installed Microsoft Edge used, with no dependency installation. The browser suite checks the actual browser XML DOM and downloaded files. Native Computer Use found NX 2606 and observed the user's Modeling document; no role was applied or document modified. Later calls reported the user's Escape stop, including the retry after permission was renewed.

Original candidate result: all four listed suites passed, with 16 XML checks. Corrected candidate: all four suites passed; browser suite has 32 XML checks plus actual uploaded checkboxes, exact no-edit/tab-only downloads, create-mode shortcut blocking, and native-shaped visibility merging with zero page errors. Corrected visibility values were confirmed in NX's saved user.mtx after loading from Modeling and shutdown. Restarted UI/dimension/shortcut verification and rollback remain pending because both NX launch attempts returned no targetable window. Public release remains held; see the root verification record for observed results.

Dimension finding: installed `C:\Program Files\Siemens\Designcenter2606\UGII\ug_sketcher.dpx`, lines 29–44, defines `Sketch_fixedTextSize` / “Fixed Text Height on Screen,” and the legacy counterpart `Sketch_textsizefixed`, as session preferences. Its description explicitly addresses zooming. The shipped modern default is 0 (No); legacy is 1 (Yes). These are shipped definitions, not evidence of the user's current preference or of a role causing the change.

Observed native path: Menu > Task > Sketch Settings for an active sketch. Next native check must load the corrected candidate outside an active sketch after preserving open parts, compare live and freshly exported state, restart safely, and re-enter sketch before checking dimensions. Keep and restore the user's original baseline.

Run checks from this checkout with bundled dependencies on NODE_PATH:

```text
node tests/role-tools.test.cjs
node tests/journal-controls.test.cjs
node tests/site-assets.test.cjs
node tests/safe-role.test.cjs
```

The user later reopened NX normally. Tools appeared in Sketch and History was absent in the Resource Bar menu after restart. Dimension/shortcut persistence checks and rollback remain incomplete; this partial UI pass does not release the candidate.

## Portable project and Buddy web preview

Added `.nxstudio.json` version 1 with strict bounded validation, privacy-safe journal slots, portable tab choices, and overlay display configuration. Reviewed imports retain local journals, block conflicting keys before modifying the editor, and apply matching tab visibility only when selected. The Buddy web preview shows exact modifier branches for Modeling/Sketching, configurable corner/text size, and unresolved journal guidance. It does not monitor desktop input, overlay NX, or execute commands.

New checks: 32 schema/privacy tests and headless browser import/export/layer/atomicity/journal/mobile/direct-file tests, with zero page errors. All previous suites passed after integration. Local candidate only; native release gate and GitHub synchronization are still pending. See `PORTABLE_PROJECT_FORMAT.md` for the versioned contract. No SDK was installed or native companion launched.

## Latest local verification

The mixed-section candidate passes 45 XML checks and browser upload/download/merge tests with zero page errors. Portable schema, tab-autofill, journal, and public-asset suites passed again on October 13. In native NX 2606, the generated Ctrl+Alt+F11 Fit override executed and Sketch Part Navigator became unchecked/hidden. Tools remained visible; fixed sketch text height remained enabled at 3 mm, with visually comparable dimension text across zoom. This is not exact pixel measurement or proof of the original symptom's cause.

History is not available in Sketch even with the original unsuppressed state, so its absence is not evidence of a successful tab edit. Tab availability still depends on NX application/context. The available Part Navigator was used for the definitive sidebar test instead.

Additional check commands:

```text
node tests/portable-project.test.cjs
node tests/overlay-preview.test.cjs
```

All six suites passed again on October 13. Added a separate pure companion
display controller and 36 deterministic checks (`node
tests/display-controller.test.cjs`). This code consumes injected observations;
it does not observe the desktop, install a keyboard hook, run commands, or create
a native overlay. Its show delay cancels on changed layers, and safety hiding is
immediate. See `companion/README.md`. The native release gate is unchanged.

Generated-role restart verification now passed in NX 2606: Ctrl+Alt+F11 executed
Fit View after restarting, Tools remained visible, and Part Navigator remained
unchecked in Sketch's native tab checklist. Original backup was then reapplied
outside Sketch. A fresh NX export contained no test Fit overrides or edit section,
Tools 0/0 and Part Navigator unsuppressed; existing command definitions matched the
backup. Sketch re-entry visibly restored Part Navigator and hid Tools. Only final
persisted rollback confirmation was then outstanding; that final check now passed:
NX reports the original backup after restart, and persisted normal-mode tested
targets match it with unchanged command definitions. This evidence covers the
tested docked representation, not every NX
release, detached layout, or application-specific tab.
