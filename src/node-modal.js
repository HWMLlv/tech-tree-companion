import {tr} from './i18n.js';
import {replaceSvg} from './svg-dom.js';
import {titleForRelink,titleFromLink} from './node-link-title.js';
import {editableFields,adjacentField} from './field-navigation.js';
import {Modal,Scope,setIcon} from 'obsidian';
import {clone,moduleFontWeight,replaceModuleIcon} from './model.js';
import {sectionRange} from './sections.js';
import {effectiveFont,fontStack} from './fonts.js';
import {appearanceControls} from './appearance-ui.js';
import {IconPicker} from './icon-ui.js';
import {TemplatePicker} from './template-picker.js';
import {setCardPickerMode} from './template-deck-model.js';
import {inlineFieldGeometry} from './text-layout.js';
export class NodeModal extends Modal{
 constructor(plugin,view,node){super(plugin.app);this.plugin=plugin;this.view=view;this.node=node;this.target=plugin.target(view,node?[node]:[]);this.template=clone(node?.customData.techTree.template??plugin.defaultTemplate());this.values=clone(node?.customData.techTree.values??{});if(!node)this.values.title=tr('未命名科技');this.link=node?.link??null;
  const e=plugin.ea(view);this.position=e.getViewLastPointerPosition()??e.getViewCenterPosition();e.destroy();}
 onOpen(){this.modalEl.addClass('tt-node-modal','tt-inline-node-modal');this.draw();this.keyScope=new Scope(this.scope);this.keyScope.register([], 'Escape',()=>{if(this.activeEditor)this.focusField(this.activeEditor.dataset.nodeFieldId);else this.close();return false;});this.keyScope.register(['Mod'],'Enter',ev=>{if(!ev.isComposing&&!ev.repeat)this.submit().catch(e=>this.plugin.error(e));return false;});this.app.keymap.pushScope(this.keyScope);this.contentEl.onkeydown=ev=>this.keyDown(ev);this.contentEl.ownerDocument.defaultView.setTimeout(()=>{if(this.contentEl.isConnected&&!this.templatePicker&&!this.iconPicker&&!this.templateTransition)this.focusField(editableFields(this.template)[0]?.id);},0);}
 draw(){
  this.templateTransition?.finish();
  this.templatePicker?.close();
  this.iconPicker?.close();
  this.templateTrigger=null;
  const root=this.contentEl;root.empty();const el=root.createDiv({cls:'tt-node-editor-header'});el.createEl('h2',{text:this.node?tr('编辑科技节点'):tr('新建科技节点')});
  if(!this.node){
   const row=el.createDiv({cls:'tt-node-template-choice'}),label=row.createEl('label',{text:tr('节点模板')});
   if(this.plugin.data.cardTemplatePicker===true){this.templateTrigger=label.createEl('button',{text:this.template.name,attr:{type:'button','aria-haspopup':'dialog'}});this.templateTrigger.onclick=()=>this.openTemplatePicker();}
   else{const select=label.createEl('select');for(const t of this.plugin.templates())select.createEl('option',{value:t.id,text:t.name});select.value=this.template.id;select.onchange=()=>{const next=this.plugin.templates().find(t=>t.id===select.value);if(next){this.template=clone(next);this.draw();}};}
   const mode=row.createEl('button',{text:this.plugin.data.cardTemplatePicker===true?tr('常规选择'):tr('卡牌选择'),attr:{type:'button','aria-pressed':String(this.plugin.data.cardTemplatePicker===true)}});
   mode.onclick=async()=>{mode.disabled=true;try{const cards=this.plugin.data.cardTemplatePicker!==true;await setCardPickerMode(this.plugin,cards);if(!this.contentEl.isConnected)return;this.draw();if(cards)this.openTemplatePicker();}catch(e){this.plugin.error(e);}finally{mode.disabled=false;}};
  }
  const linkRow=el.createDiv({cls:'tt-link-row'});linkRow.createDiv({text:this.link??tr('未关联文档（可以保留为占位节点）')});
  linkRow.createEl('button',{text:tr('搜索文档／章节')}).onclick=async()=>{const picked=await this.plugin.chooseLink();if(!picked)return;if(!this.contentEl.isConnected)return;const previous=this.linkedTitle();this.values.title=titleForRelink(this.values.title,previous,picked.title);this.link=picked.link;this.draw();};
  if(this.link){linkRow.createEl('button',{text:tr('使用关联标题')}).onclick=()=>{this.values.title=this.linkedTitle();this.draw();};}
  linkRow.createEl('button',{text:tr('解除关联')}).onclick=()=>{this.link=null;this.draw();};
  if(this.link)el.createEl('p',{cls:'tt-inline-help',text:tr('更换关联时，原关联标题会自动更新；手动命名会保留，可点击“使用关联标题”替换。')});
  const footer=root.createDiv({cls:'tt-actions tt-node-editor-footer'}),tools=footer.createDiv({cls:'tt-node-editor-tools',attr:{role:'group','aria-label':tr('节点外观')}});
  const toggle=tools.createEl('button',{cls:'tt-node-appearance-toggle',attr:{type:'button','aria-label':tr('节点外观'),'aria-expanded':String(!!this.styleOpen)}});setIcon(toggle,'palette');
  this.iconTrigger=tools.createEl('button',{cls:'tt-node-icon-trigger',attr:{type:'button','aria-label':tr('更换节点图标'),'aria-haspopup':'dialog'}});setIcon(this.iconTrigger,'image-plus');this.iconTrigger.onclick=()=>this.openIcons();
  if(!this.template.modules.some(m=>m.type==='icon')){this.iconTrigger.disabled=true;this.iconTrigger.title=tr('此模板没有图标模块。请先在模板中心添加图标，再更换节点图标；现有布局保持不变。');}
  const layout=root.createDiv({cls:'tt-node-editor-layout'}),main=layout.createDiv({cls:'tt-node-editor-main'}),aside=layout.createEl('aside',{cls:'tt-node-appearance',attr:{'aria-label':tr('当前节点外观')}});aside.createEl('h3',{text:tr('节点外观')});aside.createEl('p',{cls:'tt-muted',text:tr('只修改当前节点；保存节点后生效。')});const close=aside.createEl('button',{text:tr('收起外观'),attr:{type:'button'}}),styles=aside.createDiv({cls:'tt-node-appearance-controls'});
  const show=open=>{this.styleOpen=open;aside.hidden=!open;this.modalEl.toggleClass('tt-with-appearance',open);toggle.setAttribute('aria-expanded',String(open));};toggle.onclick=()=>show(!this.styleOpen);close.onclick=()=>{show(false);toggle.focus();};show(!!this.styleOpen);
  main.createEl('p',{cls:'tt-inline-help',text:tr('方向键选择字段，Enter 编辑；编辑时 Tab 切换、Alt＋方向键跳转，普通方向键移动光标。Ctrl＋Enter 创建／保存。')});
  this.board=main.createDiv({cls:'tt-inline-card'});this.board.style.aspectRatio=`${this.template.width}/${this.template.height}`;this.art=this.board.createDiv({cls:'tt-inline-art'});this.warning=main.createDiv({cls:'tt-warning'});
  const repaint=this.repaint=()=>{const r=this.plugin.render(this.view,this.template,this.values);replaceSvg(this.art,r.svg);this.warning.textContent=[r.fontMessage,r.overflow.length?tr('部分文字超出模块区域，显示时截断；完整内容仍保留，可在编辑框内滚动。'):''].filter(Boolean).join(' · ');if(this.activeEditor?.isConnected)this.fitInput(this.activeEditor);};
  const drawStyles=()=>{styles.empty();appearanceControls(styles,this.template,change=>{change(this.template);repaint();drawStyles();},{owner:this.plugin});};drawStyles();
  this.resizeObserver?.disconnect();this.resizeObserver=new ResizeObserver(()=>{for(const input of this.board.querySelectorAll('textarea'))this.fitInput(input);});this.resizeObserver.observe(this.board);
  for(const f of this.template.modules.filter(m=>['title','summary','field'].includes(m.type))){
   const box=this.board.createEl('button',{cls:'tt-inline-field',attr:{type:'button','aria-label':tr`编辑${f.label||f.field}`,'data-field':f.field,'data-node-field-id':f.id}});Object.assign(box.style,{left:f.x/this.template.width*100+'%',top:f.y/this.template.height*100+'%',width:f.w/this.template.width*100+'%',height:f.h/this.template.height*100+'%'});box.title=f.label||f.field;
   if(!this.values[f.field])box.createSpan({cls:'tt-inline-placeholder',text:f.label||f.field});
   box.onclick=()=>{if(this.activeEditor?.isConnected)this.activeEditor.blur();const wrapper=this.board.createDiv({cls:'tt-inline-edit'});for(const key of ['left','top','width','height'])wrapper.style[key]=box.style[key];wrapper.style.background=this.template.background==='transparent'?'var(--background-primary)':this.template.background;
    const input=wrapper.createEl('textarea',{cls:'tt-inline-input',attr:{'aria-label':f.label||f.field,'data-field':f.field,'data-node-field-id':f.id,wrap:'soft'}});Object.assign(input.style,{fontFamily:fontStack(effectiveFont(this.template,this.plugin.data.fontFamily)),fontWeight:String(moduleFontWeight(f)),color:f.color,textAlign:f.align});input.value=this.values[f.field]??'';this.activeEditor=input;this.fitInput(input);
    input.oninput=()=>{this.values[f.field]=input.value;repaint();for(const sibling of this.board.querySelectorAll('.tt-inline-field'))if(sibling.dataset.field===f.field)sibling.querySelector('.tt-inline-placeholder')?.remove();};input.onblur=()=>{wrapper.remove();if(this.activeEditor===input)this.activeEditor=null;repaint();};this.plugin.hintRoot(this.board);input.focus();};
  }
  root.appendChild(footer);const row=footer.createDiv({cls:'tt-node-editor-commands'});row.createEl('button',{text:tr('取消')}).onclick=()=>this.close();const save=row.createEl('button',{text:this.node?tr('保存节点'):tr('创建节点'),cls:'mod-cta'});save.onclick=()=>this.submit().catch(e=>this.plugin.error(e));this.saveButton=save;repaint();this.plugin.hintRoot(root);
 }
 fitInput(input){
  const f=this.template.modules.find(m=>m.id===input.dataset.nodeFieldId);if(!f)return;
  const font=effectiveFont(this.template,this.plugin.data.fontFamily),geometry=inlineFieldGeometry({...f,fontWeight:moduleFontWeight(f)},input.value,this.plugin.textMeasure(input.ownerDocument,font),this.board.clientWidth/this.template.width,f.label||f.field);
  Object.assign(input.style,{fontSize:geometry.fontSize+'px',lineHeight:geometry.lineHeight+'px',top:geometry.top+'px',height:geometry.height+'px'});input.dataset.textOverflow=String(geometry.overflow);if(!geometry.overflow)input.scrollTop=0;
 }
 openIcons(){
  if(this.iconPicker||this.templatePicker)return;const targets=this.template.modules.filter(m=>m.type==='icon').map((m,i)=>({id:m.id,label:m.label||tr('图标 ')+(i+1),icon:m.icon,color:m.color}));if(!targets.length)return;
  this.activeEditor?.blur();const template=this.template,trigger=this.iconTrigger;
  this.iconPicker=new IconPicker(this.app,targets[0].icon,(key,id)=>{if(!this.contentEl.isConnected||this.template!==template)return;replaceModuleIcon(this.template,id,key);this.repaint();},{owner:this.plugin,targets,onClose:()=>{this.iconPicker=null;if(trigger.isConnected)trigger.focus({preventScroll:true});}});this.iconPicker.open();
 }
 openTemplatePicker(){
  if(this.node||this.iconPicker||this.templatePicker)return;this.templateTransition?.finish();this.activeEditor?.blur();const trigger=this.templateTrigger;
  this.templatePicker=new TemplatePicker(this.plugin,this.template.id,this.values,(template,flight)=>{if(!this.contentEl.isConnected||this.plugin.stopped)return;this.template=template;this.draw();if(!flight)this.templateTrigger?.focus({preventScroll:true});return this;},()=>{this.templatePicker=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});});this.templatePicker.open();
 }
 linkedTitle(){if(!this.link)return '';try{const {file,heading}=this.plugin.resolve(this.link,this.view.file.path);return heading??file.basename;}catch{return titleFromLink(this.link);}}
 focusField(id,editing=false){const box=[...this.board.querySelectorAll('.tt-inline-field')].find(el=>el.dataset.nodeFieldId===id);if(!box)return;this.activeEditor?.blur();box.focus();if(editing)box.click();}
 keyDown(ev){
  if(ev.isComposing||ev.defaultPrevented)return;
  if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();ev.stopPropagation();if(!ev.repeat)this.submit().catch(e=>this.plugin.error(e));return;}
  const id=ev.target.dataset?.nodeFieldId;if(!id)return;const editing=ev.target.tagName==='TEXTAREA',all=editableFields(this.template);
  if(!editing&&(ev.key==='Enter'||ev.key===' ')&&!ev.altKey&&!ev.ctrlKey&&!ev.metaKey){ev.preventDefault();ev.stopPropagation();this.focusField(id,true);return;}
  if(editing&&ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();this.focusField(id);return;}
  if(editing&&ev.key==='Tab'){ev.preventDefault();ev.stopPropagation();const next=all.findIndex(f=>f.id===id)+(ev.shiftKey?-1:1);if(next>=0&&next<all.length)this.focusField(all[next].id,true);else{this.activeEditor?.blur();(ev.shiftKey?(this.contentEl.querySelector('select')??this.board.querySelector('button')):this.saveButton).focus();}return;}
  if(/^Arrow(Up|Down|Left|Right)$/.test(ev.key)&&(!editing||ev.altKey)&&!ev.ctrlKey&&!ev.metaKey&&!ev.shiftKey){ev.preventDefault();ev.stopPropagation();this.focusField(adjacentField(all,id,ev.key),editing);}
 }
 async submit(){
  if(this.iconPicker||this.templatePicker||this.templateTransition)return;
  if(this.submitting)return;this.submitting=true;this.saveButton.disabled=true;
  try{
   this.plugin.checkTarget(this.view,this.target);
   if(this.link){const {file,heading}=this.plugin.resolve(this.link,this.view.file.path);sectionRange(await this.app.vault.read(file),heading);}
   this.plugin.checkTarget(this.view,this.target);
   if(this.node)await this.plugin.update(this.view,this.node,this.template,this.values,this.link);
   else await this.plugin.create(this.view,this.template,this.values,this.link,this.position);
   this.close();
  }finally{this.submitting=false;this.saveButton.disabled=false;}
 }
 onClose(){this.templateTransition?.cancel();this.templatePicker?.close();this.iconPicker?.close();if(this.keyScope){this.app.keymap.popScope(this.keyScope);this.keyScope=null;}this.resizeObserver?.disconnect();if(this.plugin.modal===this)this.plugin.modal=null;this.contentEl.empty();window.setTimeout(()=>{if(this.plugin.live(this.view)&&!this.plugin.modal)this.view.containerEl.querySelector('.excalidraw')?.focus();},50);}
}
export function confirmAction(app,message){return new Promise(resolve=>{let done=false;class Confirm extends Modal{onOpen(){this.contentEl.createEl('p',{text:message});this.contentEl.createEl('button',{text:tr('取消')}).onclick=()=>this.close();this.contentEl.createEl('button',{text:tr('确认'),cls:'mod-warning'}).onclick=()=>{done=true;resolve(true);this.close();};}onClose(){if(!done)resolve(false);}}new Confirm(app).open();});}
