// Geometry and snapping are independent of DOM rendering and saved templates.
export const boundIndex=(value,count)=>Math.max(0,Math.min(Math.max(0,count-1),value));
export const wrapIndex=(value,count)=>count>0?((value%count)+count)%count:0;
export const nearestSlot=(index,position,count)=>count>1?wrapIndex(index,count)+Math.round((position-wrapIndex(index,count))/count)*count:0;
export const visibleSlots=(count,slots)=>count<2?count:Math.min(slots,count%2?count:count+1);
export function loopWindow(position,count,slots){
 if(count<2)return count?[0]:[];
 // Two overscan cards enter outside the clip, rather than appearing mid-stack.
 const size=visibleSlots(count,slots)+2,start=Math.floor(position)-Math.floor(size/2);
 return Array.from({length:size},(_,i)=>start+i);
}
export function deckGeometry(width){
 const slots=width>=1000?9:width>=680?7:width>=480?5:3;
 const cardWidth=Math.min(280,Math.max(140,width*.38));
 return {slots,cardWidth,step:Math.max(44,(width-cardWidth*.65)/(slots-1))};
}
export function deckPose(index,position,step,reduced=false,cardWidth=280){
 const delta=index-position,distance=Math.abs(delta);
 // Open a small gap between the two front cards before their depth ordering
 // crosses. Solid paper faces stay visible; no cross-fade or layer pop is needed.
 const opening=reduced||distance>=1?0:Math.max(0,cardWidth*.55-step/2)*Math.sin(Math.PI*distance)**2;
 return {x:delta*step+Math.sign(delta)*opening,y:reduced?0:Math.min(68,distance*16)+opening*.12,scale:Math.max(.58,1-distance*.09),angle:reduced?0:Math.max(-12,Math.min(12,-delta*3)),roll:reduced?0:Math.max(-22,Math.min(22,delta*6)),depth:-distance*40,focus:Math.max(0,1-distance*1.8)};
}
export function deckWindow(position,count,slots){
 const size=Math.min(count,slots),start=Math.max(0,Math.min(count-size,Math.round(position)-Math.floor(size/2)));
 return Array.from({length:size},(_,i)=>start+i);
}
export function dragPosition(start,dx,step,count){
 return count>1?start-dx/step:0;
}
export function snapIndex(position,velocity,step,count){
 // A short flick may advance a card; a long drag may traverse several cards.
 const travel=Math.max(-1.2,Math.min(1.2,-velocity*150/step));
 return count>1?Math.round(position+travel):0;
}
export function filterTemplates(templates,query){
 const needle=String(query??'').trim().toLocaleLowerCase();
 return templates.filter(t=>t.name.toLocaleLowerCase().includes(needle));
}
export async function setCardPickerMode(plugin,value){
 const before=plugin.data.cardTemplatePicker;
 plugin.data.cardTemplatePicker=!!value;
 try{await plugin.persist();}catch(error){if(before===undefined)delete plugin.data.cardTemplatePicker;else plugin.data.cardTemplatePicker=before;throw error;}
}
