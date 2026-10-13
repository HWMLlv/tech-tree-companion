import {tr} from './i18n.js';
import {clone,isTech,validateTemplate} from './model.js';
import {ICONS} from './icons.js';
export function batchTemplates(nodes,patch){
 const allowed=['border','background','strokeStyle','strokeWidth','icon','iconScope'];
 if(Object.keys(patch).some(k=>!allowed.includes(k)))throw Error(tr('不支持的批量修改项'));
 if(patch.icon!==undefined&&!Object.hasOwn(ICONS,patch.icon))throw Error(tr('请选择支持的图标'));
 let skippedIcons=0;const changes=[];
 for(const node of nodes){if(!isTech(node)||node.isDeleted||node.locked)continue;const t=clone(node.customData.techTree.template);
  for(const key of ['border','background'])if(Object.hasOwn(patch,key))t[key]=patch[key];
  for(const key of ['strokeStyle','strokeWidth'])if(Object.hasOwn(patch,key))t.appearance={...t.appearance,[key]:patch[key]};
  if(patch.icon!==undefined){const icons=t.modules.filter(m=>m.type==='icon');if(!icons.length)skippedIcons++;for(const m of patch.iconScope==='all'?icons:icons.slice(0,1))m.icon=patch.icon;}
  validateTemplate(t);if(JSON.stringify(t)!==JSON.stringify(node.customData.techTree.template))changes.push({node,template:t});
 }return {changes,skippedIcons};
}
