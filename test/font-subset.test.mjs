import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {compact,compactFontRanges}=createRequire(import.meta.url)('../runtime/font-worker.cjs');
const face=(range,family='Card')=>`@font-face{font-family:"${family}";font-weight:700;font-style:italic;unicode-range:${range};}`;

test('font coverage shrinks to visible characters while retaining shard selection and styles',()=>{
 const svg=`<svg><style>${face('U+20-7F,U+6000-6300,U+7900-7FFF')}${face('U+10000-10FFFF','Emoji')}</style><text>ABC科技😀</text></svg>`;
 const result=compactFontRanges(svg,'ABC科技😀');
 assert.ok(result.includes('unicode-range:U+41-43,U+6280,U+79D1;'));
 assert.ok(result.includes('unicode-range:U+1F600;'));
 assert.equal((result.match(/font-weight:700;font-style:italic/g)||[]).length,2);
 assert.equal(result.match(/<text>.*<\/text>/)[0],svg.match(/<text>.*<\/text>/)[0]);
});
test('wildcard coverage and combining characters stay within their original font shards',()=>{
 const result=compactFontRanges(face('U+2000-206F,U+4E??,U+300-36F'),'一丁\u0301A');
 assert.ok(result.includes('unicode-range:U+301,U+4E00-4E01;'));
 assert.ok(!result.includes('U+41'));
});
test('unsupported, malformed and unused ranges remain intact; optimization is idempotent',()=>{
 for(const range of ['var(--coverage)','U+FF-01','U+110000','U+4?E?','U+40-4F']){
  assert.equal(compactFontRanges(face(range),'科技'),face(range));
 }
 const result=compactFontRanges(face('U+0-FFFF'),'…科技');
 assert.equal(result,face('U+0-FFFF'));
 assert.equal(compactFontRanges(result,'…科技'),result);
});
test('SVG compaction decodes entities and nested text, and preserves non-font content',async()=>{
 const svg=`<svg viewBox="0 0 352 192"><style>${face('U+20-7F,U+2000-206F,U+6000-6300,U+7900-7FFF')}</style><metadata>card-id</metadata><text x="12">&#x79D1;<tspan>技</tspan>&amp;&#8230;</text></svg>`;
 const result=await compact(svg);
 assert.ok(result.includes('unicode-range:U+26,U+2026,U+6280,U+79D1;'));
 assert.equal(result.replace(/<style>.*<\/style>/,''),svg.replace(/<style>.*<\/style>/,''));
});
test('system-font SVGs without embedded faces remain byte-identical',async()=>{
 const svg='<svg><text x="1" y="2" font-family="Arial">科技 ABC</text></svg>';
 assert.equal(await compact(svg),svg);
});
