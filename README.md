# NX Shortcut Studio

A browser-based shortcut and role editor for Siemens Designcenter NX 2606.

[Open the live website](https://nx-shortcut-studio-shumm.shum-matt.chatgpt.site)

## Features

- Separate Modeling and Sketching keyboard maps, searchable command library, and drag-to-move/swap assignments.
- Configurable journal command names and NX custom-button command IDs.
- Ribbon and sidebar visibility controls, with suggested tabs based on what you use NX for. Suggestions do not change shortcuts.
- Merge ribbon and sidebar settings from MTX roles while retaining the selected base role's shortcuts and unrelated settings.
- Upload your own NX baseline, review supported changes, and export a patched MTX while preserving unrelated settings and custom command definitions. No-edit downloads return the original text.
- Portable `.nxstudio.json` presets omit personal journal IDs and role/session state; imported journals need each user's own registration.
- Browser-only Overlay Buddy preview shows exact Ctrl/Alt/Shift layers. A separate pure display controller is tested; a native Windows overlay is not yet implemented.

Your settings stay in your own browser. Role files selected for merging are processed locally, not uploaded to a server.

## Run locally

Open `dist/index.html` in a browser. If your browser restricts local files, serve the `dist` folder with any static web server. No build step or package installation is required.

## Using exports in NX

Upload a role saved from your own preferred NX setup before MTX export. Shortcut changes require an existing edit-mode section; separate create-mode command definitions remain untouched. Command-definition-only baselines support unchanged/tab-only exports. See [release notes](ROLE_EXPORT_RELEASE_NOTES.md).

Finish the active sketch, save your parts, and load the exported role through NX's User Interface preferences > Roles > Load Role outside Sketch. Restart and verify. Keep your original role for recovery and test assignments in a disposable part. Default NX shortcuts may conflict, and roles from other NX versions may not be compatible. Stored tab visibility does not guarantee availability in every NX application. Docked ribbon records use existing stack visibility; detached/full-screen layouts are unsupported. Tab order, docking, sizes, inherited sidebar states and touch settings are not copied from donor roles.

For journal shortcuts, create a custom button in NX that runs your journal, then paste that button's actual NX command ID into the Studio. Exporting an accelerator does **not** install the journal or define its custom button. The example journal in `journals/ToggleCreateReferenceGeometry.vb` toggles the Sketch Create Reference Geometry preference; Construction Lines is a different command. See `journals/README.txt`.

Mouse and radial-menu plans are included in JSON only; they are not written into MTX exports. Custom ribbon tabs require their original definitions or add-ins in NX. Manufacturing tab suggestions cover the editor's Modeling/Sketching/No Part workspaces, not a full Manufacturing-application configuration.

## Source

The `dist` folder contains the authored static HTML, CSS, and JavaScript, a command-name/ID catalog, and a sanitized base role used only as a display catalog. Export requires the user's own baseline. Personal journal IDs and the original Windows-user History palette path are excluded. No private native verification parts or role backups are included.

Seven check suites passed, including 45 role XML checks, 32 portable-project checks, 36 pure display-controller checks, and headless browser upload/download/merge/mobile/local-file flows. Native NX 2606 tests covered generated shortcut and tab restart persistence, visual dimension/preference preservation, and original-role restoration. This is scoped evidence, not certification for every release or layout, or proof of the original dimension symptom's cause. See [portable format](PORTABLE_PROJECT_FORMAT.md) and [companion scope](companion/README.md).

Pure checks run with Node; browser tests need Playwright and an installed Edge (or NX_TEST_BROWSER executable). No browser, SDK, NX libraries or binary companion is bundled.

This is an independent utility, not an official Siemens product. No NX installation, libraries, or license is included.
