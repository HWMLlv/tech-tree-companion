import test from 'node:test';
import assert from 'node:assert/strict';
import {dependencyState,EXCALIDRAW_ID} from '../src/dependency.js';
const context=(version='2.28.0')=>({app:{plugins:{plugins:{[EXCALIDRAW_ID]:{manifest:{version},isExcalidrawFile:()=>false}},manifests:{[EXCALIDRAW_ID]:{version}}}}});
test('missing and disabled Excalidraw do not crash or install a dependency',()=>{
 const missing={app:{plugins:{plugins:{},manifests:{}}}},disabled=context();delete disabled.app.plugins.plugins[EXCALIDRAW_ID];
 assert.equal(dependencyState(missing).code,'missing');assert.equal(dependencyState(disabled).code,'disabled');
 assert.deepEqual(missing,{app:{plugins:{plugins:{},manifests:{}}}});
});
test('incompatible versions or APIs are rejected; compatible newer versions are accepted',()=>{
 for(const version of ['2.25.2','2.24.99','1.99.99',null,'unknown'])assert.equal(dependencyState(context(version)).code,'incompatible');
 for(const version of ['2.25.3','2.28.0','3.0.0'])assert.equal(dependencyState(context(version)).ready,true);
 const changed=context();delete changed.app.plugins.plugins[EXCALIDRAW_ID].isExcalidrawFile;assert.equal(dependencyState(changed).code,'incompatible');
});
test('document-specific Automate API must be ready before editing a drawing',()=>{
 const plugin=context();assert.equal(dependencyState(plugin,{defaultView:{}}).code,'waiting');
 const api={getAPI:()=>{}};assert.equal(dependencyState(plugin,{defaultView:{ExcalidrawAutomate:api}}).api,api);
});
