import {NATIVE_FONTS,nativeFont,nativeAlias} from './fonts.js';
import {nativePackages} from './native-runtime.js';

import {FontCache,trustedFontURL} from './font-cache.js';
// Remote resources are resolved through the persistent cache before SVG embedding.
const dataFont=url=>typeof url==='string'&&/^data:font\/woff2;base64,[A-Za-z0-9+/=]+$/.test(url);
export function rangeMatches(range,text){
 if(!range)return true;
 const ranges=range.split(',').map(r=>r.trim().match(/^U\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/i));
 if(ranges.some(r=>!r))return false;
 return [...text].some(c=>ranges.some(r=>{const lo=parseInt(r[1].replaceAll('?','0'),16),hi=parseInt(r[2]??r[1].replaceAll('?','F'),16),n=c.codePointAt(0);return n>=lo&&n<=hi;}));
}
export function fontPlan(registry,name,text='',resolved=new Map()){
 const native=nativeFont(name);if(!native)return {faces:[],pending:[],css:'',available:true};
 const entry=registry?.get(native.id),faces=[],pending=[];let missingCJK=name==='Excalifont'&&/\p{Script=Han}/u.test(text)&&!registry?.get(100)?.fontFaces?.length;
 const collect=(source,family)=>{for(const item of source?.fontFaces??[]){
  const face=item.fontFace,urls=(item.urls??[]).map(String),url=family==='Xiaolai'?urls.find(trustedFontURL):null,src=urls.find(dataFont)??resolved.get(url),range=face?.unicodeRange??'U+0-10FFFF';
  if(!rangeMatches(range,text)||!/^\d{1,4}(?: \d{1,4})?$/.test(face.weight??'400')||!['normal','italic','oblique'].includes(face.style??'normal'))continue;
  const descriptor={family:nativeAlias(family),src,weight:face.weight??'400',style:face.style??'normal',unicodeRange:range};if(src)faces.push(descriptor);else if(url)pending.push({...descriptor,url});else if(family==='Xiaolai')missingCJK=true;
 }};
 collect(entry,name);if(name==='Excalifont')collect(registry?.get(100),'Xiaolai');
 const available=!missingCJK&&(name==='Helvetica'||!!entry?.fontFaces?.some(f=>f.urls?.some(dataFont)));
 const css=faces.map(f=>`@font-face{font-family:"${f.family}";src:url("${f.src}") format("woff2");font-weight:${f.weight};font-style:${f.style};unicode-range:${f.unicodeRange};}`).join('');
 return {faces,pending,css,available,missingCJK};
}
export class NativeFonts{
 constructor(plugin,request){this.plugin=plugin;this.documents=new Map();this.watchers=new Set();if(request)this.cache=new FontCache({adapter:plugin.app.vault.adapter,directory:plugin.manifest.dir+'/font-cache',request,stopped:()=>plugin.stopped});}
 registry(doc){const merged=new Map();for(const pkg of nativePackages(this.plugin,doc)){const registry=pkg?.excalidrawLib?.Fonts?.registered;for(const [id,entry]of registry??[])if(!merged.get(id)?.fontFaces?.length)merged.set(id,entry);}return merged;}
 watch(doc,notify){let timer=null,stopped=false,attempt=0,last='';const win=doc.defaultView,stop=()=>{stopped=true;win.clearTimeout(timer);this.watchers.delete(stop);};this.watchers.add(stop);const tick=()=>{if(stopped||this.plugin.stopped||win.closed){stop();return;}const names=this.names(doc),ready=NATIVE_FONTS.every(f=>names.includes(f.name)),state=ready?'ready':attempt++>=150?'unavailable':'waiting',key=state+'|'+names.join('|');if(key!==last){last=key;notify(names,state);}if(stopped)return;if(state==='waiting')timer=win.setTimeout(tick,200);else stop();};tick();return stop;}

 names(doc){const registry=this.registry(doc);return NATIVE_FONTS.filter(f=>fontPlan(registry,f.name,'Aa').available).map(f=>f.name);}
 plan(doc,name,text){return fontPlan(this.registry(doc),name,text,this.cache?.memory);}
 async ensure(doc,plan){
  for(const [old,cache]of this.documents)if(old.defaultView?.closed){for(const {face}of cache.values())old.fonts.delete(face);this.documents.delete(old);}
  if(!plan.available)return Promise.reject(Error(plan.missingCJK?'原生中文字体资源不可用，请检查 Excalidraw 版本或选择其他字体。':'原生字体资源暂不可用，请先启用 Excalidraw，或改选其他字体。'));
  if(this.plugin.stopped)return Promise.reject(Error('插件已关闭'));
  if(plan.pending?.length){if(!this.cache)throw Error('中文字体缓存不可用');for(let i=0;i<plan.pending.length;i+=3)await Promise.all(plan.pending.slice(i,i+3).map(async f=>{const src=await this.cache.get(f.url);plan.faces.push({...f,src});}));plan.pending=[];}
  let cache=this.documents.get(doc);if(!cache)this.documents.set(doc,cache=new Map());
  return Promise.all(plan.faces.map(f=>{
   const key=f.family+'|'+f.src+'|'+f.weight+'|'+f.style+'|'+f.unicodeRange;if(cache.has(key))return cache.get(key).promise;
   const face=new doc.defaultView.FontFace(f.family,`url("${f.src}")`,{weight:f.weight,style:f.style,unicodeRange:f.unicodeRange});
   const entry={face};entry.promise=face.load().then(()=>{if(this.plugin.stopped)throw Error('插件已关闭');doc.fonts.add(face);return face;}).catch(e=>{cache.delete(key);throw e;});cache.set(key,entry);return entry.promise;
  }));
 }
 ready(doc,plan){const cache=this.documents.get(doc);return plan.available&&!plan.pending?.length&&plan.faces.every(f=>cache?.get(f.family+'|'+f.src+'|'+f.weight+'|'+f.style+'|'+f.unicodeRange)?.face.status==='loaded');}
 destroy(){for(const stop of [...this.watchers])stop();for(const [doc,cache]of this.documents)for(const {face}of cache.values())doc.fonts.delete(face);this.documents.clear();this.cache?.destroy();}
}
