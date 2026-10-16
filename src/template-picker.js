import {Modal} from 'obsidian';
import {tr} from './i18n.js';
import {clone} from './model.js';
import {replaceSvg} from './svg-dom.js';
import {prepareHints} from './ui-hints.js';
import {reusePreview} from './template-preview-cache.js';
import {engineeringFrame} from './template-card-frame.js';
import {captureTemplateFlight} from './template-flight.js';
import {wrapIndex,nearestSlot,loopWindow,deckGeometry,deckPose,hitDeck,dragPosition,snapIndex,filterTemplates} from './template-deck-model.js';

// Browsing is local to this modal. Only the explicit confirmation applies a template.
export class TemplatePicker extends Modal{
 constructor(plugin,current,values,onChoose,onClosed,{entry=false,onStandard}={}){super(plugin.app);Object.assign(this,{plugin,current,values:clone(values),onChoose,onClosed,entry,onStandard});this.all=plugin.templates().map(t=>clone(t));this.defaultId=this.all.find(t=>t.id===plugin.data.defaultTemplate)?.id??this.all[0]?.id;this.candidate=current;this.cache=new Map();this.cards=new Map();this.freeCards=[];this.gridMode=false;}
 onOpen(){
  (this.plugin.templatePickers??=new Set()).add(this);this.closed=false;
  this.modalEl.addClass('tt-template-picker');this.titleEl.setText(tr('卡牌式模板选择'));
  const root=this.contentEl,win=this.animationWindow=root.ownerDocument.defaultView;
  this.motion=win.matchMedia('(prefers-reduced-motion: reduce)');this.motionChanged=()=>{this.releaseDrag();this.stopMotion();this.position=this.cursor;this.paint();};this.motion.addEventListener('change',this.motionChanged);
  root.createEl('p',{cls:'tt-inline-help',text:this.entry?tr('先选择模板，再进入节点编辑。左右循环翻牌；取消不会创建节点。'):tr('拖动翻牌、点击侧边卡牌或使用方向键。浏览不会修改节点，确认后才应用模板。')});
  const toolbar=root.createDiv({cls:'tt-template-picker-toolbar'});
  this.search=toolbar.createEl('input',{type:'search',attr:{placeholder:tr('搜索模板名称'),'aria-label':tr('搜索模板名称')}});this.search.oninput=()=>this.filter();
  this.mode=toolbar.createEl('button',{text:tr('网格选择'),attr:{type:'button','aria-pressed':'false'}});this.mode.onclick=()=>{this.gridMode=!this.gridMode;this.mode.setAttribute('aria-pressed',String(this.gridMode));this.mode.textContent=this.gridMode?tr('卡牌选择'):tr('网格选择');this.rebuild();};
  if(this.onStandard){const standard=toolbar.createEl('button',{text:tr('常规选择'),attr:{type:'button'}});standard.onclick=async()=>{standard.disabled=true;try{await this.onStandard(this);}catch(error){this.plugin.error(error);standard.disabled=false;}};}
  const viewport=this.viewport=root.createDiv({cls:'tt-template-deck-viewport'});
  this.stage=viewport.createDiv({cls:'tt-template-deck',attr:{tabindex:'0',role:'group','aria-label':tr('模板卡牌')}});
  this.stage.onpointerdown=e=>this.startDrag(e);this.stage.onpointermove=e=>this.moveDrag(e);this.stage.onpointerup=e=>this.endDrag(e);this.stage.onpointercancel=e=>this.endDrag(e,true);this.stage.onlostpointercapture=e=>{if(this.drag?.id===e.pointerId)this.endDrag(e,true);};
  this.stage.onclick=e=>this.rememberClick(e);this.stage.ondblclick=e=>this.chooseFromDoubleClick(e);
  this.grid=root.createDiv({cls:'tt-template-picker-grid',attr:{'aria-label':tr('模板网格')}});
  this.grid.onpointerdown=e=>{this.pendingTap=null;const button=e.target.closest('.tt-template-picker-card');this.gridTap=e.button===0&&e.isPrimary&&button?{...this.tapRecord(Number(button.dataset.virtualSlot)),id:e.pointerId,x:e.clientX,y:e.clientY}:null;};
  this.grid.onpointermove=e=>{const d=this.gridTap;if(d?.id===e.pointerId&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>=8)this.gridTap=null;};
  this.grid.onpointerup=e=>{const d=this.gridTap;this.pendingTap=d?.id===e.pointerId&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<8?d:null;this.gridTap=null;};
  this.grid.onpointercancel=()=>this.resetClicks();this.grid.onclick=e=>this.rememberClick(e);this.grid.ondblclick=e=>this.chooseFromDoubleClick(e);
  this.empty=root.createDiv({cls:'tt-template-picker-empty',text:tr('没有匹配的模板')});
  const navigation=root.createDiv({cls:'tt-template-picker-navigation'});
  this.previous=navigation.createEl('button',{text:'←',attr:{type:'button','aria-label':tr('上一个模板')}});this.previous.onclick=()=>this.select(this.cursor-1);
  this.readout=navigation.createDiv({cls:'tt-template-picker-readout',attr:{role:'status','aria-live':'polite'}});
  this.caption=this.readout.createSpan({cls:'tt-template-picker-caption'});this.counter=this.readout.createSpan({cls:'tt-template-picker-count'});
  this.next=navigation.createEl('button',{text:'→',attr:{type:'button','aria-label':tr('下一个模板')}});this.next.onclick=()=>this.select(this.cursor+1);
  const footer=root.createDiv({cls:'tt-template-picker-footer'});footer.createEl('button',{text:tr('取消'),cls:'tt-template-picker-cancel',attr:{type:'button'}}).onclick=()=>this.close();
  this.confirm=footer.createEl('button',{text:tr('使用此模板'),cls:'mod-cta',attr:{type:'button'}});this.confirm.onclick=()=>this.choose();
  this.scope.register(['Mod'],'Enter',()=>{this.choose();return false;});
  root.onkeydown=e=>{if(e.isComposing||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target===this.search)return;const step={ArrowLeft:-1,ArrowRight:1}[e.key];if(step){e.preventDefault();this.select(this.cursor+step);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();this.selectIndex(e.key==='Home'?0:this.filtered.length-1);}else if(e.key==='Enter'&&e.target===this.stage){e.preventDefault();this.choose();}};
  this.blur=()=>{if(this.drag)this.endDrag({pointerId:this.drag.id},true);this.resetClicks();};win.addEventListener('blur',this.blur);
  this.observer=new win.ResizeObserver(()=>{if(this.closed)return;this.geometrySize=null;if(this.drag)this.endDrag({pointerId:this.drag.id},true);this.paint();});this.observer.observe(this.stage);
  this.filter();prepareHints(root,{hints:false});this.stage.focus({preventScroll:true});
 }
 filter(){
  this.stopMotion();this.releaseDrag();this.filtered=filterTemplates(this.all,this.search.value);
  const found=this.filtered.findIndex(t=>t.id===this.candidate);this.index=found<0?0:found;this.cursor=this.position=this.index;
  if(this.filtered.length)this.candidate=this.filtered[this.index].id;
  this.warmPreviews();
  this.rebuild();
 }
 rebuild(){
  this.resetClicks();
  this.stopMotion();this.releaseDrag();this.position=this.cursor;this.stage.empty();this.grid.empty();this.cards.clear();this.freeCards=[];this.windowKey=null;
  this.viewport.hidden=this.gridMode||!this.filtered.length;this.grid.hidden=!this.gridMode||!this.filtered.length;this.empty.hidden=!!this.filtered.length;
  if(this.gridMode)for(let i=0;i<this.filtered.length;i++)this.card(i,this.grid);
  this.paint();
 }
 card(index,parent=this.stage){
  if(this.cards.has(index))return this.cards.get(index);
  const t=this.filtered[wrapIndex(index,this.filtered.length)],button=(!this.gridMode&&this.freeCards.pop())||parent.createEl('button',{cls:'tt-template-picker-card',attr:{type:'button'}});
  button.hidden=false;button.dataset.virtualSlot=String(index);button.tabIndex=this.gridMode?0:-1;button.ttSelected=undefined;
  if(button.dataset.templateId!==t.id){
   button.empty();button.removeAttribute('aria-labelledby');button.setAttribute('aria-label',t.name);button.dataset.templateId=t.id;
   button.toggleClass('is-default',t.id===this.defaultId);
   const art=button.createSpan({cls:'tt-template-picker-art'});button.createSpan({cls:'tt-template-picker-name',text:t.name});
   if(t.id===this.defaultId){engineeringFrame(button,t);button.createSpan({cls:'tt-template-picker-default',text:tr('默认模板')});}
   prepareHints(button,{hints:false});this.preview(t,art);
  }
  button.onclick=e=>{if(this.gridMode)this.selectIndex(Number(button.dataset.virtualSlot));else if(e.detail===0)this.select(Number(button.dataset.virtualSlot));};
  this.cards.set(index,button);return button;
 }
 preview(template,art){
  try{
   if(!this.cache.has(template.id)&&(this.drag||this.animating)){art.setText(template.name);art.dataset.pendingPreview='true';return;}
   const svg=this.cachedPreview(template);art.replaceChildren(svg.cloneNode(true));delete art.dataset.pendingPreview;
  }catch{art.setText(tr('预览暂不可用'));}
 }
 cachedPreview(template){
  return reusePreview(this.cache,template.id,()=>{
   const values={...this.values};for(const m of template.modules)if(m.field&&!values[m.field])values[m.field]=m.type==='title'?template.name:tr('示例值');
   const staging=this.contentEl.ownerDocument.createElement('div');
   return replaceSvg(staging,this.plugin.render({containerEl:this.contentEl},template,values).svg);
  });
 }
 warmPreviews(){
  // Small libraries are ready before the first gesture. Large libraries use a
  // bounded look-ahead; fast uncached travel shows names until the deck settles.
  if(this.drag||this.animating||this.warmedTemplates===this.filtered)return;
  const geometry=this.fitGeometry();
  const indices=this.filtered.length<=32?this.filtered.map((_,i)=>i):loopWindow(this.cursor,this.filtered.length,geometry.slots,geometry.overscan+1).map(i=>wrapIndex(i,this.filtered.length));
  for(const index of new Set(indices))if(!this.cache.has(this.filtered[index].id))try{this.cachedPreview(this.filtered[index]);}catch{/* A malformed preview must not prevent other templates being chosen. */}
  if(this.filtered.length<=32)this.warmedTemplates=this.filtered;
 }
 refreshPreviews(){if(this.closed)return;if(this.drag||this.animating){this.previewsDirty=true;return;}this.cache.clear();this.warmedTemplates=null;for(const card of this.freeCards)card.dataset.templateId='';this.warmPreviews();for(const [index,card]of this.cards)this.preview(this.filtered[wrapIndex(index,this.filtered.length)],card.querySelector('.tt-template-picker-art'));}
 fitGeometry(){
  const {width,height}=this.geometrySize??=({width:this.stage.clientWidth||this.contentEl.clientWidth||680,height:this.stage.clientHeight||420}),count=this.filtered.length;
  const key=[width,height,count].join(':');if(this.geometryKey!==key){this.geometryKey=key;this.geometry=deckGeometry(width,height,count);}
  return this.geometry;
 }
 hitSlot(clientX,clientY){
  const g=this.fitGeometry(),r=this.stage.getBoundingClientRect(),point={x:(clientX-r.left)*this.stage.clientWidth/r.width-this.stage.clientWidth/2,y:(clientY-r.top)*this.stage.clientHeight/r.height-this.stage.clientHeight*.48};
  return hitDeck(point,this.cards.keys(),this.position,g,this.motion.matches);
 }
 paint(){
  if(this.closed||!this.stage)return;
  const geometry=this.fitGeometry(),windowKey=Math.floor(this.position)+':'+this.geometryKey;
  if(!this.gridMode){
   if(this.windowKey!==windowKey){
    const visible=new Set(loopWindow(this.position,this.filtered.length,geometry.slots,geometry.overscan));
    for(const [index,card]of this.cards)if(!visible.has(index)){card.hidden=true;this.cards.delete(index);this.freeCards.push(card);}
    for(const index of visible)this.card(index);this.windowKey=windowKey;
   }
   for(const [index,card]of this.cards){const pose=deckPose(index,this.position,geometry.step,this.motion.matches,geometry.cardWidth),outside=Math.abs(index-this.position)>=geometry.edge,width=geometry.cardWidth+'px';if(card.style.width!==width){card.style.width=width;card.style.setProperty('--tt-card-width',width);}card.style.transform=`translate3d(calc(-50% + ${pose.x}px), calc(-50% + ${pose.y}px), ${pose.depth}px) rotateY(${pose.angle}deg) rotateZ(${pose.roll}deg) scale(${pose.scale})`;if(card.ttFocus!==pose.focus){card.ttFocus=pose.focus;card.style.setProperty('--tt-card-focus',String(pose.focus));}if(card.ttOutside!==outside){card.ttOutside=outside;card.setAttribute('aria-hidden',String(outside));}}
  }
  for(const [index,card]of this.cards){const selected=this.gridMode?index===this.index:index===this.cursor;if(card.ttSelected!==selected){card.ttSelected=selected;card.setAttribute('aria-pressed',String(selected));card.toggleClass('is-current',selected);}}
  if(!this.drag&&!this.animating)for(const [index,card]of this.cards){const art=card.querySelector('[data-pending-preview]');if(art)this.preview(this.filtered[wrapIndex(index,this.filtered.length)],art);}
  const selected=this.filtered[this.index];this.confirm.disabled=!selected;this.previous.disabled=this.next.disabled=this.filtered.length<2;
  const label=selected?selected.name+' · '+(this.index+1)+' / '+this.filtered.length:tr('没有匹配的模板');if(this.readoutLabel!==label){this.readoutLabel=label;this.caption.setText(selected?.name??label);this.counter.setText(selected?' · '+(this.index+1)+' / '+this.filtered.length:'');}
 }
 stopMotion(){if(this.frame!=null)this.animationWindow.cancelAnimationFrame(this.frame);this.frame=null;this.animating=false;this.stage?.removeClass('is-moving');}
 select(index){
  if(!this.filtered.length||this.closed)return;this.releaseDrag();const cursor=this.filtered.length>1?Math.round(index):0;if(cursor!==this.cursor){this.firstClick=null;this.doubleClickTap=null;}this.cursor=cursor;this.index=wrapIndex(this.cursor,this.filtered.length);this.candidate=this.filtered[this.index].id;this.warmPreviews();this.animate();
 }
 selectIndex(index){this.select(nearestSlot(index,this.position,this.filtered.length));}
 animate(){
  this.stopMotion();const from=this.position,target=this.cursor,start=this.animationWindow.performance.now();
  if(this.motion.matches||this.gridMode||Math.abs(target-from)<.001){this.position=target;this.paint();return;}
  this.animating=true;this.stage.addClass('is-moving');
  const duration=Math.min(480,320+Math.abs(target-from)*24);
  const tick=now=>{const progress=Math.min(1,(now-start)/duration),ease=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;this.position=from+(target-from)*ease;this.animating=progress<1;this.paint();this.frame=progress<1?this.animationWindow.requestAnimationFrame(tick):null;if(!this.animating){this.stage.removeClass('is-moving');if(this.previewsDirty){this.previewsDirty=false;this.refreshPreviews();}}};
  this.frame=this.animationWindow.requestAnimationFrame(tick);
 }
 startDrag(e){
  if(this.gridMode||!this.filtered.length||e.button!==0||!e.isPrimary||this.drag)return;
  this.pendingTap=null;const tapped=this.hitSlot(e.clientX,e.clientY);this.stopMotion();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,time:e.timeStamp,velocity:0,start:this.position,moved:false,tapped,tap:this.tapRecord(tapped)};
 }
 moveDrag(e){
  const d=this.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.moved){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;if(Math.abs(dy)>Math.abs(dx)){this.releaseDrag();this.animate();return;}d.moved=true;this.stage.setPointerCapture(e.pointerId);this.stage.addClass('is-dragging','is-moving');}
  e.preventDefault();const elapsed=e.timeStamp-d.time;if(elapsed>0)d.velocity=(e.clientX-d.lastX)/elapsed;d.lastX=e.clientX;d.time=e.timeStamp;
  d.next=dragPosition(d.start,dx,this.geometry.step,this.filtered.length);
  if(this.frame==null)this.frame=this.animationWindow.requestAnimationFrame(()=>{this.frame=null;if(this.drag!==d)return;this.position=d.next;this.paint();});
 }
 endDrag(e,cancel=false){
  const d=this.drag;if(!d||d.id!==e.pointerId)return;this.stopMotion();if(d.next!=null)this.position=d.next;
  const moved=d.moved;this.releaseDrag();if(moved)this.dragEndedAt=this.animationWindow.performance.now();
  if(this.previewsDirty){this.previewsDirty=false;this.refreshPreviews();}
  if(cancel){this.resetClicks();this.animate();return;}
  this.pendingTap=moved?null:d.tap;
  if(!moved){if(d.tapped!=null)this.select(d.tapped);else this.animate();return;}
  const velocity=e.timeStamp-d.time>100?0:d.velocity;this.select(snapIndex(this.position,velocity,this.geometry.step,this.filtered.length));
 }
 releaseDrag(){const d=this.drag;this.drag=null;this.stage?.removeClass('is-dragging');if(d&&this.stage.hasPointerCapture(d.id))this.stage.releasePointerCapture(d.id);}
 tapRecord(slot){return {slot,selected:slot!=null&&slot===(this.gridMode?this.index:this.cursor),candidate:this.candidate,grid:this.gridMode};}
 resetClicks(){this.pendingTap=null;this.firstClick=null;this.doubleClickTap=null;this.gridTap=null;}
 rememberClick(e){
  const tap=this.pendingTap,first=this.firstClick;this.pendingTap=null;this.doubleClickTap=null;
  if(e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey){this.firstClick=null;return;}
  // Snapshot both clicks before selection changes: a side-card double click
  // must remain browsing, even when its first click makes it the candidate.
  if(e.detail===2&&first?.selected&&tap?.selected&&first.slot===tap.slot&&first.candidate===tap.candidate&&first.grid===tap.grid)this.doubleClickTap=tap;
  this.firstClick=e.detail===1?tap:null;
 }
 chooseFromDoubleClick(e){
  const tap=this.doubleClickTap;this.resetClicks();
  if(!tap||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||this.closed||this.chosen||this.plugin.stopped||this.drag||tap.grid!==this.gridMode||tap.slot!==(this.gridMode?this.index:this.cursor)||tap.candidate!==this.candidate)return;
  e.preventDefault();e.stopPropagation();this.choose();
 }
 choose(){
  if(this.closed||this.chosen||this.plugin.stopped||this.drag)return;
  const selected=this.filtered[this.index],fresh=this.plugin.templates().find(t=>t.id===selected?.id);
  if(!fresh){this.all=this.plugin.templates().map(t=>clone(t));this.defaultId=this.all.find(t=>t.id===this.plugin.data.defaultTemplate)?.id??this.all[0]?.id;this.cache.clear();this.filter();return;}
  this.chosen=true;const flight=captureTemplateFlight(this);this.close();
  try{const editor=this.onChoose(clone(fresh),flight);flight?.start(editor);}catch(error){flight?.cancel();this.plugin.error(error);}
 }
 onClose(){this.closed=true;this.resetClicks();this.stopMotion();this.releaseDrag();this.observer?.disconnect();this.motion?.removeEventListener('change',this.motionChanged);this.animationWindow?.removeEventListener('blur',this.blur);this.plugin.templatePickers?.delete(this);if(this.plugin.modal===this)this.plugin.modal=null;this.cards.clear();this.freeCards=[];this.cache.clear();this.contentEl.empty();this.onClosed?.();}
}
