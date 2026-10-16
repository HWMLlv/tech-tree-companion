import {tr} from './i18n.js';
import {ViewHistory} from './view-history.js';
import {Modal,Notice,setIcon} from 'obsidian';
import {nodeEntries,searchNodes,elementTitle,elementBounds,sceneBounds,fitMap,viewport,focusState} from './navigation-model.js';
import {isTech} from './model.js';
import {sectionRange} from './sections.js';
import {paintMapElement,mapElementAt,MinimapGeometry} from './minimap-renderer.js';
import {directRelations,isRelationNode,relationFocus} from './node-relations.js';
import {paintRelationFocus,focusPixelRatio} from './relation-focus.js';
import {guardRelationLinks} from './relation-link-guard.js';
import {setHint} from './ui-hints.js';

export async function setMinimapEnabled(p,enabled){
 const previous=!!p.data.minimapEnabled,ticket={};p.minimapWrite=ticket;p.data.minimapEnabled=enabled;
 const sync=()=>{for(const owner of p.owners.values())owner.navigation?.syncMap();};sync();
 try{await p.persist();}catch(error){if(p.minimapWrite===ticket){p.data.minimapEnabled=previous;sync();}throw error;}
}
export class CanvasNavigation{
 constructor(plugin,view,owner){
  this.p=plugin;this.v=view;this.file=view.file;this.api=view.excalidrawAPI;this.doc=view.containerEl.ownerDocument;this.win=this.doc.defaultView;this.viewHistory=new ViewHistory(this.api.getAppState());this.matches=new Set();
  view.containerEl.addClass('tt-nav-owner');
  owner.register(this.api.onChange(()=>{this.observeView();this.syncRelationSelection();this.schedule();}));
  if(this.api.onScrollChange)owner.register(this.api.onScrollChange(()=>{this.observeView();this.schedule();}));
  const down=e=>{if(this.relationCanvasEvent(e)){this.pointerHeld=true;this.readRelationDown(e);}},up=e=>{this.pointerHeld=false;this.finishViewGesture();if(e.type==='pointerup')this.readRelationUp(e);else this.relationGesture=null;this.syncRelationSelection();};
  view.containerEl.addEventListener('pointerdown',down,true);this.doc.addEventListener('pointerup',up,true);this.doc.addEventListener('pointercancel',up,true);this.win.addEventListener('blur',up);
  owner.register(()=>{view.containerEl.removeEventListener('pointerdown',down,true);this.doc.removeEventListener('pointerup',up,true);this.doc.removeEventListener('pointercancel',up,true);this.win.removeEventListener('blur',up);});
  const escape=e=>{if(this.relationActive()&&e.key==='Escape'&&!e.isComposing&&!this.p.modal&&view.containerEl.contains(e.target)&&!e.target.closest?.('input,textarea,[contenteditable="true"],.cm-editor')){e.preventDefault();e.stopImmediatePropagation();this.endRelationFocus();}};this.doc.addEventListener('keydown',escape,true);owner.register(()=>this.doc.removeEventListener('keydown',escape,true));
  const click=e=>{if(this.readingRelations()&&!this.p.modal&&this.relationCanvasEvent(e)&&e.button===0){e.preventDefault();e.stopImmediatePropagation();}};
  for(const type of ['click','dblclick']){this.doc.addEventListener(type,click,true);owner.register(()=>this.doc.removeEventListener(type,click,true));}
  const resize=new this.win.ResizeObserver(()=>this.schedule());resize.observe(view.containerEl);owner.register(()=>resize.disconnect());
  owner.register(()=>this.destroy());this.syncMap();
 }
 valid(){return !this.p.stopped&&this.v.leaf?.view===this.v&&this.v.file===this.file&&this.v.excalidrawAPI===this.api;}
 state(){const s=this.api.getAppState(),rect=this.v.containerEl.getBoundingClientRect();return {...s,width:s.width||rect.width,height:s.height||rect.height};}
 get history(){return this.viewHistory.items;}
 observeView(){if(!this.valid())return;this.viewHistory.observe(this.api.getAppState());this.win.clearTimeout(this.viewTimer);this.viewTimer=this.win.setTimeout(()=>{if(!this.pointerHeld)this.finishViewGesture();},350);}
 finishViewGesture(){this.win.clearTimeout(this.viewTimer);this.viewHistory.settle();}
 remember(){this.finishViewGesture();this.viewHistory.remember(this.state());this.schedule();}
 move(state){if(!this.valid())throw Error(tr('原画布已关闭或切换'));this.finishViewGesture();this.viewHistory.moved({...this.state(),...state});this.api.updateScene({appState:state,captureUpdate:'NEVER'});this.schedule();}
 focus(id){if(!this.valid())throw Error(tr('原画布已关闭或切换'));const e=this.api.getSceneElements().find(e=>e.id===id&&!e.isDeleted);if(!e)throw Error(tr('节点已删除，请刷新搜索'));this.remember();this.move(focusState(e,this.state()));if(this.relationId){if(this.relationId!==id)this.setRelationRoot(id);return;}this.highlightId=id;this.win.clearTimeout(this.highlightTimer);this.highlightTimer=this.win.setTimeout(()=>{this.highlightId=null;this.marker?.remove();this.marker=null;},2000);this.schedule();}
 back(){if(!this.valid()||!this.history.length)return;this.move(this.viewHistory.back());this.highlightId=null;this.marker?.remove();this.marker=null;}
 openSearch(audit=false){if(this.p.modal||!this.valid())return;const modal=new NodeSearchModal(this);this.p.modal=modal;modal.open();if(audit)void modal.audit();}
 relationSelection(){const selected=this.state().selectedElementIds??{};return this.api.getSceneElements().filter(e=>selected[e.id]&&isRelationNode(e)).map(e=>e.id);}
 relationActive(){return !!this.relationId||!!this.relationPicking;}
 readingRelations(){return this.relationActive()&&!!this.state().viewModeEnabled;}
 relationCanvasEvent(e){return this.v.containerEl.contains(e.target)&&e.target.tagName?.toLowerCase()==='canvas'&&!e.target.closest?.('.tt-minimap');}
 relationNode(element){const elements=this.api.getSceneElements(),node=elements.find(e=>e.id===(element?.containerId??element?.id));return isRelationNode(node)?node:null;}
 relationHit(e){const s=this.state();return this.relationNode(mapElementAt(this.api.getSceneElements(),{x:(e.clientX-s.offsetLeft)/s.zoom.value-s.scrollX,y:(e.clientY-s.offsetTop)/s.zoom.value-s.scrollY}));}
 syncRelationGuard(){
  const server=this.readingRelations()?this.v.getHookServer?.():null;if(server===this.relationHookServer)return;
  this.releaseRelationGuard?.();this.releaseRelationGuard=null;this.relationHookServer=server;
  if(server)this.releaseRelationGuard=guardRelationLinks(server,this);
 }
 readRelationDown(e){
  this.relationGesture=null;if(!this.readingRelations()||this.p.modal||e.button!==0)return;
  const s=this.state();this.relationGesture={pointerId:e.pointerId,x:e.clientX,y:e.clientY,scrollX:s.scrollX,scrollY:s.scrollY,id:this.relationHit(e)?.id};
  if(e.ctrlKey||e.metaKey||e.altKey){e.preventDefault();e.stopImmediatePropagation();}
 }
 readRelationUp(e){
  const down=this.relationGesture;this.relationGesture=null;
  if(!down||!this.valid()||!this.readingRelations()||this.p.modal||e.pointerId!==down.pointerId||!this.relationCanvasEvent(e)||Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)return;
  const s=this.state();if(Math.hypot(s.scrollX-down.scrollX,s.scrollY-down.scrollY)*s.zoom.value>4)return;
  const node=this.relationHit(e);if(node?.id!==down.id)return;
  if(node)this.setRelationRoot(node.id);else this.endRelationFocus();
 }
 openRelations(id){
  if(this.p.modal||!this.valid())return;const selected=this.relationSelection();
  if(!id&&this.state().viewModeEnabled){if(this.relationActive()){this.endRelationFocus();return;}if(selected.length!==1){this.relationPicking=true;this.relationViewMode=true;this.syncRelationGuard();this.schedule();this.v.containerEl.querySelector('canvas.interactive')?.focus({preventScroll:true});return;}}
  if(!id&&selected.length!==1){new Notice(tr('请先选择一个节点'));return;}id??=selected[0];
  if(!this.api.getSceneElements().some(e=>e.id===id&&isRelationNode(e))){new Notice(tr('请先选择一个节点'));return;}
  if(this.relationId===id){this.endRelationFocus();return;}this.setRelationRoot(id);this.v.containerEl.querySelector('canvas.interactive')?.focus({preventScroll:true});
 }
 openRelationList(id=this.relationId){if(this.p.modal||!this.valid()||!id)return;const modal=new NodeRelationsModal(this,id);this.p.modal=modal;modal.open();}
 setRelationRoot(id,remember=true){
  if(!this.valid())return;if(this.relationId&&this.relationId!==id&&remember){(this.relationTrail??=[]).push(this.relationId);if(this.relationTrail.length>30)this.relationTrail.shift();}
  this.relationId=id;this.relationPicking=false;this.relationViewMode=!!this.state().viewModeEnabled;this.relationSelectionKey=JSON.stringify([id]);this.syncRelationGuard();
  const selected=this.relationSelection();if(!this.relationViewMode&&(selected.length!==1||selected[0]!==id))this.api.updateScene({appState:{selectedElementIds:{[id]:true}},captureUpdate:'NEVER'});
  this.highlightId=null;this.marker?.remove();this.marker=null;this.schedule();
 }
 syncRelationSelection(){
  if(!this.relationActive())return;if(!this.valid()||!!this.state().viewModeEnabled!==this.relationViewMode){this.endRelationFocus();return;}this.syncRelationGuard();if(this.relationViewMode)return;const selected=this.relationSelection(),key=JSON.stringify(selected);if(!selected.length&&this.pointerHeld)return;if(key===this.relationSelectionKey)return;this.relationSelectionKey=key;
  if(selected.length===1)this.setRelationRoot(selected[0]);else this.endRelationFocus();
 }
 endRelationFocus(){this.relationId=null;this.relationPicking=false;this.relationGesture=null;this.relationTrail=[];this.relationSelectionKey=null;this.releaseRelationGuard?.();this.releaseRelationGuard=null;this.relationHookServer=null;this.relationCanvas?.remove();this.relationCanvas=null;this.relationBar?.remove();this.relationBar=null;this.relationTitle=this.relationBefore=this.relationAfter=this.relationBack=this.relationList=null;this.relationButton?.setAttribute('aria-pressed','false');this.v.containerEl.removeClass('tt-has-relation-focus');}
 paintRelations(state,elements){
  if(!this.relationActive())return;const focus=this.relationId?relationFocus(elements,this.relationId):null;if(!focus&&!this.relationPicking){this.endRelationFocus();return;}
  this.v.containerEl.addClass('tt-has-relation-focus');this.relationButton?.setAttribute('aria-pressed','true');
  if(focus){
  if(!this.relationCanvas)this.relationCanvas=this.doc.createElement('canvas');const canvas=this.relationCanvas;canvas.className='tt-relation-overlay';canvas.setAttribute('aria-hidden','true');
  const native=this.v.containerEl.querySelector('.excalidraw__canvas-wrapper'),parent=native??this.v.containerEl;if(canvas.parentElement!==parent)parent.appendChild(canvas);
  const rect=this.v.containerEl.getBoundingClientRect(),ratio=focusPixelRatio(state.width,state.height,this.win.devicePixelRatio||1);Object.assign(canvas.style,{left:(native?0:(state.offsetLeft??rect.left)-rect.left)+'px',top:(native?0:(state.offsetTop??rect.top)-rect.top)+'px',width:state.width+'px',height:state.height+'px',zIndex:native?'1':'6'});
  const width=Math.round(state.width*ratio),height=Math.round(state.height*ratio);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.scale(ratio,ratio);
  const style=this.win.getComputedStyle(this.v.containerEl);paintRelationFocus(ctx,elements,focus,state,{background:style.getPropertyValue('--background-primary').trim()||'#ffffff',accent:style.getPropertyValue('--interactive-accent').trim()||'#7950f2',before:'#2f9e44',after:'#1971c2'});
  }
  if(!this.relationBar){
   this.relationBar=this.v.containerEl.createDiv({cls:'tt-relation-toolbar',attr:{role:'region','aria-label':tr('画布关系聚焦')}});
   const tool=(label,icon,run)=>{const b=this.relationBar.createEl('button',{attr:{type:'button',title:label,'aria-label':label}});setIcon(b,icon);b.onclick=run;return b;};
   this.relationBack=tool(tr('返回上个节点'),'undo-2',()=>{const id=this.relationTrail?.pop();if(id&&this.api.getSceneElements().some(e=>e.id===id&&isRelationNode(e))){this.setRelationRoot(id,false);this.focus(id);}else this.schedule();});
   this.relationTitle=this.relationBar.createSpan({cls:'tt-relation-title'});this.relationBefore=this.relationBar.createSpan({cls:'tt-relation-count tt-relation-before'});this.relationAfter=this.relationBar.createSpan({cls:'tt-relation-count tt-relation-after'});
   this.relationList=tool(tr('查看关系列表'),'list',()=>this.openRelationList());tool(tr('退出关系聚焦'),'x',()=>this.endRelationFocus());
   this.p.hintRoot?.(this.relationBar);
  }
  const node=elements.find(e=>e.id===focus?.id);this.relationTitle.textContent=focus?elementTitle(node,elements):tr('待选择关系节点');setHint(this.relationTitle,this.relationTitle.textContent);this.relationBefore.textContent=focus?tr('直接前置')+' '+focus.before.size:'';this.relationAfter.textContent=focus?tr('直接后续')+' '+focus.after.size:'';this.relationBack.disabled=!this.relationTrail?.length;this.relationList.disabled=!focus;
 }
 toggle(){return setMinimapEnabled(this.p,!this.p.data.minimapEnabled).catch(e=>this.p.error(e));}
 syncMap(){if(this.p.data.minimapEnabled)this.showMap();else this.closeMap();}
 showMap(){if(this.root){this.schedule();return;}if(!this.valid())return;
  this.v.containerEl.addClass('tt-has-minimap');this.root=this.v.containerEl.createDiv({cls:'tt-minimap',attr:{'aria-label':tr('科技树小地图')}});
  const bar=this.root.createDiv({cls:'tt-map-toolbar'});bar.createSpan({text:tr('画布导航')});const tool=(label,icon,run)=>{const button=bar.createEl('button',{attr:{type:'button',title:label,'aria-label':label}});setIcon(button,icon);button.onclick=run;return button;};tool(tr('搜索'),'search',()=>this.openSearch());
  this.relationButton=tool(tr('查看前置与后续'),'git-branch',()=>this.openRelations());this.relationButton.setAttribute('aria-pressed',String(this.relationActive()));this.backButton=tool(tr('返回上个视图'),'undo-2',()=>this.back());tool(tr('关闭'),'x',()=>setMinimapEnabled(this.p,false).catch(e=>this.p.error(e)));
  this.canvas=this.root.createEl('canvas',{attr:{width:'264',height:'164',tabindex:'0','aria-label':tr('小地图。点击定位；方向键平移，返回按钮恢复位置。')}});
  this.root.createDiv({cls:'tt-inline-help',text:tr('点击定位 · 拖动查看区域')});
  this.canvas.onpointerdown=e=>{if(e.button!==0||!this.transform)return;e.preventDefault();e.stopPropagation();this.remember();this.drag={id:e.pointerId};this.canvas.setPointerCapture(e.pointerId);this.panMap(e);};
  this.canvas.onpointermove=e=>{if(this.drag?.id===e.pointerId)this.panMap(e);else if(this.transform){const rect=this.canvas.getBoundingClientRect(),t=this.transform,elements=this.api.getSceneElements(),element=mapElementAt(elements,{x:((e.clientX-rect.left)*264/rect.width-t.x)/t.scale,y:((e.clientY-rect.top)*164/rect.height-t.y)/t.scale});setHint(this.canvas,element?elementTitle(element,elements):'');}};
  this.canvas.onpointerup=e=>{if(this.drag?.id!==e.pointerId)return;this.drag=null;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);};
  this.canvas.onpointercancel=()=>this.drag=null;this.canvas.onlostpointercapture=()=>this.drag=null;
  this.p.hintRoot?.(this.root);
  this.canvas.onkeydown=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(!e.repeat)this.remember();const s=this.state(),step=100/s.zoom.value;this.move({scrollX:s.scrollX+(e.key==='ArrowLeft'?step:e.key==='ArrowRight'?-step:0),scrollY:s.scrollY+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0)});};
  this.schedule();
 }
 panMap(e){if(!this.valid()||!this.transform)return;const rect=this.canvas.getBoundingClientRect(),t=this.transform,x=((e.clientX-rect.left)*264/rect.width-t.x)/t.scale,y=((e.clientY-rect.top)*164/rect.height-t.y)/t.scale,s=this.state();this.move({scrollX:s.width/(2*s.zoom.value)-x,scrollY:s.height/(2*s.zoom.value)-y});}
 closeMap(){this.root?.remove();this.root=null;this.canvas=null;this.mapCache=null;this.mapGeometry=null;this.drag=null;this.v.containerEl.removeClass('tt-has-minimap');}
 schedule(){if(this.frame||!this.valid()||(!this.root&&!this.highlightId&&!this.relationActive()))return;this.frame=this.win.requestAnimationFrame(()=>{this.frame=null;this.paint();});}
 paint(){
  if(!this.valid())return;const state=this.state(),elements=this.api.getSceneElements();
  this.paintRelations(state,elements);
  if(this.root){const ctx=this.canvas.getContext('2d'),theme=this.win.getComputedStyle(this.root),colors=['--text-normal','--interactive-accent','--background-modifier-border'].map(name=>theme.getPropertyValue(name).trim()),ratio=Math.max(1,Math.min(3,this.win.devicePixelRatio||1)),revision=(this.mapGeometry??=new MinimapGeometry()).update(elements),key=JSON.stringify([colors,ratio,[...this.matches],revision]),old=this.mapCache;
   if(this.canvas.width!==Math.round(264*ratio)||this.canvas.height!==Math.round(164*ratio)){this.canvas.width=Math.round(264*ratio);this.canvas.height=Math.round(164*ratio);}
   if(!old||old.key!==key){
    const bitmap=this.doc.createElement('canvas');bitmap.width=this.canvas.width;bitmap.height=this.canvas.height;const bg=bitmap.getContext('2d'),t=fitMap(sceneBounds(elements),264,164);bg.scale(ratio,ratio);bg.translate(t.x,t.y);bg.scale(t.scale,t.scale);
    for(const e of elements)paintMapElement(bg,e,{stroke:colors[0],accent:colors[1],fill:colors[2]},t.scale,this.matches.has(e.id));
    this.mapCache={bitmap,transform:t,key};
   }
   const t=this.transform=this.mapCache.transform,b=viewport(state);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.drawImage(this.mapCache.bitmap,0,0);ctx.scale(ratio,ratio);
   ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.scale,t.scale);for(const e of elements)if(state.selectedElementIds?.[e.id])paintMapElement(ctx,e,{stroke:colors[0],accent:colors[1],fill:colors[2]},t.scale,true);ctx.restore();
   ctx.strokeStyle=colors[1];ctx.lineWidth=2;ctx.strokeRect(b.x*t.scale+t.x,b.y*t.scale+t.y,b.width*t.scale,b.height*t.scale);this.backButton.disabled=!this.history.length;setHint(this.backButton,this.history.length?tr('返回上个视图：包含平移、缩放和定位'):tr('还没有可返回的视图；平移、缩放或定位后可用'));
  }
  if(this.highlightId){const e=elements.find(e=>e.id===this.highlightId&&!e.isDeleted);if(!e){this.marker?.remove();this.marker=null;return;}const b=elementBounds(e),rect=this.v.containerEl.getBoundingClientRect(),z=state.zoom.value;this.marker??=this.v.containerEl.createDiv({cls:'tt-nav-highlight'});Object.assign(this.marker.style,{left:((b.x+state.scrollX)*z+(state.offsetLeft??rect.left)-rect.left)+'px',top:((b.y+state.scrollY)*z+(state.offsetTop??rect.top)-rect.top)+'px',width:b.width*z+'px',height:b.height*z+'px'});}
 }
 destroy(){this.win.clearTimeout(this.viewTimer);this.win.cancelAnimationFrame(this.frame);this.win.clearTimeout(this.highlightTimer);this.marker?.remove();this.endRelationFocus();this.closeMap();this.v.containerEl.removeClass('tt-nav-owner');this.viewHistory.items=[];}
}

