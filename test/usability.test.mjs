import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextPlacement,bounds} from '../src/placement.js';
import {DEFAULT_TEMPLATE,renderNode,clone,validateTemplate} from '../src/model.js';
import {effectiveFont,snapshotFont,validFont,fontStack} from '../src/fonts.js';
const source={id:'parent',type:'image',x:0,y:0,width:352,height:192,angle:0};
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
test('four directions clear the parent and blockers, repeated direction selects a fresh slot',()=>{
 for(const direction of ['up','down','left','right']){
  const first=nextPlacement(source,direction,[source]);const child={...source,...first,id:'child'};
  const next=nextPlacement(source,direction,[source,child]);
  assert.equal(overlaps({...next,width:352,height:192},source),false);
  assert.equal(overlaps({...next,width:352,height:192},child),false);
  assert.notDeepEqual(next,first);
  assert.notDeepEqual(nextPlacement(source,direction,[source],first.slot+1),first);
 }
});
test('placement considers rotated nodes and ignores deleted nodes and arrows',()=>{
 const rotated={...source,angle:Math.PI/4};const r=nextPlacement(rotated,'right',[rotated]);
 assert.ok(r.x>=bounds(rotated).x+bounds(rotated).width+80);
 const first=nextPlacement(source,'right',[source]);
 assert.deepEqual(nextPlacement(source,'right',[source,{...source,...first,isDeleted:true},{...source,...first,type:'arrow'}]),first);
 assert.notDeepEqual(nextPlacement(source,'right',[source,{...source,...first,type:'rectangle'}]),first);
});
test('node snapshots preserve resolved fonts until explicit refresh, overrides win',()=>{
 const t=clone(DEFAULT_TEMPLATE),snapshot=snapshotFont(t,'KaiTi');
 assert.equal(effectiveFont(snapshot,'Arial'),'KaiTi');assert.equal(t.resolvedFontFamily,undefined);
 assert.equal(snapshotFont(snapshot,'Arial').resolvedFontFamily,'KaiTi');
 assert.equal(snapshotFont(snapshot,'Arial',true).resolvedFontFamily,'Arial');
 t.fontFamily='SimSun';assert.equal(snapshotFont(t,'Arial',true).resolvedFontFamily,'SimSun');
});
test('font input accepts installed family names and excludes CSS injection',()=>{
 for(const s of ['微软雅黑','Times New Roman','sans-serif'])assert.equal(validFont(s),true);
 for(const s of ['Arial"/><script>','a;fill:red','',null])assert.equal(validFont(s),false);
 assert.equal(fontStack('serif'),'serif');
 const t=clone(DEFAULT_TEMPLATE);t.fontFamily='Arial; color:red';assert.throws(()=>validateTemplate(t),/字体/);
});
test('small and large single-line text is vertically centered using measured glyph bounds',()=>{
 for(const size of [12,30]){
  const t=clone(DEFAULT_TEMPLATE);t.modules=[{...t.modules[0],fontSize:size,y:8,h:60,w:300}];
  const measure=()=>20;measure.metrics=()=>({ascent:size*.7,descent:size*.2});
  const svg=renderNode(t,{title:'文字'},measure).svg,y=Number(svg.match(/<tspan x="[^"]+" y="([^"]+)"/)[1]);
  assert.ok(Math.abs(((y-size*.7)+(y+size*.2))/2-(8+30))<1e-8);
 }
});
test('multiline text centers the whole text block and retains three horizontal options',()=>{
 const t=clone(DEFAULT_TEMPLATE);t.modules=[{...t.modules[1],y:8,h:64,w:300,fontSize:16}];
 const measure=()=>20;measure.metrics=()=>({ascent:12,descent:4});
 const svg=renderNode(t,{summary:'第一行\n第二行'},measure).svg;
 const ys=[...svg.matchAll(/<tspan x="[^"]+" y="([^"]+)"/g)].map(m=>Number(m[1]));
 assert.ok(Math.abs((ys[0]-12+ys[1]+4)/2-40)<1e-8);
 for(const align of ['left','center','right']){t.modules[0].align=align;assert.doesNotThrow(()=>validateTemplate(t));}
});
