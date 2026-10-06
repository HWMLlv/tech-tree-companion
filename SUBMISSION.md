# Community release and provenance

Repository: https://github.com/HWMLlv/tech-tree-companion

This local package prepares **0.4.29** with the original ten quick icons restored alongside the independent 30-icon picker. The verified **0.4.27** source and published release are preserved. This delivery does not publish a new GitHub release or establish a new community review result.

## Publish 0.4.29

1. Upload or commit the complete contents of the source directory to the repository root on `main`, including `.github/workflows/validate.yml`, `.gitignore`, and `.npmrc`. Do not upload `node_modules`, test-host evidence, or the surrounding delivery directory. The manifest, package/lock versions, and `versions.json` are already updated to `0.4.29`.
2. Wait for the validation workflow to succeed. Create a Git tag named exactly `0.4.29`, without a `v` prefix, at that source commit.
3. Wait for both `validate` and `attest` to succeed in the tag's **Validate and attest plugin** workflow. Download and unzip its `community-release` artifact.
4. Create a stable GitHub release from that tag. Upload `main.js`, `manifest.json`, and `styles.css` individually from the artifact. Keep older releases intact. Use `gh attestation verify <file> --repo HWMLlv/tech-tree-companion` to verify downloaded attachments. A local build alone cannot issue GitHub attestations.
5. Select **Check for new releases** on the existing Obsidian Community entry and inspect its review. Do not create a duplicate entry. Build and attestation results are separate from community acceptance and app-browser availability.

The workflow validates metadata, installs locked dependencies, runs lint/tests, builds the three standard files, and uploads an artifact. Successful trusted `main` or tag builds issue attestations for those exact bytes. Pull requests run read-only validation and do not issue attestations. The workflow does not publish, replace, or delete releases automatically.

## Data access disclosure

The README's **Vault scanning and clipboard access** section describes existing file enumeration, content/reference checks, scan triggers, local-only processing, attachment recovery safeguards, and the user-triggered Copy draft clipboard write. These capabilities remain present and may remain community recommendations. The new built-in icon picker adds no network or clipboard access.

## Local validation

- 205 regression tests passed; JavaScript lint reported zero errors and seven existing warnings.
- 14 distinct checks passed in an isolated Windows Obsidian **1.13.7** / Excalidraw **2.25.3** vault, covering the original ten quick icons, one-click replacement, popup selection synchronization, cancellation, preservation of other module parameters, and template undo/redo. The previous 0.4.28 host validation separately covered 26 node/editor checks.
- No temporary vault files were created, and the original plugin settings and template draft were restored. The test vault retains the 0.4.29 installation for inspection; the working vault was not modified.
- GitHub Actions and artifact attestations for 0.4.29, its official community review, macOS/Linux host integration, and public community-browser installation have not been verified by this local delivery. Mobile is unsupported.

The plugin remains desktop-only with minimum Obsidian `1.13.7`. Excalidraw `2.25.3` or later must be installed and enabled separately. Native detail editing depends on private host APIs. The interface is Chinese. Author: HWMLlv. License: MIT.

## 中文操作提示

先更新正确的仓库 `HWMLlv/tech-tree-companion`。上传“源码”目录内部的文件，保留隐藏配置和 `.github`。等待 Actions 成功后，为该提交创建 `0.4.29` 标签；再从标签构建的 `community-release` 下载三个发布附件，创建新 Release。不要覆盖旧版 0.4.27，也不要把本地附件直接当作已有 GitHub 来源证明的文件。
