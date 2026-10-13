import {tr} from './i18n.js';
import {isTech,moduleText} from './model.js';
export const normalizeSearch=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().trim();
export function nodeEntries(elements){
 return elements.filter(e=>!e.isDeleted&&isTech(e)).map(e=>{
  const data=e.customData.techTree,modules=data.template?.modules??[],values=data.values??{};
  const title=moduleText(modules.find(m=>m.type==='title')??{type:'title',field:'title'},values);
  const content=modules.map(m=>moduleText(m,values)).filter(Boolean).join(' · ');
  return {id:e.id,title,content,link:e.link??'',template:data.template?.name??tr('未命名模板'),templateId:data.templateId,locked:!!e.locked};
 });
}
export function searchNodes(entries,query,templateId=''){
 const words=normalizeSearch(query).split(/\s+/).filter(Boolean);
 return entries.filter(e=>(!templateId||e.templateId===templateId)&&words.every(word=>normalizeSearch([e.title,e.content,e.link,e.template].join(' ')).includes(word)))
 .sort((a,b)=>Number(normalizeSearch(b.title)===normalizeSearch(query))-Number(normalizeSearch(a.title)===normalizeSearch(query))||a.title.localeCompare(b.title,'zh-CN'));
}
export function elementBounds(e){
 const angle=e.angle??0,cx=e.x+e.width/2,cy=e.y+e.height/2;
 const w=Math.abs(e.width*Math.cos(angle))+Math.abs(e.height*Math.sin(angle)),h=Math.abs(e.width*Math.sin(angle))+Math.abs(e.height*Math.cos(angle));
 return {x:cx-w/2,y:cy-h/2,width:w,height:h};
}
export function sceneBounds(elements){
 let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
 for(const e of elements){if(e.isDeleted||![e.x,e.y,e.width,e.height].every(Number.isFinite))continue;const b=elementBounds(e);x=Math.min(x,b.x);y=Math.min(y,b.y);right=Math.max(right,b.x+b.width);bottom=Math.max(bottom,b.y+b.height);}
 if(x===Infinity)return {x:-200,y:-150,width:400,height:300};
 return {x:x-24,y:y-24,width:Math.max(48,right-x+48),height:Math.max(48,bottom-y+48)};
}
export function fitMap(bounds,width,height){const scale=Math.min((width-16)/bounds.width,(height-16)/bounds.height);return {scale,x:(width-bounds.width*scale)/2-bounds.x*scale,y:(height-bounds.height*scale)/2-bounds.y*scale};}
export function viewport(state){const zoom=state.zoom.value;return {x:-state.scrollX,y:-state.scrollY,width:state.width/zoom,height:state.height/zoom};}
export function focusState(element,state){const b=elementBounds(element),zoom=Math.min(state.zoom.value,Math.max(.1,Math.min((state.width-80)/Math.max(1,b.width),(state.height-80)/Math.max(1,b.height))));return {scrollX:state.width/(2*zoom)-b.x-b.width/2,scrollY:state.height/(2*zoom)-b.y-b.height/2,zoom:{value:zoom}};}

// Copy primitive geometry into the cache key: the host may mutate element objects in place.
export const mapGeometryKey=elements=>JSON.stringify(elements.map(e=>[e.id,e.type,e.isDeleted,e.x,e.y,e.width,e.height,e.angle,e.points,!!e.customData?.techTree]));
