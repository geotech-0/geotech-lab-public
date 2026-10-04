/** The old lesson remains the interpreter for all pre-staged saved experiments. */
function createExcavationLab(legacy) {
  const current=ExcavationView.lab,isCurrent=d=>d?.modelVersion===2;
  const fields={height:'최대 굴착깊이',embedment:'근입깊이',EI:'벽체 강성',soil:'원지반 물성',fill:'되메움 물성',water:'수위',surcharge:'상재하중',clearance:'설치 작업여유',releaseLinked:'해체 연동',releaseClearance:'해체 작업여유',supports:'지보 종류·배치·시공',plan:'평면 배치·띠장',mesh:'해석 메시',increment:'공정 증분'};
  return {
    ...current,key:'excavation',
    meta:{...current.meta,name:'흙막이 시공과정',questions:[['construction','시공과정'],...legacy.meta.questions]},
    bounds:{},
    questionsFor:d=>isCurrent(d)?[]:legacy.meta.questions,
    activeFields:(d,q)=>isCurrent(d)?Object.keys(fields):legacy.activeFields(d,q),
    sessionShape:ExcavationSchema.validateData,
    sessionLegacyShape:ExcavationSchema.validateLegacyData,
    sessionLegacyQuestions:['displacement','moment'],
    restoreData:ExcavationSchema.restoreData,
    controls:(d,q)=>isCurrent(d)?current.controls(d,q):'<div class="hint">이전 선형 앵커 실험의 입력과 계산을 유지하고 있습니다.</div><button type="button" class="secondary" data-ex-upgrade>새 시공과정 실험 열기</button>'+legacy.controls(d,q),
    compute:(d,q)=>isCurrent(d)?current.compute(d,q):legacy.compute(d,q),
    render:context=>{
      const same=isCurrent(context.data)===isCurrent(context.baselineData);
      const baselineData=isCurrent(context.data)&&isCurrent(context.baselineData)?{...context.baselineData,observation:{...context.data.observation}}:context.baselineData;
      return (isCurrent(context.data)?current:legacy).render({...context,baseline:same?context.baseline:null,baselineData,question:isCurrent(context.data)?'construction':context.question});
    },
    onFieldChange:(d,f,b)=>isCurrent(d)?current.onFieldChange?.(d,f,b):legacy.onFieldChange?.(d,f,b),
    baselineInput:(d,b)=>isCurrent(d)&&isCurrent(b)?{...b,observation:{...d.observation}}:b,
    comparisonSummary:(d,b,name)=>{
      if(!isCurrent(d)&&!isCurrent(b))return null;
      if(isCurrent(d)!==isCurrent(b))return `기준: ${esc(name)}<br>이전 선형 실험과 새 탄소성 실험은 해석 가정이 달라 곡선을 겹치지 않습니다. 현재 입력을 새 기준으로 저장하면 비교할 수 있습니다.`;
      const changes=Object.entries(fields).filter(([k])=>JSON.stringify(d[k])!==JSON.stringify(b[k])).map(([,label])=>label);
      return `기준: ${esc(name)} · 현재 공정·깊이에 맞춰 비교<br>${changes.length?esc(changes.join(' · '))+' 변경':'같은 물성·배치·시공 조건입니다.'}`;
    },
  };
}
