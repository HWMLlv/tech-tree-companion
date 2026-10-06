export const EXCALIDRAW_ID='obsidian-excalidraw-plugin';
export const EXCALIDRAW_MIN_VERSION='2.25.3';
function supported(version){
 const match=String(version??'').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
 if(!match)return false;
 const actual=match.slice(1).map(Number),minimum=[2,25,3];
 for(let i=0;i<3;i++)if(actual[i]!==minimum[i])return actual[i]>minimum[i];
 return true;
}
export function dependencyState(plugin,doc){
 const manager=plugin.app.plugins,excalidraw=manager?.plugins?.[EXCALIDRAW_ID];
 if(!excalidraw)return {ready:false,code:manager?.manifests?.[EXCALIDRAW_ID]?'disabled':'missing',message:'请安装并启用 Excalidraw 后使用画布功能；本插件不会自动安装依赖。'};
 if(!supported(excalidraw.manifest?.version)||typeof excalidraw.isExcalidrawFile!=='function')return {ready:false,code:'incompatible',message:'需要兼容的 Excalidraw '+EXCALIDRAW_MIN_VERSION+' 或更新版本，请更新 Excalidraw。'};
 const api=doc?.defaultView?.ExcalidrawAutomate;
 if(doc&&typeof api?.getAPI!=='function')return {ready:false,code:'waiting',message:'Excalidraw 画布 API 尚未就绪，请打开绘图后重试。'};
 return {ready:true,code:'ready',plugin:excalidraw,api};
}
