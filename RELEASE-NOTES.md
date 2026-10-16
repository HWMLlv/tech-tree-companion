# Tech Tree Companion 0.4.34

## 中文

- 小地图增加形状、主色、透明轮廓和箭头方向；画布内可聚焦直接前置与后续，也可查看关系列表。
- 查看模式先开启关系浏览再点击节点，不再误开文档或 SVG；退出后恢复原生链接，平移不误触点选。
- 模板中心可创建椭圆、圆形和菱形布局；不自动改变已有卡片，SVG 图片仍受原生选择和手工连线能力限制。
- 统一自有界面的悬停提示，保留动态改名、键盘提示、原生编辑器和无额外提示的卡牌／图标列表。
- 完善设置搜索，清理 JS／CSS 规范警告，优化重复文档解析与小地图几何检查。
- 核对中英文翻译和变量占位符，更新双语指南及根 README 的英文安装／使用步骤。

更新前保存画布并关闭编辑窗口。仅替换 `main.js`、`manifest.json`、`styles.css`，保留 `data.json`、字体缓存和卡片附件。创意卡牌仍默认关闭，已有手动选择保留。桌面版；需要 Obsidian 1.13.7+、Excalidraw 2.25.3+。

## English

See [English release notes](RELEASE-NOTES.en.md). This release adds shape-aware navigation, in-canvas connection browsing, shaped template layouts, unified tooltips, searchable settings, and bounded navigation caches. Existing cards and explicit preferences are preserved. The creative card picker remains off by default.

Windows host checks and local regression/lint checks do not establish macOS/Linux acceptance. Overlapping shapes and strongly curved connections may not be outlined precisely. Mobile is unsupported. Tagged workflow artifacts and their matching attestations establish build provenance, not Community approval.

## 历史版本 0.4.32

### 中文

本版加入中英文界面，重新整理项目介绍，并改进轮盘编辑中的重复功能提示和布局稳定性。

- **界面语言**：设置顶部可选“跟随 Obsidian / 中文 / English”。默认跟随宿主，语言偏好保存后重载仍保留；切换后重新打开已有编辑窗口即可更新显示。
- **保留你的内容**：语言切换不改写卡片正文、笔记、已保存模板或自定义轮盘名称。英文新模板使用简短按钮文案；轮盘名称可保存至 48 个字符。
- **轮盘功能去重与定位**：已加入功能只置灰，不增加文字后缀；重复点击或拖动尝试会选中已有区块，图标轻弹一次。取消闪烁和多余文字框，减少动态效果时只选中。
- **命令分类**：已安装命令列表排除本插件命令，避免两个入口重复；模板中心统一归入外环添加区，保留已有自定义内环配置。
- **稳定编辑布局**：属性栏与编辑主体预留滚动条位置，切换长命令时轮盘和列宽保持稳定。
- **双语项目介绍**：中文 README 默认展示，独立 English 页面可通过顶部链接切换，两版均配有真实界面截图；隐私与本地存储说明也分为两版。

更新时保留 `data.json`、字体缓存和现有卡片附件。旧自定义名称不会自动翻译。仍为桌面插件，需要 Obsidian 1.13.7+ 和 Excalidraw 2.25.3+。

## English

This release adds Chinese and English interface languages, refreshes the project introduction, and improves duplicate-action feedback and layout stability in the wheel editor.

- Choose **Follow Obsidian / Chinese / English** at the top of plugin settings. The preference survives reloads. Reopen existing editor windows after switching.
- Saved cards, notes, templates, and custom wheel names remain unchanged. New English templates use a compact button label; wheel names now retain up to 48 characters.
- Already-added actions appear dimmed without extra label text. Clicking or attempting to drag one selects its existing segment with a single gentle icon bounce. Flashing and the redundant text frame are removed; reduced-motion preferences use selection alone.
- Other-command lists exclude this plugin's commands. Template center belongs to the outer-ring action library; existing custom inner-ring placements remain intact.
- Reserved scrollbar space keeps wheel geometry and column widths stable when switching to longer command settings.
- Chinese is the default project page, with a separate English README and language links. Both pages include actual interface screenshots and localized privacy documentation.

Retain `data.json`, font caches, and existing card attachments when upgrading. Saved custom names are not automatically translated. Desktop only; requires Obsidian 1.13.7+ and Excalidraw 2.25.3+.

## Validation

271 automated tests and 47 focused Windows host checks passed on Obsidian 1.13.7 / Excalidraw 2.25.3. Lint reports zero errors and two recommendations. macOS, Linux, and mobile acceptance are not established.

Release attachments come from the successful version-tag workflow and have matching GitHub artifact attestations. Build provenance does not establish Obsidian Community approval.
