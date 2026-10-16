const servers=new WeakMap();

// Excalidraw may share one hook server across drawings. Keep existing hooks and
// remove only our own dispatcher after the last participating drawing exits.
export function guardRelationLinks(server,nav){
 if(!server)return ()=>{};
 let entry=servers.get(server);
 if(!entry||server.onLinkClickHook!==entry.dispatch){
  entry={previous:server.onLinkClickHook,own:Object.hasOwn(server,'onLinkClickHook'),views:new Set()};
  entry.dispatch=function(element,link,event,view,...rest){
   for(const current of entry.views)if(current.v===view&&current.valid()&&current.readingRelations()&&current.relationNode(element))return false;
   return typeof entry.previous==='function'?entry.previous.call(this,element,link,event,view,...rest):true;
  };
  servers.set(server,entry);server.onLinkClickHook=entry.dispatch;
 }
 entry.views.add(nav);
 return ()=>{
  entry.views.delete(nav);if(entry.views.size)return;
  if(server.onLinkClickHook===entry.dispatch){if(entry.own)server.onLinkClickHook=entry.previous;else delete server.onLinkClickHook;}
  if(servers.get(server)===entry)servers.delete(server);
 };
}
