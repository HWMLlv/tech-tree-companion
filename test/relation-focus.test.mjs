import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {relationFocus} from '../src/node-relations.js';
import {paintRelationFocus,focusPixelRatio} from '../src/relation-focus.js';
const file=new URL('../src/navigation.js',import.meta.url),source=(await fs.readFile(file,'utf8')).replace("import {Modal,Notice,setIcon} from 'obsidian';",'class Modal{};class Notice{};const setIcon=()=>{};').replace(/from '(\.\/[^']+)'/g,(_,path)=>'from '+JSON.stringify(new URL(path,file).href));
const {CanvasNavigation}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const node=id=>({id,type:'rectangle',x:0,y:0,width:100,height:80,angle:0});
const arrow=(id,a,b)=>({id,type:'arrow',x:0,y:0,width:100,height:0,points:[[0,0],[100,0]],startBinding:{elementId:a},endBinding:{elementId:b},endArrowhead:'arrow'});
const scene=()=>[{...node('a'),boundElements:[{id:'title',type:'text'}]},node('b'),node('c'),node('d'),{id:'title',type:'text',x:10,y:10,width:60,height:20,text:'Title'},arrow('ab','a','b'),arrow('bc','b','c'),arrow('cd','c','d')];
test('focus contains only direct neighbors, their arrow labels and bound node text',()=>{
 const elements=scene(),before=structuredClone(elements),focus=relationFocus(elements,'b');
 assert.deepEqual([...focus.before],['a']);assert.deepEqual([...focus.after],['c']);assert.deepEqual([...focus.arrows],['ab','bc']);assert.ok(focus.visible.has('title'));assert.ok(!focus.visible.has('d')&&!focus.visible.has('cd'));assert.deepEqual(elements,before);
 elements[1].isDeleted=true;assert.equal(relationFocus(elements,'b'),null);
});
test('focus rendering only writes to its own canvas with correct pan and zoom',()=>{
 const elements=scene(),before=structuredClone(elements),calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:(_,key,value)=>{calls.push([key,value]);return true;}});
 paintRelationFocus(ctx,elements,relationFocus(elements,'b'),{width:800,height:600,zoom:{value:2},scrollX:-20,scrollY:30},{background:'#ffffff',accent:'#7950f2',before:'#2f9e44',after:'#1971c2'});
 assert.ok(calls.some(([key,v])=>key==='globalCompositeOperation'&&v==='destination-out'));assert.ok(calls.some(([key,x,y])=>key==='scale'&&x===2&&y===2));assert.ok(calls.some(([key,x,y])=>key==='translate'&&x===-20&&y===30));assert.deepEqual(elements,before);
});
test('focus buffer stays bounded on unusually large or high-DPI windows',()=>{
 for(const [w,h,dpr]of [[1200,800,2],[7680,4320,3],[16000,9000,2]]){const ratio=focusPixelRatio(w,h,dpr);assert.ok(w*h*ratio*ratio<=8000000.01);assert.ok(ratio>0&&ratio<=2);}
});
function navigation(){
 const elements=scene(),state={selectedElementIds:{b:true}},patches=[],nav=Object.create(CanvasNavigation.prototype);
 Object.assign(nav,{p:{},v:{containerEl:{removeClass(){},querySelector(){return null;}}},valid:()=>true,state:()=>state,schedule(){this.scheduled=true;},api:{getSceneElements:()=>elements,updateScene:patch=>{patches.push(patch);Object.assign(state,patch.appState);}}});return {nav,state,elements,patches};
}
test('entering and following focus never changes elements or creates a dialog',()=>{
 const {nav,state,elements,patches}=navigation(),before=structuredClone(elements);nav.openRelations();assert.equal(nav.relationId,'b');assert.equal(nav.p.modal,undefined);
 state.selectedElementIds={c:true};nav.syncRelationSelection();assert.equal(nav.relationId,'c');assert.deepEqual(nav.relationTrail,['b']);assert.deepEqual(elements,before);assert.deepEqual(patches,[]);
 nav.setRelationRoot('b',false);assert.deepEqual(patches,[{appState:{selectedElementIds:{b:true}},captureUpdate:'NEVER'}]);assert.deepEqual(elements,before);
});
test('temporary empty native selection during a click cannot terminate focus, but blank release can',()=>{
 const {nav,state}=navigation();nav.openRelations();nav.pointerHeld=true;state.selectedElementIds={};nav.syncRelationSelection();assert.equal(nav.relationId,'b');
 state.selectedElementIds={c:true};nav.syncRelationSelection();nav.pointerHeld=false;nav.syncRelationSelection();assert.equal(nav.relationId,'c');
 nav.pointerHeld=true;state.selectedElementIds={};nav.syncRelationSelection();nav.pointerHeld=false;nav.syncRelationSelection();assert.equal(nav.relationId,null);
});
test('toggling or destroying focus removes only temporary UI and bounds its back history',()=>{
 const {nav}=navigation();nav.openRelations();for(let i=0;i<50;i++)nav.setRelationRoot(i%2?'b':'c');assert.ok(nav.relationTrail.length<=30);
 let removed=0;nav.relationCanvas={remove:()=>removed++};nav.relationBar={remove:()=>removed++};nav.endRelationFocus();assert.equal(removed,2);assert.equal(nav.relationId,null);assert.deepEqual(nav.relationTrail,[]);nav.endRelationFocus();assert.equal(removed,2);
});
test('stale drawing scopes release focus rather than following selection in a replacement drawing',()=>{
 const {nav}=navigation();nav.openRelations();nav.valid=()=>false;nav.syncRelationSelection();assert.equal(nav.relationId,null);
});

