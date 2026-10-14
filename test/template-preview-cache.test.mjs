import test from 'node:test';
import assert from 'node:assert/strict';
import {reusePreview,PREVIEW_CACHE_LIMIT} from '../src/template-preview-cache.js';

test('preview cache stays bounded through a large library and keeps recent entries',()=>{
 const cache=new Map();let renders=0;
 for(let i=0;i<500;i++)reusePreview(cache,'template-'+i,()=>({id:i,render:++renders}));
 assert.equal(cache.size,PREVIEW_CACHE_LIMIT);assert.equal(cache.has('template-0'),false);
 const recent=cache.get('template-436');assert.equal(reusePreview(cache,'template-436',()=>{throw Error('cached SVG must be reused');}),recent);
 reusePreview(cache,'next',()=>({}));assert.equal(cache.has('template-436'),true);assert.equal(cache.has('template-437'),false);assert.equal(renders,500);
});

test('failed preview rendering cannot evict usable cached previews or poison retries',()=>{
 const cache=new Map([['a',{}],['b',{}]]),before=[...cache];
 assert.throws(()=>reusePreview(cache,'bad',()=>{throw Error('invalid SVG');},2),/invalid SVG/);
 assert.deepEqual([...cache],before);
 const recovered=reusePreview(cache,'bad',()=>({valid:true}),2);assert.equal(recovered.valid,true);assert.equal(cache.size,2);
});
