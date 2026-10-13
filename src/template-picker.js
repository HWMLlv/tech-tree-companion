import {Modal} from 'obsidian';
import {tr} from './i18n.js';
import {clone} from './model.js';
import {replaceSvg} from './svg-dom.js';
import {prepareHints} from './ui-hints.js';
import {boundIndex,deckGeometry,deckPose,deckWindow,dragPosition,snapIndex,filterTemplates} from './template-deck-model.js';

// Browsing is local to this modal. Only the explicit confirmation applies a template.
export class TemplatePicker extends Modal{
 constructor(plugin,current,values,onChoose,onClosed){super(plugin.app);Object.assign(this,{plugin,current,values:clone(values),onChoose,onClosed});this.all=plugin.templates().map(t=>clone(t));this.candidate=current;this.cache=new Map();this.cards=new Map();this.gridMode=false;}
 onOpen(){
  (this.plugin.templatePickers??=new Set()).add(this);this.closed=false;
  this.modalEl.addClass('tt-template-picker');this.titleEl.setText(tr('卡牌式模板选择'));
  const root=this.contentEl,win=this.win=root.ownerDocument.defaultView;
  this.motion=win.matchMedia('(prefers-reduced-motion: reduce)');this.motionChanged=()=>{this.stopMotion();this.position=this.index;this.paint();};this.motion.addEventListener('change',this.motionChanged);
  root.createEl('p',{cls:'tt-inline-help',text:tr('拖动翻牌、点击侧边卡牌或使用方向键。浏览不会修改节点，确认后才应用模板。')});
  const toolbar=root.createDiv({cls:'tt-template-picker-toolbar'});
  this.search=toolbar.createEl('input',{type:'search',attr:{placeholder:tr('搜索模板名称'),'aria-label':tr('搜索模板名称')}});this.search.oninput=()=>this.filter();
  this.mode=toolbar.createEl('button',{text:tr('网格选择'),attr:{type:'button','aria-pressed':'false'}});this.mode.onclick=()=>{this.gridMode=!this.gridMode;this.mode.setAttribute('aria-pressed',String(this.gridMode));this.mode.textContent=this.gridMode?tr('卡牌选择'):tr('网格选择');this.rebuild();};
  this.stage=root.createDiv({cls:'tt-template-deck',attr:{tabindex:'0',role:'group','aria-label':tr('模板卡牌')}});
  this.stage.onpointerdown=e=>this.startDrag(e);this.stage.onpointermove=e=>this.moveDrag(e);this.stage.onpointerup=e=>this.endDrag(e);this.stage.onpointercancel=e=>this.endDrag(e,true);this.stage.onlostpointercapture=e=>{if(this.drag?.id===e.pointerId)this.endDrag(e,true);};
  this.grid=root.createDiv({cls:'tt-template-picker-grid',attr:{'aria-label':tr('模板网格')}});
  this.empty=root.createDiv({cls:'tt-template-picker-empty',text:tr('没有匹配的模板')});
  const navigation=root.createDiv({cls:'tt-template-picker-navigation'});
  this.previous=navigation.createEl('button',{text:'←',attr:{type:'button','aria-label':tr('上一个模板')}});this.previous.onclick=()=>this.select(this.index-1);
  this.readout=navigation.createDiv({cls:'tt-template-picker-readout',attr:{role:'status','aria-live':'polite'}});
  this.next=navigation.createEl('button',{text:'→',attr:{type:'button','aria-label':tr('下一个模板')}});this.next.onclick=()=>this.select(this.index+1);
  const footer=root.createDiv({cls:'tt-template-picker-footer'});footer.createEl('button',{text:tr('取消'),attr:{type:'button'}}).onclick=()=>this.close();
  this.confirm=footer.createEl('button',{text:tr('使用此模板'),cls:'mod-cta',attr:{type:'button'}});this.confirm.onclick=()=>this.choose();
  this.scope.register(['Mod'],'Enter',()=>{this.choose();return false;});
  root.onkeydown=e=>{if(e.isComposing||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target===this.search)return;const step={ArrowLeft:-1,ArrowRight:1}[e.key];if(step){e.preventDefault();this.select(this.index+step);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();this.select(e.key==='Home'?0:this.filtered.length-1);}else if(e.key==='Enter'&&e.target===this.stage){e.preventDefault();this.choose();}};
  this.blur=()=>{if(this.drag)this.endDrag({pointerId:this.drag.id},true);};win.addEventListener('blur',this.blur);
  this.observer=new win.ResizeObserver(()=>{if(this.closed)return;if(this.drag)this.endDrag({pointerId:this.drag.id},true);this.paint();});this.observer.observe(this.stage);
  this.filter();prepareHints(root);for(const el of root.querySelectorAll('[data-tt-hint]'))el.removeAttribute('data-tt-hint');this.stage.focus({preventScroll:true});
 }
 filter(){
  this.stopMotion();this.releaseDrag();this.filtered=filterTemplates(this.all,this.search.value);
  const found=this.filtered.findIndex(t=>t.id===this.candidate);this.index=found<0?0:found;this.position=this.index;
  if(this.filtered.length)this.candidate=this.filtered[this.index].id;
  this.warmPreviews();
  this.rebuild();
 }
 rebuild(){
  this.stopMotion();this.releaseDrag();this.position=this.index;this.stage.empty();this.grid.empty();this.cards.clear();
  this.stage.hidden=this.gridMode||!this.filtered.length;this.grid.hidden=!this.gridMode||!this.filtered.length;this.empty.hidden=!!this.filtered.length;
  if(this.gridMode)for(let i=0;i<this.filtered.length;i++)this.card(i,this.grid);
  this.paint();
 }
 card(index,parent=this.stage){
  if(this.cards.has(index))return this.cards.get(index);
  const t=this.filtered[index],button=parent.createEl('button',{cls:'tt-template-picker-card',attr:{type:'button','data-template-id':t.id,'aria-label':t.name,'aria-pressed':String(index===this.index),tabindex:this.gridMode?'0':'-1'}});
  button.toggleClass('is-default',t.id===this.plugin.defaultTemplate().id);
  const art=button.createSpan({cls:'tt-template-picker-art'});button.createSpan({cls:'tt-template-picker-name',text:t.name});
  if(t.id===this.plugin.defaultTemplate().id)button.createSpan({cls:'tt-template-picker-default',text:tr('默认模板')});
  prepareHints(button);button.removeAttribute('data-tt-hint');
  button.onclick=e=>{if(e.detail&&this.win.performance.now()-(this.dragEndedAt??-1000)<250)return;this.select(index);};
  this.cards.set(index,button);this.preview(t,art);return button;
 }
 preview(template,art){
  try{
   if(!this.cache.has(template.id)&&(this.drag||this.animating)){art.setText(template.name);art.dataset.pendingPreview='true';return;}
   const svg=this.cachedPreview(template);art.replaceChildren(svg.cloneNode(true));delete art.dataset.pendingPreview;
  }catch{art.setText(tr('预览暂不可用'));}
 }
 cachedPreview(template){
  if(!this.cache.has(template.id)){
   const values={...this.values};for(const m of template.modules)if(m.field&&!values[m.field])values[m.field]=m.type==='title'?template.name:tr('示例值');
   const staging=this.contentEl.ownerDocument.createElement('div');
   this.cache.set(template.id,replaceSvg(staging,this.plugin.render({containerEl:this.contentEl},template,values).svg));
  }
  return this.cache.get(template.id);
 }
 warmPreviews(){
  // Small libraries are ready before the first gesture. Large libraries use a
  // bounded look-ahead; fast uncached travel shows names until the deck settles.
  const slots=deckGeometry(this.stage.clientWidth||this.contentEl.clientWidth||680).slots;
  for(const index of deckWindow(this.index,this.filtered.length,this.filtered.length<=32?this.filtered.length:slots+6))try{this.cachedPreview(this.filtered[index]);}catch{/* A malformed preview must not prevent other templates being chosen. */}
 }
 refreshPreviews(){if(this.closed)return;if(this.drag||this.animating){this.previewsDirty=true;return;}this.cache.clear();this.warmPreviews();for(const [index,card]of this.cards)this.preview(this.filtered[index],card.querySelector('.tt-template-picker-art'));}
 paint(){
  if(this.closed||!this.stage)return;
  const geometry=this.geometry=deckGeometry(this.stage.clientWidth||this.contentEl.clientWidth||680),visible=new Set(deckWindow(this.position,this.filtered.length,geometry.slots));
  if(!this.gridMode){
   for(const [index,card]of this.cards)if(!visible.has(index)){card.remove();this.cards.delete(index);}
   for(const index of visible){const card=this.card(index),pose=deckPose(index,this.position,geometry.step,this.motion.matches);Object.assign(card.style,{width:geometry.cardWidth+'px',transform:`translate(calc(-50% + ${pose.x}px), calc(-50% + ${pose.y}px)) scale(${pose.scale}) rotate(${pose.angle}deg)`,zIndex:String(pose.z)});}
  }
  for(const [index,card]of this.cards){card.setAttribute('aria-pressed',String(index===this.index));card.toggleClass('is-current',index===this.index);}
  if(!this.drag&&!this.animating)for(const [index,card]of this.cards){const art=card.querySelector('[data-pending-preview]');if(art)this.preview(this.filtered[index],art);}
  const selected=this.filtered[this.index];this.confirm.disabled=!selected;this.previous.disabled=!selected||this.index===0;this.next.disabled=!selected||this.index===this.filtered.length-1;
  const label=selected?selected.name+' · '+(this.index+1)+' / '+this.filtered.length:tr('没有匹配的模板');if(this.readout.textContent!==label)this.readout.setText(label);
 }
 stopMotion(){if(this.frame!=null)this.win.cancelAnimationFrame(this.frame);this.frame=null;this.animating=false;}
 select(index){
  if(!this.filtered.length||this.closed)return;this.releaseDrag();this.index=boundIndex(index,this.filtered.length);this.candidate=this.filtered[this.index].id;this.warmPreviews();this.animate();
 }
 animate(){
  this.stopMotion();const from=this.position,target=this.index,start=this.win.performance.now();
  if(this.motion.matches||this.gridMode||Math.abs(target-from)<.001){this.position=target;this.paint();return;}
  this.animating=true;
  const tick=now=>{const progress=Math.min(1,(now-start)/260);this.position=from+(target-from)*(1-(1-progress)**4);this.animating=progress<1;this.paint();this.frame=progress<1?this.win.requestAnimationFrame(tick):null;if(!this.animating&&this.previewsDirty){this.previewsDirty=false;this.refreshPreviews();}};
  this.frame=this.win.requestAnimationFrame(tick);
 }
 startDrag(e){
  if(this.gridMode||!this.filtered.length||e.button!==0||!e.isPrimary||this.drag)return;
  this.stopMotion();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,time:e.timeStamp,velocity:0,start:this.position,moved:false};
 }
 moveDrag(e){
  const d=this.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.moved){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;if(Math.abs(dy)>Math.abs(dx)){this.releaseDrag();this.animate();return;}d.moved=true;this.stage.setPointerCapture(e.pointerId);this.stage.addClass('is-dragging');}
  e.preventDefault();const elapsed=e.timeStamp-d.time;if(elapsed>0)d.velocity=(e.clientX-d.lastX)/elapsed;d.lastX=e.clientX;d.time=e.timeStamp;
  d.next=dragPosition(d.start,dx,this.geometry.step,this.filtered.length);
  if(this.frame==null)this.frame=this.win.requestAnimationFrame(()=>{this.frame=null;if(this.drag!==d)return;this.position=d.next;this.paint();});
 }
 endDrag(e,cancel=false){
  const d=this.drag;if(!d||d.id!==e.pointerId)return;this.stopMotion();if(d.next!=null)this.position=d.next;
  const moved=d.moved;this.releaseDrag();if(moved)this.dragEndedAt=this.win.performance.now();
  if(this.previewsDirty){this.previewsDirty=false;this.refreshPreviews();}
  if(!moved||cancel){this.animate();return;}
  const velocity=e.timeStamp-d.time>100?0:d.velocity;this.select(snapIndex(this.position,velocity,this.geometry.step,this.filtered.length));
 }
 releaseDrag(){const d=this.drag;this.drag=null;this.stage?.removeClass('is-dragging');if(d&&this.stage.hasPointerCapture(d.id))this.stage.releasePointerCapture(d.id);}
 choose(){
  if(this.closed||this.chosen||this.plugin.stopped||this.drag)return;
  const selected=this.filtered[this.index],fresh=this.plugin.templates().find(t=>t.id===selected?.id);
  if(!fresh){this.all=this.plugin.templates().map(t=>clone(t));this.cache.clear();this.filter();return;}
  this.chosen=true;this.close();this.onChoose(clone(fresh));
 }
 onClose(){this.closed=true;this.stopMotion();this.releaseDrag();this.observer?.disconnect();this.motion?.removeEventListener('change',this.motionChanged);this.win?.removeEventListener('blur',this.blur);this.plugin.templatePickers?.delete(this);this.cards.clear();this.cache.clear();this.contentEl.empty();this.onClosed?.();}
}
