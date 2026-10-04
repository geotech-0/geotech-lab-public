function installPublicWorkspace(adapter){
 const el=(tag,text)=>{const item=document.createElement(tag);if(text)item.textContent=text;return item;};
 const entry=el('button','내 자료 백업');entry.type='button';entry.className='cloud-workspace-open';document.querySelector('.app-header').append(entry);
 const dialog=el('dialog');dialog.className='cloud-workspace-dialog';
 const top=el('div');top.className='cloud-heading';const close=el('button','닫기');close.type='button';top.append(el('h2','내 자료'),close);
 const info=el('p','실험 입력·학습 기록·계산서는 이 브라우저에만 저장됩니다. 다른 기기에서 사용하려면 JSON 파일로 내보내고 가져오세요.');info.className='note';
 const actions=el('div');actions.className='cloud-actions';const exportButton=el('button','전체 자료 내보내기'),importButton=el('button','전체 자료 가져오기');actions.append(exportButton,importButton);
 const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
 const preview=el('div');preview.className='cloud-choice';preview.hidden=true;const previewText=el('p','가져오면 현재 자료가 교체됩니다. 적용 전 현재 자료를 JSON 파일로 내려받습니다.'),applyButton=el('button','현재 자료를 백업하고 적용'),cancelButton=el('button','취소');preview.append(previewText,applyButton,cancelButton);
 const error=el('p');error.className='cloud-error';error.setAttribute('role','alert');dialog.append(top,info,actions,file,preview,error);document.body.append(dialog);
 let candidate=null;
 function download(records,suffix=''){const blob=new Blob([WorkspaceFiles.serialize(records)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='soil-sense-workspace'+suffix+'-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 const safe=fn=>async()=>{error.textContent='';try{await fn();}catch(e){error.textContent=e.message||'자료를 확인하세요.';}};
 entry.addEventListener('click',()=>dialog.showModal());close.addEventListener('click',()=>dialog.close());
 exportButton.addEventListener('click',safe(()=>download(adapter.capture())));
 importButton.addEventListener('click',()=>{file.value='';file.click();});
 file.addEventListener('change',safe(async()=>{const selected=file.files?.[0];if(!selected)return;if(selected.size>WorkspaceFiles.maxBytes)throw new Error('6 MiB 이하의 파일을 선택하세요.');candidate=adapter.validate(WorkspaceFiles.parse(await selected.text()));preview.hidden=false;}));
 cancelButton.addEventListener('click',()=>{candidate=null;preview.hidden=true;});
 applyButton.addEventListener('click',safe(()=>{if(!candidate)return;download(adapter.capture(),'-before-import');adapter.apply(candidate);candidate=null;preview.hidden=true;dialog.close();}));
 return {adapter};
}
