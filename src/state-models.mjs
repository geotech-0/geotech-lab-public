/** Educational state identities. All water-content inputs are percentages.
 * Unit weights: kN/m³. gammaW defaults to 9.81 kN/m³.
 * See docs/state-models.md for equations, normalization, scope and sources.
 */
export const StateModels = (() => {
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const invalid = errors => ({valid:false,errors,warnings:[]});
  const numericErrors = values => Object.entries(values).filter(([,v])=>!finite(v)).map(([k])=>`${k}: 유한한 숫자를 입력하세요.`);
  const sampleData = Object.freeze([
    Object.freeze({w:6,gammaWet:17.278}),
    Object.freeze({w:9,gammaWet:19.293}),
    Object.freeze({w:12,gammaWet:20.72}),
    Object.freeze({w:15,gammaWet:20.93}),
    Object.freeze({w:18,gammaWet:20.296}),
  ]);

  function phases(input={}) {
    if(!object(input))return invalid(['값과 단위를 가진 객체를 입력하세요.']);
    const {e=.65,Gs=2.65,w=15,gammaW=9.81}=input;
    const errors=numericErrors({e,Gs,w,gammaW});
    if(errors.length)return invalid(errors);
    if(e<=0)errors.push('간극비 e는 0보다 커야 합니다.');
    if(Gs<=0||gammaW<=0)errors.push('입자비중과 물의 단위중량은 0보다 커야 합니다.');
    if(w<0)errors.push('함수비 w는 0% 이상이어야 합니다.');
    if(errors.length)return invalid(errors);
    const waterFraction=w/100, waterVolume=waterFraction*Gs;
    if(waterVolume>e)return invalid([`물의 부피가 간극보다 큽니다. 현재 e·Gs에서 w는 ${(100*e/Gs).toFixed(2)}% 이하여야 합니다(S≤100%).`]);
    const solidVolume=1,airVolume=e-waterVolume,totalVolume=1+e;
    const solidWeight=Gs*gammaW,waterWeight=waterVolume*gammaW,totalWeight=solidWeight+waterWeight;
    const saturation=waterVolume/e,porosity=e/totalVolume;
    const gammaDry=solidWeight/totalVolume,gammaMoist=totalWeight/totalVolume;
    const gammaSat=(Gs+e)*gammaW/totalVolume,gammaSubmerged=gammaSat-gammaW;
    const values={saturation,porosity,gammaDry,gammaMoist,gammaSat,gammaSubmerged,totalVolume,totalWeight};
    if(Object.values(values).some(v=>!finite(v)))return invalid(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
    return {valid:true,errors:[],warnings:[],e,Gs,w,gammaW,waterFraction,...values,solidVolume,waterVolume,airVolume,solidWeight,waterWeight,airWeight:0,airVolumeFraction:airVolume/totalVolume,solidVolumeFraction:1/totalVolume,waterVolumeFraction:waterVolume/totalVolume,saturationWaterContent:100*e/Gs,model:'three-phase-identities-v1'};
  }

  function relativeDensity(input={}) {
    if(!object(input))return invalid(['값과 단위를 가진 객체를 입력하세요.']);
    const {e=.65,emin=.4,emax=.9,Gs=2.65,gammaW=9.81}=input;
    const errors=numericErrors({e,emin,emax,Gs,gammaW});
    if(errors.length)return invalid(errors);
    if(emin<0||emax<=emin)errors.push('0≤emin<emax가 되어야 합니다. 같은 흙의 최소·최대 간극비를 입력하세요.');
    if(e<emin||e>emax)errors.push('이 학습 모형은 emin≤e≤emax 범위의 상태를 비교합니다. 경계값이나 현재 간극비를 확인하세요.');
    if(Gs<=0||gammaW<=0)errors.push('입자비중과 물의 단위중량은 0보다 커야 합니다.');
    if(errors.length)return invalid(errors);
    const relativeDensity=(emax-e)/(emax-emin),gammaDry=Gs*gammaW/(1+e),gammaDryMin=Gs*gammaW/(1+emax),gammaDryMax=Gs*gammaW/(1+emin);
    const densityRatio=gammaDry/gammaDryMax;
    if(![relativeDensity,gammaDry,gammaDryMin,gammaDryMax,densityRatio].every(finite))return invalid(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
    return {valid:true,errors:[],warnings:[],e,emin,emax,Gs,gammaW,relativeDensity,gammaDry,gammaDryMin,gammaDryMax,densityRatio,porosity:e/(1+e),model:'relative-density-index-v1'};
  }

  function zeroAirVoids(input={}) {
    if(!object(input))return null;
    const {w,Gs=2.65,gammaW=9.81}=input;
    if(![w,Gs,gammaW].every(finite)||w<0||Gs<=0||gammaW<=0)return null;
    const value=Gs*gammaW/(1+(w/100)*Gs);
    return finite(value)?value:null;
  }

  function compaction(input={}) {
    if(!object(input))return invalid(['값과 단위를 가진 객체를 입력하세요.']);
    const {fieldW=12,fieldGammaWet=20,Gs=2.65,referenceMDD=18.5,referenceOMC=12,gammaW=9.81,samples=sampleData}=input;
    const errors=numericErrors({fieldW,fieldGammaWet,Gs,referenceMDD,referenceOMC,gammaW});
    if(errors.length)return invalid(errors);
    if(fieldW<0||referenceOMC<0)errors.push('현장·기준 함수비는 0% 이상이어야 합니다.');
    if(fieldGammaWet<=0||referenceMDD<=0||Gs<=0||gammaW<=0)errors.push('단위중량·최대건조단위중량·입자비중은 0보다 커야 합니다.');
    if(!Array.isArray(samples)||samples.length<2)errors.push('참고 자료는 서로 다른 함수비의 두 점 이상이어야 합니다.');
    if(errors.length)return invalid(errors);
    const fieldGammaDry=fieldGammaWet/(1+fieldW/100),zavAtField=zeroAirVoids({w:fieldW,Gs,gammaW}),zavAtReference=zeroAirVoids({w:referenceOMC,Gs,gammaW});
    if(fieldGammaDry>zavAtField)errors.push('현재 현장점이 영공기간극선(ZAV)을 넘습니다. 함수비·습윤단위중량·Gs의 조합을 확인하세요.');
    if(referenceMDD>zavAtReference)errors.push('기준 MDD·OMC 조합이 영공기간극선을 넘습니다. 기준시험 값과 Gs를 확인하세요.');
    const e=Gs*gammaW/fieldGammaDry-1;
    if(e<=0)errors.push('이 삼상 모형은 간극이 있는 흙(e>0)을 대상으로 합니다. 단위중량을 확인하세요.');
    const processed=[];
    for(let i=0;i<samples.length;i++){
      const row=samples[i];
      if(!object(row)||!finite(row.w)||!finite(row.gammaWet)||row.w<0||row.gammaWet<=0){errors.push(`참고 자료 ${i+1}행: 함수비(%)와 습윤단위중량(kN/m³)을 확인하세요.`);continue;}
      if(i>0&&row.w<=samples[i-1]?.w)errors.push('참고 자료는 서로 다른 함수비를 오름차순으로 입력하세요.');
      const gammaDry=row.gammaWet/(1+row.w/100),zav=zeroAirVoids({w:row.w,Gs,gammaW});
      if(gammaDry>zav)errors.push(`참고 자료 ${i+1}행이 현재 Gs의 영공기간극선을 넘습니다.`);
      processed.push({w:row.w,gammaWet:row.gammaWet,gammaDry,zav});
    }
    if(errors.length)return invalid(errors);
    const saturation=(fieldW/100)*Gs/e,porosity=e/(1+e),airVolumeFraction=(e-(fieldW/100)*Gs)/(1+e),relativeCompaction=fieldGammaDry/referenceMDD;
    const sampledPeak=processed.reduce((a,b)=>b.gammaDry>a.gammaDry?b:a);
    const xMax=Math.max(22,Math.ceil(Math.max(fieldW,referenceOMC,processed.at(-1).w)/5)*5);
    const zavCurve=Array.from({length:81},(_,i)=>({w:xMax*i/80,gammaDry:zeroAirVoids({w:xMax*i/80,Gs,gammaW})}));
    if(![fieldGammaDry,relativeCompaction,saturation,e,porosity,airVolumeFraction].every(finite))return invalid(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
    return {valid:true,errors:[],warnings:relativeCompaction>1?['다짐도 100% 초과는 수학적으로 가능하며 자동으로 잘못된 값은 아닙니다. 기준시험·시료 대표성·측정조건을 함께 확인해야 합니다.']:[],fieldW,fieldGammaWet,Gs,referenceMDD,referenceOMC,gammaW,fieldGammaDry,relativeCompaction,saturation,e,porosity,airVolumeFraction,zavAtField,samples:processed,sampledPeak,referenceMatchesSamplePeak:Math.abs(sampledPeak.gammaDry-referenceMDD)<1e-8&&Math.abs(sampledPeak.w-referenceOMC)<1e-8,waterContentDifference:fieldW-referenceOMC,xMax,zavCurve,model:'compaction-observation-identities-v1',sampleKind:samples===sampleData?'synthetic-teaching-data':'provided-data',curveKind:'straight-segments-between-samples'};
  }
  return Object.freeze({phases,relativeDensity,compaction,zeroAirVoids,sampleData});
})();
