// Excalidraw 2.28 shares one runtime; 2.25 keeps a package per window.
export function nativePackages(plugin,doc){
 const pm=plugin.app.plugins?.plugins?.['obsidian-excalidraw-plugin']?.packageManager;
 return [...new Set([pm?.runtimePackage,pm?.packageMap?.get(doc.defaultView),...(pm?.packageMap?.values()??[])].filter(Boolean))];
}
export function nativeLibrary(plugin,doc){return nativePackages(plugin,doc).find(p=>p.excalidrawLib)?.excalidrawLib;}
