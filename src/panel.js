import {NativeDetailEditor} from './native-detail-editor.js';
import {Component,MarkdownRenderer} from 'obsidian';
import {EditorState,Transaction} from '@codemirror/state';
import {EditorView,keymap,lineNumbers,drawSelection} from '@codemirror/view';
import {history,historyKeymap,defaultKeymap} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {sectionRange,replaceSection,Conflict} from './sections.js';
import {confirmAction} from './node-modal.js';
const lf=s=>s.replace(/\r\n/g,'\n');
export class DetailPanel extends Component{
 constructor(plugin,win){super();this.plugin=plugin;this.app=plugin.app;this.win=win;plugin.addChild(this);
  this.registerEvent(this.app.vault.on('modify',f=>{if(f===this.file&&!this.writing)this.external().catch(e=>this.conflict(e));}));
  this.registerEvent(this.app.vault.on('delete',f=>{if(f===this.file)this.conflict(new Conflict('原文已删除；草稿已保留，请重新关联节点'));}));
  this.registerEvent(this.app.vault.on('rename',(f,oldPath)=>{if(f!==this.file)return;const oldKey=oldPath+'#'+(this.heading??''),draft=this.plugin.data.drafts[oldKey];if(draft){this.plugin.data.drafts[this.draftKey()]=draft;delete this.plugin.data.drafts[oldKey];this.plugin.persist().catch(e=>this.plugin.error(e));}if(this.title)this.title.textContent=this.label();}));
 }
 label(){return this.file.path+(this.heading?' › '+this.heading:' · 正文');}
 draftKey(){return this.file.path+'#'+(this.heading??'');}
 async open(view,node){
  if(this.closing)await this.closing;
  if(this.el&&!await this.flush())return false;
  const target=this.plugin.resolve(node.link,view.file.path),text=await this.app.vault.read(target.file),range=sectionRange(text,target.heading);
  this.disposeUI();this.modeScroll={};this.file=target.file;this.heading=target.heading;this.base=range.body;this.draft=lf(range.body);this.dirty=false;this.error=null;this.editing=false;this.graph=view;
  const recovered=this.plugin.data.drafts[this.draftKey()];if(recovered&&recovered.text!==this.draft){this.base=recovered.baseline;this.draft=recovered.text;this.dirty=true;this.editing=true;this.error='已恢复未保存草稿；请核对原文后保存';}
  this.build();await this.renderPreview();if(this.editing)this.setMode(true);this.status();return true;
 }
 build(){
  const doc=this.win.document;this.el=doc.createElement('section');this.el.className='tt-panel workspace-leaf-content';this.el.dataset.type='markdown';this.el.setAttribute('aria-label','科技详情');this.el.setAttribute('role','region');doc.body.appendChild(this.el);
  this.outside=ev=>{if(!this.el||this.el.contains(ev.target)||ev.button!==0||ev.target.closest?.('.modal-container,.menu,.suggestion-container,.popover'))return;this.close().catch(e=>this.conflict(e));};doc.addEventListener('pointerdown',this.outside,true);
  const header=this.el.createDiv({cls:'tt-panel-header'});this.title=header.createDiv({cls:'tt-panel-title',text:this.label()});header.createEl('button',{text:'关闭',attr:{'aria-label':'关闭科技详情'}}).onclick=()=>this.close();
  const bar=this.el.createDiv({cls:'tt-actions'});this.modeButton=bar.createEl('button',{text:'实时编辑'});this.modeButton.onclick=async()=>{if(this.editing&&!await this.flush())return;await this.setMode(!this.editing);};
  bar.createEl('button',{text:'打开原文'}).onclick=()=>this.app.workspace.openLinkText(this.file.path+(this.heading?'#'+this.heading:''),this.graph.file?.path??'',true);
  bar.createEl('button',{text:'重新载入'}).onclick=async()=>{if(this.dirty&&!await confirmAction(this.app,'放弃当前未保存草稿并重新载入原文？'))return;try{const range=sectionRange(await this.app.vault.read(this.file),this.heading);this.base=range.body;this.draft=lf(range.body);this.dirty=false;this.error=null;this.replaceEditor(this.draft);delete this.plugin.data.drafts[this.draftKey()];await this.plugin.persist();await this.renderPreview();this.status();}catch(e){this.conflict(e);}};
  bar.createEl('button',{text:'复制草稿'}).onclick=()=>this.win.navigator.clipboard.writeText(this.draft);
  bar.createEl('button',{text:'重试保存'}).onclick=()=>{this.error=null;this.flush();};
  this.statusEl=this.el.createDiv({cls:'tt-save-status',attr:{role:'status','aria-live':'polite'}});this.content=this.el.createDiv({cls:'view-content tt-detail-content'});this.reading=this.content.createDiv({cls:'markdown-reading-view'});this.preview=this.reading.createDiv({cls:'tt-detail-preview markdown-preview-view markdown-rendered'});this.previewSizer=this.preview.createDiv({cls:'markdown-preview-sizer markdown-preview-section'});this.editorHost=this.content.createDiv({cls:'tt-detail-editor'});this.editorHost.hidden=true;this.syncLayout();this.applySourceClasses();
  let drag=null;
  this.dragMove=ev=>{if(!drag)return;this.el.classList.add('tt-panel-dragged');this.el.style.left=Math.max(0,Math.min(this.win.innerWidth-this.el.offsetWidth,drag.left+ev.clientX-drag.x))+'px';this.el.style.top=Math.max(0,Math.min(this.win.innerHeight-60,drag.top+ev.clientY-drag.y))+'px';};
  this.dragEnd=()=>drag=null;
  header.onpointerdown=ev=>{if(ev.button||ev.target.closest('button'))return;const r=this.el.getBoundingClientRect();drag={left:r.left,top:r.top,x:ev.clientX,y:ev.clientY};header.setPointerCapture(ev.pointerId);ev.preventDefault();};
  header.onpointermove=this.dragMove;header.onpointerup=this.dragEnd;header.onpointercancel=this.dragEnd;
 }
 status(){if(this.statusEl)this.statusEl.textContent=this.error?'冲突／保存失败：'+this.error:this.writing?'保存中…':this.dirty?'未保存':'已保存';}
 conflict(e){this.error=e.message??String(e);window.clearTimeout(this.timer);this.remember();this.status();}
 remember(){if(!this.file)return;if(this.dirty)this.plugin.data.drafts[this.draftKey()]={text:this.draft,baseline:this.base,time:Date.now()};else delete this.plugin.data.drafts[this.draftKey()];window.clearTimeout(this.draftTimer);this.draftTimer=window.setTimeout(()=>this.plugin.persist().catch(e=>this.plugin.error(e)),150);}
 syncLayout(){const lines=this.app.vault.getConfig('showLineNumber')===true;this.el?.classList.toggle('tt-detail-has-lines',lines);this.nativeEditor?.surface?.classList.toggle('tt-detail-has-lines',lines);}
 async setMode(editing){
  if(this.switching||!this.el)return;const transition=this.switching={},el=this.el;this.modeButton.disabled=true;
  const scroller=this.editing?(this.nativeEditor?.editor?.cm?.scrollDOM??this.editor?.scrollDOM):this.preview;
  this.modeScroll??={};if(scroller)this.modeScroll[this.editing?'edit':'read']={top:scroller.scrollTop,left:scroller.scrollLeft};
  try{
   this.syncLayout();
   if(editing){this.editorHost.hidden=false;this.editorHost.addClass('is-preparing');}
   await this.prepareMode(editing);
   if(this.el!==el)return;
   this.syncLayout();this.editing=editing;this.reading.hidden=editing;this.editorHost.hidden=!editing;this.editorHost.removeClass('is-preparing');this.modeButton.textContent=editing?'阅读预览':'实时编辑';
   const target=editing?(this.nativeEditor?.editor?.cm?.scrollDOM??this.editor?.scrollDOM):this.preview;
   if(editing)(this.nativeEditor?.editor??this.editor)?.focus();
   const saved=this.modeScroll[editing?'edit':'read'];if(target&&saved){target.scrollTop=saved.top;target.scrollLeft=saved.left;}
  }finally{if(this.switching===transition)this.switching=null;if(this.el===el){this.reading.hidden=this.editing;this.editorHost.hidden=!this.editing;this.editorHost.removeClass('is-preparing');this.modeButton.disabled=false;}}
 }
 async prepareMode(editing){
  const el=this.el;
  if(editing&&!this.editor&&!this.nativeEditor){
   const native=this.nativeEditor=new NativeDetailEditor(this);this.editorHost.addClass('tt-native-detail');
   try{const mounted=await native.mount(this.editorHost);if(this.el!==el){native.destroy();return;}if(mounted)return;}catch(e){console.warn('[科技详情原生编辑]',e);}
   native.destroy();if(this.el!==el)return;this.nativeEditor=null;this.editorHost.empty();this.editorHost.removeClass('tt-native-detail');if(!this.el)return;
  }
  if(editing&&this.nativeEditor)return;
  if(editing&&!this.editor){
   this.editorHost.createDiv({cls:'tt-muted',text:'原生实时预览暂不可用，当前使用源码编辑；仍可切换阅读预览。'});
   this.editor=new EditorView({parent:this.editorHost,root:this.el.getRootNode(),state:EditorState.create({doc:this.draft,extensions:[lineNumbers(),drawSelection(),history(),markdown(),keymap.of([...defaultKeymap,...historyKeymap]),EditorView.lineWrapping,EditorView.updateListener.of(update=>{
    if(!update.docChanged||this.loading)return;this.draft=update.state.doc.toString();this.dirty=this.draft!==lf(this.base);this.remember();this.status();this.schedule();
   }),EditorView.domEventHandlers({compositionstart:()=>{this.composing=true;window.clearTimeout(this.timer);},compositionend:()=>{this.composing=false;this.status();this.schedule();}})]})});
  }
  if(!editing)await this.renderPreview();
 }
 replaceEditor(text){if(this.nativeEditor){this.nativeEditor.setValue(text);return;}if(!this.editor)return;this.loading=true;try{this.editor.dispatch({changes:{from:0,to:this.editor.state.doc.length,insert:text},annotations:Transaction.addToHistory.of(false)});}finally{this.loading=false;}}
 applySourceClasses(){const raw=this.app.metadataCache.getFileCache(this.file)?.frontmatter?.cssclasses;const classes=(Array.isArray(raw)?raw:typeof raw==='string'?raw.split(/[ ,]+/):[]).filter(s=>typeof s==='string'&&/^[\w\p{L}-]+$/u.test(s));for(const el of [this.el,this.preview,this.nativeEditor?.surface].filter(Boolean)){for(const cls of this.sourceClasses??[])el.classList.remove(cls);for(const cls of classes)el.classList.add(cls);}this.sourceClasses=classes;}
 async renderPreview(){if(!this.previewSizer)return;this.applySourceClasses();this.previewSizer.empty();this.previewOwner&&this.removeChild(this.previewOwner);this.previewOwner=this.addChild(new Component());await MarkdownRenderer.render(this.app,this.draft,this.previewSizer,this.file.path,this.previewOwner);}
 schedule(){window.clearTimeout(this.timer);if(!this.composing&&this.dirty&&!this.error)this.timer=window.setTimeout(()=>this.flush(),750);}
 dirtySource(disk){return this.app.workspace.getLeavesOfType('markdown').some(l=>l.view.file===this.file&&l.view.editor&&lf(l.view.editor.getValue())!==lf(disk));}
 async flush(){
  window.clearTimeout(this.timer);if(this.nativeEditor?.editor&&!this.loading)this.nativeEditor.changed(this.nativeEditor.getValue());window.clearTimeout(this.timer);if(this.composing){this.statusEl.textContent='正在输入，请完成输入后再切换或关闭';return false;}
  if(this.saving){await this.saving;if(this.error)return false;if(!this.dirty)return true;}
  if(!this.dirty)return true;if(this.error)return false;
  const file=this.file,heading=this.heading,baseline=this.base,draft=this.draft;this.writing=true;this.status();
  this.saving=(async()=>{
   if(this.app.vault.getAbstractFileByPath(file.path)!==file)throw new Conflict('目标文件已不存在');
   let result;await this.app.vault.process(file,current=>{if(this.dirtySource(current))throw new Conflict('原文编辑器存在未保存修改，请先在原文保存');result=replaceSection(current,heading,baseline,draft);return result.text;});
   this.base=result.body;
   if(this.draft===draft){this.draft=lf(result.body);if(this.editor&&this.draft!==this.editor.state.doc.toString()){
    // The only normal normalization is a final boundary newline: append it
    // without replacing the whole document, preserving the editor undo history.
    const old=this.editor.state.doc.toString();this.loading=true;try{this.editor.dispatch({changes:this.draft.startsWith(old)?{from:old.length,insert:this.draft.slice(old.length)}:{from:0,to:old.length,insert:this.draft},annotations:Transaction.addToHistory.of(false)});}finally{this.loading=false;}
   }}
   if(this.nativeEditor&&this.nativeEditor.getValue()!==this.draft)this.nativeEditor.setValue(this.draft);this.dirty=this.draft!==lf(this.base);this.error=null;this.remember();return true;
  })().catch(e=>{this.conflict(e);return false;}).finally(()=>{this.writing=false;this.saving=null;this.status();});
  const success=await this.saving;if(success&&this.dirty)this.schedule();return success&&!this.dirty;
 }
 async external(){
  if(!this.file||!this.el||this.writing)return;const range=sectionRange(await this.app.vault.read(this.file),this.heading);
  if(range.body===this.base)return;if(this.dirty){this.conflict(new Conflict('原文章节已变化，未覆盖本地草稿'));return;}
  this.base=range.body;this.draft=lf(range.body);this.replaceEditor(this.draft);await this.renderPreview();this.status();
 }
 async close(){if(this.closing)return this.closing;const el=this.el;this.closing=(async()=>{if(!await this.flush())return false;if(this.el===el)this.disposeUI();return true;})().finally(()=>this.closing=null);return this.closing;}
 disposeUI(){this.switching=null;this.nativeEditor?.destroy();this.nativeEditor=null;window.clearTimeout(this.timer);this.win.document.removeEventListener('pointerdown',this.outside,true);this.editor?.destroy();this.editor=null;this.el?.remove();this.el=null;this.previewSizer=null;if(this.previewOwner){this.removeChild(this.previewOwner);this.previewOwner=null;}}
 destroy(){window.clearTimeout(this.timer);window.clearTimeout(this.draftTimer);if(this.dirty){this.remember();window.clearTimeout(this.draftTimer);this.plugin.persist().catch(e=>this.plugin.error(e));}this.disposeUI();this.plugin.removeChild(this);}
}
