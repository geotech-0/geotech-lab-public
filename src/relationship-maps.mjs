/* Two-variable slices of the existing models; never an independent solver. */
export const RelationshipMaps = (()=>{
 const axis=(field,label,unit,min,max,scale='linear')=>({field,label,unit,min,max,scale});
 const fraction=(a,v)=>a.scale==='log'?(Math.log10(v)-Math.log10(a.min))/Math.log10(a.max/a.min):(v-a.min)/(a.max-a.min);
 const at=(a,t)=>t===0?a.min:t===1?a.max:a.scale==='log'?a.min*(a.max/a.min)**t:a.min+(a.max-a.min)*t;
 function create({mechanics,consolidation,cohesive}){
  function describe(key,d,q){
   if(key==='stress')return {x:axis('waterDepth','수위 깊이 zw','m',0,8),y:axis('surcharge','상재하중 q','kPa',0,120),metric:'관찰점 유효응력 σ′',unit:'kPa',formula:'σ′ = q + Σγh − γw max(0, z − zw)',note:'관찰 깊이와 지층 물성은 고정합니다. 수위 위 관찰점에서는 정수압이 0입니다. 각 점은 배수가 끝난 별도 평형 상태입니다.',fixed:['depth','soilProfile','layerDepth','gammaMoist','gammaSat','gammaMoist2','gammaSat2','gammaW']};
   if(key==='foundation'){
    const load=d.loadMode==='force'?axis('load','총하중 Q','kN',0,Math.max(3000,d.load*1.5)):axis('pressure','접지압 q','kPa',0,Math.max(400,d.pressure*1.5));
    if(q==='pressure')return{x:axis('width','기초 폭 B','m',1.5,6),y:load,metric:d.loadMode==='force'?'접지압 q':'총하중 Q',unit:d.loadMode==='force'?'kPa':'kN',formula:d.loadMode==='force'?'q = Q / B²':'Q = q B²',note:'정사각형 지표기초입니다. 선택한 하중 입력 방식은 유지하고 폭과 하중을 함께 변화시킵니다.',fixed:['loadMode','embedment']};
    if(q==='settlement')return{x:axis('width','기초 폭 B','m',1.5,6),y:load,metric:'중심점 탄성침하 S',unit:'mm',formula:'S[mm] = 1000 q B (1−ν²) If / E · If = 4 ln(1+√2)/π',note:'유연 등분포 재하면의 중심점입니다. E·ν·강도정수를 고정합니다. 접지압이 모형의 극한지지력 이상인 칸은 탄성침하 예측에서 제외합니다.',fixed:['loadMode','modulus','poisson','phi','cohesion','gamma','embedment']};
    if(q==='bearing')return{x:axis('width','기초 폭 B','m',1.5,6),y:axis('phi','마찰각 φ′','°',20,42),metric:'극한지지력 qu',unit:'kPa',formula:'qu = c′ Nc sc + 0.5 γ B Nγ sγ (지표기초)',note:'정사각형 기초의 극한저항입니다. c′·γ를 고정합니다. 하중은 이 모형의 극한저항을 바꾸지 않습니다. 허용하중이나 설계 판정이 아닙니다.',fixed:['cohesion','gamma','embedment']};
   }
   if(key==='consolidation'&&q==='primary')return{x:axis('k','투수계수 k','m/s',Math.min(1e-11,d.k/10),Math.max(1e-7,d.k*10),'log'),y:axis('thickness','실제 층두께 H','m',.1,Math.max(15,d.thickness*1.5)),metric:'평균 압밀도 90% 시간 t90',unit:'일',colorScale:'log',formula:'t90[일] = T90 Hdr² / (cv × 86400) · cv = k/(mv γw) [m²/s]',note:'mv와 배수조건을 고정합니다. H는 실제 층두께이며 Hdr는 양면배수 H/2, 일면배수 H입니다. 층두께가 바뀌면 최종침하량도 달라집니다. 색은 로그 눈금입니다.',fixed:['mv','drainage','gammaW','deltaStress']};
   if(key==='earth-pressure'&&q==='cohesive')return{x:axis('cohesion','점착력 c′','kPa',0,60),y:axis('surcharge','등분포 상재 q','kPa',0,80),metric:'무인장 접촉 주동토압 합력 Pa',unit:'kN/m',formula:'Pa = ∫₀ᴴ max[Ka(γz+q) − 2c′√Ka, 0] dz',note:'벽 높이·φ′·γ를 고정합니다. 건조한 수평 배면, 매끈한 수직벽의 주동 상태입니다. 음의 원식 압력은 인장저항으로 더하지 않습니다. 0은 이 모형의 접촉압이 없다는 뜻이며 안전 판정이 아닙니다.',fixed:['height','phi','gamma']};
   return null;
  }
  function model(key,data,question){
   const d=structuredClone(data),spec=describe(key,d,question);if(!spec)return null;
   function evaluate(x,y){
    if(![x,y].every(Number.isFinite)||[spec.x,spec.y].some((a,i)=>[x,y][i]<a.min||[x,y][i]>a.max))return {valid:false,reason:'두 축의 표시 범위 안에서 값을 선택하세요.'};
    const input={...d,[spec.x.field]:x,[spec.y.field]:y};let r,value;
    if(key==='stress'){r=mechanics.effectiveStress(input);value=r.effective;}
    else if(key==='foundation'){r=mechanics.foundationForQuestion(input,question);value=question==='bearing'?r.ultimateGross:question==='settlement'?r.settlementMm:d.loadMode==='force'?r.pressure:r.load;if(r.valid&&question==='settlement'&&!r.settlementApplicable)return{valid:false,reason:'q ≥ qu: 이 칸은 탄성침하 예측 범위 밖입니다.',input};}
    else if(key==='earth-pressure'){r=cohesive.active(input);value=r.force;}
    else{r=consolidation.primary(input);value=r.t90Days;if(r.valid&&input.deltaStress===0)return{valid:false,reason:'무재하 상태에는 실제 압밀도 90% 도달시간을 표시하지 않습니다.',input};}
    return r.valid&&Number.isFinite(value)?{valid:true,value,input}:{valid:false,reason:r.errors?.join(' ')||'이 조건에서는 값을 계산할 수 없습니다.',input};
   }
   function sample(n=21){if(!Number.isInteger(n)||n<2||n>51)throw new RangeError('sample size 2..51');const cells=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=at(spec.x,i/(n-1)),y=at(spec.y,j/(n-1));cells.push({i,j,x,y,...evaluate(x,y)});}const values=cells.filter(c=>c.valid).map(c=>c.value);return{n,cells,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null};}
   return {...spec,key,question,data:d,evaluate,sample,current:{x:d[spec.x.field],y:d[spec.y.field]}};
  }
  return{describe,model};
 }
 return{create,fraction,at};
})();
