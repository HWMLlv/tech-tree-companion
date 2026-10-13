import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapIndex,nearestSlot,visibleSlots,loopWindow,deckGeometry,deckPose,dragPosition,snapIndex,filterTemplates,setCardPickerMode} from '../src/template-deck-model.js';

test('loop viewport uses visible cards and two offstage buffers without changing template IDs',()=>{
 assert.equal(deckGeometry(1200).slots,9);assert.equal(deckGeometry(850).slots,7);assert.equal(deckGeometry(560).slots,5);
 assert.deepEqual(loopWindow(0,0,7),[]);assert.deepEqual(loopWindow(0,1,9),[0]);
 assert.deepEqual(loopWindow(0,12,9),[-5,-4,-3,-2,-1,0,1,2,3,4,5]);
 assert.deepEqual(loopWindow(12,12,9).map(i=>wrapIndex(i,12)),loopWindow(0,12,9).map(i=>wrapIndex(i,12)));
 assert.equal(visibleSlots(2,9),3);assert.equal(visibleSlots(8,9),9);
});
test('horizontal resize changes card spacing continuously within a display tier',()=>{
 assert.ok(deckGeometry(900).step>deckGeometry(800).step);
 for(const w of [280,480,680,1000,1800]){const g=deckGeometry(w);assert.ok(g.cardWidth<=280);assert.ok(g.step>=44);}
});
test('dragging traverses the seam in either direction without boundary resistance',()=>{
 assert.equal(dragPosition(2,-200,100,9),4);assert.equal(dragPosition(2,100,100,9),1);
 assert.equal(dragPosition(0,100,100,9),-1);assert.equal(dragPosition(8,-100,100,9),9);
 assert.equal(wrapIndex(snapIndex(dragPosition(0,100,100,9),0,100,9),9),8);
 assert.equal(wrapIndex(snapIndex(dragPosition(8,-100,100,9),0,100,9),9),0);
 assert.equal(dragPosition(0,300,100,1),0);
});
test('slow releases snap to nearest card and flick inertia stays bounded',()=>{
 assert.equal(snapIndex(3.4,0,100,12),3);assert.equal(snapIndex(3.6,0,100,12),4);
 assert.equal(snapIndex(3,-.6,100,12),4);assert.equal(snapIndex(3,.6,100,12),2);
 assert.ok(snapIndex(3,-1000,100,12)<=4);
 for(let count=1;count<20;count++)for(const position of [-100,0,.49,3.5,100])for(const velocity of [-10,0,10]){const slot=snapIndex(position,velocity,80,count),index=wrapIndex(slot,count);assert.ok(Number.isInteger(slot)&&index>=0&&index<count);}
 assert.equal(snapIndex(-10,-10,100,1),0);
});
test('card poses are symmetric and reduced motion removes rotation and vertical fan movement',()=>{
 const left=deckPose(1,3,100),right=deckPose(5,3,100),center=deckPose(3,3,100);
 assert.equal(left.x,-right.x);assert.equal(left.angle,-right.angle);assert.equal(left.scale,right.scale);assert.ok(center.scale>left.scale);assert.ok(center.depth>left.depth);
 assert.deepEqual(deckPose(1,3,100,true),{...left,y:0,angle:0,roll:0});
});
test('grid and Home/End targets seek the nearest matching loop slot',()=>{
 assert.equal(nearestSlot(0,11,12),12);assert.equal(nearestSlot(11,0,12),-1);assert.equal(nearestSlot(3,27,12),27);assert.equal(nearestSlot(0,900,1),0);
 for(let count=2;count<17;count++)for(let index=0;index<count;index++)for(const position of [-33.8,0,10.3,100]){const slot=nearestSlot(index,position,count);assert.equal(wrapIndex(slot,count),index);assert.ok(Math.abs(slot-position)<=count/2+1e-8);}
});
test('wrap handles negative and many repeated cycles without mutating logical template IDs',()=>{
 assert.equal(wrapIndex(-1,12),11);assert.equal(wrapIndex(12,12),0);assert.equal(wrapIndex(1201,12),1);assert.equal(wrapIndex(-1201,12),11);assert.equal(wrapIndex(42,0),0);
});
test('depth and angle stay continuous when neighboring cards exchange the foreground',()=>{
 for(const slot of [0,1]){const before=deckPose(slot,.5-.0001,100),after=deckPose(slot,.5+.0001,100);assert.ok(Math.abs(after.depth-before.depth)<.02);assert.ok(Math.abs(after.angle-before.angle)<.01);assert.ok(Math.abs(after.focus-before.focus)<.001);}
 const midpoint=deckPose(0,.5,100);assert.notEqual(midpoint.angle,0);assert.equal(Object.hasOwn(midpoint,'z'),false);
});
test('solid front cards part before crossing, while the resting hand keeps its fan shape',()=>{
 const a=deckPose(0,.5,100,false,280),b=deckPose(1,.5,100,false,280);
 assert.ok(b.x-a.x>=280);assert.ok(a.roll<0&&b.roll>0);
 const rest=deckPose(2,0,100);assert.ok(rest.roll>=12&&rest.y>=32);assert.ok(Math.abs(rest.angle)<=12);
 const center=deckPose(0,0,100);assert.equal(center.x,0);assert.equal(center.roll,0);
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
