import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const allowed=new Map([['/','index.html'],['/index.html','index.html']]);
const port=Number(process.env.PORT||8766);
createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'local_only'}));return;}const file=allowed.get(path);if(!file){res.writeHead(404);res.end('Not found');return;}try{const bytes=await readFile(new URL('../dist-public/'+file,import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(503);res.end('Run npm run build first.');}}).listen(port,'127.0.0.1',()=>console.log(`Local learning tool: http://127.0.0.1:${port}`));
