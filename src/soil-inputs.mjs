/** Educational input conversions; no extrapolated fines data or engineering-property prediction. */
export const SoilInputs = (() => {
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const invalid = errors => ({ valid: false, errors, totalMass: null, rows: [], points: [] });
  const sieveSizes = Object.freeze([0.075, 0.15, 0.3, 0.6, 1.18, 2, 4.75, 9.5, 19, 37.5, 63]);
  const sources = Object.freeze([
    {title:'USBR R-90-4, Gradation Analysis of Soils Tests, USBR 5325 §12.15–12.17',url:'https://www.usbr.gov/tsc/techreferences/rec/R9004.pdf'},
    {title:'FHWA NHI-16-072, Geotechnical Site Characterization, §4.8.4, equations 4.12–4.15',url:'https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi16072.pdf'},
    {title:'FHWA NHI-05-037, Chapter 5, Table 5-21, Atterberg limits',url:'https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05a.cfm'},
  ]);

  /** Synthetic passing curve, 100% normalized dry mass of particles <75 mm. */
  function generateCurve({fines=8,gravelShare=0,gradation='broad'}={}) {
    if (!finite(fines)||fines<0||fines>100) throw new RangeError('세립분은 0~100%로 입력하세요.');
    if (!finite(gravelShare)||gravelShare<0||gravelShare>100) throw new RangeError('조립분 중 자갈 비율은 0~100%로 입력하세요.');
    if (!['broad','uniform','gap'].includes(gradation)) throw new RangeError('입도 예제는 broad, uniform, gap 중에서 선택하세요.');
    const sandShare=(100-fines)*(1-gravelShare/100), gravel=(100-fines)*gravelShare/100;
    // Fractions are deliberately authored examples, not measured sieve/hydrometer data.
    const sandFractions={broad:[0,.08,.14,.35,.57,.8,1],uniform:[0,.005,.02,.1,.95,1,1],gap:[0,.08,.35,.35,.35,.82,1]}[gradation];
    const gravelFractions={broad:[.15,.38,.65,1],uniform:[.005,.1,.95,1],gap:[.25,.25,.85,1]}[gradation];
    return sieveSizes.map((size,i)=>({size,passing:i<=6?fines+sandShare*sandFractions[i]:fines+sandShare+gravel*gravelFractions[i-7]}));
  }

  /** rows: descending sieve openings with a final {size:null,mass} pan; masses use one consistent unit. */
  function retainedToPassing(rows) {
    const errors=[];
    if (!Array.isArray(rows)||rows.length<2) return invalid(['한 개 이상의 체와 마지막 받침접시(pan)의 건조 잔류질량이 필요합니다.']);
    let previous=Infinity;
    rows.forEach((row,i)=>{
      if (!row||typeof row!=='object') {errors.push(`${i+1}행의 체 크기와 잔류질량을 입력하세요.`);return;}
      if (!finite(row.mass)||row.mass<0) errors.push(`${i+1}행의 건조 잔류질량은 0 이상의 숫자로 입력하세요. 빈 값은 0으로 대신하지 않습니다.`);
      if (i===rows.length-1) {if(row.size!==null) errors.push('마지막 행은 size:null인 받침접시(pan)여야 합니다.');}
      else if(!finite(row.size)||row.size<=0||row.size>=75) errors.push(`${i+1}행의 체 눈 크기는 0보다 크고 75 mm보다 작아야 합니다.`);
      else {if(row.size>=previous)errors.push('체는 큰 눈 크기부터 작은 눈 크기 순서로, 중복 없이 입력하세요.');previous=row.size;}
    });
    if(errors.length)return invalid(errors);
    const totalMass=rows.reduce((s,row)=>s+row.mass,0);
    if(!finite(totalMass)||totalMass<=0)return invalid(['총 건조질량은 0보다 큰 유한한 값이어야 합니다.']);
    let cumulative=0;
    const converted=rows.map((row,i)=>{
      cumulative+=row.mass;
      const retainedPercent=100*(row.mass/totalMass),cumulativeRetained=100*(cumulative/totalMass);
      return {size:row.size,mass:row.mass,retainedPercent,cumulativeRetained,passing:i===rows.length-1?null:100-cumulativeRetained};
    });
    const points=converted.filter(row=>row.size!==null).map(row=>({size:row.size,passing:row.passing})).reverse();
    return {valid:true,errors:[],totalMass,rows:converted,points,panOpening:rows.at(-2).size,panPercent:100*(rows.at(-1).mass/totalMass)};
  }

  /** Inverse bookkeeping of supplied passing values. It does not make the input curve a measurement. */
  function passingToRetained(points,totalMass=1000) {
    const errors=[];
    if(!finite(totalMass)||totalMass<=0)errors.push('환산할 총 건조질량은 0보다 큰 유한한 값이어야 합니다.');
    if(!Array.isArray(points)||!points.length)return invalid([...errors,'통과율 자료를 한 점 이상 입력하세요.']);
    let previousSize=0,previousPassing=-Infinity;
    points.forEach((p,i)=>{
      if(!p||typeof p!=='object'){errors.push(`${i+1}행의 입경·통과율 자료가 필요합니다.`);return;}
      if(!finite(p.size)||p.size<=0||p.size>=75)errors.push(`${i+1}행의 입경은 0보다 크고 75 mm보다 작아야 합니다.`);
      else {if(p.size<=previousSize)errors.push('통과율 점은 작은 입경부터 큰 입경 순서로, 중복 없이 입력하세요.');previousSize=p.size;}
      if(!finite(p.passing)||p.passing<0||p.passing>100)errors.push(`${i+1}행의 통과율은 0~100% 숫자로 입력하세요.`);
      else {if(p.passing<previousPassing)errors.push('입경이 커질수록 누적 통과율이 줄어들 수 없습니다.');previousPassing=p.passing;}
    });
    if(errors.length)return invalid(errors);
    let largerPassing=100;
    const rows=[...points].reverse().map(p=>{
      const mass=((largerPassing-p.passing)/100)*totalMass;
      largerPassing=p.passing;
      return {size:p.size,mass};
    });
    rows.push({size:null,mass:(points[0].passing/100)*totalMass});
    const result=retainedToPassing(rows);
    return {...result,requestedTotalMass:totalMass};
  }

function sieveMassFromPassing(points,totalMass=1000){
  // Validate the ENTIRE source curve before dropping fine-detail points.
  const checked=passingToRetained(points,totalMass);
  if(!checked.valid)return checked;
  const boundary=.075,exact=points.find(p=>p.size===boundary);
  let passing=exact?.passing,boundarySources=[];
  if(!exact){
    const upper=points.findIndex(p=>p.size>boundary);
    if(upper<=0)return {valid:false,errors:['0.075 mm 통과율 또는 그 입경 양쪽의 자료가 있어야 체분석 질량으로 환산할 수 있습니다. 범위 밖은 외삽하지 않습니다.'],totalMass:null,rows:[],points:[]};
    const a=points[upper-1],b=points[upper];
    passing=a.passing+(b.passing-a.passing)*Math.log(boundary/a.size)/Math.log(b.size/a.size);
    boundarySources=[{...a},{...b}];
  }
  const sievePoints=[{size:boundary,passing},...points.filter(p=>p.size>boundary).map(p=>({...p}))];
  const converted=passingToRetained(sievePoints,totalMass);
  return {...converted,panOpening:boundary,boundaryInterpolated:!exact,boundarySources,discardedFinePointCount:points.filter(p=>p.size<boundary).length};
}


  /** Natural water-content position relative to remolded index limits; not a strength or USCS predictor. */
  function consistency({w,ll,pl,np=false}={}) {
    const r={valid:false,errors:[],status:'invalid',pi:null,li:null,ic:null,state:'unknown',stateLabel:'입력 확인',notes:[],w,ll,pl};
    if(!finite(w)||w<0)r.errors.push('자연함수비 w는 0 이상의 숫자로 입력하세요.');
    if(typeof np!=='boolean')r.errors.push('비소성(NP) 여부를 확인하세요.');
    if(!np){
      if(!finite(ll)||ll<=0)r.errors.push('액성한계 LL은 0보다 큰 숫자로 입력하세요.');
      if(!finite(pl)||pl<0)r.errors.push('소성한계 PL은 0 이상의 숫자로 입력하세요.');
      if(finite(ll)&&finite(pl)&&pl>ll)r.errors.push('소성한계 PL은 액성한계 LL보다 클 수 없습니다.');
    }
    if(r.errors.length)return r;
    r.valid=true;
    r.notes.push('LL·PL은 재성형 시료의 지수시험 값입니다. 자연함수비의 상대 위치만으로 현장 강도·침하·과압밀비를 결정하지 않습니다.');
    r.notes.push('w만 바꾸면 함수 상태가 바뀝니다. 입도·LL·PL·유기질 여부가 같다면 USCS 분류는 바뀌지 않습니다.');
    if(np){r.status='nonplastic';r.state='nonplastic';r.stateLabel='비소성(NP)';r.notes.push('NP를 PI=0으로 치환하지 않습니다. LI·Ic는 정의하지 않습니다.');return r;}
    r.pi=ll-pl;
    if(r.pi===0){r.status='undefined';r.state='zero-plasticity';r.stateLabel='PI = 0 · 지수 정의 불가';r.notes.push('LL=PL이면 LI와 Ic의 분모가 0입니다. 값을 0 또는 무한대로 표시하지 않습니다.');return r;}
    r.li=(w-pl)/r.pi;r.ic=(ll-w)/r.pi;
    if(!finite(r.li)||!finite(r.ic)){r.valid=false;r.status='invalid';r.li=null;r.ic=null;r.errors.push('함수비 차이와 PI의 비가 수치 표현 범위를 넘습니다. 시험값의 단위를 확인하세요.');return r;}
    r.status='computed';
    if(w<pl){r.state='below-pl';r.stateLabel='소성한계 이하';r.notes.push('수축한계 SL이 없으므로 고체·반고체를 나누지 않습니다.');}
    else if(w===pl){r.state='plastic-limit';r.stateLabel='소성한계 PL';}
    else if(w<ll){r.state='plastic';r.stateLabel='소성 상태 범위';}
    else if(w===ll){r.state='liquid-limit';r.stateLabel='액성한계 LL';}
    else {r.state='above-ll';r.stateLabel='액성한계 초과';}
    return r;
  }
  return {sieveSizes,sources,generateCurve,retainedToPassing,passingToRetained,sieveMassFromPassing,consistency};
})();
