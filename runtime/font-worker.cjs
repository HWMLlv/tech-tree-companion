const subsetFont=require('subset-font');
// Only visible SVG text is needed, including ellipses produced by clipping.
const decode=s=>s.replace(/&#x([\da-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi,(_,hex,num,name)=>hex?String.fromCodePoint(parseInt(hex,16)):num?String.fromCodePoint(+num):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[name]);
const visibleText=svg=>[...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(m=>decode(m[1].replace(/<[^>]*>/g,''))).join('');
// Keep each font shard's coverage, but describe only characters used by this SVG.
// Dropping unicode-range entirely can make an unrelated shard win font selection.
function compactFontRanges(svg,text){
 const points=[...new Set([...text].map(c=>c.codePointAt(0)))].sort((a,b)=>a-b);
 return svg.replace(/@font-face\s*\{[^{}]*\}/gi,face=>face.replace(/(unicode-range\s*:\s*)([^;}]+)/gi,(declaration,prefix,value)=>{
  const ranges=value.split(',').map(part=>{
   const match=part.trim().match(/^U\+([\da-f]{1,6}|[\da-f]{0,5}\?{1,6})(?:-([\da-f]{1,6}))?$/i);
   if(!match||match[1].length>6||(match[1].includes('?')&&match[2]))return null;
   const lo=parseInt(match[1].replaceAll('?','0'),16),hi=parseInt(match[2]??match[1].replaceAll('?','F'),16);
   return lo<=hi&&hi<=0x10ffff?[lo,hi]:null;
  });
  if(ranges.some(range=>!range))return declaration;
  const used=points.filter(point=>ranges.some(([lo,hi])=>point>=lo&&point<=hi));
  if(!used.length)return declaration;
  const hex=n=>n.toString(16).toUpperCase(),parts=[];
  for(let i=0;i<used.length;i++){
   const start=used[i];let end=start;
   while(used[i+1]===end+1)end=used[++i];
   parts.push('U+'+hex(start)+(end===start?'':'-'+hex(end)));
  }
  const small=parts.join(',');
  return small.length<value.length?prefix+small:declaration;
 }));
}
async function compact(svg){
 const text=visibleText(svg);
 const sources=[...new Set(svg.match(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/g)??[])];
 for(const src of sources){const original=Buffer.from(src.split(',')[1],'base64'),small=await subsetFont(original,text,{targetFormat:'woff2',preserveNameIds:[0,1,2,3,4,5,6,13,14]});
  if(small.length<original.length)svg=svg.split(src).join('data:font/woff2;base64,'+small.toString('base64'));
 }
 return compactFontRanges(svg,text);
}
let tail=Promise.resolve();
if(typeof self!=='undefined'&&self.postMessage)self.onmessage=({data:{id,svg}})=>{tail=tail.then(()=>compact(svg)).then(svg=>self.postMessage({id,svg}),error=>self.postMessage({id,error:error.message}));};
module.exports={compact,compactFontRanges,visibleText};
