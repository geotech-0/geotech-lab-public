/** A portable envelope. Existing experiment v1-v4 and worksheet v1 formats stay intact. */
export const WorkspaceFiles = (() => {
 const keys={experiment:'soil-sense-lab-v1',library:'soil-sense-learning-library-v1',worksheet:'soil-sense-foundation-worksheet-v1'};
 const maxBytes=6*1024*1024,cloudMaxBytes=maxBytes+1024;
 const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.prototype.toString.call(o)==='[object Object]';
 function fail(message){throw new Error(message);}
 function tree(v,depth=0){if(depth>16)fail('자료 구조가 너무 깊습니다.');if(typeof v==='number'&&!Number.isFinite(v))fail('유한한 숫자가 필요합니다.');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))fail('허용되지 않는 자료 항목입니다.');tree(x,depth+1);}}
 function inspectRecords(records){
  if(!plain(records)||Object.keys(records).sort().join(',')!=='experiment,library,worksheet')fail('실험·학습함·계산서 전체 자료가 필요합니다.');
  if(new TextEncoder().encode(JSON.stringify(records)).length>maxBytes)fail('전체 자료는 6 MiB 이하여야 합니다.');
  for(const [name,raw]of Object.entries(records)){if(raw===null)continue;if(typeof raw!=='string')fail('저장 형식이 올바르지 않습니다.');let data;try{data=JSON.parse(raw);}catch{fail('저장된 '+name+' JSON을 읽을 수 없습니다.');}tree(data);
   if(!plain(data))fail('저장 자료 형식이 올바르지 않습니다.');
   if(name==='experiment'&&(data.version!==1||!plain(data.state)||typeof data.state.active!=='string'||!plain(data.state.data)||!plain(data.state.baselines)))fail('실험 저장 버전을 확인하세요.');
   if(name==='library'&&(data.version!==1||!Array.isArray(data.examples)||!plain(data.progress)||!(data.activeRoute===null||typeof data.activeRoute==='string')))fail('학습함 저장 버전을 확인하세요.');
   if(name==='worksheet'&&(data.format!=='soil-sense-foundation-worksheet'||data.version!==1||!plain(data.input)))fail('계산서 저장 버전을 확인하세요.');
  }
  return structuredClone(records);
 }
 function make(records){return {format:'soil-sense-workspace',version:1,exportedAt:new Date().toISOString(),records:inspectRecords(records)};}
 function serialize(records){const text=JSON.stringify(make(records),null,2);if(new TextEncoder().encode(text).length>maxBytes)fail('전체 자료는 6 MiB 이하여야 합니다.');return text;}
 function parse(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes)fail('6 MiB 이하의 전체 자료 JSON을 선택하세요.');let value;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('전체 자료 JSON을 읽을 수 없습니다.');}tree(value);if(!plain(value)||Object.keys(value).sort().join(',')!=='exportedAt,format,records,version'||value.format!=='soil-sense-workspace'||value.version!==1||!Number.isFinite(Date.parse(value.exportedAt)))fail('전체 자료 백업 형식 또는 버전을 확인하세요.');return inspectRecords(value.records);}
 async function fingerprint(records){const bytes=new TextEncoder().encode(JSON.stringify(Object.keys(keys).map(k=>records[k])));const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');}
 function writeAtomic(storage,records){inspectRecords(records);const previous=Object.fromEntries(Object.entries(keys).map(([name,key])=>[name,storage.getItem(key)]));try{for(const [name,key]of Object.entries(keys))records[name]===null?storage.removeItem(key):storage.setItem(key,records[name]);}catch(error){for(const [name,key]of Object.entries(keys)){try{previous[name]===null?storage.removeItem(key):storage.setItem(key,previous[name]);}catch{}}throw new Error('기기 저장 공간이 부족합니다. 기존 자료를 파일로 보관하고 공간을 확보하세요.',{cause:error});}}
 return {keys,maxBytes,cloudMaxBytes,inspectRecords,make,serialize,parse,fingerprint,writeAtomic};
})();
