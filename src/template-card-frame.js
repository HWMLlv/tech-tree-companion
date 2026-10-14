const NS='http://www.w3.org/2000/svg';

export function engineeringFrame(button,template){
 const frame=button.createSpan({cls:'tt-engineering-frame',attr:{'aria-hidden':'true'}}),doc=button.ownerDocument;
 const svg=doc.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 280 340');svg.setAttribute('preserveAspectRatio','none');
 const path=(d,cls)=>{const el=doc.createElementNS(NS,'path');el.setAttribute('d',d);el.setAttribute('class',cls);svg.appendChild(el);};
 path('M8 30V16L16 8H66M214 8H264L272 16V30M272 310V324L264 332H214M66 332H16L8 324V310 M24 34V306H256V34 M24 40H256 M24 298H256','tt-engineering-outline');
 let ticks='';for(let i=0;i<33;i++){const y=42+i*8,length=i%4===0?8:4;ticks+=`M8 ${y}h${length}M272 ${y}h-${length}`;}
 for(let i=0;i<22;i++){const x=56+i*8,length=i%4===0?8:4;ticks+=`M${x} 332v-${length}`;}
 path(ticks,'tt-engineering-ticks');
 path('M16 20h12M22 14v12M252 20h12M258 14v12M16 320h12M22 314v12 M246 312h18M255 303v18','tt-engineering-datums');
 frame.appendChild(svg);
 for(const [axis,text]of [['a','A'],['b','B'],['c','C']])frame.createSpan({cls:'tt-engineering-axis tt-engineering-axis-'+axis,text});
 frame.createSpan({cls:'tt-engineering-revision',text:'R'+String(template.version).padStart(2,'0')});
 frame.createSpan({cls:'tt-engineering-spec',text:`${template.width} × ${template.height}  /  G${String(template.grid).padStart(2,'0')}`});
}
