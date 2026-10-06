import MarkdownIt from 'markdown-it';
const parser=new MarkdownIt({html:false});
export class Conflict extends Error{}
export function documentInfo(text){
 const offsets=[0];for(let i=0;i<text.length;i++)if(text[i]==='\n')offsets.push(i+1);
 const lines=text.split(/\r?\n/);let bodyStart=0,frontLines=0;
 if(lines[0]?.replace(/^\uFEFF/,'')==='---'){
  const end=lines.findIndex((s,i)=>i>0&&(s==='---'||s==='...'));
  if(end<0)throw new Conflict('文档属性区未闭合，暂不编辑正文');
  frontLines=end+1;bodyStart=offsets[frontLines]??text.length;
 }
 const body=text.slice(bodyStart),tokens=parser.parse(body,{}),headings=[];
 for(let i=0;i<tokens.length;i++)if(tokens[i].type==='heading_open'){
  const token=tokens[i],inline=tokens[i+1],heading=(inline?.children??[]).filter(c=>['text','code_inline','image'].includes(c.type)).map(c=>c.content).join('')||inline?.content||'';
  headings.push({heading,level:Number(token.tag.slice(1)),start:offsets[token.map[0]+frontLines]??text.length,bodyStart:offsets[token.map[1]+frontLines]??text.length});
 }
 return {bodyStart,headings,eol:text.includes('\r\n')?'\r\n':'\n'};
}
const norm=s=>s.normalize('NFKC').toLocaleLowerCase().trim();
export function sectionRange(text,heading=null){
 const info=documentInfo(text);
 if(heading===null)return {start:info.bodyStart,end:text.length,body:text.slice(info.bodyStart),...info};
 const matches=info.headings.filter(h=>norm(h.heading)===norm(heading));
 if(matches.length!==1)throw new Conflict(matches.length?'小标题不唯一，请重新关联':'小标题已改名或删除，请重新关联');
 const h=matches[0],next=info.headings.find(n=>n.start>h.start&&n.level<=h.level),end=next?.start??text.length;
 return {...info,start:h.bodyStart,end,body:text.slice(h.bodyStart,end),level:h.level};
}
export function replaceSection(text,heading,baseline,draft){
 const range=sectionRange(text,heading);
 if(range.body!==baseline)throw new Conflict('原文章节已被其他编辑修改，草稿已保留');
 let content=draft.replace(/\r\n?/g,'\n').replace(/\n/g,range.eol);
 if(heading!==null&&parser.parse(content,{}).some(t=>t.type==='heading_open'&&Number(t.tag.slice(1))<=range.level))throw new Conflict('正文包含同级或更高级标题，请改为子标题后保存');
 // An unterminated fence would absorb the following peer heading on reopen.
 if(heading!==null&&range.end<text.length){
  const toks=parser.parse(content,{}),last=toks.at(-1);
  if(last?.type==='fence'){
   const raw=content.split(/\r?\n/).slice(last.map[0],last.map[1]);
   const marker=last.markup[0],count=last.markup.length;
   if(raw.length<2||!new RegExp('^ {0,3}'+(marker==='`'?'`':'~')+'{'+count+',}\\s*$').test(raw.at(-1)))throw new Conflict('代码围栏未闭合，暂不写回以保护后续章节');
  }
 }
 if(heading!==null&&range.end<text.length&&content&&!content.endsWith(range.eol))content+=range.eol;
 const prefix=text.slice(0,range.start),separator=prefix&&content&&!prefix.endsWith('\n')?range.eol:'';
 return {text:prefix+separator+content+text.slice(range.end),body:content};
}
export function parseLink(link){const m=/^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/.exec(link??'');if(!m)return null;const i=m[1].indexOf('#');return i<0?{path:m[1],heading:null}:{path:m[1].slice(0,i),heading:m[1].slice(i+1)};}
export const safeLinkPart=s=>!['[',']','#','|','^','\r','\n'].some(c=>String(s).includes(c));
