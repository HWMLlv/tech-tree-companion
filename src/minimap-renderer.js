import {elementBounds,elementPoints} from './navigation-model.js';
import {isTech} from './model.js';
import {cardShape,containsShapePoint} from './card-shape.js';
const color=(value,fallback)=>/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value??'')?value:fallback;
const geometryFields=['id','type','isDeleted','x','y','width','height','angle','strokeColor','backgroundColor','opacity','startArrowhead','endArrowhead'];
export class MinimapGeometry{
 constructor(){this.items=[];this.revision=0;}
 update(elements){
  let changed=this.items.length!==elements.length;
  for(let i=0;i<elements.length;i++){
   const e=elements[i],old=this.items[i],t=isTech(e)?e.customData.techTree.template:null,points=e.points;
   const same=old&&geometryFields.every(key=>old[key]===e[key])&&old.shape===t?.shape&&old.fill===t?.background&&old.border===t?.border&&old.alpha===t?.appearance?.opacity&&old.tech===!!t&&old.points?.length===points?.length&&(!points||points.every((p,j)=>p.length===old.points[j].length&&p.every((value,k)=>value===old.points[j][k])));
   if(same)continue;
   const next={};for(const key of geometryFields)next[key]=e[key];
   Object.assign(next,{shape:t?.shape,fill:t?.background,border:t?.border,alpha:t?.appearance?.opacity,tech:!!t,points:points?.map(p=>[...p])});
   this.items[i]=next;changed=true;
  }
  this.items.length=elements.length;if(changed)this.revision++;return this.revision;
 }
}
export function paintMapElement(ctx,e,theme,scale,highlight=false){
 if(e.isDeleted||![e.x,e.y,e.width,e.height].every(Number.isFinite))return;
 const template=isTech(e)?e.customData.techTree.template:null,style=template?.appearance??{};
 ctx.save();ctx.globalAlpha=Math.max(.4,(template?style.opacity??100:e.opacity??100)/100);
 ctx.strokeStyle=highlight?theme.accent:color(template?.border??e.strokeColor,theme.stroke);
 ctx.fillStyle=color(template?.background??e.backgroundColor,theme.fill);
 ctx.lineWidth=(highlight?2:1)/scale;
 if(['arrow','line','freedraw'].includes(e.type)){
  const points=elementPoints(e);ctx.beginPath();points.forEach(({x,y},i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  if(e.type==='arrow'&&points.length>1){
   const head=(tip,near)=>{const angle=Math.atan2(tip.y-near.y,tip.x-near.x),size=3/scale;ctx.beginPath();ctx.moveTo(tip.x-size*Math.cos(angle-.5),tip.y-size*Math.sin(angle-.5));ctx.lineTo(tip.x,tip.y);ctx.lineTo(tip.x-size*Math.cos(angle+.5),tip.y-size*Math.sin(angle+.5));ctx.stroke();};
   if(e.endArrowhead)head(points.at(-1),points.at(-2));if(e.startArrowhead)head(points[0],points[1]);
  }
 }else{
  const shape=template?cardShape(template):e.type,w=Math.max(e.width,2/scale),h=Math.max(e.height,2/scale);
  ctx.translate(e.x+e.width/2,e.y+e.height/2);ctx.rotate(e.angle??0);ctx.beginPath();
  if(shape==='ellipse')ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
  else if(shape==='diamond'){ctx.moveTo(0,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(0,h/2);ctx.lineTo(-w/2,0);ctx.closePath();}
  else ctx.rect(-w/2,-h/2,w,h);
  const background=template?.background??e.backgroundColor,filled=background&&background!=='transparent';
  if(filled||!template&&['image','text','embeddable'].includes(e.type))ctx.fill();
  ctx.stroke();
 }
 ctx.restore();
}
export function mapElementAt(elements,point,tolerance=0){
 return [...elements].reverse().find(e=>{if(e.isDeleted||['arrow','line','freedraw'].includes(e.type))return false;const b=elementBounds(e);if(point.x<b.x-tolerance||point.x>b.x+b.width+tolerance||point.y<b.y-tolerance||point.y>b.y+b.height+tolerance)return false;const dx=point.x-e.x-e.width/2,dy=point.y-e.y-e.height/2,a=-(e.angle??0),x=dx*Math.cos(a)-dy*Math.sin(a)+e.width/2,y=dx*Math.sin(a)+dy*Math.cos(a)+e.height/2;return containsShapePoint(isTech(e)?cardShape(e.customData.techTree.template):e.type,x,y,e.width,e.height);});
}
