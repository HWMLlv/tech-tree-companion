import {parseLink} from './sections.js';
// A legacy node has no title provenance: only replace empty, placeholder, or matching titles.
export function titleForRelink(current,previous,next){const title=String(current??'').trim();return !title||['未命名科技','Untitled technology'].includes(title)||(previous&&title===previous.trim())?next:current;}
export function titleFromLink(link){const ref=parseLink(link);if(!ref)return '';return ref.heading??ref.path.split('/').at(-1).replace(/\.md$/i,'');}
