import test from 'node:test';
import assert from 'node:assert/strict';
import {directRelations} from '../src/node-relations.js';
import {paintMapElement,mapElementAt} from '../src/minimap-renderer.js';
import {mapGeometryKey} from '../src/navigation-model.js';
import {DEFAULT_TEMPLATE,clone,instance,shapeTemplate,validateTemplate,renderNode,hitNode,outsideModules} from '../src/model.js';
import {bindAtSide} from '../src/connection-style.js';
import {parseConfig,exportConfig} from '../src/config-transfer.js';
const card=(id,kind='ellipse')=>({id,type:'image',x:0,y:0,width:384,height:240,angle:0,customData:{techTree:instance(shapeTemplate(kind),{title:id})}});
const arrow=(id,from,to,extra={})=>({id,type:'arrow',startBinding:{elementId:from},endBinding:{elementId:to},endArrowhead:'arrow',...extra});
const native=(id,type='rectangle')=>({id,type,x:0,y:0,width:100,height:80,strokeColor:'#1971c2',backgroundColor:'#b2f2bb',opacity:100});
test('relations honor arrow direction, deduplicate edges and exclude dangling, deleted, unbound and undirected lines',()=>{
 const elements=[card('a'),card('b'),native('c','diamond'),arrow('ab','a','b'),arrow('ab2','a','b'),arrow('bc','b','c'),arrow('reversed','b','a',{endArrowhead:null,startArrowhead:'arrow'}),arrow('missing','b','missing'),arrow('deleted','b','a',{isDeleted:true}),arrow('loose','b',null),arrow('self','b','b'),arrow('none','b','a',{endArrowhead:null}),{...arrow('line','b','a'),type:'line'}],before=clone(elements);
 assert.deepEqual(directRelations(elements,'b').before.map(e=>e.id),['a']);assert.deepEqual(directRelations(elements,'b').after.map(e=>e.id),['c']);assert.deepEqual(elements,before);
 assert.deepEqual(directRelations(elements,'missing'),{before:[],after:[]});
});
test('double-ended arrows work in both directions without transitive traversal of cycles',()=>{
 const elements=[card('a'),card('b'),card('c'),arrow('ab','a','b',{startArrowhead:'arrow'}),arrow('bc','b','c'),arrow('ca','c','a')],result=directRelations(elements,'a');
 assert.deepEqual(result.before.map(e=>e.id),['b','c']);assert.deepEqual(result.after.map(e=>e.id),['b']);
});
test('native shapes use their bound text labels and ignore deleted text labels',()=>{
 const from={...native('from','diamond'),boundElements:[{id:'label',type:'text'}]},label={id:'label',type:'text',text:'Decision'};
 const elements=[from,label,card('b'),arrow('ab','from','b')];assert.equal(directRelations(elements,'b').before[0].title,'Decision');label.isDeleted=true;assert.notEqual(directRelations(elements,'b').before[0].title,'Decision');
});
test('minimap draws actual shape geometry, colors and transparency without modifying host elements',()=>{
 for(const type of ['rectangle','ellipse','diamond']){const calls=[],ctx=new Proxy({},{get:(_,key)=>typeof key==='string'?((...args)=>calls.push([key,...args])):undefined,set:(_,key,value)=>{calls.push([key,value]);return true;}}),element=native(type,type),before=clone(element);
  paintMapElement(ctx,element,{stroke:'#333333',accent:'#ff0000',fill:'#eeeeee'},.1);
  assert.ok(calls.some(([key,v])=>key==='strokeStyle'&&v==='#1971c2'));assert.ok(calls.some(([key,v])=>key==='fillStyle'&&v==='#b2f2bb'));
  assert.ok(calls.some(([key])=>key===(type==='ellipse'?'ellipse':type==='diamond'?'lineTo':'rect')));assert.deepEqual(element,before);
  calls.length=0;element.backgroundColor='transparent';paintMapElement(ctx,element,{stroke:'#333333',accent:'#ff0000',fill:'#eeeeee'},.1);assert.ok(!calls.some(([key])=>key==='fill'));
 }
});
test('selected and matched minimap elements retain their own fill color',()=>{
 const styles={},ctx=new Proxy(styles,{get:(o,key)=>o[key]??(()=>{}),set:(o,key,value)=>{o[key]=value;return true;}});
 paintMapElement(ctx,native('ellipse','ellipse'),{stroke:'#333333',accent:'#ff0000',fill:'#eeeeee'},.1,true);
 assert.equal(styles.strokeStyle,'#ff0000');assert.equal(styles.fillStyle,'#b2f2bb');
});
test('minimap cache responds to colors, opacity, shape and arrowheads but not title edits',()=>{
 const element=card('a'),elements=[element];for(const change of [()=>element.customData.techTree.template.background='#abcdef',()=>element.customData.techTree.template.shape='diamond',()=>element.opacity=60,()=>element.strokeColor='#123456']){const before=mapGeometryKey(elements);change();assert.notEqual(mapGeometryKey(elements),before);}
 const before=mapGeometryKey(elements);element.customData.techTree.values.title='new';assert.equal(mapGeometryKey(elements),before);
});
test('minimap hover excludes empty corners of elliptical and diamond elements including rotations',()=>{
 for(const type of ['ellipse','diamond']){const element=native('a',type);assert.equal(mapElementAt([element],{x:1,y:1}),undefined);assert.equal(mapElementAt([element],{x:50,y:40}),element);element.angle=Math.PI/2;assert.equal(mapElementAt([element],{x:50,y:40}),element);}
});
test('all new shape presets fit their content, preserve values and render finite distinct SVG outlines',()=>{
 const frames=[];for(const kind of ['ellipse','circle','diamond']){const t=shapeTemplate(kind);validateTemplate(t);assert.deepEqual(outsideModules(t),[]);const result=renderNode(t,{title:'测试标题',summary:'内容'});assert.doesNotMatch(result.svg,/NaN|undefined|Infinity/);assert.match(result.svg,/测试标题/);frames.push(result.svg);}
 assert.equal(new Set(frames).size,3);const old=clone(DEFAULT_TEMPLATE);renderNode(old);assert.equal(old.shape,undefined);
});
test('new shape templates round trip through config without accepting arbitrary shape values',()=>{
 const template=shapeTemplate('diamond');assert.equal(parseConfig(exportConfig({templates:[template]},{templates:true})).templates[0].shape,'diamond');
 template.shape='script';assert.throws(()=>validateTemplate(template),/形状/);
});
test('card hit detection follows visible nonrectangular outline with rotation and flips',()=>{
 const e=card('a');assert.equal(hitNode(e,{x:0,y:0}),false);assert.equal(hitNode(e,{x:e.width/2,y:e.height/2}),true);e.angle=Math.PI/2;e.scale=[-1,1];assert.equal(hitNode(e,{x:e.width/2,y:e.height/2}),true);
});
test('shape changes cannot silently save fields outside the new contour',()=>{
 const t=clone(DEFAULT_TEMPLATE);t.shape='diamond';assert.ok(outsideModules(t).length);assert.throws(()=>validateTemplate(t),/边界/);assert.doesNotThrow(()=>validateTemplate(t,{allowOverflow:true}));
});
test('custom bindings follow curved card edges away from side centers',()=>{
 const e=card('a','diamond'),a={strokeWidth:2};bindAtSide(a,'endBinding',e,'right',.25);assert.equal(a.endBinding.elementId,'a');assert.ok(Math.abs(a.endBinding.fixedPoint[0]-(.75+6/e.width))<1e-8);
 bindAtSide(a,'endBinding',e,'right');assert.ok(a.endBinding.fixedPoint[0]>1);
});
