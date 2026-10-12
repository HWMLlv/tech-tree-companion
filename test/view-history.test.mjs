import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewHistory} from '../src/view-history.js';
const state=(x=0,y=0,z=1)=>({scrollX:x,scrollY:y,zoom:{value:z}});
test('continuous pan and zoom make one return point and restore zoom',()=>{const h=new ViewHistory(state());for(let i=1;i<50;i++)h.observe(state(i*5,0,1+i*.01));assert.equal(h.items.length,1);h.settle();h.observe(state(600,100,2));assert.equal(h.items.length,2);assert.deepEqual(h.back(),state(245,0,1.49));assert.deepEqual(h.back(),state());});
test('small movements and identical notifications do not create return entries',()=>{const h=new ViewHistory(state());h.observe(state(2,1));h.observe(state(3,1,1.001));h.settle();assert.equal(h.items.length,0);h.observe(state(15,1));assert.equal(h.items.length,1);});
test('programmatic focus and return do not register their own scroll notification',()=>{const h=new ViewHistory(state());h.remember(state());h.moved(state(100,200,.5));h.observe(state(100,200,.5));assert.equal(h.items.length,1);const old=h.back();h.observe(old);assert.equal(h.items.length,0);});
test('view history stays bounded at 30 operations',()=>{const h=new ViewHistory(state());for(let i=1;i<100;i++){h.observe(state(i*20));h.settle();}assert.equal(h.items.length,30);});
