# Community release and provenance

Repository: https://github.com/HWMLlv/tech-tree-companion

The existing stable release is **0.4.27**. This change adds build provenance and documents existing vault/clipboard behavior; it does not change plugin runtime code, version metadata, or already published attachments.

## Existing 0.4.27 release

1. Commit the updated README, this guide, `.gitignore`, `.npmrc`, and `.github/workflows/validate.yml` to the repository root on `main`. Include the dotfiles and workflow directory; they were missing from the previous web upload.
2. Open **Actions → Validate and attest plugin**. The push to `main` runs validation, builds the locked source, uploads a `community-release` artifact, and generates attestations after validation succeeds. A manual run on `main` is also supported.
3. Download the artifact and compare the SHA-256 of each of its three files against the existing 0.4.27 release assets. An attestation covers only the matching bytes. If any hash differs, investigate the build difference; do not overwrite the existing release or claim it has been attested.
4. Verify the downloaded release files with `gh attestation verify <file> --repo HWMLlv/tech-tree-companion`. Record the successful workflow and verification results separately from the community's review result.

Local checks cannot issue GitHub attestations. Adding a workflow file alone does not prove that a release is attested; the GitHub run must succeed and the release-file digests must match. The existing community review reports vault enumeration and clipboard access as recommendations. These capabilities remain present by design, even after their documentation is improved.

## Future releases

1. Update `manifest.json`, `package.json`, the root/package version entries in `package-lock.json`, and `versions.json` consistently. Use a stable `x.y.z` version and retain the plugin ID.
2. Commit to `main` and run the validation workflow. Then create and push a Git tag matching the manifest version exactly, without a `v` prefix. This tag must reference the intended source commit; the tag workflow builds and attests its files before you publish a release.
3. Wait for both `validate` and `attest` to succeed in that tag's workflow run. Download and unzip its `community-release` artifact.
4. Create a GitHub release using that existing tag. Upload `main.js`, `manifest.json`, and `styles.css` individually from that artifact, verify that upload is complete, and publish as a stable release. Keep older releases intact. Do not substitute files from a separate local build without verifying their digests.
5. On the existing Obsidian Community entry, select **Check for new releases** and inspect the new review. Do not create a second directory entry. A successful Actions run or attestation does not establish official acceptance or installation in the app's community browser.

The workflow does not create, publish, replace, or delete GitHub releases. Pull requests run validation with read-only repository permissions; the separate attestation job only runs on this repository's main branch or version tags and has the `id-token: write` and `attestations: write` permissions required by GitHub.

## Data access disclosure

The README's **Vault scanning and clipboard access** section describes file enumeration, relevant content reads, resolved links/open drafts, automatic/manual scan triggers, local-only processing, confirmation before moving card attachments, and the user-triggered Copy draft clipboard write. Disabling the plugin stops scheduled scans. The plugin does not actively read or monitor the system clipboard; normal paste in the native editor is handled by Obsidian.

## Validation boundaries

The previous 0.4.27 CSS update had 198 passing regression tests, local CSS checks with zero diagnostics, and 19 isolated Windows host interface checks. Those historical results are not a new host run for this documentation/workflow change. macOS and Linux host integration remains untested, and mobile is unsupported. Native detail editing depends on private host runtime APIs.

The current release remains desktop-only with minimum Obsidian `1.13.7`. Excalidraw `2.25.3` or later must be installed and enabled separately. The UI is Chinese. Author: HWMLlv. Project license: MIT.

## References

- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [Manage your Community entry](https://docs.obsidian.md/community-directory/manage-entry)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)

## 中文操作提示

本次无需重发 0.4.27：更新上述文档和隐藏配置后，等待 Actions 的 `validate` 与 `attest` 两个任务成功，再核对三个构建文件与现有 Release 附件的 SHA-256。只有文件一致且 GitHub 验证成功，才能说现有附件已有来源证明。后续版本先创建与 manifest 一致的标签，等该标签构建通过，再下载其 `community-release` 内的三个文件上传到 Release。仓库枚举和剪贴板提示属于实际功能能力，完善说明后也可能继续显示。
