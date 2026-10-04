function foundationQuestionFields(question){
 return question==='pressure'?['width']:question==='bearing'?['width','phi','cohesion','gamma']:['width','phi','cohesion','gamma','modulus'];
}
function foundationConditionControls(d,q){
 const note='<p class="parameter-note">지표기초 Df=0 · 건조·균질 지반 · 정사각형. 전체 전달 하중을 입력합니다.</p>';
 if(q==='pressure')return note;
 return `<details class="setting"><summary>하중·지반 조건</summary>${q==='settlement'?numericRow('phi','적용범위 확인용 φ′',d.phi,'°',20,42,1)+numericRow('cohesion','유효점착력 c′',d.cohesion,'kPa',0,80,1)+numericRow('gamma','단위중량 γ',d.gamma,'kN/m³',14,24,.5):''}${note}<p class="note">${q==='settlement'?'ν=0.30. 강도정수는 극한저항 확인에 사용하며, 강성 E와 별개입니다.':'강도정수는 저항을, 하중은 현재 접지압을 결정합니다.'}</p><button type="button" data-open-lab="bearing-conditions">근입·수위·편심 조건 비교</button></details>`;
}
function foundationMethodContent(d,r,q){
 const load=`<h3>현재 하중과 면적</h3><div class="formula">A=B²=${fmt(r.area,2)} m²<br>q=Q/A=${fmt(r.pressure,2)} kPa</div><p>저면에 전달되는 전체 하중입니다. 기초나 상부 흙의 자중을 자동 가산하지 않습니다.</p>`;
 const bearing=`<h3>극한지지력</h3><div class="formula">qᵤ=c′Ncsc+q₀Nqsq+½γBNγsγ<br>Nq=exp(πtanφ′)tan²(45°+φ′/2)<br>Nc=(Nq−1)/tanφ′<br>Nγ=2(Nq+1)tanφ′</div><p>Nc=${fmt(r.nc,2)} · Nq=${fmt(r.nq,2)} · Nγ=${fmt(r.ngamma,2)}. 현재 c′=${fmt(d.cohesion)} kPa, γ=${fmt(d.gamma)} kN/m³이며, Df=0이므로 q₀ 항은 0입니다.</p>`;
 const settlement=`<h3>유연한 정사각형 중심점의 탄성침하</h3><div class="formula">s=qB(1−ν²)Is/E<br>Is=(4/π)ln(1+√2)≈1.1222</div><p>E=${fmt(d.modulus,0)} kPa, ν=${fmt(d.poisson,2)}. 강체기초의 평균침하나 압밀침하와 구별합니다.</p>`;
 const scope='<h3>이 질문의 적용 범위</h3><p>건조·균질 지반, 정사각형 지표기초, 수평 지표·저면, 연직 중심하중입니다.</p>';
 const fhwa='<a href="https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06089.pdf" target="_blank" rel="noopener">FHWA Soils and Foundations, Volume II, Chapter 8</a>';
 const prandtl='<a href="https://newcastle.pressbooks.pub/fundamentals-of-foundation-engineering/chapter/5-3-some-fundamentals-of-the-bearing-capacity-of-shallow-foundations/" target="_blank" rel="noopener">University of Newcastle · Prandtl형 기구 §5.3</a>';
 const elastic='<a href="https://wisconsindot.gov/documents2/research/WisDOT-WHRP-project-0092-12-03-final-report.pdf" target="_blank" rel="noopener">WisDOT · 정사각형 중심점 영향계수</a>';
 if(q==='pressure')return [load,scope+`<p>접지압은 하중/면적의 관계입니다. 강도·강성으로 저항이나 침하를 판단하는 계산은 해당 질문에서 수행합니다.</p><p>${fhwa}</p>`];
 if(q==='bearing')return [load+bearing,scope+`<p>FHWA의 일관된 지지력 계수 체계를 사용합니다. Prandtl 그림은 별도의 무중량 2D 띠기초 기구이며 현재 정사각형의 실제 3D 파괴면이 아닙니다.</p><p>${fhwa}<br>${prandtl}</p>`];
 return [load+settlement,scope+`<p>극한저항에 도달한 조건에서는 이 탄성침하를 예측값으로 표시하지 않습니다. 극한저항 미만이라는 사실만으로 실제 지반이 선형 탄성 거동을 한다고 보장하지 않습니다.</p>${bearing}<p>${fhwa}<br>${elastic}</p>`];
}
