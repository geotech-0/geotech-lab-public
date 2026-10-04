import test from 'node:test';
import assert from 'node:assert/strict';
import {FoundationWorksheetFiles as Files} from '../src/worksheet-files.mjs';
import {FoundationWorksheet as Engine} from '../src/foundation-worksheet.mjs';
import {FoundationConditions} from '../src/foundation-conditions.mjs';
import {BearingExtensions} from '../src/bearing-extensions.mjs';

const example=()=>Engine.example();
const envelope=input=>({format:Files.format,version:Files.version,input});
const encode=input=>JSON.stringify(envelope(input));
const at=(object,path)=>path.split('.').reduce((o,k)=>o[k],object);
const put=(object,path,value)=>{const bits=path.split('.'),key=bits.pop();at(object,bits.join('.'))[key]=value;};
const numericPaths=[
 'geometry.width','geometry.length','geometry.embedment','geometry.thickness',
 'soil.gammaSoil','soil.gammaSat','soil.gammaConcrete','soil.waterDepth','soil.gammaBearing','soil.phi','soil.cohesion',
 'requiredFS','combinations.0.columnLoad','combinations.0.moment','settlement.adoptedSettlementMm','settlement.limitMm'
];
const assign=(object,path,value)=>path.includes('.')?put(object,path,value):(object[path]=value);
const shapePaths=['','meta','geometry','soil','combinations.0','settlement'];

