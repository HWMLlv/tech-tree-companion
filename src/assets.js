import {assetFolder,assetFilename,ownedAssetPath} from './asset-names.js';
import LZString from 'lz-string';
export const ASSET_ROOT='科技树资源/卡片',RECYCLE_ROOT='科技树资源/回收区',GRACE_MS=7*86400000;
const marker='<metadata id="tech-tree-resource">v1</metadata>';
export const managedSVG=svg=>svg.includes(marker)?svg:svg.replace(/(<svg\b[^>]*>)/,'$1'+marker);
export async function sha256(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
export function parseDrawing(text){
 const compressed=text.match(/```compressed-json\s*\n([\s\S]*?)```/),plain=text.match(/```json\s*\n([\s\S]*?)```/);
 const scene=JSON.parse(compressed?LZString.decompressFromBase64(compressed[1].replace(/\s/g,'')):plain?plain[1]:text);
 if(!Array.isArray(scene.elements))throw Error('缺少绘图元素');return scene;
}
export class Assets{
 constructor(plugin){this.plugin=plugin;this.pending=new Map();this.active=0;this.revision=0;}
 get vault(){return this.plugin.app.vault;}
 get records(){return this.plugin.data.resources??=( {} );}
 schedule(){window.clearTimeout(this.timer);if(this.plugin.stopped)return;this.timer=window.setTimeout(()=>{this.observe().catch(e=>console.warn('[科技树资源扫描]',e.message));},Math.max(5000,60000-(Date.now()-(this.lastReview??0))));}
 destroy(){window.clearTimeout(this.timer);}
 async folder(path){let p='';for(const part of path.split('/')){p=p?p+'/'+part:part;if(!this.vault.getAbstractFileByPath(p))try{await this.vault.createFolder(p);}catch(e){if(!this.vault.getAbstractFileByPath(p))throw e;}}}
 async acquire(svg,title){
  if(this.plugin.stopped)throw Error('插件已关闭');if(this.recycling)throw Error('正在回收资源，请稍后重试');
  this.active++;try{svg=managedSVG(svg);const hash=await sha256(svg);
   if(this.pending.has(hash))return await this.pending.get(hash);
   const existing=Object.entries(this.records).find(([path,r])=>r.hash===hash&&ownedAssetPath(path,hash));
   const folder=assetFolder(this.plugin.data.assetSettings?.folder),sequence=existing?0:(this.plugin.data.assetSequence=(this.plugin.data.assetSequence??0)+1);
   const path=existing?.[0]??folder+'/'+assetFilename(this.plugin.data.assetSettings?.pattern,title,hash,sequence);
   this.plugin.data.assetFolders=[...new Set([...(this.plugin.data.assetFolders??[]),folder])];
   if(this.pending.has(hash))return await this.pending.get(hash);
   const job=(async()=>{let file=this.vault.getAbstractFileByPath(path);
    if(file){if(await this.vault.read(file)!==svg)throw Error('资源校验失败，未覆盖已有文件');}
    else{await this.folder(path.slice(0,path.lastIndexOf('/')));this.records[path]??={hash,createdAt:Date.now(),title:title||'未命名科技'};await this.plugin.persist();const old=this.records[path],recycled=old?.quarantinePath===RECYCLE_ROOT+'/'+hash+'.svg'&&this.vault.getAbstractFileByPath(old.quarantinePath);if(recycled){if(await this.vault.read(recycled)!==svg)throw Error('回收资源已改变，未覆盖');await this.vault.rename(recycled,path);file=recycled;}else file=await this.vault.create(path,svg);}
    const record=this.records[path]??={hash,createdAt:Date.now()};record.title??=title||'未命名科技';record.lastUsed=Date.now();delete record.unreferencedSince;
    delete record.quarantinePath;delete record.recycledAt;
    // Journal before publishing to the scene; interrupted saves remain discoverable.
    await this.plugin.persist();return file;
   })();this.pending.set(hash,job);try{return await job;}finally{this.pending.delete(hash);}
  }finally{this.active--;}
 }
 async scan(){
  const revision=this.revision,files=this.vault.getFiles(),references=new Set(),errors=[],texts=[],sources=[],legacy=[],rows=[];
  for(const file of files){
   if(!/\.(md|canvas|json|excalidraw|svg|html|css)$/i.test(file.path)||file.path.startsWith(ASSET_ROOT+'/')||file.path.startsWith(RECYCLE_ROOT+'/')||this.records[file.path])continue;
   try{const text=await this.vault.read(file);texts.push(text);sources.push({path:file.path,text});try{texts.push(decodeURIComponent(text));sources.at(-1).text+=decodeURIComponent(text);}catch{/* Invalid percent escapes: retain the original text for reference scanning. */}
    if(/\.excalidraw(?:\.md)?$/i.test(file.path)||/^excalidraw-plugin:/m.test(text)){const scene=parseDrawing(text);texts.push(JSON.stringify(scene));sources.at(-1).text+=JSON.stringify(scene);}
   }catch(e){errors.push(file.path+': '+e.message);}
  }
  // Include Obsidian's resolved links, which cover relative and aliased Markdown links.
  this.plugin.app.workspace.iterateAllLeaves?.(leaf=>{try{const draft=leaf.view?.editor?.getValue?.();if(typeof draft==='string')texts.push(draft);}catch(e){errors.push('无法检查已打开的笔记草稿：'+e.message);}});
  for(const targets of Object.values(this.plugin.app.metadataCache?.resolvedLinks??{}))for(const path of Object.keys(targets))references.add(path);
  const mentions=path=>references.has(path)||texts.some(text=>text.includes(path)||text.includes(path.split('/').pop()));
  for(const [path,r]of Object.entries(this.records)){
   if(!ownedAssetPath(path,r.hash)){errors.push('无效资源记录：'+path);continue;}
   const expectedRecycle=RECYCLE_ROOT+'/'+r.hash+'.svg';if(r.quarantinePath&&r.quarantinePath!==expectedRecycle){errors.push('无效回收记录：'+path);continue;}
   const file=this.vault.getAbstractFileByPath(r.quarantinePath??path)??this.vault.getAbstractFileByPath(path);if(!file){rows.push({path,bytes:0,status:'missing'});continue;}
   const linked=mentions(path)||mentions(file.path);rows.push({path,usedBy:[...new Set([...sources.filter(s=>s.text.includes(path)||s.text.includes(file.name)).map(s=>s.path),...Object.entries(this.plugin.app.metadataCache?.resolvedLinks??{}).filter(([,targets])=>targets[path]||targets[file.path]).map(([source])=>source)])],bytes:file.stat.size,status:r.quarantinePath&&file.path===r.quarantinePath?'recycled':linked?'referenced':'unused',since:r.unreferencedSince??null,eligible:!r.quarantinePath&&!linked&&!!r.unreferencedSince&&Date.now()-r.unreferencedSince>=GRACE_MS,trashable:!!r.quarantinePath&&!linked&&Date.now()-(r.recycledAt??Date.now())>=30*86400000});
  }
  for(const file of files){if(file.extension==='svg'&&!file.path.startsWith(ASSET_ROOT+'/')&&!file.path.startsWith(RECYCLE_ROOT+'/')&&/^Pasted Image .+\.svg$/.test(file.name)&&!mentions(file.path))legacy.push({path:file.path,bytes:file.stat.size});}
  // Recover owned files created just before a crash, without assuming arbitrary SVG ownership.
  const roots=[ASSET_ROOT,...(this.plugin.data.assetFolders??[])];const untracked=files.filter(f=>f.extension==='svg'&&roots.some(root=>f.path.startsWith(root+'/'))&&!this.records[f.path]).map(f=>f.path);
  return {revision,rows,legacy,untracked,errors,openDrawings:this.plugin.app.workspace.getLeavesOfType('excalidraw').length+this.plugin.app.workspace.getLeavesOfType('canvas').length,scanned:files.length};
 }
 async observe(){if(this.observing)return this.observing;this.observing=this.review().finally(()=>this.observing=null);return this.observing;}
 async review(){const report=await this.scan();this.lastReview=Date.now();if(this.plugin.stopped||this.recycling||this.active||this.plugin.busy.size||report.errors.length||report.revision!==this.revision)return report;
  for(const row of report.rows){const r=this.records[row.path];if(row.status!=='missing'&&r.quarantinePath&&!this.vault.getAbstractFileByPath(r.quarantinePath)&&this.vault.getAbstractFileByPath(row.path)){delete r.quarantinePath;delete r.recycledAt;}if(row.status==='unused')r.unreferencedSince??=Date.now();else if(row.status==='referenced')delete r.unreferencedSince;}
  for(const path of report.untracked){const file=this.vault.getAbstractFileByPath(path),text=await this.vault.read(file),hash=await sha256(text);if(text.includes(marker)&&ownedAssetPath(path,hash))this.records[path]={hash,createdAt:file.stat.ctime,unreferencedSince:Date.now()};}
  await this.plugin.persist();return this.scan();
 }
 assertIdle(){if(this.active||this.plugin.busy.size||this.plugin.stopped||this.plugin.app.workspace.getLeavesOfType('excalidraw').length||this.plugin.app.workspace.getLeavesOfType('canvas').length)throw Error('请先关闭所有绘图和白板页，保护尚未结束的撤销历史，再执行回收。');}
 async recycle(paths){
  this.assertIdle();if(this.recycling)throw Error('资源回收正在进行');this.recycling=true;const moved=[];
  try{await this.folder(RECYCLE_ROOT);const report=await this.scan();if(report.errors.length||report.revision!==this.revision)throw Error('引用检查不完整或仓库已改变，请重新扫描');
   const eligible=new Set(report.rows.filter(r=>r.eligible).map(r=>r.path));if(paths.some(p=>!eligible.has(p)))throw Error('候选项已改变或未满 7 天，请重新扫描');
   let expected=this.revision;
   for(const path of paths){this.assertIdle();if(this.revision!==expected)throw Error('仓库已改变，已停止后续回收');const r=this.records[path],file=this.vault.getAbstractFileByPath(path),svg=await this.vault.read(file);if(await sha256(svg)!==r.hash||!svg.includes(marker))throw Error('资源内容已改变，停止回收');
    this.assertIdle();if(this.revision!==expected)throw Error('仓库已改变，请重新扫描');const to=RECYCLE_ROOT+'/'+r.hash+'.svg';if(this.vault.getAbstractFileByPath(to))throw Error('回收目标已存在');
    // Journal the destination first, allowing recovery after an interrupted rename.
    r.quarantinePath=to;r.recycledAt=Date.now();await this.plugin.persist();
    try{this.assertIdle();if(this.revision!==expected)throw Error('仓库已改变，请重新扫描');await this.vault.rename(file,to);}catch(e){delete r.quarantinePath;delete r.recycledAt;await this.plugin.persist();throw e;}moved.push(path);if(this.revision>expected+1)throw Error('仓库同时发生其他变化，已停止后续回收');expected=this.revision;
   }return moved;
  }finally{this.recycling=false;}
 }
 async restore(path){const r=this.records[path];if(!r?.quarantinePath||r.quarantinePath!==RECYCLE_ROOT+'/'+r.hash+'.svg'||!ownedAssetPath(path,r.hash))throw Error('无效回收记录');const file=this.vault.getAbstractFileByPath(r.quarantinePath);if(!file)throw Error('回收文件不存在');if(await sha256(await this.vault.read(file))!==r.hash)throw Error('回收文件已改变');if(this.vault.getAbstractFileByPath(path))throw Error('原位置已有文件，未覆盖');await this.folder(path.slice(0,path.lastIndexOf('/')));await this.vault.rename(file,path);delete r.quarantinePath;delete r.recycledAt;delete r.unreferencedSince;r.lastUsed=Date.now();await this.plugin.persist();}
 async trash(paths){this.assertIdle();if(this.recycling)throw Error('资源回收正在进行');this.recycling=true;try{const report=await this.scan(),allowed=new Set(report.rows.filter(r=>r.trashable).map(r=>r.path));if(report.errors.length||report.revision!==this.revision||paths.some(p=>!allowed.has(p)))throw Error('引用已改变、检查不完整或回收未满 30 天');let expected=this.revision;for(const path of paths){this.assertIdle();const r=this.records[path],file=this.vault.getAbstractFileByPath(r.quarantinePath);if(!file||await sha256(await this.vault.read(file))!==r.hash)throw Error('文件已改变');if(expected!==this.revision)throw Error('仓库已改变，请重新扫描');this.assertIdle();await this.vault.trash(file,true);if(this.revision>expected+1)throw Error("仓库同时发生其他变化，已停止后续回收");expected=this.revision;delete this.records[path];await this.plugin.persist();}}finally{this.recycling=false;}}
}
