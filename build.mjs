import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
// Self-contained Web Worker: no Node process, external runtime, CDN, or filesystem APIs.
const worker=await build({entryPoints:['runtime/font-worker.cjs'],bundle:true,format:'iife',platform:'browser',target:'es2022',write:false,metafile:true,minify:true,inject:['runtime/buffer-shim.js'],loader:{'.wasm':'binary'},define:{process:'undefined'},plugins:[{name:'font-browser-adapter',setup(b){
 b.onLoad({filter:/subset-font[\\/]index\.js$/},async args=>({contents:fs.readFileSync(args.path,'utf8').replace("const { readFile } = require('fs').promises;",'').replace("await readFile(require.resolve('harfbuzzjs/dist/harfbuzz-subset.wasm'))","require('harfbuzzjs/dist/harfbuzz-subset.wasm')"),loader:'js'}));
 b.onLoad({filter:/wawoff2[\\/](?:decompress|compress)\.js$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace('em_module.onRuntimeInitialized = resolve','if (em_module.calledRun) resolve(); else em_module.onRuntimeInitialized = resolve'),loader:'js'}));
 b.onLoad({filter:/wawoff2[\\/]build[\\/].+_binding\.js$/},args=>({contents:fs.readFileSync(args.path,'utf8')+'\nmodule.exports=Module;',loader:'js'}));
 b.onResolve({filter:/^(fs|path)$/},args=>({path:args.path,namespace:'unreachable-node'}));b.onLoad({filter:/.*/,namespace:'unreachable-node'},()=>({contents:'throw new Error("Node APIs are unavailable in the font worker")',loader:'js'}));
 }}]});
const bundledWorker=worker.outputFiles[0].text;
const entry=await build({entryPoints:['src/main.js'],bundle:true,format:'cjs',platform:'browser',target:'es2022',external:['obsidian'],write:false,metafile:true,minify:true,plugins:[{name:'embedded-font-worker',setup(b){
 b.onResolve({filter:/^virtual:font-worker$/},()=>({path:'font-worker',namespace:'embedded-worker'}));
 b.onLoad({filter:/.*/,namespace:'embedded-worker'},()=>({contents:bundledWorker,loader:'text'}));
}}]});
const packages=new Map();
for(const input of [...Object.keys(worker.metafile.inputs),...Object.keys(entry.metafile.inputs)]){
 if(!input.includes('node_modules/'))continue;
 let dir=path.dirname(path.resolve(input));
 while(dir!==path.dirname(dir)){
  const file=path.join(dir,'package.json');
  if(fs.existsSync(file)){const meta=JSON.parse(fs.readFileSync(file,'utf8'));if(meta.name){packages.set(meta.name,{dir,meta});break;}}
  dir=path.dirname(dir);
 }
}
const notices=[fs.readFileSync('LICENSE','utf8')];
for(const [name,{dir,meta}]of [...packages].sort(([a],[b])=>a.localeCompare(b))){
 const files=fs.readdirSync(dir).filter(f=>/^licen[cs]e(?:[.-]|$)|^copying(?:\.|$)|^notice(?:\.|$)/i.test(f)&&fs.statSync(path.join(dir,f)).isFile());
 const supplement=path.join('third-party',name.replaceAll('/','_')+'.LICENSE');
 if(!files.length&&!fs.existsSync(supplement))throw Error('Missing bundled dependency license: '+name);
 notices.push(name+' '+meta.version+'\n'+(files.length?files.map(file=>fs.readFileSync(path.join(dir,file),'utf8')).join('\n'):fs.readFileSync(supplement,'utf8')));
}
const licenses=notices.join('\n\n----\n\n');
if(licenses.includes('*/'))throw Error('License text cannot be embedded in a comment');
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/main.js','/*! Tech Tree Companion: project and bundled dependency licenses\n'+licenses+'\n*/\n'+entry.outputFiles[0].text);
for(const file of ['manifest.json','styles.css'])fs.copyFileSync(file,'dist/'+file);
fs.writeFileSync('THIRD-PARTY-NOTICES.txt',licenses);
console.log('Built the three-file community release; no vault files changed.');
