/* Optional personal study drawer. No application state is read or written without hooks. */
const LearningReviewRoutes=[
 {id:'properties',name:'흙의 성질',summary:'분류와 상태를 나누어 읽기',steps:[
  {module:'soil',question:'plasticity',title:'입도와 소성',task:'LL과 PL을 따로 바꾸고, PI와 분류가 달라지는 경계를 찾아보세요.',answer:'PI=LL−PL입니다. 소성도표 위치는 LL과 PI로 정하지만, 최종 USCS 분류에는 입도·세립분 함량도 필요합니다.'},
  {module:'phases',question:'phases',title:'물과 간극',task:'간극비를 고정하고 함수비를 높여, 포화도와 단위중량의 변화를 먼저 예상해 보세요.',answer:'같은 e와 Gs에서 함수비가 커지면 포화도도 커집니다. 포화도 100%를 넘는 조합은 물리적으로 가능한 삼상 상태가 아닙니다.'},
  {module:'relative-density',question:'relative',title:'같은 간극비의 다른 의미',task:'현재 간극비를 고정하고 최대·최소 간극비를 바꾸어 상대밀도를 비교하세요.',answer:'상대밀도는 현재 e뿐 아니라 emin·emax에도 달려 있습니다. 서로 다른 흙의 같은 e를 같은 조밀함으로 읽을 수 없습니다.'}
 ]},
 {id:'water',name:'물과 응력',summary:'물의 무게와 흐름을 구별하기',steps:[
  {module:'stress',question:'profile',title:'수위와 상재',task:'관찰 깊이를 고정하고 수위와 상재를 각각 바꿔, 총응력·수압·유효응력을 비교하세요.',answer:'유효응력은 총응력에서 간극수압을 뺀 값입니다. 이 화면은 배수 완료 상태이므로 상재 증가를 재하 직후의 과잉수압으로 해석하지 않습니다.'},
  {module:'darcy',question:'flow',title:'같은 수두차의 다른 유량',task:'수두차와 흐름 길이를 함께 바꿔, 동수경사와 유량이 같은 조합을 찾아보세요.',answer:'Darcy 모형에서 Q=kAΔh/L입니다. k와 A가 같을 때 Δh/L이 같으면 유량도 같습니다.'},
  {module:'stress-spread',question:'rectangle',title:'면적과 영향 깊이',task:'재하면의 폭과 관찰 깊이를 바꾸고, 화면의 하중 고정 조건을 확인하며 응력 증가를 비교하세요.',answer:'총하중 Q를 고정하는지 재하압 q를 고정하는지에 따라 면적 변화의 의미가 달라집니다. 지중응력 증가만으로 침하나 파괴를 확정할 수 없습니다.'}
 ]},
 {id:'mechanics',name:'변형과 강도',summary:'크기·속도·파괴조건을 분리하기',steps:[
  {module:'compression',question:'history',title:'하중 이력',task:'선행압밀압력과 현재 하중을 바꾸어, 재압축과 처녀압축의 구간을 구별해 보세요.',answer:'같은 응력 증가라도 과거 최대응력을 넘는지에 따라 e–logσ′ 경로와 압축량이 달라집니다.'},
  {module:'consolidation',question:'primary',title:'배수 거리와 시간',task:'배수 조건과 층두께를 바꾸고, 같은 압밀도에 필요한 시간의 변화를 확인하세요.',answer:'1차 압밀 시간은 Hdr²/cv에 비례합니다. 다른 조건이 같으면 배수거리를 절반으로 줄인 시간은 1/4입니다.'},
  {module:'shear-strength',question:'mohr',title:'강도와 응력상태',task:'구속압·편차응력·마찰각을 함께 조절해 Mohr 원과 파괴포락선의 관계를 설명해 보세요.',answer:'강도정수만으로 현재 응력상태를 정하지 못합니다. 포락선은 한계 저항 관계이며, 포락선을 넘는 입력이 실제 파괴 후 변형을 계산한 것은 아닙니다.'}
 ]},
 {id:'retaining',name:'토압·사면',summary:'벽의 움직임과 힘의 가정 읽기',steps:[
  {module:'earth-pressure',question:'pressure',title:'주동·정지·수동',task:'벽의 상태와 마찰각을 바꾸고, 어떤 조건이 흙의 횡방향 저항을 동원하는지 설명해 보세요.',answer:'주동·정지·수동은 벽과 흙의 상대변위 조건이 다릅니다. 물의 압력과 유효 토압도 나누어 읽어야 합니다.'},
  {module:'earth-pressure',question:'cohesive',title:'점착력과 비접촉',task:'점착력과 상재하중을 함께 바꾸고, 음의 이론 토압과 실제 접촉 구간을 구별하세요.',answer:'화면의 음의 Rankine 값은 인장 전달을 뜻하지 않습니다. 접촉압을 0으로 제한하며, 물이 찬 균열의 수압은 이 건조 모형에 포함되지 않습니다.'},
  {module:'slope',question:'circular',title:'같은 원호의 두 해석',task:'같은 원호에서 강도·수압비를 바꾸고 두 해석법의 차이를 비교하세요. 후보 탐색값과 전역 최소값도 구별하세요.',answer:'Ordinary와 간편 Bishop은 절편 사이 힘을 다루는 가정이 다릅니다. 지정 원호나 유한 개 후보의 최솟값은 모든 활동면의 최소 안전율이 아닙니다.'}
 ]},
 {id:'foundations',name:'기초와 말뚝',summary:'하중·지지력·침하를 나누어 보기',steps:[
  {module:'foundation',question:'pressure',title:'기초 폭과 고정 하중',task:'Q 고정과 q 고정을 각각 선택한 뒤 기초 폭을 바꾸고, 무엇이 일정한지 설명해 보세요.',answer:'정사각형에서 q=Q/B²입니다. Q 고정이면 폭 증가에 따라 q가 작아지고, q 고정이면 폭 증가에 따라 총하중 Q가 커집니다.'},
  {module:'layered-settlement',question:'footing',title:'응력 분포와 층별 압축',task:'기초 크기·층두께·구속계수를 바꾸어 어느 층이 압축량을 많이 만드는지 확인하세요.',answer:'이 화면은 지정 층에서 중심선의 응력 증가를 적분한 압축량입니다. 기초 전체의 평균침하나 모든 깊이를 포함한 총침하와 구별합니다.'},
  {module:'pile-axial',question:'transfer',title:'저항의 동원 순서',task:'말뚝 머리 하중과 주면·선단의 동원변위를 바꾸어 하중 분담을 비교하세요.',answer:'지정한 최대 저항이 작은 변위에서 모두 동원되는 것은 아닙니다. 주면·선단 전달 모형과 실제 재하시험 관측을 구별해야 합니다.'}
 ]},
 {id:'practice',name:'조사·개량·판단',summary:'측정과 환산의 불확실성 읽기',steps:[
  {module:'spt-corrections',question:'correction',title:'SPT 보정의 순서',task:'시험 에너지와 상재 조건을 바꾸어 N·N60·(N1)60을 구별하세요.',answer:'측정 타격수와 에너지 보정값, 상재 정규화값은 서로 다릅니다. 이미 보정된 값을 원시 N처럼 다시 보정하지 않아야 합니다.'},
  {module:'cpt-interpretation',question:'interpretation',title:'같은 콘 저항의 강도 범위',task:'응력 보정과 Nkt 범위를 바꾸어 환산 비배수강도의 범위를 읽어보세요.',answer:'su=qnet/Nkt 관계에서 같은 순콘저항도 선택한 Nkt에 따라 다른 강도로 환산됩니다. 상관식의 범위는 현장 검증을 대신하지 않습니다.'},
  {module:'vertical-drains',question:'drains',title:'배수 촉진과 교란',task:'드레인 간격과 교란 조건을 바꾸어 같은 시간의 압밀도를 비교하세요.',answer:'배수 경로 단축과 시공 교란의 영향은 다릅니다. 빠른 압밀이 최종 침하량이나 강도를 자동으로 정하는 것은 아닙니다.'}
 ]}
];

