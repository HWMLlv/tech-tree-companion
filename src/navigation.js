import {ViewHistory} from './view-history.js';
import {Modal,Notice} from 'obsidian';
import {nodeEntries,searchNodes,elementBounds,sceneBounds,fitMap,viewport,focusState,mapGeometryKey} from './navigation-model.js';
import {isTech} from './model.js';
import {sectionRange} from './sections.js';

export async function setMinimapEnabled(p,enabled){
 const previous=!!p.data.minimapEnabled,ticket={};p.minimapWrite=ticket;p.data.minimapEnabled=enabled;
 const sync=()=>{for(const owner of p.owners.values())owner.navigation?.syncMap();};sync();
 try{await p.persist();}catch(error){if(p.minimapWrite===ticket){p.data.minimapEnabled=previous;sync();}throw error;}
}
export class CanvasNavigation{
 constructor(plugin,view,owner){
  this.p=plugin;this.v=view;this.file=view.file;this.api=view.excalidrawAPI;this.doc=view.containerEl.ownerDocument;this.win=this.doc.defaultView;this.viewHistory=new ViewHistory(this.api.getAppState());this.matches=new Set();
  view.containerEl.addClass('tt-nav-owner');
  owner.register(this.api.onChange(()=>{this.observeView();this.schedule();}));
  if(this.api.onScrollChange)owner.register(this.api.onScrollChange(()=>{this.observeView();this.schedule();}));
  const down=e=>{if(e.target.tagName?.toLowerCase()==='canvas'&&!e.target.closest?.('.tt-minimap'))this.pointerHeld=true;},up=()=>{this.pointerHeld=false;this.finishViewGesture();};
  view.containerEl.addEventListener('pointerdown',down,true);this.doc.addEventListener('pointerup',up,true);this.doc.addEventListener('pointercancel',up,true);this.win.addEventListener('blur',up);
  owner.register(()=>{view.containerEl.removeEventListener('pointerdown',down,true);this.doc.removeEventListener('pointerup',up,true);this.doc.removeEventListener('pointercancel',up,true);this.win.removeEventListener('blur',up);});
  const resize=new this.win.ResizeObserver(()=>this.schedule());resize.observe(view.containerEl);owner.register(()=>resize.disconnect());
  owner.register(()=>this.destroy());this.syncMap();
 }
 valid(){return !this.p.stopped&&this.v.leaf?.view===this.v&&this.v.file===this.file&&this.v.excalidrawAPI===this.api;}
 state(){const s=this.api.getAppState(),rect=this.v.containerEl.getBoundingClientRect();return {...s,width:s.width||rect.width,height:s.height||rect.height};}
 get history(){return this.viewHistory.items;}
 observeView(){if(!this.valid())return;this.viewHistory.observe(this.api.getAppState());this.win.clearTimeout(this.viewTimer);this.viewTimer=this.win.setTimeout(()=>{if(!this.pointerHeld)this.finishViewGesture();},350);}
 finishViewGesture(){this.win.clearTimeout(this.viewTimer);this.viewHistory.settle();}
 remember(){this.finishViewGesture();this.viewHistory.remember(this.state());this.schedule();}
 move(state){if(!this.valid())throw Error('原画布已关闭或切换');this.finishViewGesture();this.viewHistory.moved({...this.state(),...state});this.api.updateScene({appState:state,captureUpdate:'NEVER'});this.schedule();}
 focus(id){if(!this.valid())throw Error('原画布已关闭或切换');const e=this.api.getSceneElements().find(e=>e.id===id&&!e.isDeleted);if(!e)throw Error('节点已删除，请刷新搜索');this.remember();this.move(focusState(e,this.state()));this.highlightId=id;this.win.clearTimeout(this.highlightTimer);this.highlightTimer=this.win.setTimeout(()=>{this.highlightId=null;this.marker?.remove();this.marker=null;},2000);this.schedule();}
 back(){if(!this.valid()||!this.history.length)return;this.move(this.viewHistory.back());this.highlightId=null;this.marker?.remove();this.marker=null;}
 openSearch(audit=false){if(this.p.modal||!this.valid())return;const modal=new NodeSearchModal(this);this.p.modal=modal;modal.open();if(audit)void modal.audit();}
 toggle(){return setMinimapEnabled(this.p,!this.p.data.minimapEnabled).catch(e=>this.p.error(e));}
 syncMap(){if(this.p.data.minimapEnabled)this.showMap();else this.closeMap();}
 showMap(){if(this.root){this.schedule();return;}if(!this.valid())return;
  this.v.containerEl.addClass('tt-has-minimap');this.root=this.v.containerEl.createDiv({cls:'tt-minimap',attr:{'aria-label':'科技树小地图'}});
  const bar=this.root.createDiv({cls:'tt-map-toolbar'});bar.createSpan({text:'画布导航'});bar.createEl('button',{text:'搜索'}).onclick=()=>this.openSearch();
  this.backButton=bar.createEl('button',{text:'返回上个视图'});this.backButton.onclick=()=>this.back();bar.createEl('button',{text:'关闭'}).onclick=()=>setMinimapEnabled(this.p,false).catch(e=>this.p.error(e));
  this.canvas=this.root.createEl('canvas',{attr:{width:'264',height:'164',tabindex:'0','aria-label':'小地图。点击定位；方向键平移，返回按钮恢复位置。'}});
  this.root.createDiv({cls:'tt-inline-help',text:'点击定位 · 拖动查看区域'});
  this.canvas.onpointerdown=e=>{if(e.button!==0||!this.transform)return;e.preventDefault();e.stopPropagation();this.remember();this.drag={id:e.pointerId};this.canvas.setPointerCapture(e.pointerId);this.panMap(e);};
  this.canvas.onpointermove=e=>{if(this.drag?.id===e.pointerId)this.panMap(e);};
  this.canvas.onpointerup=e=>{if(this.drag?.id!==e.pointerId)return;this.drag=null;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);};
  this.canvas.onpointercancel=()=>this.drag=null;this.canvas.onlostpointercapture=()=>this.drag=null;
  this.canvas.onkeydown=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(!e.repeat)this.remember();const s=this.state(),step=100/s.zoom.value;this.move({scrollX:s.scrollX+(e.key==='ArrowLeft'?step:e.key==='ArrowRight'?-step:0),scrollY:s.scrollY+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0)});};
  this.schedule();
 }
 panMap(e){if(!this.valid()||!this.transform)return;const rect=this.canvas.getBoundingClientRect(),t=this.transform,x=((e.clientX-rect.left)*264/rect.width-t.x)/t.scale,y=((e.clientY-rect.top)*164/rect.height-t.y)/t.scale,s=this.state();this.move({scrollX:s.width/(2*s.zoom.value)-x,scrollY:s.height/(2*s.zoom.value)-y});}
 closeMap(){this.root?.remove();this.root=null;this.canvas=null;this.mapCache=null;this.drag=null;this.v.containerEl.removeClass('tt-has-minimap');}
 schedule(){if(this.frame||!this.valid()||(!this.root&&!this.highlightId))return;this.frame=this.win.requestAnimationFrame(()=>{this.frame=null;this.paint();});}
 paint(){
  if(!this.valid())return;const state=this.state(),elements=this.api.getSceneElements();
  if(this.root){const ctx=this.canvas.getContext('2d'),theme=this.win.getComputedStyle(this.root),colors=['--text-muted','--interactive-accent','--background-modifier-border'].map(name=>theme.getPropertyValue(name).trim()),key=JSON.stringify([colors,[...this.matches],mapGeometryKey(elements)]),old=this.mapCache;
   if(!old||old.key!==key){
    const bitmap=this.doc.createElement('canvas');bitmap.width=264;bitmap.height=164;const bg=bitmap.getContext('2d'),t=fitMap(sceneBounds(elements),264,164);bg.translate(t.x,t.y);bg.scale(t.scale,t.scale);bg.lineWidth=1/t.scale;
    for(const e of elements){if(e.isDeleted)continue;const b=elementBounds(e);bg.globalAlpha=isTech(e)?1:.3;bg.strokeStyle=colors[0];bg.fillStyle=this.matches.has(e.id)?colors[1]:isTech(e)?colors[0]:colors[2];
     if(e.type==='arrow'||e.type==='line'){bg.beginPath();const points=e.points??[[0,0],[e.width,e.height]];for(let i=0;i<points.length;i++){const [px,py]=points[i],dx=px-e.width/2,dy=py-e.height/2,a=e.angle??0,x=e.x+e.width/2+dx*Math.cos(a)-dy*Math.sin(a),y=e.y+e.height/2+dx*Math.sin(a)+dy*Math.cos(a);if(i)bg.lineTo(x,y);else bg.moveTo(x,y);}bg.stroke();}
     else bg.fillRect(b.x,b.y,Math.max(b.width,2/t.scale),Math.max(b.height,2/t.scale));
    }this.mapCache={bitmap,transform:t,key};
   }
   const t=this.transform=this.mapCache.transform,b=viewport(state);ctx.clearRect(0,0,264,164);ctx.drawImage(this.mapCache.bitmap,0,0);ctx.strokeStyle=colors[1];ctx.lineWidth=2;ctx.strokeRect(b.x*t.scale+t.x,b.y*t.scale+t.y,b.width*t.scale,b.height*t.scale);this.backButton.disabled=!this.history.length;this.backButton.title=this.history.length?'返回上个视图：包含平移、缩放和定位':'还没有可返回的视图；平移、缩放或定位后可用';
  }
  if(this.highlightId){const e=elements.find(e=>e.id===this.highlightId&&!e.isDeleted);if(!e){this.marker?.remove();this.marker=null;return;}const b=elementBounds(e),rect=this.v.containerEl.getBoundingClientRect(),z=state.zoom.value;this.marker??=this.v.containerEl.createDiv({cls:'tt-nav-highlight'});Object.assign(this.marker.style,{left:((b.x+state.scrollX)*z+(state.offsetLeft??rect.left)-rect.left)+'px',top:((b.y+state.scrollY)*z+(state.offsetTop??rect.top)-rect.top)+'px',width:b.width*z+'px',height:b.height*z+'px'});}
 }
 destroy(){this.win.clearTimeout(this.viewTimer);this.win.cancelAnimationFrame(this.frame);this.win.clearTimeout(this.highlightTimer);this.marker?.remove();this.closeMap();this.v.containerEl.removeClass('tt-nav-owner');this.viewHistory.items=[];}
}

