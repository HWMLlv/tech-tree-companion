import {radialConfig,AUXILIARY_ACTIONS} from './radial-model.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export class RadialDraft{
 constructor(input,pluginId){
  const config=radialConfig(input);this.pluginId=pluginId;this.config=config;
  this.layers={inner:{...copy(config),items:copy(config.items)},outer:{...copy(config),items:config.auxiliaryItems.map((i,n)=>({id:'outer-'+n,action:'aux:'+i.id,label:i.label,icon:i.icon,command:''}))}};
  this.history={inner:[],outer:[]};this.future={inner:[],outer:[]};this.base=this.snapshot();
 }
 snapshot(){return copy({inner:this.layers.inner.items,outer:this.layers.outer.items});}
 dirty(){return !equal(this.base,this.snapshot());}
 record(layer,before){const after=this.snapshot(),keys=['inner','outer'].filter(k=>!equal(before[k],after[k]));if(!keys.length)return;
  const entry={before,after,keys};for(const k of keys){this.history[k].push(entry);if(this.history[k].length>40)this.history[k].shift();this.future[k]=[];}
 }
 undo(layer,redo=false){const from=redo?this.future:this.history,to=redo?this.history:this.future,entry=from[layer].at(-1);if(!entry)return false;
  const expected=redo?entry.before:entry.after,target=redo?entry.after:entry.before;
  if(entry.keys.some(k=>from[k].at(-1)!==entry||!equal(this.layers[k].items,expected[k])))throw Error('请先撤销另一环中后续的修改，再撤销跨环移动');
  for(const k of entry.keys){this.layers[k].items=copy(target[k]);from[k].pop();to[k].push(entry);}return true;
 }
 transfer(layer,index){const other=layer==='inner'?'outer':'inner',source=this.layers[layer].items,dest=this.layers[other].items,item=source[index];if(!item)throw Error('请先选择功能');if(dest.length>=8)throw Error('目标轮盘已满，单层最多 8 个功能');let next;
  if(layer==='inner'){
   const id=item.action==='templates'?'template-center':item.action==='plugin-command'&&item.command.startsWith(this.pluginId+':')?item.command.slice(this.pluginId.length+1):null;
   if(!AUXILIARY_ACTIONS.some(a=>a[0]===id))throw Error('此功能属于内环，外环仅接收管理与导航功能');
   next={...item,action:'aux:'+id,command:''};
  }else{const id=item.action.slice(4);next={...item,action:id==='template-center'?'templates':'plugin-command',command:id==='template-center'?'':this.pluginId+':'+id};}
  if(dest.some(i=>i.action===next.action&&(i.command??'')===next.command))throw Error('目标轮盘已包含该功能');
  const before=this.snapshot();source.splice(index,1);dest.push(next);this.record(layer,before);return other;
 }
 output(){return {items:copy(this.layers.inner.items),auxiliaryItems:this.layers.outer.items.map(i=>({id:i.action.slice(4),label:i.label,icon:i.icon}))};}
}
