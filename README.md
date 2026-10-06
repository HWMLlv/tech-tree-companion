# Tech Tree Companion

Create SVG technology cards, manage card templates, draw connections, and edit linked Markdown sections inside Excalidraw. The current interface is in Chinese.

This is an independent companion to [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin), not a first-party Obsidian or Excalidraw product.

## Requirements

- Obsidian **1.13.7 or later** on desktop. Windows 11 with Obsidian 1.13.7 is tested; macOS and Linux have not yet been tested. Mobile is not supported.
- Install and enable **Excalidraw 2.25.3 or later** separately. Integration is tested with Excalidraw 2.25.3; the plugin checks the required APIs before editing a drawing. Native fonts and the chapter editor also depend on Excalidraw's runtime APIs; future upstream changes may require an update.
- The plugin does not install or update itself or other plugins.

## Install

Once admitted to the community directory, find **Tech Tree Companion** under Settings → Community plugins. Until then, download the release's `main.js`, `manifest.json`, and `styles.css`, put these three files in `<vault>/<configDir>/plugins/tech-tree-companion/`, then reload Obsidian and enable the plugin. The default configuration directory is `.obsidian`, but custom configuration directories are supported.

No separate `runtime` directory is needed. The font worker, WebAssembly code, and bundled dependency license notices are embedded in `main.js`. When upgrading, back up and retain `data.json`, font caches, and generated card attachments.

## Use

1. Open an editable Excalidraw drawing and run **新建科技节点** to create a card. Fill its fields, choose a saved template, and optionally link a Markdown note or heading.
2. Select a card and run **编辑节点** to edit its content, or **打开详情** to read and edit the linked note section. Detail edits are automatically saved. External changes trigger conflict handling; unsaved drafts can be retained and copied.
3. Open **模板中心** to edit card layouts and save templates. **管理模板** in settings and the template center provides visual previews, explicit editing, inline rename, copy, default selection, and deletion. Template changes do not automatically rewrite existing cards.
4. Configure **快捷轮盘**, **节点字体**, and **默认连线** in settings. Existing cards or arrows change only when explicitly updated. **优化选中节点附件（保留字体设置）** rebuilds selected cards using their existing font settings.
5. Open **资源管理** to inspect attachment references, change card attachment folder/naming, or restore recycled files. Scanning does not delete files. Unreferenced owned attachments are retained for at least seven days before moving to the plugin's recoverable recycle area. After a further thirty days, a separate user-confirmed action can move them to the system trash. Recovery operations are guarded when drawings are open or scans are incomplete. Unknown/legacy attachments are not automatically claimed or deleted.

### Card icons

The module properties panel retains the original 10 icons for immediate one-click selection. **更多图标** opens the independent 30-icon picker in four groups: common icons, resources/materials, production equipment, and processes/logistics. Its current-icon preview stays synchronized with quick selections and confirmed popup selections, including extended icons. The new resource choices include ore, rock, crystal, ingot, powder, gravel, wood, and gas. Icons use the same outline style as the existing set and require no downloads.

In **新建科技节点** or **编辑节点**, click **更换节点图标**. If the card contains multiple icon modules, choose which one to replace. **使用此图标** updates the editor draft; creating or saving the node applies it to the drawing. Cancel leaves the draft unchanged. Only the selected icon's shape changes: its color, position, size, card fields, links, and other parameters are retained. A saved change uses the drawing's normal undo/redo history.

If the selected template has no icon module, the entry stays disabled with an explanation. Add an icon module in **模板中心** first; the picker does not automatically add one or change the card layout. In the template editor, select an icon module and either click a quick icon or use **更多图标** to open the same picker. Template editing retains its existing save and undo behavior; existing cards are not automatically rewritten.

## Network, privacy, and storage

There are no accounts, payments, advertisements, analytics, client-side telemetry, or external file access in this plugin.

The only network requests download **versioned Xiaolai Chinese font shards registered by Excalidraw** from `unpkg.com` or `esm.sh`. These requests are needed when **Excalifont** is selected and Chinese glyphs are required. Requests use Obsidian's `requestUrl` and send the font URL, not note text, card text, paths, or vault contents. The CDN receives ordinary request metadata such as the IP address. Other third-party plugins may make their own requests independently.

Downloaded font shards are validated and cached under this plugin's configuration directory in `font-cache/`. An uncached shard requires a network connection; a cached shard works offline. If font preparation fails, the card save is rejected rather than silently saving an incomplete font. System fonts do not require downloads. Old unused font cache files may be removed automatically; card attachments are handled separately.

Settings, templates, asset records, and retained detail drafts use Obsidian's plugin `data.json`. Generated SVGs are stored in a user-selected ordinary folder inside the vault (default: `科技树资源/卡片`); recycle files remain in the vault until the separately confirmed system-trash action. SVG cards embed native font subsets for standalone display. Their character-range declarations are compacted without changing geometry or text. System-font cards rely on font availability on the device that displays them.

Linked note edits replace only the validated heading section or whole note explicitly linked to the card. The plugin checks for concurrent source changes before writing. Keep vault backups, particularly before bulk changes. Native live editing aims to retain host Markdown/plugin styling, but third-party editor extensions and private Excalidraw APIs are not guaranteed compatible.

