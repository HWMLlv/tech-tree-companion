import test from 'node:test';
import assert from 'node:assert/strict';
import {guardRelationLinks} from '../src/relation-link-guard.js';
const nav=view=>({v:view,valid:()=>true,readingRelations:()=>true,relationNode:e=>e?.type==='image'});
test('relation link guard is scoped to its drawing and delegates existing hooks with their receiver',()=>{
 const calls=[],server={onLinkClickHook(...args){calls.push({receiver:this,args});return 'original';}},original=server.onLinkClickHook,view={},other={},controller=nav(view);
 const release=guardRelationLinks(server,controller),image={type:'image'};
 assert.equal(server.onLinkClickHook(image,'x',null,view),false);assert.equal(calls.length,0);
 assert.equal(server.onLinkClickHook(image,'x',null,other),'original');assert.equal(calls[0].receiver,server);
 controller.readingRelations=()=>false;assert.equal(server.onLinkClickHook(image,'x',null,view),'original');
 controller.readingRelations=()=>true;assert.equal(server.onLinkClickHook({type:'text'},'x',null,view),'original');
 controller.valid=()=>false;assert.equal(server.onLinkClickHook(image,'x',null,view),'original');release();assert.equal(server.onLinkClickHook,original);
});
test('shared hook cleanup tolerates multiple drawings and never overwrites a later hook',()=>{
 const server={},a=nav({}),b=nav({}),releaseA=guardRelationLinks(server,a),dispatcher=server.onLinkClickHook,releaseB=guardRelationLinks(server,b);
 releaseA();assert.equal(server.onLinkClickHook,dispatcher);assert.equal(server.onLinkClickHook({type:'image'},'',null,b.v),false);releaseB();assert.equal(Object.hasOwn(server,'onLinkClickHook'),false);
 const release=guardRelationLinks(server,a),replacement=()=>false;server.onLinkClickHook=replacement;release();assert.equal(server.onLinkClickHook,replacement);
});
test('inherited hooks are restored by removing only our own property',()=>{
 const previous=()=>false,server=Object.create({onLinkClickHook:previous}),release=guardRelationLinks(server,nav({}));release();assert.equal(Object.hasOwn(server,'onLinkClickHook'),false);assert.equal(server.onLinkClickHook,previous);
});
