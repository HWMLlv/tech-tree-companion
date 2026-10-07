import {replaceSvg} from './svg-dom.js';
import {TECH_ICON,iconSVG} from './icons.js';
import {resizeTemplate,tidyNumber,renderFrame} from './appearance.js';
import {modulePreset,placePreset} from './module-presets.js';
import {ItemView,Modal,Notice,Scope} from 'obsidian';
import {clone,DEFAULT_TEMPLATE,moduleDefaultFontSize,uid,validateTemplate,outsideModules,fields} from './model.js';
import {confirmAction} from './node-modal.js';
import {drawTemplateProperties} from './appearance-ui.js';
export const TEMPLATE_VIEW='tech-tree-template-center';
const labels={title:'标题',summary:'摘要',field:'通用字段',text:'固定文字',divider:'分隔线',button:'按钮',icon:'图标'};
export class TemplateView extends ItemView{
 constructor(leaf,plugin){super(leaf);this.plugin=plugin;this.template=clone(plugin.data.templateDraft??plugin.defaultTemplate());this.selected=null;this.undoStack=[];this.redoStack=[];this.dirty=!!plugin.data.templateDraft;this.preview=false;this.zoom=1;this.preferredZoom=2;this.zoomMode="fit";}
 static openManager(plugin,view=null){if(view?.managerModal)return view.managerModal;const modal=new TemplateManagerModal(plugin,view);if(view)view.managerModal=modal;modal.open();return modal;}
 getViewType(){return TEMPLATE_VIEW;}getDisplayText(){return '科技树模板中心';}getIcon(){return TECH_ICON;}
 async onOpen(){this.contentEl.addClass('tt-template-view');this.build();this.registerDomEvent(this.contentEl,'keydown',ev=>{
  if(this.cardDrag){this.endCardResize(true);if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();return;}}
  if(ev.target.closest('input,textarea,select'))return;
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.stopPropagation();ev.shiftKey?this.redo():this.undo();}
  if(ev.key==='Delete'&&this.selected&&!this.preview){ev.preventDefault();this.removeSelected();}
 });}
 async onClose(){this.managerModal?.close();this.clearDropPreview();this.layoutObserver?.disconnect();this.endCardResize(true);window.clearTimeout(this.draftTimer);if(this.dirty){this.plugin.data.templateDraft=clone(this.template);await this.plugin.persist();}this.contentEl.empty();}
 build(){
  const root=this.contentEl;this.clearDropPreview();this.layoutObserver?.disconnect();this.endCardResize(true);root.empty();const top=root.createDiv({cls:'tt-template-toolbar'});top.createEl('h2',{text:'节点模板编辑中心'});
  const selector=top.createEl('select',{attr:{'aria-label':'选择模板'}});for(const t of this.plugin.templates())selector.createEl('option',{value:t.id,text:t.name+' · v'+t.version});if(!this.plugin.templates().some(t=>t.id===this.template.id))selector.createEl('option',{value:this.template.id,text:this.template.name+' · 未保存'});selector.value=this.template.id;
  selector.onchange=async()=>{if(this.dirty&&!await confirmAction(this.app,'放弃当前模板草稿，切换到另一个模板？')){selector.value=this.template.id;return;}this.template=clone(this.plugin.templates().find(t=>t.id===selector.value));this.resetEditing();};
  top.createEl('button',{text:'管理模板'}).onclick=()=>TemplateView.openManager(this.plugin,this);
  top.createEl('button',{text:'新建模板'}).onclick=async()=>{if(this.dirty&&!await confirmAction(this.app,'放弃当前模板草稿并新建？'))return;this.template={...clone(DEFAULT_TEMPLATE),id:uid(),version:1,name:'新模板',modules:[]};this.resetEditing();this.changed();};
  top.createEl('button',{text:'保存',cls:'mod-cta'}).onclick=()=>this.save(false).catch(e=>this.plugin.error(e));
  top.createEl('button',{text:'另存为新模板'}).onclick=()=>this.save(true).catch(e=>this.plugin.error(e));
  top.createEl('button',{text:'设为默认'}).onclick=async()=>{if(this.dirty||!this.plugin.templates().some(t=>t.id===this.template.id)){new Notice('请先保存模板');return;}try{await this.manageTemplate('default',this.template.id);new Notice('已设为默认模板');}catch(e){this.plugin.error(e);}};
  this.undoButton=top.createEl('button',{text:'撤销'});this.undoButton.onclick=()=>this.undo();this.redoButton=top.createEl('button',{text:'重做'});this.redoButton.onclick=()=>this.redo();
  this.previewButton=top.createEl('button',{text:this.preview?'返回布局编辑':'预览'});this.previewButton.onclick=()=>{this.preview=!this.preview;this.build();};
  top.createEl('button',{text:'返回科技树'}).onclick=()=>this.returnToTree().catch(e=>this.plugin.error(e));
  this.message=root.createDiv({cls:'tt-template-status'});
  const layout=root.createDiv({cls:'tt-template-layout'});this.library=layout.createDiv({cls:'tt-module-library'});this.drawLibrary();
  const middle=layout.createDiv({cls:'tt-layout-middle'}),tools=middle.createDiv({cls:'tt-actions'});
  const zoom=tools.createEl('select',{attr:{'aria-label':'编辑器缩放'}});for(const n of [.5,.75,1,1.25,1.5,2])zoom.createEl('option',{value:String(n),text:Math.round(n*100)+'%'});if(![.5,.75,1,1.25,1.5,2].includes(this.zoom))zoom.createEl('option',{value:String(this.zoom),text:Math.round(this.zoom*100)+'%',attr:{'data-dynamic-zoom':'true'}});zoom.value=String(this.zoom);this.zoomSelect=zoom;zoom.onchange=()=>{this.preferredZoom=Number(zoom.value);this.zoomMode="manual";this.adjustViewport();};
  tools.createEl('button',{text:'适合窗口'}).onclick=()=>this.fitCard();tools.createEl('button',{text:'居中'}).onclick=()=>this.centerCard();this.zoomModeReadout=tools.createSpan({cls:'tt-zoom-mode'});this.sizeReadout=tools.createSpan({cls:'tt-card-size'});
  if(this.preview){const sample=tools.createEl('select',{attr:{'aria-label':'预览内容'}});for(const [id,name]of [['normal','常规内容'],['long','长标题与长摘要'],['empty','空字段']])sample.createEl('option',{value:id,text:name});sample.value=this.sample??'normal';sample.onchange=()=>{this.sample=sample.value;this.paint();};}
  this.viewport=middle.createDiv({cls:'tt-grid-viewport'});this.viewport.addEventListener("pointerdown",ev=>{if(ev.button!==0||this.preview||ev.composedPath().includes(this.frame))return;this.selected=null;this.propertyTab="appearance";this.paint();this.drawProperties();});this.surface=this.viewport.createDiv({cls:'tt-editor-stage'});this.frame=this.surface.createDiv({cls:'tt-card-frame'});this.board=this.frame.createDiv({cls:'tt-grid-board',attr:{tabindex:'0','aria-label':'模板网格画布'}});
  this.board.ondragover=ev=>{if(this.preview||!this.dragModule)return;ev.preventDefault();ev.dataTransfer.dropEffect='copy';this.dropPoint={x:ev.clientX,y:ev.clientY};if(!this.dropFrame)this.dropFrame=this.contentEl.ownerDocument.defaultView.requestAnimationFrame(()=>{this.dropFrame=null;this.paintDropPreview();});};
  this.board.ondragleave=ev=>{if(!this.board.contains(ev.relatedTarget))this.clearDropPreview(false);};
  this.board.ondrop=ev=>{ev.preventDefault();const type=ev.dataTransfer.getData('application/x-tech-module');if(this.preview)return;const r=this.board.getBoundingClientRect();const m=this.moduleAt(type,(ev.clientX-r.left)/this.zoom,(ev.clientY-r.top)/this.zoom);this.clearDropPreview();if(m)this.insertModule(m);};
  this.board.onpointerdown=ev=>this.pointerDown(ev);this.board.onpointermove=ev=>this.pointerMove(ev);this.board.onpointerup=()=>this.pointerEnd();this.board.onpointercancel=()=>this.pointerEnd();
  this.cardHandle=this.frame.createEl('button',{cls:'tt-card-resize',attr:{type:'button','data-card-resize':'true','aria-label':'拖动调整卡片宽高；方向键微调'}});replaceSvg(this.cardHandle,'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M8 12h4V8" fill="none" stroke="currentColor" stroke-width="2"/></svg>');
  this.frame.onpointerdown=ev=>this.startCardResize(ev);this.frame.onpointermove=ev=>this.moveCardResize(ev);this.frame.onpointerup=ev=>this.endCardResize(false,ev);this.frame.onpointercancel=ev=>{if(ev.pointerId===this.cardDrag?.pointerId)this.endCardResize(true);};this.frame.onlostpointercapture=ev=>{if(ev.pointerId===this.cardDrag?.pointerId)this.endCardResize(true);};
  this.cardHandle.onkeydown=ev=>{const d={ArrowRight:[8,0],ArrowLeft:[-8,0],ArrowDown:[0,8],ArrowUp:[0,-8]}[ev.key];if(!d)return;ev.preventDefault();ev.stopPropagation();if(this.cardDrag)this.endCardResize(true);this.edit(t=>resizeTemplate(t,Math.max(80,Math.min(2400,t.width+d[0])),Math.max(64,Math.min(2400,t.height+d[1]))));this.drawProperties();};
  middle.createDiv({cls:'tt-editor-help',text:'拖动右下角调整卡片大小 · 模块可拖动和缩放 · Ctrl＋Z 撤销'});
  this.properties=layout.createDiv({cls:'tt-module-properties'});this.paint();this.drawProperties();this.plugin.hintRoot(root);const win=root.ownerDocument.defaultView;this.layoutObserver=new win.ResizeObserver(()=>this.adjustViewport());this.layoutObserver.observe(this.viewport);this.adjustViewport();
 }
 async returnToTree(){const o=this.plugin.origin;let leaf;if(o?.leaf?.view?.file?.path===o.path)leaf=o.leaf;else if(o?.path){const file=this.app.vault.getAbstractFileByPath(o.path);if(file){leaf=this.app.workspace.getLeaf(true);await leaf.openFile(file,{active:true});}}if(!leaf){new Notice('原科技树已不可用，请先打开绘图');return;}await this.app.workspace.revealLeaf(leaf);this.app.workspace.setActiveLeaf(leaf,{focus:true});const el=leaf.view.containerEl;el?.ownerDocument.defaultView.focus();el?.querySelector('.excalidraw')?.focus();}
 resetEditing(){this.selected=null;this.undoStack=[];this.redoStack=[];this.dirty=false;delete this.plugin.data.templateDraft;this.build();}
 remember(before){if(JSON.stringify(before)===JSON.stringify(this.template))return;this.undoStack.push(before);if(this.undoStack.length>100)this.undoStack.shift();this.redoStack=[];this.changed();}
 changed(){this.dirty=true;this.plugin.data.templateDraft=clone(this.template);window.clearTimeout(this.draftTimer);this.draftTimer=window.setTimeout(()=>this.plugin.persist().catch(e=>this.plugin.error(e)),300);this.paint();this.adjustViewport();}
 edit(change){const before=clone(this.template);try{change(this.template);validateTemplate(this.template,{allowOverflow:true});}catch(e){this.template=before;this.plugin.error(e);this.drawProperties();return;}this.remember(before);this.paint();}
 undo(){if(!this.undoStack.length)return;this.redoStack.push(clone(this.template));this.template=this.undoStack.pop();this.changed();this.drawProperties();}
 redo(){if(!this.redoStack.length)return;this.undoStack.push(clone(this.template));this.template=this.redoStack.pop();this.changed();this.drawProperties();}
 previewValues(){const values={};for(const m of fields(this.template))values[m.field]=this.sample==='empty'?'':m.type==='title'?(this.sample==='long'?'低温精馏联合连续气体分离与资源循环利用技术':'低温空分'):m.type==='summary'?(this.sample==='long'?'用于验证长摘要的自动换行和截断显示，原始字段内容不会被截断保存。'.repeat(4):'净化空气 → 氧气／氮气'):m.field==='materials'?'8 份':m.field==='research'?'120':'示例值';return values;}
 paint(){
  if(!this.board)return;if(this.cardDrag?.svg?.isConnected&&this.cardDrag.layer?.isConnected){this.paintCardResize();return;}this.cardHandle.hidden=this.preview;this.paintBoardSize();this.board.style.backgroundSize=this.template.grid*this.zoom+'px '+this.template.grid*this.zoom+'px';this.board.toggleClass('is-preview',this.preview);
  const outside=outsideModules(this.template);
  try{const rendered=this.plugin.render(this,this.template,this.previewValues());replaceSvg(this.board,rendered.svg);this.renderStatus={fontMessage:rendered.fontMessage,overflow:rendered.overflow};this.paintStatus(outside);}catch(e){this.board.textContent=e.message;}
  if(!this.preview)for(const m of this.template.modules){const box=this.board.createDiv({cls:'tt-module-hit'+(m.id===this.selected?' is-selected':''),attr:{'data-module-id':m.id,'aria-label':m.label||labels[m.type]}});Object.assign(box.style,{left:m.x*this.zoom+'px',top:m.y*this.zoom+'px',width:m.w*this.zoom+'px',height:m.h*this.zoom+'px'});if(m.id===this.selected)box.createDiv({cls:'tt-resize-handle',attr:{'data-resize':'true'}});box.classList.toggle('is-outside',outside.includes(m));}
  this.plugin.hintRoot(this.board);
  this.undoButton.disabled=!this.undoStack.length;this.redoButton.disabled=!this.redoStack.length;
 }
 paintBoardSize(){this.sizeReadout.textContent=tidyNumber(this.template.width)+' × '+tidyNumber(this.template.height);this.board.style.width=this.template.width*this.zoom+'px';this.board.style.height=this.template.height*this.zoom+'px';}
 paintStatus(outside){const {fontMessage='',overflow=[]}=this.renderStatus??{};this.message.textContent=(this.dirty?'未保存的模板草稿':'已保存模板')+(fontMessage?' · '+fontMessage:'')+(outside.length?' · 超出卡片边界：'+outside.map(m=>m.label||m.id).join('、')+'。请扩大外框或调整模块后保存。':'')+(overflow.length?' · 文字溢出：'+overflow.map(id=>this.template.modules.find(m=>m.id===id)?.label||id).join('、'):'');}
 paintCardResize(){
  const d=this.cardDrag;if(!d?.svg?.isConnected||!d.layer?.isConnected){this.paint();return;}
  this.paintBoardSize();const t=this.template;d.svg.setAttribute('width',String(t.width));d.svg.setAttribute('height',String(t.height));d.svg.setAttribute('viewBox',`0 0 ${t.width} ${t.height}`);
  const clean=replaceSvg(d.staging,`<svg xmlns="http://www.w3.org/2000/svg">${renderFrame(t)}</svg>`);d.layer.replaceChildren(...clean.childNodes);
  const outside=outsideModules(t);for(const box of this.board.querySelectorAll('[data-module-id]'))box.classList.toggle('is-outside',outside.some(m=>m.id===box.dataset.moduleId));this.paintStatus(outside);
 }
 drawLibrary(){
  const root=this.library;root.empty();root.createEl('h3',{text:'模块库'});root.createEl('p',{text:'拖入卡片，或点击添加。'});
  const entry=(key,label,icon)=>{const b=root.createEl('button',{attr:{draggable:'true','data-module-type':key,'aria-label':label}});if(icon)replaceSvg(b.createSpan({cls:'tt-library-icon'}),iconSVG(icon));b.createSpan({text:label});b.disabled=this.preview;b.onclick=()=>this.addModule(key);b.ondragstart=ev=>{if(this.preview){ev.preventDefault();return;}ev.dataTransfer.setData('application/x-tech-module',key);ev.dataTransfer.effectAllowed='copy';this.dragModule={key,module:this.moduleAt(key)};const blank=this.contentEl.ownerDocument.createElement('canvas');blank.width=blank.height=1;ev.dataTransfer.setDragImage(blank,0,0);};b.ondragend=()=>this.clearDropPreview();return b;};
  for(const [type,label]of Object.entries(labels))entry(type,label,type==='icon'?'atom':null);
  root.createEl('h3',{text:'我的模块'});root.createEl('p',{text:'选中卡片里的模块，在右侧保存为预设。'});
  for(const preset of this.plugin.data.modulePresets??[]){const row=root.createDiv({cls:'tt-preset-row'});const b=entry('preset:'+preset.id,preset.name,preset.module.type==='icon'?preset.module.icon:null);row.appendChild(b);const remove=row.createEl('button',{text:'×',attr:{type:'button','aria-label':'移除预设 '+preset.name}});remove.onclick=async()=>{if(!await confirmAction(this.app,'从我的模块移除“'+preset.name+'”？已有卡片不受影响。'))return;const previous=this.plugin.data.modulePresets;this.plugin.data.modulePresets=previous.filter(p=>p.id!==preset.id);try{await this.plugin.persist();this.drawLibrary();}catch(e){this.plugin.data.modulePresets=previous;this.plugin.error(e);}};}
  this.plugin.hintRoot(root);
 }
 saveModulePreset(){const module=this.template.modules.find(m=>m.id===this.selected);if(!module)return;const modal=new ModulePresetModal(this,module);modal.open();}
 clearDropPreview(end=true){if(this.dropFrame)this.contentEl.ownerDocument.defaultView.cancelAnimationFrame(this.dropFrame);this.dropFrame=null;this.dropGhost?.remove();this.dropGhost=null;this.dropPoint=null;if(end)this.dragModule=null;}
 paintDropPreview(){if(!this.dragModule||!this.dropPoint||this.preview)return;const r=this.board.getBoundingClientRect(),m=this.moduleAt(this.dragModule.key,(this.dropPoint.x-r.left)/this.zoom,(this.dropPoint.y-r.top)/this.zoom);if(!m)return;const signature=JSON.stringify([m.x,m.y,this.zoom]);if(this.dropGhost?.isConnected&&this.dropGhost.dataset.position===signature)return;
  this.dropGhost?.remove();const ghost=this.dropGhost=this.board.createDiv({cls:'tt-module-drop-preview',attr:{'aria-hidden':'true','data-position':signature}});
  const t={...this.template,background:'transparent',border:'transparent',appearance:{...this.template.appearance,strokeWidth:0},modules:[m]};replaceSvg(ghost,this.plugin.render(this,t,this.previewValues()).svg);
  const box=ghost.createDiv({cls:'tt-drop-outline'});Object.assign(box.style,{left:m.x*this.zoom+'px',top:m.y*this.zoom+'px',width:m.w*this.zoom+'px',height:m.h*this.zoom+'px'});
 }
 moduleAt(type,x=16,y=16){
  const preset=type.startsWith('preset:')?this.plugin.data.modulePresets?.find(p=>p.id===type.slice(7)):null;if(!labels[type]&&!preset)return null;
  const w=type==='icon'?40:type==='button'?80:type==='divider'?Math.min(240,this.template.width):Math.min(160,this.template.width),h=type==='icon'?40:type==='divider'?8:type==='summary'?48:32;
  const definition=this.dragModule?.key===type?{module:this.dragModule.module}:preset??{module:{type,field:type==='title'?'title':type==='summary'?'summary':'field_'+uid().slice(0,8),label:labels[type],action:'details',icon:'atom',x:0,y:0,w,h,fontSize:moduleDefaultFontSize(type),color:'#334155',align:'left'}};
  return placePreset(definition,this.template,x,y,{allowOverflow:true});
 }
 insertModule(module){this.edit(t=>t.modules.push(module));this.selected=module.id;this.propertyTab='module';this.paint();this.drawProperties();}
 addModule(type,x=16,y=16){if(this.preview)return;try{const module=this.moduleAt(type,x,y);if(module)this.insertModule(module);}catch(e){this.plugin.error(e);}}
 adjustViewport(){
  if(this.zoomModeReadout)this.zoomModeReadout.textContent=this.zoomMode==='manual'?'手动缩放':'自动适配';
  if(this.cardDrag||!this.viewport?.isConnected||!this.viewport.clientWidth||!this.viewport.clientHeight)return;
  const fit=Math.max(.02,Math.min((this.viewport.clientWidth-48)/this.template.width,(this.viewport.clientHeight-48)/this.template.height)),zoom=Math.max(.02,Math.floor((this.zoomMode==="manual"?(this.preferredZoom??1):Math.min(this.preferredZoom??1,fit))*100)/100);
  if(this.zoom!==zoom){this.zoom=zoom;for(const option of [...this.zoomSelect.options])if(option.dataset?.dynamicZoom)option.remove();if(![...this.zoomSelect.options].some(o=>Number(o.value)===zoom))this.zoomSelect.createEl('option',{value:String(zoom),text:Math.round(zoom*100)+'%',attr:{'data-dynamic-zoom':'true'}});this.zoomSelect.value=String(zoom);this.paint();}this.centerCard();
 }
 fitCard(){this.preferredZoom=2;this.zoomMode="fit";this.adjustViewport();}
 centerCard(){this.viewport.scrollLeft=(this.viewport.scrollWidth-this.viewport.clientWidth)/2;this.viewport.scrollTop=(this.viewport.scrollHeight-this.viewport.clientHeight)/2;}
 startCardResize(ev){if(this.preview||this.cardDrag||ev.button!==0||!ev.target.closest('[data-card-resize]'))return;ev.preventDefault();ev.stopPropagation();const r=this.frame.getBoundingClientRect(),s=this.surface.getBoundingClientRect(),svg=this.board.querySelector(':scope > svg');this.cardDrag={before:clone(this.template),x:ev.clientX,y:ev.clientY,pointerId:ev.pointerId,zoom:this.zoom,svg,layer:svg?.querySelector(':scope > g'),staging:this.board.ownerDocument.createElement('div')};this.surface.style.width=s.width+'px';this.surface.style.height=s.height+'px';Object.assign(this.frame.style,{position:'absolute',left:r.left-s.left+'px',top:r.top-s.top+'px'});this.frame.setPointerCapture(ev.pointerId);this.cardHandle.focus();}
 cardResizePoint(ev){const d=this.cardDrag;if(!d||ev.pointerId!==d.pointerId)return;d.next={width:Math.max(80,Math.min(2400,d.before.width+(ev.clientX-d.x)/d.zoom)),height:Math.max(64,Math.min(2400,d.before.height+(ev.clientY-d.y)/d.zoom))};}
 moveCardResize(ev){const d=this.cardDrag;if(!d||ev.pointerId!==d.pointerId)return;this.cardResizePoint(ev);if(d.frame!=null)return;d.frame=this.contentEl.ownerDocument.defaultView.requestAnimationFrame(()=>{d.frame=null;if(this.cardDrag!==d||!this.board?.isConnected)return;const next=d.next;if(next.width===this.template.width&&next.height===this.template.height)return;resizeTemplate(this.template,next.width,next.height);this.paintCardResize();});}
 endCardResize(cancel=false,ev){
  const d=this.cardDrag;if(!d||(ev&&ev.pointerId!==d.pointerId))return;const win=this.contentEl.ownerDocument.defaultView;if(d.frame!=null)win.cancelAnimationFrame(d.frame);if(ev?.pointerId===d.pointerId)this.cardResizePoint(ev);
  if(cancel)this.template=d.before;else if(d.next){const snap=(n,original)=>n===original?original:Math.round(n/d.before.grid)*d.before.grid;resizeTemplate(this.template,Math.max(80,Math.min(2400,snap(d.next.width,d.before.width))),Math.max(64,Math.min(2400,snap(d.next.height,d.before.height))));try{validateTemplate(this.template,{allowOverflow:true});}catch(e){this.template=d.before;cancel=true;this.plugin.error(e);}}
  this.cardDrag=null;if(this.frame.hasPointerCapture(d.pointerId))this.frame.releasePointerCapture(d.pointerId);for(const key of ['position','left','top'])this.frame.style.removeProperty(key);this.surface.style.removeProperty('width');this.surface.style.removeProperty('height');
  if(!cancel&&(this.template.width!==d.before.width||this.template.height!==d.before.height))this.remember(d.before);else{this.paint();this.adjustViewport();}this.drawProperties();
 }
 removeSelected(){this.edit(t=>t.modules=t.modules.filter(m=>m.id!==this.selected));this.selected=null;this.paint();this.drawProperties();}
 pointerDown(ev){if(this.preview||ev.button!==0)return;const box=ev.target.closest('[data-module-id]');this.selected=box?.dataset.moduleId??null;this.propertyTab=this.selected?'module':'appearance';if(!box){this.paint();this.drawProperties();return;}const m=this.template.modules.find(m=>m.id===this.selected);this.drag={before:clone(this.template),module:clone(m),x:ev.clientX,y:ev.clientY,resize:!!ev.target.closest('[data-resize]')};this.board.setPointerCapture(ev.pointerId);this.board.focus();ev.preventDefault();this.paint();this.drawProperties();}
 pointerMove(ev){if(!this.drag)return;const d=this.drag,m=this.template.modules.find(m=>m.id===d.module.id),g=this.template.grid,snap=n=>Math.round(n/g)*g,dx=(ev.clientX-d.x)/this.zoom,dy=(ev.clientY-d.y)/this.zoom;
  if(d.resize){m.w=Math.max(8,Math.min(this.template.width-m.x,snap(d.module.w+dx)));m.h=Math.max(8,Math.min(this.template.height-m.y,snap(d.module.h+dy)));}else{m.x=Math.max(0,Math.min(this.template.width-m.w,snap(d.module.x+dx)));m.y=Math.max(0,Math.min(this.template.height-m.h,snap(d.module.y+dy)));}this.paint();}
 pointerEnd(){if(!this.drag)return;const before=this.drag.before;this.drag=null;this.remember(before);this.drawProperties();}
 drawProperties(){drawTemplateProperties(this);this.plugin.hintRoot(this.properties);}
 async manageTemplate(action,id,name){
  const p=this.plugin;if(p.templateWriteBusy)throw Error('模板正在保存，请稍后再试');const all=p.data.templates,target=all.find(t=>t.id===id);if(!target)throw Error('模板已不存在，请重新打开管理列表');
  const views=p.app.workspace.getLeavesOfType(TEMPLATE_VIEW).map(l=>l.view).filter(v=>v instanceof TemplateView);
  if(['rename','delete'].includes(action)&&(p.data.templateDraft?.id===id||views.some(v=>v.dirty&&v.template.id===id)))throw Error('此模板有未保存草稿，请先保存草稿再重命名或删除');
  let next=all,nextDefault=p.data.defaultTemplate,result=target;
  if(action==='rename'){name=String(name??'').trim();if(!name||name.length>60)throw Error('模板名称需为 1–60 个字符');result={...clone(target),name};next=all.map(t=>t.id===id?result:t);}
  else if(action==='copy'){let base=target.name.slice(0,45)+' · 副本',label=base,n=2;while(all.some(t=>t.name===label))label=base+' '+n++;result={...clone(target),id:uid(),version:1,name:label};next=[...all,result];}
  else if(action==='default')nextDefault=id;
  else if(action==='delete'){const remaining=p.templates().filter(t=>t.id!==id);if(!remaining.length)throw Error('至少保留一个可用模板');next=all.filter(t=>t.id!==id);if(nextDefault===id)nextDefault=remaining[0].id;}
  else throw Error('未知模板操作');
  const previousDefault=p.data.defaultTemplate;p.templateWriteBusy=true;p.data.templates=next;p.data.defaultTemplate=nextDefault;
  try{await p.persist();}catch(e){p.data.templates=all;p.data.defaultTemplate=previousDefault;throw e;}finally{p.templateWriteBusy=false;}
  for(const v of views){if(v.dirty)continue;if(action==='delete'&&v.template.id===id){v.template=clone(p.defaultTemplate());v.selected=null;v.undoStack=[];v.redoStack=[];}else if(action==='rename'&&v.template.id===id)v.template.name=result.name;v.build();}
  return result;
 }
 async save(asNew=false){
  if(this.plugin.templateWriteBusy)throw Error('模板正在保存，请稍后再试');validateTemplate(this.template);const saved=clone(this.template),all=this.plugin.data.templates,previousDraft=this.plugin.data.templateDraft;
  if(asNew){saved.id=uid();saved.version=1;if(all.some(t=>t.name===saved.name))saved.name+=' · 副本';}
  else saved.version=(all.find(t=>t.id===saved.id)?.version??0)+1;
  const next=all.filter(t=>t.id!==saved.id);next.push(saved);this.plugin.data.templates=next;delete this.plugin.data.templateDraft;
  this.plugin.templateWriteBusy=true;try{await this.plugin.persist();}catch(e){this.plugin.data.templates=all;if(previousDraft===undefined)delete this.plugin.data.templateDraft;else this.plugin.data.templateDraft=previousDraft;throw e;}finally{this.plugin.templateWriteBusy=false;}this.template=clone(saved);this.dirty=false;this.undoStack=[];this.redoStack=[];this.build();new Notice('模板已保存；已有节点保持原样。');return saved;
 }
}
export class ApplyTemplateModal extends Modal{
 constructor(plugin,view,node){super(plugin.app);this.plugin=plugin;this.view=view;this.node=node;this.target=plugin.target(view,[node]);this.template=plugin.templates().find(t=>t.id===node.customData.techTree.templateId)??plugin.defaultTemplate();}
 onOpen(){this.modalEl.addClass('tt-node-modal');this.contentEl.createEl('h2',{text:'应用模板新版'});const select=this.contentEl.createEl('select');for(const t of this.plugin.templates())select.createEl('option',{value:t.id,text:t.name+' · v'+t.version});select.value=this.template.id;const before=this.contentEl.createDiv({cls:'tt-node-preview'});before.createEl('p',{text:'当前节点'});const image=before.createDiv();this.repaint=()=>replaceSvg(image,this.plugin.render(this.view,this.node.customData.techTree.template,this.node.customData.techTree.values).svg);this.repaint();this.after=this.contentEl.createDiv({cls:'tt-node-preview'});this.note=this.contentEl.createEl('p');select.onchange=()=>{this.template=this.plugin.templates().find(t=>t.id===select.value);this.drawAfter();};this.drawAfter();const row=this.contentEl.createDiv({cls:'tt-actions'});row.createEl('button',{text:'取消'}).onclick=()=>this.close();const save=row.createEl('button',{text:'确认应用',cls:'mod-cta'});save.onclick=async()=>{save.disabled=true;try{this.plugin.checkTarget(this.view,this.target);await this.plugin.update(this.view,this.node,this.template,this.node.customData.techTree.values,this.node.link,true);this.close();}catch(e){this.plugin.error(e);}finally{save.disabled=false;}};}
 drawAfter(){replaceSvg(this.after,this.plugin.render(this.view,this.template,this.node.customData.techTree.values).svg);this.note.textContent=`应用后尺寸：${Math.round(this.node.width)} × ${Math.round(this.node.width*this.template.height/this.template.width)}。位置、已有字段和关联保持；高度改变可能需要手动调整排版。`;}
 onClose(){if(this.plugin.modal===this)this.plugin.modal=null;window.setTimeout(()=>{if(this.plugin.live(this.view))this.view.containerEl.querySelector('.excalidraw')?.focus();},50);}
}

