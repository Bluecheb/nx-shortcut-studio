# Portable project format, version 1

This is a shareable editor/guide configuration, not an NX role, command installer, desktop overlay, or verified compatibility certificate. The declared NX release is supplied by the user. MTX export still needs the recipient's own baseline.

Use the Buddy panel's **Download portable project** and **Import portable project** controls. Existing Import/Export layout controls remain the separate legacy format and may contain local journal IDs. Do not use legacy layout export as a privacy-safe public preset.

Example (empty by design; no supplied shortcuts):

```json
{
  "format": "nx-studio-project",
  "schemaVersion": 1,
  "nxVersion": "2606",
  "workspaces": {"modeling": [], "sketch": []},
  "tabs": {"ribbon": {}, "side": {}},
  "overlay": {
    "position": "top-right",
    "opacity": 0.9,
    "fontSize": 16,
    "showDelayMs": 120,
    "hideDelayMs": 180
  }
}
```

Built-in binding: `{"label":"Fit View","key":"Ctrl+F","kind":"builtin","commandId":"UG_VIEW_FIT"}`.

Journal binding: `{"label":"My toggle","key":"R","kind":"journal","commandId":null,"slot":"journal-1"}`. Slots are unique within each workspace. They are not NX command IDs. Import keeps the recipient's local journal bindings and does not install/rebind foreign journals; imported journal assignments can be viewed in the preview only.

Keys use canonical Ctrl, Alt, Shift order, one of each, followed by a supported single key. Empty keys represent unassigned commands. Duplicate canonical keys in a workspace are rejected. Meta, modifier-only keys, and prefix sequences are unsupported. Eight exact layers are used; an Alt+Shift entry never appears in Shift alone. One command may have multiple distinct accelerators.

Tab choices map `ribbon`/`side` → `UG_APP_MODELING`, `UG_APP_SKETCH_TASK`, or `UG_APP_NOPART` → existing identifier/boolean. Path-backed palette identifiers are omitted. Import applies matching choices only when selected and reports unmatched choices; it does not create layout records or change tab order/docking.

Limits: 256 KB UTF-8, 200 bindings per workspace, 200 choices per tab scope. Overlay positions are the four screen corners; opacity 0.75–1, text size 12–24, delays integer 0–1000 ms. The browser previews corner/text size; opacity/delay fields are carried for future companion implementation, not simulated as native behavior.

The validator in `dist/portable-project.js` is the executable contract. Version 1 rejects unknown fields and future versions rather than silently discarding data. A later schema requires an explicit migration. Imported labels are rendered as text, never HTML. Role XML, session/window state, and personal journal command IDs are not fields in this format.

Privacy scope: export redacts IDs from journal labels and replaces path-based labels with generic names. Other user-authored labels remain visible; review the downloaded JSON before public sharing. No file content is sent to a server by this feature.

Checks: `node tests/portable-project.test.cjs`; with bundled Playwright on NODE_PATH, `node tests/overlay-preview.test.cjs`. No native NX access is used by either test.
