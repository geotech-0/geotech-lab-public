/** Dry Rankine c′–φ′ active pressure with zero tensile contact; kN, m, kPa. */
export const CohesivePressure = (() => {
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const bad = message => ({valid:false,errors:[message]});
  function active(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return bad('점착성 토압의 입력 객체가 필요합니다.');
    const {height=6,phi=30,gamma=18,surcharge=10,cohesion=12}=input;
    if (![height,phi,gamma,surcharge,cohesion].every(finite) || height<=0 || height>30 || phi<0 || phi>=50 || gamma<=0 || surcharge<0 || cohesion<0) return bad('건조 주동토압: 0<H≤30 m, 0≤φ′<50°, γ>0, c′·q≥0을 확인하세요.');
    const sinPhi=Math.sin(phi*Math.PI/180),ka=(1-sinPhi)/(1+sinPhi),slope=ka*gamma,intercept=ka*surcharge-2*cohesion*Math.sqrt(ka);
    const zeroPressureDepth=-intercept/slope,potentialCrackDepth=Math.max(0,zeroPressureDepth),crackDepth=Math.min(height,potentialCrackDepth),contactHeight=height-crackDepth;
    const at=z=>({z,raw:slope*z+intercept,pressure:Math.max(0,slope*z+intercept)});
    // Integrate only the compressive linear segment; no negative-force subtraction.
    const top=at(0),base=at(height),contactTop=at(crackDepth),p0=contactTop.pressure,p1=base.pressure;
    const force=contactHeight*(p0+p1)/2,moment=contactHeight*contactHeight*(2*p0+p1)/6;
    const rawForce=height*(top.raw+base.raw)/2,rawMoment=height*height*(2*top.raw+base.raw)/6;
    if (![ka,slope,intercept,zeroPressureDepth,force,moment,rawForce,rawMoment].every(finite)) return bad('입력값이 계산 가능한 숫자 범위를 벗어났습니다. 단위와 크기를 확인하세요.');
    const profile=[...new Set([0,crackDepth,height,...Array.from({length:61},(_,i)=>height*i/60)])].sort((a,b)=>a-b).map(at);
    return {valid:true,errors:[],height,phi,gamma,surcharge,cohesion,ka,slope,intercept,zeroPressureDepth,potentialCrackDepth,crackDepth,contactHeight,top,base,contactTop,profile,force,moment,resultantHeight:force>0?moment/force:null,rawForce,rawMoment,removedTensionForce:Math.max(0,force-rawForce),contact:contactHeight===0?'none':crackDepth>0?'partial':'full'};
  }
  return {active};
})();
