import rough from 'roughjs/bundled/rough.cjs.js';
export const DEFAULT_APPEARANCE={strokeWidth:2,strokeStyle:'solid',roughness:0,corner:'round',opacity:100,textOpacity:100,fillStyle:'solid'};
export const appearance=t=>({...DEFAULT_APPEARANCE,...t.appearance});
export const isColor=c=>c==='transparent'||/^#[0-9a-f]{6}$/i.test(c);
export const tidyNumber=n=>Math.round(n*100)/100;
export function validateAppearance(t){const a=appearance(t);if(![0,1,2,4,6].includes(a.strokeWidth)||!['solid','dashed','dotted'].includes(a.strokeStyle)||![0,1,2].includes(a.roughness)||!['round','square'].includes(a.corner)||![a.opacity,a.textOpacity].every(n=>Number.isFinite(n)&&n>=0&&n<=100)||!['solid','hachure','cross-hatch'].includes(a.fillStyle))throw Error('节点外观设置无效');return a;}
export const fillMetrics=a=>({gap:Math.max(16,a.strokeWidth*4)*(a.fillStyle==='cross-hatch'?1.25:1),weight:Math.max(1.5,a.strokeWidth/2),roughness:a.roughness*.7});
const generator=rough.generator();
const seed=id=>{let h=17;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return h%2147483646+1;};
// One closed contour: corners share endpoints, so thick/dashed strokes never grow separate spurs.
function contour(x,y,w,h,r,bow=0){
 const right=x+w,bottom=y+h;
 if(!r)return `M ${x} ${y} C ${x+w/3} ${y+bow} ${right-w/3} ${y+bow} ${right} ${y} C ${right-bow} ${y+h/3} ${right-bow} ${bottom-h/3} ${right} ${bottom} C ${right-w/3} ${bottom-bow} ${x+w/3} ${bottom-bow} ${x} ${bottom} C ${x+bow} ${bottom-h/3} ${x+bow} ${y+h/3} ${x} ${y} Z`;
 const k=r*.55228475;
 return `M ${x+r} ${y} C ${x+w/3} ${y+bow} ${right-w/3} ${y+bow} ${right-r} ${y} C ${right-r+k} ${y} ${right} ${y+r-k} ${right} ${y+r} C ${right-bow} ${y+h/3} ${right-bow} ${bottom-h/3} ${right} ${bottom-r} C ${right} ${bottom-r+k} ${right-r+k} ${bottom} ${right-r} ${bottom} C ${right-w/3} ${bottom-bow} ${x+w/3} ${bottom-bow} ${x+r} ${bottom} C ${x+r-k} ${bottom} ${x} ${bottom-r+k} ${x} ${bottom-r} C ${x+bow} ${bottom-h/3} ${x+bow} ${y+h/3} ${x} ${y+r} C ${x} ${y+r-k} ${x+r-k} ${y} ${x+r} ${y} Z`;
}
export function renderFrame(t){
 const a=validateAppearance(t),inset=Math.max(1,a.strokeWidth/2+1),w=t.width-inset*2,h=t.height-inset*2,r=a.corner==='round'?Math.min(32,Math.min(w,h)*.12):0;
 const path=contour(inset,inset,w,h,r),stroke=a.strokeWidth&&t.border!=='transparent'?t.border:'none';
 const parts=[];
 // Transparent means no fill operation, regardless of the remembered fill preset.
 if(t.background!=='transparent'){
  if(a.fillStyle==='solid')parts.push(`<path d="${path}" fill="${t.background}" stroke="none"/>`);
  else {const fill=fillMetrics(a),drawing=generator.path(path,{seed:seed(t.id),stroke:'none',roughness:fill.roughness,fill:t.background,fillStyle:a.fillStyle,hachureGap:fill.gap,fillWeight:fill.weight,disableMultiStrokeFill:true});parts.push(...generator.toPaths(drawing).map(p=>`<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill}"/>`));}
 }
 if(stroke!=='none'){
  const dash=a.strokeStyle==='dashed'?`${Math.max(6,a.strokeWidth*2)} ${Math.max(6,a.strokeWidth*2)}`:a.strokeStyle==='dotted'?`0.01 ${Math.max(5,a.strokeWidth*2.5)}`:null;
  const outline=`${dash?' stroke-dasharray="'+dash+'"':''} stroke-linecap="round" stroke-linejoin="round"`;
  const amount=a.roughness*.65,sign=seed(t.id)%2?1:-1;
  const draw=bow=>`<path d="${contour(inset,inset,w,h,r,bow)}" fill="none" stroke="${stroke}" stroke-width="${a.strokeWidth}"${outline}/>`;
  parts.push(draw(amount*sign));
  // Keep double-stroke character subtle; dashes have a single contour to keep their gaps clean.
  if(a.roughness===2&&a.strokeStyle==='solid')parts.push(draw(-amount*sign*.6));
 }
 return parts.join('');
}
export function resizeTemplate(t,width,height){t.width=width;t.height=height;}
