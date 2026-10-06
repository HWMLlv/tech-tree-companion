// Store presentation only. Element IDs, bindings and route coordinates must
// never become defaults for a different pair of nodes.
export const DEFAULT_CONNECTION_STYLE={elbowed:true,strokeColor:'#334155',strokeWidth:1,strokeStyle:'solid',roughness:0,opacity:100,roundness:{type:2},startArrowhead:null,endArrowhead:'arrow'};
export const ARROWHEADS=[null,'arrow','bar','dot','circle','circle_outline','triangle','triangle_outline','diamond','diamond_outline','crowfoot_one','crowfoot_many','crowfoot_one_or_many'];
export const validStrokeColor=s=>typeof s==='string'&&/^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|transparent)$/i.test(s);
const number=(v,min,max,fallback)=>Number.isFinite(v)&&v>=min&&v<=max?v:fallback;
export function connectionStyle(source={}){
 source=source??{};
 const d=DEFAULT_CONNECTION_STYLE,r=source.roundness;
 return {elbowed:typeof source.elbowed==='boolean'?source.elbowed:d.elbowed,
  strokeColor:validStrokeColor(source.strokeColor)?source.strokeColor:d.strokeColor,
  strokeWidth:number(source.strokeWidth,.1,20,d.strokeWidth),strokeStyle:['solid','dashed','dotted'].includes(source.strokeStyle)?source.strokeStyle:d.strokeStyle,
  roughness:number(source.roughness,0,3,d.roughness),opacity:number(source.opacity,0,100,d.opacity),
  roundness:r===null?null:r&&[1,2,3].includes(r.type)?{type:r.type,...(Number.isFinite(r.value)?{value:r.value}:{})}:{...d.roundness},
  startArrowhead:ARROWHEADS.includes(source.startArrowhead)?source.startArrowhead:d.startArrowhead,endArrowhead:ARROWHEADS.includes(source.endArrowhead)?source.endArrowhead:d.endArrowhead};
}
export function arrowEndpoints(e){
 const xs=e.points.map(p=>p[0]),ys=e.points.map(p=>p[1]);
 const center={x:e.x+(Math.min(...xs)+Math.max(...xs))/2,y:e.y+(Math.min(...ys)+Math.max(...ys))/2},a=e.angle??0;
 return [e.points[0],e.points.at(-1)].map(([x,y])=>{const dx=e.x+x-center.x,dy=e.y+y-center.y;return [center.x+dx*Math.cos(a)-dy*Math.sin(a),center.y+dx*Math.sin(a)+dy*Math.cos(a)];});
}
export function bindAtSide(arrow,key,node,side,along=.5){
 const gap=5+(arrow.strokeWidth??1)/2,xGap=gap/node.width,yGap=gap/node.height;
 const fixedPoint={left:[-xGap,along],right:[1+xGap,along],top:[along,-yGap],bottom:[along,1+yGap]}[side];
 arrow[key]={...arrow[key],elementId:node.id,mode:'orbit',fixedPoint};
}
function convertBindings(e,elements,endpoints){
 for(const [i,key]of ['startBinding','endBinding'].entries()){
  const node=elements?.get(e[key]?.elementId);if(!node||!node.width||!node.height)continue;
  const [x,y]=endpoints[i],dx=x-node.x-node.width/2,dy=y-node.y-node.height/2,a=-(node.angle??0),localX=dx*Math.cos(a)-dy*Math.sin(a)+node.width/2,localY=dx*Math.sin(a)+dy*Math.cos(a)+node.height/2;
  const side=[['left',Math.abs(localX)],['right',Math.abs(localX-node.width)],['top',Math.abs(localY)],['bottom',Math.abs(localY-node.height)]].sort((a,b)=>a[1]-b[1])[0][0];
  bindAtSide(e,key,node,side,Math.max(.001,Math.min(.999,['left','right'].includes(side)?localY/node.height:localX/node.width)));
 }
}
export function applyConnectionStyle(e,style,elements){
 const next=connectionStyle(style),changedType=!!e.elbowed!==next.elbowed;
 if(changedType){
  e.strokeWidth=next.strokeWidth;
  const [start,end]=arrowEndpoints(e);if(next.elbowed)convertBindings(e,elements,[start,end]);e.x=start[0];e.y=start[1];e.angle=0;e.points=[[0,0],[end[0]-start[0],end[1]-start[1]]];e.width=Math.abs(e.points[1][0]);e.height=Math.abs(e.points[1][1]);
  e.fixedSegments=null;e.startIsSpecial=null;e.endIsSpecial=null;
 }
 Object.assign(e,next);return e;
}
