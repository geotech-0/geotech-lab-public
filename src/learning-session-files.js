/* This file declares helpers only. The application supplies state/validation/undo hooks. */
function makeLearningSessionCatalog({modules,defaults,labs={}}){
 const enums={
  soil:{mode:['example','raw','mass'],gradation:['well','uniform','gap']},
  stress:{soilProfile:['homogeneous','layered']},foundation:{loadMode:['force','pressure']},
  compaction:{compactionMode:['synthetic','evidence'],effort:['12','26','55']},
  'footing-ledger':{cover:['backfilled','basement']},compression:{testBranch:['loading','unloading'],stage:['initial','unload','reload'],readingSource:['example','usgs'],evidenceBranch:['loading','reloading','continued','unloading']},
  consolidation:{drainage:['single','double']},'stress-spread':{loadMode:['force','pressure'],rectMode:['single','double']},
  'layered-seepage':{order:['AB','BA']},'bearing-conditions':{method:['usace-meyerhof','fhwa-vesic']},
  'earth-pressure':{state:['active','rest','passive']},excavation:{stage:['before','locked','final']},
  slope:{stage:['initial','slow','rapid']},'vertical-drains':{drainage:['single','double'],pattern:['triangle','square'],smear:['off','on']},
  preloading:{drainage:['single','double']},'spt-corrections':{basis:['raw','n60']},'cpt-interpretation':{basis:['qc','qt']},
  'pile-lateral':{head:['free','fixed'],tip:['free','fixed']},'layered-settlement':{footingLoadMode:['force','pressure']}
 };
 const labels={sedimentDepthCm:['유효깊이 L','cm'],sedimentTimeMinutes:['경과시간 t','분'],sedimentGs:['입자 비중 Gs',''],sedimentTemperature:['물 온도','°C'],mode:['입도 자료',''],fines:['세립분 함량','%'],gravelShare:['조립분 중 자갈','%'],gradation:['입도 예제',''],ll:['액성한계 LL','%'],pl:['소성한계 PL','%'],np:['비소성 NP',''],organic:['유기질 여부',''],points:['체별 통과율','mm · %'],massRows:['체별 잔류질량','mm · g'],soilProfile:['지층 구성',''],layerDepth:['층 경계 깊이','m'],gammaMoist:['상부 습윤 단위중량','kN/m³'],gammaSat:['상부 포화 단위중량','kN/m³'],gammaMoist2:['하부 습윤 단위중량','kN/m³'],gammaSat2:['하부 포화 단위중량','kN/m³'],gammaW:['물의 단위중량','kN/m³'],waterDepth:['수위 깊이','m'],surcharge:['상재하중','kPa'],depth:['관찰 깊이','m'],width:['폭 B','m'],load:['총하중 Q','kN'],pressure:['접지압 q','kPa'],loadMode:['고정 조건',''],embedment:['근입깊이','m'],phi:['마찰각 φ′','°'],cohesion:['점착력 c′','kPa'],gamma:['단위중량','kN/m³'],modulus:['탄성계수 E','kPa'],poisson:['Poisson 비','']};
 const map=Array.isArray(labs)?Object.fromEntries(labs.map(l=>[l.key,l])):labs;
 return Object.fromEntries(Object.entries(modules).map(([key,meta])=>[key,{
  name:meta.name,questions:meta.questions,defaults:defaults[key],labels:{...labels,...map[key]?.labels},enums:enums[key]||{},
  fixed:key==='pile-lateral'?{elements:64}:key==='foundation'?{embedment:0,poisson:.3}:['stress','consolidation'].includes(key)?{gammaW:9.81}:{},
  arrays:key==='soil'?{points:{size:'number',passing:'nullable-number'},massRows:{size:'nullable-number',mass:'nullable-number'}}:{},
  activeFields:map[key]?.activeFields,sessionShape:map[key]?.sessionShape,sessionLegacyShape:map[key]?.sessionLegacyShape,sessionLegacyQuestions:map[key]?.sessionLegacyQuestions
 }]));
}

