import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderFrame} from '../src/appearance.js';
const frame=(width,height,style,roughness=0,corner='round')=>renderFrame({id:'frame-check',width,height,border:'#475569',background:'transparent',appearance:{strokeWidth:6,strokeStyle:style,roughness,corner}});
const attribute=(svg,key)=>Number(svg.match(new RegExp(key+'="([^"]+)"'))?.[1]);
test('dashes and dots keep complete repeats and gaps at every contour seam or square edge endpoint',()=>{
 for(const style of ['dashed','dotted'])for(const roughness of [0,1,2])for(const corner of ['round','square'])for(const [w,h]of [[80,64],[352,240],[360,240],[368,240],[704,704],[2400,64]]){
  const paths=frame(w,h,style,roughness,corner).match(/<path [^>]+\/>/g);assert.equal(paths.length,corner==='square'?4:1);
  for(const svg of paths){const [dash,gap]=svg.match(/stroke-dasharray="([^"]+)"/)[1].split(' ').map(Number),length=attribute(svg,'pathLength'),offset=attribute(svg,'stroke-dashoffset');assert.ok(Math.abs(length/(dash+gap)-Math.round(length/(dash+gap)))<1e-6);assert.equal(offset,dash+gap/2);assert.ok(gap>6);}
 }
});
test('square dashed edges stop at each corner instead of bending one dash around it',()=>{
 for(const style of ['dashed','dotted'])for(const roughness of [0,1,2]){
  const paths=frame(352,240,style,roughness,'square').match(/d="([^"]+)"/g),corners=[[4,4],[348,4],[348,236],[4,236]];
  paths.forEach((d,i)=>{assert.doesNotMatch(d,/Z/);const values=d.match(/-?\d+(?:\.\d+)?/g).map(Number);assert.equal(values.length,8);assert.deepEqual(values.slice(0,2),corners[i]);assert.deepEqual(values.slice(-2),corners[(i+1)%4]);});
 }
});
test('resizing recalculates repeat count while retaining the chosen dash style',()=>{
 const small=frame(352,240,'dashed'),large=frame(704,480,'dashed');assert.ok(attribute(large,'pathLength')>attribute(small,'pathLength'));assert.equal(small.match(/stroke-dasharray="([^"]+)"/)[1],large.match(/stroke-dasharray="([^"]+)"/)[1]);
});
test('solid outlines retain the existing undashed contour and double-stroke behavior',()=>{
 const smooth=frame(352,240,'solid'),hand=frame(352,240,'solid',2);assert.doesNotMatch(smooth,/pathLength|stroke-dash/);assert.equal((smooth.match(/<path /g)??[]).length,1);assert.equal((hand.match(/<path /g)??[]).length,2);
});
const source=fs.readFileSync(new URL('../src/panel.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export class DetailPanel','globalThis.DetailPanel=class DetailPanel');const context={Component:class{}};vm.createContext(context);vm.runInContext(source,context);
function event({interactive=false,inside=true,...fields}={}){return {button:0,target:{closest:()=>interactive?{}:null},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},inside,...fields};}
function panel(ev){const p=Object.create(context.DetailPanel.prototype);Object.assign(p,{draft:'正文原样',previewSizer:{contains:()=>ev.inside},setMode:async editing=>{p.requested=editing;}});return p;}
test('double-clicking reading text reuses edit mode without modifying the draft',async()=>{
 const ev=event(),p=panel(ev);await p.editFromPreview(ev);assert.equal(p.requested,true);assert.equal(p.draft,'正文原样');assert.equal(ev.prevented,true);assert.equal(ev.stopped,true);
});
test('interactive targets, modifiers, other buttons and outside content do not switch modes',async()=>{
 for(const options of [{interactive:true},{inside:false},{button:2},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true}]){const ev=event(options),p=panel(ev);await p.editFromPreview(ev);assert.equal(p.requested,undefined);assert.equal(ev.prevented,undefined);}
});
test('double-clicks during editing or a pending transition cannot toggle modes again',async()=>{
 for(const state of [{editing:true},{switching:{}}]){const ev=event(),p=panel(ev);Object.assign(p,state);await p.editFromPreview(ev);assert.equal(p.requested,undefined);}
});