### Vault scanning and clipboard access

- **Vault enumeration and reference scanning:** Resource management uses `vault.getFiles()` to list visible vault files. To avoid recycling a card attachment that is still in use, it reads relevant `.md`, `.canvas`, `.json`, `.excalidraw`, `.svg`, `.html`, and `.css` files, checks Obsidian's resolved links, and includes open editor drafts in its local reference check. Registered card attachments and the plugin's default attachment/recycle folders are excluded from the general content scan; owned SVGs may be read separately for integrity checks and recovery. File paths and contents are not sent to a server.
- **When scans run:** A scan is scheduled after plugin startup and relevant Excalidraw file changes. Opening resource management or its settings summary, clicking the scan/refresh button, and performing recovery/recycling operations also request reference checks. Background scanning maintains local resource records; it does not move or delete card attachments. Moving attachments to the recycle area or system trash requires a separate user-confirmed action. Avoiding the scan button alone does not disable background scanning; disabling the plugin stops its scheduled scans.
- **Clipboard writes:** Clicking **复制草稿** (Copy draft) writes the current detail draft to the system clipboard and replaces its previous text. The plugin's own feature code does not actively read or monitor the system clipboard. Standard user-initiated paste in Obsidian's native editor is handled by the host. Avoid the Copy draft button to leave the clipboard untouched by this feature.

These capabilities may remain listed as community review recommendations because they are required by the corresponding features; documentation does not remove the underlying capability.

## Release provenance

The [GitHub Actions workflow](.github/workflows/validate.yml) validates metadata, installs locked dependencies, runs lint and tests, and builds the three standard release files. Successful builds on this repository's `main` branch or version tags then generate GitHub artifact attestations for those exact files. Pull-request validation does not issue attestations. The workflow uploads a `community-release` artifact and does not publish or replace releases automatically.

For a new release, upload the three files from the successful version-tag build's artifact. For an existing release, an attestation covers an attachment only when its SHA-256 matches the attested file; do not assume that a successful workflow attests different manually built files. Attestations establish build provenance, not a security audit or an Obsidian approval.

After downloading release assets, users with GitHub CLI can verify each file, for example:

```sh
gh attestation verify main.js --repo HWMLlv/tech-tree-companion
gh attestation verify manifest.json --repo HWMLlv/tech-tree-companion
gh attestation verify styles.css --repo HWMLlv/tech-tree-companion
```

See [GitHub's artifact attestation documentation](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

## Development

Use Node.js **24 LTS** and npm:

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run build
```

The release files are in `dist/`. Commit the source, `manifest.json`, `versions.json`, lockfile, README, license, and notices. Do not commit `dist/` or a generated root `main.js`. See [SUBMISSION.md](SUBMISSION.md) for the current publication steps and validation boundaries.

## License and acknowledgements

Project code is **MIT**, copyright 2026 **HWMLlv**. See [LICENSE](LICENSE).

Bundled dependencies retain their own licenses. Full license texts and copyright notices are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) and the release's `main.js` header. They include CodeMirror, Rough.js, Markdown tooling, HarfBuzz, WOFF2 tooling, and supporting libraries. The npm package `woff2sfnt-sfnt2woff` omits a separate license file; the supplemented MIT text retains the 2014 Onur Demiralay attribution present in its source header and MIT designation in its package metadata.

Native font assets come from the installed Excalidraw runtime and retain their upstream licensing; no font binaries are included in the release. Font name, copyright, and license metadata is retained by subsetting when present in the source shard (some upstream shards omit license fields). See the included [Excalifont notice](third-party/Excalifont-font-notice.txt), [Xiaolai OFL](third-party/Xiaolai-OFL.txt), [Excalidraw's font sources](https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/fonts), and the installed runtime's font licenses. Excalifont is a trademark of Excalidraw. The project MIT license does not replace font licenses.

---

中文说明：本插件用于 Excalidraw 科技树卡片、模板、连线与关联正文管理，当前界面为中文。发布版只需三个标准文件，无需额外 runtime 文件夹。首次使用中文手写字形需从字体 CDN 下载，缓存后可离线；不会上传正文或仓库内容。模板、字体、连线的设置不会自动改写已有卡片，需主动应用。资源扫描只统计引用；回收和移至系统回收站是独立操作，并有保留期与引用核验。请保留仓库备份。

权限说明：资源扫描会列出仓库文件，读取上述相关格式的内容，并检查已打开的编辑草稿，以避免错误回收仍被引用的附件；检查在本地进行，不上传正文或路径。启动插件、相关绘图文件变化、打开资源管理或设置中的资源摘要、主动刷新及回收/恢复操作均可能触发扫描，关闭插件会停止其计划扫描。扫描本身不移动或删除卡片附件。“复制草稿”仅在点击后写入系统剪贴板并替换原有文本，插件功能不主动读取或监控剪贴板；原生编辑器的主动粘贴由宿主处理。

发布来源说明：成功的 GitHub Actions 主分支或版本标签构建会为三个发布文件生成来源证明；PR 只验证，不生成证明。今后发布时使用对应版本标签构建的 `community-release` 附件。现有 Release 只有与构建文件的 SHA-256 完全一致时，才由该证明覆盖；来源证明不等于安全审计或 Obsidian 审核通过。