function createLearningSessionFiles({catalog,validate}){
 const format='soil-sense-experiment',version=5,maxBytes=256*1024,maxRows=512;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.prototype.toString.call(v)==='[object Object]';
 const copy=v=>JSON.parse(JSON.stringify(v));
 function fail(message){throw new Error(message);}
 function exactKeys(object,keys,where){
  if(!plain(object))fail(`${where}: 객체 형식이 필요합니다.`);
  if(Object.keys(object).some(k=>!keys.includes(k))||keys.some(k=>!own(object,k)))fail(`${where}: 필요한 항목이 없거나 알 수 없는 항목이 있습니다.`);
 }
 function finiteTree(value,depth=0){
  if(depth>8)fail('파일 구조가 너무 깊습니다.');
  if(typeof value==='number'&&!Number.isFinite(value))fail('NaN 또는 무한대는 저장할 수 없습니다.');
  if(value&&typeof value==='object')for(const [key,v]of Object.entries(value)){
   if(['__proto__','prototype','constructor'].includes(key))fail('허용되지 않는 항목이 있습니다.');
   finiteTree(v,depth+1);
  }
 }
 function dataShape(data,entry,where){
  if(entry.sessionShape){const checked=entry.sessionShape(data);if(checked?.valid!==true)fail(`${where}: ${(checked?.errors||['입력 자료 형식을 확인하세요.']).join(' ')}`);return;}
  exactKeys(data,Object.keys(entry.defaults),where);
  for(const [key,base]of Object.entries(entry.defaults)){
   const v=data[key],label=entry.labels?.[key]?.[0]||key;
   if(own(entry.fixed||{},key)&&v!==entry.fixed[key])fail(`${where} · ${label}: 이 모형의 고정값은 바꿀 수 없습니다.`);
   if(Array.isArray(base)){
    const rowSchema=entry.arrays?.[key];
    if(!rowSchema||!Array.isArray(v)||v.length>maxRows)fail(`${where} · ${label}: 최대 ${maxRows}행의 자료만 읽을 수 있습니다.`);
    for(const row of v){exactKeys(row,Object.keys(rowSchema),`${where} · ${label}`);for(const [field,type]of Object.entries(rowSchema))if(!(type==='nullable-number'&&row[field]===null)&&!(typeof row[field]==='number'&&Number.isFinite(row[field])))fail(`${where} · ${label}: 행에는 유한한 숫자가 필요합니다.`);}
   }else if(typeof base==='number'){
    // Null preserves an intentionally empty inactive input; the active question is validated below.
    if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)))fail(`${where} · ${label}: 숫자 형식을 확인하세요.`);
   }else if(typeof base==='boolean'){
    if(typeof v!=='boolean')fail(`${where} · ${label}: 참/거짓 값이 필요합니다.`);
   }else if(typeof base==='string'){
    if(typeof v!=='string'||!(entry.enums?.[key]||[]).includes(v))fail(`${where} · ${label}: 현재 앱에 없는 선택값입니다.`);
   }else fail(`${where} · ${label}: 지원하지 않는 입력 형식입니다.`);
  }
 }
 function validation(key,data,question){
  try{const result=validate(key,copy(data),question);return result?.valid===true?[]:(result?.errors||['현재 모형에서 계산할 수 없는 입력입니다.']).map(String);}
  catch{return ['현재 모형에서 입력을 확인하지 못했습니다.'];}
 }
 function inspect(snapshot){
  finiteTree(snapshot);exactKeys(snapshot,['module','question','current','baseline','compare'],'실험');
  if(typeof snapshot.module!=='string'||!own(catalog,snapshot.module))fail('현재 앱에 없는 실험입니다.');
  const entry=catalog[snapshot.module];
  if(typeof snapshot.question!=='string'||!entry.questions.some(q=>q[0]===snapshot.question))fail('이 실험에 없는 질문입니다.');
  if(typeof snapshot.compare!=='boolean')fail('비교 표시 여부를 확인하세요.');
  dataShape(snapshot.current,entry,'현재 입력');dataShape(snapshot.baseline,entry,'비교 기준');
  const currentErrors=validation(snapshot.module,snapshot.current,snapshot.question);
  if(currentErrors.length)fail('현재 입력: '+currentErrors.join(' '));
  const baselineErrors=validation(snapshot.module,snapshot.baseline,snapshot.question);
  if(snapshot.compare&&baselineErrors.length)fail('비교 기준: '+baselineErrors.join(' '));
  const warnings=baselineErrors.length?['현재 질문에서는 저장한 기준을 계산할 수 없습니다. 비교는 꺼진 상태로 복원됩니다. '+baselineErrors.join(' ')]:[];
  const names={example:'교육용 지정값',raw:'측정값 입력',mass:'잔류질량 입력',well:'넓은 분포',uniform:'좁은 분포',gap:'불연속 분포',homogeneous:'균질 지반',layered:'수평 두 층',force:'총하중 Q 고정',pressure:'접지압 q 고정',synthetic:'지정 예제',evidence:'실제 자료',backfilled:'전면 되메움',basement:'빈 지하공간',loading:'재하',unloading:'제하',reloading:'재재하',continued:'계속 재하',initial:'초기 상태',unload:'제하 상태',reload:'재재하 상태',single:'단일',double:'이중',AB:'A층 위 · B층 아래',BA:'B층 위 · A층 아래','usace-meyerhof':'USACE · Meyerhof','fhwa-vesic':'AASHTO/FHWA · Vesic',active:'주동',rest:'정지',passive:'수동',before:'지보 설치 전',locked:'긴장 후 잠금',final:'추가굴착',slow:'배수된 수위 저하',rapid:'수압이 남은 수위 저하',triangle:'정삼각형',square:'정사각형',off:'끔',on:'켬',n60:'보정된 N60',qc:'콘 저항 qc',qt:'보정 콘 저항 qt',free:'자유',fixed:'고정',usgs:'USGS 실제 자료'};
  const display=(key,value)=>value===undefined?'해당 없음':value===null?'미입력':Array.isArray(value)?`${value.length}개 행`:plain(value)?`${Object.keys(value).length}개 항목`:typeof value==='boolean'?(value?'예':'아니요'):typeof value==='string'?(key==='drainage'?{single:'상면 배수',double:'양면 배수'}[value]:key==='rectMode'?{single:'한 면 재하',double:'두 면 재하'}[value]:names[value])||value:(value!==0&&(Math.abs(value)<1e-4||Math.abs(value)>=1e7)?value.toExponential(5):Number(value.toPrecision(7)).toLocaleString('ko-KR',{maximumSignificantDigits:7}));
  const fields=entry.sessionShape?[...new Set([...Object.keys(snapshot.current),...Object.keys(snapshot.baseline)])]:Object.keys(entry.defaults);
  const rows=fields.map(key=>({key,label:entry.labels?.[key]?.[0]||key,unit:entry.labels?.[key]?.[1]||'',current:copy(snapshot.current[key]??null),baseline:copy(snapshot.baseline[key]??null),currentDisplay:display(key,snapshot.current[key]),baselineDisplay:display(key,snapshot.baseline[key])}));
  return {snapshot:copy(snapshot),preview:{name:entry.name,question:entry.questions.find(q=>q[0]===snapshot.question)[1],compare:snapshot.compare,rows},warnings};
 }
 function byteLength(text){return new TextEncoder().encode(text).byteLength;}
 function serialize(snapshot){
  const checked=inspect(snapshot),text=JSON.stringify({format,version,experiment:checked.snapshot},null,2);
  if(byteLength(text)>maxBytes)fail('파일이 256 KiB보다 큽니다.');
  return {text,filename:`soil-sense-${checked.snapshot.module}.json`,...checked};
 }
 function parse(text){
  if(typeof text!=='string'||byteLength(text)>maxBytes)fail('256 KiB 이하의 JSON 파일을 선택하세요.');
  let record;try{record=JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('JSON 파일을 읽지 못했습니다. 이 앱에서 저장한 입력 파일을 선택하세요.');}
  finiteTree(record);exactKeys(record,['format','version','experiment'],'파일');
  if(record.format!==format||![1,2,3,4,version].includes(record.version))fail('지원하지 않는 파일 형식 또는 버전입니다.');
  if(record.version===version)return inspect(record.experiment);
  const snapshot=record.experiment;
  exactKeys(snapshot,['module','question','current','baseline','compare'],'이전 실험');
  if(typeof snapshot.module!=='string'||!own(catalog,snapshot.module))fail('현재 앱에 없는 실험입니다.');
  const entry=catalog[snapshot.module],legacy=record.version===1&&own(SessionSchemaV1,snapshot.module)?SessionSchemaV1[snapshot.module]:record.version<=2&&own(SessionSchemaV2,snapshot.module)?SessionSchemaV2[snapshot.module]:record.version<=3&&own(SessionSchemaV3,snapshot.module)?SessionSchemaV3[snapshot.module]:null;
  if(entry.sessionLegacyShape){
   if(entry.sessionLegacyQuestions&&!entry.sessionLegacyQuestions.includes(snapshot.question))fail('이전 파일 버전에 없는 질문입니다.');
   for(const side of ['current','baseline']){const checked=entry.sessionLegacyShape(snapshot[side]);if(checked?.valid!==true)fail((checked?.errors||['이전 입력 형식을 확인하세요.']).join(' '));}
   return inspect(snapshot);
  }
  if(!legacy)return inspect(snapshot);
  if(!legacy.questions.includes(snapshot.question))fail('이전 파일 버전에 없는 질문입니다.');
  exactKeys(snapshot.current,legacy.fields,'이전 현재 입력');exactKeys(snapshot.baseline,legacy.fields,'이전 비교 기준');
  const added=Object.keys(entry.defaults).filter(key=>!legacy.fields.includes(key));
  const migrated={...snapshot,current:{...copy(entry.defaults),...snapshot.current},baseline:{...copy(entry.defaults),...snapshot.baseline}};
  const checked=inspect(migrated);
  if(added.length)checked.warnings.unshift('이전 버전의 입력 파일입니다. 원래 질문·입력·비교 기준은 유지하고, 추가된 질문의 전용 입력만 기본값으로 준비했습니다: '+added.map(key=>entry.labels?.[key]?.[0]||key).join(', ')+'.');
  return checked;
 }
 return {serialize,parse,inspect,maxBytes,format,version};
}

