import {replaceSvg} from './svg-dom.js';
import {ICONS,iconSVG} from './icons.js';
import {appearance,resizeTemplate,tidyNumber} from './appearance.js';
import {fontInput} from './font-ui.js';
import {moduleFontWeight,FONT_SIZES,buttonFill} from './model.js';
import {ColorPopup} from './color-popup.js';
const STROKES=['#1e1e1e','#e03131','#2f9e44','#1971c2','#f08c00'];
const BACKGROUNDS=['transparent','#ffc9c9','#b2f2bb','#a5d8ff','#ffec99'];
const icon=body=>`<svg viewBox="0 0 32 24" aria-hidden="true">${body}</svg>`;
export function choices(root,label,items,current,onChange){
 const group=root.createDiv({cls:'tt-style-group'});group.createDiv({cls:'tt-style-label',text:label});const row=group.createDiv({cls:'tt-style-options',attr:{role:'group','aria-label':label}});
 for(const item of items){const b=row.createEl('button',{cls:'tt-style-choice',attr:{type:'button',title:item.label,'aria-label':item.label,'aria-pressed':String(item.value===current),'data-value':String(item.value)}});if(item.icon)replaceSvg(b,item.icon);else b.textContent=item.label;b.onclick=()=>onChange(item.value);}
 return group;
}
export function colorControls(root,label,colors,value,onChange,options={}){
 const group=root.createDiv({cls:'tt-style-group'});group.createDiv({cls:'tt-style-label',text:label});const row=group.createDiv({cls:'tt-color-options',attr:{role:'group','aria-label':label}});
 for(const c of colors){const b=row.createEl('button',{cls:'tt-color-swatch'+(c==='transparent'?' is-transparent':''),attr:{type:'button',title:c==='transparent'?'透明':c,'aria-label':label+' '+(c==='transparent'?'透明':c),'aria-pressed':String(c.toLowerCase()===value.toLowerCase()),'data-color':c}});if(c!=='transparent')b.style.background=c;b.onclick=()=>onChange(c);}
 const custom=row.createEl('button',{cls:'tt-color-custom'+(value==='transparent'?' is-transparent':''),attr:{type:'button',title:'自定义'+label,'aria-label':'自定义'+label,'aria-haspopup':'dialog'}});if(value!=='transparent')custom.style.background=value;custom.onclick=()=>new ColorPopup(custom,value,onChange,{...options,label,allowTransparent:['背景','描边'].includes(label)}).open();group.updateValue=next=>{value=next;for(const b of row.querySelectorAll('[data-color]'))b.setAttribute('aria-pressed',String(b.dataset.color.toLowerCase()===next.toLowerCase()));custom.style.background=next;custom.classList.toggle('is-transparent',next==='transparent');};return group;
}
export function appearanceControls(root,t,onChange,options={}){
 const a=appearance(t),set=(key,value)=>onChange(d=>{d.appearance={...appearance(d),[key]:value};});
 colorControls(root,'描边',STROKES,t.border,v=>onChange(d=>d.border=v),options);
 colorControls(root,'背景',BACKGROUNDS,t.background,v=>onChange(d=>d.background=v),options);
 if(t.background!=='transparent')choices(root,'填充',[{value:'hachure',label:'斜线',icon:icon('<path d="M4 16L16 4M8 20L24 4M16 20L28 8" stroke="currentColor" fill="none"/>')},{value:'cross-hatch',label:'交叉线',icon:icon('<path d="M4 16L16 4M8 20L24 4M16 20L28 8M4 8L16 20M8 4L24 20M16 4L28 16" stroke="currentColor"/>')},{value:'solid',label:'实心',icon:icon('<rect x="6" y="4" width="20" height="16" rx="2" fill="currentColor"/>')}],a.fillStyle,v=>set('fillStyle',v));
 choices(root,'描边宽度',[0,1,2,4,6].map((v,i)=>({value:v,label:['无描边','细','标准','粗','很粗'][i],icon:icon(`<path d="M5 12H27" stroke="currentColor" stroke-width="${Math.max(1,v)}" stroke-linecap="round"${v===0?' opacity=".2"':''}/>`)})),a.strokeWidth,v=>set('strokeWidth',v));
 choices(root,'边框样式',['solid','dashed','dotted'].map((v,i)=>({value:v,label:['实线','虚线','点线'][i],icon:icon(`<path d="M4 12H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"${i?' stroke-dasharray="'+(i===1?'6 4':'1 4')+'"':''}/>`)})),a.strokeStyle,v=>set('strokeStyle',v));
 choices(root,'线条风格',[{value:0,label:'平滑',icon:icon('<path d="M4 17L28 7" fill="none" stroke="currentColor" stroke-width="2"/>')},{value:1,label:'轻手绘',icon:icon('<path d="M4 17Q12 12 17 13T28 7" fill="none" stroke="currentColor" stroke-width="2"/>')},{value:2,label:'手绘',icon:icon('<path d="M4 18L10 13L12 15L20 8L21 12L28 6M5 16L13 10L17 14L27 8" fill="none" stroke="currentColor"/>')}],a.roughness,v=>set('roughness',v));
 choices(root,'边角',[{value:'square',label:'直角',icon:icon('<path d="M6 20V5H27" fill="none" stroke="currentColor" stroke-width="2"/>')},{value:'round',label:'圆角',icon:icon('<path d="M6 20V13Q6 5 14 5H27" fill="none" stroke="currentColor" stroke-width="2"/>')}],a.corner,v=>set('corner',v));
 for(const [key,label]of [['opacity','外框与背景不透明度'],['textOpacity','内容不透明度']]){
  const row=root.createEl('label',{cls:'tt-style-group'}),caption=row.createDiv({cls:'tt-style-label',text:label}),slider=row.createEl('input',{type:'range',attr:{min:'0',max:'100',step:'5','aria-label':label}});slider.value=String(a[key]);const value=caption.createSpan({cls:'tt-style-number',text:a[key]+'%'});slider.oninput=()=>value.textContent=slider.value+'%';slider.onchange=()=>set(key,Number(slider.value));
 }
 options.owner?.hintRoot?.(root);
 if(t.background==='transparent')root.createDiv({cls:'tt-muted',text:'背景透明：不绘制填充。选择背景色后恢复所选填充样式。'});

}
function textInput(root,label,value,type,apply){const row=root.createEl('label',{cls:'tt-form-label',text:label}),f=row.createEl('input',{type,attr:{'aria-label':label}});f.value=String(type==='number'?tidyNumber(value):value??'');f.onchange=()=>apply(type==='number'?tidyNumber(Number(f.value)):f.value);return f;}
function advanced(root,view,key){const d=root.createEl('details',{cls:'tt-advanced'});d.createEl('summary',{text:'高级设置'});d.open=!!view[key];d.ontoggle=()=>view[key]=d.open;return d;}
export function drawTemplateProperties(view){
 const root=view.properties;if(!root)return;root.empty();const t=view.template,m=t.modules.find(m=>m.id===view.selected),edit=cb=>{view.edit(cb);view.drawProperties();};
 root.createEl('h3',{text:'本模板字体'});
 fontInput(root,t.fontFamily,v=>edit(d=>{d.fontFamily=v;delete d.resolvedFontFamily;}),true,{app:view.app,globalFont:view.plugin.data.fontFamily,owner:view.plugin});
 const tab=view.propertyTab==='module'&&m?'module':'appearance',tabs=root.createDiv({cls:'tt-property-tabs'});
 for(const [id,label]of [['appearance','节点外观'],['module','模块内容']]){const b=tabs.createEl('button',{text:label,attr:{type:'button','aria-pressed':String(tab===id)}});b.disabled=id==='module'&&!m;b.onclick=()=>{view.propertyTab=id;view.drawProperties();};}
 const content=root.createDiv({cls:'tt-property-body'});
 if(tab==='appearance'){
  textInput(content,'模板名称',t.name,'text',v=>edit(d=>d.name=v));
  choices(content,'卡片大小',[{value:'compact',label:'紧凑'},{value:'normal',label:'标准'},{value:'wide',label:'宽卡片'}],t.width===288&&t.height===196?'compact':t.width===352&&t.height===240?'normal':t.width===448&&t.height===240?'wide':'custom',v=>edit(d=>{const size={compact:[288,196],normal:[352,240],wide:[448,240]}[v];resizeTemplate(d,...size);}));
  appearanceControls(content,t,edit,{owner:view.plugin});
  const extra=advanced(content,view,'advancedTemplate');for(const [key,label]of [['width','节点宽度'],['height','节点高度'],['grid','网格间距']])textInput(extra,label,t[key],'number',v=>edit(d=>d[key]=v));
  extra.createEl('p',{cls:'tt-muted',text:'改变卡片大小只调整外框，已有模块的位置和大小保持不变；越界模块会提示，调整后才能保存。已有节点不会自动更新。'});return;
 }
 const set=(key,v)=>edit(d=>d.modules.find(x=>x.id===m.id)[key]=v);
 textInput(content,m.type==='text'?'固定文字':['divider','icon'].includes(m.type)?'模块名称':'显示名称',m.label,'text',v=>set('label',v));
 if(m.type==='divider')content.createDiv({cls:'tt-muted',text:'模块名称仅用于布局编辑时识别，不显示在卡片中。'});
 if(m.type==='icon')choices(content,'图标',Object.entries(ICONS).map(([value,i])=>({value,label:i.label,icon:iconSVG(value)})),m.icon,v=>set('icon',v));
 if(m.type==='button'){const row=content.createEl('label',{cls:'tt-form-label',text:'点击按钮时'}),s=row.createEl('select');for(const [v,label]of [['details','打开详情'],['edit','编辑节点']])s.createEl('option',{value:v,text:label});s.value=m.action;s.onchange=()=>set('action',s.value);}
 colorControls(content,m.type==='divider'?'线条颜色':m.type==='icon'?'图标颜色':'文字颜色',STROKES,m.color,v=>set('color',v),{owner:view.plugin});
 if(m.type==='button')colorControls(content,'填充颜色',BACKGROUNDS.filter(c=>c!=='transparent'),buttonFill(m),v=>set('fillColor',v),{owner:view.plugin});
 if(!['divider','icon'].includes(m.type)){
  choices(content,'字重',[{value:400,label:'常规'},{value:700,label:'粗体'}],moduleFontWeight(m)===400?400:700,v=>set('fontWeight',v));
  choices(content,'字号',FONT_SIZES.map((v,i)=>({value:v,label:['XS','S','M','L','XL'][i]})),m.fontSize,v=>set('fontSize',v));
  content.createDiv({cls:'tt-muted',text:(FONT_SIZES.includes(m.fontSize)?'当前字号：':'自定义字号：')+tidyNumber(m.fontSize)});
  if(m.type==='button')content.createDiv({cls:'tt-muted',text:'按钮文字固定居中。'});else choices(content,'文字对齐',[{value:'left',label:'左对齐'},{value:'center',label:'居中'},{value:'right',label:'右对齐'}],m.align,v=>set('align',v));
 }
 const extra=advanced(content,view,'advancedModule');
 for(const [key,label]of [['x','横向位置'],['y','纵向位置'],['w','模块宽度'],['h','模块高度'],...(['divider','icon'].includes(m.type)?[]:[['fontSize','精确字号']])])textInput(extra,label,m[key],'number',v=>set(key,v));
 if(['title','summary','field'].includes(m.type)){textInput(extra,'手工字段键',m.field,'text',v=>set('field',v));extra.createEl('p',{cls:'tt-muted',text:'同字段键共用文字；通常无需修改，不会读取文档正文。'});}
 content.createEl('button',{text:'保存到我的模块'}).onclick=()=>view.saveModulePreset();
 content.createEl('button',{text:'删除模块',cls:'mod-warning'}).onclick=()=>view.removeSelected();
}