export class NodeSearchModal extends Modal{
 constructor(nav){super(nav.p.app);this.nav=nav;this.p=nav.p;this.statuses=new Map();}
 onOpen(){this.modalEl.addClass('tt-workflow-modal');this.setTitle('搜索与定位节点');const root=this.contentEl;
  root.createEl('p',{cls:'tt-muted',text:'搜索当前画布的卡片标题、字段、模板与关联文档。定位后可返回原来的查看位置。'});
  const filters=root.createDiv({cls:'tt-search-filters'});this.input=filters.createEl('input',{type:'search',attr:{placeholder:'搜索节点内容或文档路径','aria-label':'搜索节点'}});this.input.oninput=()=>this.draw();
  this.template=filters.createEl('select',{attr:{'aria-label':'筛选模板'}});this.template.createEl('option',{value:'',text:'全部模板'});const templates=new Map(nodeEntries(this.nav.api.getSceneElements()).map(e=>[e.templateId,e.template]));for(const [id,name]of templates)this.template.createEl('option',{value:id,text:name});this.template.onchange=()=>this.draw();
  const actions=root.createDiv({cls:'tt-actions'});actions.createEl('button',{text:'小地图开关'}).onclick=()=>this.nav.toggle();actions.createEl('button',{text:'返回上个视图'}).onclick=()=>this.nav.back();
  this.auditButton=actions.createEl('button',{text:'检查文档关联'});this.auditButton.onclick=()=>this.audit();
  this.onlyIssues=root.createEl('label',{cls:'tt-check-label'});this.issues=this.onlyIssues.createEl('input',{type:'checkbox'});this.onlyIssues.createSpan({text:'仅显示已检查出的关联问题'});this.issues.onchange=()=>this.draw();
  this.count=root.createDiv({cls:'tt-muted',attr:{role:'status'}});this.list=root.createDiv({cls:'tt-node-results'});this.draw();this.input.focus();
 }
 draw(){if(!this.nav.valid()){this.count.textContent='原画布已关闭或切换，请重新打开搜索。';this.list.empty();return;}
  for(const e of this.nav.api.getSceneElements()){const status=this.statuses.get(e.id);if(status&&status.link!==(e.link??''))this.statuses.delete(e.id);}
  const entries=searchNodes(nodeEntries(this.nav.api.getSceneElements()),this.input.value,this.template.value).filter(e=>!this.issues.checked||this.statuses.get(e.id)?.issue);
  this.nav.matches=new Set(entries.map(e=>e.id));this.nav.schedule();this.count.textContent=`找到 ${entries.length} 个节点${entries.length>100?'，显示前 100 个，请缩小搜索范围':''}`;this.list.empty();
  for(const entry of entries.slice(0,100)){const row=this.list.createDiv({cls:'tt-node-result'}),text=row.createDiv();text.createEl('strong',{text:entry.title});text.createDiv({cls:'tt-muted',text:entry.template+(entry.locked?' · 已锁定':'')});text.createDiv({cls:'tt-result-snippet',text:entry.content.slice(0,180)});if(entry.link)text.createDiv({cls:'tt-result-snippet',text:entry.link});const audit=this.statuses.get(entry.id);if(audit)text.createDiv({cls:audit.issue?'tt-warning':'tt-muted',text:audit.text});
   const actions=row.createDiv({cls:'tt-actions'});actions.createEl('button',{text:'定位'}).onclick=()=>{try{this.nav.focus(entry.id);this.close();}catch(e){this.p.error(e);this.draw();}};
   if(audit?.issue&&!entry.locked){actions.createEl('button',{text:'重新关联'}).onclick=()=>this.relink(entry.id);}
  }if(!entries.length)this.list.createEl('p',{text:'没有匹配的节点。'});
 }
 async audit(){if(this.auditing)return;this.auditing=true;this.auditButton.disabled=true;this.count.textContent='正在检查当前画布的文档关联…';const cache=new Map();
  try{for(const e of this.nav.api.getSceneElements().filter(isTech)){if(!this.contentEl.isConnected||!this.nav.valid())return;
   let result={text:'未关联文档（占位节点）',issue:false};
   if(e.link){try{const {file,heading}=this.p.resolve(e.link,this.nav.file.path);if(!cache.has(file))cache.set(file,this.app.vault.cachedRead(file));sectionRange(await cache.get(file),heading);result={text:'关联有效',issue:false};}catch(error){result={text:error.message,issue:true};}}
   this.statuses.set(e.id,{...result,link:e.link??''});
  }}finally{this.auditing=false;this.auditButton.disabled=false;if(this.contentEl.isConnected)this.draw();}
 }
 async relink(id){try{const node=this.nav.api.getSceneElements().find(e=>e.id===id),target=this.p.target(this.nav.v,[node]),picked=await this.p.chooseLink();if(!picked||!this.contentEl.isConnected)return;this.p.checkTarget(this.nav.v,target);const {file,heading}=this.p.resolve(picked.link,this.nav.file.path);sectionRange(await this.app.vault.read(file),heading);this.p.checkTarget(this.nav.v,target);await this.p.relinkNode(this.nav.v,node,picked.link);this.statuses.set(id,{text:'关联已更新，可撤销',issue:false,link:picked.link});this.draw();}catch(e){new Notice(e.message);}}
 onClose(){this.nav.matches.clear();this.nav.schedule();if(this.p.modal===this)this.p.modal=null;this.contentEl.empty();}
}
