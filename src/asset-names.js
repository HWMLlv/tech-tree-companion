export const DEFAULT_ASSET_FOLDER='科技树资源/卡片';
export const DEFAULT_ASSET_PATTERN='{title}-{hash}';
const tokens=new Set(['title','date','time','seq','hash']);
const control=s=>[...s].some(c=>c.codePointAt(0)<32);
export function assetFolder(value=DEFAULT_ASSET_FOLDER){
 const path=String(value).trim().replaceAll('\\','/').replace(/\/$/,'');
 if(!path||path.length>160||path.split('/').some(p=>!p||p.startsWith('.')||/[<>:"|?*#[\]^]/.test(p)||control(p)||/[ .]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))||path==='科技树资源/回收区'||path.startsWith('科技树资源/回收区/'))throw Error('请选择仓库内的普通文件夹，不使用隐藏目录、回收区或特殊字符。');
 return path;
}
export function assetPattern(value=DEFAULT_ASSET_PATTERN){
 const pattern=String(value).trim();if(!pattern||pattern.length>100||/[<>:"/\\|?*#[\]^]/.test(pattern)||control(pattern))throw Error('命名规则需为 1～100 字符，不能包含路径或特殊字符。');
 const rest=pattern.replace(/\{([^{}]+)\}/g,(_,key)=>{if(!tokens.has(key))throw Error('未知命名字段：'+key);return '';});if(/[{}]/.test(rest))throw Error('命名字段需要完整的大括号。');return pattern;
}
export function assetFilename(pattern,title,hash,seq=1,date=new Date()){
 pattern=assetPattern(pattern);const pad=n=>String(n).padStart(2,'0'),clean=[...String(title||'未命名科技')].map(c=>c.codePointAt(0)<32||/[<>:"/\\|?*#[\]^{}]/.test(c)?'_':c).join('').replace(/[ .]+$/,'').slice(0,60)||'未命名科技';
 const values={title:clean,date:`${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}`,time:`${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,seq:String(seq).padStart(3,'0'),hash:hash.slice(0,12)};
 let name=pattern.replace(/\{([^{}]+)\}/g,(_,k)=>values[k]).replace(/[ .]+$/,'').slice(0,100);
 if(!name||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='卡片-'+name;
 if(name===hash.slice(0,12))name='卡片-'+name;else if(!name.endsWith('-'+hash.slice(0,12)))name+='-'+hash.slice(0,12);
 return name+'.svg';
}
export function ownedAssetPath(path,hash){
 if(!/^[a-f0-9]{64}$/.test(hash??''))return false;
 const i=path.lastIndexOf('/');if(i<1)return false;try{assetFolder(path.slice(0,i));}catch{return false;}
 const name=path.slice(i+1);return !/[<>:"/\\|?*#[\]^]/.test(name)&&!control(name)&&(name===hash+'.svg'||name.endsWith('-'+hash.slice(0,12)+'.svg'));
}
