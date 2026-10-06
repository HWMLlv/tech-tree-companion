import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {appearance,resizeTemplate,tidyNumber} from '../src/appearance.js';
import {moduleFontWeight,FONT_SIZES,buttonFill,DEFAULT_TEMPLATE,clone} from '../src/model.js';
class Element{
 constructor(tag='root',options={}){this.tag=tag;this.options=options;this.children=[];this.style={};}
 createEl(tag,options){const e=new Element(tag,options);this.children.push(e);return e;}
 createDiv(o){return this.createEl('div',o);}createSpan(o){return this.createEl('span',o);}empty(){this.children=[];}
 all(){return [this,...this.children.flatMap(e=>e.all())];}
}
const source=fs.readFileSync(new URL('../src/appearance-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export function ','function ');
const context={appearance,resizeTemplate,tidyNumber,moduleFontWeight,FONT_SIZES,buttonFill,fontInput:()=>{}};vm.createContext(context);vm.runInContext(source,context);
function render(type){const t=clone(DEFAULT_TEMPLATE),module={...t.modules[0],type,id:'selected'};t.modules=[module];const properties=new Element(),view={template:t,selected:module.id,properties,propertyTab:'module',plugin:{data:{}},edit:()=>{},drawProperties:()=>{}};context.drawTemplateProperties(view);return properties.all();}
const labels=elements=>elements.map(e=>e.options.attr?.['aria-label']).filter(Boolean);
test('button exposes working typography controls but no ineffective alignment choice',()=>{const els=render('button'),names=labels(els);assert.ok(names.includes('字号'));assert.ok(names.includes('精确字号'));assert.ok(!names.includes('文字对齐'));assert.ok(els.some(e=>e.options.text==='按钮文字固定居中。'));});
test('divider names are identified as editor metadata and no font controls are exposed',()=>{const els=render('divider'),names=labels(els);assert.ok(names.includes('模块名称'));assert.ok(names.includes('线条颜色'));assert.ok(!names.includes('精确字号'));assert.ok(!names.includes('字号'));assert.ok(names.includes('横向位置'));assert.ok(els.some(e=>e.options.text?.includes('不显示在卡片中')));});
test('ordinary text retains alignment and precise font size controls',()=>{const names=labels(render('text'));assert.ok(names.includes('文字对齐'));assert.ok(names.includes('精确字号'));assert.ok(names.includes('固定文字'));});
