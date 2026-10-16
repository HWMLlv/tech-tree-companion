import {isTech} from './model.js';

export class NodeTargets{
 constructor(){this.targets=new Map();this.entries=new Map();this.serial=0;}
 sync(elements,resolve,revision,sourcePath){
  const seen=++this.serial;
  for(const e of elements){
   if(e.isDeleted||!isTech(e)||!e.link)continue;
   const previous=this.entries.get(e.id);
   if(previous)previous.seen=seen;
   if(previous?.link===e.link&&previous.revision===revision&&previous.sourcePath===sourcePath)continue;
   let file;try{file=resolve(e.link);}catch{/* Broken links remain unresolved until metadata or the link changes. */}
   this.entries.set(e.id,{link:e.link,revision,sourcePath,seen});
   if(file)this.targets.set(e.id,file);else this.targets.delete(e.id);
  }
  for(const [id,entry]of this.entries)if(entry.seen!==seen){this.entries.delete(id);this.targets.delete(id);}
 }
}
