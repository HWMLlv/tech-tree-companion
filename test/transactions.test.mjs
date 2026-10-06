import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DEFAULT_TEMPLATE,clone,moduleText,isTech,instance,svgData} from '../src/model.js';
import {snapshotFont,effectiveFont} from '../src/fonts.js';
import {dependencyState,EXCALIDRAW_ID} from '../src/dependency.js';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default class TechTreePlugin extends Plugin','globalThis.PluginClass=class TechTreePlugin extends Plugin');
const context={Plugin:class{},Notice:class{},window:{setTimeout,clearTimeout},structuredClone,snapshotFont,effectiveFont,moduleText,isTech,instance,svgData,dependencyState};vm.createContext(context);vm.runInContext(source,context);
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture(){
 const p=new context.PluginClass(),t=clone(DEFAULT_TEMPLATE);p.busy=new Set();p.data={fontFamily:'Microsoft YaHei'};p.app={plugins:{plugins:{[EXCALIDRAW_ID]:{manifest:{version:'2.28.0'},isExcalidrawFile:()=>false}}}};
 const node={id:'node',type:'image',version:1,x:0,y:0,width:352,height:240,fileId:'old-svg',customData:{techTree:instance(t,{title:'before'})}};
 let scene=[node],imageCount=0,saves=0,mutations=0,files=0,destroys=0;const captures=[];
 const api={getSceneElements:()=>scene.filter(e=>!e.isDeleted),getSceneElementsIncludingDeleted:()=>scene,getAppState:()=>({viewModeEnabled:false,selectedElementIds:Object.fromEntries(scene.map(e=>[e.id,true]))}),updateScene:o=>{captures.push(o.captureUpdate);if(o.elements){scene=o.elements;mutations++;}},addFiles:()=>files++,selectElements:()=>{},refreshAllArrows:()=>{}};
 const v={file:{path:'A.excalidraw.md'},containerEl:{ownerDocument:{defaultView:{ExcalidrawAutomate:{getAPI(){}}}}},excalidrawAPI:api,save:async()=>{saves++;}};v.leaf={view:v};
 const elements={};const work={imagesDict:{},elementsDict:elements,getViewLastPointerPosition:()=>({x:10,y:20}),addImage:async()=>{const id='fresh'+(++imageCount);elements[id]={id,fileId:'svg'+imageCount};return id;},getElement:id=>elements[id],copyViewElementsToEAforEditing:es=>{for(const e of es)elements[e.id]=structuredClone(e);},getElements:()=>Object.values(elements),destroy:()=>{destroys++;}};
 p.ea=()=>work;p.nativeFonts={cache:{retry(){}},plan:()=>({}),ensure:async()=>{}};p.render=()=>({svg:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
 return {p,t,node,v,api,work,get scene(){return scene;},set scene(x){scene=x;},counts:()=>({saves,mutations,files,destroys}),captures};
}
for(const operation of ['create','update','refresh'])test(operation+' rejects switching the drawing while font preparation is pending',async()=>{
 const f=fixture();let release;f.p.nativeFonts.ensure=()=>new Promise(r=>release=r);
 const pending=operation==='create'?f.p.create(f.v,f.t):operation==='update'?f.p.update(f.v,f.node,f.t,{title:'after'}):f.p.refreshNodeFonts(f.v);
 f.v.file={path:'B.excalidraw.md'};f.scene=[];release();await assert.rejects(pending,/原画布/);assert.equal(f.scene.length,0);assert.deepEqual(f.counts(),{saves:0,mutations:0,files:0,destroys:1});assert.equal(f.p.busy.size,0);
});
test('API replacement during addImage cannot write into the replacement scene',async()=>{
 const f=fixture();let release;f.work.addImage=()=>new Promise(r=>release=r);const pending=f.p.update(f.v,f.node,f.t,{});while(!release)await tick();f.v.excalidrawAPI={...f.api};release('unused');await assert.rejects(pending,/原画布/);assert.equal(f.counts().mutations,0);
});
for(const change of ['move','delete','lock','edit'])test('concurrent '+change+' is preserved instead of overwritten by a pending update',async()=>{
 const f=fixture();let release;f.p.nativeFonts.ensure=()=>new Promise(r=>release=r);const pending=f.p.update(f.v,f.node,f.t,{title:'after'});
 if(change==='delete')f.scene=[];else if(change==='move')f.node.x=80;else if(change==='lock')f.node.locked=true;else f.node.customData.techTree.values.title='external';
 const expected=JSON.stringify(f.scene);release();await assert.rejects(pending,/已改变/);assert.equal(JSON.stringify(f.scene),expected);assert.equal(f.counts().mutations,0);assert.equal(f.counts().saves,0);
});
test('batch refresh is all-or-none if a previously prepared node changes',async()=>{
 const f=fixture(),second=structuredClone(f.node);second.id='second';f.scene.push(second);let calls=0,release;f.p.nativeFonts.ensure=async()=>{if(++calls===2)await new Promise(r=>release=r);};const pending=f.p.refreshNodeFonts(f.v);while(!release)await tick();f.node.x=64;release();await assert.rejects(pending,/已改变/);assert.equal(f.counts().mutations,0);assert.equal(f.scene[1].fileId,'old-svg');
});
for(const operation of ['create','update','refresh'])test(operation+' releases busy state after EA initialization fails, allowing retry',async()=>{
 const f=fixture(),ea=f.p.ea;f.p.ea=()=>{throw Error('EA unavailable');};const run=()=>operation==='create'?f.p.create(f.v,f.t):operation==='update'?f.p.update(f.v,f.node,f.t,{title:'after'}):f.p.refreshNodeFonts(f.v);
 await assert.rejects(run(),/EA unavailable/);assert.equal(f.p.busy.size,0);f.p.ea=ea;await run();assert.equal(f.counts().saves,1);assert.equal(f.p.busy.size,0);
});
test('cleanup failure still releases busy state',async()=>{const f=fixture();f.work.destroy=()=>{throw Error('cleanup');};await assert.rejects(f.p.update(f.v,f.node,f.t,{}),/cleanup/);assert.equal(f.p.busy.size,0);});
test('successful update preserves geometry and identity and native capture order',async()=>{
 const f=fixture();await f.p.update(f.v,f.node,f.t,{title:'after'});assert.equal(f.scene[0].id,'node');assert.equal(f.scene[0].x,0);assert.equal(f.scene[0].width,352);assert.equal(f.scene[0].customData.techTree.values.title,'after');assert.equal(f.scene[0].version,2);assert.deepEqual(f.captures,['IMMEDIATELY','NEVER']);assert.equal(f.counts().saves,1);
});
test('drawing changes after scene mutation prevent saving to a different file',async()=>{
 const f=fixture(),update=f.api.updateScene;f.api.updateScene=o=>{update(o);if(o.elements)f.v.file={path:'B.excalidraw.md'};};await assert.rejects(f.p.update(f.v,f.node,f.t,{}),/原画布/);assert.equal(f.counts().saves,0);
});
test('stale node supplied by an old dialog is rejected before starting font work',async()=>{
 const f=fixture(),stale=structuredClone(f.node);f.node.version++;await assert.rejects(f.p.update(f.v,stale,f.t,{}),/已改变/);assert.equal(f.p.busy.size,0);assert.equal(f.counts().destroys,0);
});
test('saving an unchanged node adds no files, history entries or disk saves',async()=>{const f=fixture();f.node.customData.techTree.template=snapshotFont(f.t,f.p.data.fontFamily);await f.p.update(f.v,f.node,f.node.customData.techTree.template,f.node.customData.techTree.values);assert.deepEqual(f.counts(),{saves:0,mutations:0,files:0,destroys:0});});

test('reused image binaries never invalidate native decode while new images are refreshed after publication',async()=>{const f=fixture(),binary={id:'shared',mimeType:'image/svg+xml',dataURL:'data:image/svg+xml;base64,PHN2Zy8+',created:1,file:'cards/shared.svg'},registered=new Map(),events=[];f.api.getFiles=()=>Object.fromEntries(registered);f.api.addFiles=files=>{events.push({type:'files',scene:f.scene.length});for(const b of files)registered.set(b.id,b);};const update=f.api.updateScene;f.api.updateScene=o=>{if(o.elements)events.push({type:'scene'});update(o);};f.v.excalidrawData={getFile:id=>registered.has(id)?{}:null};f.v.addElements=async({images})=>f.api.addFiles(Object.values(images));f.work.imagesDict.shared=binary;f.work.elementsDict.new={id:'new',type:'image',fileId:'shared'};await f.p.commit(f.v,f.work,f.p.target(f.v));assert.equal(events.filter(e=>e.type==='files').length,2);assert.ok(events.findIndex(e=>e.type==='scene')<events.findLastIndex(e=>e.type==='files'));assert.equal(f.scene.find(e=>e.id==='new').status,'saved');events.length=0;f.work.elementsDict.next={id:'next',type:'image',fileId:'shared'};await f.p.commit(f.v,f.work,f.p.target(f.v));assert.equal(events.filter(e=>e.type==='files').length,0);});
