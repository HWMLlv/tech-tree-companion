// Preview-only SVG. Saved SVGs keep embedded fonts; previews use registered fonts.
// Rebuild an inert XML tree with a small allowlist instead of injecting markup.
const SVG_NS='http://www.w3.org/2000/svg';
const tags=new Set(['svg','g','defs','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','metadata']);
const attributes=new Set(['width','height','viewBox','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','transform','preserveAspectRatio','overflow','fill','stroke','color','opacity','fill-opacity','stroke-opacity','stroke-width','stroke-dasharray','stroke-dashoffset','stroke-linecap','stroke-linejoin','fill-rule','font-family','font-size','font-weight','text-anchor','aria-hidden']);
export function replaceSvg(container,source){
 if(typeof source!=='string'||/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('不支持的 SVG 内容');
 const doc=container.ownerDocument,parsed=new doc.defaultView.DOMParser().parseFromString(source,'image/svg+xml');
 if(parsed.querySelector('parsererror')||parsed.documentElement.localName!=='svg')throw Error('SVG 格式无效');
 const copy=node=>{
  if(node.nodeType===3)return doc.createTextNode(node.textContent);
  if(node.nodeType!==1)throw Error('不支持的 SVG 内容');
  if(node.localName==='style'&&!node.textContent.trim()&&!node.attributes.length)return null;
  if(!tags.has(node.localName)||(node.namespaceURI&&node.namespaceURI!==SVG_NS))throw Error('不支持的 SVG 元素');
  const element=doc.createElementNS(SVG_NS,node.localName);
  for(const attr of node.attributes){
   if(attr.name==='xmlns'&&attr.value===SVG_NS)continue;
   if(!attributes.has(attr.name)||attr.namespaceURI||/url\s*\(|(?:javascript|data):|:\/\//i.test(attr.value))throw Error('不支持的 SVG 属性');
   element.setAttribute(attr.name,attr.value);
  }
  for(const child of node.childNodes){const clean=copy(child);if(clean)element.appendChild(clean);}
  return element;
 };
 const svg=copy(parsed.documentElement);container.replaceChildren(svg);return svg;
}
