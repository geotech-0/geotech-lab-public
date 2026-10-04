/** Centre-line compression of two selected layers under a flexible rectangular surface load.
 * The stress field is homogeneous Boussinesq; M changes strain only, not the stress field.
 * Units: m, kN, kPa. This is not a layered elastic solution or total footing settlement.
 */
export const LayeredFooting=(()=>{
 const finite=v=>typeof v==='number'&&Number.isFinite(v),bad=errors=>({valid:false,errors});
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function loadState(input={}){
  if(!object(input))return bad(['기초 치수와 재하 조건이 필요합니다.']);
  const {footingWidth:width=2,footingLength:length=3,footingLoadMode:loadMode='force'}=input;
  const driver=loadMode==='force'?(input.footingLoad===undefined?600:input.footingLoad):(input.footingPressure===undefined?100:input.footingPressure);
  if(!['force','pressure'].includes(loadMode))return bad(['총하중 Q 또는 재하압 q 유지 조건을 선택하세요.']);
  if(![width,length,driver].every(finite)||width<=0||length<=0||driver<0)return bad(['B와 L은 양수, 선택한 Q 또는 q는 0 이상의 유한한 숫자입니다.']);
  const area=width*length,pressure=loadMode==='force'?driver/area:driver,load=loadMode==='force'?driver:driver*area;
  if(![area,pressure,load].every(finite)||area===0)return bad(['치수와 하중의 조합이 계산 가능한 범위를 벗어났습니다.']);
  return {valid:true,errors:[],width,length,area,pressure,load,loadMode};
 }
 // Adaptive Simpson integration of the dimensionless centre-line influence coefficient.
 // Tolerance is in metres because the integration variable is depth.
 function integrate(fn,a,b,tolerance=1e-9){
  const sample=x=>{const v=fn(x);if(!finite(v))throw new Error('응력 영향계수 계산에 실패했습니다.');return v;};
  const mid=(a+b)/2,fa=sample(a),fm=sample(mid),fb=sample(b),whole=(b-a)*(fa+4*fm+fb)/6;
  let estimatedError=0,evaluations=3;
  function visit(left,right,fl,fc,fr,previous,tol,depth){
   const centre=(left+right)/2,lm=(left+centre)/2,rm=(centre+right)/2,flm=sample(lm),frm=sample(rm);evaluations+=2;
   const sl=(centre-left)*(fl+4*flm+fc)/6,sr=(right-centre)*(fc+4*frm+fr)/6,delta=sl+sr-previous;
   if(Math.abs(delta)<=15*tol){estimatedError+=Math.abs(delta)/15;return sl+sr+delta/15;}
   if(depth===0)throw new Error('깊이 적분이 수렴하지 않았습니다. 치수와 층두께를 확인하세요.');
   return visit(left,centre,fl,flm,fc,sl,tol/2,depth-1)+visit(centre,right,fc,frm,fr,sr,tol/2,depth-1);
  }
  return {value:visit(a,b,fa,fm,fb,whole,tolerance,22),estimatedError,evaluations};
 }
 function solve(input={},rectangle=RectangularStress.rectangle){
  const loading=loadState(input);if(!loading.valid)return loading;
  const {layerStart=1,h1=2,h2=4,m1=10000,m2=5000}=input;
  if(![layerStart,h1,h2,m1,m2].every(finite))return bad(['층 시작깊이·두께·구속계수에 유한한 숫자를 입력하세요.']);
  if(layerStart<0||h1<=0||h2<=0||m1<=0||m2<=0)return bad(['시작깊이는 0 이상, 각 층의 두께와 구속계수는 양수입니다.']);
  const {width,length,pressure}=loading,bottom=layerStart+h1+h2;
  if(!finite(bottom)||bottom===layerStart||layerStart+h1===layerStart)return bad(['깊이 조합이 계산 가능한 범위를 벗어났습니다.']);
  const influence=z=>{const r=rectangle({width,length,pressure:1,x:0,y:0,depth:z});return r.valid?r.influence:NaN;};
  try{
   const layers=[{id:1,top:layerStart,bottom:layerStart+h1,height:h1,modulus:m1},{id:2,top:layerStart+h1,bottom,height:h2,modulus:m2}].map(layer=>{
    const peakStress=pressure*influence(layer.top),maxStrain=peakStress/layer.modulus;
    const integral=integrate(influence,layer.top,layer.bottom),stressIntegral=pressure*integral.value,compression=stressIntegral/layer.modulus;
    return {...layer,peakStress,maxStrain,averageStress:stressIntegral/layer.height,stressIntegral,compression,compressionMm:compression*1000,meanStrain:compression/layer.height,integrationErrorMm:pressure*integral.estimatedError/layer.modulus*1000,evaluations:integral.evaluations};
   });
   if(layers.some(layer=>!Object.values(layer).every(finite)))return bad(['결과가 계산 가능한 범위를 벗어났습니다.']);
   // At the centre of a positive uniform rectangle I(z) decreases with depth.
   // Checking each layer's top therefore also bounds every local strain in that layer.
   if(layers.some(layer=>layer.maxStrain>.1+1e-12))return bad(['지정층 내부의 국부 압축변형률 Δσ′/M가 10%를 넘습니다. 일정 구속계수 모형의 범위 밖이므로 하중 또는 물성을 확인하세요.']);
   const totalMm=layers.reduce((s,l)=>s+l.compressionMm,0),integrationErrorMm=layers.reduce((s,l)=>s+l.integrationErrorMm,0);
   const depths=[...new Set([0,layerStart,layerStart+h1,bottom,...Array.from({length:121},(_,i)=>bottom*i/120)])].sort((a,b)=>a-b);
   const profile=depths.map(depth=>({depth,influence:influence(depth),stress:pressure*influence(depth)}));
   if(profile.some(p=>!Object.values(p).every(finite)))return bad(['깊이별 응력을 계산할 수 없습니다.']);
   const lowerBoundaryStress=profile.at(-1).stress;
   return {...loading,layerStart,h1,h2,m1,m2,bottom,layers,profile,totalMm,integrationErrorMm,lowerBoundaryStress,lowerBoundaryRatio:pressure>0?lowerBoundaryStress/pressure:null,model:'homogeneous-boussinesq-centre-selected-layers-constant-M-v1'};
  }catch(error){return bad([error.message||'깊이별 응력 적분을 완료하지 못했습니다.']);}
 }
 return Object.freeze({loadState,solve});
})();
