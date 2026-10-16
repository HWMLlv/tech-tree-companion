import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeTargets} from '../src/node-targets.js';
import {MinimapGeometry} from '../src/minimap-renderer.js';
import {DEFAULT_TEMPLATE,clone,instance} from '../src/model.js';
const card=id=>({id,type:'image',x:0,y:0,width:352,height:240,link:'[[Notes/'+id+']]',customData:{techTree:instance(clone(DEFAULT_TEMPLATE),{})}});
test('unchanged view events reuse resolved targets, metadata changes invalidate, removed nodes release entries',()=>{
 const index=new NodeTargets(),a=card('a'),b=card('b'),elements=[a,b],calls=[],files=new Map();
 const resolve=link=>{calls.push(link);if(link==='broken'&&!files.has(link))throw Error('missing');return files.get(link)??link;};
 for(let i=0;i<100;i++)index.sync(elements,resolve,0,'Drawing.md');assert.equal(calls.length,2);
 a.link='broken';index.sync(elements,resolve,0,'Drawing.md');assert.equal(calls.length,3);assert.equal(index.targets.has('a'),false);
 files.set('broken','restored');index.sync(elements,resolve,1,'Drawing.md');assert.equal(index.targets.get('a'),'restored');assert.equal(calls.length,5);
 index.sync(elements,resolve,1,'Other.md');assert.equal(calls.length,7);
 b.isDeleted=true;index.sync(elements,resolve,1,'Other.md');assert.equal(index.entries.size,1);assert.equal(index.targets.has('b'),false);
 index.sync([],resolve,1,'Other.md');assert.equal(index.entries.size,0);assert.equal(index.targets.size,0);
});
test('minimap snapshots reuse unchanged geometry but detect in-place mutations without stringify',()=>{
 const geometry=new MinimapGeometry(),a=card('a'),edge={id:'edge',type:'arrow',x:0,y:0,width:20,height:30,points:[[0,0],[20,-30]]},elements=[a,edge];
 const initial=geometry.update(elements),saved=geometry.items[0];for(let i=0;i<100;i++)assert.equal(geometry.update(elements),initial);assert.equal(geometry.items[0],saved);
 for(const mutate of [()=>a.x++,()=>edge.points[1][0]++,()=>a.customData.techTree.template.shape='ellipse',()=>a.customData.techTree.template.border='#ff0000',()=>a.customData.techTree.template.appearance={opacity:50},()=>edge.endArrowhead='arrow',()=>elements.reverse(),()=>elements.pop()]){const old=geometry.revision;mutate();assert.equal(geometry.update(elements),old+1);assert.equal(geometry.update(elements),old+1);}
 geometry.update([]);assert.equal(geometry.items.length,0);
});