function installLearningSessionFiles({service,host,getSnapshot,beforeExport=()=>{},applySnapshot}){
 if(!host||host.querySelector('#session-export'))return;
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 const tools=el('div',undefined,'tools session-file-tools'),out=el('button','입력 저장'),load=el('button','파일 열기'),input=el('input'),status=el('p',undefined,'note');
 out.type=load.type='button';out.id='session-export';load.id='session-import';out.title='현재 실험의 입력과 비교 기준을 JSON 파일로 저장';load.title='저장한 JSON 입력을 확인하고 적용';input.type='file';input.accept='.json,application/json';input.hidden=true;input.id='session-file-input';status.id='session-file-status';status.setAttribute('role','status');tools.append(out,load);host.append(tools,input,status);
 const dialog=el('dialog',undefined,'term-dialog session-file-dialog'),title=el('h2','입력 파일 확인'),intro=el('p'),body=el('div'),message=el('p'),actions=el('div',undefined,'tools'),cancel=el('button','취소'),apply=el('button','이 실험에 적용');
 dialog.id='session-file-dialog';title.id='session-file-title';dialog.setAttribute('aria-labelledby',title.id);message.id='session-file-message';message.setAttribute('role','status');cancel.type=apply.type='button';cancel.id='session-file-cancel';apply.id='session-file-apply';actions.append(cancel,apply);dialog.append(title,intro,body,message,actions);document.body.append(dialog);
 let pending=null,request=0,returnFocus=load;
 function close(){request++;pending=null;if(dialog.open)dialog.close();returnFocus?.focus();}
 cancel.addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{pending=null;});
 out.addEventListener('click',()=>{
  try{beforeExport();const record=service.serialize(getSnapshot()),blob=new Blob([record.text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=record.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='현재 실험의 입력과 비교 기준을 저장했습니다. 결과값은 복원할 때 다시 계산합니다.';}
  catch(error){status.textContent=error.message||'입력을 저장하지 못했습니다.';}
 });
 load.addEventListener('click',()=>{returnFocus=load;input.value='';input.click();});
 input.addEventListener('change',async()=>{
  const file=input.files?.[0],token=++request;pending=null;if(!file)return;
  try{
   if(file.size>service.maxBytes)throw new Error('256 KiB 이하의 JSON 파일을 선택하세요.');
   const text=await file.text();if(token!==request)return;const result=service.parse(text);pending=result.snapshot;body.replaceChildren();
   intro.textContent=`${result.preview.name} · ${result.preview.question}. 이 실험의 현재 입력과 비교 기준만 덮어씁니다. 다른 실험은 유지됩니다. 적용 후 되돌리기를 사용할 수 있습니다.`;
   body.append(el('p',`비교 표시: ${result.preview.compare?'켬':'끔'} · 아래는 저장한 입력입니다. 현재 모드에서 사용하지 않는 값도 포함합니다. 결과는 현재 앱에서 다시 계산하며, 파일에는 원래 숫자의 정밀도를 유지합니다.`, 'note'));
   const table=el('table',undefined,'raw-table'),thead=el('thead'),head=el('tr'),tbody=el('tbody');for(const label of ['입력 · 단위','파일의 현재값','파일의 기준값'])head.append(el('th',label));thead.append(head);
   for(const row of result.preview.rows){const tr=el('tr'),current=el('td',row.currentDisplay),baseline=el('td',row.baselineDisplay);if(typeof row.current==='number')current.title=String(row.current);if(typeof row.baseline==='number')baseline.title=String(row.baseline);tr.append(el('td',`${row.label}${row.unit?' ('+row.unit+')':''}`),current,baseline);tbody.append(tr);}
   table.append(thead,tbody);body.append(table);
   for(const row of result.preview.rows.filter(row=>(row.current&&typeof row.current==='object')||(row.baseline&&typeof row.baseline==='object'))){const detail=el('details',undefined,'setting'),summary=el('summary',`${row.label} 내용 확인`),pre=el('pre',JSON.stringify({현재:row.current,기준:row.baseline},null,2));pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';pre.style.maxHeight='160px';pre.style.overflow='auto';detail.append(summary,pre);body.append(detail);}
   message.textContent=result.warnings.join(' ');apply.disabled=false;dialog.showModal();cancel.focus();status.textContent='파일 내용을 확인한 뒤 적용하세요. 아직 입력은 바뀌지 않았습니다.';
  }catch(error){if(token!==request)return;pending=null;status.textContent=error.message||'파일을 읽지 못했습니다.';}
 });
 apply.addEventListener('click',()=>{
  if(!pending)return;
  try{const checked=service.inspect(pending);applySnapshot(checked.snapshot);status.textContent=`${checked.preview.name} 입력과 비교 기준을 적용했습니다. 되돌리기로 적용 전 상태를 복구할 수 있습니다.`;close();}
  catch(error){message.textContent=error.message||'파일을 적용하지 못했습니다.';}
 });
 return {dialog,close};
}
