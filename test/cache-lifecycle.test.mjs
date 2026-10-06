import test from 'node:test';import assert from 'node:assert/strict';import {FontCache} from '../src/font-cache.js';import {NativeFonts} from '../src/native-fonts.js';
test('disk pruning only removes aged font cache entries and preserves active URLs and unrelated files',async()=>{
 const directory='plugin/font-cache',url='https://unpkg.com/@zsviczian/excalidraw@0.18.1/dist/excalidraw-assets/Xiaolai-Regular-'+ 'a'.repeat(32)+'.woff2',removed=[];
 const cache=new FontCache({directory,request:async()=>{},adapter:{list:async()=>({files:[directory+'/'+ 'b'.repeat(64)+'.woff2',directory+'/keep.json',directory+'/'+ 'c'.repeat(64)+'.woff2',await cache.path(url)]}),stat:async path=>({size:100,mtime:Date.now()-(path.includes('c'.repeat(64))?1:31)*86400000}),remove:async path=>removed.push(path)}});
 cache.memory.set(url,'loaded');await cache.prune();assert.deepEqual(removed,[directory+'/'+ 'b'.repeat(64)+'.woff2']);
});
test('unload releases the native FontFace registrations and font memory cache',()=>{
 const removed=[],service=new NativeFonts({});service.documents.set({fonts:{delete:face=>removed.push(face)}},new Map([['key',{face:'font'}]]));let stopped=false,cacheDestroyed=false;service.watchers.add(()=>{stopped=true;});service.cache={destroy:()=>cacheDestroyed=true};service.destroy();assert.deepEqual(removed,['font']);assert.equal(service.documents.size,0);assert.equal(stopped,true);assert.equal(cacheDestroyed,true);
});
