import {connectionStyle} from './connection-style.js';
// These are tool defaults, not element patches: native drawing keeps its own undo.
// Explicit widths avoid native preset differences between shapes and free drawing.
export function arrowAppState(style){const s=connectionStyle(style);return {
 currentItemStrokeColor:s.strokeColor,currentItemStrokeWidthKey:null,currentItemStrokeWidth:s.strokeWidth,currentItemStrokeStyle:s.strokeStyle,currentItemRoughness:s.roughness,currentItemOpacity:s.opacity,currentItemStartArrowhead:s.startArrowhead,currentItemEndArrowhead:s.endArrowhead,currentItemRoundness:s.roundness?'round':'sharp',currentItemArrowType:s.elbowed?'elbow':s.roundness?'round':'sharp'
};}
export class NativeArrowDefaults{
 constructor(p,v,owner){this.p=p;this.v=v;this.api=v.excalidrawAPI;this.file=v.file;this.win=v.containerEl.ownerDocument.defaultView;owner.register(this.api.onChange((_,state)=>this.schedule(state)));owner.register(()=>this.destroy());this.schedule(this.api.getAppState());}
 schedule(state){if(this.applying||this.stopped)return;this.win.clearTimeout(this.timer);this.timer=this.win.setTimeout(()=>this.sync(this.api.getAppState()),0);}
 valid(){return this.v.file===this.file&&this.v.excalidrawAPI===this.api;}
 sync(state=this.api.getAppState(),force=false){
  if(this.stopped||!this.valid()||state.newElement||state.multiElement)return;
  const active=this.p.data.nativeArrowDefaults!==false&&state.activeTool?.type==='arrow'&&!state.viewModeEnabled;
  if(active&&(!this.snapshot||force)){const patch=arrowAppState(this.p.data.connectionStyle);if(!this.snapshot)this.snapshot=Object.fromEntries(Object.keys(patch).map(k=>[k,state[k]??null]));this.update(patch);}
  else if(!active&&this.snapshot)this.restore();
 }
 update(appState){this.applying=true;try{this.api.updateScene({appState,captureUpdate:'NEVER',forceFlushSync:true});}finally{this.applying=false;}}
 restore(){const old=this.snapshot;this.snapshot=null;if(old&&this.valid())this.update(old);}
 destroy(){this.stopped=true;this.win.clearTimeout(this.timer);this.restore();}
}
