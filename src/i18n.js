/* Presentation-only localization. Calculation objects and saved files stay canonical. */
const GeotechI18n=(()=>{
 const catalogue=typeof GEOTECH_EN_MESSAGES==='undefined'?{}:GEOTECH_EN_MESSAGES;
 const normalize=value=>String(value??'').replace(/\s+/g,' ').trim();
 const korean=/[\uac00-\ud7af]/;
 const escapeRx=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const patterns=Object.entries(catalogue).filter(([key])=>/\{\{\d+\}\}/.test(key)).map(([key,value])=>{
  const slots=[];let cursor=0,expression='^';
  for(const match of key.matchAll(/\{\{(\d+)\}\}/g)){expression+=escapeRx(key.slice(cursor,match.index)).replace(/\s+/g,'\\s*')+'([\\s\\S]*?)';slots.push(match[1]);cursor=match.index+match[0].length;}
  expression+=escapeRx(key.slice(cursor)).replace(/\s+/g,'\\s*')+'$';
  return {key,value,slots,regex:new RegExp(expression),weight:key.replace(/\{\{\d+\}\}/g,'').length};
 }).sort((a,b)=>b.weight-a.weight);
 const missing=new Set(),cache=new Map(),originals=new WeakMap();
 let language='ko',doc=null,observer=null;
 function translate(value,depth=0){
  const text=normalize(value);if(!korean.test(text)||depth>8)return text;
  if(cache.has(text))return cache.get(text);
  if(Object.hasOwn(catalogue,text))return catalogue[text];
  // Translate complete sentences or explicitly separated labels, never substrings inside words.
  for(const separator of [/(?<=[.!?])\s+(?=[^\d])/, / \u00b7 /]){
   const parts=text.split(separator);
   if(parts.length>1){const output=parts.map(part=>translate(part,depth+1)).join(separator.source.includes('00b7')?' · ':' ');if(!korean.test(output)){cache.set(text,output);return output;}}
  }
  for(const pattern of patterns){
   const match=pattern.regex.exec(text);if(!match)continue;
   const slots={};pattern.slots.forEach((slot,i)=>{slots[slot]=translate(match[i+1],depth+1);});
   const output=pattern.value.replace(/\{\{(\d+)\}\}/g,(token,slot)=>slots[slot]??token);
   if(!korean.test(output)){cache.set(text,output);return output;}
  }
  // Unknown text stays visible and is reported by coverage tests.
  const output=text;
  if(korean.test(output)&&depth===0)missing.add(text);else cache.set(text,output);
  return output;
 }
 function record(node,key,current){
  let map=originals.get(node);if(!map){map=new Map();originals.set(node,map);}
  let saved=map.get(key);
  if(!saved||current!==saved.rendered){saved={source:current,rendered:current};map.set(key,saved);}
  return saved;
 }
 function visit(node){
  if(node.nodeType===3){
   const saved=record(node,'text',node.nodeValue);
   const output=language==='en'?saved.source.replace(/\S[\s\S]*\S|\S/,part=>translate(part)):saved.source;
   if(node.nodeValue!==output)node.nodeValue=output;saved.rendered=output;return;
  }
  if(node.nodeType!==1&&node.nodeType!==9&&node.nodeType!==11)return;
  if(node.nodeType===1){
   if(node.matches('script,style,textarea,[translate="no"],[data-no-translate]'))return;
   // An option without an explicit value otherwise derives its data value from its label.
   if(node.tagName==='OPTION'&&!node.hasAttribute('value'))node.setAttribute('value',node.value);
   for(const name of ['title','alt','aria-label','aria-valuetext','placeholder']){
    if(!node.hasAttribute(name))continue;
    const saved=record(node,name,node.getAttribute(name)),output=language==='en'?translate(saved.source):saved.source;
    if(node.getAttribute(name)!==output)node.setAttribute(name,output);saved.rendered=output;
   }
  }
  for(const child of [...node.childNodes])visit(child);
 }
 function observe(){observer?.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','alt','aria-label','aria-valuetext','placeholder']});}
 function refresh(root=doc){
  if(!root)return;observer?.disconnect();visit(root);if(doc){doc.documentElement.lang=language;for(const el of doc.querySelectorAll('.app-header,#lab-workspace,#worksheet-root'))el.lang=language;}observe();
 }
 function setLanguage(next){if(!['en','ko'].includes(next))return;language=next;missing.clear();refresh();}
 function sourceText(node){if(!node)return '';if(node.nodeType===3)return originals.get(node)?.get('text')?.source??node.nodeValue;return [...node.childNodes].map(sourceText).join('');}
 function install(documentObject){
  doc=documentObject;observer=new MutationObserver(records=>{observer.disconnect();const roots=new Set();for(const item of records){if(item.type==='childList'){for(const node of item.addedNodes)roots.add(node);}else roots.add(item.target);}for(const root of roots)if(root.isConnected)visit(root);observe();});
  observe();refresh();return api;
 }
 function html(markup){if(language!=='en'||!doc)return markup;const template=doc.createElement('template');template.innerHTML=markup;visit(template.content);return template.innerHTML;}
 const api={translate,t:value=>language==='en'?translate(value):String(value??''),setLanguage,refresh,install,sourceText,html,get language(){return language;},missing:()=>[...missing],clearMissing:()=>missing.clear()};
 return api;
})();