class ModulePresetModal extends Modal{
 constructor(view,module){super(view.app);this.view=view;this.module=clone(module);}
 onOpen(){this.contentEl.createEl('h2',{text:'保存到我的模块'});this.contentEl.createEl('p',{text:'保留这个模块的类型、文字、图标、颜色和尺寸，可在其他模板中再次使用。'});const label=this.contentEl.createEl('label',{cls:'tt-form-label',text:'预设名称'}),input=label.createEl('input',{type:'text',attr:{maxlength:'60'}});input.value=this.module.label||labels[this.module.type];const status=this.contentEl.createDiv({cls:'tt-warning'}),row=this.contentEl.createDiv({cls:'tt-actions'});row.createEl('button',{text:'取消'}).onclick=()=>this.close();const save=row.createEl('button',{text:'保存预设',cls:'mod-cta'});save.onclick=async()=>{save.disabled=true;const p=this.view.plugin,previous=p.data.modulePresets;try{const preset=modulePreset(this.module,input.value);p.data.modulePresets=[...(previous??[]),preset];await p.persist();for(const leaf of p.app.workspace.getLeavesOfType(TEMPLATE_VIEW))leaf.view.drawLibrary?.();this.close();}catch(e){p.data.modulePresets=previous;status.textContent=e.message;}finally{save.disabled=false;}};input.focus();}
}

