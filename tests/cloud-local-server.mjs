// Integration fixture ONLY. Bound to loopback; never imported by the deployed Worker.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createWorker} from '../cloud/worker.mjs';
const origin='https://learning-fixture.example',db=new DatabaseSync(':memory:');for(const filename of ['0001_workspace.sql','0002_workspace_chunks.sql'])db.exec(readFileSync(new URL('../cloud/migrations/'+filename,import.meta.url),'utf8'));
const DB={prepare(sql){return {bind(...args){return {sql,args};}};},async batch(items){db.exec('BEGIN IMMEDIATE');try{const results=items.map(item=>{const statement=db.prepare(item.sql);return statement.columns().length?{results:statement.all(...item.args),meta:{changes:0}}:{results:[],meta:{changes:statement.run(...item.args).changes}};});db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}};

const env={CF_ACCESS_TEAM_DOMAIN:'https://fixture.cloudflareaccess.com',CF_ACCESS_AUD:'fixture',ALLOWED_EMAILS:'fixture@example.com',APP_ORIGIN:origin,DB,ASSETS:{async fetch(){return new Response(readFileSync(new URL('../dist/index.html',import.meta.url)),{headers:{'Content-Type':'text/html'}});}}};
const worker=createWorker({authenticate:async()=>({id:'fixture-user',email:'fixture@example.com',origin})});
createServer(async(req,res)=>{try{const parts=[];for await(const part of req)parts.push(part);const headers=new Headers(req.headers);if(headers.has('origin'))headers.set('origin',origin);const request=new Request(origin+req.url,{method:req.method,headers,...(parts.length?{body:Buffer.concat(parts)}:{})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('test fixture error');}}).listen(8768,'127.0.0.1',()=>console.log('Local integration fixture at http://127.0.0.1:8768; no production account/data.'));
