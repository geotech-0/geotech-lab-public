/** Uniform wide loading, drained one-dimensional compression, m/kPa/mm. */
export const LayeredCase=(()=>{
 const bad=errors=>({valid:false,errors}),finite=x=>typeof x==='number'&&Number.isFinite(x);
 function solve(input={},question='contribution'){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['입력 객체가 필요합니다.']);
  if(!['contribution','observation'].includes(question))return bad(['알려진 질문을 선택하세요.']);
  const {pressure=100,h1=2,h2=4,m1=10000,m2=5000}=input,errors=[];
  for(const[k,v]of Object.entries({pressure,h1,h2,m1,m2}))if(!finite(v))errors.push(`${k}: 유한한 숫자가 필요합니다.`);
  if(errors.length)return bad(errors);
  if(pressure<0||h1<=0||h2<=0||m1<=0||m2<=0)return bad(['상재압은 0 이상, 층두께와 구속탄성계수는 양수입니다.']);
  const strain1=pressure/m1,strain2=pressure/m2,s1=strain1*h1,s2=strain2*h2,total=s1+s2;
  if(Math.max(strain1,strain2)>.1)return bad(['이 일정 강성 모형은 각 층의 압축변형률 10% 이하로 제한합니다. 물성을 확인하세요.']);
  if(![s1,s2,total].every(finite))return bad(['입력 크기가 계산 범위를 벗어났습니다.']);
  const r={valid:true,errors:[],pressure,h1,h2,m1,m2,strain1,strain2,s1,s2,total,totalMm:1000*total,profile:[{depth:0,settlement:total},{depth:h1,settlement:s2},{depth:h1+h2,settlement:0}],model:'uniform-load-drained-constant-constrained-moduli'};
  if(question==='contribution')return r;
  const {observedMm=80,toleranceMm=5}=input;
  if(!finite(observedMm)||!finite(toleranceMm)||observedMm<=0||toleranceMm<0||toleranceMm>=observedMm||pressure<=0)return bad(['추정에는 양의 상재압·관측침하가 필요하고 허용 오차는 관측값보다 작아야 합니다.']);
  const inverse=(a,obs)=>{const remaining=obs/1000-pressure*h1/a;return remaining>0?pressure*h2/remaining:null;};
  const minimumModulus=pressure/.1;
  const permitted=v=>v!==null&&v>=minimumModulus*(1-1e-12);
  const rangeAt=a=>{
    if(a<minimumModulus)return {lower:null,upper:null,valid:false};
    const rawLower=inverse(a,observedMm+toleranceMm),rawUpper=inverse(a,observedMm-toleranceMm);
    if(rawLower===null)return {lower:null,upper:null,valid:false};
    const lower=Math.max(minimumModulus,rawLower);
    if(rawUpper!==null&&rawUpper<lower)return {lower:null,upper:null,valid:false};
    return {lower,upper:rawUpper,valid:true};
  };
  const algebraicM2=inverse(m1,observedMm),conditionalM2=permitted(algebraicM2)?algebraicM2:null;
  const conditionalStatus=algebraicM2===null?'no-positive-solution':conditionalM2===null?'outside-strain':'admissible';
  const family=Array.from({length:181},(_,i)=>{const a=500+i*(30000-500)/180,v=inverse(a,observedMm);return {m1:a,m2:a>=minimumModulus&&permitted(v)?v:null,...rangeAt(a)};});
  return {...r,observedMm,toleranceMm,errorMm:r.totalMm-observedMm,conditionalM2,algebraicM2,conditionalStatus,conditionalRange:rangeAt(m1),minimumModulus,minimumM1:pressure*h1/(observedMm/1000),family};
 }
 return {solve};
})();
