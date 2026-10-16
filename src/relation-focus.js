import {elementPoints} from './navigation-model.js';
import {cardShape} from './card-shape.js';
export const focusPixelRatio=(width,height,ratio=1)=>Math.min(Math.max(1,ratio),2,Math.sqrt(8000000/Math.max(1,width*height)));

function nodePath(ctx,e,pad){
 const w=e.width+pad*2,h=e.height+pad*2,shape=e.customData?.techTree?cardShape(e.customData.techTree.template):e.type;
 ctx.translate(e.x+e.width/2,e.y+e.height/2);ctx.rotate(e.angle??0);ctx.beginPath();
 if(shape==='ellipse')ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
 else if(shape==='diamond'){ctx.moveTo(0,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(0,h/2);ctx.lineTo(-w/2,0);ctx.closePath();}
 else ctx.roundRect(-w/2,-h/2,w,h,Math.min(pad,Math.min(w,h)/2));
}
// Clear windows in a separate canvas. Native element colors, geometry and undo
// history remain untouched, and native toolbars stay above this drawing layer.
export function paintRelationFocus(ctx,elements,focus,state,theme){
 const zoom=state.zoom.value,pad=8/zoom;ctx.save();ctx.globalAlpha=.82;ctx.fillStyle=theme.background;ctx.fillRect(0,0,state.width,state.height);ctx.restore();
 ctx.save();ctx.scale(zoom,zoom);ctx.translate(state.scrollX,state.scrollY);ctx.globalCompositeOperation='destination-out';
 for(const e of elements){
  if(e.isDeleted||!focus.visible.has(e.id))continue;
  ctx.save();
  if(focus.arrows.has(e.id)){
   const points=elementPoints(e);ctx.beginPath();points.forEach(({x,y},i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=Math.max((e.strokeWidth??1)+pad*2,16/zoom);ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
   for(const point of [points[0],points.at(-1)])if(point){ctx.beginPath();ctx.arc(point.x,point.y,12/zoom,0,Math.PI*2);ctx.fill();}
  }else if([e.x,e.y,e.width,e.height].every(Number.isFinite)){nodePath(ctx,e,pad);ctx.fill();}
  ctx.restore();
 }
 ctx.globalCompositeOperation='source-over';
 for(const e of elements){
  if(e.isDeleted||e.id!==focus.id&&!focus.before.has(e.id)&&!focus.after.has(e.id))continue;
  ctx.save();nodePath(ctx,e,pad/2);ctx.strokeStyle=e.id===focus.id?theme.accent:focus.before.has(e.id)?theme.before:theme.after;ctx.lineWidth=(e.id===focus.id?3:2)/zoom;ctx.stroke();ctx.restore();
 }
 ctx.restore();
}
