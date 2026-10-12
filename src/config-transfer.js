import {clone,validateTemplate,DEFAULT_TEMPLATE,uid} from './model.js';
import {radialConfig} from './radial-model.js';
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k)).map(k=>[k,clone(value[k])]));
const templateKeys=['id','name','version','width','height','grid','background','border','fontFamily','appearance','modules'];
const moduleKeys=['id','type','field','label','x','y','w','h','fontSize','fontWeight','color','align','icon','action','fillColor'];
const appearanceKeys=['strokeWidth','strokeStyle','roughness','corner','opacity','textOpacity','fillStyle'];
function cleanTemplate(value){
 const t=pick(value,templateKeys);t.modules=(t.modules??[]).map(m=>pick(m,moduleKeys));if(t.appearance)t.appearance=pick(t.appearance,appearanceKeys);
 if(typeof t.id!=='string'||t.id.length>150||typeof t.name!=='string'||t.name.length>100)throw Error('模板名称或标识过长');
 for(const m of t.modules)if(typeof m.id!=='string'||m.id.length>150||m.label!==undefined&&(typeof m.label!=='string'||m.label.length>500))throw Error('模块名称或标识无效');
 validateTemplate(t);return t;
}
function cleanPreset(value){
 if(typeof value.id!=='string'||!value.id||value.id.length>150||typeof value.name!=='string'||!value.name.trim()||value.name.length>60)throw Error('模块预设名称或标识无效');
 const t=cleanTemplate({...DEFAULT_TEMPLATE,width:2400,height:2400,modules:[value.module]});return {id:value.id,name:value.name,module:t.modules[0]};
}
const unique=list=>{const ids=new Set();for(const item of list){if(ids.has(item.id))throw Error('导入包中有重复标识');ids.add(item.id);}return list;};
export function parseConfig(text){
 if(text.length>2*1024*1024)throw Error('配置文件不能超过 2 MB');
 const data=JSON.parse(text,(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw Error('配置含不支持的属性');return value;});
 if(data?.format!=='tech-tree-companion-config'||data.version!==1)throw Error('请选择科技树配置包（版本 1）');
 const result={format:data.format,version:1};
 for(const [key,clean]of [['templates',cleanTemplate],['modulePresets',cleanPreset]])if(Object.hasOwn(data,key)){if(!Array.isArray(data[key])||data[key].length>200)throw Error('每类配置最多 200 项');result[key]=unique(data[key].map(clean));}
 if(Object.hasOwn(data,'radial')){if(!data.radial||typeof data.radial!=='object'||Array.isArray(data.radial)||!Array.isArray(data.radial.items)||data.radial.items.length>8)throw Error('轮盘配置无效');result.radial=radialConfig(data.radial);}
 return result;
}
export function exportConfig(data,selection){
 const packet={format:'tech-tree-companion-config',version:1};
 if(selection.templates)packet.templates=data.templates.map(cleanTemplate);
 if(selection.modulePresets)packet.modulePresets=(data.modulePresets??[]).map(cleanPreset);
 if(selection.radial)packet.radial=radialConfig(data.radial);
 return JSON.stringify(packet,null,2);
}
const nameKey=s=>s.normalize('NFKC').trim().toLocaleLowerCase();
export function configConflicts(existing,item){return existing.filter(e=>e.id===item.id||nameKey(e.name)===nameKey(item.name));}
export function planImport(data,packet,choices){
 const patch={},changes=[];
 for(const key of ['templates','modulePresets']){
  const actions=choices[key]??{},list=clone(data[key]??[]),replaced=new Set();
  for(const item of packet[key]??[]){const action=actions[item.id]??'skip';if(action==='skip')continue;if(!['keep','replace'].includes(action))throw Error('未知导入动作');const matches=configConflicts(list,item),next=clone(item);
   if(action==='replace'&&matches.length>1)throw Error('“'+item.name+'”同时匹配多个配置，请选择保留两份');
   if(matches.length&&action==='replace'){next.id=matches[0].id;if(replaced.has(next.id))throw Error('多个导入项同时替换“'+matches[0].name+'”，请改为保留两份或跳过');replaced.add(next.id);if(key==='templates')next.version=Math.max(next.version,matches[0].version+1);list.splice(list.findIndex(e=>e.id===next.id),1,next);}
   else{if(matches.length){next.id=uid();let n=1;do{next.name=item.name+' · 导入 '+n++;}while(list.some(e=>nameKey(e.name)===nameKey(next.name)));}list.push(next);}
   changes.push({key,name:next.name,action:matches.length&&action==='replace'?'替换':'新增'});
  }if(changes.some(c=>c.key===key))patch[key]=list;
 }
 if(choices.radial&&packet.radial){patch.radial=radialConfig(packet.radial);changes.push({key:'radial',name:'自定义轮盘',action:'替换'});}
 return {patch,changes};
}
export const configRevision=data=>JSON.stringify([data.templates,data.modulePresets,data.radial]);
