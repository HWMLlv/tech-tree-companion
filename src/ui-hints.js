// App-owned hints use aria-labelledby for names, so Obsidian and Chromium do not
// each schedule their own tooltip from aria-label and title on the same control.
let sequence=0;
export function prepareHints(root){
 if(root.dataset.ttLabel&&root.hasAttribute('aria-labelledby')&&!root.ownerDocument.getElementById(root.getAttribute('aria-labelledby')))root.setAttribute('aria-label',root.dataset.ttLabel);
 const controls=[root,...root.querySelectorAll('[aria-label],[title]')].filter(el=>el.hasAttribute('aria-label')||el.hasAttribute('title'));if(!controls.length)return;
 let bank=root.querySelector(':scope > .tt-a11y-labels');if(!bank)bank=root.createDiv({cls:'tt-a11y-labels'});
 for(const el of controls){const label=el.getAttribute('aria-label')||el.getAttribute('title'),hint=el.getAttribute('title')||label;const name=bank.createSpan({text:label,attr:{id:'tt-label-'+(++sequence)}});el.setAttribute('aria-labelledby',name.id);el.setAttribute('data-tt-label',label);
  if(el.matches('button,[data-module-id],[data-card-resize]'))el.setAttribute('data-tt-hint',hint);
  el.removeAttribute('title');el.removeAttribute('aria-label');
 }
}
export class Hints{
 constructor(doc){this.doc=doc;this.win=doc.defaultView;this.abort=new this.win.AbortController();const on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:this.abort.signal});
  on(doc,'pointerover',e=>{const target=e.target.closest?.('[data-tt-hint]');if(target&&target!==this.target)this.schedule(target);});
  on(doc,'pointerout',e=>{if(this.target?.contains(e.target)&&!this.target.contains(e.relatedTarget))this.clear();});
  on(doc,'focusin',e=>{const target=e.target.closest?.('[data-tt-hint]');if(target)this.schedule(target,true);});
  on(doc,'focusout',()=>this.clear());on(doc,'pointerdown',()=>this.clear(),{capture:true});on(doc,'keydown',()=>this.clear(),{capture:true});on(doc,'scroll',()=>this.clear(),{capture:true});on(this.win,'blur',()=>this.clear());on(this.win,'resize',()=>this.clear());
 }
 schedule(target,focus=false){this.clear();this.target=target;this.timer=this.win.setTimeout(()=>{if(this.target!==target||!target.isConnected||!(focus?target.contains(this.doc.activeElement):target.matches(':hover')))return this.clear();const tip=this.doc.body.createDiv({cls:'tt-tooltip',text:target.dataset.ttHint,attr:{role:'tooltip',id:'tt-hint-'+(++sequence)}});this.tip=tip;target.setAttribute('aria-describedby',tip.id);const r=target.getBoundingClientRect(),box=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(this.win.innerWidth-box.width-8,r.left+r.width/2-box.width/2))+'px';tip.style.top=(r.bottom+box.height+12<this.win.innerHeight?r.bottom+6:Math.max(8,r.top-box.height-6))+'px';},160);}
 clear(){this.win.clearTimeout(this.timer);if(this.tip&&this.target?.getAttribute('aria-describedby')===this.tip.id)this.target.removeAttribute('aria-describedby');this.tip?.remove();this.tip=null;this.target=null;}
 refresh(root){if(this.target&&(root.contains(this.target)||!this.target.isConnected))this.clear();prepareHints(root);}
 destroy(){this.clear();this.abort.abort();}
}
