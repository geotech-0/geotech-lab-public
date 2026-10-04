/** Given-test-value interpretation, not a constitutive prediction from water content.
 * qu and applied vertical stress: kPa; void ratios: dimensionless; thickness: m.
 */
export const SoilResponse=(()=>{
 const finite=n=>typeof n==='number'&&Number.isFinite(n),object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),bad=errors=>({valid:false,errors,warnings:[]});
 function sensitivity(input={}){
  if(!object(input))return bad(['불교란·재성형 일축압축강도를 입력하세요.']);
  const {intactQu=120,remoldedQu=20}=input;
  if(![intactQu,remoldedQu].every(finite)||intactQu<=0||remoldedQu<=0)return bad(['두 qu는 0보다 큰 유한한 값이어야 합니다. 재성형 강도가 0 또는 검출한계 이하이면 예민비를 정량화할 수 없습니다.']);
  const intactSu=intactQu/2,remoldedSu=remoldedQu/2,ratio=intactQu/remoldedQu,retained=remoldedQu/intactQu,strengthDifference=intactSu-remoldedSu;
  if(![intactSu,remoldedSu,ratio,retained,strengthDifference].every(finite)||intactSu<=0||remoldedSu<=0||ratio<=0||retained<=0)return bad(['입력 강도 조합이 계산 가능한 유한 비율 범위를 초과했습니다.']);
  const circles=[{state:'intact',qu:intactQu,center:intactSu,radius:intactSu,su:intactSu,sigma1:intactQu,sigma3:0},{state:'remolded',qu:remoldedQu,center:remoldedSu,radius:remoldedSu,su:remoldedSu,sigma1:remoldedQu,sigma3:0}];
  const warnings=ratio<1?['재성형 강도가 불교란 강도보다 큽니다. 시료·함수비·시험 및 재성형 조건의 비교 가능성을 확인하세요. 입력 순서나 값을 자동으로 바꾸지 않았습니다.']:[];
  return {valid:true,errors:[],warnings,intactQu,remoldedQu,intactSu,remoldedSu,ratio,retained,strengthDifference,circles,model:'given-saturated-undrained-ucs-sensitivity-v1'};
 }
 function wetting(input={}){
  if(!object(input))return bad(['같은 수직응력에서 침수 전·후 간극비를 입력하세요.']);
  const {beforeVoid=.9,afterVoid=.75,thickness=2,verticalStress=100}=input;
  if(![beforeVoid,afterVoid,thickness,verticalStress].every(finite)||beforeVoid<0||afterVoid<0||thickness<=0||verticalStress<0)return bad(['간극비·시험 수직응력은 0 이상, 대표층 두께는 0보다 큰 유한한 값이어야 합니다.']);
  // The reference height and void ratio are both immediately BEFORE wetting,
  // after loading to the specified stress. This is not ASTM collapse-index grading.
  const compressionStrain=(beforeVoid-afterVoid)/(1+beforeVoid),heightRatio=(1+afterVoid)/(1+beforeVoid),afterThickness=thickness*heightRatio,heightChange=-thickness*compressionStrain,settlement=-heightChange,solidsThickness=thickness/(1+beforeVoid),beforeVoidThickness=solidsThickness*beforeVoid,afterVoidThickness=solidsThickness*afterVoid;
  if(![compressionStrain,heightRatio,afterThickness,heightChange,settlement,solidsThickness,beforeVoidThickness,afterVoidThickness].every(finite)||heightRatio<=0||afterThickness<=0||solidsThickness<=0)return bad(['입력 간극비·두께 조합이 유한한 높이변화로 계산되지 않습니다.']);
  const state=afterVoid<beforeVoid?'collapse':afterVoid>beforeVoid?'swell':'unchanged';
  return {valid:true,errors:[],warnings:[],beforeVoid,afterVoid,thickness,verticalStress,compressionStrain,heightRatio,afterThickness,heightChange,settlement,solidsThickness,beforeVoidThickness,afterVoidThickness,state,model:'same-stress-measured-one-dimensional-wetting-increment-v1'};
 }
 function experiment(input={},question='remolding'){
  if(question==='remolding')return sensitivity(input);
  if(question==='wetting')return wetting(input);
  return bad(['재성형 강도 또는 침수 체적변화 질문을 선택하세요.']);
 }
 return Object.freeze({sensitivity,wetting,experiment});
})();
