/* Integrated into the existing soil question; no independent session or private state. */
const SedimentationView = (() => {
  const labels = {
    sedimentDepthCm: ['유효깊이 L', 'cm'], sedimentTimeMinutes: ['경과시간 t', '분'],
    sedimentGs: ['입자 비중 Gs', ''], sedimentTemperature: ['물 온도', '°C'],
  };
  const sources = {
    stokes: 'https://pubs.usgs.gov/twri/twri5c1/pdf/twri_5-C1_a.pdf',
    water: 'https://iapws.org/technical-guidance/release/LiquidWater',
    hydrometer: 'https://www.usbr.gov/tsc/techreferences/rec/R9004.pdf',
    gravity: 'https://www.usbr.gov/tsc/techreferences/mands/mands-pdfs/earth.pdf',
    korean: 'https://www.standard.go.kr/KSCI/standardIntro/getStandardSearchView.do?ksNo=KSF2302&menuId=919&reformNo=11&tmprKsNo=KSF2302&topMenuId=502&upperMenuId=503',
  };
  const link = (key, title) => `<a href="${sources[key]}" target="_blank" rel="noopener">${title}</a>`;
  const path = (points, x, y) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(2)} ${y(p).toFixed(2)}`).join(' ');
  function timeControl(value) {
    const valid = typeof value === 'number' && Number.isFinite(value) && value > 0;
    const number = valid ? inputNumber(value) : '', position = valid ? Math.log10(value) : -1;
    return `<div class="control"><div class="control-top"><span class="field-title"><label for="number-sedimentTimeMinutes">경과시간 t</label></span><div class="value-input"><input id="number-sedimentTimeMinutes" type="number" data-field="sedimentTimeMinutes" min="0.1" max="1440" step="any" value="${esc(number)}" aria-label="경과시간 t 숫자 입력" aria-describedby="help-sedimentTimeMinutes"><span class="unit">분</span></div></div><input type="range" data-field="sedimentTimeMinutes" data-mapping="log10" data-step="0.02" min="-1" max="${Math.log10(1440)}" step="any" value="${position}" aria-label="경과시간 t 슬라이더" aria-valuetext="${esc(number)} 분" data-unit="분" aria-describedby="help-sedimentTimeMinutes"><div class="scale"><span>0.1분</span><span>1분</span><span>10분</span><span>100분</span><span>1일</span></div><p id="help-sedimentTimeMinutes" class="control-help">혼합을 멈춘 뒤 경과시간 · 로그 간격 슬라이더, 숫자는 실제 분입니다.</p></div>`;
  }
  function controls(d) {
    return `<p class="parameter-note">정해진 깊이까지 내려오는 데 걸린 시간으로 입경을 읽습니다. 같은 속도로 가라앉는 구의 등가지름이며 통과율은 계산하지 않습니다.</p><div class="parameter-grid">${fieldControl('sedimentDepthCm', '유효깊이 L', d.sedimentDepthCm, 1, 30, .5, 'cm', '수면부터 관찰점까지 · 실제 비중계의 L은 기기 검정식에서 정합니다.')}${timeControl(d.sedimentTimeMinutes)}${fieldControl('sedimentGs', '입자 비중 Gs', d.sedimentGs, 1.5, 3.5, .01, '', '4°C 물을 기준으로 고정 · 물 온도를 바꿔도 입자 밀도는 유지됩니다.')}${fieldControl('sedimentTemperature', '물 온도 T', d.sedimentTemperature, 5, 40, .5, '°C', '순수한 물의 밀도와 점도가 함께 바뀝니다.')}</div>`;
  }
  function chart(r, baseline) {
    const x = p => 294 + 318 * (Math.log10(p.timeMinutes) + 1) / (Math.log10(1440) + 1);
    const y = p => 273 - 215 * (Math.log10(p.diameterMm) + 4) / 4;
    const z = cm => 58 + 215 * cm / 30;
    let s = '<text x="38" y="26">정해 둔 관찰 깊이</text><text x="294" y="26">같은 깊이에서 시간으로 읽는 입경</text>';
    s += '<path d="M62 53 V273 H194 V53" fill="var(--color-bg-surface-alt-1)" stroke="var(--color-border-strong)" stroke-width="2"/><line x1="62" x2="194" y1="58" y2="58" stroke="var(--color-action-primary)" stroke-width="2"/>';
    for (const depth of [0, 10, 20, 30]) s += `<line x1="56" x2="62" y1="${z(depth)}" y2="${z(depth)}" stroke="var(--color-text-muted)"/><text x="49" y="${z(depth) + 4}" text-anchor="end">${depth}</text>`;
    if (baseline) s += `<line class="baseline" x1="64" x2="192" y1="${z(baseline.inputs.sedimentDepthCm)}" y2="${z(baseline.inputs.sedimentDepthCm)}"/>`;
    const depthY = z(r.inputs.sedimentDepthCm), color = r.creepingFlow ? 'var(--color-action-primary)' : 'var(--color-accent-orange)';
    s += `<line x1="128" x2="128" y1="61" y2="${depthY}" stroke="${color}" stroke-width="2" stroke-dasharray="4 3"/><line x1="64" x2="192" y1="${depthY}" y2="${depthY}" stroke="${color}" stroke-width="1.5"/><circle cx="128" cy="${depthY}" r="5" fill="${color}"/><text x="128" y="${Math.min(304, depthY + 20)}" text-anchor="middle">L = ${fmt(r.inputs.sedimentDepthCm,1)} cm</text><text x="38" y="326">수면부터 깊이 (cm) ↓</text>`;
    for (const diameterMm of [.0001, .001, .01, .1, 1]) {
      const yy = y({ diameterMm });
      s += `<line class="grid" x1="294" x2="612" y1="${yy}" y2="${yy}"/><text x="284" y="${yy + 4}" text-anchor="end">${diameterMm}</text>`;
    }
    for (const timeMinutes of [.1, 1, 10, 100, 1440]) {
      const xx = x({ timeMinutes });
      s += `<line class="grid" x1="${xx}" x2="${xx}" y1="58" y2="273"/><text x="${xx}" y="294" text-anchor="middle">${timeMinutes === 1440 ? '1일' : timeMinutes}</text>`;
    }
    s += `<line x1="294" x2="612" y1="${y({diameterMm:.075})}" y2="${y({diameterMm:.075})}" stroke="var(--color-border-strong)" stroke-dasharray="2 4"/><text x="610" y="${y({diameterMm:.075})-6}" text-anchor="end" style="font-size:10px">0.075 mm · #200 체</text>`;
    if (baseline) s += `<path class="baseline" d="${path(baseline.curve, x, y)}"/><circle cx="${x(baseline)}" cy="${y(baseline)}" r="4" fill="white" stroke="var(--color-text-muted)" stroke-width="1.5"/>`;
    const before = r.curve.filter(p => p.timeMinutes <= r.minCreepingTimeMinutes * (1 + 2e-12));
    const after = r.curve.filter(p => p.timeMinutes >= r.minCreepingTimeMinutes * (1 - 2e-12));
    if (before.length) s += `<path d="${path(before, x, y)}" fill="none" stroke="var(--color-accent-orange)" stroke-width="2.5" stroke-dasharray="5 4"/>`;
    if (after.length) s += `<path d="${path(after, x, y)}" fill="none" stroke="var(--color-action-primary)" stroke-width="2.5"/>`;
    s += `<circle cx="${x(r)}" cy="${y(r)}" r="6" fill="${color}" stroke="white" stroke-width="2"/><text x="294" y="46" style="font-size:11px">등가입경 d (mm) · 로그 눈금</text><text x="612" y="326" text-anchor="end">경과시간 t (분) · 로그 눈금 →</text>`;
    return svgWrap(s, `유효깊이 ${fmt(r.inputs.sedimentDepthCm,1)} cm, 경과시간 ${fmt(r.timeMinutes,2)}분에서 Stokes식 등가입경 ${fmt(r.diameterMicrons,2)}마이크로미터, Reynolds수 ${fmt(r.reynolds,4)}.`)
      + '<div class="chart-caption">왼쪽은 관찰깊이이며 구형 표식은 확대했습니다. 오른쪽은 입도분포가 아닌 시간–등가입경 관계입니다. 주황 점선은 Re&gt;0.1로 점성 지배 조건을 벗어난 식의 연장입니다.</div>';
  }
  function render({ data: d, result: r, baseline: b }) {
    const caution = r.creepingFlow
      ? '현재 Re는 0.1 이하로, 관성 영향을 작게 보는 조건 안에 있습니다. 구형·분산·희박한 현탁액이라는 다른 가정도 필요합니다.'
      : '현재 Re는 0.1보다 큽니다. 표시한 입경은 식을 그대로 대입한 참고값이며 Stokes 침강으로 해석할 범위를 벗어납니다.';
    return {
      title: '오래 기다려 같은 깊이에서 읽으면, 더 작은 입자까지 볼 수 있을까요?',
      conditions: ['구형 입자의 독립·종말 침강', '순수한 물 · 0.1 MPa', '농도·통과율 미산정', r.creepingFlow ? 'Re ≤ 0.1' : 'Re > 0.1 · 참고 계산'],
      plotTitle: '침강깊이와 시간–등가입경', comparisonPlot: !!b,
      legend: '<span class="legend-item"><i></i>Stokes식 · Re ≤ 0.1</span><span class="legend-item"><i style="border-color:var(--color-accent-orange)"></i>범위 밖 식의 연장</span>',
      chart: chart(r, b),
      results: metric(r.creepingFlow ? 'Stokes 등가입경' : '범위 밖 참고 입경', r.diameterMm, 'mm', b?.diameterMm ?? null, true, 5)
        + metric('침강속도 L/t', r.velocityMmPerSecond, 'mm/s', b?.velocityMmPerSecond ?? null, false, 3)
        + metric('Reynolds 수 Re', r.reynolds, '', b?.reynolds ?? null, false, 4),
      explanation: `<strong>같은 L·Gs·온도에서 시간이 4배가 되면 읽는 등가입경은 절반입니다.</strong><br>현재 ${fmt(r.diameterMm,5)} mm는 ${fmt(r.diameterMicrons,2)} μm입니다. 깊이가 4배이면 같은 시간의 입경은 2배이고, 따뜻한 물에서는 점도가 작아져 같은 L/t에 대응하는 입경이 더 작아집니다.<span class="hint">${caution}</span>`,
      theory: `<div class="theory-grid"><div><div class="theory-formula">v = L/t = ${fmt(r.velocityMmPerSecond,3)} mm/s<br>d = √[18μL / ((ρs−ρw)gt)]<br>Re = ρwvd / μ = ${fmt(r.reynolds,4)}</div><p>L=${fmt(r.depthMetres,3)} m · t=${fmt(r.timeSeconds,1)} s<br>ρs=${fmt(r.particleDensity,1)} kg/m³<br>d=${fmt(r.diameterMm,5)} mm = ${fmt(r.diameterMicrons,2)} μm</p></div><div class="theory-meta"><strong>온도가 바꾸는 물성</strong><p>${fmt(d.sedimentTemperature,1)}°C에서<br>μ=${fmt(r.properties.viscosity*1000,4)} mPa·s<br>ρw=${fmt(r.properties.density,3)} kg/m³</p><p>Gs=ρs/ρw(4°C)로 기준을 고정합니다. 따라서 물 온도를 바꿔도 ρs는 바뀌지 않습니다.</p></div></div>`,
      method: `<h3>어떤 입경을 읽나요?</h3><p>중력에서 부력을 뺀 힘 πd³(ρs−ρw)g/6와 Stokes 항력 3πμdv가 같을 때 v=(ρs−ρw)gd²/(18μ)입니다. 혼합 종료 후 t 동안 L을 내려온 구의 지름을 역산합니다. 판상·불규칙 입자의 체눈 크기나 실제 기하 지름과 같다고 보장하지 않습니다.</p><p>이 화면은 입자가 처음부터 종말속도로 침강한다고 보는 학습모형입니다. 입자 간 간섭·응집·벽 효과·온도 대류·브라운 운동, 분산제의 물성 변화는 포함하지 않습니다. 특히 아주 작은 입자에서는 Re가 작다는 것만으로 침강분석의 타당성을 보장하지 않습니다.</p><h3>실제 비중계 시험과의 차이</h3><p>시간과 유효깊이는 가로축인 등가입경을 정합니다. 세로축인 통과질량 백분율에는 보정한 현탁액 농도와 건조시료 질량, 체분석 분율 연결이 별도로 필요합니다. 비중계 형상·읽음값에 따른 유효깊이, 메니스커스·온도·분산제 보정도 이 화면에서 자동 산정하지 않습니다. 원자료 없이 통과율 곡선이나 USCS 분류를 만들지 않습니다.</p><h3>물성·단위·범위</h3><p>온도별 순수한 물 밀도는 IAPWS SR6-08(2011) 식 2, 점도는 식 7을 사용합니다. 기준 압력은 0.1 MPa이며 학습 입력은 5~40°C로 제한합니다. L은 cm→m, t는 분→초, 결과 d는 m→mm로 변환합니다. g=${r.gravity} m/s²입니다.</p><p>이 화면은 Re≤0.1을 점성 지배 조건 확인용으로 씁니다. 초과값을 보정 입경으로 바꾸거나 허용 범위로 잘라내지 않습니다. 물성식의 수치 자릿수는 실제 침강 시험의 정확도를 뜻하지 않습니다.</p><p>${link('stokes','USGS TWRI 5-C1 · Stokes law 및 Drag–Reynolds number')} · ${link('water','IAPWS SR6-08(2011) · 식 2·7, 표 1·5·8')}<br>${link('hydrometer','USBR R-90-4 · 1405 비중계 검정, 5330 입도분석')} · ${link('gravity','USBR Earth Manual · 4°C 물 기준 비중')}</p><p>국내 관련 시험: ${link('korean','KS F 2302 흙의 입도 시험방법 · 공식 안내')}. 이 학습모형이 표준 시험의 전체 절차·보정을 구현한 것은 아닙니다.</p>`,
    };
  }
  return { labels, timeControl, controls, chart, render };
})();
