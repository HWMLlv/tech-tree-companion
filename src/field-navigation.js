export function editableFields(template){return template.modules.filter(m=>['title','summary','field'].includes(m.type)).sort((a,b)=>a.y-b.y||a.x-b.x);}
export function adjacentField(fields,id,key){
 const from=fields.find(f=>f.id===id);if(!from)return fields[0]?.id??null;
 const horizontal=key==='ArrowLeft'||key==='ArrowRight',sign=key==='ArrowLeft'||key==='ArrowUp'?-1:1,cx=from.x+from.w/2,cy=from.y+from.h/2;
 return fields.filter(f=>f!==from).map(f=>{const dx=f.x+f.w/2-cx,dy=f.y+f.h/2-cy;return {id:f.id,forward:(horizontal?dx:dy)*sign,side:Math.abs(horizontal?dy:dx)};}).filter(f=>f.forward>0).sort((a,b)=>(a.side*2+a.forward)-(b.side*2+b.forward))[0]?.id??id;
}
