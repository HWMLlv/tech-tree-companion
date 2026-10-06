import {Scope} from 'obsidian';
import {PALETTE,COLOR_KEYS,normalizeHex,locateColor,colorAt,rememberColor,contrastInk} from './palette.js';
export class ColorPopup{
 constructor(anchor,value,onChange,{label,owner,allowTransparent=false}={}){Object.assign(this,{anchor,value,onChange,label,owner,allowTransparent});this.doc=anchor.ownerDocument;this.win=this.doc.defaultView;this.scope=anchor.closest('.tt-template-view,.tt-node-modal')??anchor.parentElement;this.shade=locateColor(value)?.shade??(label==='背景'?1:4);}
 open(){
  for(const p of this.owner?.colorPickers??[])p.close();this.owner?.colorPickers?.add(this);
  if(this.owner?.app){this.keyScope=new Scope(this.owner.modal?.scope??this.owner.app.scope);this.keyScope.register([], 'Escape',()=>{this.close();return false;});this.owner.app.keymap.pushScope(this.keyScope);}
  this.abort=new this.win.AbortController();const opts={signal:this.abort.signal};this.root=this.doc.body.createDiv({cls:'tt-color-popup',attr:{role:'dialog','aria-label':this.label+'调色板',tabindex:'-1'}});
  this.root.addEventListener('keydown',e=>this.key(e),opts);
  this.doc.addEventListener('pointerdown',e=>{if(!this.sampling&&!this.root.contains(e.target)&&e.target!==this.anchor)this.close();},{...opts,capture:true});
  this.win.addEventListener('resize',()=>this.position(),opts);
  this.observer=new this.win.MutationObserver(()=>{if(!this.scope.isConnected)this.close();});this.observer.observe(this.doc.body,{childList:true,subtree:true});
  this.draw();this.position();this.root.focus();
 }
 position(){if(!this.root?.isConnected)return;const r=this.anchor.isConnected?this.anchor.getBoundingClientRect():this.rect;this.rect=r;if(!r)return;const w=this.root.offsetWidth,h=this.root.offsetHeight;const x=r.left-w-8>=8?r.left-w-8:r.right+8;this.root.style.left=Math.max(8,Math.min(x,this.win.innerWidth-w-8))+'px';this.root.style.top=Math.max(8,Math.min(r.top,this.win.innerHeight-h-8))+'px';}
 choose(color){if(this.owner?.stopped||!this.scope.isConnected)return this.close();if(color==='transparent'&&!this.allowTransparent)return;this.value=color;const found=locateColor(color);if(found?.shade!=null)this.shade=found.shade;this.onChange(color);if(this.owner&&!found){this.owner.data.recentColors=rememberColor(this.owner.data.recentColors??[],color);this.owner.persist().catch(e=>this.owner.error(e));}this.draw();this.position();this.root.focus();}
 swatch(row,color,label,key,attrs={}){const b=row.createEl('button',{cls:'tt-palette-swatch'+(color==='transparent'?' is-transparent':''),attr:{type:'button','aria-label':label,title:label+' · '+color,'aria-pressed':String(color===this.value),...attrs}});if(color!=='transparent')b.style.background=color;b.style.color=contrastInk(color);b.createSpan({text:key});b.onclick=()=>this.choose(color);return b;}
 draw(){
  const root=this.root;root.empty();const head=root.createDiv({cls:'tt-palette-head'});head.createSpan({text:this.label+'颜色'});head.createEl('button',{text:'×',attr:{type:'button','aria-label':'关闭调色板'}}).onclick=()=>this.close();
  const recent=(this.owner?.data.recentColors??[]).filter(c=>normalizeHex(c)&&!locateColor(c)).slice(0,5);if(recent.length){root.createEl('p',{text:'最近自定义颜色'});const row=root.createDiv({cls:'tt-palette-grid'});recent.forEach((c,i)=>this.swatch(row,c,'最近颜色 '+(i+1),String(i+1)));}
  root.createEl('p',{text:'色系'});const grid=root.createDiv({cls:'tt-palette-grid',attr:{'aria-label':'色系'}});PALETTE.forEach((entry,i)=>{if(entry[0]==='transparent'&&!this.allowTransparent){grid.createSpan();return;}this.swatch(grid,colorAt(entry,this.shade),entry[1],COLOR_KEYS[i],{'data-family':entry[0]});});
  root.createEl('p',{text:'色调明暗'});const family=locateColor(this.value);if(Array.isArray(family?.colors)){const row=root.createDiv({cls:'tt-palette-grid',attr:{'aria-label':'色调明暗'}});family.colors.forEach((c,i)=>this.swatch(row,c,family.label+' · 第 '+(i+1)+' 档','⇧'+(i+1),{'data-shade':String(i)}));}else root.createDiv({cls:'tt-muted',text:'选择一个色系后可切换五档深浅。'});
  const label=root.createEl('label',{cls:'tt-palette-hex',text:'十六进制值'}),row=label.createDiv({cls:'tt-actions'}),input=row.createEl('input',{type:'text',attr:{'aria-label':'十六进制颜色',placeholder:'#rrggbb',maxlength:'7'}});input.value=this.value==='transparent'?'':this.value;const status=root.createDiv({cls:'tt-muted',attr:{role:'status'}});const apply=()=>{const value=normalizeHex(input.value);if(!value){input.setAttribute('aria-invalid','true');status.textContent='请输入 3 位或 6 位十六进制颜色。';return;}this.choose(value);};row.createEl('button',{text:'应用',attr:{type:'button'}}).onclick=apply;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();apply();}};
  if(typeof this.win.EyeDropper==='function')row.createEl('button',{text:'取色',attr:{type:'button','aria-label':'屏幕取色'}}).onclick=async()=>{this.sampling=true;try{const result=await new this.win.EyeDropper().open({signal:this.abort.signal});if(this.root.isConnected)this.choose(result.sRGBHex);}catch(e){if(e.name!=='AbortError'&&this.root.isConnected)status.textContent='取色不可用，请输入颜色值。';}finally{this.sampling=false;}};
  this.owner?.hintRoot?.(root);
 }
 key(e){
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();return;}
  if(e.isComposing||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea'))return;
  const digit=/^Digit[1-5]$/.test(e.code)?Number(e.code.slice(-1))-1:null,family=locateColor(this.value);let color;
  if(e.shiftKey&&digit!==null&&Array.isArray(family?.colors))color=family.colors[digit];else if(!e.shiftKey){const i=COLOR_KEYS.indexOf(e.key.toLowerCase());if(i>=0&&e.key.length===1)color=colorAt(PALETTE[i],this.shade);else if(digit!==null)color=this.owner?.data.recentColors?.[digit];}
  if(color){e.preventDefault();e.stopPropagation();this.choose(color);}
 }
 close(){if(this.keyScope){this.owner.app.keymap.popScope(this.keyScope);this.keyScope=null;}this.abort?.abort();this.observer?.disconnect();this.root?.remove();this.owner?.colorPickers?.delete(this);}
}
