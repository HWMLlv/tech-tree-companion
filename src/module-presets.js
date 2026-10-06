import {clone,uid,validateTemplate} from './model.js';
// A preset is a reusable module definition, not an instance or a live reference.
export function modulePreset(module,name){const clean=String(name??'').trim();if(!clean||clean.length>60)throw Error('模块名称需为 1～60 个字符');return {id:uid(),name:clean,module:{...clone(module),x:0,y:0}};}
export function placePreset(preset,template,x=16,y=16,options={}){
 const m=clone(preset.module),snap=n=>Math.round(n/template.grid)*template.grid;m.id=uid();m.w=Math.min(m.w,template.width);m.h=Math.min(m.h,template.height);m.x=Math.max(0,Math.min(template.width-m.w,snap(x)));m.y=Math.max(0,Math.min(template.height-m.h,snap(y)));
 // Repeated custom fields are independent; title/summary retain their role.
 if(m.type==='field'&&template.modules.some(e=>e.field===m.field))m.field='field_'+uid().replaceAll('-','').slice(0,12);
 validateTemplate({...template,modules:[...template.modules,m]},options);return m;
}
