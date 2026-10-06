import {replaceSvg} from './svg-dom.js';
import {NativeArrowDefaults} from './native-arrow-defaults.js';
import {Hints} from './ui-hints.js';
import {RadialMenu} from './radial-menu.js';
import {radialConfig} from './radial-model.js';
import {openRadialEditor} from './radial-editor.js';
import {TECH_ICON,TECH_MARK} from './icons.js';
import {Plugin,Component,Notice,SuggestModal,requestUrl,addIcon,View} from 'obsidian';
import {dependencyState} from './dependency.js';
import {DEFAULT_TEMPLATE,clone,isTech,instance,renderNode,svgData,hitNode,hitButton,validateTemplate,moduleText} from './model.js';
import {safeLinkPart,parseLink} from './sections.js';
import {DetailPanel} from './panel.js';
import {NodeModal} from './node-modal.js';
import {TemplateView,TEMPLATE_VIEW,ApplyTemplateModal} from './template-view.js';
import {connectionStyle,applyConnectionStyle,bindAtSide} from './connection-style.js';
import {ConnectionStyleModal,ConnectionSettingTab} from './connection-ui.js';
import {DEFAULT_FONT,effectiveFont,fontStack,fontName,snapshotFont} from './fonts.js';
import {QuickPlacement} from './quick-placement.js';
import {NativeFonts} from './native-fonts.js';
import {FontModal} from './font-ui.js';
import {Assets} from './assets.js';
import {AssetModal} from './asset-ui.js';
import {FontSubset} from './font-subset.js';
const pause=ms=>new Promise(r=>window.setTimeout(r,ms));
export default class TechTreePlugin extends Plugin{
 async onload(){
  addIcon(TECH_ICON,TECH_MARK);this.hints=new Map();
  const saved=await this.loadData();this.data={schema:1,templates:[clone(DEFAULT_TEMPLATE)],defaultTemplate:'builtin-tech',drafts:{},...saved};
  this.data.connectionStyle=connectionStyle(this.data.connectionStyle);
  this.data.radial=radialConfig(this.data.radial);
  this.colorPickers=new Set();this.fontPickers=new Set();this.data.fontFamily=fontName(this.data.fontFamily??DEFAULT_FONT);this.placement=null;
  this.canvasDocuments=new Set();this.scanUntil=0;this.owners=new Map();this.panels=new Map();this.busy=new Set();this.modal=null;this.origin=null;
  this.measureCache=new WeakMap();this.nativeFonts=new NativeFonts(this,async url=>(await requestUrl({url,method:'GET'})).arrayBuffer);this.fontRenders=new WeakMap();
  this.assets=new Assets(this);this.fontSubset=new FontSubset(this);
  this.registerEvent(this.app.workspace.on('editor-change',()=>this.assets.revision++));
  for(const event of ['create','modify','delete','rename'])this.registerEvent(this.app.vault.on(event,file=>{this.assets.revision++;if(/\.excalidraw(?:\.md)?$/i.test(file.path))this.assets.schedule();}));
  this.assets.schedule();
  this.addCommand({id:'manage-resources',name:'资源管理：扫描与恢复附件',callback:()=>new AssetModal(this).open()});
  this.registerView(TEMPLATE_VIEW,leaf=>new TemplateView(leaf,this));
  this.addSettingTab(new ConnectionSettingTab(this));
  this.addCommand({id:'radial-settings',name:'编辑画布快捷轮盘',callback:()=>openRadialEditor(this)});
  this.addCommand({id:'font-settings',name:'字体设置',callback:()=>{if(this.modal)return;this.modal=new FontModal(this);this.modal.open();}});
  this.addCommand({id:'refresh-node-fonts',name:'更新选中节点字体',checkCallback:checking=>{const v=this.view();if(!this.selectedTechNodes(v).length)return false;if(!checking)this.refreshNodeFonts(v).catch(e=>this.error(e));return true;}});
  this.addCommand({id:'optimize-node-assets',name:'优化选中节点附件（保留字体设置）',checkCallback:checking=>{const v=this.view();if(!this.selectedTechNodes(v).length)return false;if(!checking)this.refreshNodeFonts(v,true).catch(e=>this.error(e));return true;}});
  this.addCommand({id:'connection-style',name:'默认连线样式',callback:()=>{if(this.modal)return;this.modal=new ConnectionStyleModal(this);this.modal.open();}});
  this.addCommand({id:'capture-connection-style',name:'将选中箭头设为默认连线',checkCallback:checking=>{const arrows=this.selectedArrows(this.view());if(arrows.length!==1)return false;if(!checking)this.saveConnectionStyle(arrows[0]).then(()=>new Notice('已保存选中箭头的样式，后续快捷连线将沿用')).catch(e=>this.error(e));return true;}});
  this.addCommand({id:'apply-connection-style',name:'应用默认样式到选中连线',checkCallback:checking=>{const v=this.view();if(!this.selectedArrows(v).length)return false;if(!checking)this.styleSelectedArrows(v).catch(e=>this.error(e));return true;}});
  this.addCommand({id:'template-center',name:'模板中心',callback:()=>this.openTemplates()});
  this.addCommand({id:'apply-template-version',name:'应用模板新版',checkCallback:checking=>{const v=this.view(),e=this.selected(v);if(!e)return false;if(!checking){if(this.modal)return true;const m=new ApplyTemplateModal(this,v,e);this.modal=m;m.open();}return true;}});
  this.addRibbonIcon(TECH_ICON,'科技树模板中心',()=>this.openTemplates());
  this.addCommand({id:'create-node',name:'新建科技节点',checkCallback:checking=>{const v=this.view();if(!v)return false;if(!checking)this.openNode(v);return true;}});
  this.addCommand({id:'edit-node',name:'编辑节点',checkCallback:checking=>{const v=this.view(),e=this.selected(v);if(!e)return false;if(!checking)this.openNode(v,e);return true;}});
  this.addCommand({id:'open-details',name:'打开详情',checkCallback:checking=>{const v=this.view(),e=this.selected(v);if(!e)return false;if(!checking)this.details(v,e).catch(e=>this.error(e));return true;}});
  this.registerEvent(this.app.workspace.on('layout-change',()=>this.scheduleScan()));
  this.registerEvent(this.app.workspace.on('active-leaf-change',()=>this.scheduleScan()));
  this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>this.renameTargets(file,oldPath).catch(e=>this.error(e))));
  this.registerEvent(this.app.workspace.on('file-open',()=>this.scheduleScan()));
  this.app.workspace.onLayoutReady(()=>{if(!this.stopped)this.scheduleScan();});this.scheduleScan();
 }
 hintRoot(root){const doc=root.ownerDocument;if(!this.hints.has(doc))this.hints.set(doc,new Hints(doc));this.hints.get(doc).refresh(root);}
 onunload(){this.stopped=true;this.assets?.destroy();for(const modal of this.resourceModals??[])modal.close();for(const modal of this.templateManagers??[])modal.close();for(const picker of this.iconPickers??[])picker.close();this.fontSubset?.destroy();window.clearTimeout(this.scanTimer);for(const hints of this.hints.values())hints.destroy();this.hints.clear();this.nativeFonts.destroy();for(const picker of this.colorPickers)picker.close();for(const picker of this.fontPickers)picker.close();this.cancelPlacement();for(const [v,o]of this.owners)v.removeChild(o);this.owners.clear();for(const p of this.panels.values())p.destroy();this.panels.clear();this.modal?.close();}
 error(e){console.error('[科技树]',e);new Notice(e.message??String(e));}
 requireExcalidraw(doc){const state=dependencyState(this,doc);if(!state.ready)throw Error(state.message);return state;}
 view(){const v=this.app.workspace.getActiveViewOfType(View);return this.live(v)&&v?.getViewType?.()==='excalidraw'&&v._loaded?v:null;}
 live(v){return !this.stopped&&dependencyState(this).ready&&v?.leaf?.view===v&&v.file&&v.excalidrawAPI&&!v.excalidrawAPI.getAppState().viewModeEnabled;}
 // Capture before asynchronous preparation; a live view may already show another file.
 target(v,nodes=[]){
  this.requireExcalidraw(v?.containerEl?.ownerDocument);
  if(!this.live(v))throw Error('画布已关闭或不可编辑');
  const target={file:v.file,path:v.file.path,api:v.excalidrawAPI,nodes:nodes.map(e=>({id:e.id,state:JSON.stringify(e)}))};this.checkTarget(v,target);return target;
 }
 checkTarget(v,target,checkNodes=true){
  if(!this.live(v)||v.file!==target.file||v.file.path!==target.path||v.excalidrawAPI!==target.api)throw Error('原画布已切换、关闭或不可编辑，请回到原绘图重试');
  if(checkNodes){const scene=new Map(target.api.getSceneElements().map(e=>[e.id,e]));for(const saved of target.nodes){const current=scene.get(saved.id);if(!current||current.isDeleted||current.locked||JSON.stringify(current)!==saved.state)throw Error('节点或连线已改变、删除或锁定，请重新打开后重试');}}
 }
 ea(v){return this.requireExcalidraw(v.containerEl.ownerDocument).api.getAPI(v);}
 selected(v){if(!v?.excalidrawAPI)return null;const s=v.excalidrawAPI.getAppState(),es=v.excalidrawAPI.getSceneElements().filter(e=>s.selectedElementIds[e.id]);return es.length===1&&isTech(es[0])&&!es[0].locked?es[0]:null;}
 selectedTechNodes(v){if(!v?.excalidrawAPI)return [];const ids=v.excalidrawAPI.getAppState().selectedElementIds;return v.excalidrawAPI.getSceneElements().filter(e=>ids[e.id]&&isTech(e)&&!e.locked);}
 async refreshNodeFonts(v,preserveFont=false){
  if(this.busy.has(v))throw Error('画布正在保存');const nodes=this.selectedTechNodes(v),target=this.target(v,nodes);this.busy.add(v);let work;
  try{work=this.ea(v);for(const node of nodes){
   const template=preserveFont?clone(node.customData.techTree.template):snapshotFont(node.customData.techTree.template,this.data.fontFamily,true),asset=await this.renderAsset(v,template,node.customData.techTree.values,target);
   const fresh=await this.addAsset(v,work,asset,node.x,node.y,target);this.checkTarget(v,target);
   const fileId=work.getElement(fresh).fileId;delete work.elementsDict[fresh];work.copyViewElementsToEAforEditing([node]);const e=work.getElement(node.id);e.fileId=fileId;e.customData={...e.customData,techTree:instance(template,node.customData.techTree.values)};
   }if(nodes.length)await this.commit(v,work,target);new Notice(`已${preserveFont?'优化':'更新'} ${nodes.length} 个节点的${preserveFont?'附件':'字体'}，可撤销`);
  }finally{try{work?.destroy();}finally{this.busy.delete(v);}}
 }
 cancelPlacement(){this.placement?.destroy();this.placement=null;}
 finishPlacement(){const gesture=this.placement;this.placement=null;if(!gesture)return;gesture.destroy();gesture.finish().catch(e=>this.error(e));}
 selectedArrows(v){if(!v?.excalidrawAPI)return [];const s=v.excalidrawAPI.getAppState();return v.excalidrawAPI.getSceneElements().filter(e=>s.selectedElementIds[e.id]&&e.type==='arrow'&&!e.locked);}
 async saveConnectionStyle(style){const previous=this.data.connectionStyle;this.data.connectionStyle=connectionStyle(style);try{await this.persist();for(const o of this.owners.values())o.arrowDefaults?.sync(undefined,true);}catch(e){this.data.connectionStyle=previous;throw e;}}
 async styleSelectedArrows(v){
  if(!this.live(v)||this.busy.has(v))throw Error('画布不可编辑或正在保存，请稍后重试');const selected=this.selectedArrows(v);if(!selected.length)return;const target=this.target(v,selected);this.busy.add(v);let work;
  try{work=this.ea(v);const elements=new Map(v.excalidrawAPI.getSceneElements().map(e=>[e.id,e]));work.copyViewElementsToEAforEditing(selected);for(const e of work.getElements())applyConnectionStyle(e,this.data.connectionStyle,elements);await this.commit(v,work,target);new Notice(`已更新 ${selected.length} 条连线，可用 Ctrl+Z 撤销`);}finally{try{work?.destroy();}finally{this.busy.delete(v);}}
 }
 templates(){return this.data.templates.filter(t=>{try{validateTemplate(t);return true;}catch{return false;}});}
 defaultTemplate(){return this.templates().find(t=>t.id===this.data.defaultTemplate)??this.templates()[0]??clone(DEFAULT_TEMPLATE);}
 render(v,t,values,embedFonts=false){
  const doc=v?.containerEl?.ownerDocument??document;let context=this.measureCache.get(doc);
  if(!context){context=doc.createElement('canvas').getContext('2d');this.measureCache.set(doc,context);}
  const font=effectiveFont(t,this.data.fontFamily),prepare=(size,weight)=>context.font=`${weight??400} ${size}px ${fontStack(font)}`;
  const measure=(text,size,weight)=>{prepare(size,weight);return context.measureText(text).width;};measure.metrics=(size,weight,text)=>{prepare(size,weight);const m=context.measureText(text||'Ag');return {ascent:m.actualBoundingBoxAscent||size*.8,descent:m.actualBoundingBoxDescent||size*.2};};
  const plan=this.nativeFonts.plan(doc,font,t.modules.map(m=>moduleText(m,values??{})).join('')+'…');
  if(!this.nativeFonts.ready(doc,plan)&&plan.available&&!plan.pending?.some(f=>this.nativeFonts.cache?.failures.has(f.url))){
   if(!this.fontRenders.has(doc)){const pending=this.nativeFonts.ensure(doc,plan).then(()=>{this.fontRenders.delete(doc);if(this.stopped)return;for(const leaf of this.app.workspace.getLeavesOfType(TEMPLATE_VIEW))leaf.view.paint?.();this.modal?.repaint?.();this.modal?.drawAfter?.();for(const manager of this.templateManagers??[])manager.refreshPreviews();const placement=this.placement,source=placement?.source();if(source)replaceSvg(placement.card,this.render(placement.view,source.customData.techTree.template,{}).svg);}).catch(e=>{this.fontRenders.delete(doc);if(!this.stopped)this.error(e);});this.fontRenders.set(doc,pending);}
  }
  return {...renderNode(t,values,measure,font,embedFonts?plan.css:'',{allowOverflow:v?.getViewType?.()===TEMPLATE_VIEW}),fontMessage:plan.missingCJK?'原生中文字体资源不可用，请检查 Excalidraw 版本或选择其他字体':plan.pending?.length?(plan.pending.some(f=>this.nativeFonts.cache?.failures.has(f.url))?'中文手写字体未就绪，请联网后重新选择字体或保存重试':'正在准备中文手写字体…'):''};
 }
 async renderAsset(v,t,values,target=this.target(v)){
  this.checkTarget(v,target);this.nativeFonts.cache?.retry();const doc=v.containerEl.ownerDocument,font=effectiveFont(t,this.data.fontFamily);
   await this.nativeFonts.ensure(doc,this.nativeFonts.plan(doc,font,t.modules.map(m=>moduleText(m,values??{})).join('')+'…'));this.checkTarget(v,target);const asset=this.render(v,t,values,true);if(this.fontSubset)asset.svg=await this.fontSubset.compact(asset.svg);this.checkTarget(v,target);asset.title=moduleText(t.modules.find(m=>m.type==='title')??{type:'text',label:'未命名科技'},values??{});return asset;
  }
 async addAsset(v,work,asset,x,y,target){
  const imageFile=this.assets?await this.assets.acquire(asset.svg,asset.title):svgData(asset.svg);this.checkTarget(v,target);
  return work.addImage({topX:x,topY:y,imageFile,scale:false,anchor:false});
 }
 async persist(){const snapshot=clone(this.data);this.persistTail=(this.persistTail??Promise.resolve()).catch(()=>{}).then(()=>this.saveData(snapshot));return this.persistTail;}
 scheduleScan(){if(this.stopped)return;this.scanUntil=Date.now()+30000;this.scan();}
 scan(){
  if(this.stopped)return;window.clearTimeout(this.scanTimer);this.scanTimer=null;
  const leaves=dependencyState(this).ready?this.app.workspace.getLeavesOfType('excalidraw'):[],views=new Set(leaves.map(l=>l.view));let pending=false;
  for(const o of this.owners.values())if(o.radial?.gesture&&!o.radial.valid())o.radial.cancel();
  if(this.placement&&(!this.live(this.placement.view)||this.placement.view.file!==this.placement.target.file||this.placement.view.excalidrawAPI!==this.placement.target.api||this.view()!==this.placement.view))this.cancelPlacement();
  for(const [v,o]of this.owners)if(!views.has(v)||v.leaf?.view!==v||o.file!==v.file||o.api!==v.excalidrawAPI){v.removeChild(o);this.owners.delete(v);}
  for(const leaf of leaves){const v=leaf.view,doc=v.containerEl?.ownerDocument;if(doc&&!this.canvasDocuments.has(doc)){this.canvasDocuments.add(doc);this.registerDomEvent(doc,'pointerdown',e=>{if(e.target.tagName?.toLowerCase()!=='canvas')return;const current=this.app.workspace.getLeavesOfType('excalidraw').map(l=>l.view).find(view=>view.containerEl?.contains(e.target));if(!current)return;const owner=this.owners.get(current);if(owner?.api===current.excalidrawAPI&&owner?.file===current.file)return;this.scan();this.owners.get(current)?.radial.down(e);},true);}
   if(v._loaded&&v.excalidrawAPI){if(!this.owners.has(v))this.attach(v);}else pending=true;
  }
  if(pending&&Date.now()<this.scanUntil)this.scanTimer=window.setTimeout(()=>this.scan(),100);
 }
 attach(v){
  const owner=new Component();owner.file=v.file;owner.api=v.excalidrawAPI;owner.targets=new Map();this.owners.set(v,owner);v.addChild(owner);
  owner.radial=new RadialMenu(this,v,owner);owner.arrowDefaults=new NativeArrowDefaults(this,v,owner);
  const doc=v.containerEl.ownerDocument;let down=null;
  const reflect=(elements,state)=>{
   if(this.placement?.view===v){if(v.file!==this.placement.target.file||v.excalidrawAPI!==this.placement.target.api||!elements.some(e=>e.id===this.placement.sourceId)||!state.selectedElementIds[this.placement.sourceId])this.cancelPlacement();else this.placement.paint();}
   for(const e of elements)if(isTech(e)&&e.link){try{owner.targets.set(e.id,this.resolve(e.link,v.file.path).file);}catch{/* A broken link has no resolvable target; the detail action reports it. */}}else owner.targets.delete(e.id);
   const selected=elements.filter(e=>state.selectedElementIds[e.id]);v.containerEl.toggleClass('tt-tech-selected',selected.length===1&&isTech(selected[0]));
   if(state.croppingElementId&&elements.some(e=>e.id===state.croppingElementId&&isTech(e)))v.excalidrawAPI.updateScene({appState:{croppingElementId:null},captureUpdate:'NEVER'});
  };
  owner.register(v.excalidrawAPI.onChange(reflect));owner.register(()=>v.containerEl.removeClass('tt-tech-selected'));
  reflect(v.excalidrawAPI.getSceneElements(),v.excalidrawAPI.getAppState());
  const canvas=ev=>v.containerEl.contains(ev.target)&&ev.target.tagName?.toLowerCase()==='canvas';
  const point=ev=>{const s=v.excalidrawAPI.getAppState();return {x:(ev.clientX-s.offsetLeft)/s.zoom.value-s.scrollX,y:(ev.clientY-s.offsetTop)/s.zoom.value-s.scrollY};};
  const hit=ev=>[...v.excalidrawAPI.getSceneElements()].reverse().find(e=>isTech(e)&&!e.locked&&hitNode(e,point(ev)));
  owner.registerDomEvent(doc,'pointerdown',ev=>{
   down=null;if(this.placement?.view===v)this.cancelPlacement();if(!this.live(v)||!canvas(ev)||ev.button!==0||ev.ctrlKey||ev.metaKey||ev.altKey||ev.shiftKey||v.excalidrawAPI.getAppState().activeTool.type!=='selection')return;
   const e=hit(ev);if(!e)return;const button=hitButton(e,point(ev));if(button)down={id:e.id,action:button.action,x:ev.clientX,y:ev.clientY,pointerId:ev.pointerId};
  },true);
  owner.registerDomEvent(doc,'pointerup',ev=>{
   const old=down;down=null;if(!old||ev.pointerId!==old.pointerId||Math.hypot(ev.clientX-old.x,ev.clientY-old.y)>4)return;
   const e=v.excalidrawAPI.getSceneElements().find(e=>e.id===old.id);if(!e||!hitButton(e,point(ev)))return;
   window.setTimeout(()=>{if(!this.live(v))return;if(old.action==='edit')this.openNode(v,e);else this.details(v,e).catch(e=>this.error(e));},0);
  },true);
  owner.registerDomEvent(doc,'pointercancel',()=>down=null,true);
  owner.registerDomEvent(doc,'dblclick',ev=>{
   if(!this.live(v)||!canvas(ev)||ev.button!==0||v.excalidrawAPI.getAppState().activeTool.type!=='selection')return;
   const e=hit(ev);if(!e)return;ev.preventDefault();ev.stopImmediatePropagation();this.openNode(v,e);
  },true);
  owner.registerDomEvent(doc,'keydown',ev=>{
   if(this.placement?.view===v&&ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();this.cancelPlacement();return;}
   if(!this.live(v)||this.modal||this.busy.has(v)||ev.isComposing||ev.altKey||ev.shiftKey)return;
   if(!v.containerEl.contains(ev.target)||ev.target.closest?.('input,textarea,[contenteditable="true"],.cm-editor,.tt-panel'))return;
   const state=v.excalidrawAPI.getAppState(),source=this.selected(v);if(!source||state.editingTextElement||state.activeTool.type!=='selection')return;
   if(ev.key==='Enter'&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();ev.stopImmediatePropagation();this.openNode(v,source);return;}
   if(!(ev.ctrlKey||ev.metaKey)||!/^Arrow(Up|Down|Left|Right)$/.test(ev.key))return;
   ev.preventDefault();ev.stopImmediatePropagation();if(ev.repeat)return;try{if(!this.placement)this.placement=new QuickPlacement(this,v,source);this.placement.move(ev.key.slice(5).toLowerCase());}catch(e){this.cancelPlacement();this.error(e);}
  },true);
  owner.registerDomEvent(doc,'keyup',ev=>{if(this.placement?.view===v&&['Control','Meta'].includes(ev.key)){ev.preventDefault();ev.stopImmediatePropagation();this.finishPlacement();}},true);
  owner.registerDomEvent(doc.defaultView,'blur',()=>{if(this.placement?.view===v)this.cancelPlacement();});
  owner.register(()=>{down=null;if(this.placement?.view===v)this.cancelPlacement();this.owners.delete(v);});
 }
 async renameTargets(file,oldPath){
  if(file.extension!=='md'||this.app.vault.getConfig('alwaysUpdateLinks')!==true)return;
  for(const [v,owner]of this.owners){
   const matches=e=>{const ref=parseLink(e.link);return isTech(e)&&ref&&(owner.targets.get(e.id)===file||ref.path.replace(/\.md$/i,'')===oldPath.replace(/\.md$/i,''));};
   if(!this.live(v)||!v.excalidrawAPI.getSceneElements().some(matches))continue;
   const target=this.target(v);
   for(let i=0;i<100&&(this.busy.has(v)||v.semaphores?.saving);i++)await pause(30);
   if(!this.live(v)||this.busy.has(v)||v.file!==target.file||v.excalidrawAPI!==target.api)continue;
   this.checkTarget(v,target);this.busy.add(v);let work;
   try{work=this.ea(v);const targets=v.excalidrawAPI.getSceneElements().filter(matches);work.copyViewElementsToEAforEditing(targets);for(const e of work.getElements()){const ref=parseLink(e.link);e.link=`[[${file.path}${ref.heading?'#'+ref.heading:''}]]`;}if(targets.length)await this.commit(v,work,target);}finally{try{work?.destroy();}finally{this.busy.delete(v);}}
  }
 }
 async commit(v,work,target){
  this.checkTarget(v,target);
  const old=new Map(v.excalidrawAPI.getSceneElementsIncludingDeleted().map(e=>[e.id,e]));
  for(const e of work.getElements()){if(e.type==='image'&&work.imagesDict[e.fileId]?.dataURL)e.status='saved';e.version=Math.max(e.version??1,(old.get(e.id)?.version??0)+1);e.versionNonce=Math.floor(Math.random()*2147483647);e.updated=Date.now();}
  // Generated SVGs have no external source file. Register immutable binary
  // assets, then atomically submit the EA workbench through the native API.
  // EA's high-level addElementsToView also refreshes containers/arrows, which
  // splits this operation into extra native history entries on this baseline.
  const api=v.excalidrawAPI,patch=new Map(work.getElements().map(e=>[e.id,e]));
  const files=Object.values(work.imagesDict).map(f=>({id:f.id,mimeType:f.mimeType,dataURL:f.dataURL,created:f.created}));
  const freshFiles=files.filter(f=>!api.getFiles?.()[f.id]);
   // Register vault paths through the native loader, so save does not create Pasted Image copies.
   const linked=Object.fromEntries(Object.entries(work.imagesDict).filter(([id,f])=>f.file&&!v.excalidrawData?.getFile?.(id)));
   if(Object.keys(linked).length){if(!v.addElements)throw Error('当前 Excalidraw 缺少图片注册接口，节点未保存');await v.addElements({newElements:[],images:linked,save:false,captureUpdate:'NEVER'});this.checkTarget(v,target);}
   else {const missing=files.filter(f=>!api.getFiles?.()[f.id]);if(missing.length)api.addFiles(missing);}
  const merged=api.getSceneElementsIncludingDeleted().map(e=>{const update=patch.get(e.id);patch.delete(e.id);return update??e;});
  const finalElements=[...merged,...patch.values()],liveIds=new Set(finalElements.filter(e=>!e.isDeleted).map(e=>e.id));
  // In Excalidraw 2.25.3 refreshAllArrows schedules its own durable capture
  // only when a bound endpoint can be refreshed. Let that capture include
  // the whole operation; isolated images instead need an explicit capture.
  const routes=finalElements.some(e=>!e.isDeleted&&e.type==='arrow'&&(liveIds.has(e.startBinding?.elementId)||liveIds.has(e.endBinding?.elementId)));
  api.updateScene({elements:finalElements,appState:{},captureUpdate:routes?'EVENTUALLY':'IMMEDIATELY',forceFlushSync:true});
  if(freshFiles.length)api.addFiles(freshFiles);
  // Do not resubmit an existing binary: native addFiles cancels its pending
  // decode, which marks every card sharing that fileId as an image error.
  if(routes)api.refreshAllArrows();
  api.updateScene({appState:{},captureUpdate:'NEVER',forceFlushSync:true});await pause(0);
  for(let i=0;i<100&&v.semaphores?.saving;i++)await pause(30);
  this.checkTarget(v,target,false);
  if(v.semaphores?.saving)throw Error('画布仍在保存，请稍后重试');await v.save(true,true);this.checkTarget(v,target,false);
 }
 async create(v,template,values={},link=null,position=null,source=null,direction='right'){
  template=snapshotFont(template,this.data.fontFamily);const target=this.target(v,source?[source]:[]);
  if(this.busy.has(v))throw Error('上一次节点操作尚未完成');this.busy.add(v);let work;
  try{
   work=this.ea(v);const p=position??work.getViewLastPointerPosition()??work.getViewCenterPosition(),asset=await this.renderAsset(v,template,values,target);
   const id=await this.addAsset(v,work,asset,p.x,p.y,target);this.checkTarget(v,target);if(!id)throw Error('无法生成节点图形');
   const e=work.getElement(id);e.link=link;e.customData={...e.customData,techTree:instance(template,values)};
   if(source){e.width=source.width;e.height=source.height;work.copyViewElementsToEAforEditing([source]);const map={right:['right','left'],left:['left','right'],up:['top','bottom'],down:['bottom','top']};const arrowId=work.connectObjects(source.id,map[direction][0],id,map[direction][1]);if(!arrowId)throw Error('无法创建连线');const arrow=applyConnectionStyle(work.getElement(arrowId),this.data.connectionStyle);bindAtSide(arrow,'startBinding',source,map[direction][0]);bindAtSide(arrow,'endBinding',e,map[direction][1]);}
   await this.commit(v,work,target);v.excalidrawAPI.selectElements([v.excalidrawAPI.getSceneElements().find(n=>n.id===id)]);return id;
  }finally{try{work?.destroy();}finally{this.busy.delete(v);}}
 }
 async update(v,node,template,values,link=node.link,resize=false){
  if(!isTech(node)||node.locked)throw Error('节点已删除或锁定');template=snapshotFont(template,this.data.fontFamily);const target=this.target(v,[node]);
  if(!resize&&JSON.stringify(template)===JSON.stringify(node.customData.techTree.template)&&JSON.stringify(values)===JSON.stringify(node.customData.techTree.values)&&(link??null)===(node.link??null))return node.id;
  if(this.busy.has(v))throw Error('上一次节点操作尚未完成');this.busy.add(v);let work;
  try{
   work=this.ea(v);const asset=await this.renderAsset(v,template,values,target);
   const fresh=await this.addAsset(v,work,asset,node.x,node.y,target);this.checkTarget(v,target);const fileId=work.getElement(fresh).fileId;delete work.elementsDict[fresh];
   work.copyViewElementsToEAforEditing([node]);const e=work.getElement(node.id);e.customData={...e.customData,techTree:instance(template,values)};e.fileId=fileId;e.link=link;e.crop=null;
   if(resize)e.height=e.width*template.height/template.width;
   await this.commit(v,work,target);return node.id;
  }finally{try{work?.destroy();}finally{this.busy.delete(v);}}
 }
 openNode(v,node=null,position=null){if(!this.live(v)||this.modal)return;const m=new NodeModal(this,v,node);if(position)m.position={...position};this.modal=m;m.open();}
 async openTemplates(){const current=this.view();if(current)this.origin={leaf:current.leaf,path:current.file.path};let leaf=this.app.workspace.getLeavesOfType(TEMPLATE_VIEW)[0];if(!leaf){leaf=this.app.workspace.getLeaf(true);await leaf.setViewState({type:TEMPLATE_VIEW,active:true});}await this.app.workspace.revealLeaf(leaf);this.app.workspace.setActiveLeaf(leaf,{focus:true});}
 resolve(link,sourcePath){const excal=this.requireExcalidraw().plugin,ref=parseLink(link);if(!ref)throw Error('此节点尚未关联文档');const file=this.app.metadataCache.getFirstLinkpathDest(ref.path,sourcePath);if(!file||file.extension!=='md'||excal.isExcalidrawFile(file))throw Error('目标文档不存在');return {file,heading:ref.heading};}
 async details(v,node){
  const win=v.containerEl.ownerDocument.defaultView;let panel=this.panels.get(win);if(!panel){panel=new DetailPanel(this,win);this.panels.set(win,panel);}await panel.open(v,node);
 }
 candidates(){
  const excal=this.requireExcalidraw().plugin,out=[];
  for(const f of this.app.vault.getMarkdownFiles()){
   if(excal.isExcalidrawFile(f)||(excal.settings?.scriptFolderPath&&f.path.startsWith(excal.settings.scriptFolderPath+'/'))||!safeLinkPart(f.path))continue;
   out.push({path:f.path,title:f.basename,heading:null,link:`[[${f.path}]]`});
   const hs=this.app.metadataCache.getFileCache(f)?.headings??[];
   for(const h of hs){if(!safeLinkPart(h.heading)||hs.filter(a=>a.heading.normalize('NFKC').toLowerCase()===h.heading.normalize('NFKC').toLowerCase()).length!==1)continue;out.push({path:f.path,title:h.heading,heading:h.heading,link:`[[${f.path}#${h.heading}]]`});}
  }return out.sort((a,b)=>a.path.localeCompare(b.path,'zh-CN'));
 }
 chooseLink(){return new Promise(resolve=>{
  const entries=this.candidates();let chosen=false;
  class Picker extends SuggestModal{
   getSuggestions(q){const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);return entries.filter(e=>words.every(w=>(e.path+' '+e.title).toLowerCase().includes(w))).slice(0,70);}
   renderSuggestion(e,el){el.createDiv({text:e.title});el.createEl('small',{text:e.path+(e.heading?' · 章节':' · 整篇正文')});}
   onChooseSuggestion(e){chosen=true;resolve(e);}
   onClose(){window.setTimeout(()=>{if(!chosen)resolve(null);},0);}
  }
  const p=new Picker(this.app);p.setPlaceholder('搜索文档路径、文件名或小标题');p.open();
 });}
}