test('view mode can arm without native selection and never writes a selection to focus',()=>{
 const {nav,state,patches}=navigation();state.viewModeEnabled=true;state.selectedElementIds={};
 nav.openRelations();assert.equal(nav.relationPicking,true);assert.equal(nav.relationId,undefined);assert.equal(patches.length,0);
 nav.setRelationRoot('b');nav.syncRelationSelection();assert.equal(nav.relationId,'b');assert.equal(nav.relationPicking,false);assert.equal(patches.length,0);
 nav.openRelations();assert.equal(nav.relationActive(),false);assert.equal(patches.length,0);
});
test('view-mode clicks follow nodes and blank exits, but panning or canceled gestures do not',()=>{
 const {nav,state,patches}=navigation();Object.assign(state,{viewModeEnabled:true,selectedElementIds:{},scrollX:0,scrollY:0,zoom:{value:1}});
 nav.openRelations();nav.relationHit=e=>e.node;nav.relationCanvasEvent=()=>true;
 const event={button:0,pointerId:1,clientX:10,clientY:10,node:node('b')};
 nav.readRelationDown(event);nav.readRelationUp(event);assert.equal(nav.relationId,'b');
 nav.readRelationDown(event);nav.readRelationUp({...event,pointerId:2});assert.equal(nav.relationId,'b');
 nav.readRelationDown(event);nav.readRelationUp({...event,clientX:30,node:node('c')});assert.equal(nav.relationId,'b');
 nav.readRelationDown(event);state.scrollX=20;nav.readRelationUp(event);assert.equal(nav.relationId,'b');
 nav.readRelationDown({...event,node:node('c')});nav.readRelationUp({...event,node:node('c')});assert.equal(nav.relationId,'c');
 nav.readRelationDown({...event,node:null});nav.readRelationUp({...event,node:null});assert.equal(nav.relationActive(),false);assert.equal(patches.length,0);
});
test('mode changes release transient focus and bound text resolves to its native node',()=>{
 const {nav,state,elements}=navigation();elements.at(4).containerId='a';assert.equal(nav.relationNode(elements.at(4)).id,'a');
 state.viewModeEnabled=true;nav.openRelations('b');state.viewModeEnabled=false;nav.syncRelationSelection();assert.equal(nav.relationActive(),false);
});
