export const PREVIEW_CACHE_LIMIT=64;

// Keep recently used, sanitized SVG prototypes; live cards own their clones.
export function reusePreview(cache,id,create,limit=PREVIEW_CACHE_LIMIT){
 let svg=cache.get(id);
 if(svg){cache.delete(id);cache.set(id,svg);return svg;}
 svg=create();cache.set(id,svg);
 while(cache.size>limit)cache.delete(cache.keys().next().value);
 return svg;
}
