import {WheelPreview,WheelDrag} from './wheel-editor-motion.js';
import {Modal,Setting,Notice,Scope,setIcon} from 'obsidian';
import {RADIAL_ACTIONS,RADIAL_LIBRARY,RADIAL_ICONS,changeRadialAction,isCommandAction,radialCommands,radialConfig,radialBinding,bindingLabel,moveItem} from './radial-model.js';
import {drawWheel} from './radial-menu.js';
export function radialSettings(root,p){
 root.empty();const c=radialConfig(p.data.radial);new Setting(root).setName('画布快捷轮盘').setHeading();
 const summary=root.createDiv({cls:'tt-radial-settings-summary'}),preview=summary.createDiv({cls:'tt-radial-settings-preview'});drawWheel(preview,c.items,{r:112,inner:Math.min(.55,c.inner/c.radius)*112});
 const info=summary.createDiv();info.createEl('p',{text:c.enabled?(c.items.length+' 个功能 · 长按 '+c.delay+' 毫秒'):'轮盘已关闭'});info.createEl('p',{text:'中心或圈外松开取消。键盘触发时可用方向键、Tab 或数字选择，松开触发键执行；Esc 取消。'});
 new Setting(info).setName('轮盘内容').setDesc('拖入、排序、改名或移除功能。').addButton(b=>b.setButtonText('编辑轮盘').onClick(()=>openRadialEditor(p,()=>{if(root.isConnected)radialSettings(root,p);})));
 const fields=root.createDiv({cls:'tt-radial-settings-fields'});
 let saving=false;const save=async patch=>{if(saving)return;saving=true;const old=p.data.radial;p.data.radial=radialConfig({...old,...patch});for(const o of p.owners.values())o.radial?.cancel();for(const el of root.querySelectorAll('input,select,button'))el.disabled=true;try{await p.persist();}catch(e){p.data.radial=old;p.error(e);}finally{if(root.isConnected)radialSettings(root,p);}};
 new Setting(fields).setName('启用轮盘').addToggle(t=>t.setValue(c.enabled).onChange(v=>save({enabled:v})));
 new Setting(fields).setName('长按触发方式').addDropdown(d=>{for(const [key,label]of [['right','右键'],['middle','中键'],['alt-right','Alt＋右键'],['mouse','自定义鼠标键／侧键'],['keyboard','自定义键盘键']])d.addOption(key,label);d.setValue(c.trigger).onChange(v=>save({trigger:v}));});
 if(['mouse','keyboard'].includes(c.trigger)){
  const setting=new Setting(fields).setName('绑定按键').setDesc(c.trigger==='keyboard'?'只在画布中生效。短按也由轮盘接管；输入文字时不触发。':'支持中键、右键、侧键 1／2 及修饰键；可将驱动中的侧键映射成键盘键再绑定。');
  setting.addButton(b=>{b.setButtonText(bindingLabel(c)+' · 点击重新录入');let recording=false;const button=b.buttonEl;button.onclick=()=>{recording=true;b.setButtonText(c.trigger==='keyboard'?'按下要绑定的键（Esc 取消）':'在此按下鼠标键（Esc 取消）');button.focus();};
   button.onkeydown=e=>{if(!recording)return;e.preventDefault();e.stopPropagation();if(e.key==='Escape'){recording=false;b.setButtonText(bindingLabel(c)+' · 点击重新录入');return;}if(c.trigger!=='keyboard'||e.repeat||e.isComposing)return;const binding=radialBinding({code:e.code,ctrl:e.ctrlKey,alt:e.altKey,shift:e.shiftKey,meta:e.metaKey});if(binding.code!==e.code)return;recording=false;save({binding});};
   button.onpointerdown=e=>{if(!recording||c.trigger!=='mouse'||![1,2,3,4].includes(e.button))return;e.preventDefault();e.stopPropagation();recording=false;save({binding:radialBinding({button:e.button,ctrl:e.ctrlKey,alt:e.altKey,shift:e.shiftKey,meta:e.metaKey})});};button.oncontextmenu=e=>e.preventDefault();
  });
 }
 for(const [key,label,min,max,step]of [['delay','长按时长（毫秒）',100,3000,50],['radius','外圈半径',90,180,5],['inner','中心取消区半径',30,70,2]])new Setting(fields).setName(label).addText(t=>{t.inputEl.type='number';t.inputEl.min=String(min);t.inputEl.max=String(max);t.inputEl.step=String(step);t.setValue(String(c[key]));t.inputEl.onchange=()=>save({[key]:radialConfig({...c,[key]:t.inputEl.value})[key]});});
 p.hintRoot(root);
}
export function openRadialEditor(p,onClosed){if(p.modal)return;const modal=new RadialEditor(p);modal.onClosed=onClosed;p.modal=modal;modal.open();}
export class RadialEditor extends Modal{
 constructor(p){super(p.app);this.p=p;this.draft=radialConfig(p.data.radial);this.history=[];this.future=[];this.selected=0;}
 onOpen(){this.modalEl.addClass('tt-radial-modal');this.build();this.keyScope=new Scope(this.scope);this.keyScope.register([], 'Escape',()=>{if(this.dragger.g)this.dragger.cancel(true);else this.close();return false;});this.app.keymap.pushScope(this.keyScope);}
 remember(before){if(before===JSON.stringify(this.draft))return;this.history.push(before);if(this.history.length>40)this.history.shift();this.future=[];}
 change(fn){if(this.saving)return;const before=JSON.stringify(this.draft);fn(this.draft);this.remember(before);this.selected=Math.max(0,Math.min(this.selected,this.draft.items.length-1));this.draw();}
 undo(redo=false){this.dragger.cancel();const from=redo?this.future:this.history,to=redo?this.history:this.future;if(!from.length||this.saving)return;to.push(JSON.stringify(this.draft));this.draft=JSON.parse(from.pop());this.selected=Math.max(0,Math.min(this.selected,this.draft.items.length-1));this.draw();}
 item(action){const entry=RADIAL_ACTIONS.find(a=>a[0]===action);return entry?{id:'wheel-'+crypto.randomUUID(),action,label:entry[1],icon:entry[2],command:''}:null;}
 add(action,index=this.draft.items.length){if(this.draft.items.length>=8){new Notice('单层轮盘最多 8 个功能');return;}const item=this.item(action);if(item)this.change(c=>{c.items.splice(index,0,item);this.selected=index;});}
 build(){const el=this.contentEl;el.empty();el.createEl('h2',{text:'画布快捷轮盘'});el.createEl('p',{text:'拖动功能到轮盘，松开加入；单击只选中候选，再点“添加所选功能”确认。已有功能可拖到下方移除。'});
  const body=el.createDiv({cls:'tt-radial-editor'});this.library=body.createDiv({cls:'tt-radial-library'});this.library.createEl('h3',{text:'添加功能'});
  this.candidates=this.library.createDiv({cls:'tt-radial-candidates'});
  for(const [action,label]of RADIAL_LIBRARY){const b=this.candidates.createEl('button',{text:label,attr:{type:'button','data-action':action,'aria-pressed':'false'}});b.onclick=()=>{this.candidate=action;this.updateCandidate();};b.onpointerdown=e=>this.dragger.start(e,{item:this.item(action)});}
  this.addButton=this.library.createEl('button',{text:'添加所选功能',cls:'tt-radial-add-confirm',attr:{type:'button'}});this.addButton.onclick=()=>{if(this.candidate)this.add(this.candidate);};
  const stage=body.createDiv({cls:'tt-radial-stage'});this.ring=stage.createDiv({cls:'tt-radial-preview'});this.count=stage.createEl('p',{cls:'tt-inline-help'});this.bin=stage.createDiv({cls:'tt-radial-remove-zone',text:'将已有功能拖到这里移除（可撤销）'});this.properties=body.createDiv({cls:'tt-radial-properties'});
  this.wheel=new WheelPreview(this.ring,id=>{if(this.dragger.g?.active)return;this.selected=this.draft.items.findIndex(i=>i.id===id);this.draw();},(e,id)=>{const index=this.draft.items.findIndex(i=>i.id===id);if(index>=0)this.dragger.start(e,{index,item:this.draft.items[index]});});this.dragger=new WheelDrag(this);
  const row=el.createDiv({cls:'tt-actions tt-radial-footer'});this.undoButton=row.createEl('button',{text:'撤销'});this.undoButton.onclick=()=>this.undo();this.redoButton=row.createEl('button',{text:'重做'});this.redoButton.onclick=()=>this.undo(true);row.createEl('button',{text:'取消'}).onclick=()=>this.close();this.saveButton=row.createEl('button',{text:'保存轮盘',cls:'mod-cta'});this.saveButton.onclick=()=>this.save();this.draw();this.p.hintRoot(el);
 }
 updateHistory(){this.undoButton.disabled=!this.history.length;this.redoButton.disabled=!this.future.length;}
 paintWheel(items=this.draft.items,previewId=null){this.wheel.update(items,this.draft.items[this.selected]?.id,Math.min(.55,this.draft.inner/this.draft.radius)*170,previewId);}
 updateCandidate(){for(const b of this.candidates.querySelectorAll('button')){const selected=b.dataset.action===this.candidate;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('is-candidate',selected);b.disabled=this.draft.items.length>=8;}this.addButton.disabled=!this.candidate||this.draft.items.length>=8;}
 draw(){this.paintWheel();this.count.textContent=this.draft.items.length+' / 8 个功能 · 不可用功能保留位置并显示灰色';this.updateCandidate();this.drawProperties();this.updateHistory();this.p.hintRoot(this.properties);}
 drawProperties(){
  const properties=this.properties;properties.empty();const item=this.draft.items[this.selected];properties.createEl('h3',{text:'区块设置'});
  if(item){new Setting(properties).setName('名称').addText(t=>t.setValue(item.label).onChange(value=>{item.label=value.slice(0,16);this.wheel.cells.get(item.id).text.textContent=item.label;}));
   // Record free-text edits as a single transaction when leaving the field.
   const input=properties.querySelector('input'),original=JSON.stringify(this.draft);input.onfocus=()=>this.beforeText=JSON.stringify(this.draft);input.onblur=()=>{const before=this.beforeText??original;if(before!==JSON.stringify(this.draft)){this.history.push(before);this.future=[];this.updateHistory();}};
   const iconSetting=new Setting(properties).setName('图标');iconSetting.settingEl.addClass('tt-radial-icon-setting');const icons=iconSetting.controlEl.createDiv({cls:'tt-radial-icons',attr:{role:'group','aria-label':'图标'}});for(const icon of RADIAL_ICONS){const label=({'circle-plus':'新建','pencil':'编辑','book-open':'书本','workflow':'流程','mouse-pointer-2':'指针','square':'方框','circle':'圆形','diamond':'菱形','move-up-right':'箭头','minus':'直线','pencil-line':'绘画','type':'文字','terminal':'命令'})[icon];const b=icons.createEl('button',{attr:{type:'button','aria-label':label,title:label,'aria-pressed':String(icon===item.icon),'data-radial-icon':icon}});setIcon(b,icon);b.onclick=()=>{this.change(()=>item.icon=icon);this.properties.querySelector('[data-radial-icon="'+icon+'"]').focus({preventScroll:true});};}
   new Setting(properties).setName('功能').addDropdown(d=>{for(const [id,label]of RADIAL_ACTIONS)d.addOption(id,label);d.setValue(item.action).onChange(v=>this.change(()=>changeRadialAction(item,v)));});
   if(isCommandAction(item.action)){const own=item.action==='plugin-command',commands=radialCommands(own?Object.values(this.p.app.commands.commands):this.p.app.commands.listCommands(),this.p.manifest.id,own);new Setting(properties).setName(own?'本插件命令':'已安装命令').addDropdown(d=>{d.addOption('','请选择命令');if(item.command&&!commands.some(c=>c.id===item.command))d.addOption(item.command,'不可用：'+item.command);for(const c of commands)d.addOption(c.id,c.name);d.setValue(item.command).onChange(v=>this.change(()=>{item.command=v;item.label=(commands.find(c=>c.id===v)?.name??'命令').replace(this.p.manifest.name+': ','').slice(0,16);}));});properties.createEl('p',{cls:'tt-inline-help',text:own?'列出本插件注册的全部命令；依赖节点或连线选区的命令，条件满足时才可执行。':'所选命令会在松开后执行。仅支持普通命令；需要文本编辑器的命令不可用。'});}
   const buttons=properties.createDiv({cls:'tt-actions'});for(const [text,delta]of [['前移',-1],['后移',1]]){const b=buttons.createEl('button',{text});b.disabled=this.selected+delta<0||this.selected+delta>=this.draft.items.length;b.onclick=()=>this.change(c=>{c.items=moveItem(c.items,this.selected,this.selected+delta);this.selected+=delta;});}buttons.createEl('button',{text:'移除'}).onclick=()=>this.change(c=>c.items.splice(this.selected,1));
  }else properties.createEl('p',{text:'空轮盘不会在画布中弹出。'});
 }
 async save(){if(this.saving)return;if(this.draft.items.some(i=>!i.label.trim()||(isCommandAction(i.action)&&(!i.command||(i.action==='plugin-command'&&!i.command.startsWith(this.p.manifest.id+':')))))){new Notice('请填写名称，并为命令区块选择命令');return;}this.saving=true;const old=this.p.data.radial;this.p.data.radial=radialConfig({...old,items:this.draft.items});for(const o of this.p.owners.values())o.radial?.cancel();try{await this.p.persist();new Notice('快捷轮盘已保存');this.close();}catch(e){this.p.data.radial=old;this.p.error(e);}finally{this.saving=false;}}
 onClose(){if(this.keyScope)this.app.keymap.popScope(this.keyScope);this.dragger?.destroy();this.wheel?.destroy();if(this.p.modal===this)this.p.modal=null;this.contentEl.empty();this.onClosed?.();}
}
