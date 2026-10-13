import en from './locales/en.json' with {type:'json'};
const sourceKeys=new Map(Object.entries(en).map(([key,value])=>[value,key]));
export const sourceKey=value=>sourceKeys.get(value)??value;

let language='zh';
export function resolveLanguage(preference,hostLanguage='en'){
 if(preference==='zh'||preference==='en')return preference;
 return /^zh(?:[-_]|$)/i.test(hostLanguage)?'zh':'en';
}
export function setLanguage(preference,hostLanguage){language=resolveLanguage(preference,hostLanguage);return language;}
export function getLanguage(){return language;}
// Only developer-owned strings enter this function. Interpolated user content
// is inserted once, without recursively translating it or interpreting markup.
export function tr(source,...values){
 if(Array.isArray(source)){
  const key=source.map((part,i)=>part+(i<values.length?'{'+i+'}':'')).join('');
  const message=language==='en'?(en[key]??key):key;
  return message.replace(/\{(\d+)\}/g,(match,index)=>index<values.length?String(values[index]):match);
 }
 return language==='en'?(en[source]??source):source;
}
