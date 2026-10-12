// Preview geometry is normalized; fitting never changes the actual runtime radii.
export function previewGeometry(config){const scale=260/config.auxiliaryRadius;return {outer:260,inner:config.radius*scale,gap:(config.radius+12)*scale,center:Math.min(config.inner,config.radius*.55)*scale};}
export function previewFit(width,height,editor=false){
 const available=Math.max(0,Math.min(width,height)-12),minimum=editor?320:0,maximum=520;
 return {scale:Math.min(maximum,available)/520,tooSmall:editor&&available<minimum};
}
export function editorLayout(width,height){return {compact:width<710,short:height<420};}
export class WheelFit{
 constructor(viewport,preview,{editor=false,body=null}={}){
  this.viewport=viewport;this.preview=preview;this.editor=editor;this.body=body;this.win=viewport.ownerDocument.defaultView;
  this.observer=new this.win.ResizeObserver(()=>this.schedule());this.observer.observe(viewport);if(body)this.observer.observe(body);this.schedule();
 }
 schedule(){if(!this.frame)this.frame=this.win.requestAnimationFrame(()=>{this.frame=null;this.update();});}
 update(){
  if(this.body){const layout=editorLayout(this.body.clientWidth,this.body.clientHeight);this.body.classList.toggle('is-compact',layout.compact);this.body.classList.toggle('is-short',layout.short&&!layout.compact);}
  const fit=previewFit(this.viewport.clientWidth,this.viewport.clientHeight,this.editor);this.preview.style.setProperty('--tt-wheel-scale',String(fit.scale));this.viewport.classList.toggle('is-too-small',fit.tooSmall);this.scale=fit.scale;
 }
 destroy(){this.observer.disconnect();this.win.cancelAnimationFrame(this.frame);this.frame=null;}
}
