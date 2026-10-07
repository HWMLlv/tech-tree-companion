import {Modal} from 'obsidian';
import {ICONS,ICON_GROUPS,iconSVG} from './icons.js';
import {replaceSvg} from './svg-dom.js';
import {prepareHints} from './ui-hints.js';

export class IconPicker extends Modal{
 constructor(app,value,onChoose,{owner,targets=[],color='#1e293b',onClose}={}){super(app);Object.assign(this,{value,onChoose,owner,targets,color,afterClose:onClose});this.target=targets[0];this.selected=this.target?.icon??value;}
 onOpen(){
  if(this.owner)(this.owner.iconPickers??=new Set()).add(this);
  this.modalEl.addClass('tt-icon-picker');this.titleEl.setText('选择卡片图标');const root=this.contentEl;
  root.createEl('p',{cls:'tt-muted tt-icon-intro',text:'只更换图标造型，保留位置、大小和颜色；确认后返回编辑，保存节点或模板后生效。'});
  if(this.targets.length>1){const row=root.createEl('label',{cls:'tt-icon-target',text:'要更换的图标'}),select=row.createEl('select',{attr:{'aria-label':'要更换的图标'}});for(const t of this.targets)select.createEl('option',{value:t.id,text:t.label});select.value=this.target.id;select.onchange=()=>{this.target=this.targets.find(t=>t.id===select.value);this.selected=this.target.icon;this.updateSelection();};}
  this.gallery=root.createDiv({cls:'tt-icon-gallery',attr:{'aria-label':'图标分类'}});
  for(const group of ICON_GROUPS){const section=this.gallery.createEl('section',{cls:'tt-icon-section'});section.createEl('h3',{text:group.label});const grid=section.createDiv({cls:'tt-icon-grid',attr:{role:'group','aria-label':group.label}});
   for(const key of group.keys){const button=grid.createEl('button',{cls:'tt-icon-option',attr:{type:'button','data-icon':key,'aria-label':ICONS[key].label,'aria-pressed':String(key===this.selected)}});replaceSvg(button.createSpan({cls:'tt-icon-tile'}),iconSVG(key));button.createSpan({cls:'tt-icon-label',text:ICONS[key].label});button.onclick=()=>{this.selected=key;this.updateSelection();};}
   grid.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const buttons=[...grid.querySelectorAll('button')],index=buttons.indexOf(e.target);if(index<0)return;e.preventDefault();const columns=Math.max(1,grid.ownerDocument.defaultView.getComputedStyle(grid).gridTemplateColumns.split(' ').length),step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key];buttons[Math.max(0,Math.min(buttons.length-1,index+step))].focus();};
  }
  this.preview=root.createDiv({cls:'tt-icon-selection',attr:{role:'status','aria-live':'polite'}});const actions=root.createDiv({cls:'tt-icon-actions'});actions.createEl('button',{text:'取消',attr:{type:'button'}}).onclick=()=>this.close();this.confirm=actions.createEl('button',{text:'使用此图标',cls:'mod-cta',attr:{type:'button'}});this.confirm.onclick=()=>this.choose();this.scope.register(['Mod'],'Enter',()=>{this.choose();return false;});this.updateSelection();
  // Visible category and icon names make popup hints redundant. Preserve their
  // accessible names without letting the host infer tooltips from aria-label.
  this.owner?.hints?.get(root.ownerDocument)?.clear();prepareHints(root);
  for(const el of root.querySelectorAll('[data-tt-hint]'))el.removeAttribute('data-tt-hint');
  this.gallery.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
 }
 updateSelection(){
  for(const button of this.gallery.querySelectorAll('[data-icon]'))button.setAttribute('aria-pressed',String(button.dataset.icon===this.selected));this.preview.empty();const color=this.target?.color??this.color;
  for(const [label,key]of [['当前',this.target?.icon??this.value],['选择',this.selected]]){const item=this.preview.createDiv({cls:'tt-icon-selection-item'}),art=item.createSpan({cls:'tt-icon-selection-art'});art.style.color=color;replaceSvg(art,iconSVG(key));item.createSpan({text:label+'：'+ICONS[key].label});}
  this.confirm.disabled=!Object.hasOwn(ICONS,this.selected);
 }
 choose(){if(this.chosen||!Object.hasOwn(ICONS,this.selected)||this.owner?.stopped)return;this.chosen=true;this.onChoose(this.selected,this.target?.id);this.close();}
 onClose(){this.owner?.hints?.get(this.contentEl.ownerDocument)?.clear();this.owner?.iconPickers?.delete(this);this.contentEl.empty();this.afterClose?.();}
}

export function iconInput(root,value,onChoose,{app,owner,...options}={}){
 const quick=root.createDiv({cls:'tt-style-options tt-icon-quick',attr:{role:'group','aria-label':'快捷图标'}});
 const apply=key=>{if(!button.isConnected||owner?.stopped)return;value=key;update();onChoose(key);};
 for(const key of ICON_GROUPS[0].keys){const option=quick.createEl('button',{cls:'tt-style-choice',attr:{type:'button','data-quick-icon':key,'aria-label':ICONS[key].label,'aria-pressed':String(key===value)}});replaceSvg(option,iconSVG(key));option.onclick=()=>apply(key);}
 const button=root.createEl('button',{cls:'tt-icon-trigger',attr:{type:'button','aria-label':'更多图标','aria-haspopup':'dialog'}}),art=button.createSpan({cls:'tt-icon-trigger-art'}),label=button.createSpan();
 function update(){for(const option of quick.querySelectorAll('[data-quick-icon]'))option.setAttribute('aria-pressed',String(option.dataset.quickIcon===value));art.style.color=options.color??'#1e293b';replaceSvg(art,iconSVG(value));label.textContent='当前：'+ICONS[value].label+' · 更多图标';}
 update();button.onclick=()=>new IconPicker(app,value,apply,{owner,...options,onClose:()=>{if(button.isConnected)button.focus({preventScroll:true});}}).open();return button;
}
