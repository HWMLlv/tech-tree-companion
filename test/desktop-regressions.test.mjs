import test from 'node:test';
import assert from 'node:assert/strict';
import {elementBounds,elementPoints,sceneBounds,fitMap,viewport} from '../src/navigation-model.js';
import {radialLabel} from '../src/radial-labels.js';
import {radialConfig,changeRadialAction} from '../src/radial-model.js';
import {RadialDraft} from '../src/radial-draft.js';
import {exportConfig,parseConfig} from '../src/config-transfer.js';
import {setLanguage} from '../src/i18n.js';

test('upward elbow arrows do not add phantom space below the minimap scene',()=>{
 const arrow={type:'arrow',x:160,y:144,width:96,height:3096,angle:0,points:[[0,0],[32,0],[32,-1548],[-64,-1548],[-64,-3096],[-28,-3096]]};
 assert.deepEqual(elementBounds(arrow),{x:96,y:-2952,width:96,height:3096});
 const cards=[{type:'image',x:-200,y:24,width:352,height:240},{type:'image',x:140,y:-3072,width:352,height:240}];
 const bounds=sceneBounds([...cards,arrow]);assert.deepEqual(bounds,{x:-224,y:-3096,width:740,height:3384});
 const t=fitMap(bounds,264,164);const top=cards[1].y*t.scale+t.y,bottom=(cards[0].y+cards[0].height)*t.scale+t.y;
 assert.ok(top<10&&bottom>154,'content uses both ends of the minimap instead of the upper half');
});
test('linear bounds follow all endpoint directions and the actual rotation center',()=>{
 for(const [x,y]of [[100,200],[-100,200],[100,-200],[-100,-200]]){
  const e={type:'line',x:10,y:20,width:100,height:200,points:[[0,0],[x,y]]};
  assert.deepEqual(elementBounds(e),{x:10+Math.min(0,x),y:20+Math.min(0,y),width:100,height:200});
 }
 const rotated={type:'arrow',x:100,y:200,width:100,height:200,angle:Math.PI/2,points:[[0,0],[-100,-200]]};
 const b=elementBounds(rotated);for(const [k,v]of Object.entries({x:-50,y:50,width:200,height:100}))assert.ok(Math.abs(b[k]-v)<1e-9);
 const brush={...rotated,type:'freedraw'};assert.deepEqual(elementPoints(brush),elementPoints(rotated));
});
test('map viewport and point projection agree after zoom and pan',()=>{
 const state={scrollX:400,scrollY:-300,zoom:{value:.16},width:1200,height:800},b=viewport(state),t=fitMap({x:-500,y:-400,width:1000,height:1200},264,164);
 const scene={x:b.x+b.width/2,y:b.y+b.height/2};
 const px=scene.x*t.scale+t.x,py=scene.y*t.scale+t.y;
 assert.ok(Math.abs((px-t.x)/t.scale-scene.x)<1e-9);assert.ok(Math.abs((py-t.y)/t.scale-scene.y)<1e-9);
});
test('legacy inner, outer and own-command default names follow UI language without rewriting config',()=>{
 const saved={items:[{action:'create',label:'新建节点'},{action:'tool:arrow',label:'Arrow'},{action:'plugin-command',command:'tech-tree-companion:radial-settings',label:'编辑画布快捷轮盘'},{action:'command',command:'app:go-back',label:'返回上一页面'}],auxiliaryItems:[{id:'search-nodes',label:'搜索节点'}]},copy=structuredClone(saved);
 try{setLanguage('en');const c=radialConfig(saved);assert.deepEqual(c.items.map(radialLabel),['Create node','Arrow','Edit canvas quick wheel','Go back']);assert.equal(radialLabel(c.auxiliaryItems[0]),'Search nodes');setLanguage('zh');assert.deepEqual(c.items.map(radialLabel),['新建节点','箭头','编辑画布快捷轮盘','返回上一页面']);assert.deepEqual(saved,copy);}finally{setLanguage('zh');}
});
test('explicit custom names survive normalization, cross-ring moves, import and language changes',()=>{
 const input={items:[{action:'templates',label:'模板中心',icon:'workflow',labelCustom:true}],auxiliaryItems:[]},d=new RadialDraft(input,'tech-tree-companion');
 d.transfer('inner',0);const packet=parseConfig(exportConfig({radial:{...d.config,...d.output()}},{radial:true}));
 assert.equal(packet.radial.auxiliaryItems[0].labelCustom,true);
 try{setLanguage('en');assert.equal(radialLabel(packet.radial.auxiliaryItems[0]),'模板中心');assert.equal(radialLabel({action:'tool:arrow',label:'铜矿 → 冶炼'}),'铜矿 → 冶炼');assert.equal(radialLabel({action:'command',command:'other:arrow',label:'箭头'}),'箭头');const item={action:'tool:arrow',label:'箭头',labelCustom:true};changeRadialAction(item,'tool:line');assert.equal(item.label,'箭头');}finally{setLanguage('zh');}
});
