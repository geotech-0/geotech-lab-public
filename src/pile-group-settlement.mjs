/** Square friction-pile group equivalent raft + 1H:2V spread, selected layer only.
 * Lengths m, groupLoad kN, constrained layerModulus kPa. Compression positive.
 * The constant-M layer integral is this explicitly limited teaching model.
 */
export const PileGroupSettlement=(()=>{
 const defaults=Object.freeze({countSide:3,spacingRatio:3,length:20,diameter:.6,groupLoad:5000,layerTop:20,layerThickness:10,layerModulus:8000});
 const source=Object.freeze({url:'https://www.fhwa.dot.gov/engineering/geotech/pubs/gec8/gec8.pdf',title:'FHWA GEC 8 (2007), §5.5.3.3, pp.99–101, Figs.5.19–5.20',equivalentDepthFraction:2/3,horizontalToVertical:.5});
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const fail=errors=>({valid:false,errors,warnings:[]});
 function solve(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return fail(['군말뚝과 압축층의 수치 입력이 필요합니다.']);
  const d=Object.fromEntries(Object.keys(defaults).map(k=>[k,input[k]===undefined?defaults[k]:input[k]]));
  if(Object.values(d).some(v=>!finite(v)))return fail(['군말뚝 치수·하중·압축층 입력은 유한한 숫자여야 합니다.']);
  const {countSide,spacingRatio,length,diameter,groupLoad,layerTop,layerThickness,layerModulus}=d,errors=[];
  if(!Number.isInteger(countSide)||countSide<2||countSide>100)errors.push('한 변의 말뚝 수는 2–100의 정수여야 합니다.');
  if(diameter<=0||length<=0||spacingRatio<=1)errors.push('길이·직경은 양수이고 중심간격은 직경보다 커야 합니다.');
  if(diameter>0&&length/diameter<5)errors.push('이 마찰말뚝군 학습 예제는 L/D≥5로 제한합니다.');
  if(groupLoad<0)errors.push('추가 사용하중 Q는 0 이상이어야 합니다.');
  if(layerTop<0||layerThickness<0||layerModulus<=0)errors.push('압축층 깊이·두께는 0 이상, 구속계수 M은 0보다 커야 합니다.');
  const equivalentDepth=2*length/3;
  if(layerTop<equivalentDepth)errors.push(`압축층 상면은 등가기초 깊이 2L/3=${equivalentDepth.toFixed(2)} m 이상이어야 합니다. 층 상면 깊이 또는 말뚝 길이를 확인하세요.`);
  if(errors.length)return fail(errors);
  const spacing=spacingRatio*diameter,width=(countSide-1)*spacing+diameter,area=width*width,count=countSide**2;
  const offset=layerTop-equivalentDepth,layerBottom=layerTop+layerThickness,spreadTop=width+offset,spreadBottom=spreadTop+layerThickness;
  const equivalentPressure=groupLoad/area,stressTop=groupLoad/spreadTop**2,stressBottom=groupLoad/spreadBottom**2;
  // Stable exact integral: avoids subtracting nearly equal reciprocals for thin layers.
  const averageStress=groupLoad/(spreadTop*spreadBottom),stressIntegral=averageStress*layerThickness,settlement=stressIntegral/layerModulus;
  const maxVerticalStrain=stressTop/layerModulus,averageVerticalStrain=averageStress/layerModulus;
  if(![equivalentDepth,spacing,width,area,count,offset,layerBottom,spreadTop,spreadBottom,spreadTop*spreadBottom,spreadTop**2,spreadBottom**2,equivalentPressure,stressTop,stressBottom,averageStress,stressIntegral,settlement,maxVerticalStrain].every(finite))return fail(['입력 크기가 계산 가능한 범위를 초과했습니다.']);
  if(maxVerticalStrain>.10)return fail(['층 상면의 Δσ′/M이 10%를 넘습니다. 이 일정 M·작은 변형 학습모형의 표시 범위(10% 이하) 밖입니다. 10%는 설계 허용변형률이 아닙니다.']);
  const profile=Array.from({length:layerThickness===0?1:81},(_,i)=>{
   const withinLayer=layerThickness*i/80,depth=layerTop+withinLayer,z=depth-equivalentDepth,spreadWidth=width+z,stress=groupLoad/spreadWidth**2;
   return {depth,withinLayer,z,spreadWidth,stress,verticalStrain:stress/layerModulus,cumulativeSettlement:((groupLoad/spreadTop)/spreadWidth)*withinLayer/layerModulus};
  });
  return {valid:true,errors:[],warnings:[],...d,count,spacing,width,area,equivalentDepth,offset,layerBottom,spreadTop,spreadBottom,equivalentPressure,stressTop,stressBottom,averageStress,stressIntegral,settlement,settlementMm:settlement*1000,maxVerticalStrain,averageVerticalStrain,profile,source,model:'pile-group-equivalent-raft-2to1-constant-M-v1'};
 }
 return Object.freeze({defaults,source,solve});
})();
