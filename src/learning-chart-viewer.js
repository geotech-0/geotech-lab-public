function installChartViewer(){
 const head=document.querySelector('.plot-head'),legend=$('legend');
 const actions=document.createElement('div');actions.className='plot-head-actions';head.append(actions);actions.append(legend);
 const open=document.createElement('button');open.type='button';open.className='chart-enlarge';open.textContent='확대';open.setAttribute('aria-label','현재 그래프 확대');actions.append(open);
 const dialog=document.createElement('dialog');dialog.id='chart-viewer';dialog.className='chart-viewer';dialog.setAttribute('aria-labelledby','chart-viewer-title');
 dialog.innerHTML='<header><h2 id="chart-viewer-title">그림 확대</h2><button type="button" data-close-chart>닫기</button></header><p>그림을 가로로 스크롤해 세부 눈금과 선을 확인하세요.</p><div class="chart-viewer-scroll" tabindex="0" aria-label="확대한 그래프, 가로 스크롤 가능"></div>';
 document.body.append(dialog);
 open.addEventListener('click',()=>{const svg=$('chart').querySelector('.ex-chart-grid')||$('chart').querySelector('svg');if(!svg){announce('유효한 입력에서 그림을 확대할 수 있습니다.');return;}$('chart-viewer-title').textContent=$('plot-title').textContent;const copy=svg.cloneNode(true),ids=new Map();for(const node of copy.querySelectorAll('[id]')){const old=node.id;node.id='chart-zoom-'+old;ids.set(old,node.id);}for(const node of copy.querySelectorAll('*'))for(const attr of [...node.attributes]){let value=attr.value;for(const [old,id] of ids)value=value.replaceAll(`url(#${old})`,`url(#${id})`).replace(new RegExp(`^#${old}$`),'#'+id);if(value!==attr.value)node.setAttribute(attr.name,value);}dialog.querySelector('.chart-viewer-scroll').replaceChildren(copy);dialog.showModal();});
 dialog.querySelector('[data-close-chart]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{dialog.querySelector('.chart-viewer-scroll').replaceChildren();open.focus();});
}
