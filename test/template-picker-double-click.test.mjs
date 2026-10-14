import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/template-picker.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export class TemplatePicker','globalThis.TemplatePicker=class TemplatePicker');
const context={Modal:class{}};vm.createContext(context);vm.runInContext(source,context);
const event=(detail=2,options={})=>({detail,button:0,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...options});
function picker(grid=false){const k=Object.create(context.TemplatePicker.prototype);Object.assign(k,{cursor:4,index:4,candidate:'current',gridMode:grid,plugin:{stopped:false},choose(){this.confirmations=(this.confirmations??0)+1;}});return k;}
function click(k,slot,detail){k.pendingTap=k.tapRecord(slot);k.rememberClick(event(detail));}
test('two unmodified clicks on the already selected face confirm once',()=>{
 for(const grid of [false,true]){const k=picker(grid);click(k,4,1);click(k,4,2);const e=event();k.chooseFromDoubleClick(e);assert.equal(k.confirmations,1);assert.ok(e.prevented&&e.stopped);k.chooseFromDoubleClick(e);assert.equal(k.confirmations,1);}
});
test('double clicking a side card cannot confirm after its first click selects it',()=>{
 for(const grid of [false,true]){const k=picker(grid);click(k,5,1);k.cursor=k.index=5;k.candidate='side';click(k,5,2);k.chooseFromDoubleClick(event());assert.equal(k.confirmations,undefined);}
});
test('different virtual copies or candidate changes cannot complete a double click',()=>{
 for(const change of [k=>{k.cursor=k.index=16;},k=>{k.candidate='other';},k=>{k.gridMode=true;}]){const k=picker();click(k,4,1);change(k);click(k,k.cursor,2);k.chooseFromDoubleClick(event());assert.equal(k.confirmations,undefined);}
});
test('drag, cancellation or lost first tap cannot accidentally confirm',()=>{
 for(const reset of [k=>k.resetClicks(),k=>{k.pendingTap=null;}]){const k=picker();click(k,4,1);reset(k);k.rememberClick(event(2));k.chooseFromDoubleClick(event());assert.equal(k.confirmations,undefined);}
});
test('modifiers, right clicks and keyboard-generated clicks do not confirm',()=>{
 for(const options of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{button:2},{detail:0}]){const k=picker();click(k,4,1);k.pendingTap=k.tapRecord(4);k.rememberClick(event(2,options));k.chooseFromDoubleClick(event(2,options));assert.equal(k.confirmations,undefined);}
});
test('late double-click events cannot confirm a closed picker or active drag',()=>{
 for(const state of [{closed:true},{chosen:true},{drag:{}},{plugin:{stopped:true}}]){const k=picker();click(k,4,1);click(k,4,2);Object.assign(k,state);k.chooseFromDoubleClick(event());assert.equal(k.confirmations,undefined);}
});
