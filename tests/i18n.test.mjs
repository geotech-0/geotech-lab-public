import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {appDOM,untranslated,root} from './helpers/app-dom.mjs';
import {extractCatalog} from '../tools/i18n-catalog.mjs';

test('English catalogue covers every extracted source message and preserves dynamic slots',async()=>{
 const source=await extractCatalog(),en=JSON.parse(await readFile(path.join(root,'locales/en.json'),'utf8'));
 for(const key of Object.keys(source))assert.ok(Object.hasOwn(en,key),`Missing translation: ${key}`);
 const slots=value=>[...value.matchAll(/\{\{\d+\}\}/g)].map(m=>m[0]).sort();
 for(const [key,value] of Object.entries(en)){assert.equal(/[가-힣]/.test(value),false,key);assert.deepEqual(slots(value),slots(key),key);}
});
test('all 40 modules, every question, and worksheet translate without changing calculation state',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'geotech-i18n-'));
 try{const output=path.join(dir,'audit.json');execFileSync(process.execPath,['tools/i18n-audit.mjs',output],{cwd:root});const report=JSON.parse(await readFile(output));assert.equal(report.length,41);for(const module of report)for(const variant of module.variants){assert.deepEqual(variant.untranslated,[],`${module.key}/${variant.question}`);if(module.key!=='worksheet')assert.equal(variant.stateAndCalculationUnchanged,true);}}
 finally{await rm(dir,{recursive:true,force:true});}
});
test('select variants and empty numeric validation preserve Korean and calculation state',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'geotech-i18n-'));
 try{const output=path.join(dir,'variants.json');execFileSync(process.execPath,['tools/i18n-variants.mjs',output],{cwd:root});const report=JSON.parse(await readFile(output));assert.ok(report.length>=600);for(const variant of report){assert.deepEqual(variant.untranslated,[],`${variant.key}/${variant.question}/${variant.variant}`);assert.equal(variant.stateUnchanged,true);assert.equal(variant.koreanRestored,true);}}
 finally{await rm(dir,{recursive:true,force:true});}
});
test('language survives reload, dynamic changes translate, and option values remain canonical',async()=>{
 const app=appDOM();try{
 const ko=app.document.getElementById('main').innerHTML;
 const before=app.run('JSON.stringify(state)');
 app.document.querySelector('[data-visitor-language="en"]').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(app.document.documentElement.lang,'en');assert.deepEqual(untranslated(app.document),[]);assert.equal(app.run('JSON.stringify(state)'),before);
 app.document.querySelector('[data-visitor-language="ko"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(app.document.getElementById('main').innerHTML,ko);
 const node=app.document.createElement('select');node.innerHTML='<option>모래</option>';app.document.body.append(node);await new Promise(r=>setTimeout(r,0));app.run("GeotechI18n.setLanguage('en')");assert.equal(node.value,'모래');assert.equal(node.options[0].textContent,'Sand');
 app.document.querySelector('[data-visitor-language="en"]').click();const saved=Object.fromEntries(Object.keys(app.window.localStorage).map(key=>[key,app.window.localStorage.getItem(key)]));const reloaded=appDOM({saved});try{assert.equal(reloaded.document.documentElement.lang,'en');}finally{reloaded.close();}
 }finally{app.close();}
});
