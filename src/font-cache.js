// Only the versioned Xiaolai assets registered by Excalidraw may be fetched.
export const trustedFontURL=url=>typeof url==='string'&&/^https:\/\/(?:unpkg\.com\/@zsviczian\/excalidraw@\d+\.\d+\.\d+\/dist\/excalidraw-assets|esm\.sh\/@zsviczian\/excalidraw@\d+\.\d+\.\d+\/dist\/prod\/fonts\/Xiaolai)\/Xiaolai-Regular-[a-f0-9]{32}\.woff2$/.test(url);
export function validWOFF2(buffer){const b=new Uint8Array(buffer);return b.length>=48&&b.length<=4*1024*1024&&String.fromCharCode(...b.slice(0,4))==='wOF2'&&new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(8)===b.length;}
export function fontData(buffer){let s='';const b=new Uint8Array(buffer);for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return 'data:font/woff2;base64,'+btoa(s);}
export class FontCache{
 constructor({adapter,directory,request,stopped=()=>false}){Object.assign(this,{adapter,directory,request,stopped});this.memory=new Map();this.pending=new Map();this.failures=new Map();this.downloads=0;this.diskHits=0;}
 async path(url){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));return this.directory+'/'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+'.woff2';}
 async get(url){
  if(!trustedFontURL(url))throw Error('中文字体来源不受支持，请检查 Excalidraw 版本');
  if(this.stopped())throw Error('插件已关闭');
  if(this.memory.has(url)){const value=this.memory.get(url);this.memory.delete(url);this.memory.set(url,value);return value;}
  if(this.pending.has(url))return this.pending.get(url);
  const failure=this.failures.get(url);if(failure&&Date.now()-failure.time<30000)throw failure.error;
  const pending=this.load(url).catch(cause=>{const error=Error('中文手写字体获取失败，请检查网络后重试；当前节点未保存。',{cause});this.failures.set(url,{time:Date.now(),error});while(this.failures.size>32)this.failures.delete(this.failures.keys().next().value);throw error;}).finally(()=>this.pending.delete(url));this.pending.set(url,pending);return pending;
 }
 retry(){this.failures.clear();}
 async load(url){
  const path=await this.path(url);let bytes;
  try{const cached=await this.adapter.readBinary(path);if(validWOFF2(cached)){bytes=cached;this.diskHits++;}}catch{/* Missing or invalid disposable cache: download the font below. */}
  if(!bytes){
   let timer;try{bytes=await Promise.race([this.request(url),new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(Error('字体下载超时')),20000);})]);}finally{window.clearTimeout(timer);}
   if(!validWOFF2(bytes))throw Error('字体资源损坏或不是 WOFF2');
   if(this.stopped())throw Error('插件已关闭');
   this.mkdir??=this.adapter.exists(this.directory).then(exists=>exists?undefined:this.adapter.mkdir(this.directory)).catch(error=>{this.mkdir=null;throw error;});await this.mkdir;
   if(this.stopped())throw Error('插件已关闭');await this.adapter.writeBinary(path,bytes);this.downloads++;
  }
  if(this.stopped())throw Error('插件已关闭');const data=fontData(bytes);this.memory.set(url,data);
  while(this.memory.size>64||[...this.memory.values()].reduce((n,s)=>n+s.length,0)>16*1024*1024)this.memory.delete(this.memory.keys().next().value);
  // Only disposable font-cache files; never generated cards or user attachments.
  this.pruning??=this.prune().catch(()=>{}).finally(()=>this.pruning=null);return data;
 }
 async prune(){if(!this.adapter.list||!this.adapter.stat||!this.adapter.remove||this.stopped())return;const {files}=await this.adapter.list(this.directory),protectedPaths=new Set(await Promise.all([...this.pending.keys(),...this.memory.keys()].map(url=>this.path(url))));const candidates=[];let total=0;
  for(const path of files){if(!path.startsWith(this.directory+'/')||!/^[a-f0-9]{64}\.woff2$/.test(path.slice(this.directory.length+1)))continue;const stat=await this.adapter.stat(path);if(stat){total+=stat.size;candidates.push({path,...stat});}}
  candidates.sort((a,b)=>a.mtime-b.mtime);for(const item of candidates){if(this.stopped())return;if(protectedPaths.has(item.path))continue;if(total<=16*1024*1024&&Date.now()-item.mtime<30*86400000)continue;await this.adapter.remove(item.path);total-=item.size;}
 }
 destroy(){this.memory.clear();this.failures.clear();}
}
