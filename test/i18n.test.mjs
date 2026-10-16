import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from 'espree';
import en from '../src/locales/en.json' with {type:'json'};
import {tr,setLanguage,resolveLanguage,sourceKey} from '../src/i18n.js';
import {radialConfig} from '../src/radial-model.js';
import {titleForRelink} from '../src/node-link-title.js';

test('English translations retain placeholders and only the intentional shade suffix is blank',()=>{
 const placeholders=text=>[...text.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
 for(const [source,translated]of Object.entries(en)){
  assert.equal(typeof translated,'string',source);if(source===' 档')assert.equal(translated,' ');else assert.ok(translated.trim(),source);
  assert.deepEqual(placeholders(translated),placeholders(source),source);
 }
});

test('English locale source contains no duplicate keys hidden by JSON parsing',()=>{
 const ast=parse('('+fs.readFileSync(new URL('../src/locales/en.json',import.meta.url),'utf8')+')',{ecmaVersion:'latest'}),keys=ast.body[0].expression.properties.map(p=>p.key.value);
 assert.equal(new Set(keys).size,keys.length);
});

test('explicit language overrides host; auto follows Chinese locales and otherwise English',()=>{
 for(const host of ['zh','zh-CN','zh-TW','zh_HK'])assert.equal(resolveLanguage('auto',host),'zh');
 for(const host of ['en','en-GB','de','unknown'])assert.equal(resolveLanguage('auto',host),'en');
 assert.equal(resolveLanguage('en','zh'),'en');assert.equal(resolveLanguage('zh','en'),'zh');
 assert.equal(resolveLanguage('obsolete','en'),'en');
});
test('language changes use the same keys and leave unknown/user values intact',()=>{
 try{setLanguage('en');assert.equal(tr('保存'),'Save');assert.equal(sourceKey('Save'),'保存');assert.equal(tr('自定义标题：铜矿'),'自定义标题：铜矿');setLanguage('zh');assert.equal(tr('保存'),'保存');}finally{setLanguage('zh');}
});
test('translated templates insert user content once without evaluating embedded placeholders',()=>{
 try{setLanguage('en');assert.equal(tr`编辑${'矿石 {0} <b>&'}`,'Edit 矿石 {0} <b>&');setLanguage('zh');assert.equal(tr`编辑${'矿石 {0}'}`,'编辑矿石 {0}');}finally{setLanguage('zh');}
});
test('locale does not mutate saved wheel names, bindings, action IDs, or layout',()=>{
 const input={radius:145,items:[{action:'templates',label:'我的模板中心',icon:'workflow'},{action:'command',command:'other:run',label:'A deliberately long English command label',icon:'terminal'}],auxiliaryItems:[{id:'search-nodes',label:'搜矿石'}]};
 const original=structuredClone(input);setLanguage('zh');const before=radialConfig(input);
 try{setLanguage('en');assert.deepEqual(radialConfig(input),before);assert.deepEqual(input,original);assert.equal(before.items[1].label,input.items[1].label);}finally{setLanguage('zh');}
});
test('English placeholder titles relink while custom Chinese titles remain unchanged',()=>{
 assert.equal(titleForRelink('Untitled technology','','New title'),'New title');assert.equal(titleForRelink('铜矿','','Copper'),'铜矿');
});
test('every literal and template translation call has an English entry',()=>{
 const missing=[];let count=0;
 for(const file of fs.readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')&&f!=='i18n.js')){
  const ast=parse(fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),{ecmaVersion:'latest',sourceType:'module'});
  const walk=node=>{if(!node||typeof node!=='object')return;let key;
   if(node.type==='CallExpression'&&node.callee.name==='tr'&&node.arguments[0]?.type==='Literal')key=node.arguments[0].value;
   if(node.type==='TaggedTemplateExpression'&&node.tag.name==='tr')key=node.quasi.quasis.map((q,i)=>q.value.cooked+(i<node.quasi.expressions.length?'{'+i+'}':'')).join('');
   if(typeof key==='string'){count++;if(!Object.hasOwn(en,key))missing.push(file+': '+key);}
   for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
  };walk(ast);
 }
 assert.ok(count>700);assert.deepEqual(missing,[]);
});
