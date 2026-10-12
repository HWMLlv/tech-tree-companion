import {Modal,Setting,Notice} from 'obsidian';
import {batchTemplates} from './batch-model.js';
import {replaceSvg} from './svg-dom.js';
import {ICONS} from './icons.js';
import {IconPicker} from './icon-ui.js';
export function openBatch(p,v){if(p.modal)return;const m=new BatchAppearanceModal(p,v);p.modal=m;m.open();}
export class BatchAppearanceModal extends Modal{
 constructor(p,v){super(p.app);this.p=p;this.v=v;this.nodes=p.selectedTechNodes(v);this.target=p.target(v,this.nodes);this.patch={};}
 onOpen(){this.modalEl.addClass('tt-workflow-modal');this.setTitle('批量修改卡片外观');const root=this.contentEl;
  root.createEl('p',{text:`选中 ${this.nodes.length} 张可编辑卡片。只修改勾选项目；保留文字、尺寸、位置和文档关联。锁定卡片不参与。`});
  for(const [key,label,type,initial]of [['border','描边颜色','color','#475569'],['background','背景颜色','color','#eff6ff'],['strokeStyle','描边样式','select','solid'],['strokeWidth','描边宽度','select',2]]){
   const setting=new Setting(root).setName(label);let value=initial;setting.addToggle(t=>t.setValue(false).onChange(on=>{if(on)this.patch[key]=value;else delete this.patch[key];this.preview();}));
   if(type==='color'){const input=setting.controlEl.createEl('input',{type:'color',attr:{'aria-label':label}});input.value=initial;input.oninput=()=>{value=input.value;if(Object.hasOwn(this.patch,key)){this.patch[key]=value;this.preview();}};}
   else setting.addDropdown(d=>{const choices=key==='strokeStyle'?[['solid','实线'],['dashed','虚线'],['dotted','点线']]:[[0,'无'],[1,'细'],[2,'标准'],[4,'粗'],[6,'很粗']];for(const [v,name]of choices)d.addOption(String(v),name);d.setValue(String(initial)).onChange(v=>{value=key==='strokeWidth'?Number(v):v;if(Object.hasOwn(this.patch,key)){this.patch[key]=value;this.preview();}});});
  }
  this.icon='atom';new Setting(root).setName('图标造型').setDesc('无图标的卡片会跳过；图标位置、大小和颜色保持原样。').addToggle(t=>t.setValue(false).onChange(on=>{if(on)this.patch.icon=this.icon;else delete this.patch.icon;this.preview();})).addButton(b=>{this.iconButton=b;b.setButtonText('选择图标：原子').onClick(()=>{if(this.picker)return;this.picker=new IconPicker(this.app,this.icon,key=>{this.icon=key;b.setButtonText('选择图标：'+ICONS[key].label);if(Object.hasOwn(this.patch,'icon')){this.patch.icon=key;this.preview();}},{owner:this.p,onClose:()=>this.picker=null});this.picker.open();});});
  new Setting(root).setName('多个图标时').addDropdown(d=>d.addOption('first','只改第一个图标模块').addOption('all','修改所有图标模块').setValue('first').onChange(v=>{this.patch.iconScope=v;this.preview();}));
  this.note=root.createDiv({cls:'tt-muted',attr:{role:'status'}});this.art=root.createDiv({cls:'tt-batch-preview'});const actions=root.createDiv({cls:'tt-actions'});actions.createEl('button',{text:'取消'}).onclick=()=>this.close();this.save=actions.createEl('button',{text:'应用所选修改',cls:'mod-cta'});this.save.onclick=()=>this.apply();this.preview();
 }
 preview(){try{const plan=batchTemplates(this.nodes,this.patch);this.note.textContent=`将修改 ${plan.changes.length} 张卡片${this.patch.icon?`；${plan.skippedIcons} 张无图标，跳过图标替换`:''}。预览仅显示第一张发生变化的卡片。`;this.save.disabled=!plan.changes.length;this.art.empty();const first=plan.changes[0];if(first)replaceSvg(this.art,this.p.render(this.v,first.template,first.node.customData.techTree.values).svg);}catch(e){this.note.textContent=e.message;this.save.disabled=true;}}
 async apply(){if(this.saving||this.picker)return;this.saving=true;this.save.disabled=true;try{this.p.checkTarget(this.v,this.target);const plan=batchTemplates(this.nodes,this.patch);await this.p.applyNodeTemplates(this.v,plan.changes,this.target);new Notice(`已修改 ${plan.changes.length} 张卡片，可撤销`);this.close();}catch(e){this.note.textContent=e.message;}finally{this.saving=false;this.save.disabled=false;}}
 onClose(){this.picker?.close();if(this.p.modal===this)this.p.modal=null;this.contentEl.empty();}
}
