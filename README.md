# NX Shortcut Studio

A browser-based shortcut and role editor for Siemens Designcenter NX 2606.

[Open the live website](https://nx-shortcut-studio-shumm.shum-matt.chatgpt.site)

## Features

- Separate Modeling and Sketching keyboard maps, searchable command library, and drag-to-move/swap assignments.
- Configurable journal command names and NX custom-button command IDs.
- Ribbon and sidebar visibility controls, with suggested tabs based on what you use NX for. Suggestions do not change shortcuts.
- Merge ribbon and sidebar settings from MTX roles while retaining the selected base role's shortcuts and unrelated settings.
- Import/export browser layouts as JSON and export Modeling + Sketching shortcuts and visible tabs as an NX MTX role.

Your settings stay in your own browser. Role files selected for merging are processed locally, not uploaded to a server.

## Run locally

Open `dist/index.html` in a browser. If your browser restricts local files, serve the `dist` folder with any static web server. No build step or package installation is required.

## Using exports in NX

Load the exported role through NX's User Interface preferences > Roles > Load Role. Keep a backup of your existing role and test assignments in a disposable part. Default NX shortcuts may conflict, and roles from other NX versions may not be compatible.

For journal shortcuts, create a custom button in NX that runs your journal, then paste that button's actual NX command ID into the Studio. Exporting an accelerator does **not** install the journal or define its custom button. The example journal in `journals/ToggleCreateReferenceGeometry.vb` toggles the Sketch Create Reference Geometry preference; Construction Lines is a different command. See `journals/README.txt`.

Mouse and radial-menu plans are included in JSON only; they are not written into MTX exports. Custom ribbon tabs require their original definitions or add-ins in NX. Manufacturing tab suggestions cover the editor's Modeling/Sketching/No Part workspaces, not a full Manufacturing-application configuration.

## Source

The `dist` folder contains the authored static HTML, CSS, and JavaScript, a command-name/ID catalog, and the base role used for export. Personal journal IDs and the original Windows-user History palette path are excluded.

This is an independent utility, not an official Siemens product. No NX installation, libraries, or license is included.