// These tests intentionally distinguish file shape from model validity: unfinished drafts may save.
test('exact envelope and input survive a current-engine example round trip',()=>{
 const input=example(),serialized=Files.serialize(input),record=JSON.parse(serialized);
 assert.deepEqual(Object.keys(record).sort(),['format','input','version']);
 assert.equal(record.format,'soil-sense-foundation-worksheet');assert.equal(record.version,1);
 assert.deepEqual(Files.parse(serialized),input);
 assert.equal(Engine.evaluate(Files.parse(serialized),{FoundationConditions,BearingExtensions}).valid,true);
});
test('inspect and parse return isolated deep copies; subsequent edits do not alias the original',()=>{
 const original=example(),originalText=JSON.stringify(original),inspected=Files.inspect(original),parsed=Files.parse(Files.serialize(original));
 inspected.meta.project='changed';inspected.combinations[0].columnLoad=99;
 parsed.geometry.width=42;parsed.combinations.push({...parsed.combinations[0],id:'second'});
 assert.equal(JSON.stringify(original),originalText);
});
test('all null numeric fields are preserved in a restorable draft, not silently filled or calculated',()=>{
 const input=example();for(const path of numericPaths)assign(input,path,null);
 const output=Files.parse(Files.serialize(input));assert.deepEqual(output,input);
 assert.equal(Engine.evaluate(output,{FoundationConditions,BearingExtensions}).valid,false);
});
test('finite negative and out-of-model numeric drafts remain editable through round trip',()=>{
 const input=example();input.geometry.width=-3;input.soil.phi=99;input.requiredFS=1;input.combinations[0].columnLoad=-7;
 const output=Files.parse(Files.serialize(input));assert.deepEqual(output,input);
 assert.equal(Engine.evaluate(output,{FoundationConditions,BearingExtensions}).valid,false);
});
test('foreign/changed envelope versions and formats are rejected exactly',()=>{
 for(const version of [0,2,-1,'1',null,true,{},[]])assert.throws(()=>Files.parse(JSON.stringify({...envelope(example()),version})),String(version));
 for(const format of ['soil-sense-lab',Files.format+' ',null,1])assert.throws(()=>Files.parse(JSON.stringify({...envelope(example()),format})),String(format));
 for(const key of ['format','version','input']){const record=envelope(example());delete record[key];assert.throws(()=>Files.parse(JSON.stringify(record)));}
 const record=envelope(example());record.results={status:'approved'};assert.throws(()=>Files.parse(JSON.stringify(record)));
});
test('unknown fields and injected saved results are rejected at every object boundary',()=>{
 for(const path of shapePaths){const input=example(),object=path?at(input,path):input;object.tampered='unexpected';assert.throws(()=>Files.parse(encode(input)),path||'root');}
 for(const key of ['results','bearingCheck','overallStatus']){const input=example();input[key]={status:'within-user-limit',allowableGross:999999};assert.throws(()=>Files.parse(encode(input)));}
});
test('missing expected fields are rejected at every object boundary',()=>{
 for(const path of shapePaths){const template=example(),object=path?at(template,path):template;
  for(const key of Object.keys(object)){const input=example(),target=path?at(input,path):input;delete target[key];assert.throws(()=>Files.parse(encode(input)),`${path}.${key}`);}
 }
});
test('arrays, scalars and null cannot substitute for input objects',()=>{
 for(const replacement of [null,[],0,'x',true]){
  assert.throws(()=>Files.inspect(replacement));
  for(const path of shapePaths.filter(Boolean)){const input=example();assign(input,path,replacement);assert.throws(()=>Files.parse(encode(input)),path);}
 }
});
test('every numeric field rejects numeric strings, booleans and compound values',()=>{
 for(const path of numericPaths)for(const bad of ['3','',false,{},[]]){const input=example();assign(input,path,bad);assert.throws(()=>Files.parse(encode(input)),`${path}: ${JSON.stringify(bad)}`);}
});
test('NaN, infinities and undefined are rejected before serialization can convert them into null',()=>{
 for(const path of numericPaths)for(const bad of [NaN,Infinity,-Infinity,undefined]){const input=example();assign(input,path,bad);assert.throws(()=>Files.serialize(input),path);}
 const text=encode(example()).replace('"requiredFS":3','"requiredFS":1e999');assert.throws(()=>Files.parse(text));
});
test('all metadata, combination notes and settlement source enforce the declared 1000-code-unit cap',()=>{
 const textPaths=[...Object.keys(example().meta).map(k=>'meta.'+k),'combinations.0.name','combinations.0.loadNote','settlement.source'];
 for(const path of textPaths){const input=example();assign(input,path,'한'.repeat(1000));assert.deepEqual(Files.parse(Files.serialize(input)),input);assign(input,path,'한'.repeat(1001));assert.throws(()=>Files.serialize(input),path);assign(input,path,123);assert.throws(()=>Files.inspect(input),path);}
 const input=example();input.meta.project='🌱'.repeat(500);assert.equal(Files.parse(Files.serialize(input)).meta.project,input.meta.project);input.meta.project+='🌱';assert.throws(()=>Files.inspect(input));
});
test('one and eight independently identified load cases save; zero, nine and nonarrays fail',()=>{
 for(const count of [1,8]){const input=example();input.combinations=Array.from({length:count},(_,i)=>({...input.combinations[0],id:'LC'+(i+1)}));assert.equal(Files.parse(Files.serialize(input)).combinations.length,count);}
 for(const count of [0,9]){const input=example();input.combinations=Array.from({length:count},(_,i)=>({...example().combinations[0],id:'LC'+i}));assert.throws(()=>Files.inspect(input));}
 for(const bad of [null,{},'LC1']){const input=example();input.combinations=bad;assert.throws(()=>Files.inspect(input));}
});
test('duplicate IDs, empty IDs and IDs beyond 80 code units are refused',()=>{
 const duplicate=example();duplicate.combinations.push({...duplicate.combinations[0],name:'다른 이름'});assert.throws(()=>Files.inspect(duplicate));
 for(const id of ['',7,null,'a'.repeat(81)]){const input=example();input.combinations[0].id=id;assert.throws(()=>Files.inspect(input));}
 const long=example();long.combinations[0].id='a'.repeat(80);assert.equal(Files.parse(Files.serialize(long)).combinations[0].id.length,80);
});
test('cover and coefficient method are closed enums, including against whitespace and case variants',()=>{
 for(const cover of ['basement','backfilled']){const input=example();input.geometry.cover=cover;assert.equal(Files.parse(Files.serialize(input)).geometry.cover,cover);}
 for(const method of ['fhwa-vesic','usace-meyerhof']){const input=example();input.method=method;assert.equal(Files.parse(Files.serialize(input)).method,method);}
 for(const bad of ['',null,0,'other','backfilled ']){const input=example();input.geometry.cover=bad;assert.throws(()=>Files.inspect(input));}
 for(const bad of ['',null,0,'FHWA-VESIC','fhwa-vesic ']){const input=example();input.method=bad;assert.throws(()=>Files.inspect(input));}
});
test('256 KiB is a UTF-8 byte boundary, and a BOM is supported within that boundary',()=>{
 const valid=encode(example()),bytes=new TextEncoder().encode(valid).length,padded=valid+' '.repeat(Files.maxBytes-bytes);
 assert.deepEqual(Files.parse(padded),example());assert.throws(()=>Files.parse(padded+' '));
 assert.deepEqual(Files.parse('\uFEFF'+valid),example());assert.throws(()=>Files.parse('\uFEFF'+padded));
 const korean=example();korean.meta.project='한';const encoded=encode(korean),by=new TextEncoder().encode(encoded).length;
 assert.deepEqual(Files.parse(encoded+' '.repeat(Files.maxBytes-by)),korean);assert.throws(()=>Files.parse(encoded+' '.repeat(Files.maxBytes-by+1)));
});
test('malformed JSON and nonstring input cannot become implicit defaults',()=>{
 for(const bad of [null,undefined,{},[],1,'','{','undefined','null','[]','true','{"format":'])assert.throws(()=>Files.parse(bad));
});
test('own __proto__/constructor/prototype payload keys are rejected without prototype pollution',()=>{
 const before=Object.prototype.polluted;
 for(const key of ['__proto__','constructor','prototype']){
  for(const path of shapePaths){const input=example(),object=path?at(input,path):input;Object.defineProperty(object,key,{enumerable:true,writable:true,value:{polluted:'worksheet'}});assert.throws(()=>Files.parse(encode(input)));}
  const record=envelope(example());Object.defineProperty(record,key,{enumerable:true,writable:true,value:{polluted:'worksheet'}});assert.throws(()=>Files.parse(JSON.stringify(record)));
 }
 assert.equal(Object.prototype.polluted,before);assert.equal(({}).polluted,before);
});
test('direct null/custom prototypes are rejected rather than cloned as valid records',()=>{
 for(const path of shapePaths){const input=example(),object=path?at(input,path):input;Object.setPrototypeOf(object,null);assert.throws(()=>Files.inspect(input),path);}
 for(const path of shapePaths){const input=example(),object=path?at(input,path):input;Object.setPrototypeOf(object,{polluted:true});assert.throws(()=>Files.inspect(input),path);}
});
test('untrusted markup in text is preserved as data and never interpreted by the file parser',()=>{
 const input=example(),payload='</pre><img src=x onerror="globalThis.__worksheetInjected=1"><script>alert(1)</script>';
 input.meta.project=payload;input.combinations[0].name=payload;input.settlement.source=payload;
 const output=Files.parse(Files.serialize(input));assert.equal(output.meta.project,payload);assert.equal(output.combinations[0].name,payload);assert.equal(globalThis.__worksheetInjected,undefined);
});
test('whitespace-only identifiers cannot import an uneditable engine-invalid case',()=>{
 for(const id of [' ','\t\n','\u00A0','\u3000']){
  const input=example();input.combinations[0].id=id;
  assert.throws(()=>Files.inspect(input));assert.throws(()=>Files.parse(encode(input)));
 }
});
