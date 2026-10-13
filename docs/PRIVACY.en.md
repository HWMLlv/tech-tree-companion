# Privacy, network, and local storage

[中文](PRIVACY.zh-CN.md) | **English** · [Project page](../README.en.md)


There are no accounts, payments, advertisements, analytics, client-side telemetry, or external file access in this plugin.

The only network requests download **versioned Xiaolai Chinese font shards registered by Excalidraw** from `unpkg.com` or `esm.sh`. These requests are needed when **Excalifont** is selected and Chinese glyphs are required. Requests use Obsidian's `requestUrl` and send the font URL, not note text, card text, paths, or vault contents. The CDN receives ordinary request metadata such as the IP address. Other third-party plugins may make their own requests independently.

Downloaded font shards are validated and cached under this plugin's configuration directory in `font-cache/`. An uncached shard requires a network connection; a cached shard works offline. If font preparation fails, the card save is rejected rather than silently saving an incomplete font. System fonts do not require downloads. Old unused font cache files may be removed automatically; card attachments are handled separately.

Settings, templates, asset records, and retained detail drafts use Obsidian's plugin `data.json`. Generated SVGs are stored in a user-selected ordinary folder inside the vault (default: `科技树资源/卡片`); recycle files remain in the vault until the separately confirmed system-trash action. SVG cards embed native font subsets for standalone display. Their character-range declarations are compacted without changing geometry or text. System-font cards rely on font availability on the device that displays them.

Linked note edits replace only the validated heading section or whole note explicitly linked to the card. The plugin checks for concurrent source changes before writing. Keep vault backups, particularly before bulk changes. Native live editing aims to retain host Markdown/plugin styling, but third-party editor extensions and private Excalidraw APIs are not guaranteed compatible.

### Vault scanning and clipboard access

- **Vault enumeration and reference scanning:** Resource management uses `vault.getFiles()` to list visible vault files. To avoid recycling a card attachment that is still in use, it reads relevant `.md`, `.canvas`, `.json`, `.excalidraw`, `.svg`, `.html`, and `.css` files, checks Obsidian's resolved links, and includes open editor drafts in its local reference check. Registered card attachments and the plugin's default attachment/recycle folders are excluded from the general content scan; owned SVGs may be read separately for integrity checks and recovery. File paths and contents are not sent to a server.
- **When scans run:** A scan is scheduled after plugin startup and relevant Excalidraw file changes. Opening resource management or its settings summary, clicking the scan/refresh button, and performing recovery/recycling operations also request reference checks. Background scanning maintains local resource records; it does not move or delete card attachments. Moving attachments to the recycle area or system trash requires a separate user-confirmed action. Avoiding the scan button alone does not disable background scanning; disabling the plugin stops its scheduled scans.
- **Clipboard writes:** Clicking **Copy draft** writes the current detail draft to the system clipboard and replaces its previous text. The plugin's own feature code does not actively read or monitor the system clipboard. Standard user-initiated paste in Obsidian's native editor is handled by the host. Avoid the Copy draft button to leave the clipboard untouched by this feature.

These capabilities may remain listed as community review recommendations because they are required by the corresponding features; documentation does not remove the underlying capability.