function createLearningLibraryStore({service,storage,storageKey='soil-sense-learning-library-v1',routes=LearningReviewRoutes,maxEntries=12,now=()=>new Date().toISOString(),makeId=()=>globalThis.crypto?.randomUUID?.()||'example-'+Date.now()+'-'+Math.random().toString(36).slice(2)}){
 const copy=v=>JSON.parse(JSON.stringify(v)),empty=()=>({version:1,examples:[],progress:{},activeRoute:null}),routeById=Object.fromEntries(routes.map(route=>[route.id,route]));
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
 const maxStorageBytes=4*1024*1024;let data=empty(),persistent=!!storage,message=storage?'':'이 기기에서 저장 공간을 사용할 수 없습니다. 이번 창에서만 보관하며, 필요한 입력은 파일로 저장하세요.',removed=null;
 function fail(message){throw new Error(message);}
 function validate(input){
  if(!plain(input)||Object.keys(input).sort().join(',')!=='activeRoute,examples,progress,version'||input.version!==1||!Array.isArray(input.examples)||input.examples.length>maxEntries||!plain(input.progress))fail('학습함 형식을 확인할 수 없습니다.');
  const ids=new Set();for(const item of input.examples){
   if(!plain(item)||Object.keys(item).sort().join(',')!=='createdAt,id,name,sessionText'||typeof item.id!=='string'||!item.id||item.id.length>100||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.trim().length>40||typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt))||typeof item.sessionText!=='string')fail('저장한 예제 형식을 확인할 수 없습니다.');
   ids.add(item.id);service.parse(item.sessionText);
  }
  if(input.activeRoute!==null&&!own(routeById,input.activeRoute))fail('알 수 없는 복습 경로입니다.');
  for(const [id,value]of Object.entries(input.progress)){
   if(!own(routeById,id)||!plain(value)||Object.keys(value).sort().join(',')!=='checked,index'||!Number.isInteger(value.index)||value.index<0||value.index>=routeById[id].steps.length||!Array.isArray(value.checked)||new Set(value.checked).size!==value.checked.length||value.checked.some(n=>!Number.isInteger(n)||n<0||n>=routeById[id].steps.length))fail('복습 기록을 확인할 수 없습니다.');
  }
  return copy(input);
 }
 function load(){
  if(!persistent)return copy(data);
  try{const raw=storage?.getItem(storageKey);if(raw){if(new TextEncoder().encode(raw).byteLength>maxStorageBytes)fail('학습함 크기가 너무 큽니다.');data=validate(JSON.parse(raw));}else data=empty();}
  catch(error){persistent=false;message='저장된 학습함을 읽지 못했습니다. 기존 자료를 덮어쓰지 않고 이번 창에서만 사용합니다. 입력 파일로 따로 보관할 수 있습니다.';}
  return copy(data);
 }
 function commit(edit){
  load();const next=copy(data);edit(next);validate(next);const text=JSON.stringify(next);if(new TextEncoder().encode(text).byteLength>maxStorageBytes)fail('학습함이 가득 찼습니다. 예제를 파일로 보관한 뒤 일부를 삭제하세요.');
  if(persistent){try{globalThis.geotechCloud?.assertWritable();if(!storage)throw new Error('storage unavailable');storage.setItem(storageKey,text);}catch{persistent=false;message='이 기기에 저장하지 못했습니다. 변경은 이번 창에서만 유지됩니다. 필요한 예제는 입력 파일로 따로 보관하세요.';}}
  data=next;globalThis.geotechCloud?.changed();return copy(data);
 }
 function entry(id){load();const found=data.examples.find(item=>item.id===id);if(!found)fail('예제를 찾을 수 없습니다. 학습함을 다시 열어주세요.');return copy(found);}
 load();
 return {
  load,validate,acceptRestored(input){data=validate(input);persistent=!!storage;message=persistent?'':'이번 창에서만 보관합니다.';removed=null;return copy(data);},status:()=>({persistent,message}),list:()=>load().examples.map(item=>({...item,preview:service.parse(item.sessionText).preview})),
  save(name,snapshot){const clean=String(name).trim();if(!clean||clean.length>40)fail('예제 이름을 1~40자로 입력하세요.');const record=service.serialize(snapshot),item={id:makeId(),name:clean,createdAt:now(),sessionText:record.text};commit(next=>{if(next.examples.length>=maxEntries)fail(`내 예제는 ${maxEntries}개까지 보관합니다. 필요 없는 예제를 먼저 삭제하세요.`);if(next.examples.some(x=>x.name===clean))fail('같은 이름의 예제가 있습니다. 구별되는 이름을 입력하세요.');next.examples.unshift(item);});return copy(item);},
  inspect(id){const item=entry(id);return {...service.parse(item.sessionText),item};},
  remove(id){const item=entry(id);commit(next=>{next.examples=next.examples.filter(x=>x.id!==id);});removed=item;return copy(item);},
  restoreRemoved(){if(!removed)fail('되돌릴 삭제가 없습니다.');const item=copy(removed);commit(next=>{if(next.examples.length>=maxEntries)fail('삭제를 되돌리려면 예제 한 칸이 필요합니다.');if(next.examples.some(x=>x.id===item.id||x.name===item.name))fail('같은 예제가 이미 있습니다.');next.examples.unshift(item);});removed=null;return item;},
  canRestore:()=>!!removed,
  openRoute(id,index){if(!own(routeById,id))fail('복습 경로를 찾을 수 없습니다.');commit(next=>{const previous=next.progress[id]||{index:0,checked:[]},target=index??previous.index;if(!Number.isInteger(target)||target<0||target>=routeById[id].steps.length)fail('복습 단계가 올바르지 않습니다.');next.activeRoute=id;next.progress[id]={...previous,index:target};});},
  mark(id,index,checked=true){if(!own(routeById,id)||!Number.isInteger(index)||index<0||index>=routeById[id].steps.length)fail('복습 단계가 올바르지 않습니다.');commit(next=>{const progress=next.progress[id]||{index:0,checked:[]};progress.checked=progress.checked.filter(n=>n!==index);if(checked)progress.checked.push(index);progress.checked.sort((a,b)=>a-b);next.progress[id]=progress;});},
  stopRoute(){commit(next=>{next.activeRoute=null;});},
  exportRaw:()=>{try{return storage?.getItem(storageKey)||JSON.stringify(data);}catch{return JSON.stringify(data);}},maxEntries
 };
}

