import fontWorkerSource from 'virtual:font-worker';
// Bundled browser Worker; a standard community installation needs no runtime folder.
export class FontSubset {
 constructor(plugin){this.plugin=plugin;this.cache=new Map();this.jobs=new Map();this.serial=0;}
 async compact(svg){
  if(!svg.includes('data:font/woff2;base64,'))return svg;
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(svg))),b=>b.toString(16).padStart(2,'0')).join('');
  if(this.cache.has(digest)){const value=this.cache.get(digest);this.cache.delete(digest);this.cache.set(digest,value);return value;}
  if(this.stopped||this.plugin.stopped)throw Error('插件已关闭');
  if(!this.worker){
   this.loading??=Promise.resolve().then(()=>{if(this.stopped||this.plugin.stopped)throw Error('插件已关闭');const url=URL.createObjectURL(new Blob([fontWorkerSource],{type:'text/javascript'}));try{this.worker=new Worker(url);}finally{URL.revokeObjectURL(url);}
    this.worker.onmessage=({data:{id,svg,error}})=>{const job=this.jobs.get(id);if(!job)return;window.clearTimeout(job.timer);this.jobs.delete(id);error?job.reject(Error('字体裁剪失败，节点未保存：'+error)):job.resolve(svg);if(!this.jobs.size)this.idle=window.setTimeout(()=>this.reset(Error('字体处理已空闲')),30000);};this.worker.onerror=e=>this.reset(Error(e.message||'字体处理失败'));
   }).finally(()=>this.loading=null);await this.loading;
  }
  window.clearTimeout(this.idle);const result=await new Promise((resolve,reject)=>{const id=++this.serial,timer=window.setTimeout(()=>this.reset(Error('字体裁剪超时，节点未保存')),30000);this.jobs.set(id,{resolve,reject,timer});this.worker.postMessage({id,svg});});
  this.cache.set(digest,result);while(this.cache.size>24||[...this.cache.values()].reduce((n,s)=>n+s.length,0)>4*1024*1024)this.cache.delete(this.cache.keys().next().value);
  return result;
 }
 reset(error){window.clearTimeout(this.idle);const worker=this.worker;this.worker=null;if(worker){worker.onmessage=null;worker.onerror=null;worker.terminate();}for(const job of this.jobs.values()){window.clearTimeout(job.timer);job.reject(error);}this.jobs.clear();}
 destroy(){this.stopped=true;this.reset(Error('插件已关闭'));this.cache.clear();}
}
