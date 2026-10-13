import {isCommandAction} from './radial-model.js';
const ownActions={create:'create-node',edit:'edit-node',details:'open-details',templates:'template-center'};
// Compare concrete operations, not display labels or generic command categories.
export function radialActionKey(item,pluginId){
 if(isCommandAction(item.action))return item.command?'command:'+item.command:null;
 if(item.action.startsWith('aux:'))return 'command:'+pluginId+':'+item.action.slice(4);
 if(ownActions[item.action])return 'command:'+pluginId+':'+ownActions[item.action];
 return item.action;
}
export function radialMatches(layers,item,pluginId){const key=radialActionKey(item,pluginId);if(!key)return [];return ['inner','outer'].flatMap(layer=>layers[layer].items.flatMap((entry,index)=>radialActionKey(entry,pluginId)===key?[{layer,index,item:entry}]:[]));}
export function addedDuplicate(before,after,pluginId){
 const count=state=>{const map=new Map();for(const item of [...state.inner,...state.outer]){const key=radialActionKey(item,pluginId);if(key)map.set(key,(map.get(key)??0)+1);}return map;},old=count(before),next=count(after);
 return [...after.inner,...after.outer].find(item=>{const key=radialActionKey(item,pluginId);return key&&next.get(key)>Math.max(1,old.get(key)??0);});
}
export const ownCommandItem=(item,pluginId)=>item.action==='plugin-command'||item.action==='command'&&item.command?.startsWith(pluginId+':');
