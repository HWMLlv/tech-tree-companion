import {connectionStyle} from './connection-style.js';
export const arrowType=s=>s.elbowed?'elbow':s.roundness?'round':'sharp';
export function withArrowType(style,type){return {...style,elbowed:type==='elbow',roundness:type==='sharp'?null:{type:2}};}
export function previewArrow(style){const s=connectionStyle(style),bent=arrowType(s)!=='sharp';return {id:'tt-preview-arrow',type:'arrow',x:30,y:30,width:260,height:140,points:bent?[[0,0],[130,0],[130,140],[260,140]]:[[0,0],[260,140]],...s,seed:17};}
