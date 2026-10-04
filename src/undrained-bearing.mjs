/** Homogeneous saturated clay, short-term phi_u=0, central vertical load on a
 * square surface footing. Units: width m, totalLoad kN, su and pressures kPa.
 * FHWA NHI-06-089 Eq.8-4 and Table 8-4; no effective-stress strength inputs.
 */
export const UndrainedBearing=(()=>{
 const finite=v=>typeof v==='number'&&Number.isFinite(v),bad=errors=>({valid:false,errors});
 function capacity(input={}){
  if(input===null||typeof input!=='object'||Array.isArray(input))return bad(['비배수강도·기초 폭·전체 하중을 입력하세요.']);
  const {width=3,totalLoad=1200,su=50}=input,errors=[];
  if(!finite(width)||width<=0)errors.push('기초 폭 B는 0보다 큰 유한한 숫자여야 합니다.');
  if(!finite(totalLoad)||totalLoad<0)errors.push('전체 전달 하중 W는 0 이상의 유한한 숫자여야 합니다.');
  if(!finite(su)||su<0)errors.push('비배수강도 su는 0 이상의 유한한 숫자여야 합니다.');
  if(input.embedment!==undefined&&input.embedment!==0)errors.push('현재 비배수 질문은 지표기초 Df=0에 한정됩니다.');
  if(input.length!==undefined&&input.length!==width)errors.push('현재 비배수 질문은 정사각형 L=B에 한정됩니다.');
  if(['phi','cohesion','waterDepth','eccentricityRatio'].some(k=>Object.hasOwn(input,k)))errors.push('이 비배수 모형에는 φ′·c′·수위·편심 입력을 함께 적용하지 않습니다.');
  if(errors.length)return bad(errors);
  const area=width**2,nc=2+Math.PI,sc=1.2,ultimateNet=su*nc*sc,ultimateGross=ultimateNet,ultimateLoad=ultimateNet*area,pressure=totalLoad/area,pressureMargin=ultimateNet-pressure,loadMargin=ultimateLoad-totalLoad;
  const ratio=pressure>0?ultimateNet/pressure:null;
  if(area<=0||![area,ultimateNet,ultimateLoad,pressure,pressureMargin,loadMargin,...(ratio===null?[]:[ratio])].every(finite))return bad(['입력 크기가 계산 가능한 유한한 면적·하중 범위를 벗어났습니다.']);
  const tolerance=1e-10*Math.max(1,pressure,ultimateNet),state=totalLoad===0?'no-demand':Math.abs(pressureMargin)<=tolerance?'equal':pressureMargin>0?'below':'above';
  return {valid:true,errors:[],width,length:width,area,totalLoad,su,pressure,nc,sc,nq:1,ngamma:0,embedment:0,overburden:0,ultimateNet,ultimateGross,ultimateLoad,pressureMargin,loadMargin,ratio,state,stripUltimate:su*nc,model:'fhwa-2006-phi-u-zero-surface-square-v1'};
 }
 return Object.freeze({capacity});
})();
