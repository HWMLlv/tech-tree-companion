import test from 'node:test';
import assert from 'node:assert/strict';
import {boundIndex,deckGeometry,deckPose,deckWindow,dragPosition,snapIndex,filterTemplates,setCardPickerMode} from '../src/template-deck-model.js';

test('wide card picker shows seven or nine actual templates, without repeating a small library',()=>{
 assert.equal(deckGeometry(1200).slots,9);assert.equal(deckGeometry(850).slots,7);assert.equal(deckGeometry(560).slots,5);
 assert.deepEqual(deckWindow(0,2,9),[0,1]);assert.deepEqual(deckWindow(0,0,7),[]);
 assert.deepEqual(deckWindow(0,12,9),[0,1,2,3,4,5,6,7,8]);
 assert.deepEqual(deckWindow(11,12,9),[3,4,5,6,7,8,9,10,11]);
});
test('horizontal resize changes card spacing continuously within a display tier',()=>{
 assert.ok(deckGeometry(900).step>deckGeometry(800).step);
 for(const w of [280,480,680,1000,1800]){const g=deckGeometry(w);assert.ok(g.cardWidth<=280);assert.ok(g.step>=44);}
});
test('dragging left advances templates; boundary resistance never becomes a valid outside index',()=>{
 assert.equal(dragPosition(2,-200,100,9),4);assert.equal(dragPosition(2,100,100,9),1);
 assert.ok(dragPosition(0,100,100,9)<0);assert.ok(dragPosition(0,100,100,9)>-1);
 assert.equal(snapIndex(dragPosition(0,100,100,9),2,100,9),0);
 assert.equal(snapIndex(dragPosition(8,-100,100,9),-2,100,9),8);
});
test('slow releases snap to nearest card and flick inertia stays bounded',()=>{
 assert.equal(snapIndex(3.4,0,100,12),3);assert.equal(snapIndex(3.6,0,100,12),4);
 assert.equal(snapIndex(3,-.6,100,12),4);assert.equal(snapIndex(3,.6,100,12),2);
 assert.ok(snapIndex(3,-1000,100,12)<=4);
 for(let count=1;count<20;count++)for(const position of [-100,0,.49,3.5,100])for(const velocity of [-10,0,10]){const index=snapIndex(position,velocity,80,count);assert.ok(Number.isInteger(index)&&index>=0&&index<count);}
 assert.equal(boundIndex(10,0),0);
});
test('card poses are symmetric and reduced motion removes rotation and vertical fan movement',()=>{
 const left=deckPose(1,3,100),right=deckPose(5,3,100),center=deckPose(3,3,100);
 assert.equal(left.x,-right.x);assert.equal(left.angle,-right.angle);assert.equal(left.scale,right.scale);assert.ok(center.scale>left.scale);assert.ok(center.z>left.z);
 assert.deepEqual(deckPose(1,3,100,true),{...left,y:0,angle:0});
});
test('search matches names without modifying templates, fields or IDs',()=>{
 const templates=[{id:'a',name:'Copper ore',modules:[{field:'title'}]},{id:'b',name:'铜矿'}],before=structuredClone(templates);
 assert.deepEqual(filterTemplates(templates,' COPPER '),[templates[0]]);assert.deepEqual(filterTemplates(templates,'铜'),[templates[1]]);assert.deepEqual(filterTemplates(templates,'missing'),[]);assert.deepEqual(filterTemplates(templates,''),templates);assert.deepEqual(templates,before);
});
test('card mode is opt-in and persistence does not replace other settings',async()=>{
 const data={defaultTemplate:'a',radial:{radius:120}},calls=[];const p={data,persist:async()=>calls.push(structuredClone(data))};
 assert.notEqual(data.cardTemplatePicker,true);await setCardPickerMode(p,true);assert.equal(data.cardTemplatePicker,true);await setCardPickerMode(p,false);assert.equal(data.cardTemplatePicker,false);assert.equal(calls.length,2);assert.equal(data.defaultTemplate,'a');assert.deepEqual(data.radial,{radius:120});
});
test('failed mode save restores an absent preference or the previous explicit preference',async()=>{
 for(const before of [undefined,false,true]){const data={};if(before!==undefined)data.cardTemplatePicker=before;
  const p={data,persist:async()=>{throw Error('disk failure');}};await assert.rejects(()=>setCardPickerMode(p,before!==true),/disk failure/);assert.equal(data.cardTemplatePicker,before);assert.equal(Object.hasOwn(data,'cardTemplatePicker'),before!==undefined);
 }
});
