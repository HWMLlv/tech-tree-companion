import {elementTitle} from './navigation-model.js';
export const isRelationNode=e=>e&&!e.isDeleted&&['image','rectangle','ellipse','diamond','embeddable','frame'].includes(e.type);
export function arrowDirections(arrow){
 if(arrow.isDeleted||arrow.type!=='arrow')return [];
 const start=arrow.startBinding?.elementId,end=arrow.endBinding?.elementId;if(!start||!end||start===end)return [];
 const directions=[],directed=head=>['arrow','triangle','triangle_outline'].includes(head);
 if(directed(arrow.endArrowhead))directions.push([start,end]);if(directed(arrow.startArrowhead))directions.push([end,start]);return directions;
}
export function directRelations(elements,id){
 const live=new Map(elements.filter(e=>!e.isDeleted).map(e=>[e.id,e]));
 const before=new Map(),after=new Map();
 if(!isRelationNode(live.get(id)))return {before:[],after:[]};
 const entry=e=>({id:e.id,title:elementTitle(e,live)});
 const edge=(from,to)=>{if(!isRelationNode(live.get(from))||!isRelationNode(live.get(to)))return;if(to===id)before.set(from,entry(live.get(from)));if(from===id)after.set(to,entry(live.get(to)));};
 for(const arrow of live.values())for(const [from,to]of arrowDirections(arrow))edge(from,to);
 const sorted=map=>[...map.values()].sort((a,b)=>a.title.localeCompare(b.title));
 return {before:sorted(before),after:sorted(after)};
}
export function relationFocus(elements,id){
 const nodes=new Map(elements.filter(isRelationNode).map(e=>[e.id,e]));if(!nodes.has(id))return null;
 const relations=directRelations(elements,id),before=new Set(relations.before.map(e=>e.id)),after=new Set(relations.after.map(e=>e.id)),visible=new Set([id,...before,...after]),arrows=new Set();
 for(const e of elements)if(arrowDirections(e).some(([from,to])=>nodes.has(from)&&nodes.has(to)&&(from===id||to===id))){arrows.add(e.id);visible.add(e.id);}
 for(const e of elements)if(visible.has(e.id))for(const bound of e.boundElements??[])if(bound.type==='text')visible.add(bound.id);
 return {id,before,after,visible,arrows};
}
