/* Plotted USACE test symbols, manually digitized. Not a compaction-energy model. */
export const CompactionEvidence = (() => {
  const pcfToKNm3=0.45359237*9.80665/(0.3048**3)/1000;
  const source={title:'USACE EM 1110-3-141 (1984), Figure 3-1A',url:'https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-3-141.pdf',printedPage:'3-3',soil:'CL · LL 37 · PI 14',kind:'approximate-plot-reading',waterReadingAllowance:.3,densityReadingAllowance:.75*pcfToKNm3};
  const raw=[
    [12,'triangle',[[10.1,95.5],[12.5,98.5],[13.7,100.5],[15.7,103.5],[16.9,104.5],[18.2,104],[19.9,103],[21.5,101]]],
    [26,'square',[[10,102.5],[12.5,107],[13.7,109],[15.3,111],[17.9,108],[19.9,105]]],
    [55,'circle',[[10,109.5],[12.5,114],[14.2,116],[15.6,115],[17.3,112],[19.9,106.5]]],
  ];
  const series=raw.map(([blowsPerLayer,marker,rows])=>{
    const points=rows.map(([w,dryDensityPcf])=>Object.freeze({w,dryDensityPcf,gammaDry:dryDensityPcf*pcfToKNm3}));
    return Object.freeze({blowsPerLayer,marker,points:Object.freeze(points),sampledPeak:points.reduce((a,b)=>b.gammaDry>a.gammaDry?b:a)});
  });
  Object.freeze(series);Object.freeze(source);
  const readAt=(curve,w)=>{
    if(w<curve.points[0].w||w>curve.points.at(-1).w)return null;
    const measured=curve.points.find(p=>Math.abs(p.w-w)<1e-9);
    if(measured)return {...measured,kind:'digitized-test-symbol',bracket:[measured.w,measured.w]};
    const j=curve.points.findIndex(p=>p.w>w),p=curve.points[j-1],q=curve.points[j],t=(w-p.w)/(q.w-p.w);
    return {w,gammaDry:p.gammaDry+(q.gammaDry-p.gammaDry)*t,dryDensityPcf:p.dryDensityPcf+(q.dryDensityPcf-p.dryDensityPcf)*t,kind:'straight-connector',bracket:[p.w,q.w]};
  };
  const solve=(data={})=>{
    if(data===null||typeof data!=='object'||Array.isArray(data))return {valid:false,errors:['다짐자료 선택 입력이 필요합니다.']};
    const {effort='55',observeW=15}=data;
    const key=typeof effort==='number'?effort:typeof effort==='string'?({'12':12,'26':26,'55':55}[effort]):NaN;
    const selected=series.find(s=>s.blowsPerLayer===key),errors=[];
    if(!selected)errors.push('원자료의 12·26·55회/층 중에서 선택하세요. 다른 에너지의 곡선을 만들지 않습니다.');
    if(typeof observeW!=='number'||!Number.isFinite(observeW)||observeW<10.1||observeW>19.9)errors.push('관찰 함수비는 세 계열의 공통 판독 범위 10.1~19.9% 안이어야 합니다.');
    if(errors.length)return {valid:false,errors};
    const readings=series.map(s=>({blowsPerLayer:s.blowsPerLayer,...readAt(s,observeW)}));
    return {valid:true,errors:[],source,series,effort:String(key),blowsPerLayer:key,observeW,selected,atWater:readings.find(r=>r.blowsPerLayer===key),readings,highMinusLow:readings[2].gammaDry-readings[0].gammaDry,pcfToKNm3,model:'usace-compaction-digitized-evidence-v1'};
  };
  return Object.freeze({solve,series,source,pcfToKNm3});
})();
