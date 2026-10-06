// Palette values adapted from Excalidraw packages/common/src/colors.ts (MIT).
// Open Color shades and Radix bronze shades; see docs/配色来源与许可.md.
export const PALETTE=[
 ['transparent','透明','transparent'],['white','白色','#ffffff'],['gray','灰色',['#f8f9fa','#e9ecef','#ced4da','#868e96','#343a40']],['black','黑色','#1e1e1e'],['bronze','棕色',['#f8f1ee','#eaddd7','#d2bab0','#a18072','#846358']],
 ['cyan','青色',['#e3fafc','#99e9f2','#3bc9db','#15aabf','#0c8599']],['blue','蓝色',['#e7f5ff','#a5d8ff','#4dabf7','#228be6','#1971c2']],['violet','蓝紫',['#f3f0ff','#d0bfff','#9775fa','#7950f2','#6741d9']],['grape','紫色',['#f8f0fc','#eebefa','#da77f2','#be4bdb','#9c36b5']],['pink','粉色',['#fff0f6','#fcc2d7','#f783ac','#e64980','#c2255c']],
 ['green','绿色',['#ebfbee','#b2f2bb','#69db7c','#40c057','#2f9e44']],['teal','蓝绿',['#e6fcf5','#96f2d7','#38d9a9','#12b886','#099268']],['yellow','黄色',['#fff9db','#ffec99','#ffd43b','#fab005','#f08c00']],['orange','橙色',['#fff4e6','#ffd8a8','#ffa94d','#fd7e14','#e8590c']],['red','红色',['#fff5f5','#ffc9c9','#ff8787','#fa5252','#e03131']]
];
export const COLOR_KEYS='qwertasdfgzxcvb';
export function normalizeHex(value){let s=String(value).trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(s))s=[...s].map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(s)?'#'+s.toLowerCase():null;}
export function locateColor(color){for(const [id,label,colors]of PALETTE){const shade=Array.isArray(colors)?colors.indexOf(color):null;if(shade!==-1&&(Array.isArray(colors)||colors===color))return {id,label,colors,shade};}return null;}
export const colorAt=(entry,shade)=>Array.isArray(entry[2])?entry[2][shade]:entry[2];
export const rememberColor=(list,color)=>locateColor(color)||!normalizeHex(color)?list:[color,...list.filter(c=>c!==color)].slice(0,5);
export function contrastInk(hex){if(hex==='transparent')return '#1e1e1e';const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114<160?'#ffffff':'#1e1e1e';}
