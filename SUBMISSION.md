# Community release and provenance

Repository: https://github.com/HWMLlv/tech-tree-companion
Version: **0.4.30**. Minimum Obsidian: **1.13.7**, desktop only. Excalidraw **2.25.3 or later** must be installed and enabled separately. Author: HWMLlv. License: MIT. The plugin interface is Chinese.

## Changes in this release

- Recalculate complete dashed/dotted repeat cycles for resized rounded borders. Keep gaps at all four square corners rather than wrapping one dash around a corner.
- Coalesce card-resize pointer moves once per animation frame; redraw only border/background during the gesture. Retain text/icon/module positions, use continuous preview dimensions, snap and validate on release, and record one undo step. Cancel pending work safely on Escape, pointer cancellation, lost capture, or closing the view.
- Double-click ordinary detail reading text to enter the existing live editor, keeping approximately the same reading position. Interactive controls and modified double-clicks retain their normal behavior. Switching modes alone does not write the linked note.
- Remove redundant icon-picker hover tooltips while retaining visible labels, accessibility names, the original quick icon buttons, and the complete picker.

Existing saved SVG cards require an explicit edit/save or **优化选中节点附件（保留字体设置）** to apply the new border layout. No automatic vault-wide rewrite is performed.

## Release process

1. Commit the complete source to the correct repository, including .github, .gitignore and .npmrc. Exclude node_modules, dist, local delivery packages, and host evidence.
2. Wait for the main workflow to pass. Create the exact tag **0.4.30**, without a v prefix, at that commit.
3. Wait for both validate and attest in the tag workflow to pass. Download the tag build's community-release artifact.
4. Publish a stable GitHub release with the artifact's main.js, manifest.json and styles.css as individual attachments. Verify their hashes and matching tag/commit provenance. Preserve all older releases.
5. On the existing Obsidian Community entry, select **Check for new releases** and inspect its review. Do not create a duplicate entry. GitHub validation and provenance do not establish community approval or app-browser availability.

The workflow installs locked dependencies, validates metadata, runs lint/tests, builds the three standard files and generates GitHub artifact attestations for trusted main/tag builds. Pull requests run read-only validation and do not issue attestations. The workflow itself does not publish releases.

## Validation scope

- Current cumulative local suite: **219 passing, zero failing** tests. Lint: zero errors and seven existing UI sentence-case warnings. Build succeeds.
- Isolated Windows Obsidian **1.13.7** / Excalidraw **2.25.3** checks for the accumulated work: 22 detail/rounded-border checks, 16 icon-picker tooltip checks, 7 square-border checks covering 168 render variants, and 21 resize/undo/cancellation checks. These are separate focused checks, not a claim of full cross-platform coverage.
- A fixed host CPU comparison reduced a 200-move programmatic burst from 200 full-card redraws to one border update. This measures callback/render work; it is not end-to-end FPS or a guarantee for every machine.
- Original isolated-vault settings and drafts were restored; temporary note/drawing/SVG fixtures were removed. The actual working vault was not modified.
- macOS/Linux host integration and public community-browser installation remain unverified. Mobile is unsupported. Native detail editing depends on private host APIs and may require updates after upstream changes.

## Data access

The README documents existing local vault enumeration/reference checks and the user-triggered **复制草稿** clipboard write. These capabilities remain present and can remain review recommendations. This release adds no network or clipboard access. Font requests continue to download only the versioned Xiaolai font shards registered by Excalidraw; vault text and paths are not sent to a server.

## 中文提示

拉伸卡片时连续预览，松手后网格对齐；文字、图标和模块位置保持原样。已有卡片需重新保存或运行“优化选中节点附件（保留字体设置）”才能应用新的虚线/点线排布。详情阅读正文可双击进入实时编辑，链接和按钮等保留原操作。更新时保留 data.json、字体缓存和已有卡片附件。
