# Tech Tree Companion 0.4.33

This release consolidates completed changes since 0.4.32. Internal development versions are not published separately.

- Optional creative card picker, off by default. Existing explicit preferences are retained; the original editor and dropdown remain available.
- Solid fan browsing with looping, drag-and-snap, side-card clicks, keyboard navigation, search, grid view, stable arrows, and correctly retained edge buffers.
- Confirmation by button or double-click on an already-selected card. Side-card double-clicks do not confirm. Reselection retains fields and document links.
- A short card-to-editor transition with reduced-motion fallback and cleanup on cancellation, resizing, redraw, reselection, and unload.
- Static engineering-style default-card frame and bounded SVG preview caching, with less repeated geometry and template work.
- Appearance and icon tools moved to the fixed editor footer.
- Glyph-based inline editing and overflow detection. Empty or fitting fields avoid artificial scrolling; full overflowing drafts remain editable. Font status no longer hides clipping warnings.
- Correct minimap bounds for upward/leftward connections, localized default wheel names with preserved custom names, and stable import/export dialogs.
- Updated Chinese/English descriptions, warnings, fallback titles, and editor screenshots.

Validation: 311 automated tests and 168 host checks on Windows / Obsidian 1.13.7. Lint: zero errors, two existing warnings. Build and release metadata checks passed. Other desktop platforms and mobile hosts were not tested.

Release provenance is recorded by the tagged GitHub Actions build and matching artifact attestations. Local validation and release provenance do not imply Community acceptance.
