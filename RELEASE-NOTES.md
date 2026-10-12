## 中文

本版集中更新画布导航、双层快捷轮盘和配置工作流。

- **双层轮盘**：保留原有自定义内环，新增可选辅助外环。统一编辑器内可切换两环、保留草稿、移动适用功能，一次保存；支持撤销与重做。内外环半径均可配置。
- **自适应预览**：设置页轮盘随内容区宽度连续缩放；编辑器按可用宽高调整，常规桌面尺寸下区块设置位于右侧，避免无意义的轮盘滚动。
- **节点搜索与导航**：搜索当前绘图中的节点并定位；搜索跳转、小地图导航及普通平移／缩放可返回上个画布视图，与“返回上一页面”区分。
- **持续小地图**：开关状态在同一库的绘图之间和插件重启后保留；响应图形、平移与缩放变化，支持点击和拖动导航。
- **批量外观与关联检查**：预览后批量应用所选外观或图标，合为一次可撤销操作；检查文档／章节失效并手动重新关联。
- **配置分享**：导入／导出模板、模块预设和轮盘，导入前预览并选择冲突处理方式；默认不覆盖轮盘，也不会自动改写已有卡片。

更新时保留 `data.json`、字体缓存及现有卡片附件。辅助外环默认关闭，原轮盘内容和顺序不会被自动迁移。仍为桌面插件，需要 Obsidian 1.13.7+ 与 Excalidraw 2.25.3+。

## English

This release adds drawing navigation, an optional auxiliary radial-menu layer, and reusable configuration workflows.

- Edit both rings in one dialog with retained drafts, cross-ring transfers for supported actions, undo/redo, and a single save. Existing primary customization is preserved; both radii are configurable.
- Fit the settings overview to its content width and the editor to its available width and height, keeping properties on the right at normal desktop sizes.
- Search and locate nodes in the current drawing, and return after navigation or ordinary pan/zoom gestures.
- Keep the minimap enabled across drawings and plugin reloads in the same vault, with scene and viewport updates plus click/drag navigation.
- Preview batch appearance/icon edits in one undoable operation; inspect broken note/heading links and choose replacements manually.
- Import/export templates, module presets, and radial settings with previews and conflict choices. Radial import is off by default; existing cards are not rewritten.

Retain `data.json`, font caches, and card attachments when upgrading. Desktop only; Obsidian 1.13.7+ and Excalidraw 2.25.3+ are required. The interface remains Chinese.

## Validation

261 automated tests pass; lint has zero errors and six existing warnings. Focused Windows Obsidian 1.13.7 / Excalidraw 2.25.3 checks covered the preceding local revisions, including dual-ring editing, minimap lifecycle, navigation, scaled native drag/drop, and both editor entry points. The final width-fit correction passed 11 targeted host checks. This is not full cross-platform or mobile acceptance.

Release attachments are the exact three files from the successful version-tag workflow, with matching GitHub artifact attestations. Build provenance does not establish Obsidian Community approval.
