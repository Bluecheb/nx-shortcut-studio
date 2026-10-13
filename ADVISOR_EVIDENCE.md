# Advisor MVP evidence and boundaries

The six-topic Advisor is curated local keyword search, not remote AI, exhaustive
NX documentation, or a diagnosis. Input is not saved, uploaded, or applied.

Siemens' [role explanation](https://blogs.sw.siemens.com/designcenter/nx-roles/)
documents tool-content and presentation choices. It does not establish that every
NX preference is controlled by roles or that role changes caused a dimension issue.

Shipped NX 2606 UGII/ug_sketcher.dpx declares Sketch_fixedTextSize and
Sketch_fixedTextHeight_MU with Session scope. The modern/legacy toggle defaults
differ. Native Task → Sketch Settings observation and same-part zoom tests support
the dimension guidance, not exact pixel equality or the cause of a past regression.

Native disposable NX 2606 tests support: existing docked RibbonStackInfo visibility,
explicit normal-mode sidebar application suppression, separate create/edit Content
sections, registered accelerator execution, restart persistence and original-role
restoration. History unavailability in Sketch is not evidence of suppression.
No private role, path, button ID, or verification part is included in this catalog.

The [example journal source](https://github.com/Bluecheb/nx-shortcut-studio/blob/main/journals/ToggleCreateReferenceGeometry.vb)
toggles SessionSketch.CreateReferenceGeometry. Exporting its accelerator does not
install its journal/button. Each user supplies their own registered command ID.

Buddy guidance describes Studio's own version 1 portable format and exact-layer
design tests. Windows source remains unbuilt/unverified; .NET SDK installation,
C# core tests/build, and foreground/click-through/DPI acceptance are still needed.
No native binary or browser-to-NX control is offered. Other release requests get an
explicit compatibility warning; no-match requests are not filled with guesses.

Run `node tests/advisor.test.cjs`, `node tests/advisor-browser.test.cjs` (Playwright),
and `node tests/companion-source.test.cjs`. The last is JS vector/source review,
not a replacement for running the C# test project under a supported SDK.
