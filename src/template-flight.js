import {editableFields} from './field-navigation.js';
import {containRect,flightFrames} from './template-flight-geometry.js';
import {deckPose} from './template-deck-model.js';

const easing='cubic-bezier(.2,.75,.2,1)';
const rectStyle=rect=>({left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
const usable=rect=>[rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)&&rect.width>0&&rect.height>0;

// This owns the short-lived overlay independently of either Modal's teardown.
class TemplateFlight{
 constructor(picker){this.picker=picker;this.plugin=picker.plugin;this.doc=picker.contentEl.ownerDocument;this.win=picker.animationWindow;this.animations=[];}
 capture(){
  const k=this.picker,card=k.cards.get(k.gridMode?k.index:k.cursor),svg=card?.querySelector('.tt-template-picker-art>svg');
  if(k.motion.matches||!card?.isConnected||!svg||typeof card.animate!=='function')return false;
  const r=card.getBoundingClientRect(),clip=(k.gridMode?k.grid:k.viewport).getBoundingClientRect();
  if(!usable(r)||r.right<=clip.left||r.left>=clip.right||r.bottom<=clip.top||r.top>=clip.bottom)return false;
  k.stopMotion();
  this.root=this.doc.body.createDiv({cls:'tt-template-flight',attr:{'aria-hidden':'true'}});this.root.inert=true;
  const scene=this.root.createDiv({cls:'tt-template-picker tt-template-flight-scene'}),style=this.win.getComputedStyle(card);
  this.shell=card.cloneNode(true);for(const el of [this.shell,...this.shell.querySelectorAll('*')]){el.removeAttribute('id');el.removeAttribute('aria-labelledby');el.removeAttribute('data-tt-hint');}
  Object.assign(this.shell.style,{width:style.width,height:style.height,visibility:'visible',pointerEvents:'none',margin:'0'});
  if(k.gridMode){Object.assign(scene.style,rectStyle(r));Object.assign(this.shell.style,{position:'absolute',left:'0',top:'0',transform:'none'});scene.appendChild(this.shell);this.lift='translate3d(0,-18px,0) scale(1.03)';}
  else{
   const stageRect=k.stage.getBoundingClientRect(),g=k.fitGeometry(),pose=deckPose(k.cursor,k.position,g.step,k.motion.matches,g.cardWidth);
   Object.assign(scene.style,rectStyle(stageRect));const stage=scene.createDiv({cls:'tt-template-deck tt-template-flight-stage'});stage.appendChild(this.shell);
   this.lift=`translate3d(calc(-50% + ${pose.x}px),calc(-50% + ${pose.y-18}px),16px) rotateY(0deg) rotateZ(0deg) scale(1.03)`;
  }
  this.preview=this.shell.querySelector('.tt-template-picker-art>svg');
  // Keep the existing deck DOM for its exit, rather than cloning every SVG.
  this.background=this.root.createDiv({cls:'tt-template-picker tt-template-flight-background'});Object.assign(this.background.style,rectStyle(clip));
  this.retained=k.gridMode?k.grid:k.viewport;Object.assign(this.retained.style,{width:'100%',height:'100%',margin:'0',minHeight:'0'});this.background.appendChild(this.retained);card.addClass('tt-template-flight-hidden');
  (this.plugin.templateFlights??=new Set()).add(this);return true;
 }
 play(element,frames,options){const animation=element.animate(frames,{easing,fill:'forwards',...options});this.animations.push(animation);return animation;}
 start(target){
  if(this.done||!target?.board?.isConnected||target.contentEl.ownerDocument!==this.doc){this.cancel();return;}
  this.target=target;target.templateTransition=this;target.modalEl.addClass('tt-template-arriving');target.modalEl.inert=true;
  this.resize=()=>this.finish();this.win.addEventListener('resize',this.resize);
  this.motion=this.win.matchMedia('(prefers-reduced-motion: reduce)');this.motionChanged=()=>{if(this.motion.matches)this.finish();};this.motion.addEventListener('change',this.motionChanged);
  this.timer=this.win.setTimeout(()=>this.finish(),900);
  try{
   this.play(this.background,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.97)'}],{duration:160});
   this.play(target.modalEl,[{opacity:0},{opacity:1}],{duration:220,delay:150});
   this.play(this.shell,[{transform:this.shell.style.transform},{transform:this.lift}],{duration:90}).finished.then(()=>{if(!this.done)this.land();}).catch(()=>{if(!this.done)this.finish();});
  }catch{this.finish();}
 }
 land(){
  if(!this.target?.board?.isConnected||this.plugin.stopped){this.cancel();return;}
  try{
   const first=editableFields(this.target.template)[0];[...this.target.board.querySelectorAll('[data-node-field-id]')].find(el=>el.dataset.nodeFieldId===String(first?.id))?.scrollIntoView({block:'nearest'});
   const fresh=this.target.art.querySelector('svg'),viewBox=this.preview.viewBox.baseVal,targetBox=fresh?.viewBox.baseVal;
   if(!targetBox||Math.abs(viewBox.width/viewBox.height-targetBox.width/targetBox.height)>.01){this.finish();return;}
   const from=containRect(this.preview.getBoundingClientRect(),viewBox.width,viewBox.height),to=containRect(fresh.getBoundingClientRect(),targetBox.width,targetBox.height);
   if(!usable(from)||!usable(to)||to.width>this.win.innerWidth*2||to.height>this.win.innerHeight*2){this.finish();return;}
   this.from=from;this.to=to;
   this.sprite=this.root.createDiv({cls:'tt-template-flight-card'});Object.assign(this.sprite.style,{width:from.width+'px',height:from.height+'px',transform:flightFrames(from,to)[0].transform});
   this.sprite.appendChild(this.preview.cloneNode(true));const destination=fresh.cloneNode(true);destination.addClass('tt-template-flight-new');this.sprite.appendChild(destination);this.preview.addClass('tt-template-flight-hidden');
   this.play(this.shell,[{opacity:1},{opacity:0}],{duration:130});this.play(destination,[{opacity:0},{opacity:1}],{duration:100,delay:180});
   this.play(this.sprite,flightFrames(from,to),{duration:310}).finished.then(()=>this.finish()).catch(()=>{if(!this.done)this.finish();});
  }catch{this.finish();}
 }
 finish(){this.dispose(true);}
 cancel(){this.dispose(false);}
 dispose(focus){
  if(this.done)return;this.done=true;this.win.clearTimeout(this.timer);for(const animation of this.animations)animation.cancel();this.animations=[];
  this.win.removeEventListener('resize',this.resize);this.motion?.removeEventListener('change',this.motionChanged);this.root?.remove();this.plugin.templateFlights?.delete(this);
  const target=this.target;if(target?.templateTransition===this){target.templateTransition=null;target.modalEl.inert=false;target.modalEl.removeClass('tt-template-arriving');if(focus&&target.contentEl.isConnected&&!this.plugin.stopped)target.focusField(editableFields(target.template)[0]?.id);}
  this.picker=null;this.retained=null;this.shell=null;this.preview=null;this.sprite=null;this.background=null;this.root=null;this.target=null;
 }
}
export function captureTemplateFlight(picker){
 const flight=new TemplateFlight(picker);try{if(flight.capture())return flight;}catch{/* An unavailable visual transition must not block template confirmation. */}flight.cancel();return null;
}
