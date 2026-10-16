export const cardShape=t=>t?.shape??'rectangle';
export function containsShapePoint(shape,x,y,width,height){
 const dx=(x-width/2)/(width/2),dy=(y-height/2)/(height/2);
 if(shape==='ellipse')return dx*dx+dy*dy<=1+1e-7;
 if(shape==='diamond')return Math.abs(dx)+Math.abs(dy)<=1+1e-7;
 return x>=0&&y>=0&&x<=width&&y<=height;
}
export function containsModule(t,m){return [[m.x,m.y],[m.x+m.w,m.y],[m.x,m.y+m.h],[m.x+m.w,m.y+m.h]].every(([x,y])=>containsShapePoint(cardShape(t),x,y,t.width,t.height));}
export function curvedContour(shape,x,y,w,h,bow=0){
 const cx=x+w/2,cy=y+h/2,right=x+w,bottom=y+h;
 if(shape==='diamond')return `M ${cx} ${y} C ${cx+w/6} ${y+h/6+bow} ${right-w/6} ${cy-h/6+bow} ${right} ${cy} C ${right-w/6+bow} ${cy+h/6} ${cx+w/6+bow} ${bottom-h/6} ${cx} ${bottom} C ${cx-w/6} ${bottom-h/6-bow} ${x+w/6} ${cy+h/6-bow} ${x} ${cy} C ${x+w/6-bow} ${cy-h/6} ${cx-w/6-bow} ${y+h/6} ${cx} ${y} Z`;
 const k=.55228475,rx=w/2,ry=h/2;
 return `M ${cx} ${y} C ${cx+rx*k} ${y+bow} ${right} ${cy-ry*k} ${right} ${cy} C ${right-bow} ${cy+ry*k} ${cx+rx*k} ${bottom} ${cx} ${bottom} C ${cx-rx*k} ${bottom-bow} ${x} ${cy+ry*k} ${x} ${cy} C ${x+bow} ${cy-ry*k} ${cx-rx*k} ${y} ${cx} ${y} Z`;
}
