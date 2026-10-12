export const viewSnapshot=s=>({scrollX:s.scrollX,scrollY:s.scrollY,zoom:{value:s.zoom.value}});
export function viewMoved(a,b){return Math.hypot((a.scrollX-b.scrollX)*b.zoom.value,(a.scrollY-b.scrollY)*b.zoom.value)>=6||Math.abs(Math.log(a.zoom.value/b.zoom.value))>=.015;}
// Consecutive scroll notifications form one operation; callers settle after idle/pointer-up.
export class ViewHistory{
 constructor(state){this.anchor=viewSnapshot(state);this.last=viewSnapshot(state);this.items=[];this.active=false;}
 observe(state){const next=viewSnapshot(state);if(!this.active&&viewMoved(this.anchor,next)){this.push(this.anchor);this.active=true;}this.last=next;}
 push(state){const next=viewSnapshot(state);if(JSON.stringify(this.items.at(-1))!==JSON.stringify(next)){this.items.push(next);if(this.items.length>30)this.items.shift();}}
 settle(){this.anchor=this.last;this.active=false;}
 remember(state){this.settle();this.push(state);}
 moved(state){this.last=viewSnapshot(state);this.settle();}
 back(){this.settle();const previous=this.items.pop();if(previous)this.moved(previous);return previous;}
}