export class NodeSearchModal extends Modal{
 constructor(nav){super(nav.p.app);this.nav=nav;this.p=nav.p;this.statuses=new Map();}
 onOpen(){this.modalEl.addClass('tt-workflow-modal');this.setTitle(tr('搜索与定位节点'));const root=this.contentEl;
  root.createEl('p',{cls:'tt-muted',text:tr('搜索当前画布的卡片标题、字段、模板与关联文档。定位后可返回原来的查看位置。')});
  const filters=root.createDiv({cls:'tt-search-filters'});this.input=filters.createEl('input',{type:'search',attr:{placeholder:tr('搜索节点内容或文档路径'),'aria-label':tr('搜索节点')}});this.input.oninput=()=>this.draw();
  this.template=filters.createEl('select',{attr:{'aria-label':tr('筛选模板')}});this.template.createEl('option',{value:'',text:tr('全部模板')});const templates=new Map(nodeEntries(this.nav.api.getSceneElements()).map(e=>[e.templateId,e.template]));for(const [id,name]of templates)this.template.createEl('option',{value:id,text:name});this.template.onchange=()=>this.draw();
  const actions=root.createDiv({cls:'tt-actions'});actions.createEl('button',{text:tr('小地图开关')}).onclick=()=>this.nav.toggle();actions.createEl('button',{text:tr('返回上个视图')}).onclick=()=>this.nav.back();
  this.auditButton=actions.createEl('button',{text:tr('检查文档关联')});this.auditButton.onclick=()=>this.audit();
  this.onlyIssues=root.createEl('label',{cls:'tt-check-label'});this.issues=this.onlyIssues.createEl('input',{type:'checkbox'});this.onlyIssues.createSpan({text:tr('仅显示已检查出的关联问题')});this.issues.onchange=()=>this.draw();
  this.count=root.createDiv({cls:'tt-muted',attr:{role:'status'}});this.list=root.createDiv({cls:'tt-node-results'});this.draw();this.input.focus();
 }
 draw(){if(!this.nav.valid()){this.count.textContent=tr('原画布已关闭或切换，请重新打开搜索。');this.list.empty();return;}
  for(const e of this.nav.api.getSceneElements()){const status=this.statuses.get(e.id);if(status&&status.link!==(e.link??''))this.statuses.delete(e.id);}
  const entries=searchNodes(nodeEntries(this.nav.api.getSceneElements()),this.input.value,this.template.value).filter(e=>!this.issues.checked||this.statuses.get(e.id)?.issue);
  this.nav.matches=new Set(entries.map(e=>e.id));this.nav.schedule();this.count.textContent=tr`找到 ${entries.length} 个节点${entries.length>100?tr('，显示前 100 个，请缩小搜索范围'):''}`;this.list.empty();
  for(const entry of entries.slice(0,100)){const row=this.list.createDiv({cls:'tt-node-result'}),text=row.createDiv();text.createEl('strong',{text:entry.title});text.createDiv({cls:'tt-muted',text:entry.template+(entry.locked?tr(' · 已锁定'):'')});text.createDiv({cls:'tt-result-snippet',text:entry.content.slice(0,180)});if(entry.link)text.createDiv({cls:'tt-result-snippet',text:entry.link});const audit=this.statuses.get(entry.id);if(audit)text.createDiv({cls:audit.issue?'tt-warning':'tt-muted',text:audit.text});
   const actions=row.createDiv({cls:'tt-actions'});actions.createEl('button',{text:tr('定位')}).onclick=()=>{try{this.nav.focus(entry.id);this.close();}catch(e){this.p.error(e);this.draw();}};
   actions.createEl('button',{text:tr('查看关系')}).onclick=()=>{this.close();this.nav.openRelations(entry.id);};
   if(audit?.issue&&!entry.locked){actions.createEl('button',{text:tr('重新关联')}).onclick=()=>this.relink(entry.id);}
  }if(!entries.length)this.list.createEl('p',{text:tr('没有匹配的节点。')});this.p.hintRoot?.(this.contentEl);
 }
 async audit(){if(this.auditing)return;this.auditing=true;this.auditButton.disabled=true;this.count.textContent=tr('正在检查当前画布的文档关联…');const cache=new Map();
  try{for(const e of this.nav.api.getSceneElements().filter(isTech)){if(!this.contentEl.isConnected||!this.nav.valid())return;
   let result={text:tr('未关联文档（占位节点）'),issue:false};
   if(e.link){try{const {file,heading}=this.p.resolve(e.link,this.nav.file.path);if(!cache.has(file))cache.set(file,this.app.vault.cachedRead(file));sectionRange(await cache.get(file),heading);result={text:tr('关联有效'),issue:false};}catch(error){result={text:error.message,issue:true};}}
   this.statuses.set(e.id,{...result,link:e.link??''});
  }}finally{this.auditing=false;this.auditButton.disabled=false;if(this.contentEl.isConnected)this.draw();}
 }
 async relink(id){try{const node=this.nav.api.getSceneElements().find(e=>e.id===id),target=this.p.target(this.nav.v,[node]),picked=await this.p.chooseLink();if(!picked||!this.contentEl.isConnected)return;this.p.checkTarget(this.nav.v,target);const {file,heading}=this.p.resolve(picked.link,this.nav.file.path);sectionRange(await this.app.vault.read(file),heading);this.p.checkTarget(this.nav.v,target);await this.p.relinkNode(this.nav.v,node,picked.link);this.statuses.set(id,{text:tr('关联已更新，可撤销'),issue:false,link:picked.link});this.draw();}catch(e){new Notice(e.message);}}
 onClose(){this.nav.matches.clear();this.nav.schedule();if(this.p.modal===this)this.p.modal=null;this.contentEl.empty();}
}

