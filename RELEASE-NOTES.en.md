# Tech Tree Companion 0.4.34

- Color- and shape-aware minimap with rectangle, ellipse and diamond outlines, arrow direction, selection, search and high-DPI rendering.
- In-canvas focus on direct predecessors, successors and connecting arrows. The list remains an auxiliary action. In view mode, activate browsing before clicking a node; clicks do not open notes or SVG assets until the mode ends.
- Ellipse, circle and diamond starter layouts with contour validation. Existing cards are not migrated automatically. SVG cards do not gain all native shape selection and manual binding behavior.
- One app-owned tooltip path across navigation, editors, pickers and dialogs, including dynamic redraws and keyboard focus. Embedded native editor tooltips remain unchanged.
- Searchable Chinese/English settings; JavaScript and the complete official CSS lint configuration reject warnings. Navigation caches avoid repeated target resolution and geometry serialization without claiming whole-application CPU/GPU savings.
- Reviewed translations and placeholder integrity; refreshed bilingual documentation, English installation and usage in the root README, and release metadata.

Save drawings and close editors before updating. Replace only `main.js`, `manifest.json`, and `styles.css`; retain `data.json`, font caches, and card attachments. The creative picker remains off by default and existing explicit preferences are retained. Requires desktop Obsidian 1.13.7+ and Excalidraw 2.25.3+.

Overlapping elements and strongly curved arrows may not be outlined precisely. macOS/Linux host acceptance remains unverified; mobile is unsupported. Local tests and build provenance do not imply Community approval. Exact results are recorded with the release validation rather than copied from older versions.

## Historical Internal Notes

# Internal 0.4.34-dev.2

Adopted nonempty declarative settings definitions with Chinese/English aliases for the existing wheel, font, transfer, connection, template and resource sections. Custom controls and persistence paths are retained; re-render cleanup releases old observers and preview tasks. The hex placeholder now uses the valid example `#123456`, without disabling sentence-case lint. 318 automated tests and 199 Windows / Obsidian 1.13.7 host checks passed; JavaScript lint and the selected local CSS rules have zero errors or warnings. Minimum Obsidian version remains 1.13.7. Other platforms and the official Community backend were not verified. This internal update is not publicly released or installed into the user test Vault.

# Internal 0.4.34-dev.1

Replaced two `!important` declarations with scoped, specific picker and flight-source selectors. Local CSS lint has no errors or warnings; 313 automated tests and 162 Windows / Obsidian 1.13.7 host checks passed. Existing JavaScript lint still has two unrelated warnings. This is not a public release or test-Vault installation; published 0.4.33 files are unchanged.

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
