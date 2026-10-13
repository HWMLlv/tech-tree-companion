# Community release and provenance

Repository: https://github.com/HWMLlv/tech-tree-companion
Version: **0.4.32**. Minimum Obsidian: **1.13.7**, desktop only. Excalidraw **2.25.3 or later** must be installed and enabled separately. Author: HWMLlv. License: MIT. The plugin interface supports Chinese and English, with an option to follow Obsidian.

## Changes in this release

See RELEASE-NOTES.md for the complete 0.4.32 changes and USER-GUIDE.zh-CN.md for usage. This version adds interface localization and bilingual project pages, plus wheel duplicate-action feedback, separate command catalogs, and stable scrollbar space. Existing cards and custom ring content are preserved unless explicitly edited.

## Release process

1. Commit the complete source to the correct repository, including .github, .gitignore and .npmrc. Exclude node_modules, dist, local delivery packages, and host evidence.
2. Wait for the main workflow to pass. Create the exact tag **0.4.32**, without a v prefix, at that commit.
3. Wait for both validate and attest in the tag workflow to pass. Download the tag build's community-release artifact.
4. Publish a stable GitHub release with the artifact's main.js, manifest.json and styles.css as individual attachments. Verify their hashes and matching tag/commit provenance. Preserve all older releases.
5. On the existing Obsidian Community entry, select **Check for new releases** and inspect its review. Do not create a duplicate entry. GitHub validation and provenance do not establish community approval or app-browser availability.

The workflow installs locked dependencies, validates metadata, runs lint/tests, builds the three standard files and generates GitHub artifact attestations for trusted main/tag builds. Pull requests run read-only validation and do not issue attestations. The workflow itself does not publish releases.

## Validation scope

- Current local suite: 271 passing tests, zero failures. Lint: zero errors and two recommendations. The release is rebuilt from locked dependencies.
- 47 focused Windows Obsidian 1.13.7 / Excalidraw 2.25.3 checks passed for bilingual panels and commands, language persistence, preservation of saved content, two wheel entry points at three sizes, and documentation image rendering. These are not a full host acceptance suite.
- macOS/Linux host integration and public community-browser installation remain unverified. Mobile is unsupported. Native detail editing depends on private host APIs.

## Data access

The README documents local vault enumeration/reference checks and the user-triggered Copy draft clipboard write. These capabilities remain present. Configuration export downloads a user-selected JSON package of reusable settings; import reads only the user-selected file after validation and preview. It does not include note bodies or attachments. Navigation and link checks operate locally on the current drawing. No new network or clipboard access is added.