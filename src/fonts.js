export const NATIVE_FONTS=[{name:'Excalifont',id:5,label:'Excalifont · 手写'},{name:'Comic Shanns',id:8,label:'Comic Shanns · 手写等宽'},{name:'Nunito',id:6,label:'Nunito · 圆体'},{name:'Lilita One',id:7,label:'Lilita One · 粗标题'},{name:'Virgil',id:1,label:'Virgil · 手写（旧）'},{name:'Cascadia',id:3,label:'Cascadia · 等宽（旧）'},{name:'Helvetica',id:2,label:'Helvetica · 系统映射（旧）'}];
export const nativeFont=name=>NATIVE_FONTS.find(f=>f.name===name);
export const nativeAlias=name=>'TTNative_'+name.replaceAll(' ','_');
export const DEFAULT_FONT='Microsoft YaHei';
export const FONT_CHOICES=['Microsoft YaHei','SimSun','SimHei','KaiTi','FangSong','DengXian','Arial','Georgia','Times New Roman','Consolas','sans-serif','serif','monospace'];
export const FONT_LABELS={'Microsoft YaHei':'微软雅黑',SimSun:'宋体',SimHei:'黑体',KaiTi:'楷体',FangSong:'仿宋',DengXian:'等线',Arial:'Arial · 西文无衬线',Georgia:'Georgia · 西文衬线','Times New Roman':'Times New Roman · 西文衬线',Consolas:'Consolas · 等宽','sans-serif':'系统无衬线','serif':'系统衬线','monospace':'系统等宽'};
export const fontLabel=name=>NATIVE_FONTS.find(f=>f.name===name)?.label??FONT_LABELS[name]??name;
export function fontOptions(names=FONT_CHOICES,query=''){const q=query.trim().toLocaleLowerCase();return [...new Set(names)].filter(validFont).filter(name=>(name+' '+fontLabel(name)).toLocaleLowerCase().includes(q));}
export const validFont=name=>typeof name==='string'&&/^[\p{L}\p{N} _().@+-]{1,100}$/u.test(name);
export const fontName=name=>validFont(name)?name:DEFAULT_FONT;
export function effectiveFont(template,globalFont){return fontName(template.fontFamily||template.resolvedFontFamily||globalFont);}
export const fontStack=name=>nativeFont(name)?(name==='Helvetica'?'Helvetica, Arial, "Microsoft YaHei", sans-serif':`"${nativeAlias(name)}", ${name==='Excalifont'?'"TTNative_Xiaolai", ':''}"Microsoft YaHei", ${['Cascadia','Comic Shanns'].includes(name)?'monospace':'sans-serif'}`):['sans-serif','serif','monospace'].includes(name)?name:`"${fontName(name)}", "Microsoft YaHei", sans-serif`;
export function snapshotFont(template,globalFont,refresh=false){const t=structuredClone(template);if(refresh||!t.resolvedFontFamily)t.resolvedFontFamily=fontName(t.fontFamily||globalFont);return t;}
