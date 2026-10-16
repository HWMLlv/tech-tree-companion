import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {settingsDefinitions} from '../src/settings-definitions.js';
import {setLanguage} from '../src/i18n.js';

test('settings indexing returns real nonempty definitions without rendering or I/O',()=>{
 const trap=()=>{throw Error('Rendering during indexing');};
 const defs=settingsDefinitions({renderLanguage:trap,renderNavigation:trap,renderSection:trap});
 assert.equal(defs.length,8);assert.equal(defs.filter(d=>d.searchable!==false).length,7);
 for(const d of defs){assert.ok(d.name);assert.equal(typeof d.render,'function');assert.equal(d.control,undefined);}
});
test('index aliases cover every existing setting section in both languages',()=>{
 const defs=settingsDefinitions({});
 for(const term of ['界面语言','Interface language','启用轮盘','Enable wheel','启用辅助外环','长按时长（毫秒）','绑定按键','通用字体','Global font','配置导入与导出','不透明度','Opacity','创意卡牌选择','Creative card picker','卡片附件与回收站'])assert.ok(defs.some(d=>d.aliases?.includes(term)),term);
 for(const d of defs.filter(d=>d.aliases))assert.equal(new Set(d.aliases).size,d.aliases.length);
});
test('custom callbacks route to existing section renderers only when invoked',()=>{
 const calls=[],setting={};
 const defs=settingsDefinitions({renderLanguage:s=>calls.push(['language',s]),renderNavigation:s=>calls.push(['navigation',s]),renderSection:(s,key)=>calls.push([key,s])});
 assert.deepEqual(calls,[]);for(const d of defs)d.render(setting);
 assert.deepEqual(calls.map(c=>c[0]),['language','navigation','radial','font','configs','connection','templates','assets']);assert.ok(calls.every(c=>c[1]===setting));
});
test('definition names refresh with UI language while bilingual aliases remain searchable',()=>{
 try{setLanguage('zh');const zh=settingsDefinitions({});setLanguage('en');const en=settingsDefinitions({});assert.equal(zh[0].name,'界面语言');assert.equal(en[0].name,'Interface language');assert.deepEqual(zh.map(d=>d.aliases),en.map(d=>d.aliases));}finally{setLanguage('zh');}
});
test('hex placeholder is a valid color example rather than sentence-like format text',()=>{
 const source=fs.readFileSync(new URL('../src/color-popup.js',import.meta.url),'utf8');assert.match(source,/placeholder:'#123456'/);assert.doesNotMatch(source,/placeholder:'#rrggbb'/);assert.match('#123456',/^#[0-9a-f]{6}$/i);
});
