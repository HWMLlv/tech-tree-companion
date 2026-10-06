import {Modal,Notice,Setting} from 'obsidian';
import {FONT_CHOICES,nativeFont,validFont,DEFAULT_FONT,fontLabel,fontStack,fontOptions} from './fonts.js';

export class FontPicker extends Modal{
 constructor(app,value,onChoose,{inherit=false,globalFont=DEFAULT_FONT,owner}={}){super(app);Object.assign(this,{value,onChoose,inherit,globalFont,owner});this.names=[...FONT_CHOICES,...(value?[value]:[])];}
 onOpen(){
  this.owner?.fontPickers?.add(this);this.modalEl.addClass('tt-font-picker');const root=this.contentEl;
  this.titleEl.setText('选择节点字体');
  root.createEl('p',{cls:'tt-muted',text:'中文名称与实际字体预览。原生字体从已安装的 Excalidraw 读取并嵌入节点；Excalifont 的中文使用 Xiaolai 手写体：首次使用需联网获取所需字形，随后缓存并嵌入节点。Helvetica 使用系统映射。'});
  this.registryStatus=root.createEl('p',{cls:'tt-muted',attr:{role:'status','aria-live':'polite'}});this.refreshButton=root.createEl('button',{text:'重新检测原生字体'});this.refreshButton.onclick=()=>this.observeNativeFonts();
  this.status=root.createEl('p',{cls:'tt-muted',attr:{role:'status','aria-live':'polite'}});
  this.search=root.createEl('input',{type:'search',attr:{placeholder:'搜索中文或英文字体名','aria-label':'搜索字体'}});
  this.search.oninput=()=>this.draw();
  this.list=root.createDiv({cls:'tt-font-list',attr:{role:'listbox','aria-label':'字体及预览'}});
  this.search.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();this.list.querySelector('button')?.focus();}};
  this.list.onkeydown=e=>{if(!['ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const all=[...this.list.querySelectorAll('button')],i=all.indexOf(e.target);all[(i+(e.key==='ArrowDown'?1:-1)+all.length)%all.length]?.focus();};
  const extra=root.createEl('details',{cls:'tt-advanced'});extra.createEl('summary',{text:'其他本机字体'});
  extra.createEl('p',{cls:'tt-muted',text:'常用列表不是本机全部字体。可以输入已安装字体名；缺失时系统会回退。字体文件不会复制或上传。'});
  const row=extra.createDiv({cls:'tt-actions'}),custom=row.createEl('input',{type:'text',attr:{placeholder:'例如：Noto Sans SC','aria-label':'自定义本机字体'}});
  row.createEl('button',{text:'使用此字体'}).onclick=()=>{const name=custom.value.trim();if(!validFont(name)){new Notice('请输入有效的单个字体名称');return;}this.choose(name);};
  const win=root.ownerDocument.defaultView;
  if(typeof win.queryLocalFonts==='function'){
   const read=extra.createEl('button',{text:'读取本机字体列表'}),status=extra.createDiv({cls:'tt-muted',attr:{role:'status'}});
   read.onclick=async()=>{read.disabled=true;try{const fonts=await win.queryLocalFonts();if(!this.modalEl.isConnected)return;this.names=[...this.names,...fonts.map(f=>f.family).filter(validFont)];status.textContent=`已读取 ${new Set(fonts.map(f=>f.family)).size} 个字体家族。`;this.search.value='';this.draw();}catch{status.textContent='当前宿主不允许读取字体列表，仍可手动输入字体名称。';}finally{read.disabled=false;}};
  }else extra.createEl('p',{cls:'tt-muted',text:'当前宿主没有开放本机字体枚举接口，仍可手动输入。'});
  this.names=[...(this.owner?.nativeFonts?.names(root.ownerDocument)??[]),...this.names];this.draw();this.observeNativeFonts();this.search.focus();
 }
 observeNativeFonts(){this.stopNativeWatch?.();if(!this.owner?.nativeFonts?.watch){this.refreshButton.hidden=true;return;}this.stopNativeWatch=this.owner.nativeFonts.watch(this.contentEl.ownerDocument,(names,state)=>{if(!this.modalEl.isConnected)return;const top=this.list.scrollTop,focused=this.contentEl.ownerDocument.activeElement?.dataset?.font;this.names=[...names,...this.names.filter(n=>!nativeFont(n)),...(this.value?[this.value]:[])];this.registryStatus.textContent=state==='ready'?'':state==='waiting'?'正在等待 Excalidraw 原生字体就绪，列表会自动更新。':'原生字体尚未完整就绪，请确认已启用 Excalidraw 后重新检测。';this.refreshButton.hidden=state==='ready';this.draw();this.list.scrollTop=top;if(focused)[...this.list.querySelectorAll('button')].find(b=>b.dataset.font===focused)?.focus();});}
 async choose(name){if(this.choosing)return;this.choosing=true;this.status.textContent='正在准备字体…';this.owner?.nativeFonts?.cache?.retry();try{if(this.owner?.nativeFonts)await this.owner.nativeFonts.ensure(this.contentEl.ownerDocument,this.owner.nativeFonts.plan(this.contentEl.ownerDocument,name||this.globalFont,'科技树 Aa 123'));if(this.modalEl.isConnected&&!this.owner?.stopped){this.onChoose(name);this.close();}}catch(e){this.status.textContent=e.message;new Notice(e.message);}finally{this.choosing=false;}}
 draw(){
  this.list.empty();const add=(value,label,preview)=>{const b=this.list.createEl('button',{cls:'tt-font-option',attr:{type:'button',role:'option','aria-selected':String((this.value??'')===value),'data-font':value}}),names=b.createDiv({cls:'tt-font-names'});names.createSpan({text:label});if(value&&label!==value)names.createEl('small',{text:value});const sample=b.createSpan({cls:'tt-font-sample',text:'科技树 Aa 123'});sample.style.fontFamily=fontStack(preview);if(nativeFont(preview)&&this.owner?.nativeFonts){const doc=sample.ownerDocument,plan=this.owner.nativeFonts.plan(doc,preview,sample.textContent);if(plan.pending?.length)sample.textContent='正在准备中文手写体…';this.owner.nativeFonts.ensure(doc,plan).then(()=>{if(sample.isConnected)sample.textContent='科技树 Aa 123';}).catch(()=>{if(sample.isConnected)sample.textContent='获取失败 · 点击重试';});}b.onclick=()=>this.choose(value);};
  if(this.inherit&&!this.search.value.trim())add('','跟随通用 · '+fontLabel(this.globalFont),this.globalFont);
  const names=fontOptions(this.names,this.search.value);for(const [title,subset]of [['Excalidraw 原生字体',names.filter(nativeFont)],['本机／系统字体',names.filter(n=>!nativeFont(n))]]){if(!subset.length)continue;this.list.createEl('h3',{text:title});for(const name of subset)add(name,fontLabel(name),name);}
  if(!names.length)this.list.createEl('p',{text:'未找到匹配项，可在“其他本机字体”中输入名称。'});
 }
 onClose(){this.stopNativeWatch?.();this.owner?.fontPickers?.delete(this);this.contentEl.empty();}
}
export function fontInput(container,value,onChange,inherit=false,{app,globalFont=DEFAULT_FONT,owner}={}){
 const b=container.createEl('button',{cls:'tt-font-trigger',attr:{type:'button','aria-label':inherit?'本模板字体':'通用字体','aria-haspopup':'dialog'}});let current=value??'';
 const paint=()=>{b.empty();b.createSpan({text:current?fontLabel(current):'跟随通用 · '+fontLabel(globalFont)});const sample=b.createSpan({cls:'tt-font-trigger-sample',text:'科技树 Aa ▾'});sample.style.fontFamily=fontStack(current||globalFont);if(owner?.nativeFonts){const doc=sample.ownerDocument;owner.nativeFonts.ensure(doc,owner.nativeFonts.plan(doc,current||globalFont,sample.textContent)).catch(()=>{});}};
 b.onclick=()=>new FontPicker(app,current,name=>{current=name;onChange(name);paint();},{inherit,globalFont,owner}).open();paint();return b;
}
export function fontSettings(el,plugin){
 new Setting(el).setName('科技节点字体').setHeading();let font=plugin.data.fontFamily;
 const setting=new Setting(el).setName('通用字体').setDesc('打开完整字体列表，可按中文名称查找并比较效果；模板专用字体优先。');
 fontInput(setting.controlEl,font,v=>font=v,false,{app:plugin.app,globalFont:plugin.data.fontFamily,owner:plugin});
 new Setting(el).setDesc('保存影响模板预览和之后创建的节点。已有节点保留外观；选中后运行“更新选中节点字体”主动应用，可一次撤销。').addButton(b=>b.setButtonText('保存通用字体').setCta().onClick(async()=>{if(!validFont(font)){new Notice('请输入有效的本机字体名称');return;}const before=plugin.data.fontFamily;try{plugin.data.fontFamily=font;await plugin.persist();for(const l of plugin.app.workspace.getLeavesOfType('tech-tree-template-center')){l.view.paint?.();l.view.drawProperties?.();}new Notice('通用字体已保存');}catch(e){plugin.data.fontFamily=before;plugin.error(e);}}));
}
export class FontModal extends Modal{constructor(plugin){super(plugin.app);this.plugin=plugin;}onOpen(){fontSettings(this.contentEl,this.plugin);}onClose(){if(this.plugin.modal===this)this.plugin.modal=null;this.contentEl.empty();}}
