# Community submission — 0.4.26

Prepared for the **Obsidian Community directory** on 2026-10-06. Local validation is not an admission decision. No public repository, GitHub release, or directory entry has been created by this work.

## Identity

| Field | Value |
| --- | --- |
| ID | `tech-tree-companion` |
| Display name | Tech Tree Companion |
| Author | HWMLlv |
| License | MIT |
| Version / release tag | `0.4.26` (without a `v` prefix) |
| Minimum Obsidian | `1.13.7` |
| Platform | Desktop only |
| Dependency | Excalidraw `2.25.3` or later, separately installed |

The repository URL is still to be supplied. Do not put a guessed URL in metadata. The ID must be checked again at submission time; a directory snapshot without a matching ID is not a reservation.

## Publish and submit

1. Create or select a **public source repository** under your GitHub account. Upload this source directory's contents to the repository root, including dotfiles, `README.md`, `LICENSE`, `manifest.json`, `versions.json`, `package-lock.json`, `THIRD-PARTY-NOTICES.txt`, `third-party/`, `src/`, `runtime/`, and `test/`. `runtime/` contains build inputs and is not an installation requirement. Exclude `node_modules/`, `dist/`, local vault data, caches, and private verification backups.
2. Run `npm ci --ignore-scripts`, `npm run lint`, `npm test`, and `npm run build` from that clean checkout. Inspect the lint advisories described below. The three output files are in `dist/`.
3. Commit the exact source and manifest on the default branch. Create a GitHub release tagged **`0.4.26`**, matching the manifest exactly. Attach `main.js`, `manifest.json`, and `styles.css` as three separate release assets. A ZIP or GitHub's generated source archive does not replace these assets.
4. Sign in at [community.obsidian.md](https://community.obsidian.md), connect your GitHub account, and add the plugin with the actual repository URL. The directory reads the manifest at the default branch's HEAD. Review the public description and disclosures before publishing.
5. Inspect automatic review results. If changes are required, fix the source, increment the version and `versions.json`, publish the corresponding release/assets, and request review again. Do not describe this local package as approved or installable from the Community directory yet.

The optional `.github/workflows/validate.yml` runs validation and uploads build artifacts when the source is pushed. It does **not** publish releases. Its workflow has been prepared locally; an actual GitHub Actions run has not been observed.

## Local evidence and remaining limits

- A standard three-file clean installation and an upgrade from `0.4.25-preview` were exercised in an isolated Windows vault. The formal working vault and original release were preserved.
- Cold font download, embedded Worker, warm-cache offline rendering, cold-cache offline refusal, native card save/update/undo/redo, chapter input/save/conflicts, resource recycling protection, disabled-dependency handling, settings, and template previews were exercised in Obsidian `1.13.7` with Excalidraw `2.25.3`.
- The regression suite has 198 tests. Clean locked dependency installation and build were verified. Package audits are point-in-time checks; they do not replace review of bundled code or third-party licenses.
- The recommended `eslint-plugin-obsidianmd` scanner reports **zero errors and seven warnings**: six sentence-case suggestions for font brands, keyboard keys, sample `Aa`, and `#RRGGBB`, plus one advisory about declarative setting definitions. The original names remain correctly capitalized. Settings work, but plugin controls are not integrated into Obsidian's global setting search. These warnings were not disabled to obtain a clean result.
- Native chapter editing and some Excalidraw integrations depend on private runtime APIs. Future upstream versions and arbitrary third-party editor extensions require separate compatibility testing.
- macOS, Linux, mobile, GitHub Actions, public-release installation, and the official automatic review are **NOT RUN**. A local Windows result must not be presented as cross-platform or directory acceptance.

Detailed local measurements and unsuccessful initial verification attempts are supplied separately with the delivery; do not upload private vault backups as public source.

## Official references

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin%20guidelines)

## 中文发布提示

将“源码”目录的内容放在公开 GitHub 仓库根目录；用纯数字标签 `0.4.26` 创建 Release，并分别上传三个标准文件。然后登录官方社区网站、关联 GitHub 并提交实际仓库地址。当前只完成本地准备，尚未提交或获得官方审核通过。
