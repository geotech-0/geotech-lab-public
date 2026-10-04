/** Force bookkeeping and one-axis rigid footing contact. m, kN, kPa. */
export const FoundationConditions=(()=>{
 const finite=x=>typeof x==='number'&&Number.isFinite(x),bad=errors=>({valid:false,errors});
 const validate=o=>Object.entries(o).filter(([,v])=>!finite(v)).map(([k])=>`${k}: 유한한 숫자를 입력하세요.`);
 function ledger(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['입력은 값과 단위를 가진 객체여야 합니다.']);
  const {width=3,length=3,embedment=2,thickness=.5,columnLoad=1200,gammaSoil=18,gammaSat=20,gammaConcrete=24,waterDepth=4,gammaW=9.81,cover='backfilled'}=input;
  const errors=validate({width,length,embedment,thickness,columnLoad,gammaSoil,gammaSat,gammaConcrete,waterDepth,gammaW});if(errors.length)return bad(errors);
  if(width<=0||length<=0||thickness<=0||embedment<thickness)errors.push('폭·길이·기초 두께는 양수이며 근입깊이는 두께 이상이어야 합니다.');
  if(columnLoad<0||waterDepth<0)errors.push('기둥하중과 지하수위 깊이는 0 이상이어야 합니다.');
  if(gammaSoil<=0||gammaW<=0||gammaSat<gammaSoil||gammaSat<=gammaW||gammaConcrete<=0)errors.push('단위중량은 양수, 포화 γsat≥습윤 γ 및 γsat>γw 조건을 확인하세요.');
  if(!['backfilled','basement'].includes(cover))errors.push('되메움 또는 빈 지하공간을 선택하세요.');if(errors.length)return bad(errors);
  const area=width*length;
  const overburden=z=>gammaSoil*Math.min(z,waterDepth)+gammaSat*Math.max(0,z-waterDepth);
  const originalTotal=overburden(embedment),baseWaterPressure=gammaW*Math.max(0,embedment-waterDepth),originalEffective=originalTotal-baseWaterPressure;
  const footingWeight=area*thickness*gammaConcrete,coverWeight=cover==='backfilled'?area*overburden(embedment-thickness):0;
  const downwardLoad=columnLoad+footingWeight+coverWeight,uplift=baseWaterPressure*area,effectiveLoad=downwardLoad-uplift;
  const grossTotal=downwardLoad/area,grossEffective=effectiveLoad/area,netIncrement=grossTotal-originalTotal;
  const values={area,originalTotal,baseWaterPressure,originalEffective,footingWeight,coverWeight,downwardLoad,uplift,effectiveLoad,grossTotal,grossEffective,netIncrement,removedWeight:originalTotal*area};
  if(!Object.values(values).every(finite))return bad(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
  return {valid:true,errors:[],...values,width,length,embedment,thickness,columnLoad,gammaSoil,gammaSat,gammaConcrete,waterDepth,gammaW,cover,contactPossible:effectiveLoad>0,model:'same-area-excavation-hydrostatic-force-ledger'};
 }
 function contact(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['입력은 값과 단위를 가진 객체여야 합니다.']);
  const {width=3,length=3,load=1200,eccentricityRatio=.1}=input,errors=validate({width,length,load,eccentricityRatio});
  if(errors.length)return bad(errors);if(width<=0||length<=0||load<=0)errors.push('폭·길이와 압축하중은 0보다 커야 합니다.');
  if(Math.abs(eccentricityRatio)>=.5)errors.push('|e|≥B/2이면 이 압축 접촉 모형에서 평형을 만들 수 없습니다. 편심을 줄이세요.');if(errors.length)return bad(errors);
  const eccentricity=eccentricityRatio*width,area=width*length,average=load/area,absE=Math.abs(eccentricity),fullContact=Math.abs(eccentricityRatio)<=1/6;
  const contactWidth=fullContact?width:3*(width/2-absE),qMin=fullContact?average*(1-6*Math.abs(eccentricityRatio)):0,qMax=fullContact?average*(1+6*Math.abs(eccentricityRatio)):2*load/(length*contactWidth);
  const start=fullContact?-width/2:eccentricity>0?width/2-contactWidth:-width/2,end=start+contactWidth;
  const at=x=>x<start||x>end?0:fullContact?average*(1+12*eccentricity*x/width**2):qMax*(eccentricity>0?(x-start)/contactWidth:(end-x)/contactWidth);
  const xs=[...new Set([...Array.from({length:81},(_,i)=>-width/2+width*i/80),start,end])].sort((a,b)=>a-b),profile=xs.map(x=>({x,pressure:at(x)}));
  const effectiveWidth=width-2*absE,effectiveArea=effectiveWidth*length,equivalentPressure=load/effectiveArea,moment=load*eccentricity;
  if(![area,average,contactWidth,qMin,qMax,effectiveWidth,effectiveArea,equivalentPressure,moment,...profile.map(p=>p.pressure)].every(finite))return bad(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
  return {valid:true,errors:[],width,length,load,eccentricityRatio,eccentricity,moment,area,average,fullContact,contactWidth,start,end,qMin,qMax,effectiveWidth,effectiveArea,equivalentPressure,profile,model:'rigid-footing-linear-compression-only-one-axis'};
 }
 return {ledger,contact};
})();
