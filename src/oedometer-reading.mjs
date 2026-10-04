/** Fixed educational oedometer records: read a secant; never fit or infer yield stress. */
export const OedometerReading=(()=>{
 const rows={loading:[[50,.900],[100,.885],[200,.870],[400,.780],[800,.690]],unloading:[[800,.690],[400,.705],[200,.720],[100,.735],[50,.750]]};
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 function read(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return {valid:false,errors:['시험 구간과 두 점을 선택하세요.']};
  const {testBranch='loading',testFirst=3,testLast=5}=input;
  if(!Object.hasOwn(rows,testBranch)||![testFirst,testLast].every(n=>finite(n)&&Number.isInteger(n)&&n>=1&&n<=5)||testFirst>=testLast)return {valid:false,errors:['첫 점은 1~4, 끝 점은 첫 점 이후의 2~5에서 선택하세요. 점 번호는 시험 진행 순서입니다.']};
  const points=rows[testBranch].map(([stress,e],i)=>({number:i+1,stress,e})),first=points[testFirst-1],last=points[testLast-1],deltaStress=last.stress-first.stress,deltaE=first.e-last.e,logInterval=Math.log10(last.stress/first.stress),index=deltaE/logInterval,strain=deltaE/(1+first.e),mv=strain/deltaStress,modulus=1/mv;
  const kind=testBranch==='unloading'?'Cs':testLast<=3?'Cr':testFirst>=3?'Cc':'mixed';
  return {valid:true,errors:[],model:'oedometer-educational-points-v1',testBranch,testFirst,testLast,points,first,last,deltaStress,deltaE,logInterval,index,strain,mv,modulus,kind};
 }
 return {read};
})();
