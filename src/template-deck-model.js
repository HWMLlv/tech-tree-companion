// Geometry and snapping are independent of DOM rendering and saved templates.
export const boundIndex=(value,count)=>Math.max(0,Math.min(Math.max(0,count-1),value));
export function deckGeometry(width){
 const slots=width>=1000?9:width>=680?7:width>=480?5:3;
 const cardWidth=Math.min(280,Math.max(140,width*.38));
 return {slots,cardWidth,step:Math.max(44,(width-cardWidth*.65)/(slots-1))};
}
export function deckPose(index,position,step,reduced=false){
 const delta=index-position,distance=Math.abs(delta);
 return {x:delta*step,y:reduced?0:Math.min(32,distance*9),scale:Math.max(.55,1-distance*.105),angle:reduced?0:Math.max(-12,Math.min(12,delta*3)),z:100-Math.round(distance*10)};
}
export function deckWindow(position,count,slots){
 const size=Math.min(count,slots),start=Math.max(0,Math.min(count-size,Math.round(position)-Math.floor(size/2)));
 return Array.from({length:size},(_,i)=>start+i);
}
export function dragPosition(start,dx,step,count){
 const raw=start-dx/step,edge=boundIndex(raw,count);
 return edge+(raw-edge)*.18;
}
export function snapIndex(position,velocity,step,count){
 // A short flick may advance a card; a long drag may traverse several cards.
 const travel=Math.max(-1.2,Math.min(1.2,-velocity*150/step));
 return boundIndex(Math.round(position+travel),count);
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
