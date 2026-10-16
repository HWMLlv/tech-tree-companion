import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {transform} from 'esbuild';

const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const compact=(await transform(css,{loader:'css',minifyWhitespace:true,minifySyntax:true,logLevel:'silent'})).code;
const declarations=selector=>[...compact.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([,selectors])=>selectors.split(',').includes(selector))?.[2];

test('plugin CSS parses without warnings and contains no important declarations',async()=>{
 const result=await transform(css,{loader:'css',logLevel:'silent'});
 assert.deepEqual(result.warnings,[]);
 assert.doesNotMatch(result.code,/!\s*important\b/i);
});

test('hidden picker surfaces and flight originals have scoped normal-priority rules',()=>{
 for(const selector of ['.tt-template-picker .tt-template-deck-viewport[hidden]','.tt-template-picker .tt-template-picker-grid[hidden]','.tt-template-picker .tt-template-picker-empty[hidden]','.tt-template-picker .tt-template-deck>button.tt-template-picker-card[hidden]','.tt-template-picker .tt-template-picker-grid>button.tt-template-picker-card[hidden]'])assert.match(declarations(selector)??'',/display:none/);
 for(const selector of ['.tt-template-flight .tt-template-picker button.tt-template-picker-card.tt-template-flight-hidden','.tt-template-flight .tt-template-picker .tt-template-picker-art>svg.tt-template-flight-hidden'])assert.match(declarations(selector)??'',/visibility:hidden/);
});
