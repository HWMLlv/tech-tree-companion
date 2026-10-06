import {replaceSvg} from './svg-dom.js';
import {dependencyState} from './dependency.js';
import {TemplateView} from './template-view.js';
import {Modal,PluginSettingTab,Setting,Notice} from 'obsidian';
import {AssetModal,resourceStats} from './asset-ui.js';
import {connectionStyle,ARROWHEADS,DEFAULT_CONNECTION_STYLE,validStrokeColor} from './connection-style.js';
import {fontSettings} from './font-ui.js';
import {radialSettings} from './radial-editor.js';
import {choices,colorControls} from './appearance-ui.js';
import {nativeLibrary} from './native-runtime.js';
import {arrowType,withArrowType,previewArrow} from './connection-preview.js';
const heads={none:'无',arrow:'箭头',bar:'横线',dot:'实心点',circle:'圆形',circle_outline:'空心圆',triangle:'三角',triangle_outline:'空心三角',diamond:'菱形',diamond_outline:'空心菱形',crowfoot_one:'一',crowfoot_many:'多',crowfoot_one_or_many:'一或多'};
const icon=body=>`<svg viewBox="0 0 32 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const headIcon=value=>icon('<path d="M3 12H22"/>'+({none:'<path d="m24 9 5 6m0-6-5 6" opacity=".4"/>',arrow:'<path d="m18 6 7 6-7 6"/>',bar:'<path d="M24 5v14"/>',dot:'<circle cx="23" cy="12" r="4" fill="currentColor"/>',circle:'<circle cx="23" cy="12" r="5" fill="currentColor"/>',circle_outline:'<circle cx="23" cy="12" r="5"/>',triangle:'<path d="m27 12-10-6v12Z" fill="currentColor"/>',triangle_outline:'<path d="m27 12-10-6v12Z"/>',diamond:'<path d="m28 12-6-6-6 6 6 6Z" fill="currentColor"/>',diamond_outline:'<path d="m28 12-6-6-6 6 6 6Z"/>',crowfoot_one:'<path d="M20 6v12M25 6v12"/>',crowfoot_many:'<path d="m28 5-9 7 9 7M19 12h10"/>',crowfoot_one_or_many:'<path d="M16 5v14m12-14-9 7 9 7M19 12h10"/>'})[value??'none']);
const forms=new WeakMap();
function form(el,plugin,onSaved,initial=plugin.data.connectionStyle){
 forms.get(el)?.();let disposed=false,timer=null,revision=0;forms.set(el,()=>{disposed=true;window.clearTimeout(timer);});
 let draft=connectionStyle(initial);el.empty();el.addClass('tt-connection-form');new Setting(el).setName('默认连线样式').setHeading();
 el.createEl('p',{cls:'tt-muted',text:'用于后续快捷连线与新手绘箭头。左侧调整，右侧使用 Excalidraw 原生渲染预览；保存不会自动改变已有箭头。'});
 new Setting(el).setName('手绘新箭头使用默认样式').addToggle(t=>t.setValue(plugin.data.nativeArrowDefaults!==false).onChange(async value=>{const old=plugin.data.nativeArrowDefaults;plugin.data.nativeArrowDefaults=value;try{await plugin.persist();for(const o of plugin.owners.values())o.arrowDefaults?.sync(undefined,true);}catch(e){plugin.data.nativeArrowDefaults=old;plugin.error(e);form(el,plugin,onSaved,draft);}}));
 const layout=el.createDiv({cls:'tt-connection-layout'}),controls=layout.createDiv({cls:'tt-connection-controls'}),preview=layout.createDiv({cls:'tt-connection-preview'});preview.createEl('h3',{text:'实时预览'});const art=preview.createDiv({cls:'tt-connection-art'}),status=preview.createDiv({cls:'tt-muted',attr:{role:'status'}});
 const updatePreview=()=>{const ticket=++revision;art.setAttribute("aria-busy","true");window.clearTimeout(timer);timer=window.setTimeout(async()=>{if(disposed||!el.isConnected||plugin.stopped)return;try{const lib=nativeLibrary(plugin,el.ownerDocument);if(!lib?.convertToExcalidrawElements||!lib?.exportToSvg){art.setAttribute('aria-busy','false');status.textContent='原生预览尚未就绪，请启用 Excalidraw 后重新打开设置。';return;}const elements=lib.convertToExcalidrawElements([previewArrow(draft)],{regenerateIds:false});const svg=await lib.exportToSvg({elements,files:{},appState:{exportBackground:false,exportWithDarkMode:false,viewBackgroundColor:'#ffffff'},exportPadding:28,skipInliningFonts:true});if(disposed||ticket!==revision||!el.isConnected||plugin.stopped)return;art.replaceChildren(svg);art.setAttribute("aria-busy","false");status.textContent=arrowType(draft)==='sharp'?'直线：显示实际直线路径。':'两处转折：观察线型、拐角与两端端点。';}catch(e){if(ticket===revision&&el.isConnected){art.setAttribute('aria-busy','false');status.textContent='预览暂不可用：'+e.message;}}},40);};
 const refreshers=[];const sync=()=>refreshers.forEach(fn=>fn());
 const set=(key,value)=>{draft[key]=value;sync();updatePreview();};
 const draw=()=>{controls.empty();refreshers.length=0;
  const select=(label,items,get,change)=>{const group=choices(controls,label,items,get(),change);refreshers.push(()=>{for(const b of group.querySelectorAll('[data-value]'))b.setAttribute('aria-pressed',String(b.dataset.value===String(get())));});};
  const colors=colorControls(controls,'描边',['#1e1e1e','#e03131','#2f9e44','#1971c2','#f08c00'],draft.strokeColor,v=>set('strokeColor',v),{owner:plugin});refreshers.push(()=>colors.updateValue(draft.strokeColor));
  const lib=nativeLibrary(plugin,el.ownerDocument),widths=['extraThin','thin','medium','bold','extraBold'].map((k,i)=>lib?.getStrokeWidthByKey?.('arrow',k)??[.5,1,2,4,8][i]);
  select('描边宽度',widths.map((value,i)=>({value,label:['很细','细','标准','粗','很粗'][i],icon:icon(`<path d="M5 12H27" stroke-width="${value}"/>`)})),()=>draft.strokeWidth,v=>set('strokeWidth',v));
  select('边框样式',['solid','dashed','dotted'].map((value,i)=>({value,label:['实线','虚线','点线'][i],icon:icon(`<path d="M4 12H28"${i?' stroke-dasharray="'+(i===1?'6 4':'1 4')+'"':''}/>`)})),()=>draft.strokeStyle,v=>set('strokeStyle',v));
  select('线条风格',[0,1,2].map((value,i)=>({value,label:['平滑','轻手绘','手绘'][i],icon:icon(['<path d="m4 17 24-10"/>','<path d="M4 17Q12 10 17 13T28 7"/>','<path d="m4 18 7-7 4 4 10-9m-18 8 5-5 6 6 10-9"/>'][i])})),()=>draft.roughness,v=>set('roughness',v));
  select('箭头类型',[{value:'sharp',label:'直线',icon:icon('<path d="m6 18 20-12m-8 0h8v8"/>')},{value:'round',label:'曲线',icon:icon('<path d="M5 19Q5 7 15 7h10m-6-5 6 5-6 5"/>')},{value:'elbow',label:'肘形',icon:icon('<path d="M5 19V12H20V5H28m-4-3 4 3-4 3"/>')}],()=>arrowType(draft),v=>{draft=withArrowType(draft,v);sync();updatePreview();});
  const ends=controls.createDiv({cls:'tt-connection-ends'});for(const [key,label]of [['startArrowhead','起点'],['endArrowhead','终点']]){const detail=ends.createEl('details'),summary=detail.createEl('summary',{text:label+' · '+heads[draft[key]??'none']});replaceSvg(summary.createSpan(),headIcon(draft[key]));const group=choices(detail,label,ARROWHEADS.map(value=>({value,label:heads[value??'none'],icon:headIcon(value)})),draft[key],v=>set(key,v));refreshers.push(()=>{summary.textContent=label+' · '+heads[draft[key]??'none'];replaceSvg(summary.createSpan(),headIcon(draft[key]));for(const b of group.querySelectorAll('[data-value]'))b.setAttribute('aria-pressed',String(b.dataset.value===String(draft[key])));});}
  const opacity=controls.createEl('label',{cls:'tt-style-group'});const caption=opacity.createDiv({cls:'tt-style-label',text:'不透明度'}),value=caption.createSpan({text:draft.opacity+'%'}),slider=opacity.createEl('input',{type:'range',attr:{min:'0',max:'100',step:'1','aria-label':'不透明度'}});slider.value=String(draft.opacity);refreshers.push(()=>{slider.value=String(draft.opacity);value.textContent=draft.opacity+'%';});slider.oninput=()=>{draft.opacity=Number(slider.value);value.textContent=slider.value+'%';updatePreview();};
  if(!widths.includes(draft.strokeWidth)||![0,1,2].includes(draft.roughness))controls.createDiv({cls:'tt-muted',text:`保留自定义值：线宽 ${draft.strokeWidth}，手绘程度 ${draft.roughness}。选择档位后替换。`});
  plugin.hintRoot(controls);
 };draw();updatePreview();
 const actions=el.createDiv({cls:'tt-actions'});actions.createEl('button',{text:'恢复推荐值'}).onclick=()=>{draft=connectionStyle(DEFAULT_CONNECTION_STYLE);sync();updatePreview();};const save=actions.createEl('button',{text:'保存默认样式',cls:'mod-cta'});save.onclick=async()=>{if(!validStrokeColor(draft.strokeColor)){new Notice('请选择有效的颜色');return;}save.disabled=true;try{await plugin.saveConnectionStyle(draft);new Notice('默认连线样式已保存，将用于后续新连线');onSaved?.();}catch(e){plugin.error(e);}finally{save.disabled=false;}};
 el.createEl('p',{cls:'tt-muted',text:'也可选中画布箭头，运行“将选中箭头设为默认连线”。这里只保存样式，不复制位置、拐点或绑定目标。'});
}
export class ConnectionStyleModal extends Modal{
 constructor(plugin){super(plugin.app);this.plugin=plugin;}
 onOpen(){this.modalEl.addClass('tt-connection-modal');form(this.contentEl,this.plugin,()=>this.close());}
 onClose(){forms.get(this.contentEl)?.();if(this.plugin.modal===this)this.plugin.modal=null;this.contentEl.empty();}
}
export class ConnectionSettingTab extends PluginSettingTab{
 constructor(plugin){super(plugin.app,plugin);this.plugin=plugin;}
 display(){
  if(this.connectionRoot)forms.get(this.connectionRoot)?.();const root=this.containerEl;root.empty();root.addClass('tt-settings-page');
  const pageTitle=root.createEl('p',{cls:'tt-muted',text:'按用途调整轮盘、字体、连线和卡片资源。',attr:{id:'tt-settings-'+crypto.randomUUID()}});
  const dependency=dependencyState(this.plugin);if(!dependency.ready)root.createDiv({cls:'tt-muted',attr:{role:'status'},text:dependency.message});
  const nav=root.createEl('nav',{cls:'tt-settings-nav',attr:{'aria-labelledby':pageTitle.id}});
  const section=label=>{const el=root.createEl('section',{cls:'tt-settings-section'});const b=nav.createEl('button',{text:label,attr:{type:'button'}});b.onclick=()=>{el.style.scrollMarginTop=(nav.offsetHeight+parseFloat(root.ownerDocument.defaultView.getComputedStyle(root).paddingTop)+8)+'px';el.scrollIntoView({block:'start'});const heading=el.querySelector('.setting-item-heading .setting-item-name');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}};return el;};
  const radial=section('快捷轮盘');radialSettings(radial,this.plugin);
  const font=section('节点字体');fontSettings(font,this.plugin);
  this.connectionRoot=section('默认连线');form(this.connectionRoot,this.plugin);
  const templates=section('卡片模板');new Setting(templates).setName('卡片模板管理').setHeading();const templateInfo=new Setting(templates).setName('已保存的卡片模板');const describe=()=>templateInfo.setDesc('共 '+this.plugin.templates().length+' 个模板 · 默认：'+this.plugin.defaultTemplate().name);describe();templateInfo.addButton(b=>b.setButtonText('管理模板').onClick(()=>{const modal=TemplateView.openManager(this.plugin);modal.onClosed=()=>{if(templates.isConnected)describe();};}));
  const assets=section('资源管理');new Setting(assets).setName('资源管理').setHeading();const summary=assets.createDiv(),status=assets.createDiv({cls:'tt-muted',attr:{role:'status'}}),token=this.summaryToken={};
  let refreshButton;const refresh=async()=>{if(this.summaryToken!==token||!root.isConnected||this.plugin.stopped)return;refreshButton.disabled=true;status.textContent='正在读取资源概览…';try{const report=await this.plugin.assets.observe();if(this.summaryToken!==token||!root.isConnected||this.plugin.stopped)return;resourceStats(summary,report);status.textContent=report.errors.length?'扫描未完成，以上为部分结果；请打开管理资源查看。':'可整理包含为撤销保留的附件，不代表现在即可回收。';}catch(e){if(this.summaryToken===token)status.textContent='读取失败：'+e.message;}finally{if(this.summaryToken===token)refreshButton.disabled=false;}};
  new Setting(assets).setName('卡片附件与回收站').setDesc('查看引用、设置保存位置与文件名，或恢复已回收的附件。').addButton(b=>{refreshButton=b.buttonEl;b.setButtonText('刷新概览').onClick(refresh);}).addButton(b=>b.setButtonText('管理资源').onClick(()=>{const modal=new AssetModal(this.plugin);modal.onClosed=refresh;modal.open();}));refresh();
  for(const el of root.querySelectorAll('.tt-settings-section')){const heading=el.querySelector('.setting-item-heading .setting-item-name');if(heading){heading.id='tt-section-'+crypto.randomUUID();el.setAttribute('aria-labelledby',heading.id);}}

 }

 hide(){this.summaryToken=null;if(this.connectionRoot)forms.get(this.connectionRoot)?.();}
}

