/** Explicit plane equilibria for learning; not a global slip-surface search. */
export const SlopeModels=(()=>{
 const rad=x=>x*Math.PI/180,finite=x=>typeof x==='number'&&Number.isFinite(x),bad=errors=>({valid:false,errors}),numeric=o=>Object.entries(o).filter(([,v])=>!finite(v)).map(([k])=>`${k}: 유한한 숫자가 필요합니다.`);
 function infinite(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['숫자 입력 객체가 필요합니다.']);
  const {beta=25,depth=2,cohesion=5,phi=30,gammaMoist=18,gammaSat=20,waterFraction=.5,surcharge=0,gammaW=9.81}=input,errors=numeric({beta,depth,cohesion,phi,gammaMoist,gammaSat,waterFraction,surcharge,gammaW});if(errors.length)return bad(errors);
  if(beta<=0||beta>=90||phi<0||phi>=90||depth<=0||cohesion<0||surcharge<0)errors.push('0<사면각<90°, 0≤마찰각<90°, 깊이>0, 점착력·상재≥0 조건을 확인하세요.');
  if(waterFraction<0||waterFraction>1||gammaMoist<=0||gammaSat<gammaMoist||gammaW<=0||gammaSat<=gammaW)errors.push('수위 비율0~1과 양수 단위중량(γsat≥γmoist, γsat>γw)을 확인하세요.');if(errors.length)return bad(errors);
  const b=rad(beta),p=rad(phi),waterHeight=waterFraction*depth,verticalStress=surcharge+gammaMoist*(depth-waterHeight)+gammaSat*waterHeight;
  const normal=verticalStress*Math.cos(b)**2,pore=gammaW*waterHeight*Math.cos(b)**2,effectiveNormal=normal-pore,driving=verticalStress*Math.sin(b)*Math.cos(b),friction=effectiveNormal*Math.tan(p),resistance=cohesion+friction,factor=resistance/driving;
  const values={waterHeight,verticalStress,normal,pore,effectiveNormal,driving,friction,resistance,factor};if(!Object.values(values).every(finite))return bad(['입력 크기가 계산 범위를 초과했습니다.']);
  return {valid:true,errors:[],...values,beta,depth,cohesion,phi,gammaMoist,gammaSat,waterFraction,surcharge,gammaW,model:'infinite-slope-parallel-seepage-vertical-depth'};
 }
 function weakLayer(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['숫자 입력 객체가 필요합니다.']);
  const {beta=25,weakDepth=3,waterDepth=.4,strongDepth=1.5,cohesion=8,phiStrong=35,phiWeak=15,gamma=20,gammaW=9.81}=input,errors=numeric({beta,weakDepth,waterDepth,strongDepth,cohesion,phiStrong,phiWeak,gamma,gammaW});if(errors.length)return bad(errors);
  if(weakDepth<=0||strongDepth<=0||waterDepth<0||phiWeak>phiStrong)errors.push('후보면 깊이는 양수, 수위깊이는 0 이상, 약층 마찰각은 모층 이하로 설정하세요.');if(errors.length)return bad(errors);
  const at=(depth,phi,name)=>({...infinite({beta,depth,cohesion,phi,gammaMoist:gamma,gammaSat:gamma,waterFraction:Math.max(0,depth-waterDepth)/depth,gammaW}),name});
  const strong=at(strongDepth,phiStrong,'모층 후보면'),weak=at(weakDepth,phiWeak,'약층 후보면');if(!strong.valid||!weak.valid)return bad([...(strong.errors||[]),...(weak.errors||[])]);
  const difference=strong.factor-weak.factor,critical=Math.abs(difference)<1e-9?'equal':difference>0?'weak':'strong';
  return {valid:true,errors:[],beta,weakDepth,strongDepth,waterDepth,cohesion,phiStrong,phiWeak,gamma,strong,weak,critical,minimum:Math.min(strong.factor,weak.factor),model:'two-specified-infinite-slope-candidates'};
 }
 function drawdown(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['숫자 입력 객체가 필요합니다.']);
  const {length=12,beta=30,alpha=20,gamma=20,cohesion=3,phi=28,initialWater=3,finalWater=.5,stage='rapid',gammaW=9.81}=input,errors=numeric({length,beta,alpha,gamma,cohesion,phi,initialWater,finalWater,gammaW});if(errors.length)return bad(errors);
  if(length<=0||alpha<=0||beta<=alpha||beta>=80||phi<0||phi>=70||cohesion<0||gamma<=gammaW||gammaW<=0)errors.push('L>0, 0<활동면각 α<사면각 β<80°, γ>γw, c≥0 조건을 확인하세요.');
  if(!['initial','slow','rapid'].includes(stage))errors.push('초기·느린저하·급속저하 중 하나를 선택하세요.');if(errors.length)return bad(errors);
  const a=rad(alpha),b=rad(beta),backSlipHeight=length*Math.tan(a),crestHeight=length*Math.tan(b);
  if(finalWater<0||initialWater<finalWater||initialWater>backSlipHeight) return bad([`0≤저하 후 수위≤초기 수위≤활동면 뒤끝 높이 ${backSlipHeight.toFixed(2)} m로 입력하세요. 뒤쪽 균열면의 물 하중은 없는 모형입니다.`]);
  const area=.5*length*(crestHeight-backSlipHeight),weight=area*gamma,baseLength=length/Math.cos(a);
  const calc=(name,external,internal)=>{
   const outsideForce=gammaW*external**2/(2*Math.sin(b)),poreForce=gammaW*internal**2/(2*Math.sin(a));
   const normal=weight*Math.cos(a)+outsideForce*Math.cos(b-a),effectiveNormal=normal-poreForce,driving=weight*Math.sin(a)-outsideForce*Math.sin(b-a);
   const friction=effectiveNormal*Math.tan(rad(phi)),resistance=cohesion*baseLength+friction;
   return {name,external,internal,outsideForce,poreForce,normal,effectiveNormal,driving,friction,resistance,contact:effectiveNormal>=0,factor:effectiveNormal>=0&&driving>0?resistance/driving:null};
  };
  const cases=[calc('initial',initialWater,initialWater),calc('slow',finalWater,finalWater),calc('rapid',finalWater,initialWater)],current=cases.find(x=>x.name===stage);
  if(![area,weight,baseLength,...cases.flatMap(c=>[c.outsideForce,c.poreForce,c.normal,c.effectiveNormal,c.driving,c.resistance])].every(finite))return bad(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
  return {valid:true,errors:[],length,beta,alpha,gamma,cohesion,phi,initialWater,finalWater,stage,gammaW,backSlipHeight,crestHeight,area,weight,baseLength,cases,current,model:'specified-wedge-water-load-and-retained-base-pressure'};
 }
 return {infinite,weakLayer,drawdown};
})();
