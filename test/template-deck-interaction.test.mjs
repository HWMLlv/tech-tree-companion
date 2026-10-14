import test from 'node:test';
import assert from 'node:assert/strict';
import {deckGeometry,loopWindow,deckPose,projectCard,insideCard,hitDeck,wrapIndex} from '../src/template-deck-model.js';

test('projected buffers cover both edges at every phase across loop seams',()=>{
 for(const width of [280,335,575,883,1155,1792,2200])for(const height of [180,300,460,700])for(const count of [2,3,4,12,70])for(const reduced of [false,true]){
  const g=deckGeometry(width,height,count);assert.ok(g.slots+g.overscan*2<=25);
  for(const position of [-1.01,-.99,-.51,-.01,0,.01,.49,.51,.99,1.01,12.99]){
   const slots=loopWindow(position,count,g.slots,g.overscan),set=new Set(slots);
   for(let slot=slots[0]-2;slot<=slots.at(-1)+2;slot++)if(!set.has(slot)){
    const quad=projectCard(deckPose(slot,position,g.step,reduced,g.cardWidth),g.cardWidth,g.cardHeight,g.perspective),xs=quad.map(p=>p.x),ys=quad.map(p=>p.y);
    const onScreen=Math.max(...xs)>-width/2&&Math.min(...xs)<width/2&&Math.max(...ys)>-height*.48&&Math.min(...ys)<height*.52;
    assert.equal(onScreen,false,JSON.stringify({width,height,count,reduced,position,slot,geometry:g}));
   }
  }
 }
});
test('cards recycled at integer seam crossings are entirely outside the visible clip',()=>{
 for(const width of [380,860,1200,1800]){
  const g=deckGeometry(width,500,12),before=new Set(loopWindow(.99999,12,g.slots,g.overscan)),after=new Set(loopWindow(1.00001,12,g.slots,g.overscan));
  for(const slot of new Set([...before,...after]))if(!before.has(slot)||!after.has(slot)){
   const quad=projectCard(deckPose(slot,1,g.step,false,g.cardWidth),g.cardWidth,g.cardHeight,g.perspective),xs=quad.map(p=>p.x);
   assert.ok(Math.min(...xs)>width/2+20||Math.max(...xs)<-width/2-20);
  }
 }
});
test('frontmost face wins a projected tap instead of a hidden overlapping card',()=>{
 const g=deckGeometry(900,420,12),slots=loopWindow(0,12,g.slots,g.overscan);
 assert.equal(hitDeck({x:0,y:0},slots,0,g),0);
 assert.equal(hitDeck({x:900,y:900},slots,0,g),null);
 const face=projectCard(deckPose(0,0,g.step),g.cardWidth,g.cardHeight,g.perspective);
 assert.equal(insideCard({x:0,y:0},face),true);assert.equal(insideCard({x:900,y:900},face),false);
});
test('exposed side-face taps can jump several cards in either direction and across the wrap',()=>{
 const g=deckGeometry(1200,420,12);
 for(const position of [-12,0,12])for(const target of [position-3,position+3]){
  const slots=loopWindow(position,12,g.slots,g.overscan),quad=projectCard(deckPose(target,position,g.step,false,g.cardWidth),g.cardWidth,g.cardHeight,g.perspective);
  let exposed=null;
  for(let row=1;row<10&&!exposed;row++)for(let col=1;col<10;col++){
   const u=col/10,v=row/10,point={x:(1-v)*((1-u)*quad[0].x+u*quad[1].x)+v*((1-u)*quad[3].x+u*quad[2].x),y:(1-v)*((1-u)*quad[0].y+u*quad[1].y)+v*((1-u)*quad[3].y+u*quad[2].y)};
   if(hitDeck(point,slots,position,g)===target){exposed=point;break;}
  }
  assert.ok(exposed,'side card should have a directly clickable exposed face');assert.equal(wrapIndex(hitDeck(exposed,slots,position,g),12),wrapIndex(target,12));
 }
});
