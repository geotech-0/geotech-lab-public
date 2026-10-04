import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import collectSources from '../../source-manifest.cjs';
import {evidenceAssetPolicy} from '../../build-asset-policy.mjs';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function appDOM({language='ko',saved={}}={}){
 const shell=readFileSync(path.join(root,'src/shell.html'),'utf8');
 const dom=new JSDOM(shell,{url:'http://localhost/',pretendToBeVisual:true,runScripts:'outside-only'}),window=dom.window;
 const observers=[];const Observer=window.MutationObserver;window.MutationObserver=class extends Observer{constructor(callback){super(callback);observers.push(this);}};
 window.structuredClone=structuredClone;
 window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 window.scrollTo=()=>{};
 window.ResizeObserver=class{observe(){}disconnect(){}};
 window.CSS={escape:value=>String(value).replace(/[^a-zA-Z0-9_-]/g,char=>'\\'+char)};
 window.HTMLElement.prototype.scrollIntoView=()=>{};
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 window.URL.createObjectURL=()=> 'blob:unit-test';window.URL.revokeObjectURL=()=>{};
 window.localStorage.setItem('geotech-lab-intro-language-v1',language);
 for(const [key,value] of Object.entries(saved))window.localStorage.setItem(key,value);
 const files=collectSources(root,{publicBuild:true}).scriptFiles;
 const source=files.map(file=>readFileSync(path.join(root,'src',file),'utf8').replace(/^export /gm,'')).join('\n');
 const context=dom.getInternalVMContext();
 const messages=JSON.parse(readFileSync(path.join(root,'locales/en.json'),'utf8'));
 new vm.Script('const GEOTECH_EN_MESSAGES='+JSON.stringify(messages)+';const EVIDENCE_ASSET_POLICY='+JSON.stringify(evidenceAssetPolicy({publicBuild:true}))+';\n'+source).runInContext(context);
 return {dom,window,document:window.document,run:code=>vm.runInContext(code,context),close:()=>{observers.forEach(observer=>observer.disconnect());window.close();}};
}

export function untranslated(document){
 const result=[];
 const visit=node=>{
  if(node.nodeType===1&&node.matches('script,style,textarea,[translate="no"],[data-no-translate]'))return;
  if(node.nodeType===3&&/[\uac00-\ud7af]/.test(node.nodeValue))result.push(node.nodeValue.trim());
  if(node.nodeType===1)for(const attr of ['title','alt','aria-label','aria-valuetext','placeholder']){const value=node.getAttribute(attr);if(value&&/[\uac00-\ud7af]/.test(value))result.push(value);}
  for(const child of node.childNodes)visit(child);
 };visit(document.body);return [...new Set(result)];
}
