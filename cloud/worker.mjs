import { verifyAccess,accessConfig } from './auth.mjs';
import { encodeChunks,decodeChunks } from './chunks.mjs';
import { WorkspaceFiles } from '../src/workspace-files.mjs';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const readState=async(db,user)=>{
 // A batch is a transaction: the metadata and its chunks cannot cross revisions.
 const result=await db.batch([
  db.prepare('SELECT revision, records, updated_at, version_id, chunk_count FROM workspaces WHERE user_id = ?').bind(user),
  db.prepare('SELECT c.payload FROM workspace_chunks c JOIN workspaces w ON c.user_id = w.user_id AND c.version_id = w.version_id WHERE w.user_id = ? ORDER BY c.chunk_index').bind(user)
 ]);
 const row=result[0].results[0];if(!row)return {revision:0,records:null,updatedAt:null};
 if(row.version_id&&result[1].results.length!==row.chunk_count)throw new Error('Incomplete workspace');
 const text=row.version_id?decodeChunks(result[1].results.map(chunk=>chunk.payload)):row.records;
 return {revision:row.revision,records:JSON.parse(text),updatedAt:row.updated_at};
};
async function limitedJSON(request){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw Object.assign(new Error('JSON required'),{status:415});
 if(Number(request.headers.get('content-length'))>WorkspaceFiles.cloudMaxBytes)throw Object.assign(new Error('too large'),{status:413});
 const reader=request.body?.getReader();if(!reader)throw new Error('body missing');const parts=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>WorkspaceFiles.cloudMaxBytes){await reader.cancel();throw Object.assign(new Error('too large'),{status:413});}parts.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export function createWorker({authenticate=verifyAccess}={}){return {async fetch(request,env){
 let user;try{accessConfig(env);user=await authenticate(request,env);}catch{return json({error:'authentication_required'},403);}
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/')){
  if(!env.DB)return json({error:'storage_unavailable'},503);
  try{
   if(path==='/api/workspace'&&request.method==='GET')return json({user:{id:user.id,email:user.email},...await readState(env.DB,user.id)});
   if(path==='/api/workspace'&&request.method==='PUT'){
    if(request.headers.get('origin')!==user.origin||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-geotech-client')!=='workspace-v1')return json({error:'origin_rejected'},403);
    if(request.headers.get('x-geotech-account')!==user.id)return json({error:'account_changed'},409);
    let body;try{body=await limitedJSON(request);if(!body||Object.keys(body).sort().join(',')!=='records,revision'||!Number.isSafeInteger(body.revision)||body.revision<0)throw new Error('schema');WorkspaceFiles.inspectRecords(body.records);}catch(error){return json({error:error.status===413?'workspace_too_large':'invalid_workspace'},error.status||400);}
    const records=JSON.stringify(body.records),updatedAt=new Date().toISOString(),version=crypto.randomUUID();
    const statements=encodeChunks(records).map((payload,index)=>env.DB.prepare('INSERT INTO workspace_chunks (user_id, version_id, chunk_index, payload) VALUES (?, ?, ?, ?)').bind(user.id,version,index,payload));
    const switchIndex=statements.length;
    if(body.revision===0)statements.push(env.DB.prepare("INSERT INTO workspaces (user_id, revision, records, updated_at, version_id, chunk_count) VALUES (?, 1, '{}', ?, ?, ?) ON CONFLICT(user_id) DO NOTHING").bind(user.id,updatedAt,version,switchIndex));
    else statements.push(env.DB.prepare("UPDATE workspaces SET revision = revision + 1, records = '{}', updated_at = ?, version_id = ?, chunk_count = ? WHERE user_id = ? AND revision = ?").bind(updatedAt,version,switchIndex,user.id,body.revision));
    // The whole batch rolls back on failure. Losing CAS chunks and old successful
    // versions are removed inside the same transaction, never the current version.
    statements.push(env.DB.prepare('DELETE FROM workspace_chunks WHERE user_id = ? AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.user_id = workspace_chunks.user_id AND w.version_id = workspace_chunks.version_id)').bind(user.id));
    const result=await env.DB.batch(statements);
    if(result[switchIndex].meta.changes!==1)return json({error:'revision_conflict'},409);
    return json({revision:body.revision+1,updatedAt});
   }
   return json({error:'not_found'},404);
  }catch{return json({error:'storage_unavailable'},503);}
 }
 if(!['GET','HEAD'].includes(request.method))return json({error:'method_not_allowed'},405);
 if(!env.ASSETS)return json({error:'assets_unavailable'},503);
 const response=await env.ASSETS.fetch(request);const output=new Response(response.body,response);for(const [key,value]of Object.entries(headers))if(key!=='Content-Type')output.headers.set(key,value);return output;
}};}
export default createWorker();
