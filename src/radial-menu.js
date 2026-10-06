import {setIcon} from 'obsidian';
import {radialConfig,isCommandAction,bindingMatches,wheelLayout,wheelHit,sectorAngles,sectorPath} from './radial-model.js';
export function drawWheel(root,items,{r=120,inner=44,disabled=()=>false}={}){
 root.classList.add('tt-wheel');root.style.width=root.style.height=2*r+'px';
 const doc=root.ownerDocument,svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`${-r} ${-r} ${2*r} ${2*r}`);root.append(svg);
 return items.map((item,i)=>{const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',sectorPath(i,items.length,r,inner));path.dataset.index=String(i);svg.append(path);
  const label=doc.createElement('span');label.className='tt-wheel-label';label.dataset.index=String(i);const angle=sectorAngles(i,items.length).middle,d=(r+inner)/2;label.style.width=(items.length>4?Math.max(42,Math.min(80,(r+inner)*Math.sin(Math.PI/items.length)*.9)):80)+'px';label.style.left=r+Math.cos(angle)*d+'px';label.style.top=r+Math.sin(angle)*d+'px';const icon=doc.createElement('span');setIcon(icon,item.icon);label.append(icon);const text=doc.createElement('span');text.textContent=item.label;label.append(text);root.append(label);
  if(disabled(item)){path.classList.add('is-disabled');label.classList.add('is-disabled');}return {path,label};
 });
}
function available(p,v,item){
 if(p.modal||p.busy.has(v)||!p.live(v))return false;
 if(item.action==='edit'||item.action==='details')return !!p.selected(v);
 if(isCommandAction(item.action)){if(item.action==='plugin-command'&&!item.command.startsWith(p.manifest.id+':'))return false;const c=p.app.commands.commands[item.command];if(!c)return false;try{return c.checkCallback?c.checkCallback(true)!==false:c.editorCheckCallback?false:true;}catch{return false;}}
 return true;
}
export class RadialMenu{
 constructor(plugin,view,owner){this.p=plugin;this.v=view;this.doc=view.containerEl.ownerDocument;this.win=this.doc.defaultView;this.consumeUntil=0;
  const listen=(el,type,fn)=>owner.registerDomEvent(el,type,fn,true);
  listen(this.doc,'pointerdown',e=>this.down(e));listen(this.doc,'pointermove',e=>this.move(e));listen(this.doc,'pointerup',e=>this.up(e));listen(this.doc,'pointercancel',()=>this.cancel());
  listen(this.doc,'contextmenu',e=>{if(Date.now()<this.consumeUntil&&view.containerEl.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();this.consumeUntil=0;}});
  listen(this.doc,'keydown',e=>this.keyDown(e));listen(this.doc,'keyup',e=>this.keyUp(e));
  listen(this.doc,'auxclick',e=>{if(e.button>=3&&Date.now()<this.sideUntil&&view.containerEl.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}});
  listen(this.win,'blur',e=>{if(e.target===this.win)this.cancel();});listen(this.win,'resize',()=>this.cancel());listen(this.doc,'wheel',()=>this.cancel());owner.register(()=>this.cancel());
 }
 valid(){const g=this.gesture;return g&&this.p.view()===this.v&&this.p.live(this.v)&&this.v.file===g.target.file&&this.v.excalidrawAPI===g.target.api&&!this.p.modal;}
 down(e){
  this.cancel();this.consumeUntil=0;const p=this.p,v=this.v,c=radialConfig(p.data.radial);
  if(!c.enabled||!c.items.length||p.view()!==v||p.modal||p.busy.has(v)||!v.containerEl.contains(e.target)||e.target.tagName?.toLowerCase()!=='canvas')return;
  if(c.trigger==='keyboard')return;
  if(c.trigger==='mouse'?!bindingMatches(e,c.binding):e.button!==(c.trigger==='middle'?1:2)||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey!==(c.trigger==='alt-right'))return;
  if(e.button>=3){e.preventDefault();e.stopImmediatePropagation();this.sideUntil=Infinity;}
  const s=v.excalidrawAPI.getAppState();if(s.editingTextElement||s.editingLinearElement)return;
  const point={x:e.clientX,y:e.clientY};this.begin(point,c,{pointerId:e.pointerId,button:e.button});
 }
 begin(point,c,extra={}){const p=this.p,v=this.v,s=v.excalidrawAPI.getAppState();this.gesture={point,last:point,...extra,config:c,target:p.target(v,p.selected(v)?[p.selected(v)]:[]),scene:{x:(point.x-s.offsetLeft)/s.zoom.value-s.scrollX,y:(point.y-s.offsetTop)/s.zoom.value-s.scrollY},selected:-1};
  this.timer=this.win.setTimeout(()=>{if(this.valid())this.open();else this.cancel();},c.delay);
 }
 bounds(){const canvas=this.v.containerEl.querySelector('canvas'),b=canvas.getBoundingClientRect();const result={left:Math.max(0,b.left),top:Math.max(0,b.top),right:Math.min(this.win.innerWidth,b.right),bottom:Math.min(this.win.innerHeight,b.bottom)};
  for(const el of this.v.containerEl.querySelectorAll('.App-menu_top__left,.sidebar')){const r=el.getBoundingClientRect();if(r.width>30&&r.height>100){if(r.left<=result.left+40)result.left=Math.max(result.left,r.right+8);else if(r.right>=result.right-40)result.right=Math.min(result.right,r.left-8);}}return result;
 }
 open(){const g=this.gesture;g.layout=wheelLayout(g.point,this.bounds(),g.config.radius,g.config.inner);if(!g.layout){this.cancel();return;}g.node=this.p.selected(this.v);g.target=this.p.target(this.v,g.node?[g.node]:[]);this.consumeUntil=Infinity;
  const root=this.doc.createElement('div');root.className='tt-wheel-runtime';root.setAttribute('role','status');root.setAttribute('aria-label','快捷轮盘，移动选择，中心取消');this.doc.body.append(root);this.root=root;Object.assign(root.style,{left:g.layout.x-g.layout.r+'px',top:g.layout.y-g.layout.r+'px'});
  g.cells=drawWheel(root,g.config.items,{r:g.layout.r,inner:g.layout.inner,disabled:item=>!available(this.p,this.v,item)});
 }
 move(e){this.cursor=this.v.containerEl.contains(e.target)&&e.target.tagName?.toLowerCase()==='canvas'?{x:e.clientX,y:e.clientY}:null;const g=this.gesture;if(!g||(!g.keyboard&&g.pointerId!==e.pointerId))return;if(!this.valid()){this.cancel();return;}
  const point={x:e.clientX,y:e.clientY};if(!this.root){if(!g.keyboard&&Math.hypot(point.x-g.point.x,point.y-g.point.y)>8)this.cancel();return;}
  e.preventDefault();e.stopImmediatePropagation();g.last=point;
  if(Math.hypot(point.x-g.point.x,point.y-g.point.y)<6&&!g.armed)return;g.armed=true;const index=wheelHit(point,g.layout,g.config.items.length);g.selected=index>=0&&available(this.p,this.v,g.config.items[index])?index:-1;
  g.cells.forEach((cell,i)=>{cell.path.classList.toggle('is-active',i===g.selected);cell.label.classList.toggle('is-active',i===g.selected);});
 }
 up(e){const g=this.gesture;if(!g||g.keyboard||g.pointerId!==e.pointerId||e.button!==g.button)return;if(e.button>=3){e.preventDefault();e.stopImmediatePropagation();this.sideUntil=Date.now()+1000;}
  const open=!!this.root,index=g.armed?wheelHit({x:e.clientX,y:e.clientY},g.layout,g.config.items.length):-1,item=open&&index>=0?g.config.items[index]:null,valid=this.valid();this.cancel();if(!open)return;this.consumeUntil=Date.now()+1000;
  // Native pointerup must finish its own gesture. Dispatch only after its cleanup.
  if(valid&&item&&available(this.p,this.v,item))this.win.setTimeout(()=>this.execute(item,g).catch(err=>this.p.error(err)),0);
 }
 keyDown(e){
  const g=this.gesture;
  if(g&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.cancel();return;}
  if(g?.keyboard){
   if(e.code===g.code){e.preventDefault();e.stopImmediatePropagation();return;}
   if(!this.root)return;const count=g.config.items.length;let index=null;
   if(/^Arrow(Up|Right|Down|Left)$/.test(e.key))index=Math.round(({ArrowUp:0,ArrowRight:.25,ArrowDown:.5,ArrowLeft:.75})[e.key]*count)%count;
   else if(e.key==='Tab')index=(g.selected+(e.shiftKey?-1:1)+count)%count;
   else if(/^[1-8]$/.test(e.key))index=Number(e.key)-1;
   if(index!==null){e.preventDefault();e.stopImmediatePropagation();g.armed=true;g.selected=index<count&&available(this.p,this.v,g.config.items[index])?index:-1;g.cells.forEach((cell,i)=>{cell.path.classList.toggle('is-active',i===g.selected);cell.label.classList.toggle('is-active',i===g.selected);});}return;
  }
  if(this.heldCode===e.code){e.preventDefault();e.stopImmediatePropagation();return;}
  const c=radialConfig(this.p.data.radial),v=this.v,s=v.excalidrawAPI.getAppState();
  if(c.trigger!=='keyboard'||!c.enabled||!c.items.length||e.repeat||e.isComposing||this.p.view()!==v||this.p.modal||this.p.busy.has(v)||s.editingTextElement||s.editingLinearElement||e.target.closest?.('input,textarea,select,[contenteditable="true"],.cm-editor'))return;
  if(e.target!==this.doc.body&&!v.containerEl.contains(e.target))return;
  if(!bindingMatches(e,c.binding,true))return;e.preventDefault();e.stopImmediatePropagation();this.heldCode=e.code;
  const b=this.bounds(),point=this.cursor??{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};this.begin(point,c,{keyboard:true,code:e.code});
 }
 keyUp(e){
  if(e.code!==this.heldCode)return;e.preventDefault();e.stopImmediatePropagation();this.heldCode=null;
  const g=this.gesture;if(!g?.keyboard)return;const item=this.root&&g.armed&&g.selected>=0?g.config.items[g.selected]:null,valid=this.valid();this.cancel();
  if(item&&valid)this.win.setTimeout(()=>this.execute(item,g).catch(err=>this.p.error(err)),0);
 }
 async execute(item,g){const p=this.p,v=this.v;if(p.view()!==v||!available(p,v,item))return;
  if(['edit','details'].includes(item.action)&&(!g.node||p.selected(v)?.id!==g.node.id))return;
  p.checkTarget(v,g.target);
  if(item.action.startsWith('tool:'))v.excalidrawAPI.setActiveTool({type:item.action.slice(5)});
  else if(item.action==='create')p.openNode(v,null,g.scene);
  else if(item.action==='edit')p.openNode(v,g.node);
  else if(item.action==='details')await p.details(v,g.node);
  else if(item.action==='templates')await p.openTemplates();
  else if(isCommandAction(item.action))p.app.commands.executeCommandById(item.command);
 }
 cancel(){this.win.clearTimeout(this.timer);if(this.root)this.consumeUntil=Infinity;this.root?.remove();this.root=null;this.gesture=null;}
}
