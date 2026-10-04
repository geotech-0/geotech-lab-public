/* Public exports link publisher originals; selected data remain available offline. */
const EvidenceDownloads=(()=>{
 const policy=typeof EVIDENCE_ASSET_POLICY==='undefined'?{}:EVIDENCE_ASSET_POLICY;
 const external=key=>Object.hasOwn(policy,key)?policy[key]:null;
 const link=(key,label)=>{
  const source=external(key);
  return source?`<a href="${source.url}" target="_blank" rel="noopener">${source.label}</a>`:`<a href="${key}">${label}</a>`;
 };
 return Object.freeze({external,link});
})();

function installEvidenceDownloads(){
 document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="assets/"]');if(!link)return;
  const key=link.getAttribute('href'),external=EvidenceDownloads.external(key);
  // Keep any legacy local links functional without promising an offline original.
  if(external){link.href=external.url;link.target='_blank';link.rel='noopener';link.textContent=external.label;return;}
  const asset=PACKAGED_DATA[key];if(asset===undefined)return;e.preventDefault();
  const content=asset.encoding==='base64'?Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)):asset.data;
  const mime=key.endsWith('.pdf')?'application/pdf':key.endsWith('.json')?'application/json':key.endsWith('.csv')?'text/csv':key.endsWith('.tsv')?'text/tab-separated-values':'text/plain';
  const url=URL.createObjectURL(new Blob([content],{type:mime+';charset=utf-8'})),download=document.createElement('a');download.href=url;download.download=key.split('/').pop();document.body.append(download);download.click();download.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
