/* Explicit adoption plus optimistic revision checks; no network write until adoption. */
function createCloudWorkspaceSync({capture,apply,readLink=()=>null,persistLink=()=>{},request,onStatus=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,delay=900}){
 let link=readLink(),remote=null,phase='connecting',busy=false,timer=null,generation=0,retry=0,dirty=!!link?.dirty;
 const fingerprint=records=>WorkspaceFiles.fingerprint(records);
 const show=(next,message)=>{phase=next;onStatus({phase,message,remote,dirty,revision:link?.revision||0});};
 const remember=()=>{if(link){link.dirty=dirty;persistLink(link);}};
 const plan=(ms=delay)=>{if(timer)clearTimer(timer);timer=setTimer(()=>{timer=null;void flush();},ms);};
 async function fetchRemote(){const value=await request('GET');if(!value?.user?.id||!Number.isSafeInteger(value.revision)||value.revision<0||!(value.records===null||typeof value.records==='object'))throw new Error('서버 응답을 확인할 수 없습니다.');if(value.records)WorkspaceFiles.inspectRecords(value.records);return value;}
 function failure(error){if(error.status===401||error.status===403){show('auth','로그인을 다시 확인하세요');return;}if(error.status===413){show('too-large','자료 용량 초과 · 전체 자료를 파일로 보관하세요');return;}show('offline','기기에 저장됨 · 연결되면 다시 저장합니다');if(link?.owner)plan(Math.min(30000,2000*2**Math.min(retry++,4)));}
 async function connect(){
  if(busy)return;busy=true;const started=generation;
  try{
   remote=await fetchRemote();retry=0;
   const local=capture(),same=(await fingerprint(local))===link?.fingerprint;
   if(!link||link.owner!==remote.user.id){show('choice','동기화할 자료를 선택하세요');return;}
   dirty=dirty||!same||generation!==started;
   if(dirty){if(link.revision===remote.revision){show('pending','기기 변경사항 저장 대기');plan();}else show('conflict','다른 기기에서도 수정했습니다 · 자료를 선택하세요');return;}
   if(remote.revision<link.revision||(!remote.records&&link.revision>0)){show('conflict','서버 자료가 변경되었습니다 · 자료를 선택하세요');return;}
   if(remote.records&&remote.revision!==link.revision){apply(remote.records);const adopted=capture(),adoptedGeneration=generation,digest=await fingerprint(adopted);dirty=adoptedGeneration!==generation;link={owner:remote.user.id,revision:remote.revision,fingerprint:digest,dirty};remember();}
   show(dirty?'pending':'synced',dirty?'추가 변경사항 저장 대기':'모든 기기에 저장됨');if(dirty)plan();
  }catch(error){failure(error);}finally{busy=false;}
 }
 function changed(){generation++;dirty=true;try{if(link&&!link.dirty)remember();}catch{show('local-error','동기화 대기를 저장하지 못했습니다 · 전체 자료를 내보내세요');return;}
  if(['choice','conflict','auth','local'].includes(phase))return;
  if(link?.owner){show('pending','기기에 저장됨 · 동기화 대기');plan();}
 }
 async function flush(){
  if(busy){plan();return;}if(!dirty||!link?.owner||['choice','conflict','auth','local'].includes(phase))return;
  busy=true;const sentGeneration=generation;
  try{
   const records=capture();if(new TextEncoder().encode(JSON.stringify({records,revision:link.revision})).length>WorkspaceFiles.cloudMaxBytes)throw Object.assign(new Error('large'),{status:413});
   show('saving','다른 기기에 저장 중');
   const result=await request('PUT',{revision:link.revision,records},link.owner);
   if(!Number.isSafeInteger(result.revision)||result.revision!==link.revision+1)throw new Error('저장 확인 응답이 올바르지 않습니다.');
   const digest=await fingerprint(records),currentDigest=await fingerprint(capture());link={owner:link.owner,revision:result.revision,fingerprint:digest,dirty:sentGeneration!==generation||currentDigest!==digest};dirty=link.dirty;remember();retry=0;
   show(dirty?'pending':'synced',dirty?'추가 변경사항 저장 대기':'모든 기기에 저장됨');if(dirty)plan();
  }catch(error){if(error.status===409){try{remote=await fetchRemote();show('conflict','다른 기기에서도 수정했습니다 · 자료를 선택하세요');}catch(next){failure(next);}}else failure(error);}finally{busy=false;}
 }
 async function choose(source){
  if(busy||!remote||!['choice','conflict'].includes(phase))return;
  if(source==='remote'){
   if(!remote.records)throw new Error('서버에 저장된 자료가 없습니다.');
   busy=true;try{apply(remote.records);const adopted=capture(),adoptedGeneration=generation,digest=await fingerprint(adopted);dirty=adoptedGeneration!==generation;link={owner:remote.user.id,revision:remote.revision,fingerprint:digest,dirty};remember();show(dirty?'pending':'synced',dirty?'추가 변경사항 저장 대기':'서버 자료를 이 기기에 불러왔습니다');if(dirty)plan();}finally{busy=false;}
  }else if(source==='local'){
   link={owner:remote.user.id,revision:remote.revision,fingerprint:'',dirty:true};dirty=true;remember();show('pending','이 기기 자료 저장 대기');await flush();
  }
 }
 function localOnly(){if(timer)clearTimer(timer);show('local','이 기기에만 저장 중');}
 return {connect,changed,flush,choose,localOnly,getStatus:()=>({phase,dirty,remote,link}),remoteRecords:()=>remote?.records};
}