function installLearningLibrary({service,getSnapshot,beforeCapture=()=>{},applySnapshot,openQuestion,getCurrent,host=document.querySelector('.app-header'),routeHost=document.querySelector('#intro')?.parentElement,announce=()=>{},store,routes=LearningReviewRoutes}){
 if(document.querySelector('#learning-library-open'))return;
 if(!store){let storage;try{storage=window.localStorage;}catch{}store=createLearningLibraryStore({service,storage,routes});}
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;},button=(text,handler)=>{const node=el('button',text);node.type='button';if(handler)node.addEventListener('click',handler);return node;};
 const trigger=button('내 학습',open);trigger.id='learning-library-open';host.append(trigger);
 const dialog=el('dialog',undefined,'learning-library-dialog');dialog.id='learning-library-dialog';dialog.setAttribute('aria-labelledby','learning-library-title');const header=el('header'),heading=el('h2','내 학습');heading.id='learning-library-title';const closeButton=button('닫기',()=>dialog.close());closeButton.dataset.libraryClose='';header.append(heading,closeButton);
 const tabs=el('div',undefined,'learning-library-tabs'),routesButton=button('짧은 복습',()=>{view='routes';render();routesButton.focus();}),examplesButton=button('내 예제',()=>{view='examples';render();examplesButton.focus();});routesButton.id='learning-library-routes';examplesButton.id='learning-library-examples';tabs.append(routesButton,examplesButton);
 const storageNote=el('p',undefined,'note'),status=el('p',undefined,'learning-library-status'),body=el('div');storageNote.id='learning-library-storage';status.id='learning-library-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.id='learning-library-body';dialog.append(header,tabs,storageNote,body,status);document.body.append(dialog);
 const routeBar=el('section',undefined,'learning-review-bar');routeBar.id='learning-review-bar';routeBar.hidden=true;routeBar.setAttribute('aria-label','선택한 짧은 복습');if(routeHost){const anchor=routeHost.querySelector('#intro');if(anchor)anchor.after(routeBar);else routeHost.prepend(routeBar);}
 let view='routes',previewId=null,feedback='',draftName='';
 function storageStatus(){const {persistent,message}=store.status();storageNote.textContent=message||'이 기기에 보관합니다. 기기 간 저장과 전체 백업은 상단 ‘저장·동기화’에서 확인하세요.';storageNote.classList.toggle('is-warning',!persistent);}
 function safely(action){try{action();storageStatus();}catch(error){status.textContent=error.message||'요청을 처리하지 못했습니다.';}}
 function open(){beforeCapture();store.load();previewId=null;feedback='';render();dialog.showModal();(view==='routes'?routesButton:examplesButton).focus();}
 dialog.addEventListener('close',()=>{trigger.focus({preventScroll:true});});
 function begin(id,index){safely(()=>{store.openRoute(id,index);const data=store.load(),route=routes.find(item=>item.id===id),step=route.steps[data.progress[id].index];dialog.close();openQuestion(step.module,step.question);refresh();announce(`${route.name} 복습을 열었습니다. 기존 입력은 유지됩니다.`);});}
 function showRoutes(){body.append(el('p','3개 질문을 따라 짧게 복습하세요. 값을 바꾸기 전에 방향을 예상하고, 설명을 본 뒤 스스로 확인합니다. 기존 입력과 비교 기준은 유지합니다.','note'));const data=store.load(),grid=el('div',undefined,'learning-route-grid');for(const route of routes){const progress=data.progress[route.id]||{index:0,checked:[]},card=el('section',undefined,'learning-route-card');card.append(el('h3',route.name),el('p',route.summary),el('small',`스스로 확인 ${progress.checked.length}/${route.steps.length}`));const list=el('ol');route.steps.forEach((step,index)=>{const li=el('li');li.append(button(step.title,()=>begin(route.id,index)));list.append(li);});card.append(list,button(progress.checked.length?'이어서 보기':'경로 시작',()=>begin(route.id)));grid.append(card);}body.append(grid);}
 function showExamples(){
  const intro=el('p','현재 질문·입력·비교 기준을 이름으로 보관합니다. 열기 전에 내용을 확인하며, 적용은 되돌릴 수 있습니다.','note');body.append(intro);
  const form=el('form',undefined,'learning-example-form'),label=el('label','예제 이름'),name=el('input');name.type='text';name.id='learning-example-name';name.maxLength=40;name.autocomplete='off';name.value=draftName;label.htmlFor=name.id;const saveButton=button('현재 실험 보관');saveButton.type='submit';saveButton.id='learning-example-save';name.addEventListener('input',()=>{draftName=name.value;});form.append(label,name,saveButton);form.addEventListener('submit',event=>{event.preventDefault();safely(()=>{beforeCapture();store.save(name.value,getSnapshot());draftName='';feedback=store.status().persistent?'현재 실험을 내 예제에 보관했습니다.':'이번 창의 내 예제에 보관했습니다. 기기 저장은 되지 않았습니다.';render();document.querySelector('#learning-example-name').focus();});});body.append(form);
  const examples=store.list();body.append(el('p',`${examples.length}/${store.maxEntries}개 보관 중`, 'note'));if(examples.length>=store.maxEntries){saveButton.disabled=true;body.append(el('p','새 예제를 보관하려면 일부 예제를 먼저 삭제하세요.','note'));}if(!examples.length)body.append(el('p','아직 보관한 예제가 없습니다. 지금 살펴보는 조건에 이름을 붙여보세요.','note'));
  const list=el('ul',undefined,'learning-example-list');for(const item of examples){const row=el('li'),info=el('div'),nameLabel=el('strong',item.name);info.append(nameLabel,el('p',`${item.preview.name} · ${item.preview.question}`),el('small',new Date(item.createdAt).toLocaleString('ko-KR')));const actions=el('div',undefined,'learning-example-actions'),preview=button('미리보기',()=>{previewId=item.id;render();body.querySelector('[data-library-back]')?.focus();}),remove=button('삭제',()=>safely(()=>{store.remove(item.id);feedback=`‘${item.name}’ 예제를 삭제했습니다. 바로 아래에서 삭제를 되돌릴 수 있습니다.`;render();body.querySelector('[data-library-restore]')?.focus();}));preview.setAttribute('aria-label',`${item.name} 미리보기`);remove.setAttribute('aria-label',`${item.name} 삭제`);preview.dataset.examplePreview=item.id;remove.dataset.exampleRemove=item.id;actions.append(preview,remove);row.append(info,actions);list.append(row);}body.append(list);
  if(store.canRestore()){const restore=button('마지막 삭제 되돌리기',()=>safely(()=>{store.restoreRemoved();feedback='삭제한 예제를 복원했습니다.';render();examplesButton.focus();}));restore.dataset.libraryRestore='';body.append(restore);}
 }
 function showPreview(){
  let inspected;try{inspected=store.inspect(previewId);}catch(error){previewId=null;feedback=error.message;showExamples();return;}
  const back=button('예제 목록으로',()=>{previewId=null;render();examplesButton.focus();});back.dataset.libraryBack='';body.append(back,el('h3',inspected.item.name),el('p',`${inspected.preview.name} · ${inspected.preview.question}`),el('p',`비교 표시: ${inspected.preview.compare?'켬':'끔'}`,'note'),el('p','적용하면 이 실험의 현재 입력과 기준을 바꿉니다. 다른 실험은 유지하며, 적용 후 ‘되돌리기’로 이전 상태를 복원할 수 있습니다.','note'));
  const details=el('details',undefined,'setting'),summary=el('summary','저장한 현재 입력과 비교 기준 확인'),scroll=el('div',undefined,'learning-preview-table'),table=el('table',undefined,'raw-table'),thead=el('thead'),head=el('tr'),tbody=el('tbody');for(const title of ['입력 · 단위','현재값','기준값'])head.append(el('th',title));thead.append(head);for(const row of inspected.preview.rows){const tr=el('tr');tr.append(el('td',row.label+(row.unit?' ('+row.unit+')':'')),el('td',row.currentDisplay),el('td',row.baselineDisplay));tbody.append(tr);}table.append(thead,tbody);scroll.append(table);details.append(summary,scroll);for(const row of inspected.preview.rows.filter(row=>Array.isArray(row.current))){const nested=el('details'),pre=el('pre',JSON.stringify({현재:row.current,기준:row.baseline},null,2));nested.append(el('summary',`${row.label} 원자료`),pre);details.append(nested);}body.append(details);
  for(const warning of inspected.warnings)body.append(el('p',warning,'note'));const apply=button('이 예제 적용',()=>safely(()=>{const checked=store.inspect(previewId);beforeCapture();applySnapshot(checked.snapshot,{name:checked.item.name,source:'library'});dialog.close();refresh();announce('내 예제를 적용했습니다. 되돌리기로 이전 입력과 기준을 함께 복원할 수 있습니다.');}));apply.id='learning-example-apply';body.append(apply);
 }
 function render(){body.replaceChildren();status.textContent=feedback;routesButton.setAttribute('aria-pressed',String(view==='routes'));examplesButton.setAttribute('aria-pressed',String(view==='examples'));if(view==='routes')showRoutes();else if(previewId)showPreview();else showExamples();storageStatus();}
 function refresh(){
  const data=store.load(),route=routes.find(item=>item.id===data.activeRoute),progress=route&&data.progress[route.id],step=progress&&route.steps[progress.index],current=getCurrent();routeBar.hidden=!step||current.module!==step.module||current.question!==step.question;if(routeBar.hidden){routeBar.dataset.signature='';return;}
  const signature=JSON.stringify([route.id,progress.index,progress.checked]),sameStep=routeBar.dataset.step===route.id+':'+progress.index,wasOpen=sameStep&&routeBar.querySelector('details')?.open,focusedCheck=sameStep&&routeBar.querySelector('[data-review-check]')===document.activeElement;if(routeBar.dataset.signature===signature)return;routeBar.dataset.signature=signature;routeBar.dataset.step=route.id+':'+progress.index;
  routeBar.replaceChildren();const top=el('div',undefined,'learning-review-heading'),heading=el('strong',`${route.name} · ${progress.index+1}/${route.steps.length}`),stop=button('경로 닫기',()=>safely(()=>{store.stopRoute();refresh();announce('복습 안내를 닫았습니다. 실험 입력은 유지됩니다.');}));top.append(heading,stop);routeBar.append(top,el('p',step.task));
  const details=el('details'),summary=el('summary','설명과 스스로 확인'),answer=el('p',step.answer),checkLabel=el('label',undefined,'check'),checkbox=el('input');checkbox.type='checkbox';checkbox.checked=progress.checked.includes(progress.index);checkbox.dataset.reviewCheck='';checkbox.addEventListener('change',()=>safely(()=>{store.mark(route.id,progress.index,checkbox.checked);feedback='';announce(checkbox.checked?'스스로 설명할 수 있다고 기록했습니다.':'자기확인을 해제했습니다.');}));checkLabel.append(checkbox,document.createTextNode('이유를 내 말로 설명할 수 있어요'));details.append(summary,answer,checkLabel,el('small','자기확인 기록이며, 학습효과나 전문 검토를 인증하는 결과는 아닙니다.'));details.open=!!wasOpen;routeBar.append(details);if(focusedCheck)checkbox.focus({preventScroll:true});
  const actions=el('div',undefined,'learning-review-actions');if(progress.index>0)actions.append(button('이전 질문',()=>begin(route.id,progress.index-1)));if(progress.index<route.steps.length-1)actions.append(button('다음 질문',()=>begin(route.id,progress.index+1)));else actions.append(button('다른 복습 보기',()=>{view='routes';open();}));routeBar.append(actions);
 }
 refresh();return {open,refresh,store,dialog,trigger};
}
