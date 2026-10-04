const fs=require('node:fs'),path=require('node:path');
/* A work-in-progress lab is not part of the served app until it is registered. */
module.exports=function collectSources(projectRoot,{publicBuild=false}={}){
 const src=path.join(projectRoot,'src'),files=fs.readdirSync(src),read=f=>fs.readFileSync(path.join(src,f),'utf8');
 const registryFile='lab-registry.js',registry=read(registryFile);
 const requested=[...registry.matchAll(/typeof\s+(\w+Labs)\s*===/g)].map(m=>m[1]);
 const declarations=new Map();
 const labFiles=fs.readdirSync(path.join(src,'labs')).filter(f=>f.endsWith('.js')).sort().map(f=>'labs/'+f).filter(f=>{
  const names=[...read(f).matchAll(/\bconst\s+(\w+Labs)\s*=/g)].map(m=>m[1]);
  for(const name of names)if(requested.includes(name)){if(declarations.has(name))throw new Error(`Duplicate lab namespace: ${name}`);declarations.set(name,f);}
  return names.some(n=>requested.includes(n));
 });
 for(const name of requested)if(!declarations.has(name))throw new Error(`Registered lab has no source: ${name}`);
 const excluded=publicBuild?['app.js',registryFile,'learning-cloud.js','cloud-sync.js']:['app.js',registryFile,'learning-public.js'];
 const viewFiles=files.filter(f=>f.endsWith('.js')&&!excluded.includes(f)).sort();
 const engines=files.filter(f=>f.endsWith('.mjs')).sort().map(file=>({file,code:read(file)})).map(e=>({...e,names:[...e.code.matchAll(/^export\s+(?:const|class|function)\s+(\w+)/gm)].map(m=>m[1])}));
 const included=new Set();let text=[...viewFiles,...labFiles,'app.js'].map(read).join('\n'),changed=true;
 while(changed){changed=false;for(const engine of engines)if(!included.has(engine.file)&&engine.names.some(n=>new RegExp(`\\b${n}\\b`).test(text))){included.add(engine.file);text+='\n'+engine.code;changed=true;}}
 const engineFiles=engines.filter(e=>included.has(e.file)).map(e=>e.file);
 return {src,engineFiles,viewFiles,labFiles,registryFile,scriptFiles:[...engineFiles,...viewFiles,...labFiles,registryFile,'app.js']};
};
