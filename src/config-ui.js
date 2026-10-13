import {tr} from './i18n.js';
import {radialLabel} from './radial-labels.js';
import {Modal,Notice,Setting} from 'obsidian';
import {parseConfig,exportConfig,planImport,configConflicts,configRevision} from './config-transfer.js';
import {replaceSvg} from './svg-dom.js';
import {drawWheel} from './radial-menu.js';
import {TEMPLATE_VIEW} from './template-view.js';

export function openConfigTransfer(p){if(p.modal)return;const m=new ConfigTransferModal(p);p.modal=m;m.open();}
export class ConfigTransferModal extends Modal{
 constructor(p){super(p.app);this.p=p;this.choices={templates:{},modulePresets:{},radial:false};}
 onOpen(){this.modalEl.addClass('tt-workflow-modal','tt-config-modal');this.setTitle(tr('配置导入与导出'));const root=this.contentEl;
  root.createEl('p',{cls:'tt-muted',text:tr('分享卡片模板、我的模块和轮盘配置。配置包不包含正文、草稿、卡片附件或缓存。')});
  const exportArea=root.createEl('section');exportArea.createEl('h3',{text:tr('导出')});const selected={templates:true,modulePresets:true,radial:true};
  for(const [key,label]of [['templates',tr('卡片模板')],['modulePresets',tr('我的模块')],['radial',tr('自定义轮盘')]])new Setting(exportArea).setName(label).addToggle(t=>t.setValue(true).onChange(v=>{selected[key]=v;}));
  exportArea.createEl('button',{text:tr('下载配置包')}).onclick=()=>{try{if(!Object.values(selected).some(Boolean))throw Error(tr('请至少选择一类配置'));const doc=root.ownerDocument,win=doc.defaultView,url=win.URL.createObjectURL(new win.Blob([exportConfig(this.p.data,selected)],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download='tech-tree-config.json';doc.body.append(a);a.click();a.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);}catch(e){this.p.error(e);}};
  const importArea=root.createEl('section');importArea.createEl('h3',{text:tr('导入')});importArea.createEl('p',{cls:'tt-muted',text:tr('先选择文件并预览，再确认导入。已有卡片保持原样；轮盘默认不导入。')});
  const file=importArea.createEl('input',{type:'file',attr:{accept:'.json,application/json','aria-label':tr('选择配置文件')}});file.onchange=async()=>{const ticket=this.fileTicket={};try{const chosen=file.files?.[0];if(!chosen)return;if(chosen.size>2*1024*1024)throw Error(tr('配置文件不能超过 2 MB'));const text=await chosen.text();if(ticket!==this.fileTicket||!this.contentEl.isConnected)return;this.packet=parseConfig(text);this.base=configRevision(this.p.data);this.choices={templates:{},modulePresets:{},radial:false};for(const key of ['templates','modulePresets'])for(const item of this.packet[key]??[])this.choices[key][item.id]='keep';this.preview();}catch(e){if(ticket!==this.fileTicket||!this.contentEl.isConnected)return;this.packet=null;this.previewEl.empty();this.status.textContent=e.message;this.applyButton.disabled=true;}};
  this.previewEl=importArea.createDiv({cls:'tt-config-preview'});this.status=importArea.createDiv({cls:'tt-muted',attr:{role:'status'}});this.applyButton=importArea.createEl('button',{text:tr('确认导入所选配置'),cls:'mod-cta'});this.applyButton.disabled=true;this.applyButton.onclick=()=>this.apply();
 }
 preview(){this.previewEl.empty();
  for(const [key,label]of [['templates',tr('卡片模板')],['modulePresets',tr('我的模块')]])if(this.packet[key]?.length){this.previewEl.createEl('h4',{text:label});for(const item of this.packet[key]){const row=this.previewEl.createDiv({cls:'tt-config-row'}),info=row.createDiv();info.createEl('strong',{text:item.name});const matches=configConflicts(this.p.data[key]??[],item);info.createDiv({cls:'tt-muted',text:matches.length?tr('与现有配置重名或标识相同'):tr('新配置')});
    if(key==='templates'){const art=info.createDiv({cls:'tt-config-art'});replaceSvg(art,this.p.render(null,item,{title:tr('示例科技'),summary:tr('配置预览')}).svg);}
    const select=row.createEl('select',{attr:{'aria-label':item.name+tr('的导入方式')}});for(const [value,text]of [['keep',matches.length?tr('保留两份'):tr('新增')],['replace',tr('替换匹配项')],['skip',tr('跳过')]]){const option=select.createEl('option',{value,text});if(value==='replace'&&matches.length!==1)option.disabled=true;}select.value=this.choices[key][item.id];select.onchange=()=>{this.choices[key][item.id]=select.value;this.summary();};
   }}
  if(this.packet.radial){const section=this.previewEl.createDiv();new Setting(section).setName(tr('应用导入包中的轮盘')).setDesc(tr('将替换当前轮盘内容与触发设置；默认关闭。')).addToggle(t=>t.setValue(false).onChange(v=>{this.choices.radial=v;this.summary();}));const preview=section.createDiv({cls:'tt-config-wheel'});drawWheel(preview,this.packet.radial.items,{r:112,inner:40});section.createEl('p',{cls:'tt-muted',text:this.packet.radial.items.map(i=>radialLabel(i)+(i.command?'（'+i.command+'）':'')).join('、')});}
  this.summary();
 }
 summary(){try{const plan=planImport(this.p.data,this.packet,this.choices);this.status.textContent=plan.changes.length?tr('将导入 ')+plan.changes.length+tr(' 项；导入不会自动更新已有卡片。'):tr('请选择需要导入的配置。');this.applyButton.disabled=!plan.changes.length;}catch(e){this.status.textContent=e.message;this.applyButton.disabled=true;}}
 async apply(){if(this.saving||!this.packet)return;const p=this.p;
  if(configRevision(p.data)!==this.base){this.status.textContent=tr('当前配置已在其他窗口修改，请重新选择文件并预览。');this.applyButton.disabled=true;return;}
  if(p.templateWriteBusy){this.status.textContent=tr('模板正在保存，请稍后重试。');return;}
  this.saving=true;p.templateWriteBusy=true;const previous={},applied={};try{const {patch,changes}=planImport(p.data,this.packet,this.choices);if(!changes.length)return;for(const key of Object.keys(patch)){previous[key]=p.data[key];p.data[key]=patch[key];applied[key]=patch[key];}await p.persist();for(const o of p.owners.values())o.radial?.cancel();for(const leaf of this.app.workspace.getLeavesOfType(TEMPLATE_VIEW))leaf.view.drawLibrary?.();new Notice(tr('已导入 ')+changes.length+tr(' 项配置；已有卡片保持原样'));this.close();}catch(e){for(const key of Object.keys(previous)){if(p.data[key]!==applied[key])continue;if(previous[key]===undefined)delete p.data[key];else p.data[key]=previous[key];}this.status.textContent=tr('导入失败：')+e.message;}finally{p.templateWriteBusy=false;this.saving=false;}
 }
 onClose(){this.fileTicket=null;if(this.p.modal===this)this.p.modal=null;this.contentEl.empty();}
}
