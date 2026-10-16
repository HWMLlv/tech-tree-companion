import {tr} from './i18n.js';
import {textLayout} from './text-layout.js';
import {ICONS,iconBody} from './icons.js';
import {effectiveFont,fontStack,validFont} from './fonts.js';
import {isColor,validateAppearance,renderFrame} from './appearance.js';
import {cardShape,containsShapePoint,containsModule} from './card-shape.js';
export const SCHEMA=1;
export const FONT_SIZES=[12,16,22,30,40];
export const moduleDefaultFontSize=type=>type==='title'?22:type==='button'?12:16;
export const buttonFill=m=>m.fillColor??'#dbeafe';
export const clone=x=>structuredClone(x);
export const uid=()=>crypto.randomUUID();
export function replaceModuleIcon(template,id,key){
 const module=template.modules.find(m=>m.id===id);
 if(module?.type!=='icon')throw Error(tr('请选择已有的图标模块'));
 if(!Object.hasOwn(ICONS,key))throw Error(tr('请选择支持的图标'));
 module.icon=key;
}
export const DEFAULT_TEMPLATE={id:'builtin-tech',version:1,name:'基础科技卡片',width:352,height:192,grid:8,background:'#eff6ff',border:'#475569',modules:[
 {id:'title',type:'title',field:'title',label:'科技名称',x:16,y:12,w:272,h:40,fontSize:22,color:'#1e293b',align:'left'},
 {id:'summary',type:'summary',field:'summary',label:'摘要',x:16,y:56,w:320,h:48,fontSize:16,color:'#334155',align:'left'},
 {id:'materials',type:'field',field:'materials',label:'材料',x:16,y:112,w:320,h:24,fontSize:16,color:'#1e293b',align:'left'},
 {id:'research',type:'field',field:'research',label:'研究点',x:16,y:144,w:320,h:24,fontSize:16,color:'#1e293b',align:'left'},
 {id:'details',type:'button',action:'details',label:'详情',x:296,y:16,w:40,h:32,fontSize:12,color:'#2563eb',align:'center'}
]};
const colors=/^#[0-9a-f]{6}$/i;
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export const outsideModules=t=>t.modules.filter(m=>m.x+m.w>t.width+1e-7||m.y+m.h>t.height+1e-7||cardShape(t)!=='rectangle'&&!containsModule(t,m));
export function validateTemplate(t,{allowOverflow=false}={}){
 if(!t||!t.id||!t.name?.trim()||!Number.isInteger(t.version)||t.version<1)throw Error(tr('模板名称或版本无效'));
 if(t.fontFamily&&!validFont(t.fontFamily))throw Error(tr('字体名称无效，请输入本机字体名称'));
 if(!number(t.width,80,2400)||!number(t.height,64,2400)||!number(t.grid,1,64)||!isColor(t.background)||!isColor(t.border))throw Error(tr('模板尺寸或颜色无效'));
 validateAppearance(t);
 if(!['rectangle','ellipse','diamond'].includes(cardShape(t)))throw Error(tr('不支持的卡片形状'));
 if(!Array.isArray(t.modules)||t.modules.length>100)throw Error(tr('模板最多包含 100 个模块'));
 const ids=new Set();
 for(const m of t.modules){
  if(!m.id||ids.has(m.id))throw Error(tr('模块标识重复'));ids.add(m.id);
  if(!['title','summary','field','text','divider','button','icon'].includes(m.type))throw Error(tr('未知模块类型'));
  if(!number(m.x,0,2400)||!number(m.y,0,2400)||!number(m.w,8,2400)||!number(m.h,2,2400))throw Error(tr('模块位置或尺寸无效'));
  if(!allowOverflow&&(m.x+m.w>t.width+1e-7||m.y+m.h>t.height+1e-7||cardShape(t)!=='rectangle'&&!containsModule(t,m)))throw Error(tr('模块超出卡片边界，请扩大外框或移动／调整越界模块后保存'));
  if((m.fontWeight!==undefined&&![400,600,700].includes(m.fontWeight))||!number(m.fontSize,8,80)||!colors.test(m.color)||!['left','center','right'].includes(m.align))throw Error(tr('模块文字样式无效'));
  if(['title','summary','field'].includes(m.type)&&!/^[a-zA-Z][\w-]{0,63}$/.test(m.field??''))throw Error(tr('字段键需使用字母开头的英文、数字、下划线或连字符'));
  if(m.type==='icon'&&!Object.hasOwn(ICONS,m.icon))throw Error(tr('请选择支持的图标'));
  if(m.type==='button'&&m.fillColor!==undefined&&!colors.test(m.fillColor))throw Error(tr('按钮填充颜色无效'));
  if(m.type==='button'&&!['details','edit'].includes(m.action))throw Error(tr('按钮动作无效'));
 }
 return t;
}
export const moduleFontWeight=m=>m.fontWeight??(m.type==='title'?600:400);
export const isTech=e=>e?.type==='image'&&e.customData?.techTree?.schema===SCHEMA;
export function instance(template,values={}){validateTemplate(template);return {schema:SCHEMA,templateId:template.id,templateVersion:template.version,template:clone(template),values:clone(values)};}
export function fields(template){const seen=new Set();return template.modules.filter(m=>['title','summary','field'].includes(m.type)&&!seen.has(m.field)&&(seen.add(m.field),true));}
const xml=s=>[...String(s)].filter(c=>c.codePointAt(0)>=32||['\t','\n','\r'].includes(c)).join('').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function moduleText(m,values){
 if(['divider','icon'].includes(m.type))return ''; 
 if(m.type==='text'||m.type==='button')return m.label??'';
 const value=String(values[m.field]??'');
 if(m.type==='title')return value||tr('未命名科技');
 if(m.type==='summary')return value||'';
 return `${m.label||m.field}：${value||'—'}`;
}
export function renderNode(template,values={},measure,font=effectiveFont(template),fontCSS='',options={}){
 validateTemplate(template,options);const overflow=[];
 measure??=((text,size)=>Array.from(text).reduce((s,c)=>s+(c.codePointAt(0)>255?size:size*.58),0));
 const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${template.width}" height="${template.height}" viewBox="0 0 ${template.width} ${template.height}"><defs><style>${fontCSS}</style></defs><g opacity="${validateAppearance(template).opacity/100}">${renderFrame(template)}</g><g opacity="${validateAppearance(template).textOpacity/100}">`];
 for(const m of template.modules){
  const weight=moduleFontWeight(m);
  if(m.type==='icon'){parts.push(`<svg x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" color="${m.color}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconBody(m.icon)}</svg>`);continue;}
  if(m.type==='divider'){parts.push(`<path d="M ${m.x} ${m.y+m.h/2} h ${m.w}" stroke="${m.color}" stroke-width="1"/>`);continue;}
  if(m.type==='button')parts.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="4" fill="${buttonFill(m)}" stroke="${m.color}"/>`);
  const pad=m.type==='button'?4:0,available=m.w-pad*2,layout=textLayout(moduleText(m,values),{width:available,height:m.h,fontSize:m.fontSize,fontWeight:weight},measure),{lines,lineHeight}=layout;
  if(layout.overflow)overflow.push(m.id);
  const align=m.type==='button'?'center':m.align,x=align==='center'?m.x+m.w/2:align==='right'?m.x+m.w-pad:m.x+pad;
  const baseline=m.y+layout.baseline;
  parts.push(`<svg x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" viewBox="${m.x} ${m.y} ${m.w} ${m.h}" overflow="hidden"><text font-family="${xml(fontStack(font))}" font-size="${m.fontSize}" font-weight="${weight}" fill="${m.color}" text-anchor="${align==='center'?'middle':align==='right'?'end':'start'}">`);
  lines.forEach((line,i)=>parts.push(`<tspan x="${x}" y="${baseline+i*lineHeight}">${xml(line)}</tspan>`));parts.push('</text></svg>');
 }
 return {svg:parts.join('')+'</g></svg>',overflow};
}
export function svgData(svg){const bytes=new TextEncoder().encode(svg);let text='';for(const b of bytes)text+=String.fromCharCode(b);return 'data:image/svg+xml;base64,'+btoa(text);}
export function localPoint(e,p){
 const dx=p.x-e.x-e.width/2,dy=p.y-e.y-e.height/2,a=-(e.angle??0),t=e.customData.techTree.template;
 const x=(dx*Math.cos(a)-dy*Math.sin(a))/(e.width/2),y=(dx*Math.sin(a)+dy*Math.cos(a))/(e.height/2);
 return {x:(x*(e.scale?.[0]??1)+1)*t.width/2,y:(y*(e.scale?.[1]??1)+1)*t.height/2};
}
export function hitNode(e,p){const q=localPoint(e,p),t=e.customData.techTree.template;return containsShapePoint(cardShape(t),q.x,q.y,t.width,t.height);}
export function hitButton(e,p){if(!hitNode(e,p))return;const q=localPoint(e,p);return [...e.customData.techTree.template.modules].reverse().find(m=>m.type==='button'&&q.x>=m.x&&q.y>=m.y&&q.x<=m.x+m.w&&q.y<=m.y+m.h);}
export function shapeTemplate(kind){
 const t=clone(DEFAULT_TEMPLATE),size={ellipse:[384,240],circle:[256,256],diamond:[384,256]}[kind];
 if(!size)return {...t,modules:[]};
 [t.width,t.height]=size;t.shape=kind==='circle'?'ellipse':kind;
 const layout={ellipse:[[92,64,200,36],[72,104,240,32],[152,152,80,28]],circle:[[56,64,144,36],[48,108,160,36],[88,160,80,28]],diamond:[[132,76,120,36],[104,116,176,28],[156,156,72,28]]}[kind];
 t.modules=[t.modules[0],t.modules[1],t.modules[4]].map((m,i)=>({...m,x:layout[i][0],y:layout[i][1],w:layout[i][2],h:layout[i][3],align:'center'}));
 return t;
}
