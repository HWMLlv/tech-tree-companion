export const RADIAL_ACTIONS=[
 ['create','新建节点','circle-plus'],['edit','编辑节点','pencil'],['details','节点详情','book-open'],['templates','模板中心','workflow'],
 ...[['selection','选择','mouse-pointer-2'],['rectangle','矩形','square'],['ellipse','椭圆','circle'],['diamond','菱形','diamond'],['arrow','箭头','move-up-right'],['line','直线','minus'],['freedraw','自由绘制','pencil-line'],['text','文字','type']].map(([id,label,icon])=>['tool:'+id,label,icon]),
 ['plugin-command','本插件命令','workflow'],['command','已安装命令','terminal']
];
// The library groups shapes; persisted/runtime actions remain concrete tools.
export const RADIAL_LIBRARY=RADIAL_ACTIONS.filter(([id])=>!['tool:ellipse','tool:diamond'].includes(id)).map(([id,label,icon])=>[id,id==='tool:rectangle'?'形状':label,icon]);
export function changeRadialAction(item,action){const old=RADIAL_ACTIONS.find(a=>a[0]===item.action),next=RADIAL_ACTIONS.find(a=>a[0]===action);if(!next)return;if(item.label===old?.[1])item.label=next[1];if(item.icon===old?.[2])item.icon=next[2];item.action=action;}
export const RADIAL_ICONS=[...new Set(RADIAL_ACTIONS.map(a=>a[2]))];
const bounded=(v,d,min,max)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Math.round(Number(v)))):d;
export function radialConfig(input={}){
 input=input&&typeof input==='object'?input:{};
 const defaults=['create','tool:selection','tool:arrow','templates'].map((action,i)=>({id:'wheel-'+i,action,label:RADIAL_ACTIONS.find(a=>a[0]===action)[1],icon:RADIAL_ACTIONS.find(a=>a[0]===action)[2]}));
 const items=(Array.isArray(input.items)?input.items:defaults).filter(v=>v&&typeof v==='object').slice(0,8).map((v,i)=>({id:'wheel-'+i,action:RADIAL_ACTIONS.some(a=>a[0]===v.action)?v.action:'command',label:String(v.label??'功能').slice(0,16),icon:RADIAL_ICONS.includes(v.icon)?v.icon:'terminal',command:String(v.command??'').slice(0,200)}));
 return {enabled:input.enabled!==false,trigger:['right','middle','alt-right','mouse','keyboard'].includes(input.trigger)?input.trigger:'right',binding:radialBinding(input.binding),delay:bounded(input.delay,350,100,3000),radius:bounded(input.radius,120,90,180),inner:bounded(input.inner,44,30,70),items};
}
export function wheelLayout(point,bounds,radius,inner){
 const r=Math.min(radius,(bounds.right-bounds.left-16)/2,(bounds.bottom-bounds.top-16)/2);
 if(r<75)return null;
 return {x:Math.max(bounds.left+r+8,Math.min(bounds.right-r-8,point.x)),y:Math.max(bounds.top+r+8,Math.min(bounds.bottom-r-8,point.y)),r,inner:Math.min(inner,r*.55)};
}
export function sectorAngles(index,count){const step=Math.PI*2/count,start=-Math.PI/2-step/2;return {start:start+index*step,end:start+(index+1)*step,middle:-Math.PI/2+index*step};}
export function wheelHit(point,layout,count){
 if(!layout||!count)return -1;const dx=point.x-layout.x,dy=point.y-layout.y,d=Math.hypot(dx,dy);if(d<=layout.inner||d>=layout.r)return -1;
 if(count===1)return 0;const step=2*Math.PI/count,start=-Math.PI/2-step/2,angle=((Math.atan2(dy,dx)-start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),local=angle%step;
 return d*Math.sin(Math.min(local,step-local))<1.5?-1:Math.min(count-1,Math.floor(angle/step));
}
export function sectorPath(index,count,r,inner){
 if(count===1)return `M 0,${-r} A ${r},${r} 0 1 1 0,${r} A ${r},${r} 0 1 1 0,${-r} Z M 0,${-inner} A ${inner},${inner} 0 1 0 0,${inner} A ${inner},${inner} 0 1 0 0,${-inner} Z`;
 const {start,end}=sectorAngles(index,count),outerGap=Math.asin(1.5/r),innerGap=Math.asin(1.5/inner),p=(radius,a)=>`${radius*Math.cos(a)},${radius*Math.sin(a)}`,large=end-start>Math.PI?1:0;
 return `M ${p(r,start+outerGap)} A ${r},${r} 0 ${large} 1 ${p(r,end-outerGap)} L ${p(inner,end-innerGap)} A ${inner},${inner} 0 ${large} 0 ${p(inner,start+innerGap)} Z`;
}
export function moveItem(items,from,to){const next=items.slice();if(from<0||to<0||from>=next.length||to>=next.length)return next;next.splice(to,0,next.splice(from,1)[0]);return next;}

export function radialBinding(value={}){value=value??{};return {button:[1,2,3,4].includes(value.button)?value.button:2,code:/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-2])|Space|Backquote|BracketLeft|BracketRight)$/.test(value.code??'')?value.code:'KeyQ',ctrl:!!value.ctrl,alt:!!value.alt,shift:!!value.shift,meta:!!value.meta};}
export function bindingMatches(e,b,keyboard=false){return (keyboard?e.code===b.code:e.button===b.button)&&!!e.ctrlKey===b.ctrl&&!!e.altKey===b.alt&&!!e.shiftKey===b.shift&&!!e.metaKey===b.meta;}
export function bindingLabel(c){const b=c.binding,mods=[b.ctrl?'Ctrl':null,b.alt?'Alt':null,b.shift?'Shift':null,b.meta?'Meta':null].filter(Boolean);return [...mods,c.trigger==='keyboard'?b.code.replace('Key','').replace('Digit',''):({1:'中键',2:'右键',3:'侧键 1',4:'侧键 2'})[b.button]].join('＋');}

export const isCommandAction=action=>action==='command'||action==='plugin-command';
export function radialCommands(commands,pluginId,own=false){return commands.filter(c=>!own||c.id.startsWith(pluginId+':')).slice().sort((a,b)=>a.name.localeCompare(b.name));}
