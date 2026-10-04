export const BearingExtensions = (() => {
  const METHODS = ['usace-meyerhof', 'fhwa-vesic'];
  const NAMES = {'usace-meyerhof':'USACE · Meyerhof 기반', 'fhwa-vesic':'AASHTO/FHWA · Vesic 기반'};
  const fail = errors => ({valid:false,errors});
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  // EM 1110-1-1905 (2025), drained Table 5-2. No inclination factors are varied.
  function factors(input={}) {
    if(!input||typeof input!=='object'||Array.isArray(input)) return fail(['계수 입력은 값의 객체여야 합니다.']);
    const {phi,width,length,embedment,method}=input;
    const errors=[];
    if(!METHODS.includes(method)) errors.push('비교 이론은 usace-meyerhof 또는 fhwa-vesic이어야 합니다.');
    if(!finite(phi)||phi<10||phi>45) errors.push('이 배수 비교 모형은 φ′ = 10~45° 범위입니다. φ = 0 비배수 해석과 구별합니다.');
    if(!finite(width)||!finite(length)||width<=0||length<width) errors.push('유효치수는 0 < B′ ≤ L′이어야 합니다.');
    if(!finite(embedment)||embedment<0||(finite(width)&&embedment>width+1e-10)) errors.push('이 학습 모형은 0 ≤ Df/B′ ≤ 1의 얕은 근입만 계산합니다.');
    if(errors.length) return fail(errors);
    const p=phi*Math.PI/180,t=Math.tan(p),flow=(1+Math.sin(p))/(1-Math.sin(p));
    const nq=flow*Math.exp(Math.PI*t),nc=(nq-1)/t,ratio=width/length,depth=embedment/width;
    const meyerhof=method===METHODS[0];
    const ng=meyerhof?(nq-1)*Math.tan(1.4*p):2*(nq+1)*t;
    const sc=meyerhof?1+.2*flow*ratio:1+ratio*nq/nc;
    const sq=meyerhof?1+.1*flow*ratio:1+ratio*t;
    const sg=meyerhof?1+.1*flow*ratio:1-.4*ratio;
    const dc=meyerhof?1+.2*Math.sqrt(flow)*depth:1;
    const dq=meyerhof?1+.1*Math.sqrt(flow)*depth:Math.min(1.4,1+2*t*(1-Math.sin(p))**2*Math.atan(depth));
    const dg=meyerhof?1+.1*Math.sqrt(flow)*depth:1;
    return {valid:true,errors:[],method,name:NAMES[method],phi,flow,nc,nq,ng,sc,sq,sg,dc,dq,dg,ratio,depth};
  }
  function capacity(input={}) {
    if(!input||typeof input!=='object'||Array.isArray(input)) return fail(['입력은 단위가 명시된 값의 객체여야 합니다.']);
    const {width=3,length=4,embedment=1,phi=30,cohesion=0,gamma=20,waterDepth=6,
      totalLoad=1200,eccentricityRatio=0,method='fhwa-vesic',gammaW=9.81}=input;
    const errors=[];
    for(const [key,value] of Object.entries({width,length,embedment,phi,cohesion,gamma,waterDepth,totalLoad,eccentricityRatio,gammaW}))
      if(!finite(value)) errors.push(`${key}: 유한한 숫자가 필요합니다.`);
    if(errors.length) return fail(errors);
    if(width<=0||length<width) errors.push('0 < 기초 폭 B ≤ 길이 L이어야 합니다.');
    if(embedment<0||waterDepth<0) errors.push('근입·수위 깊이는 지표 아래의 0 이상 값입니다.');
    if(cohesion<0) errors.push('유효점착력 c′는 0 이상이어야 합니다.');
    if(gammaW<=0||gamma<=gammaW) errors.push('기준 총단위중량 γ는 물의 단위중량 γw보다 커야 합니다.');
    if(totalLoad<=0) errors.push('자중을 포함한 총 하향하중은 0보다 커야 합니다.');
    if(Math.abs(eccentricityRatio)>=.5) errors.push('압축 유효면적에는 |e′/B| < 0.5가 필요합니다.');
    const originalTotal=input.originalTotal===undefined?gamma*embedment:input.originalTotal;
    if(!finite(originalTotal)||originalTotal<0) errors.push('원지반 총응력은 유한한 0 이상 값이어야 합니다.');
    if(errors.length) return fail(errors);
    const area=width*length,eccentricity=eccentricityRatio*width,effectiveWidth=width-2*Math.abs(eccentricity),effectiveArea=effectiveWidth*length;
    const f=factors({phi,width:effectiveWidth,length,embedment,method});
    if(!f.valid) return f;
    const baseWaterPressure=gammaW*Math.max(0,embedment-waterDepth),originalEffective=originalTotal-baseWaterPressure;
    if(originalEffective<0) return fail(['원지반 유효응력이 음수입니다. 입력 응력과 정수압 기준을 확인하세요.']);
    const uplift=baseWaterPressure*area,effectiveLoad=totalLoad-uplift;
    if(effectiveLoad<=0) return fail(['기저 수압의 상향력이 총 하향하중 이상입니다. 이 압축 지지력 모형으로 계산하지 않습니다.']);
    // Empirical groundwater factors of each complete system, NOT a solved failure-zone average.
    // Water correction uses physical B, while shape/depth/capacity use effective B′ (source equations).
    const groundwaterFactor=method===METHODS[0]
      ?Math.min(1,.45+.55*Math.max(waterDepth-embedment,0)/width)
      :Math.min(1,.5+.5*waterDepth/(1.5*width+embedment));
    const gammaBearing=gamma*groundwaterFactor;
    const terms={cohesion:cohesion*f.nc*f.sc*f.dc,surcharge:originalEffective*f.nq*f.sq*f.dq,weight:.5*effectiveWidth*gammaBearing*f.ng*f.sg*f.dg};
    const ultimateEffective=terms.cohesion+terms.surcharge+terms.weight,ultimateNet=ultimateEffective-originalEffective;
    const demandEffective=effectiveLoad/effectiveArea,demandNet=demandEffective-originalEffective;
    const ultimateLoad=ultimateEffective*effectiveArea;
    if(![area,effectiveArea,originalEffective,uplift,effectiveLoad,gammaBearing,...Object.values(terms),ultimateEffective,ultimateNet,demandEffective,demandNet,ultimateLoad,ultimateLoad/effectiveLoad,effectiveLoad*eccentricity,totalLoad/area].every(finite)) return fail(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
    return {valid:true,errors:[],model:'em-1110-1-1905-2025-drained',width,length,embedment,phi,cohesion,gamma,gammaW,waterDepth,totalLoad,eccentricityRatio,eccentricity,method,name:NAMES[method],area,effectiveWidth,effectiveArea,
      originalTotal,baseWaterPressure,originalEffective,uplift,effectiveLoad,groundwaterFactor,gammaBearing,factors:f,terms,ultimateEffective,ultimateNet,demandEffective,demandNet,ultimateLoad,
      grossTotalFullArea:totalLoad/area,grossEffectiveFullArea:effectiveLoad/area,netIncrementFullArea:totalLoad/area-originalTotal,
      resistanceDemandRatio:ultimateLoad/effectiveLoad,moment:effectiveLoad*eccentricity};
  }
  function compare(input={}) {
    if(!input||typeof input!=='object'||Array.isArray(input)) return fail(['입력은 단위가 명시된 값의 객체여야 합니다.']);
    const results=METHODS.map(method=>capacity({...input,method}));
    if(results.some(r=>!r.valid)) return fail([...new Set(results.flatMap(r=>r.errors))]);
    return {valid:true,errors:[],results};
  }
  function fromLedger(ledger,soil={}) {
    if(!ledger||!ledger.valid) return fail(['유효한 굴착·하중 장부가 필요합니다.']);
    if(!finite(soil.gamma)) return fail(['장부와 연결할 때 전단영역 지하수 보정의 기준 γ를 별도로 지정하세요.']);
    return capacity({...soil,width:ledger.width,length:ledger.length,embedment:ledger.embedment,waterDepth:ledger.waterDepth,
      gammaW:ledger.gammaW,totalLoad:ledger.downwardLoad,originalTotal:ledger.originalTotal});
  }
  return {METHODS,NAMES,factors,capacity,compare,fromLedger};
})();
