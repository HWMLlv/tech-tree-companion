export function containRect(rect,width,height){
 const scale=Math.min(rect.width/width,rect.height/height),w=width*scale,h=height*scale;
 return {left:rect.left+(rect.width-w)/2,top:rect.top+(rect.height-h)/2,width:w,height:h};
}
export function flightFrames(from,to){
 const scale=to.width/from.width,dx=to.left-from.left,dy=to.top-from.top;
 return [
  {transform:`translate3d(${from.left}px,${from.top}px,0) scale(1)`,offset:0},
  {transform:`translate3d(${from.left+dx*.4}px,${from.top+dy*.4-18}px,0) scale(${1+(scale-1)*.4})`,offset:.4},
  {transform:`translate3d(${to.left}px,${to.top}px,0) scale(${scale})`,offset:1}
 ];
}
