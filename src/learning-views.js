/* Linked explanatory views. Geometry and classification remain in separate pure models. */
function exactDisplay(n){return Number.isFinite(n)?Number(n.toPrecision(12)).toLocaleString('ko-KR',{maximumFractionDigits:8}):'—';}
function chartPlasticity(p,b){
 const xmax=Math.max(p.displayDomain.xMax,b?.displayDomain.xMax||0),ymax=Math.max(p.displayDomain.yMax,b?.displayDomain.yMax||0);
 const x=v=>58+v/xmax*550,y=v=>279-v/ymax*236;
 const points=a=>a.map(([xx,yy])=>`${x(xx)},${y(yy)}`).join(' ');
 let s='<defs><clipPath id="plasticity-clip"><rect x="58" y="43" width="550" height="236"/></clipPath></defs>';
 s+='<g clip-path="url(#plasticity-clip)"><rect x="58" y="43" width="550" height="236" fill="#F2F3F6"/>';
 s+=`<polygon points="${points([[50,Plasticity.aAt(50)],[xmax,Plasticity.aAt(xmax)],[xmax,ymax],[50,ymax]])}" fill="#E7D7F8" opacity=".5"/>`;
 s+=`<polygon points="${points([[0,7],[20+7/.73,7],[50,Plasticity.aAt(50)],[50,ymax],[0,ymax]])}" fill="#DCEAFF"/>`;
 s+=`<polygon points="${points([[0,4],[20+4/.73,4],[20+7/.73,7],[0,7]])}" fill="#FFE3BA"/>`;
 const xstep=xmax<=150?20:10**Math.floor(Math.log10(xmax/4)),ystep=ymax<=100?10:10**Math.floor(Math.log10(ymax/4));
 for(let v=0;v<=xmax;v+=xstep)s+=`<line x1="${x(v)}" x2="${x(v)}" y1="43" y2="279" class="grid"/>`;
 for(let v=0;v<=ymax;v+=ystep)s+=`<line x1="58" x2="608" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
 s+=`<path d="M${x(0)} ${y(4)}H${x(20+4/.73)}L${x(xmax)} ${y(Plasticity.aAt(xmax))}" fill="none" stroke="#1D1F24" stroke-width="2"/>
 <path d="M${x(16)} ${y(0)}V${y(Plasticity.uAt(16))}L${x(xmax)} ${y(Plasticity.uAt(xmax))}" fill="none" stroke="#986227" stroke-width="1.5" stroke-dasharray="5 4"/>
 <line x1="${x(50)}" x2="${x(50)}" y1="43" y2="279" stroke="#737373" stroke-dasharray="3 4"/>
 <path d="M${x(0)} ${y(4)}H${x(20+4/.73)} M${x(0)} ${y(7)}H${x(20+7/.73)}" stroke="#A76B1A" fill="none"/>
 <text x="${x(33)}" y="${y(Math.min(42,ymax*.65))}" text-anchor="middle" style="font-weight:700;fill:#24477B">CL</text>
 <text x="${x(Math.min(xmax*.77,85))}" y="${y(Math.min(ymax*.78,60))}" style="font-weight:700;fill:#713596">CH</text>
 <text x="${x(40)}" y="${y(8)}" style="font-weight:700;fill:#555B66">ML</text>
 <text x="${x(Math.min(xmax*.78,90))}" y="${y(23)}" style="font-weight:700;fill:#555B66">MH</text>`;
 // These are trial/test points, not whole-soil group symbols.
 if(b?.point)s+=`<circle data-plasticity-baseline cx="${x(b.point.ll)}" cy="${y(b.point.pi)}" r="6" fill="white" stroke="#737373" stroke-width="2" stroke-dasharray="3 2"/>`;
 if(p.point)s+=`<line x1="58" x2="${x(p.point.ll)}" y1="${y(p.point.pi)}" y2="${y(p.point.pi)}" stroke="#0F6FFF" stroke-dasharray="3 4" opacity=".55"/><line x1="${x(p.point.ll)}" x2="${x(p.point.ll)}" y1="${y(p.point.pi)}" y2="279" stroke="#0F6FFF" stroke-dasharray="3 4" opacity=".55"/><circle data-plasticity-point cx="${x(p.point.ll)}" cy="${y(p.point.pi)}" r="6" fill="#0F6FFF" stroke="white" stroke-width="2"/>`;
 s+='</g>';
 for(let v=0;v<=xmax;v+=xstep)s+=`<text x="${x(v)}" y="298" text-anchor="middle">${fmt(v,0)}</text>`;
 for(let v=0;v<=ymax;v+=ystep)s+=`<text x="46" y="${y(v)+4}" text-anchor="end">${fmt(v,0)}</text>`;
 s+=`<line class="axis" x1="58" x2="608" y1="279" y2="279"/><line class="axis" x1="58" x2="58" y1="43" y2="279"/><text x="58" y="24">소성지수 PI (%)</text><text x="608" y="325" text-anchor="end">액성한계 LL (%)</text><text x="${x(50)}" y="35" text-anchor="middle">LL = 50</text>`;
 s+=`<text x="608" y="24" text-anchor="end" style="fill:#0B4FB5;font-weight:600">${p.point?`현재 LL ${exactDisplay(p.point.ll)} · PI ${exactDisplay(p.point.pi)}`:p.status==='nonplastic'?'NP · 점 표시 안 함':'LL·PL 입력 필요'}</text>`;
 return svgWrap(s,'소성도표. 가로축 액성한계 LL, 세로축 소성지수 PI. A선, U선, LL 50 경계와 현재 시험값.')+`<div class="chart-caption"><span><b>A선</b> 사선 PI=0.73(LL−20) · 하단 PI=4</span><span><b>U선</b> 사선 PI=0.9(LL−8) · 경험적 참고선</span><span><b>황색 띠</b> CL–ML · PI 4~7, A선 위</span></div>`;
}

function chartBearing(r,b){
 const g=BearingGeometry.prandtl({width:r.width,phi:r.phi}), bg=b?BearingGeometry.prandtl({width:b.width,phi:b.phi}):null;
 if(!g.valid)return '<p class="error-box">파괴기구를 표시할 수 없습니다.</p>';
 const maxX=Math.max(g.bounds.maxX,bg?.bounds.maxX||0),maxY=Math.max(g.bounds.maxY,bg?.bounds.maxY||0);
 // Right half of the symmetric mechanism. Equal physical scale in x and y.
 const scale=Math.min(535/maxX,195/maxY),x=v=>68+v*scale,y=v=>80+v*scale;
 const path=ps=>ps.map((p,i)=>`${i?'L':'M'}${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(' ');
 let s='<defs><clipPath id="bearing-half"><rect x="68" y="80" width="535" height="200"/></clipPath></defs>';
 s+=`<rect x="53" y="80" width="566" height="211" fill="#F2F3F6"/><line x1="53" x2="619" y1="80" y2="80" stroke="#737373"/>`;
 s+='<g clip-path="url(#bearing-half)">';
 const fills={central:'#BFDBFF','fan-right':'#DBE9FF','passive-right':'#EADCF7'};
 for(const z of g.zones.filter(z=>z.id==='central'||z.id.endsWith('right')))s+=`<path d="${path(z.points)} Z" fill="${fills[z.id]}" stroke="#7596C4" stroke-width="1"/>`;
 for(const ray of g.fanRays.filter(z=>z.side==='right'))s+=`<path d="${path(ray.points)}" fill="none" stroke="#A5BBD9" stroke-width=".8"/>`;
 s+=`<path data-failure-boundary d="${path(g.slipBoundary)}" fill="none" stroke="#0F6FFF" stroke-width="2.5"/>`;
 if(bg?.valid)s+=`<path class="baseline" data-failure-baseline d="${path(bg.slipBoundary)}"/>`;
 s+='</g>';
 for(let i=0;i<=4;i++){const xx=maxX*i/4;s+=`<line x1="${x(xx)}" x2="${x(xx)}" y1="80" y2="85" stroke="#ADB4BD"/><text x="${x(xx)}" y="101" text-anchor="middle" style="font-size:10px">${fmt(xx,1)} m</text>`;}
 s+=`<line x1="48" x2="48" y1="80" y2="${y(g.metrics.maxDepth)}" stroke="#ADB4BD"/><text x="43" y="${y(g.metrics.maxDepth)}" text-anchor="end" style="font-size:10px">${fmt(g.metrics.maxDepth,1)}</text>`;
 const half=r.width/2;
 s+=`<rect x="${x(0)}" y="65" width="${half*scale}" height="15" fill="#DCEAFF" stroke="#0F6FFF" stroke-width="1.5"/>
 <line x1="68" x2="68" y1="48" y2="284" stroke="#737373" stroke-dasharray="4 4"/>
 <text x="68" y="24">대칭축에서 오른쪽 절반 · 가로·세로 동일 축척</text>`;
 s+=`<text x="608" y="24" text-anchor="end">φ′ ${fmt(r.phi,0)}° · B ${fmt(r.width)} m</text><path d="M${x(half/2)} 34v22m-4-5 4 5 4-5" stroke="#0F6FFF" stroke-width="1.5" fill="none"/>`;
 // Zone numbers stay on the geometric zones, with a legible text legend outside.
 for(const z of g.zones.filter(z=>z.id==='central'||z.id.endsWith('right'))){const label=z.id==='central'?{x:r.width*.18,y:g.apex.y*.3}:z.label;s+=`<text x="${x(label.x)}" y="${y(label.y)}" text-anchor="middle" style="fill:#24477B;font-weight:700">${z.id==='central'?'Ⅰ':z.id==='fan-right'?'Ⅱ':'Ⅲ'}</text>`;}
 s+=`<line x1="68" x2="${x(g.bounds.maxX)}" y1="307" y2="307" class="axis"/><path d="M68 302v10 M${x(g.bounds.maxX)} 302v10" class="axis"/><text x="${(68+x(g.bounds.maxX))/2}" y="328" text-anchor="middle">중심에서 ${fmt(g.metrics.halfWidth)} m · 최대 깊이 ${fmt(g.metrics.maxDepth)} m</text>`;
 return svgWrap(s,'Prandtl형 띠기초의 좌우 대칭 파괴기구 중 우측 절반. 중앙 쐐기, 로그나선 전단대, 수동 쐐기. 실제 정사각형 기초의 3차원 파괴면이 아닙니다.')+`<div class="chart-caption"><span><b>Ⅰ</b> 중앙 쐐기 · β=${fmt(g.angles.active,0)}°</span><span><b>Ⅱ</b> 로그나선 전단대</span><span><b>Ⅲ</b> 수동 쐐기 · α=${fmt(g.angles.passive,0)}°</span></div><p class="parameter-note">전체 기구가 보이도록 축척을 맞춥니다. 비교를 켜면 두 상태를 같은 축척으로 겹칩니다. <strong>이 도형은 지반 자중을 무시한 2D 띠기초의 고전 기구이며 아래 정사각형 지지력식의 실제 파괴면은 아닙니다.</strong></p>`;
}

function renderTheory(k,r,b){
 const d=state.data[k],q=state.question[k];let content='';
 if(k==='soil'){
  const p=Plasticity.analyze({...d,fines:r.fines});
  if(q==='plasticity')content=`<h3>소성값에서 분류까지</h3><div class="theory-formula">${p.point?`PI = LL − PL = ${exactDisplay(d.ll)} − ${exactDisplay(d.pl)} = <strong>${exactDisplay(p.pi)}%</strong>`:p.status==='nonplastic'?'NP는 PI=0의 시험점과 다릅니다.':esc(p.errors.join(' '))}</div><div class="theory-grid"><div><span>소성도표 영역</span><strong>${esc(p.zone|| (d.np?'NP':'입력 필요'))}</strong><p>${esc(p.label)}</p></div><div><span>전체 흙의 USCS</span><strong>${esc(r.symbol||'정보 부족')}</strong><p>세립분 ${fmt(r.fines)}%와 입도를 함께 반영</p></div></div><p>${esc(p.scopeNote)}</p>${p.plausibility.aboveU?`<p class="notice">${esc(p.plausibility.note)}</p>`:''}<p class="theory-meta">LL·PL 시험: #40(0.425 mm) 통과분 · 세립분 함량: #200(0.075 mm) 통과율. 유기질 판정은 별도입니다.</p>`;
  else content=`<h3>이 곡선을 분류로 읽는 법</h3><div class="theory-grid"><div><span>입도계수</span><strong>Cu ${fmt(r.cu,2)} · Cc ${fmt(r.cc,2)}</strong><p>모래: Cu≥6 · 자갈: Cu≥4<br>공통: 1≤Cc≤3 → W 조건</p></div><div><span>유효 입경</span><strong>D10 ${fmt(r.d10,3)} mm</strong><p>D30 ${fmt(r.d30,3)} · D60 ${fmt(r.d60,3)} mm<br>측정 범위 밖의 D값은 외삽하지 않음</p></div></div><div class="theory-formula">Cu = D60 / D10 &nbsp; · &nbsp; Cc = D30² / (D10 × D60)</div><p class="relation-strip">세립분 &lt;5%: 입도 중심 · 5~12%: 이중기호 · &gt;12%: 세립분의 소성 반영 · ≥50%: 세립토</p><p class="theory-meta">W/P 판정은 조립토의 입도 조건입니다. 세립분 비율에 따라 이 기호의 적용 여부가 달라집니다.</p>`;
 }else if(k==='stress'){
  content=`<h3>지금 관찰점의 하중 분담</h3><div class="theory-formula">σ′ = σ − u = ${fmt(r.total)} − ${fmt(r.pore)} = <strong>${fmt(r.effective)} kPa</strong></div><div class="theory-grid"><div><span>${r.soilProfile==='layered'?'상부층의 수중 단위중량':'물 아래 유효 단위중량'}</span><strong>γ′ = ${fmt(r.gammaSat-r.gammaW,2)} kN/m³</strong><p>γsat − γw = ${fmt(r.gammaSat)} − ${fmt(r.gammaW,2)}</p></div><div><span>다른 조건이 같을 때</span><strong>상재 +10 kPa → σ′ +10 kPa</strong><p>정수압이 같고 배수가 끝난 상태</p></div></div><p class="theory-meta">수위를 바꾸는 비교는 서로 다른 평형 상태입니다. 시간에 따른 배수·압밀 과정은 포함하지 않습니다.</p><details class="formula-details"><summary>지층별 자중과 응력 합산</summary><div class="theory-formula">σ = q + Σ(γ·두께)<br>${fmt(r.total,2)} = ${fmt(r.surcharge,2)}${r.contributions.map(c=>` + ${fmt(c.moistStress,2)} + ${fmt(c.saturatedStress,2)}`).join('')} kPa<br>u = γw·max(0, z − zw) = ${fmt(r.pore,2)} kPa</div>${r.contributions.map(c=>`<p>${c.layer}층: 습윤 ${fmt(c.moistThickness,2)} m, 포화 ${fmt(c.saturatedThickness,2)} m. 자중 기여 ${fmt(c.moistStress+c.saturatedStress,2)} kPa.</p>`).join('')}<p>층 경계에서는 응력값이 이어지고 기울기만 바뀝니다. 정수압은 흙의 단위중량과 무관합니다.</p></details>`;
 }else if(q==='bearing'){
  const t=r.bearingTerms, total=r.ultimateGross,fract=v=>total?100*v/total:0;
  content=`<h3>현재 극한지지력을 만드는 항</h3><div class="theory-formula">qᵤ = c′Ncsc + q₀Nqsq + ½γBNγsγ<br><strong>${fmt(total)} = ${fmt(t.cohesion)} + ${fmt(t.surcharge)} + ${fmt(t.weight)} kPa</strong></div><div class="contribution-bar" role="img" aria-label="점착 항 ${fmt(fract(t.cohesion))}%, 자중 항 ${fmt(fract(t.weight))}%"><span style="width:${fract(t.cohesion)}%;background:#B357FF"></span><span style="width:${fract(t.weight)}%;background:#0F6FFF"></span></div><div class="theory-grid"><div><span>점착 항 · c′Ncsc</span><strong>${fmt(t.cohesion)} kPa</strong><p>Nc ${fmt(r.nc,2)} · sc ${fmt(r.shapeFactors.cohesion,3)}</p></div><div><span>자중 항 · ½γBNγsγ</span><strong>${fmt(t.weight)} kPa</strong><p>Nγ ${fmt(r.ngamma,2)} · sγ ${fmt(r.shapeFactors.weight,2)}</p></div></div><p>지표기초이므로 q₀=0 → 근입에 의한 상재 항은 0입니다. 현재 접지압/극한지지력 = ${fmt(r.pressure/r.ultimateGross,2)} (하중 수준 비교값).</p><details class="formula-details"><summary>계수와 파괴기구의 식</summary><div class="theory-formula">Nq = exp(π tanφ′) tan²(45° + φ′/2)<br>Nc = (Nq − 1) / tanφ′<br>Nγ = 2(Nq + 1) tanφ′<br>정사각형: sc = 1 + Nq/Nc, sγ = 0.6<br>기구: β=45°+φ′/2, α=45°−φ′/2<br>나선: r=r₀ exp(θ tanφ′), θ는 rad</div><p>Nq=${fmt(r.nq,2)}. 도형의 나선 회전각은 90°이며, B·φ′가 바뀌면 기구가 바뀝니다. Q·c′·γ의 변화는 이 이상화 기구를 움직이지 않습니다.</p></details><p class="theory-meta">수치: FHWA 일반전단 지지력식 + 정사각형 형상계수. 그림: 지반 자중을 무시한 별도의 2D Prandtl형 기구. 실제 파괴면·변형 진행의 수치해석 결과가 아닙니다.</p>`;
 }else if(q==='settlement'){
  content=`<h3>하중·폭·강성의 관계</h3><div class="theory-formula">s = q B (1−ν²) Is / E<br>= (Q / B) × (1−ν²) Is / E</div><div class="theory-grid"><div><span>Q를 고정하고 B를 2배</span><strong>q는 ¼ · s는 ½</strong><p>같은 총하중을 넓게 분산</p></div><div><span>q를 고정하고 B를 2배</span><strong>Q는 4배 · s는 2배</strong><p>재하 규모와 영향 깊이 증가</p></div></div><p class="theory-meta">나머지 물성이 같은 선형 탄성조건에서의 관계입니다. E를 2배로 하면 s는 ½. 중심점 영향계수 Is=${fmt(r.influenceFactor,4)}, ν=0.30.</p>`;
 }else content=`<h3>면적과 하중을 함께 읽기</h3><div class="theory-formula">A = B² = ${fmt(r.area,2)} m²<br>q = Q / A = ${fmt(r.load,0)} / ${fmt(r.area,2)} = <strong>${fmt(r.pressure)} kPa</strong></div><p class="relation-strip">B만 바꿀 때 어떤 값을 유지하는지가 핵심입니다. Q 유지와 q 유지 버튼을 바꾸면 현재 상태에서 비교를 이어갑니다.</p>`;
 $('theory').innerHTML=content;
}
