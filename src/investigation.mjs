export const Investigation = (() => {
  const KPA_PER_TSF = 95.760517960678;
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const record = x => x && typeof x === 'object' && !Array.isArray(x);
  const fail = errors => ({valid:false,errors});
  // FHWA NHI-06-088 §3.7.2: Peck et al. normalization, explicitly in tsf.
  function overburdenFactor(effectiveOverburden) {
    if(!finite(effectiveOverburden)||effectiveOverburden<=0||effectiveOverburden>=20*KPA_PER_TSF)
      return fail(['상재 정규화에는 0 < σ′v0 < 20 tsf (약 1915 kPa)의 유효응력이 필요합니다.']);
    const stressTsf=effectiveOverburden/KPA_PER_TSF;
    const uncapped=.77*Math.log10(20/stressTsf),factor=Math.min(2,uncapped);
    if(!finite(uncapped)||!finite(factor)||stressTsf<=0) return fail(['상재 정규화의 계산 범위를 초과했습니다.']);
    return {valid:true,errors:[],effectiveOverburden,stressTsf,uncapped,factor,capped:uncapped>2};
  }
  function spt(input) {
    if(!record(input)) return fail(['SPT 입력은 값의 객체여야 합니다.']);
    const {basis,reading,effectiveOverburden}=input,errors=[];
    if(!['raw','n60'].includes(basis)) errors.push('입력 종류는 측정 N(raw) 또는 이미 보정한 N60(n60)이어야 합니다. (N1)60은 다시 보정하지 않습니다.');
    if(!finite(reading)||reading<0) errors.push('입력 N 또는 N60은 유한한 0 이상 값이어야 합니다.');
    if(basis==='raw'&&finite(reading)&&!Number.isInteger(reading)) errors.push('측정 N은 300 mm 관입에 대한 정수 타격수입니다. 보정된 소수 값은 N60 입력을 선택하세요.');
    const cn=overburdenFactor(effectiveOverburden);
    if(!cn.valid) errors.push(...cn.errors);
    let energyRatio=null,energyFactor=null,boreholeFactor=null,rodFactor=null,samplerFactor=null,proceduralFactor=null,energyOnly=null,n60=null;
    if(basis==='raw') {
      ({energyRatio,boreholeFactor,rodFactor,samplerFactor}=input);
      if(!finite(energyRatio)||energyRatio<=0||energyRatio>100) errors.push('실측 에너지비 ER은 0 초과 100% 이하로 입력하세요.');
      for(const [name,value] of [['공경 CB',boreholeFactor],['롯드 CR',rodFactor],['샘플러 CS',samplerFactor]])
        if(!finite(value)||value<=0) errors.push(`${name} 보정계수는 명시된 0 초과 유한값이어야 합니다.`);
      if(!errors.length) {
        energyFactor=energyRatio/60;
        proceduralFactor=boreholeFactor*rodFactor*samplerFactor;
        energyOnly=reading*energyFactor;
        n60=energyOnly*proceduralFactor;
      }
    } else if(basis==='n60') n60=reading; // Do not read or re-apply inactive correction inputs.
    if(errors.length) return fail(errors);
    const n160=n60*cn.factor;
    if(![n60,n160,...(basis==='raw'?[energyOnly,proceduralFactor]:[])].every(finite)) return fail(['입력 크기가 SPT 계산 범위를 초과했습니다.']);
    return {valid:true,errors:[],model:'spt-manual-corrections-peck-1974',basis,reading,effectiveOverburden,
      energyRatio,energyFactor,boreholeFactor,rodFactor,samplerFactor,proceduralFactor,energyOnly,n60,n160,cn:cn.factor,cnUncapped:cn.uncapped,cnCapped:cn.capped,stressTsf:cn.stressTsf,
      stages:basis==='raw'?[{label:'측정 N',value:reading},{label:'에너지만',value:energyOnly},{label:'시험 보정 N60',value:n60},{label:'정규화 (N1)60',value:n160}]:[{label:'입력 N60',value:n60},{label:'정규화 (N1)60',value:n160}]};
  }
  function cpt(input) {
    if(!record(input)) return fail(['CPT 입력은 단위가 명시된 값의 객체여야 합니다.']);
    const {basis,tipResistanceMPa,totalOverburden,nkt,nktMin,nktMax}=input,errors=[];
    if(!['qc','qt'].includes(basis)) errors.push('입력 종류는 측정 qc 또는 이미 보정한 qt여야 합니다. 순저항 qnet는 다시 차감하지 않습니다.');
    if(!finite(tipResistanceMPa)||tipResistanceMPa<0) errors.push('선단저항은 MPa 단위의 유한한 0 이상 값이어야 합니다.');
    if(!finite(totalOverburden)||totalOverburden<0) errors.push('원지반 총상재응력 σv0는 kPa 단위의 유한한 0 이상 값이어야 합니다.');
    for(const [name,value] of [['현재 Nkt',nkt],['범위 하한 Nkt',nktMin],['범위 상한 Nkt',nktMax]])
      if(!finite(value)||value<=0) errors.push(`${name}는 0보다 큰 유한값이어야 합니다.`);
    if(finite(nktMin)&&finite(nktMax)&&nktMin>nktMax) errors.push('Nkt 범위의 하한은 상한 이하이어야 합니다. 순서를 자동 교환하지 않습니다.');
    let u2=null,areaRatio=null,poreCorrection=null;
    if(basis==='qc') {
      ({u2,areaRatio}=input);
      if(!finite(u2)) errors.push('콘 어깨에서 측정한 u2는 kPa 단위의 유한값이어야 합니다.');
      if(!finite(areaRatio)||areaRatio<=0||areaRatio>1) errors.push('교정 면적비 a는 0 초과 1 이하이어야 합니다.');
      if(!errors.length) poreCorrection=(1-areaRatio)*u2;
    }
    if(errors.length) return fail(errors);
    const inputKPa=1000*tipResistanceMPa,qt=basis==='qc'?inputKPa+poreCorrection:inputKPa,qnet=qt-totalOverburden;
    if(![inputKPa,qt,qnet].every(finite)) return fail(['입력 크기가 CPT 계산 범위를 초과했습니다.']);
    if(qt<0) return fail(['보정 선단저항 qt가 음수입니다. 이 압축 관입 모형의 단위·수압·측정값을 확인하세요.']);
    const suApplicable=qnet>0,su=suApplicable?qnet/nkt:null,suMin=suApplicable?qnet/nktMax:null,suMax=suApplicable?qnet/nktMin:null;
    if(suApplicable&&![su,suMin,suMax].every(finite)) return fail(['입력 크기가 비배수강도 환산 범위를 초과했습니다.']);
    return {valid:true,errors:[],model:'cpt-unequal-area-nkt',basis,tipResistanceMPa,inputKPa,u2,areaRatio,poreCorrection,qt,totalOverburden,qnet,nkt,nktMin,nktMax,suApplicable,su,suMin,suMax,
      interpretation:suApplicable?'비배수 관입이 성립하는 세립토에 대해 지정 Nkt로 환산한 값입니다.':'순저항이 양수가 아니므로 이 상관식으로 양의 비배수강도를 환산하지 않습니다.'};
  }
  return {KPA_PER_TSF,overburdenFactor,spt,cpt};
})();
