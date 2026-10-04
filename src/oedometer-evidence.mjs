/** USGS published stage-end observations. Preserve order; never generate a specimen response. */
export const OedometerEvidence=(()=>{
 const source=Object.freeze({title:'Garcia & Waite · USGS GeoTac Frame 1',doi:'10.5281/zenodo.15021308',url:'https://zenodo.org/records/15021308',metadataUrl:'https://cmgds.marine.usgs.gov/catalog/whcmsc/zenodo/ZEN_15021308/HSP-Consolidation-Permeability-Kaolin_meta.faq.html',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',original:'assets/data/oedometer-usgs-15021308-original.xlsx',extracted:'assets/data/oedometer-usgs-15021308-points.json',sha256:'c77b7842e0667b59fed5f06584b753460b9a3956f9dcd8b0ac8ae770bc9eeeca',material:'Peerless 2 카올린 · 탈이온수',device:'GeoTac Frame 1 · 고정링 압밀시험',aspectRatio:2.5,publishedCc:.421,publishedCr:.08734452701626332});
 // [effective vertical stress MPa, void ratio], Consolidation!O8:O19 / N8:N19.
 const rows=[
  [.027819255219418932,1.5694009223781145],
  [.048062362521877365,1.4667269742613758],
  [.10479344769834117,1.291736593606031],
  [.341314986890735,1.0697040671356617],
  [1.0211357838253685,.8854001927542371],
  [.34131498689073536,.9143391328380862],
  [1.0211357838253685,.8727694147953169],
  [3.4131498689073534,.684266193213445],
  [5.9975925679977,.5810757381218471],
  [2.0366532139570626,.6328773865889332],
  [.5997592567997695,.7015364405133583],
  [.1404588423418664,.7800400446309634]
 ];
 const points=Object.freeze(rows.map(([stressMPa,e],i)=>Object.freeze({number:i+1,sourceRow:i+8,stressMPa,stress:stressMPa*1000,e})));
 const branches=Object.freeze(Object.fromEntries([
  ['loading','처음 재하',[1,2,3,4,5],2],
  ['reloading','짧은 제하 후 재재하',[6,7],1],
  ['continued','이전 최대를 넘어 추가 재하',[7,8,9],1],
  ['unloading','마지막 제하',[9,10,11,12],1]
 ].map(([key,label,numbers,first])=>[key,Object.freeze({key,label,numbers:Object.freeze(numbers),count:numbers.length,defaultFirst:first,defaultLast:numbers.length})])));
 const defaults=Object.freeze({evidenceBranch:'loading',evidenceFirst:2,evidenceLast:5});
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function read(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return {valid:false,errors:['실제 기록의 경로와 두 점을 선택하세요.']};
  const {evidenceBranch='loading'}=input;
  if(typeof evidenceBranch!=='string'||!Object.hasOwn(branches,evidenceBranch))return {valid:false,errors:['제공한 실제 기록의 네 경로 중 하나를 선택하세요.']};
  const branch=branches[evidenceBranch],evidenceFirst=input.evidenceFirst===undefined?branch.defaultFirst:input.evidenceFirst,evidenceLast=input.evidenceLast===undefined?branch.defaultLast:input.evidenceLast;
  if(![evidenceFirst,evidenceLast].every(n=>finite(n)&&Number.isInteger(n)&&n>=1&&n<=branch.count)||evidenceFirst>=evidenceLast)return {valid:false,errors:[`선택 경로의 ${branch.count}개 점에서 첫 점보다 뒤의 끝 점을 선택하세요. 번호는 응력 크기가 아닌 시험 순서입니다.`]};
  const branchPoints=branch.numbers.map((number,i)=>Object.freeze({...points[number-1],branchNumber:i+1})),first=branchPoints[evidenceFirst-1],last=branchPoints[evidenceLast-1];
  const deltaStress=last.stress-first.stress,deltaE=first.e-last.e,logInterval=Math.log10(last.stress/first.stress),index=deltaE/logInterval,strain=deltaE/(1+first.e),mv=strain/deltaStress,modulus=1/mv;
  // Published Cc lower bound excludes point 1. The reloading endpoint at point 7
  // is not silently treated as a virgin-compression observation.
  const kind=evidenceBranch==='unloading'?'Cs':evidenceBranch==='reloading'?'Cr':evidenceBranch==='loading'&&evidenceFirst>=2||evidenceBranch==='continued'&&evidenceFirst>=2?'Cc':'Csec';
  return {valid:true,errors:[],model:'usgs-geotac1-stage-end-v1',source,points,branch,branchPoints:Object.freeze(branchPoints),evidenceBranch,evidenceFirst,evidenceLast,first,last,deltaStress,deltaE,logInterval,index,strain,mv,modulus,kind};
 }
 return Object.freeze({read,source,points,branches,defaults});
})();
