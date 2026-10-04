/** Draft bounded worksheet orchestrator. Numerical resistance/force models are reused.
 * No jurisdictional combination generator, structural foundation design, or total-settlement solver.
 * USACE EM 1110-1-1905 (31 July 2025), Table 5-2 / Eq.5-23 resistance and gross-FS convention.
 */
export const FoundationWorksheet=(()=>{
 const finite=x=>typeof x==='number'&&Number.isFinite(x),plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const sourceEdition=Object.freeze({id:'USACE-EM-1110-1-1905-2025',title:'USACE EM 1110-1-1905 · 31 July 2025',clauses:'표 5-2 · 식 5-19~5-23 (배수 저항·gross 안전율)',url:'https://publibrary.sec.usace.army.mil/api/download?filename=EM+1110-1-1905_Geotechincal+Design+of+Shallow+Foundations+on+Soils_2025+07+22+-+Final.pdf&id=54658636-77d2-48df-f26b-5295a01899a7&preview=true'});
 const limitations=Object.freeze(['균질 배수지반, 수평 지표·기초저면, 연직 사용하중과 폭 방향 모멘트만 계산합니다.','10°≤φ′≤45°, B≤L, 0≤Df/B′≤1의 구현 범위입니다.','지하수위가 기초 저면보다 높고 모멘트가 함께 작용하면 지지력 허용 비교를 보류합니다.','입력 하중조합은 사용자가 제공한 값입니다. 기준별 조합계수·LRFD 저항계수·풍하중/지진하중 증가는 생성하지 않습니다.','활동·전체안정·내진·액상화·층상지반·지반개량·기초 구조설계·지하수 변동 이력은 별도 검토 대상입니다.','자동 총침하·부등침하 계산은 포함하지 않습니다. 채택한 외부 침하 검토값이 있으면 입력한 한도와만 비교합니다.']);
 function example(){return {meta:{project:'예제 프로젝트',element:'F-01',author:'',revision:'검토 초안',date:'',criteriaReference:'예제 · 프로젝트 적용 기준 확인 필요',soilSource:'',loadSource:'',FSsource:''},geometry:{width:3,length:4,embedment:1,thickness:.3,cover:'backfilled'},soil:{gammaSoil:18,gammaSat:20,gammaConcrete:24,waterDepth:6,gammaBearing:20,phi:30,cohesion:0},method:'fhwa-vesic',requiredFS:3,combinations:[{id:'LC1',name:'사용하중 예제',columnLoad:1200,moment:0,loadNote:'기둥 전달하중; 기초·되메움 자중 제외'}],settlement:{adoptedSettlementMm:null,limitMm:null,source:''}};}
 function evaluate(input,models){
  const bad=errors=>({valid:false,errors,model:'foundation-preparation-worksheet-v1',sourceEdition,cases:[]});
  if(!plain(input)||!plain(input.meta)||!plain(input.geometry)||!plain(input.soil)||!plain(input.settlement))return bad(['계산서 메타정보·기초·지반·침하 항목이 필요합니다.']);
  const errors=[],g=input.geometry,s=input.soil,meta=input.meta;
  for(const k of ['project','element','author','revision','date','criteriaReference','soilSource','loadSource','FSsource'])if(!text(meta[k]))errors.push(`meta.${k}: 문자열을 입력하세요.`);
  for(const [where,object,keys] of [['기초',g,['width','length','embedment','thickness']],['지반',s,['gammaSoil','gammaSat','gammaConcrete','waterDepth','gammaBearing','phi','cohesion']]])for(const k of keys)if(!finite(object[k]))errors.push(`${where}.${k}: 유한한 숫자를 입력하세요.`);
  if(!['backfilled','basement'].includes(g.cover))errors.push('피복은 전면 되메움 또는 빈 지하공간입니다.');
  if(!['fhwa-vesic','usace-meyerhof'].includes(input.method))errors.push('계수 체계를 명시적으로 선택하세요.');
  if(!finite(input.requiredFS)||input.requiredFS<=1)errors.push('입력 비교 안전율은 1보다 큰 유한한 숫자여야 합니다.');
  if(!Array.isArray(input.combinations)||input.combinations.length<1||input.combinations.length>8)errors.push('사용하중조합은 1~8개입니다.');
  const ids=new Set();for(const [i,c]of(Array.isArray(input.combinations)?input.combinations:[]).entries()){
   if(!plain(c)){errors.push(`${i+1}번째 조합 형식을 확인하세요.`);continue;}
   for(const key of ['id','name','loadNote'])if(!text(c[key]))errors.push(`${i+1}번째 조합 ${key}: 문자열이 필요합니다.`);
   if(!text(c.id)||!c.id.trim()||ids.has(c.id))errors.push('하중조합 id는 비어 있지 않은 고유한 문자열이어야 합니다.');ids.add(c.id);
   if(!finite(c.columnLoad)||c.columnLoad<0||!finite(c.moment))errors.push(`${i+1}번째 조합: 기둥 하향 사용하중은 0 이상, 모멘트는 유한한 숫자입니다.`);
  }
  const settlement=input.settlement;
  for(const k of ['adoptedSettlementMm','limitMm'])if(settlement[k]!==null&&(!finite(settlement[k])||settlement[k]<0||(k==='limitMm'&&settlement[k]===0)))errors.push(`침하 ${k}: 미입력(null) 또는 ${k==='limitMm'?'양수':'0 이상'}의 mm 값이 필요합니다.`);
  if(!text(settlement.source))errors.push('침하 검토 출처는 문자열로 입력하세요.');
  if(finite(settlement.adoptedSettlementMm)&&finite(settlement.limitMm)&&settlement.limitMm>0&&!finite(settlement.adoptedSettlementMm/settlement.limitMm))errors.push('침하량과 한도의 비가 계산 가능한 범위를 벗어났습니다.');
  if(errors.length)return bad(errors);
  if(g.width<=0||g.length<g.width||g.thickness<=0||g.embedment<g.thickness)errors.push('0<B≤L 및 Df≥t>0을 확인하세요.');
  if(s.gammaSoil<=0||s.gammaSat<s.gammaSoil||s.gammaSat<=9.81||s.gammaBearing<=9.81||s.gammaConcrete<=0||s.waterDepth<0||s.cohesion<0||s.phi<10||s.phi>45)errors.push('단위중량·수위·강도 입력이 현재 배수 지반 범위에 맞지 않습니다.');
  if(errors.length)return bad(errors);
  const namespaces=models||{FoundationConditions,BearingExtensions};
  const deps={ledger:namespaces.FoundationConditions.ledger,contact:namespaces.FoundationConditions.contact,bearing:namespaces.BearingExtensions.fromLedger};
  const round=x=>Number(x.toPrecision(10)).toString(),row=(id,label,expression,substitution,result,unit)=>({id,label,expression,substitution,result,unit});
  const cases=input.combinations.map(c=>{
   const ledger=deps.ledger({...g,...s,columnLoad:c.columnLoad,gammaW:9.81});
   if(!ledger.valid)return {id:c.id,name:c.name,valid:false,errors:ledger.errors,ledger:null,contact:null,bearing:null,bearingCheck:null,contactCheck:null,formulas:[],warnings:[]};
   const warnings=[],formulas=[row('weight','총 하향하중','W = P + Wf + Wcover',`${round(c.columnLoad)} + ${round(ledger.footingWeight)} + ${round(ledger.coverWeight)}`,ledger.downwardLoad,'kN'),row('effective','기저 압축 유효합력',"V′ = W − uA",`${round(ledger.downwardLoad)} − ${round(ledger.baseWaterPressure)} × ${round(ledger.area)}`,ledger.effectiveLoad,'kN'),row('net','원면적 순증가 압력','Δq = W/A − σv0',`${round(ledger.downwardLoad)}/${round(ledger.area)} − ${round(ledger.originalTotal)}`,ledger.netIncrement,'kPa')];
   if(!ledger.contactPossible)return {id:c.id,name:c.name,valid:false,errors:['부력 후 유효합력이 0 이하이므로 압축 접촉·지지력 계산을 수행하지 않습니다.'],ledger,contact:null,bearing:null,bearingCheck:null,contactCheck:null,formulas,warnings};
   const eccentricity=c.moment/ledger.effectiveLoad,ratio=eccentricity/g.width;
   if(!finite(eccentricity)||!finite(ratio))return {id:c.id,name:c.name,valid:false,errors:['모멘트와 유효합력의 조합이 계산 가능한 범위를 벗어났습니다.'],ledger,contact:null,bearing:null,bearingCheck:null,contactCheck:null,formulas,warnings};
   formulas.push(row('eccentricity','유효합력 편심',"e′ = M/V′",`${round(c.moment)}/${round(ledger.effectiveLoad)}`,eccentricity,'m'));
   const contact=deps.contact({width:g.width,length:g.length,load:ledger.effectiveLoad,eccentricityRatio:ratio});
   if(!contact.valid)return {id:c.id,name:c.name,valid:false,errors:contact.errors,ledger,contact:null,bearing:null,bearingCheck:null,contactCheck:null,formulas,warnings};
   const contactCheck={status:contact.fullContact?'full-compression':'partial-contact',eccentricity,kernLimit:g.width/6,source:'직사각형 선형 압축 접촉·인장반력 0'};
   if(!contact.fullContact)warnings.push('합력이 핵(B/6) 밖에 있어 전면 접촉 조건을 만족하지 않습니다. 지지력 비교와 별개로 검토해야 합니다.');
   formulas.push(row('effective-area','지지력 유효면적',"A′ = (B − 2|e′|)L",`(${round(g.width)} − 2 × ${round(Math.abs(eccentricity))}) × ${round(g.length)}`,contact.effectiveArea,'m²'));
   let bearing=null,bearingCheck;
   if(ledger.baseWaterPressure>0&&c.moment!==0){
    bearingCheck={status:'not-evaluated',reason:'침수와 편심이 함께 작용하는 조건입니다. 전면 부력 후 합력에 따른 접촉 계산과 USACE 식 5-2·5-5의 문헌 요구압력 정의를 별도 검토해야 합니다.'};warnings.push(bearingCheck.reason);
   }else{
    bearing=deps.bearing(ledger,{gamma:s.gammaBearing,phi:s.phi,cohesion:s.cohesion,eccentricityRatio:ratio,method:input.method});
    if(!bearing.valid){bearingCheck={status:'not-evaluated',reason:bearing.errors.join(' ')};warnings.push(bearingCheck.reason);bearing=null;}
    else{
     const allowableGross=bearing.ultimateEffective/input.requiredFS,allowableNet=allowableGross-bearing.originalEffective,utilization=bearing.demandEffective/allowableGross;
     bearingCheck={status:utilization<=1+1e-10?'within-user-limit':'exceeds-user-limit',basis:'effective-gross',requiredFS:input.requiredFS,achievedFS:bearing.ultimateEffective/bearing.demandEffective,demandGross:bearing.demandEffective,ultimateGross:bearing.ultimateEffective,allowableGross,demandNet:bearing.demandNet,ultimateNet:bearing.ultimateNet,allowableNet,originalEffective:bearing.originalEffective,utilization};
     formulas.push(row('demand','유효 총요구압력',"q′d = V′/A′",`${round(ledger.effectiveLoad)}/${round(bearing.effectiveArea)}`,bearing.demandEffective,'kPa'),row('ultimate','극한 유효 총지지력',"q′u = c′Ncscdc + q′0Nqsqdq + 0.5B′γbNγsγdγ",`${round(bearing.terms.cohesion)} + ${round(bearing.terms.surcharge)} + ${round(bearing.terms.weight)}`,bearing.ultimateEffective,'kPa'),row('allowable','입력 FS로 나눈 gross 비교값',"q′allow,gross = q′u,gross/FS",`${round(bearing.ultimateEffective)}/${round(input.requiredFS)}`,allowableGross,'kPa'),row('allowable-net','같은 기준으로 표시한 net 비교값',"q′allow,net = q′allow,gross − q′0",`${round(allowableGross)} − ${round(bearing.originalEffective)}`,allowableNet,'kPa'));
    }
   }
   return {id:c.id,name:c.name,loadNote:c.loadNote,columnLoad:c.columnLoad,moment:c.moment,valid:true,errors:[],ledger,contact,bearing,bearingCheck,contactCheck,formulas,warnings};
  });
  const missing=['project','element','author','revision','date','criteriaReference','soilSource','loadSource','FSsource'].filter(k=>!meta[k].trim());
  const adopted=settlement.adoptedSettlementMm,limit=settlement.limitMm,settlementComplete=adopted!==null&&limit!==null&&settlement.source.trim()!=='';
  const settlementResult={...clone(settlement),status:settlementComplete?(adopted<=limit?'within-user-limit':'exceeds-user-limit'):'not-evaluated',ratio:settlementComplete?adopted/limit:null,method:'externally-adopted-value',note:'외부 검토에서 채택한 침하량의 수치 비교입니다. 이 계산서가 총침하를 계산하거나 부등침하를 검토한 결과가 아닙니다.'};
  return {valid:true,errors:[],model:'foundation-preparation-worksheet-v1',sourceEdition,method:input.method,requiredFS:input.requiredFS,cases,settlement:settlementResult,provenance:{complete:missing.length===0,missing},limitations:[...limitations],overallStatus:'no-overall-design-approval'};
 }
 return Object.freeze({evaluate,example,sourceEdition,limitations});
})();