export class NodeRelationsModal extends Modal{
 constructor(nav,id){super(nav.p.app);this.nav=nav;this.p=nav.p;this.id=id;this.trail=[];}
 onOpen(){this.modalEl.addClass('tt-workflow-modal');this.modalEl.addClass('tt-relations-modal');this.setTitle(tr('查看关系列表'));this.draw();}
 draw(){
  const root=this.contentEl;root.empty();if(!this.nav.valid()){root.createEl('p',{text:tr('原画布已关闭或切换，请重新打开搜索。')});return;}
  const elements=this.nav.api.getSceneElements(),node=elements.find(e=>e.id===this.id&&!e.isDeleted);
  if(!node){root.createEl('p',{text:tr('节点已删除，请刷新搜索')});return;}
  root.createEl('h3',{text:elementTitle(node,elements)});
  const actions=root.createDiv({cls:'tt-actions'}),back=actions.createEl('button',{text:tr('返回上个节点')});back.disabled=!this.trail.length;back.onclick=()=>{this.id=this.trail.pop();this.draw();};
  actions.createEl('button',{text:tr('定位当前节点')}).onclick=()=>this.locate(this.id);
  actions.createEl('button',{text:tr('刷新')}).onclick=()=>this.draw();
  const relations=directRelations(elements,this.id),list=root.createDiv({cls:'tt-relation-columns'});
  for(const [key,label,empty]of [['before',tr('直接前置'),tr('没有直接前置节点')],['after',tr('直接后续'),tr('没有直接后续节点')]]){
   const column=list.createEl('section');column.createEl('h4',{text:label+' · '+relations[key].length});
   if(!relations[key].length)column.createEl('p',{cls:'tt-muted',text:empty});
   for(const entry of relations[key]){const row=column.createDiv({cls:'tt-relation-row'}),name=row.createEl('button',{text:entry.title,attr:{type:'button'}});name.onclick=()=>{this.trail.push(this.id);if(this.trail.length>100)this.trail.shift();this.id=entry.id;this.draw();};const locate=row.createEl('button',{attr:{type:'button',title:tr('定位'),'aria-label':tr('定位')+' '+entry.title}});setIcon(locate,'locate-fixed');locate.onclick=()=>this.locate(entry.id);}
  }
  this.p.hintRoot?.(root);
 }
 locate(id){try{if(this.nav.relationId)this.nav.setRelationRoot(id);this.nav.focus(id);this.close();}catch(error){this.p.error(error);this.draw();}}
 onClose(){if(this.p.modal===this)this.p.modal=null;this.contentEl.empty();}
}
