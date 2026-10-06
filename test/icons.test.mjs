import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ICONS,ICON_GROUPS,iconBody} from '../src/icons.js';
import {clone,DEFAULT_TEMPLATE,replaceModuleIcon,validateTemplate,renderNode} from '../src/model.js';
const module=(id,icon)=>({id,type:'icon',label:id,icon,x:312,y:152,w:24,h:24,color:'#1971c2',fontSize:16,align:'left'});
const fixture=()=>{const t=clone(DEFAULT_TEMPLATE);t.modules.push(module('first','atom'),{...module('second','flask'),x:280});return t;};

test('all 30 catalog icons can be saved and rendered with complete nonduplicated groups',()=>{
 const keys=Object.keys(ICONS),grouped=ICON_GROUPS.flatMap(g=>g.keys);assert.equal(keys.length,30);assert.equal(new Set(grouped).size,30);assert.deepEqual([...grouped].sort(),[...keys].sort());
 for(const key of keys){const t=fixture();replaceModuleIcon(t,'first',key);validateTemplate(t);const result=renderNode(t,{},text=>({width:text.length*8,height:16}));assert.ok(result.svg.includes(iconBody(key)));assert.doesNotMatch(iconBody(key),/script|image|href|url\(|https?:/i);}
});
test('replacing one icon retains geometry, color, other modules and template metadata',()=>{
 const t=fixture(),expected=clone(t);expected.modules.find(m=>m.id==='second').icon='ore';replaceModuleIcon(t,'second','ore');assert.deepEqual(t,expected);
});
test('missing, non-icon and unsupported replacements reject without modifying the template',()=>{
 for(const [id,key]of [['missing','ore'],['title','ore'],['first','not-an-icon']]){const t=fixture(),before=clone(t);assert.throws(()=>replaceModuleIcon(t,id,key));assert.deepEqual(t,before);}
});
let lastPicker;
class Picker{constructor(app,value,choose,options){Object.assign(this,{value,choose,options});lastPicker=this;}open(){}close(){this.options.onClose();}}
const source=fs.readFileSync(new URL('../src/node-modal.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export class NodeModal','globalThis.NodeModal=class NodeModal').replace('export function confirmAction','function confirmAction');
const context={Modal:class{},IconPicker:Picker,replaceModuleIcon};vm.createContext(context);vm.runInContext(source,context);
function nodeFixture(){lastPicker=null;const m=Object.create(context.NodeModal.prototype),saved=fixture();Object.assign(m,{template:clone(saved),values:{title:'自定义矿物',materials:'8份',research:'120'},link:'[[原料.md#矿物]]',plugin:{},contentEl:{isConnected:true},iconTrigger:{isConnected:true,focus(){}},repaint(){this.paints=(this.paints??0)+1;}});return {m,saved};}
test('opening or cancelling a node icon picker does not edit the node or saved template',()=>{
 const {m,saved}=nodeFixture(),before=clone({template:m.template,values:m.values,link:m.link});m.openIcons();assert.equal(lastPicker.options.targets.length,2);lastPicker.close();assert.equal(m.iconPicker,null);assert.deepEqual({template:m.template,values:m.values,link:m.link},before);assert.deepEqual(saved,before.template);assert.equal(m.paints,undefined);
});
test('node confirmation updates only the chosen icon in its draft, retaining values and link',()=>{
 const {m,saved}=nodeFixture(),expected=clone(m.template),values=clone(m.values),link=m.link;m.openIcons();lastPicker.choose('crystal','second');lastPicker.close();expected.modules.find(x=>x.id==='second').icon='crystal';assert.deepEqual(m.template,expected);assert.deepEqual(m.values,values);assert.equal(m.link,link);assert.equal(saved.modules.find(x=>x.id==='second').icon,'flask');assert.equal(m.paints,1);
});
test('iconless cards do not acquire a new module or open a picker',()=>{
 const {m}=nodeFixture();m.template=clone(DEFAULT_TEMPLATE);const before=clone(m.template);m.openIcons();assert.equal(lastPicker,null);assert.deepEqual(m.template,before);
});
test('a stale icon dialog cannot modify a replacement template and cannot submit the parent',async()=>{
 const {m}=nodeFixture();m.openIcons();m.template=clone(DEFAULT_TEMPLATE);const before=clone(m.template);lastPicker.choose('ore','first');await m.submit();assert.deepEqual(m.template,before);assert.equal(m.submitting,undefined);lastPicker.close();
});
