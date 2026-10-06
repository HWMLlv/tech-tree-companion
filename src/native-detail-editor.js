// Reuse the host's chapter editor, but keep all writes in DetailPanel's guarded
// section transaction. The native child is private to this floating panel.
export class NativeDetailEditor{
 constructor(panel){this.panel=panel;this.key='tech-detail-'+crypto.randomUUID();}
 async mount(host){
  const p=this.panel,f=p.graph.canvasNodeFactory;
  if(!f?.isInitialized?.()||!f.createFileNote||!f.removeNode)return false;
  this.factory=f;this.node=f.createFileNote(p.file,p.heading?'#'+p.heading:'',host,this.key);
  const child=this.node?.child;if(!child){this.destroy();return false;}
  child.save=async text=>{if(this.disposed||!this.ready||p.loading)return;child.text=text;this.changed(text);};
  // Native title/frontmatter actions must not bypass the section write guard.
  child.saveTitle=child.saveFrontmatter=()=>{};
  this.node.startEditing();
  for(let i=0;i<60&&!child.editor;i++){await new Promise(r=>window.setTimeout(r,25));if(this.disposed)return false;}
  if(this.disposed||!child.editor){this.destroy();return false;}
  this.editor=child.editor;
  // Canvas embeds keep editor extensions and mirror host styles into an iframe,
  // but omit MarkdownView's style scope. Mark the moving editor root itself so
  // that registered plugin styles also match after the root enters the iframe.
  this.surface=this.editor.cm?.dom?.closest('.markdown-source-view')??this.editor.containerEl;
  this.surface.classList.add('workspace-leaf-content','tt-native-detail-surface');
  this.surface.dataset.type='markdown';
  for(const cls of p.sourceClasses??[])this.surface.classList.add(cls);
  // A newly created note may not have heading metadata yet. Always initialize
  // from the range already validated by the plugin, never the fallback full note.
  child.onFileChanged=()=>{};child.loadFileInternal=()=>{};child.loadContents=()=>{};
  this.setValue(p.draft);this.ready=true;
  this.input=()=>queueMicrotask(()=>{if(!this.disposed&&!p.loading)this.changed(this.getValue());});
  this.editor.containerEl.addEventListener('input',this.input);
  this.editor.containerEl.addEventListener('compositionend',this.input);
  this.compositionStart=()=>{p.composing=true;window.clearTimeout(p.timer);};this.compositionEnd=()=>{p.composing=false;this.input();};
  this.editor.containerEl.addEventListener('compositionstart',this.compositionStart);this.editor.containerEl.addEventListener('compositionend',this.compositionEnd);
  return true;
 }
 changed(text){const p=this.panel;if(p.loading||this.disposed)return;p.draft=text.replace(/\r\n/g,'\n');p.dirty=p.draft!==p.base.replace(/\r\n/g,'\n');p.remember();p.status();p.schedule();}
 getValue(){return this.editor?.getValue()??this.panel.draft;}
 setValue(text){const p=this.panel,loading=p.loading;p.loading=true;try{this.editor?.setValue(text);}finally{p.loading=loading;}}
 destroy(){if(this.disposed)return;this.disposed=true;if(this.editor){this.editor.containerEl.removeEventListener('input',this.input);this.editor.containerEl.removeEventListener('compositionend',this.input);this.editor.containerEl.removeEventListener('compositionstart',this.compositionStart);this.editor.containerEl.removeEventListener('compositionend',this.compositionEnd);}if(this.node){this.factory.removeNode(this.node);this.factory.nodes?.delete(this.key);}this.node=null;this.editor=null;this.surface=null;}
}
