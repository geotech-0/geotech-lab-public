/** Drained e–log stress history, constant-property Terzaghi diffusion, and a separate secondary-compression index model. */
export const Consolidation = (() => {
  const DAY=86400, finite=x=>typeof x==='number'&&Number.isFinite(x);
  const fail=errors=>({valid:false,errors});
  const requirePositive=(errors,data,keys)=>keys.forEach(([k,label])=>{if(!finite(data[k])||data[k]<=0)errors.push(`${label}은 0보다 큰 숫자로 입력하세요.`);});
  const requireNonnegative=(errors,data,keys)=>keys.forEach(([k,label])=>{if(!finite(data[k])||data[k]<0)errors.push(`${label}은 0 이상의 숫자로 입력하세요.`);});
  // Only round floating-point noise near known analytic bounds; input values are never clamped.
  const unitRound=x=>x<0&&x>-1e-12?0:x>1&&x<1+1e-12?1:x;
  const sources=Object.freeze([
    {title:'FHWA NHI-06-088, Soils and Foundations, Volume I, Chapters 5 and 7',url:'https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06088.pdf'},
    {title:'University of Hawaiʻi, GG454, Consolidation Mechanics Review, slides 8, 10, 16–17',url:'https://www.soest.hawaii.edu/martel/Courses/GG454/Lec_41_2018.pptx.pdf'},
    {title:'FHWA/IN/JTRP-2015/11, Engineering Properties of Marls, Appendix A.4.3.5',url:'https://rosap.ntl.bts.gov/view/dot/29538/dot_29538_DS1.pdf'},
  ]);

  function stressHistory(data={}) {
    const {sigma0,preconsolidation,sigmaUnload,sigmaFinal,e0,cc,cr,thickness,stage='reload'}=data,errors=[];
    requirePositive(errors,data,[['sigma0','초기 유효응력'],['preconsolidation','선행압밀응력'],['sigmaUnload','제하 후 유효응력'],['sigmaFinal','재재하 후 유효응력'],['thickness','초기 층두께'],['cc','압축지수 Cc']]);
    requireNonnegative(errors,data,[['e0','초기 간극비'],['cr','재압축·팽창지수 Cr']]);
    if(finite(preconsolidation)&&finite(sigma0)&&preconsolidation<sigma0)errors.push('이 배수 완료 모형에서 선행압밀응력은 현재 초기 유효응력 이상이어야 합니다.');
    if(finite(sigmaUnload)&&finite(sigma0)&&sigmaUnload>sigma0)errors.push('제하 단계의 응력은 초기 응력보다 클 수 없습니다.');
    if(finite(sigmaFinal)&&finite(sigmaUnload)&&sigmaFinal<sigmaUnload)errors.push('재재하 단계의 응력은 제하 후 응력 이상이어야 합니다.');
    if(finite(cc)&&finite(cr)&&cr>cc)errors.push('이 이선형 학습모형은 0 ≤ Cr ≤ Cc 범위를 지원합니다.');
    if(!['initial','unload','reload'].includes(stage))errors.push('단계는 initial, unload, reload 중에서 선택하세요.');
    if(errors.length)return fail(errors);
    const logRatio=(a,b)=>Math.log10(a)-Math.log10(b);
    const eUnload=e0-cr*logRatio(sigmaUnload,sigma0);
    const atPc=e0-cr*logRatio(preconsolidation,sigma0);
    const eFinal=sigmaFinal<=preconsolidation?e0-cr*logRatio(sigmaFinal,sigma0):atPc-cc*logRatio(sigmaFinal,preconsolidation);
    if(!finite(eUnload)||!finite(eFinal)||eFinal<0)return fail(['예측 간극비가 음수이거나 수치 범위를 넘습니다. 응력·지수·초기 간극비 조합을 확인하세요.']);
    const make=(key,label,stress,e,pc,previousE)=>({key,label,stress,e,preconsolidation:pc,ocr:pc/stress,settlement:thickness*(e0-e)/(1+e0),stepSettlement:thickness*(previousE-e)/(1+e0),thickness:thickness*(1+e)/(1+e0)});
    const stages=[make('initial','초기',sigma0,e0,preconsolidation,e0),make('unload','제하',sigmaUnload,eUnload,preconsolidation,e0),make('reload','재재하',sigmaFinal,eFinal,Math.max(preconsolidation,sigmaFinal),eUnload)];
    const selected=stages.find(s=>s.key===stage);
    const path=[{stress:sigma0,e:e0,stage:'initial'},{stress:sigmaUnload,e:eUnload,stage:'unload'}];
    if(sigmaFinal>preconsolidation&&sigmaUnload<preconsolidation)path.push({stress:preconsolidation,e:atPc,stage:'yield'});
    path.push({stress:sigmaFinal,e:eFinal,stage:'reload'});
    const activePath=stage==='initial'?path.slice(0,1):stage==='unload'?path.slice(0,2):path;
    const referenceAt=stress=>stress<=preconsolidation?e0-cr*logRatio(stress,sigma0):atPc-cc*logRatio(stress,preconsolidation);
    const minimumStress=Math.min(sigmaUnload,sigma0)/1.3,maximumStress=Math.max(preconsolidation,sigmaFinal,sigma0)*1.25;
    const reference=Array.from({length:81},(_,i)=>{const stress=10**(Math.log10(minimumStress)+i/80*logRatio(maximumStress,minimumStress));return{stress,e:referenceAt(stress)};}).filter(p=>finite(p.e)&&p.e>=0);
    const loadingIndex=selected.stress>=selected.preconsolidation?cc:cr;
    const tangentMv=loadingIndex/(Math.LN10*(1+selected.e)*selected.stress);
    if(![selected.ocr,selected.settlement*1000,selected.thickness,tangentMv,minimumStress,maximumStress].every(finite))return fail(['입력 조합이 계산 가능한 수치 범위를 넘습니다.']);
    return {valid:true,errors:[],...data,stage,initialOCR:preconsolidation/sigma0,stages,selected,path,activePath,reference,atPreconsolidationE:atPc,settlement:selected.settlement,settlementMm:selected.settlement*1000,stepSettlementMm:selected.stepSettlement*1000,tangentMv,constrainedModulus:tangentMv>0?1/tangentMv:null,loadingIndex};
  }

  // Positive-argument erf through a rapidly convergent positive series after extracting exp(-x²).
  function erfcPositive(x) {
    if(x>=6)return 0; // erfc(6) < 2.2e-17: below double-precision display accuracy.
    let term=x,sum=x;
    for(let n=1;n<300;n++){term*=2*x*x/(2*n+1);sum+=term;if(Math.abs(term)<Math.abs(sum)*2e-16)break;}
    return unitRound(1-2/Math.sqrt(Math.PI)*Math.exp(-x*x)*sum);
  }
  function averageDegree(timeFactor) {
    if(!finite(timeFactor)||timeFactor<0)throw new RangeError('시간계수 Tv는 0 이상의 유한한 값이어야 합니다.');
    if(timeFactor===0)return 0;
    // Boundary layers have not overlapped. The first omitted image is O(exp(-1/Tv)).
    if(timeFactor<.02)return 2*Math.sqrt(timeFactor/Math.PI);
    let remaining=0;
    for(let m=0;m<1000;m++){
      const odd=2*m+1,term=8/(Math.PI*Math.PI*odd*odd)*Math.exp(-odd*odd*Math.PI*Math.PI*timeFactor/4);
      remaining+=term;if(term<1e-16)break;
    }
    return unitRound(1-remaining);
  }
  /** z/Hdr in [0,2] for two drained faces; single drainage uses its upper half [0,1]. */
  function excessRatio(depthOverDrainage,timeFactor) {
    if(!finite(depthOverDrainage)||depthOverDrainage<0||depthOverDrainage>2||!finite(timeFactor)||timeFactor<0)throw new RangeError('정규화 깊이는 0~2, 시간계수는 0 이상의 유한한 값이어야 합니다.');
    if(depthOverDrainage===0||depthOverDrainage===2)return 0;
    if(timeFactor===0)return 1;
    if(timeFactor<.02){const scale=2*Math.sqrt(timeFactor);return unitRound(1-erfcPositive(depthOverDrainage/scale)-erfcPositive((2-depthOverDrainage)/scale));}
    let ratio=0;
    for(let m=0;m<1000;m++){
      const odd=2*m+1,amplitude=4/(odd*Math.PI)*Math.exp(-odd*odd*Math.PI*Math.PI*timeFactor/4);
      ratio+=amplitude*Math.sin(odd*Math.PI*depthOverDrainage/2);if(amplitude<1e-16)break;
    }
    return unitRound(ratio);
  }
  function timeFactorForDegree(degree) {
    if(!finite(degree)||degree<0||degree>=1)throw new RangeError('목표 평균 압밀도는 0 이상 1 미만이어야 합니다. 유한한 100% 도달시간을 정의하지 않습니다.');
    if(degree===0)return 0;
    if(degree<2*Math.sqrt(.02/Math.PI))return Math.PI*degree*degree/4;
    let low=0,high=1;while(averageDegree(high)<degree)high*=2;
    for(let i=0;i<75;i++){const mid=(low+high)/2;if(averageDegree(mid)<degree)low=mid;else high=mid;}
    return(low+high)/2;
  }
  const T50=timeFactorForDegree(.5),T90=timeFactorForDegree(.9);
  function primary(data={}) {
    const {k,mv,thickness,deltaStress,timeDays,drainage,gammaW=9.81}=data,errors=[];
    requirePositive(errors,{...data,gammaW},[['k','투수계수 k'],['mv','체적압축계수 mv'],['thickness','층두께 H'],['gammaW','물의 단위중량']]);
    requireNonnegative(errors,data,[['deltaStress','일시 재하 증가량 Δσ'],['timeDays','경과시간']]);
    if(!['single','double'].includes(drainage))errors.push('배수조건은 single(상면) 또는 double(양면)을 선택하세요.');
    if(errors.length)return fail(errors);
    const finalStrain=mv*deltaStress;
    if(!finite(finalStrain)||finalStrain>.10)return fail(['이 고정 두께·소변형 학습모형은 mv × Δσ ≤ 0.10 범위만 표시합니다. 큰 변형에는 별도 모형이 필요합니다.']);
    const cv=k/(mv*gammaW),cvDays=cv*DAY,hdr=drainage==='double'?thickness/2:thickness;
    const timeScaleDays=hdr*hdr/cvDays,tv=timeDays/timeScaleDays,finalSettlement=finalStrain*thickness;
    if(![cv,cvDays,hdr,timeScaleDays,tv,finalSettlement].every(finite)||cv<=0||timeScaleDays<=0)return fail(['입력 조합이 압밀계수·시간의 수치 표현 범위를 넘습니다.']);
    const responseDegree=averageDegree(tv),degree=deltaStress===0?null:responseDegree,settlement=responseDegree*finalSettlement;
    const t50Days=T50*timeScaleDays,t90Days=T90*timeScaleDays;
    const positions=new Set(Array.from({length:61},(_,i)=>thickness*i/60));
    // Resolve thin early boundary layers instead of connecting a coarse-grid vertical jump.
    if(tv>0)for(const scale of [.1,.25,.5,1,2,3,5]){const z=scale*hdr*Math.sqrt(tv);if(z>0&&z<thickness){positions.add(z);if(drainage==='double')positions.add(thickness-z);}}
    const profile=[...positions].sort((a,b)=>a-b).map(depth=>({depth,excess:deltaStress*excessRatio(depth/hdr,tv)}));
    const curveEndDays=Math.max(timeDays*1.05,t90Days*1.5);
    if(!finite(curveEndDays)||!finite(finalSettlement*1000)||!finite(t90Days))return fail(['입력 조합이 표시 가능한 시간·침하 범위를 넘습니다.']);
    const timeCurve=Array.from({length:91},(_,i)=>{const days=curveEndDays*(i/90)**2,u=averageDegree(days/timeScaleDays);return{days,degree:deltaStress===0?null:u,settlement:u*finalSettlement,settlementMm:u*finalSettlement*1000};});
    return {valid:true,errors:[],...data,gammaW,cv,cvDays,hdr,tv,timeScaleDays,finalStrain,finalSettlement,finalSettlementMm:finalSettlement*1000,degree,responseDegree,settlement,settlementMm:settlement*1000,averageExcess:deltaStress*(1-responseDegree),t50Days,t90Days,profile,timeCurve,curveEndDays};
  }

  function secondary(data={}) {
    const {cAlpha,eAtStart,thicknessAtStart,startDays,endDays}=data,errors=[];
    requirePositive(errors,data,[['thicknessAtStart','기준시점 층두께 H₁'],['startDays','기준시점 t₁'],['endDays','관찰시점 t₂']]);
    requireNonnegative(errors,data,[['cAlpha','2차압축지수 Cα'],['eAtStart','기준시점 간극비 e₁']]);
    if(finite(startDays)&&finite(endDays)&&endDays<startDays)errors.push('관찰시점 t₂는 1차압밀 후 기준시점 t₁ 이상이어야 합니다.');
    if(errors.length)return fail(errors);
    const logCycles=Math.log10(endDays)-Math.log10(startDays),deltaE=cAlpha*logCycles,endE=eAtStart-deltaE;
    if(!finite(deltaE)||endE<0)return fail(['예측 간극비가 음수가 됩니다. 지수·간극비·시간 범위를 확인하세요.']);
    const modifiedIndex=cAlpha/(1+eAtStart),settlement=thicknessAtStart/(1+eAtStart)*deltaE;
    if(!finite(settlement*1000))return fail(['입력 조합이 침하의 수치 표현 범위를 넘습니다.']);
    const curve=Array.from({length:61},(_,i)=>{const cycles=logCycles*i/60,days=10**(Math.log10(startDays)+cycles);return{days,e:eAtStart-cAlpha*cycles,settlement:thicknessAtStart*modifiedIndex*cycles,settlementMm:1000*thicknessAtStart*modifiedIndex*cycles};});
    return {valid:true,errors:[],...data,logCycles,deltaE,endE,modifiedIndex,settlement,settlementMm:settlement*1000,curve};
  }
  return {DAY,sources,stressHistory,averageDegree,excessRatio,timeFactorForDegree,primary,secondary};
})();
