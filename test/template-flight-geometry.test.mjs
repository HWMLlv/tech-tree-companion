import test from 'node:test';
import assert from 'node:assert/strict';
import {containRect,flightFrames} from '../src/template-flight-geometry.js';

test('shared card bounds remove letterboxing without changing template aspect ratio',()=>{
 const r=containRect({left:10,top:20,width:200,height:300},352,240);
 assert.ok(Math.abs(r.width-200)<1e-10);assert.ok(Math.abs(r.width/r.height-352/240)<1e-10);
 assert.ok(Math.abs(r.top+r.height/2-170)<1e-10);
 const portrait=containRect({left:10,top:20,width:300,height:200},80,240);
 assert.ok(Math.abs(portrait.height-200)<1e-10);assert.ok(Math.abs(portrait.left+portrait.width/2-160)<1e-10);
});
test('flight ends exactly at the editor while using uniform scaling and a gentle lifted path',()=>{
 const from={left:600,top:450,width:200,height:100},to={left:400,top:250,width:600,height:300},frames=flightFrames(from,to);
 assert.equal(frames[0].transform,'translate3d(600px,450px,0) scale(1)');
 assert.equal(frames.at(-1).transform,'translate3d(400px,250px,0) scale(3)');
 assert.equal(frames[1].transform,'translate3d(520px,352px,0) scale(1.8)');
 assert.deepEqual(frames.map(frame=>frame.offset),[0,.4,1]);
});
