import {tr,sourceKey} from './i18n.js';
import {RADIAL_ACTIONS,AUXILIARY_ACTIONS} from './radial-model.js';
const commandLabels={
 'manage-resources':['资源管理：扫描与恢复附件'], 'radial-settings':['编辑画布快捷轮盘','编辑轮盘'],
 'config-transfer':['配置导入与导出','配置分享'], 'search-nodes':['搜索与定位节点','搜索节点'],
 'check-node-links':['检查节点文档关联','检查关联'], 'toggle-minimap':['小地图开关','小地图'],
 'navigation-back':['返回上个画布视图','返回上个视图','返回位置'],
 'batch-appearance':['批量修改卡片外观','批量外观'], 'font-settings':['字体设置'],
 'refresh-node-fonts':['更新选中节点字体','更新字体'], 'optimize-node-assets':['优化选中节点附件（保留字体设置）','优化附件'],
 'connection-style':['默认连线样式'], 'capture-connection-style':['将选中箭头设为默认连线'],
 'apply-connection-style':['应用默认样式到选中连线'], 'template-center':['模板中心'],
 'create-node':['新建科技节点','新建节点'], 'edit-node':['编辑节点'], 'open-details':['打开详情','节点详情'],
 'apply-template':['应用模板新版'], 'replace-node-icon':['更换节点图标']
};
function names(item){
 const aux=item.action?.startsWith('aux:')?item.action.slice(4):!item.action?item.id:null;
 if(aux){const entry=AUXILIARY_ACTIONS.find(a=>a[0]===aux);return entry?[entry[1],...(aux==='navigation-back'?['返回位置']:[])]:[];}
 if(item.command==='app:go-back')return ['返回上一页面','返回'];
 if(item.command?.startsWith('tech-tree-companion:'))return commandLabels[item.command.slice('tech-tree-companion:'.length)]??[];
 const entry=RADIAL_ACTIONS.find(a=>a[0]===item.action);return entry?[entry[1]]:[];
}
export const radialDefaultLabel=item=>names(item)[0]??null;
// Legacy defaults are recognized only by an exact name for the same operation.
// Explicitly edited names always remain user content, even when they match a default.
export function radialLabel(item){
 if(item.labelCustom)return item.label;
 const known=names(item),key=sourceKey(item.label);
 return known.includes(key)?tr(key==='返回位置'||key==='返回'?known[0]:key):item.label;
}
