/* Equal vertical strain, two independently confined elastic phases in parallel. */
export const CompositeGround = (() => {
  const solve = (data = {}) => {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return {valid:false,errors:['복합지반 입력 객체가 필요합니다.']};
    const p={areaRatio:.2,soilModulus:5000,columnModulus:50000,deltaStress:100,thickness:8,...data},errors=[];
    if(!Number.isFinite(p.areaRatio)||p.areaRatio<0||p.areaRatio>1)errors.push('개량 면적비는 0~1이어야 합니다.');
    for(const [key,label] of [['soilModulus','원지반 구속계수'],['columnModulus','개량부 구속계수'],['thickness','층두께']])if(!Number.isFinite(p[key])||p[key]<=0)errors.push(`${label}는 0보다 큰 유한한 수여야 합니다.`);
    if(!Number.isFinite(p.deltaStress)||p.deltaStress<0)errors.push('응력 증가량은 0 이상의 유한한 수여야 합니다.');
    if(errors.length)return {valid:false,errors};
    const a=p.areaRatio,equivalentModulus=(1-a)*p.soilModulus+a*p.columnModulus,strain=p.deltaStress/equivalentModulus;
    const untreatedStrain=p.deltaStress/p.soilModulus,settlementMm=strain*p.thickness*1000,untreatedSettlementMm=untreatedStrain*p.thickness*1000;
    const soilStress=a<1?p.soilModulus*strain:null,columnStress=a>0?p.columnModulus*strain:null;
    const soilLoad=(1-a)*(soilStress??0),columnLoad=a*(columnStress??0),columnStiffnessFraction=a*p.columnModulus/equivalentModulus;
    const modulusRatio=p.columnModulus/p.soilModulus;
    const scalars=[equivalentModulus,strain,untreatedStrain,settlementMm,untreatedSettlementMm,soilLoad,columnLoad,columnStiffnessFraction,modulusRatio,...[soilStress,columnStress].filter(v=>v!==null)];
    if(scalars.some(v=>!Number.isFinite(v)))return {valid:false,errors:['입력으로 계산한 강성·응력·침하를 유한한 수로 표현할 수 없습니다.']};
    return {...p,valid:true,errors:[],referenceArea:1,equivalentModulus,strain,settlementMm,untreatedStrain,untreatedSettlementMm,reductionMm:untreatedSettlementMm-settlementMm,
      settlementRatio:p.deltaStress===0?null:p.soilModulus/equivalentModulus,modulusRatio,
      soilStress,columnStress,stressConcentration:p.deltaStress>0&&a>0&&a<1?modulusRatio:null,
      soilLoad,columnLoad,totalLoad:p.deltaStress,columnStiffnessFraction,
      columnLoadFraction:p.deltaStress===0?null:columnStiffnessFraction,soilLoadFraction:p.deltaStress===0?null:1-columnStiffnessFraction,
      forceResidual:soilLoad+columnLoad-p.deltaStress,compatibilityResidual:a>0&&a<1?columnStress/p.columnModulus-soilStress/p.soilModulus:0,
      smallStrainExceeded:Math.max(strain,untreatedStrain)>.1};
  };
  return {solve};
})();
