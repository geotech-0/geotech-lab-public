// At most 128 Ki UTF-16 code units => at most 512 KiB UTF-8 per D1 value.
// Never cut a surrogate pair. Plain text avoids base64 size/CPU overhead.
export const CHUNK_UNITS=128*1024;
export function encodeChunks(text){const chunks=[];for(let offset=0;offset<text.length;){let end=Math.min(text.length,offset+CHUNK_UNITS);const tail=text.charCodeAt(end-1);if(end<text.length&&tail>=0xd800&&tail<=0xdbff)end--;chunks.push(text.slice(offset,end));offset=end;}return chunks;}
export function decodeChunks(chunks){return chunks.join('');}
