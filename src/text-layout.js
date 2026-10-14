const finite=(value,fallback)=>Number.isFinite(value)?Math.max(0,value):fallback;
export function textLayout(text,{width,height,fontSize,fontWeight=400},measure,{clip=true}={}){
 text=String(text);const lineHeight=fontSize*1.3,raw=[];
 for(const paragraph of text.split('\n')){let line='';for(const c of Array.from(paragraph)){if(line&&measure(line+c,fontSize,fontWeight)>width){raw.push(line);line='';}line+=c;}raw.push(line);}
 const metrics=content=>{const m=measure.metrics?.(fontSize,fontWeight,content)??{};return {ascent:finite(m.ascent,fontSize*.8),descent:finite(m.descent,fontSize*.2),fontAscent:finite(m.fontAscent,fontSize*.9),fontDescent:finite(m.fontDescent,fontSize*.3)};};
 let ink=metrics(raw.join(' '));const maxLines=Math.max(1,Math.floor((height-ink.ascent-ink.descent)/lineHeight+1e-7)+1);
 const overflow=!!text&&(raw.length>maxLines||ink.ascent+ink.descent>height+1e-7||raw.some(line=>measure(line,fontSize,fontWeight)>width+1e-7));
 const lines=clip?raw.slice(0,maxLines):raw;
 if(clip&&raw.length>maxLines){let last=lines.at(-1);while(last&&measure(last+'…',fontSize,fontWeight)>width)last=Array.from(last).slice(0,-1).join('');lines[lines.length-1]=last+'…';ink=metrics(lines.join(' '));}
 const inkHeight=text?(lines.length-1)*lineHeight+ink.ascent+ink.descent:0;
 return {lines,lineHeight,overflow,inkHeight,baseline:Math.max(0,(height-inkHeight)/2)+ink.ascent,...ink};
}
// Native text controls include a whole first/last line box; SVG only includes ink.
// Keep that leading outside the visible field, without changing the saved font.
export function inlineFieldGeometry(module,text,measure,scale,placeholder=''){
 const options={width:module.w,height:module.h,fontSize:module.fontSize,fontWeight:module.fontWeight};
 const actual=textLayout(text,options,measure,{clip:false}),layout=text?actual:textLayout(placeholder,options,measure,{clip:false});
 const nativeBaseline=(layout.lineHeight-layout.fontAscent-layout.fontDescent)/2+layout.fontAscent,top=layout.baseline-nativeBaseline;
 return {top:top*scale,height:Math.max(module.h-top,layout.lineHeight,layout.fontAscent+layout.fontDescent)*scale+2,lineHeight:layout.lineHeight*scale,fontSize:module.fontSize*scale,overflow:actual.overflow};
}
