import {tr} from './i18n.js';
import en from './locales/en.json' with {type:'json'};

const terms={
 radial:['快捷轮盘','画布快捷轮盘','启用轮盘','启用辅助外环','内环内容','外环内容','长按触发方式','辅助层切换键','长按时长（毫秒）','中心取消区半径','内环半径','外环半径','绑定按键'],
 font:['节点字体','科技节点字体','通用字体','保存通用字体'],
 configs:['配置分享','配置导入与导出','模板、模块与轮盘','导入／导出配置'],
 connection:['默认连线','默认连线样式','手绘新箭头使用默认样式','描边','描边宽度','边框样式','线条风格','箭头类型','起点','终点','不透明度','恢复推荐值','保存默认样式'],
 templates:['卡片模板','卡片模板管理','已保存的卡片模板','创意卡牌选择','管理模板'],
 assets:['资源管理','卡片附件与回收站','刷新概览','管理资源']
};
export function settingsDefinitions(tab){
 const aliases=keys=>[...new Set(keys.flatMap(key=>[key,en[key]??key]))];
 // Indexing must not render previews, read files, or mutate saved settings.
 return [
  {name:tr('界面语言'),desc:tr('仅切换插件界面文字，不翻译已保存的卡片、笔记或自定义名称。重新打开其他面板以更新显示。'),aliases:aliases(['界面语言']),render:setting=>tab.renderLanguage(setting)},
  {name:tr('快捷轮盘'),searchable:false,render:setting=>tab.renderNavigation(setting)},
  ...Object.entries(terms).map(([key,keys])=>({name:tr(keys[1]??keys[0]),aliases:aliases(keys),render:setting=>tab.renderSection(setting,key)}))
 ];
}
