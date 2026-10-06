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

## Network, privacy, and storage

There are no accounts, payments, advertisements, analytics, client-side telemetry, or external file access in this plugin.

The only network requests download **versioned Xiaolai Chinese font shards registered by Excalidraw** from `unpkg.com` or `esm.sh`. These requests are needed when **Excalifont** is selected and Chinese glyphs are required. Requests use Obsidian's `requestUrl` and send the font URL, not note text, card text, paths, or vault contents. The CDN receives ordinary request metadata such as the IP address. Other third-party plugins may make their own requests independently.

Downloaded font shards are validated and cached under this plugin's configuration directory in `font-cache/`. An uncached shard requires a network connection; a cached shard works offline. If font preparation fails, the card save is rejected rather than silently saving an incomplete font. System fonts do not require downloads. Old unused font cache files may be removed automatically; card attachments are handled separately.

Settings, templates, asset records, and retained detail drafts use Obsidian's plugin `data.json`. Generated SVGs are stored in a user-selected ordinary folder inside the vault (default: `科技树资源/卡片`); recycle files remain in the vault until the separately confirmed system-trash action. SVG cards embed native font subsets for standalone display. Their character-range declarations are compacted without changing geometry or text. System-font cards rely on font availability on the device that displays them.

Linked note edits replace only the validated heading section or whole note explicitly linked to the card. The plugin checks for concurrent source changes before writing. Keep vault backups, particularly before bulk changes. Native live editing aims to retain host Markdown/plugin styling, but third-party editor extensions and private Excalidraw APIs are not guaranteed compatible.

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
