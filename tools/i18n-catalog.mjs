import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
import {JSDOM} from 'jsdom';
import collectSources from '../source-manifest.cjs';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const normalize=text=>text.replace(/\s+/g,' ').trim();
const korean=/[\uac00-\ud7af]/;
const attributes=['title','alt','aria-label','aria-valuetext','placeholder'];
export async function extractCatalog(){
 const found=new Map();
 const add=(value,file,line)=>{
  value=normalize(value);if(!korean.test(value))return;
  let n=0;const slots=new Map();
  value=value.replace(/\{\{\d+\}\}/g,slot=>{if(!slots.has(slot))slots.set(slot,`{{${n++}}}`);return slots.get(slot);});
  if(!found.has(value))found.set(value,[]);
  const refs=found.get(value),ref=`${file}:${line}`;if(!refs.includes(ref))refs.push(ref);
 };
 const parts=(value,file,line)=>{
  if(!korean.test(value))return;
  if(!/<\/?[a-zA-Z][\w-]*(?:[\s>])/.test(value)){add(value,file,line);return;}
  const fragment=JSDOM.fragment(value);
  const walk=node=>{
   if(node.nodeType===3)add(node.nodeValue,file,line);
   if(node.nodeType===1){for(const attr of attributes)if(node.hasAttribute(attr))add(node.getAttribute(attr),file,line);}
   for(const child of node.childNodes)walk(child);
  };walk(fragment);
 };
 const files=collectSources(root,{publicBuild:true}).scriptFiles.filter(f=>!/^i18n/.test(f));
 for(const file of files){
  const source=await readFile(path.join(root,'src',file),'utf8');
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
  const walk=node=>{
   if(!node||typeof node!=='object')return;
   if(node.type==='Literal'&&typeof node.value==='string')parts(node.value,'src/'+file,node.loc.start.line);
   if(node.type==='TemplateLiteral')parts(node.quasis.map((q,i)=>(q.value.cooked??q.value.raw)+(i<node.expressions.length?`{{${i}}}`:'')).join(''),'src/'+file,node.loc.start.line);
   for(const [key,value] of Object.entries(node))if(!['loc','start','end'].includes(key)){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
  };walk(ast);
 }
 parts(await readFile(path.join(root,'src/shell.html'),'utf8'),'src/shell.html',1);
 return Object.fromEntries([...found].sort(([a],[b])=>a.localeCompare(b,'ko')));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const catalog=await extractCatalog();
 const output=process.argv[2]||path.join(root,'locales/source.json');
 await mkdir(path.dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify(catalog,null,2)+'\n');
 console.log(`${Object.keys(catalog).length} source messages → ${output}`);
}
