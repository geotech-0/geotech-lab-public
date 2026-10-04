/* Interactive presentation for the staged excavation engine. */
const ExcavationView = (() => {
  const types = [['anchor','어스앵커'],['nail','네일'],['strut','스트럿'],['corner','코너스트럿'],['raker','레이커'],['rock','락볼트']];
  const typeName = type => type==='slab'?'대체 슬래브':types.find(([key]) => key === type)?.[1] || type;
  const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const f = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)).toLocaleString('ko-KR') : '—';
  const copy = value => structuredClone(value);
  let selected = 0, cursor = 0, adapter = null, editing = false, rendering = false, frame = null, resize = null;
  let domainKey = '', domains = {}, lockedDomains = null, khReference = {};
  const selectedSupport = d => {const primary=d.supports.filter(s=>s.type!=='slab');return primary[Math.max(0,Math.min(selected,primary.length-1))]||null;};
  const installation = (d, s) => s.z + (s.installClearance ?? d.clearance);
  const release = (d, s) => s.z + (s.releaseClearance ?? (d.releaseLinked ? (s.installClearance ?? d.clearance) : d.releaseClearance));
  const num = (path, label, value, unit, min, max, step = .1, extra = '') => `<label class="ex-field"><span>${label}${unit ? ` <small>${unit}</small>` : ''}</span><input type="number" data-ex-field="${path}" value="${e(value)}" min="${min}" max="${max}" step="${step}" ${extra}></label>`;
  const select = (path, label, value, choices) => `<label class="ex-field"><span>${label}</span><select data-ex-field="${path}">${choices.map(([v, text, disabled]) => `<option value="${e(v)}" ${String(value) === String(v) ? 'selected' : ''} ${disabled?'disabled':''}>${e(text)}</option>`).join('')}</select></label>`;
  const check = (path, label, value) => `<label class="ex-check"><input type="checkbox" data-ex-field="${path}" ${value ? 'checked' : ''}>${label}</label>`;
  function soilControls(prefix, material) {
    if(!Number.isFinite(khReference[prefix]))khReference[prefix]=material.kh;
    return `<div class="ex-two">${num(prefix+'.gamma','습윤 단위중량 γ',material.gamma,'kN/m³',10,30)}${num(prefix+'.gammaSat','포화 단위중량 γsat',material.gammaSat,'kN/m³',10,30)}${num(prefix+'.c','유효 점착력 c′',material.c,'kPa',0,200)}${num(prefix+'.phi','유효 마찰각 φ′',material.phi,'°',0,49.9)}${num(prefix+'.kh','지반반력계수 kh',material.kh,'kN/m³',100,200000,100)}${num(prefix+'.k0','초기 측압계수 K₀',material.k0,'',0,3,.01,'placeholder="자동"')}</div><div class="ex-kh-presets"><span>기준 kh ${f(khReference[prefix],0)}</span>${[.5,1,2].map(ratio=>`<button type="button" data-ex-kh="${prefix}" data-ex-ratio="${ratio}">×${ratio}</button>`).join('')}</div>`;
  }
  function controls(d) {
    const primary=d.supports.filter(s=>s.type!=='slab'),slab=d.supports.find(s=>s.type==='slab');
    selected = Math.max(0, Math.min(selected, primary.length - 1));
    const s = selectedSupport(d), permanent = ['nail','rock'].includes(s?.type), observation = d.observation;
    const commonType=primary.every(p=>p.type===primary[0]?.type)?primary[0]?.type:'';
    return `<div class="ex-controls">
      <div class="ex-two">${s?select('supportType','지보 종류 · 모든 단',commonType,commonType?types:[['','기존 혼합 · 전체 종류 선택',true],...types]):'<span class="ex-small">임시 지보 없음</span>'}${select('count','수직 단수',primary.length,[0,1,2,3,4,5,6].map(n=>[n,n?n+'단':'0단 · 무지보']))}</div>
      ${num('clearance','공통 작업 여유 Δh',d.clearance,'m',0,3,.1)}
      ${s?`<div class="ex-two">${select('selected','조절할 단',selected,primary.map((p,i)=>[i,commonType?`${i+1}단`:`${i+1}단 · ${typeName(p.type)}`]))}${num('support.z','선택 지보 깊이 z',s.z,'m',.1,d.height+d.embedment,.1)}</div>
      <p class="ex-small" data-ex-derived>설치 H ${f(installation(d,s))} m · ${permanent?'보강재 잔존':`해체 H ${f(release(d,s))} m`}</p>`:''}
      <details class="setting"><summary>시공 상세 · 설치와 해체</summary>
        ${num('height','최종 굴착 깊이',d.height,'m',2,20,.5)}
        ${check('releaseLinked','해체에도 설치와 같은 작업 여유',d.releaseLinked)}
        ${d.releaseLinked?'':num('releaseClearance','공통 해체 작업 여유',d.releaseClearance,'m',0,3,.1)}
        ${s?`${check('support.installOverride','이 단의 설치 여유를 따로 지정',s.installClearance!=null)}
        ${s.installClearance==null?'':num('support.installClearance','이 단 설치 작업 여유',s.installClearance,'m',0,5,.1)}
        ${permanent?'<p class="ex-small">네일·락볼트는 되메움 중 잔존하는 보강재로 취급합니다.</p>':check('support.releaseOverride','이 단의 해체 여유를 따로 지정',s.releaseClearance!=null)+(s.releaseClearance==null?'':num('support.releaseClearance','이 단 해체 작업 여유',s.releaseClearance,'m',0,5,.1))}`:''}
        <p class="ex-small">H는 지표 아래 작업면 깊이입니다. 작업 여유는 예제 입력이며 시공 권장값이 아닙니다.</p>
      </details>
      <details class="setting"><summary>되메움 중 대체 지지</summary>${check('slab.enabled','슬래브를 연결한 후 임시 지보 해체',!!slab)}${slab?`<div class="ex-two">${num('slab.z','슬래브 연결 깊이',slab.z,'m',0,d.height,.1)}${num('slab.activateAtBackfill','연결할 때 되메움면 H',slab.activateAtBackfill,'m',0,d.height,.1)}${num('slab.stiffness','대체 지지 축강성',slab.stiffness,'kN/m',100,10000000,1000)}</div><p class="ex-small">수평 슬래브의 등가 압축 지지입니다. 같은 깊이의 임시 지보 해체보다 먼저 연결합니다.</p>`:''}</details>
      <details class="setting"><summary>벽체와 선택 지보의 강성</summary><div class="ex-two">
        ${num('EI','폭 1 m 벽체 EI',d.EI,'kN·m²/m',1000,10000000,10000)}${num('embedment','최종 저면 아래 근입',d.embedment,'m',.5,15,.5)}
        ${s?`${num('support.stiffness',['strut','corner'].includes(s.type)?'기준 길이의 축강성 EA/L':'1본 축강성 EA/L',s.stiffness,'kN/m',100,10000000,1000)}${['strut','corner'].includes(s.type)?num('support.length','기준 부재 길이',s.length??10,'m',.5,100,.5):''}
        ${num('support.spacing','평면 배치 간격',s.spacing??3,'m',.3,15,.1)}${['strut','corner'].includes(s.type)?'':num('support.angle','수직 경사',s.angle??0,'°',0,75,1)}
        ${num('support.preload','1본 초기작용력',s.preload??0,'kN',0,2000,10)}${num('support.capacity','1본 축력 한계',s.capacity,'kN',1,10000000,100,'placeholder="상한 미지정"')}
        ${['anchor','nail','rock'].includes(s.type)?num('support.bondStiffness','정착·부착부 강성',s.bondStiffness,'kN/m',100,10000000,1000,'placeholder="강체 연결"'):''}
        ${s.type==='raker'?num('support.baseStiffness','레이커 받침 강성',s.baseStiffness,'kN/m',100,10000000,1000,'placeholder="강체 연결"'):''}`:''}
        </div><p class="ex-small">축강성·초기작용력·축력 한계는 1본 기준입니다. 스트럿·코너스트럿은 기준 길이에서 EA를 구해 실제 평면 부재 길이에 적용합니다. 그 외 지보는 실제 길이가 반영된 EA/L을 입력합니다. 네일·락볼트는 주 벽체에 연결된 보강재의 등가 축·부착 모형입니다.</p>
      </details>
      <details class="setting"><summary>평면 배치 · 벽과 관찰 위치</summary><div class="ex-two">
        ${num('plan.lx','평면 X 방향 길이',d.plan.lx,'m',4,100,1)}${num('plan.ly','평면 Y 방향 길이',d.plan.ly,'m',4,100,1)}
        ${select('observation.wallId','관찰할 벽',observation.wallId||'A',['A','B','C','D'].map(k=>[k,k+'벽']))}${num('observation.position','벽 위 위치',observation.position??.5,'0~1',0,1,.05)}
        ${num('plan.walerEI','수평 띠장 EI',d.plan.walerEI,'kN·m²',1000,10000000,10000)}
        ${s?.type==='corner'?`<div class="ex-corner-choices"><span>적용 모서리 · ${d.plan.corners.length}개</span>${['A–D','A–B','B–C','C–D'].map((name,index)=>`<label><input type="checkbox" data-ex-corner="${index}" ${d.plan.corners.includes(index)?'checked':''}>${name}</label>`).join('')}</div>${select('plan.membersPerCorner','모서리당 본수',d.plan.membersPerCorner,[1,2,3].map(n=>[n,n+'본']))}${num('plan.offset','첫 끝점 이격',d.plan.offset,'m',.3,30,.1)}${num('plan.spacing','벽을 따른 끝점 간격',d.plan.spacing,'m',.3,15,.1)}`:''}
      </div><p class="ex-small">평면 좌표·실제 부재 길이와 양쪽 벽의 변위가 지보 강성에 연결됩니다. 각 벽의 관찰 위치는 계산 띠로 표시합니다.</p></details>
      <details class="setting"><summary>원지반 물성</summary>${soilControls('soil',d.soil)}</details>
      <details class="setting"><summary>되메움토 물성</summary><button type="button" class="ex-copy-material" data-ex-action="copy-soil">원지반 물성 복사</button>${soilControls('fill',d.fill)}${num('fill.initialPressure','되메움 초기 측압',d.fill.initialPressure??0,'kPa',0,500,1)}</details>
      <details class="setting"><summary>수위와 상재하중</summary><div class="ex-two">${num('water.retained','배면 수위 깊이',d.water.retained,'m',0,50,.5)}${num('water.excavation','굴착측 수위 깊이',d.water.excavation,'m',0,50,.5)}${num('water.restore','되메움 완료 목표수위',d.water.restore,'m',0,50,.5)}${num('surcharge','배면 상재하중',d.surcharge,'kPa',0,300,5)}</div><p class="ex-small">되메움 높이에 맞춰 굴착측 수위를 목표수위까지 선형 복구합니다. 수위는 지표 아래 깊이이며 작업면보다 높으면 담수압을 적용합니다.</p></details>
      <details class="setting"><summary>해석 가정 · 결과 범위</summary>
        ${select('observation.mode','해석 관점',observation.mode,[['history','시공 이력 · 탄소성'],['shape','현재 형상 · 탄성 가정']])}
        ${select('observation.resultMode','표시 결과',observation.resultMode||'total',observation.mode==='shape'?[['total','현재 총결과']]:[['total','현재 총결과'],['increment','직전 계산 증분의 변화'],['envelope','현재까지의 최대·최소 포락선']])}
        <label class="ex-check"><input type="checkbox" data-ex-axis-lock ${lockedDomains?'checked':''}> 현재 결과 축 범위 고정</label>
        <div class="ex-two">${num('increment','굴착 계산 증분',d.increment,'m',.01,.25,.01)}${num('mesh','벽체 요소 길이',d.mesh,'m',.1,1,.1)}</div>
        <p class="ex-small">바의 0.01 m 표시 간격은 계산 정확도가 아닙니다. 현재 형상과 시공 이력의 차이에는 기준상태와 재료모형 차이도 포함됩니다.</p>
      </details>
    </div>`;
  }
  const stages = d => ExcavationStaged.events(d).filter(event=>event.phase===d.observation.phase).map(event=>{const index=d.supports.findIndex(s=>s.id===event.supportId),s=d.supports[index];return {index,id:event.id,depth:event.depth,type:event.type,label:s.type==='slab'?'슬래브 연결':event.type==='release'?(s.type==='anchor'?'긴장 해제':'해체'):'설치'};});
  function stageMarkup() {
    return `<div class="ex-stage-top"><div class="ex-segments"><button type="button" data-ex-action="phase" data-phase="excavation">굴착</button><button type="button" data-ex-action="phase" data-phase="backfill">되메움·해체</button></div><strong data-ex-depth-label></strong></div><input type="range" id="ex-depth-bar" data-ex-depth min="0" max="10" step=".01" value="0" aria-label="현재 굴착 깊이"><div class="ex-event-track" data-ex-event-track></div><div class="ex-stage-ends"><span data-ex-start></span><span data-ex-end></span></div><div class="ex-stage-current"><span data-ex-stage-summary></span><select data-ex-event-side aria-label="선택 사건의 직전 직후" hidden></select></div>`;
  }
  function refreshStage(d) {
    let host = document.getElementById('excavation-stage');
    if (!d) { host?.remove(); document.body.classList.remove('excavation-active'); return; }
    document.body.classList.add('excavation-active');
    if (!host) { host=document.createElement('div'); host.id='excavation-stage'; host.className='ex-stage'; host.innerHTML=stageMarkup(); document.getElementById('chart')?.before(host); }
    const o=d.observation, back=o.phase==='backfill', range=host.querySelector('[data-ex-depth]');
    range.max=d.height; range.value=back?d.height-o.depth:o.depth; range.setAttribute('aria-label',back?'되메움 진행량':'현재 굴착 깊이');
    host.querySelector('[data-ex-depth-label]').textContent=`${back?'되메움면':'굴착'} H ${f(o.depth)} m${back?` · 채운 높이 ${f(d.height-o.depth)} m`:''}`;
    host.querySelectorAll('[data-phase]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.phase===o.phase)));
    host.querySelector('[data-ex-start]').textContent=back?`굴착 완료 ${f(d.height)} m`:'굴착 전 0 m';
    host.querySelector('[data-ex-end]').textContent=back?'되메움 완료 0 m':`최종 굴착 ${f(d.height)} m`;
    const events=stages(d), at=events.filter(p=>Math.abs(p.depth-o.depth)<1e-7);
    const groups=[...new Set(events.map(p=>p.depth))].map(depth=>({depth,items:events.filter(p=>p.depth===depth)}));
    host.querySelector('[data-ex-event-track]').innerHTML=groups.map(group=>`<button type="button" data-ex-event="${group.items[0].index}" data-ex-event-depth="${group.depth}" style="left:${100*(back?d.height-group.depth:group.depth)/d.height}%" aria-label="${e(group.items.map(p=>`${p.index+1}단 ${p.label}`).join(' · '))}, 작업면 깊이 ${f(group.depth)} m">${group.items.map(p=>d.supports[p.index].type==='slab'?'S':p.index+1).join('·')}</button>`).join('');
    const eventSide=host.querySelector('[data-ex-event-side]'); eventSide.hidden=!at.length;
    if(at.length){const prestressed=!back&&at.some(p=>(d.supports[p.index].preload||0)>0),replacement=back&&at.some(p=>d.supports[p.index].type==='slab');eventSide.innerHTML=(replacement?[['before','대체 지지 연결 전'],['installed','연결 후 · 기존 지보 해체 전'],['after','기존 지보 해체 후']]:prestressed?[['before','설치 전'],['installed','설치 후 · 긴장 전'],['after','긴장 후']]:[['before',back?'해체 전':'설치 전'],['after',back?'해체 후':'설치 후']]).map(([v,t])=>`<option value="${v}" ${o.eventSide===v?'selected':''}>${t}</option>`).join('');}
    const s=selectedSupport(d), summary=host.querySelector('[data-ex-stage-summary]');
    summary.textContent=at.length?`${at.map(p=>`${d.supports[p.index].type==='slab'?'대체 지지':(p.index+1)+'단'} ${p.label}`).join(' · ')} · 같은 깊이에서 사건 전후 비교`:s?`선택 ${selected+1}단 z=${f(s.z)} m · ${back?'해체':'설치'} H=${f(back?release(d,s):installation(d,s))} m`:'임시 지보 없음 · 작업면 깊이에 따른 벽체 반응';
  }
  function resultRows(r, d) {
    if(d.observation.resultMode==='increment')return r.incrementProfile||[];
    return r.profile||[];
  }
  const measures = [{key:'pressure',label:'토압',unit:'kPa',scale:1},{key:'displacement',label:'변위',unit:'mm',scale:1000},{key:'shear',label:'전단력',unit:'kN/m',scale:1},{key:'moment',label:'모멘트',unit:'kN·m/m',scale:1}];
  function render({data:d,result:r,baseline:b,baselineData:bd}) {
    frame={d,r,b,bd};
    const current = r.profile||[], forces=r.supportForces||[], stable=r.valid&&r.status!=='nonconverged';
    return {title:'굴착·지보 설치·되메움에 따라 벽은 어떻게 반응할까요?',conditions:['폭 1 m 벽체 + 평면 지보','원지반 1종 · 되메움토 1종',d.observation.mode==='shape'?'현재 형상 · 탄성 가정':'시공 이력 · 탄소성',`${d.observation.wallId||'A'}벽 · 위치 ${f(d.observation.position??.5)}`],plotTitle:'같은 깊이에서 토압·변위·전단력·모멘트 비교',comparisonPlot:!!b,
      legend:'<span class="legend-item"><i></i>현재</span>',
      chart:`<div class="ex-workspace"><div class="ex-chart-grid"><section><h3>현재 단면 <small>깊이 m</small></h3><svg data-ex-section role="img" aria-label="현재 굴착 단면과 지보 상태"></svg></section>${measures.map(m=>`<section><h3>${m.label} <small>${m.unit}</small></h3><svg data-ex-plot="${m.key}" role="img" aria-label="깊이별 ${m.label}"></svg>${m.key==='pressure'?`<div class="ex-pressure-legend">${!d.observation.resultMode||d.observation.resultMode==='total'?'<span class="ex-back-key">배면</span><span class="ex-front-key">굴착측</span>':''}<span class="ex-net-key">순압</span></div>`:''}</section>`).join('')}</div><div class="ex-cursor-readout" data-ex-cursor-readout></div><details class="ex-plan-detail"><summary>평면 배치와 관찰 위치</summary><div class="ex-plan-row"><svg data-ex-plan role="img" aria-label="평면 부재와 선택한 벽 위치"></svg><div data-ex-plan-summary></div></div></details><p class="chart-caption">토압은 수압을 포함합니다. 배면은 +, 굴착측은 −방향으로 표시하고 두 작용을 합한 값이 순압입니다. 변위 +는 굴착측이며 회색 원위치와 별도로 변형선만 확대합니다.</p></div>`,
      results:stable?metric('최대 |변위|',r.maxDisplacement*1000,'mm',b?.maxDisplacement!=null?b.maxDisplacement*1000:null,true,2)+metric('최대 |전단력|',r.maxShear,'kN/m',b?.maxShear??null)+metric('최대 |모멘트|',r.maxMoment,'kN·m/m',b?.maxMoment??null):'<div class="error-box">현재 단계에서 평형해를 확정하지 못했습니다. 발산한 곡선을 결과로 표시하지 않습니다.</div>',
      explanation:`<strong>${d.observation.phase==='backfill'?'최종 굴착의 응력·변형 상태에서 되메움과 해체를 이어 계산합니다.':'굴착이 진행되며 지반 작용이 바뀌고, 지보는 설치 시점의 변위를 기준으로 작동합니다.'}</strong>${d.observation.mode==='shape'?'<span class="notice">현재 형상은 지정된 무변형 기준에서 별도로 재하한 탄성 이상화입니다. 시공 이력과의 차이 전부를 누적변형으로 해석하지 않습니다.</span>':''}<details class="ex-force-detail"><summary>지보 축력 · 결과 내보내기</summary><table class="ex-force-table"><thead><tr><th>지보</th><th>상태</th><th>최대 1본 축력 kN</th><th>벽 반력 kN/m</th></tr></thead><tbody>${forces.map((s,i)=>`<tr><td>${i+1} · ${e(typeName(s.type))}</td><td>${e(({planned:'설치 전',installed:'설치 후',active:'작동',released:'해체·해제',retained:'잔존'})[s.state]||s.state)}</td><td>${f(s.force)}</td><td>${f(s.reaction)}</td></tr>`).join('')}</tbody></table><div class="ex-export-actions"><button type="button" data-ex-export="csv">총결과 CSV</button><button type="button" data-ex-export="svg">현재 다섯 그림 SVG</button></div></details>`,
      theory:`<h3>시공 이력을 보존하는 벽체–지반–지보 평형</h3><div class="theory-formula">EI·w⁗ = p순 − 지보 반력<br>H설치 = z지보 + Δh설치<br>H해체 = z지보 + Δh해체<br>지보력은 설치 기준 상대변위와 초기작용력에서 계산</div><p>요소 길이 ${f(d.mesh)} m · 기본 굴착 증분 ${f(d.increment)} m. 되메움의 초기압과 물성은 원지반과 별도입니다. 지반의 주동·수동 한계, 접촉과 지보의 일방향 작동 때문에 강성이 변할 수 있습니다.</p><p>모형 전체 평형 잔차: 힘 ${f(r.residuals?.force,5)} kN · 모멘트 ${f(r.residuals?.moment,5)} kN·m. 계산 단계 ${r.diagnostics?.steps??'—'}회.</p>`,
      method:`<h3>결과의 범위</h3><p>벽체 보, 탄소성 지반 반력과 평면 지보의 결합 학습 모형입니다. 주변 지반 침하, 3차원 지반 아칭, 연속벽 판 거동, 독립 보강사면과 암반 절리 블록의 안정은 이 네 그래프의 결과가 아닙니다. 같은 물성·연결조건의 네일과 락볼트가 같은 벽체 결과를 보일 수 있습니다.</p><p>${(r.diagnostics?.assumptions||[]).map(e).join(' · ')}</p><p>수렴하지 않은 상태는 붕괴 안전율로 바꾸어 표시하지 않습니다. 화면에서 계산한 축력은 부재·정착부의 설계 적합 판정이 아닙니다.</p>`};
  }
  const svgNode=(svg,tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
  function drawPlots() {
    if(!frame||!document.querySelector('.ex-workspace'))return;
    const {d,r,b,bd}=frame, rows=resultRows(r,d), baseline=b?resultRows(b,{...(bd||d),observation:d.observation}):[], length=d.height+d.embedment;
    const key=JSON.stringify({...d,observation:undefined}); if(key!==domainKey){domainKey=key;domains={};}
    for(const m of measures){const svg=document.querySelector(`[data-ex-plot="${m.key}"]`);if(!svg)continue;const w=svg.clientWidth,h=310;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.replaceChildren();
      const envelope=d.observation.resultMode==='envelope'?r.envelope?.profile:null, cap=m.key[0].toUpperCase()+m.key.slice(1), values=[...rows,...baseline].map(p=>p[m.key]*m.scale).filter(Number.isFinite),sides=m.key==='pressure'&&(!d.observation.resultMode||d.observation.resultMode==='total');
      if(sides)rows.forEach(p=>{if(Number.isFinite(p.retainedTotalPressure))values.push(p.retainedTotalPressure);if(Number.isFinite(p.excavationTotalPressure))values.push(-p.excavationTotalPressure);});
      if(envelope)envelope.forEach(p=>{for(const k of ['min'+cap,'max'+cap])if(Number.isFinite(p[k]))values.push(p[k]*m.scale);});
      let lo=Math.min(0,...values),hi=Math.max(0,...values);if(lo===hi){lo=-1;hi=1;}const pad=(hi-lo)*.08;lo-=pad;hi+=pad;const prior=domains[m.key];if(prior){lo=Math.min(lo,prior[0]);hi=Math.max(hi,prior[1]);}if(lockedDomains?.[m.key])[lo,hi]=lockedDomains[m.key];domains[m.key]=[lo,hi];
      const left=26,right=Math.max(left+20,w-9),top=17,bottom=270,x=v=>left+(v-lo)/(hi-lo)*(right-left),y=z=>top+z/length*(bottom-top);
      for(const frac of [0,.25,.5,.75,1]){const z=frac*length;svgNode(svg,'line',{x1:left,x2:right,y1:y(z),y2:y(z),class:'grid'});svgNode(svg,'text',{x:left-5,y:y(z)+4,'text-anchor':'end'},f(z,1));}
      for(const [v,anchor]of [[lo,'start'],[hi,'end']])svgNode(svg,'text',{x:x(v),y:288,'text-anchor':anchor},f(v,1));svgNode(svg,'line',{x1:x(0),x2:x(0),y1:top,y2:bottom,class:'axis'});
      const defs=svgNode(svg,'defs'),clip=svgNode(defs,'clipPath',{id:`ex-clip-${m.key}`});svgNode(clip,'rect',{x:left,y:top,width:right-left,height:bottom-top});
      const line=(points,value,kind='ex-current')=>{const clean=points.filter(p=>Number.isFinite(value(p))&&Number.isFinite(p.z));if(!clean.length)return;svgNode(svg,'path',{d:clean.map((p,i)=>`${i?'L':'M'}${x(value(p))} ${y(p.z)}`).join(' '),class:kind,fill:'none','clip-path':`url(#ex-clip-${m.key})`});};
      if(sides){line(rows,p=>p.retainedTotalPressure,'ex-pressure-back');line(rows,p=>-p.excavationTotalPressure,'ex-pressure-front');}
      if(envelope){line(envelope,p=>p['min'+cap]*m.scale,'ex-envelope');line(envelope,p=>p['max'+cap]*m.scale,'ex-envelope');}else line(rows,p=>p[m.key]*m.scale);
      if(baseline.length)line(baseline,p=>p[m.key]*m.scale,'baseline');
      svgNode(svg,'line',{x1:left,x2:right,y1:y(cursor),y2:y(cursor),class:'ex-depth-guide','data-ex-guide':''});
      svgNode(svg,'text',{x:left,y:306},'깊이 m'); svg.dataset.depthLength=length;svg.dataset.depthTop=top;svg.dataset.depthBottom=bottom;
      if(!rows.length&&!envelope)svgNode(svg,'text',{x:(left+right)/2,y:140,'text-anchor':'middle'},'해당 결과 없음');
      if(lockedDomains&&values.some(v=>v<lo||v>hi))svgNode(svg,'text',{x:(left+right)/2,y:12,'text-anchor':'middle',class:'ex-range-warning'},'고정 축 밖 값 있음');
    }
    drawSection(d,r);drawPlan(d);updateReadout();
  }
  function drawSection(d,r) {
    const svg=document.querySelector('[data-ex-section]');if(!svg)return;const w=svg.clientWidth,h=310,L=d.height+d.embedment,top=17,bottom=270,y=z=>top+z/L*(bottom-top),wall=w*.51,left=25,H=d.observation.depth;
    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.dataset.depthLength=L;svg.dataset.depthTop=top;svg.dataset.depthBottom=bottom;
    svgNode(svg,'rect',{x:wall,y:top,width:w-wall-3,height:bottom-top,class:'ex-soil'});const bottomSoil=d.observation.phase==='backfill'?d.height:H;svgNode(svg,'rect',{x:left,y:y(bottomSoil),width:wall-left,height:bottom-y(bottomSoil),class:'ex-soil'});if(d.observation.phase==='backfill')svgNode(svg,'rect',{x:left,y:y(H),width:wall-left,height:y(d.height)-y(H),class:'ex-fill'});
    for(const z of [0,L/2,L])svgNode(svg,'text',{x:20,y:y(z)+4,'text-anchor':'end'},f(z,1));
    svgNode(svg,'line',{x1:wall,x2:wall,y1:top,y2:bottom,class:'ex-wall'});svgNode(svg,'line',{x1:left,x2:wall,y1:y(H),y2:y(H),class:'axis'});
    const appliedWater=r.appliedWater;
    if(appliedWater){for(const [depth,x1,x2]of [[appliedWater.retained,wall,w-3],[appliedWater.excavation,left,wall]])if(Number.isFinite(depth)&&depth>=0&&depth<=L)svgNode(svg,'line',{x1,x2,y1:y(depth),y2:y(depth),class:'ex-water-line'});}
    const max=Math.max(...(r.profile||[]).map(p=>Math.abs(p.displacement)),1e-9), magnification=Math.min(100,Math.max(1,.1*L/max));
    if(r.profile?.length)svgNode(svg,'path',{d:r.profile.map((p,i)=>`${i?'L':'M'}${wall-p.displacement*magnification*(bottom-top)/L} ${y(p.z)}`).join(' '),class:'ex-current',fill:'none'});
    d.supports.forEach((s,i)=>{const force=r.supportForces?.find(v=>v.id===s.id),active=force&&!['planned','released'].includes(force.state),right=['anchor','nail','rock'].includes(s.type),x2=right?w-9:left+4,z2=s.type==='raker'?Math.min(d.height,s.z+Math.max(1,(s.length??10)*Math.sin((s.angle??35)*Math.PI/180))):right?s.z+Math.min(2,(s.length??10)*Math.sin((s.angle??10)*Math.PI/180)):s.z;
      svgNode(svg,'line',{x1:wall,x2,y1:y(s.z),y2:y(z2),class:`ex-support ${active?'':'ex-inactive'}`,'data-ex-support':i});svgNode(svg,'circle',{cx:wall,cy:y(s.z),r:4,class:'ex-support-point','data-ex-support':i});if(s===selectedSupport(d))svgNode(svg,'text',{x:left,y:y(s.z)-8},`${i+1}단`);
    });
    svgNode(svg,'text',{x:left,y:288},`변형 ×${f(magnification,0)}`);svgNode(svg,'text',{x:left,y:306},appliedWater?`수위 ${f(appliedWater.excavation,1)} / ${f(appliedWater.retained,1)} m`:'회색: 원위치');svgNode(svg,'line',{x1:left,x2:w-3,y1:y(cursor),y2:y(cursor),class:'ex-depth-guide','data-ex-guide':''});
  }
  function drawPlan(d) {
    const svg=document.querySelector('[data-ex-plan]'),summary=document.querySelector('[data-ex-plan-summary]');if(!svg||!summary)return;
    let geometry,levelGeometry;try{if(typeof ExcavationPlanar!=='undefined'){geometry=ExcavationPlanar.geometry(d);const s=selectedSupport(d);levelGeometry=s?ExcavationPlanar.geometry(d,s):{members:[]};}}catch{}
    const w=svg.clientWidth||280,h=180,lx=d.plan.lx,ly=d.plan.ly,scale=Math.min((w-60)/lx,130/ly),x=v=>30+v*scale,y=v=>22+v*scale;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.replaceChildren();svgNode(svg,'rect',{x:x(0),y:y(0),width:lx*scale,height:ly*scale,class:'ex-plan-box'});
    if(levelGeometry?.members)levelGeometry.members.forEach(m=>{const attrs={x1:x(m.a.x),x2:x(m.b.x),y1:y(m.a.y),y2:y(m.b.y)};svgNode(svg,'line',{...attrs,class:'ex-plan-member'});svgNode(svg,'line',{...attrs,class:'ex-member-hit','data-ex-member':m.id});});
    if(geometry?.strips)geometry.strips.forEach(strip=>svgNode(svg,'circle',{cx:x(strip.x),cy:y(strip.y),r:6,class:'ex-strip-point','data-ex-wall':strip.wallId,'data-ex-position':strip.position,role:'button','aria-label':`${strip.wallId}벽 위치 ${f(strip.position)}`}));
    const wall=frame?.r.selectedStrip?.wallId||d.observation.wallId||'A',t=frame?.r.selectedStrip?.position??d.observation.position??.5,positions={A:[lx*t,0],B:[lx,ly*t],C:[lx*(1-t),ly],D:[0,ly*(1-t)]},p=positions[wall]||positions.A;
    svgNode(svg,'circle',{cx:x(p[0]),cy:y(p[1]),r:5,class:'ex-selected-point'});for(const[id,point]of Object.entries({A:[lx/2,0],B:[lx,ly/2],C:[lx/2,ly],D:[0,ly/2]}))svgNode(svg,'text',{x:x(point[0])+(id==='B'?12:id==='D'?-12:0),y:y(point[1])+(id==='A'?-8:id==='C'?17:4),'text-anchor':'middle'},id);
    summary.innerHTML=`<strong>${e(wall)}벽 · 계산 위치 ${f(t)}</strong><br>${f(lx)} × ${f(ly)} m${geometry?.members?`<br>${selectedSupport(d)?`선택 단 평면 ${levelGeometry?.members?.length??0}본 · `:''}전체 평면 지보 ${geometry.members.length}본`:''}<br><span class="ex-small">평면 점 또는 벽·위치 입력으로 계산 띠를 선택합니다. 부재를 누르면 실제 길이와 축력을 표시합니다.</span><div data-ex-member-readout aria-live="polite"></div>`;
  }
  function interpolate(rows,z,key){if(!rows?.length)return null;let hi=rows.findIndex(p=>p.z>=z);if(hi<0)hi=rows.length-1;if(hi===0)return rows[0][key];const a=rows[hi-1],b=rows[hi],t=(z-a.z)/(b.z-a.z||1);return a[key]+(b[key]-a[key])*t;}
  function updateReadout(){const el=document.querySelector('[data-ex-cursor-readout]');if(!el||!frame)return;const rows=resultRows(frame.r,frame.d),sides=(!frame.d.observation.resultMode||frame.d.observation.resultMode==='total')?`배면 ${f(interpolate(rows,cursor,'retainedTotalPressure'))} / 굴착측 ${f(interpolate(rows,cursor,'excavationTotalPressure'))} kPa · `:'';el.textContent=`깊이 ${f(cursor)} m · ${sides}${measures.map(m=>{const value=interpolate(rows,cursor,m.key);return `${m.key==='pressure'?'순압':m.label} ${value==null?'—':f(value*m.scale)} ${m.unit}`;}).join(' · ')}`;}
  function compute(d){return ExcavationStaged.analyze(d,d.observation,{planarProvider:ExcavationPlanar,envelope:d.observation?.resultMode==='envelope'});}
  function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportCsv(){if(!frame?.r.valid)return;const{d,r}=frame,o=d.observation,meta=[o.phase,o.depth,o.mode,r.selectedStrip?.wallId||o.wallId,r.selectedStrip?.position??o.position],soil=[d.soil.gamma,d.soil.c,d.soil.phi,d.soil.kh,d.fill.gamma,d.fill.c,d.fill.phi,d.fill.kh],rows=[['record','phase','H_m','mode','wall','position','z_m','retained_kPa','excavation_kPa','net_kPa','u_mm','V_kN_per_m','M_kNm_per_m','support_id','support_type','support_state','max_axial_kN','wall_reaction_kN_per_m','soil_gamma','soil_c','soil_phi','soil_kh','fill_gamma','fill_c','fill_phi','fill_kh']];for(const p of r.profile)rows.push(['profile',...meta,p.z,p.retainedTotalPressure,p.excavationTotalPressure,p.pressure,p.displacement*1000,p.shear,p.moment,'','','','','',...soil]);for(const s of r.supportForces)rows.push(['support',...meta,s.z,'','','','','','',s.id,s.type,s.state,s.force,s.reaction,...soil]);const cell=v=>{if(v==null)return '';if(typeof v==='number')return Number.isFinite(v)?String(v):'';let text=String(v);if(/^[=+\-@]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};download('\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'),'excavation-results.csv','text/csv;charset=utf-8');}
  function exportSvg(){
    if(!frame?.r.valid)return;
    const plots=[...document.querySelectorAll('.ex-chart-grid svg')];if(plots.length!==5)return;
    const width=plots.reduce((sum,svg)=>sum+svg.clientWidth,0)+48,height=406,out=document.createElementNS('http://www.w3.org/2000/svg','svg');
    out.setAttribute('xmlns','http://www.w3.org/2000/svg');out.setAttribute('width',width);out.setAttribute('height',height);out.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const textColor=getComputedStyle(document.body).color,bg=getComputedStyle(document.querySelector('.visual-panel')).backgroundColor,o=frame.d.observation;
    svgNode(out,'rect',{width,height,fill:bg});
    svgNode(out,'text',{x:12,y:20,fill:textColor,'font-size':13,'font-family':'sans-serif'},`${o.phase==='backfill'?'되메움':'굴착'} H=${f(o.depth)} m · ${o.mode==='shape'?'현재 형상 · 탄성 가정':'시공 이력 · 탄소성'} · ${{total:'총결과',increment:'직전 증분 변화',envelope:'최대·최소 포락선'}[o.resultMode||'total']}`);
    const legends=(!o.resultMode||o.resultMode==='total')?[['.ex-pressure-back','배면(+)'],['.ex-pressure-front','굴착측(−)'],['.ex-current','순압']]:[[o.resultMode==='envelope'?'.ex-envelope':'.ex-current','순압']];
    if(plots[1].querySelector('.baseline'))legends.push(['.baseline','기준안']);
    legends.forEach(([selector,label],i)=>{const source=plots[1].querySelector(selector);if(!source)return;const style=getComputedStyle(source),x=12+i*108;svgNode(out,'line',{x1:x,x2:x+20,y1:37,y2:37,stroke:style.stroke,'stroke-width':style.strokeWidth,'stroke-dasharray':style.strokeDasharray});svgNode(out,'text',{x:x+26,y:41,fill:textColor,'font-size':11,'font-family':'sans-serif'},label);});
    let x=12;
    plots.forEach((source,i)=>{
      const clone=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],clones=[clone,...clone.querySelectorAll('*')];
      originals.forEach((node,index)=>{const style=getComputedStyle(node);for(const prop of ['fill','stroke','stroke-width','stroke-dasharray','opacity','font-family','font-size','font-weight','text-anchor'])clones[index].setAttribute(prop,style.getPropertyValue(prop));for(const attr of [...clones[index].attributes])if(attr.name.startsWith('data-')||attr.name==='class')clones[index].removeAttribute(attr.name);});
      clone.setAttribute('x',x);clone.setAttribute('y',76);clone.setAttribute('width',source.clientWidth);clone.setAttribute('height',310);out.append(clone);
      svgNode(out,'text',{x,y:63,fill:textColor,'font-size':12,'font-family':'sans-serif'},i===0?'현재 단면 · m':`${measures[i-1].label} · ${measures[i-1].unit}`);x+=source.clientWidth+6;
    });
    download(new XMLSerializer().serializeToString(out),'excavation-diagrams.svg','image/svg+xml;charset=utf-8');
  }
  function get(path,d){if(path.startsWith('support.'))return selectedSupport(d)?.[path.slice(8)];return path.split('.').reduce((o,k)=>o?.[k],d);}
  function set(path,value,d){if(path.startsWith('slab.')){const slab=d.supports.find(s=>s.type==='slab');if(slab)slab[path.slice(5)]=value;return;}if(path.startsWith('support.')){const s=selectedSupport(d);if(s)s[path.slice(8)]=value;return;}const keys=path.split('.'),last=keys.pop(),target=keys.reduce((o,k)=>o[k]||(o[k]={}),d);target[last]=value;}
  function setSupportType(d,type){
    if(!types.some(([key])=>key===type))return;
    for(const s of d.supports){
      if(s.type==='slab'||s.type===type)continue;
      const wasHorizontal=['strut','corner'].includes(s.type);
      s.type=type;s.retained=['nail','rock'].includes(type);
      if(type==='nail')s.preload=0;
      if(['strut','corner'].includes(type))s.angle=0;
      // A planar brace's enforced 0° is not an inclined support's input angle.
      else if(wasHorizontal||!Number.isFinite(s.angle)||s.angle===0)s.angle=type==='raker'?35:15;
    }
  }
  function mutate(callback,full=true){const d=adapter?.getData();if(!d||rendering)return;rendering=true;try{adapter.begin();callback(d);adapter.commit();(full?adapter.render:adapter.renderOutputs)();}finally{rendering=false;}}
  function install(api) {
    adapter=api;
    const refresh=()=>{const d=api.getData();refreshStage(d);if(d){resize?.disconnect();const workspace=document.querySelector('.ex-workspace');if(workspace){resize=new ResizeObserver(drawPlots);resize.observe(workspace);drawPlots();}}};
    const observer=new MutationObserver(refresh);for(const id of ['controls','chart']){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true});}
    document.addEventListener('change',event=>{
      const input=event.target,d=api.getData();if(!d||rendering)return;
      if(input.matches('[data-ex-axis-lock]')){lockedDomains=input.checked?copy(domains):null;drawPlots();return;}
      if(input.matches('[data-ex-corner]')){mutate(v=>{const index=Number(input.dataset.exCorner);v.plan.corners=input.checked?[...v.plan.corners,index].sort():v.plan.corners.filter(i=>i!==index);});return;}
      if(input.matches('[data-ex-depth]')){if(editing){editing=false;api.commit();}return;}
      if(input.matches('[data-ex-event-side]')){mutate(v=>{v.observation.eventSide=input.value;},false);return;}
      const path=input.dataset.exField;if(!path)return;
      if(path==='selected'){selected=Number(input.value);cursor=selectedSupport(d).z;api.render();return;}
      const nullable=['support.capacity','support.bondStiffness','support.baseStiffness','soil.k0','fill.k0'].includes(path);
      let value=input.type==='checkbox'?input.checked:input.type==='number'?(input.value===''&&nullable?null:Number(input.value)):input.value;
      if(input.type==='number'&&value!==null&&(!Number.isFinite(value)||input.value==='')){input.setAttribute('aria-invalid','true');return;}
      mutate(v=>{
        if(path==='count'){const count=Number(value),slabs=v.supports.filter(s=>s.type==='slab');v.supports=v.supports.filter(s=>s.type!=='slab');while(v.supports.length<count){const i=v.supports.length,prior=v.supports.at(-1)||ExcavationStaged.defaults.supports[0],available=v.height-v.clearance-(i?prior.z:0),z=(i?prior.z:0)+available/(count-i+1);v.supports.push({...copy(prior),id:'support-'+(i+1),z:Number(z.toFixed(2)),installClearance:null,releaseClearance:null});}v.supports.length=count;v.supports.push(...slabs);selected=Math.min(selected,count-1);}
        else if(path==='supportType')setSupportType(v,value);
        else if(path==='slab.enabled'){if(value){const base=selectedSupport(v)||{z:v.height/4};v.supports.push({id:'replacement-slab',type:'slab',z:base.z,activateAtBackfill:release(v,base),stiffness:500000,preload:0,angle:0,spacing:1,length:v.plan.lx,capacity:1000000,retained:true});}else v.supports=v.supports.filter(s=>s.type!=='slab');}
        else if(path==='support.installOverride')selectedSupport(v).installClearance=value?v.clearance:null;
        else if(path==='support.releaseOverride')selectedSupport(v).releaseClearance=value?(v.releaseLinked?(selectedSupport(v).installClearance??v.clearance):v.releaseClearance):null;
        else if(path==='plan.cornerCount')v.plan.corners=Array.from({length:Number(value)},(_,i)=>i);
        else set(path,['plan.membersPerCorner'].includes(path)?Number(value):value,v);
        if(path==='observation.mode'&&value==='shape')v.observation.resultMode='total';
        if(['soil.kh','fill.kh'].includes(path))khReference[path.split('.')[0]]=value;
      });
    });
    document.addEventListener('input',event=>{const input=event.target;if(!input.matches('[data-ex-depth]'))return;const d=api.getData();if(!d)return;if(!editing){api.begin();editing=true;}d.observation.depth=d.observation.phase==='backfill'?d.height-Number(input.value):Number(input.value);d.observation.eventSide='after';api.renderOutputs();refreshStage(d);});
    document.addEventListener('click',event=>{
      const d=api.getData();if(!d)return;const phase=event.target.closest('[data-ex-action="phase"]'),marker=event.target.closest('[data-ex-event]'),support=event.target.closest('[data-ex-support]'),wall=event.target.closest('[data-ex-wall]'),material=event.target.closest('[data-ex-action="copy-soil"]'),kh=event.target.closest('[data-ex-kh]'),exportButton=event.target.closest('[data-ex-export]'),member=event.target.closest('[data-ex-member]');
      if(phase)mutate(v=>{v.observation.phase=phase.dataset.phase;v.observation.depth=phase.dataset.phase==='backfill'?v.height:0;v.observation.eventSide='before';},false);
      else if(marker)mutate(v=>{v.observation.depth=Number(marker.dataset.exEventDepth);v.observation.eventSide='after';},false);
      else if(support){const index=Number(support.dataset.exSupport);if(d.supports[index]?.type!=='slab'){selected=index;cursor=selectedSupport(d).z;api.render();}}
      else if(wall)mutate(v=>{v.observation.wallId=wall.dataset.exWall;v.observation.position=Number(wall.dataset.exPosition);});
      else if(material)mutate(v=>{v.fill={...v.fill,...copy(v.soil)};khReference.fill=v.fill.kh;});
      else if(kh)mutate(v=>{const name=kh.dataset.exKh;v[name].kh=khReference[name]*Number(kh.dataset.exRatio);});
      else if(exportButton){if(exportButton.dataset.exExport==='csv')exportCsv();else exportSvg();}
      else if(member){const id=member.dataset.exMember,g=ExcavationPlanar.geometry(d).members.find(m=>m.id===id),support=frame.r.supportForces.find(s=>s.id===g?.supportId),force=support?.members?.find(m=>m.id===id);const target=document.querySelector('[data-ex-member-readout]');if(g&&target)target.textContent=`길이 ${f(g.length)} m · ${g.a.wallId}벽 ${f(g.a.s)} m ↔ ${g.b.wallId}벽 ${f(g.b.s)} m · ${force?`1본 축력 ${f(force.force)} kN`:`단면 모형 최대 1본 축력 ${f(support?.force)} kN`}`;}
    });
    function point(event){const svg=event.target.closest('[data-ex-plot],[data-ex-section]');if(!svg||!frame)return;const rect=svg.getBoundingClientRect(),viewH=310,py=(event.clientY-rect.top)/rect.height*viewH;cursor=Math.max(0,Math.min(Number(svg.dataset.depthLength),(py-Number(svg.dataset.depthTop))/(Number(svg.dataset.depthBottom)-Number(svg.dataset.depthTop))*Number(svg.dataset.depthLength)));document.querySelectorAll('[data-ex-guide]').forEach(line=>{const owner=line.ownerSVGElement,y=Number(owner.dataset.depthTop)+cursor/Number(owner.dataset.depthLength)*(Number(owner.dataset.depthBottom)-Number(owner.dataset.depthTop));line.setAttribute('y1',y);line.setAttribute('y2',y);});updateReadout();}
    document.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'||event.buttons)point(event);});document.addEventListener('pointerdown',point);
    refresh();
  }
  const lab={key:'excavation',meta:{name:'흙막이 시공과정',sub:'굴착·지보·되메움·해체',group:'토압·굴착·사면 / 흙막이 시공과정',navGroup:'retaining',words:'흙막이 굴착 앵커 네일 버팀 스트럿 코너 레이커 락볼트 지보 설치 해체 되메움 근입 탄소성 변위 전단력 모멘트',questions:[['construction','시공과정']]},defaults:{modelVersion:2,...copy(ExcavationStaged.defaults),observation:{phase:'excavation',depth:0,eventSide:'before',mode:'history',wallId:'A',position:.5,resultMode:'total'}},bounds:{},labels:{height:['최종 굴착','m'],embedment:['근입','m'],EI:['벽체 EI','kN·m²/m'],clearance:['공통 작업 여유','m']},controls,compute,render};
  return {lab,install,controls,render,compute};
})();