class TemplateManagerModal extends Modal{
 constructor(plugin,view=null){super(plugin.app);this.view=view;this.plugin=plugin;this.scope=new Scope(this.app.scope);this.scope.register([],'Escape',()=>{if(this.renaming){if(!this.busy){const id=this.renaming.id;this.renaming=null;this.draw();this.focusRename(id);}}else this.close();return false;});}
 onOpen(){(this.plugin.templateManagers??=new Set()).add(this);this.modalEl.addClass('tt-template-manager');this.titleEl.setText('管理卡片模板');this.titleEl.tabIndex=-1;this.contentEl.createEl('p',{cls:'tt-muted',text:'预览使用示例内容。点击编辑或重命名后才进入修改；已有卡片保持原样。'});this.status=this.contentEl.createDiv({cls:'tt-warning',attr:{role:'status'}});this.list=this.contentEl.createDiv({cls:'tt-template-manager-list'});this.draw();this.titleEl.focus({preventScroll:true});}
 draw(){const scrollTop=this.contentEl.scrollTop;this.list.empty();for(const t of this.plugin.templates()){const editing=this.renaming?.id===t.id,row=this.list.createDiv({cls:'tt-template-manager-row',attr:{'data-template-id':t.id}}),preview=row.createDiv({cls:'tt-template-thumbnail'});preview.createEl('img',{attr:{alt:t.name+'的卡片预览',draggable:'false',width:String(t.width),height:String(t.height),'data-template-preview':t.id}});const info=row.createDiv({cls:'tt-template-manager-info'}),heading=info.createDiv({cls:'tt-template-heading'});let input;
 if(editing){input=heading.createEl('input',{cls:'tt-template-name',type:'text',attr:{'aria-label':'模板新名称：'+t.name,maxlength:'60'}});input.value=this.renaming.value;input.oninput=()=>this.renaming.value=input.value;}
 else heading.createEl('strong',{cls:'tt-template-name',text:t.name});
 if(t.id===this.plugin.data.defaultTemplate)heading.createSpan({cls:'tt-template-default',text:'默认模板'});
 info.createEl('p',{cls:'tt-muted',text:t.width+' × '+t.height+' · '+t.modules.length+' 个模块 · v'+t.version});const actions=row.createDiv({cls:'tt-actions'});
 const button=(label,fn)=>{const b=actions.createEl('button',{text:label});b.onclick=()=>this.run(fn);b.disabled=!!this.renaming;return b;};
 if(editing){const save=button('保存名称',async()=>{await this.manage('rename',t.id,input.value);this.renaming=null;});save.disabled=false;save.addClass('mod-cta');const cancel=actions.createEl('button',{text:'取消'});cancel.onclick=()=>{if(this.busy)return;this.renaming=null;this.draw();this.focusRename(t.id);};input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();save.click();}};}
 else{
 button('编辑',async()=>{let view=this.view??this.plugin.app.workspace.getLeavesOfType(TEMPLATE_VIEW).map(l=>l.view).find(v=>v instanceof TemplateView);if((view?.dirty||(!view&&this.plugin.data.templateDraft))&&!await confirmAction(this.app,'放弃当前模板草稿，打开“'+t.name+'”？'))return;const target=this.plugin.templates().find(x=>x.id===t.id);if(!target)throw Error('模板已不存在');if(!view){await this.plugin.openTemplates();view=this.plugin.app.workspace.getLeavesOfType(TEMPLATE_VIEW)[0]?.view;}if(!(view instanceof TemplateView))throw Error('模板中心暂不可用');view.template=clone(target);view.resetEditing();this.close();if(!this.view)this.app.setting?.close();await this.plugin.openTemplates();});
 const rename=actions.createEl('button',{text:'重命名',attr:{'data-rename':t.id}});rename.disabled=!!this.renaming;rename.onclick=()=>{if(this.busy||this.renaming)return;this.renaming={id:t.id,value:t.name};this.status.textContent='';this.draw();const input=this.list.querySelector('input');input?.focus({preventScroll:true});input?.select();};
 }
 button('复制',()=>this.manage('copy',t.id));button('设为默认',()=>this.manage('default',t.id)).disabled=!!this.renaming||t.id===this.plugin.data.defaultTemplate;
 button('删除',async()=>{const fallback=this.plugin.templates().find(x=>x.id!==t.id);if(!fallback)throw Error('至少保留一个可用模板');if(!await confirmAction(this.app,'删除模板“'+t.name+'”？已有卡片保持原样。'+(this.plugin.data.defaultTemplate===t.id?'默认模板将改为“'+fallback.name+'”。':'')))return;await this.manage('delete',t.id);}).disabled=!!this.renaming||this.plugin.templates().length===1;
 }this.refreshPreviews();this.contentEl.scrollTop=scrollTop;}
 focusRename(id){[...this.list.querySelectorAll('[data-rename]')].find(b=>b.dataset.rename===id)?.focus();}
 refreshPreviews(){if(!this.list?.isConnected)return;for(const img of this.list.querySelectorAll('[data-template-preview]')){const t=this.plugin.templates().find(t=>t.id===img.dataset.templatePreview);if(!t)continue;try{const values=TemplateView.prototype.previewValues.call({template:t}),rendered=this.plugin.render(this,t,values,true);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(rendered.svg);img.title=rendered.fontMessage||'示例内容，仅供预览';}catch(e){img.removeAttribute('src');img.alt='预览暂不可用：'+e.message;}}}
 async run(fn){if(this.busy)return;this.busy=true;this.status.textContent='';for(const b of this.list.querySelectorAll('button'))b.disabled=true;try{await fn();if(this.contentEl.isConnected)this.draw();}catch(e){if(this.contentEl.isConnected){this.status.textContent=e.message;this.draw();}}finally{this.busy=false;}}
 manage(action,id,name){return TemplateView.prototype.manageTemplate.call(this.view??{plugin:this.plugin},action,id,name);}
 onClose(){if(this.view)this.view.managerModal=null;this.plugin.templateManagers?.delete(this);this.contentEl.empty();this.onClosed?.();}
}

