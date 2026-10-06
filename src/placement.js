export function bounds(e){const a=e.angle??0,w=Math.abs(e.width*Math.cos(a))+Math.abs(e.height*Math.sin(a)),h=Math.abs(e.width*Math.sin(a))+Math.abs(e.height*Math.cos(a));return {x:e.x+e.width/2-w/2,y:e.y+e.height/2-h/2,width:w,height:h};}
const overlap=(a,b,gap=24)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
export function nextPlacement(source,direction,elements,start=0){
 const s=bounds(source),w=source.width,h=source.height,horizontal=['left','right'].includes(direction),step=(horizontal?h:w)+80;
 const base={right:{x:s.x+s.width+80,y:source.y},left:{x:s.x-w-80,y:source.y},down:{x:source.x,y:s.y+s.height+80},up:{x:source.x,y:s.y-h-80}}[direction];
 const obstacles=elements.filter(e=>!e.isDeleted&&!['arrow','line','freedraw','selection'].includes(e.type)&&!e.containerId&&e.type!=='frame').map(bounds);
 for(let slot=start;slot<start+1000;slot++){const offset=slot===0?0:Math.ceil(slot/2)*(slot%2?1:-1)*step,candidate={x:base.x+(horizontal?0:offset),y:base.y+(horizontal?offset:0),width:w,height:h};if(!obstacles.some(b=>overlap(candidate,b)))return {x:candidate.x,y:candidate.y,slot};}
 throw Error('附近没有可用位置，请先移动或缩小画布节点');
}
