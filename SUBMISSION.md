# Community update — 0.4.27

Prepared on 2026-10-06 for the existing Obsidian Community listing of Tech Tree Companion.

Repository: https://github.com/HWMLlv/tech-tree-companion

## Publish this update

1. Commit the contents of this source directory to the repository root on the default branch. Preserve subdirectories and dotfiles. Exclude `node_modules/`, `dist/`, vault data, caches, and local verification backups.
2. Run `npm ci --ignore-scripts`, `npm run lint`, `npm test`, and `npm run build`. The outputs are `dist/main.js`, `dist/manifest.json`, and `dist/styles.css`.
3. Create a new GitHub release tagged **`0.4.27`**, without a `v` prefix. Upload those three files individually as release assets. Keep the existing `0.4.26` release intact.
4. On the existing Community entry, select **Check for new releases** and inspect the new review. Do not create a second directory entry or change the plugin ID.

The manifest remains desktop-only with minimum Obsidian `1.13.7`. Excalidraw `2.25.3` or later must be installed and enabled separately. The current UI is Chinese. The author is HWMLlv and the project license is MIT.

## Changes and evidence

- Replace the accessibility label bank's `clip-path` with opacity on its existing small, noninteractive container. Accessible names still use `aria-labelledby`.
- Replace grid `column-gap` with equivalent `gap: 0 24px`; the flagged rule was a grid, not a multicolumn layout.
- Remove duplicate `color` and `background` declarations. The old duplicate background was a fallback for `color-mix`, which is supported by the tested host and the local conservative browser target.
- Remove all 32 `!important` declarations. Use more specific selectors for plugin-owned controls and native detail surfaces. Use a local CSS custom property for drag-category color so the removal state can override it normally.
- Local Stylelint and its browser-compatibility plugin reproduce all 36 original diagnostics and report zero diagnostics for this update, targeting Chrome 130. These are local checks, not the official backend's exact configuration.
- All 198 regression tests pass. JavaScript ESLint reports zero errors and the same seven pre-existing advisories; no advisory was disabled.
- In the isolated Windows Obsidian `1.13.7` host, 19 interface checks pass. Six native detail-layout nodes retain their baseline computed layout, and the reading/editing frame stays stable. Font/resource close controls, field editing, selected styles, radial editor, drag-state color and settings columns were exercised.
- The verification note was deleted and original test-vault settings restored. The formal working vault and the original 0.4.26 delivery were not modified.

## Limits

The previous 0.4.26 package had separate clean-install, font/offline, save/conflict and resource-protection validation. This update reruns the existing regression suite and the interface checks described above; it does not claim to rerun every previous host scenario. macOS and Linux remain untested, and mobile remains unsupported.

This 0.4.27 update has not been uploaded or reviewed by the official backend, and installation through the public Community directory has not been verified. The existing GitHub workflow validates builds but does not publish releases. Native editing still depends on private host runtime APIs and arbitrary themes/editor extensions need separate compatibility testing.

## Official references

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Manage your entry and review results](https://docs.obsidian.md/community-directory/manage-entry)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)

## 中文提示

先上传“源码”内的内容，再新建标签为 `0.4.27` 的 Release，并分别上传三个“发布附件”。保留原 0.4.26。在现有社区条目中检查新版本，无需重新注册插件。当前本地 CSS 检查为零问题，官方 0.4.27 复审尚未执行。
