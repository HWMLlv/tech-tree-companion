// App-owned hints use aria-labelledby for names, so Obsidian and Chromium do not
// each schedule their own tooltip from aria-label and title on the same control.
let sequence=0;
const names=new WeakMap(),externalNames=new WeakMap();
export function setHint(el,text,label){
 if(label!==undefined){el.setAttribute('aria-label',label);prepareHints(el);}
 const value=el.closest?.('[data-tt-hints="off"]')?'':String(text??''),changed=(el.dataset.ttHint??'')!==value;
 if(value)el.dataset.ttHint=value;else delete el.dataset.ttHint;el.removeAttribute('title');
 if(changed)el.dispatchEvent(new el.ownerDocument.defaultView.CustomEvent('tt-hint-change',{bubbles:true}));
}
export function prepareHints(root,{hints=true,deep=true}={}){
 if(!hints)root.dataset.ttHints='off';
 const controls=[root,...(deep?root.querySelectorAll('[aria-label],[title],[data-tt-label]'):[])].filter(el=>el.hasAttribute('aria-label')||el.hasAttribute('title')||el.dataset.ttLabel!==undefined);
 let bank=root.querySelector(':scope > .tt-a11y-labels');
 for(const el of controls){
  const aria=el.getAttribute('aria-label'),title=el.getAttribute('title'),label=aria??el.dataset.ttLabel??title;if(label===null)continue;
  const hint=title??(aria!==null?label:el.dataset.ttHint??label);let name=names.get(el);
  if(!name||el.getAttribute('aria-labelledby')!==name.id){
   const old=el.getAttribute('aria-labelledby'),external=old&&(externalNames.get(el)===old||!el.dataset.ttLabel)&&old.split(/\s+/).every(id=>root.ownerDocument.getElementById(id));
   if(external){externalNames.set(el,old);names.delete(el);name=null;}
   else{bank??=root.createDiv({cls:'tt-a11y-labels'});name=bank.createSpan({attr:{id:'tt-label-'+(++sequence)}});names.set(el,name);el.setAttribute('aria-labelledby',name.id);}
  }
  if(name&&!root.contains(name)){bank??=root.createDiv({cls:'tt-a11y-labels'});bank.append(name);}
  if(name&&name.textContent!==label)name.textContent=label;if(el.dataset.ttLabel!==label)el.dataset.ttLabel=label;
  if(el.closest('[data-tt-hints="off"]'))delete el.dataset.ttHint;
  else if(el.matches('button,[role="button"],[data-module-id],[data-card-resize]'))setHint(el,hint);
  el.removeAttribute('title');el.removeAttribute('aria-label');
 }
 if(bank){const referenced=new Set([root,...root.querySelectorAll('[aria-labelledby]')].flatMap(el=>(el.getAttribute('aria-labelledby')??'').split(/\s+/)));for(const name of [...bank.children])if(!referenced.has(name.id))name.remove();if(!bank.children.length)bank.remove();}
}
export class Hints{
 constructor(doc){this.doc=doc;this.win=doc.defaultView;this.abort=new this.win.AbortController();const on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:this.abort.signal});
  on(doc,'pointerover',e=>{const target=e.target.closest?.('[data-tt-hint]');if(target&&target!==this.target)this.schedule(target);});
  on(doc,'pointerout',e=>{if(this.target?.contains(e.target)&&!this.target.contains(e.relatedTarget))this.clear();});
  on(doc,'focusin',e=>{const target=e.target.closest?.('[data-tt-hint]');if(target)this.schedule(target,true);});
  on(doc,'focusout',()=>this.clear());on(doc,'pointerdown',()=>this.clear(),{capture:true});on(doc,'keydown',()=>this.clear(),{capture:true});on(doc,'scroll',()=>this.clear(),{capture:true});on(this.win,'blur',()=>this.clear());on(this.win,'resize',()=>this.clear());
  on(doc,'tt-hint-change',e=>{if(e.target===this.target){if(!e.target.dataset.ttHint)this.clear();else if(this.tip){this.tip.textContent=e.target.dataset.ttHint;this.position();}}else if(e.target.matches?.(':hover')&&e.target.dataset.ttHint)this.schedule(e.target);});
 }
 schedule(target,focus=false){if(this.target===target)return;this.clear();this.target=target;this.timer=this.win.setTimeout(()=>{this.timer=null;if(this.target!==target||!target.isConnected||!target.dataset.ttHint||!(focus?target.contains(this.doc.activeElement):target.matches(':hover')))return this.clear();const tip=this.doc.body.createDiv({cls:'tt-tooltip',text:target.dataset.ttHint,attr:{role:'tooltip',id:'tt-hint-'+(++sequence)}});this.tip=tip;target.setAttribute('aria-describedby',[target.getAttribute('aria-describedby'),tip.id].filter(Boolean).join(' '));this.position();if(this.win.MutationObserver){this.detached=new this.win.MutationObserver(()=>{if(!target.isConnected||!tip.isConnected)this.clear();});this.detached.observe(this.doc.body,{childList:true,subtree:true});}},160);}
 position(){const r=this.target.getBoundingClientRect(),box=this.tip.getBoundingClientRect();this.tip.style.left=Math.max(8,Math.min(this.win.innerWidth-box.width-8,r.left+r.width/2-box.width/2))+'px';this.tip.style.top=(r.bottom+box.height+12<this.win.innerHeight?r.bottom+6:Math.max(8,r.top-box.height-6))+'px';}
 clear(){this.win.clearTimeout(this.timer);this.timer=null;this.detached?.disconnect();this.detached=null;if(this.tip&&this.target){const rest=(this.target.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id&&id!==this.tip.id);if(rest.length)this.target.setAttribute('aria-describedby',rest.join(' '));else this.target.removeAttribute('aria-describedby');}this.tip?.remove();this.tip=null;this.target=null;}
 refresh(root,options){if(this.target&&!this.target.isConnected)this.clear();prepareHints(root,options);}
 destroy(){this.clear();this.abort.abort();}
}
