/** Educational axial pile models. kN, m, kPa; modulus GPa; movement inputs mm.
 * Hyperbolic t-z/q-z parameters are specified examples, not design correlations.
 */
export const PileModels=(()=>{
 const finite=x=>typeof x==='number'&&Number.isFinite(x),obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const bad=errors=>({valid:false,errors,warnings:[]});
 const defaults={length:20,diameter:.6,layerDepth:8,tau1:35,tau2:70,toeStress:2500,modulus:30,shaft50:5,toe50:30,headLoad:500,groundSettlement:50,settlementDepth:10};
 function capacity(input={}){
  if(!obj(input))return bad(['말뚝과 층별 저항을 입력하세요.']);const d={...defaults,...input},errors=[];
  for(const f of ['length','diameter','layerDepth','toeStress'])if(!finite(d[f]))errors.push(`${f}: 유한한 숫자를 입력하세요.`);
  if(errors.length)return bad(errors);
  if(d.length<=0||d.diameter<=0||d.layerDepth<0||d.toeStress<0)return bad(['L>0, D>0, 층 경계 깊이≥0, 선단 단위저항≥0이어야 합니다.']);
  const upperLength=Math.min(d.length,d.layerDepth),lowerLength=d.length-upperLength;
  for(const [key,len]of [['tau1',upperLength],['tau2',lowerLength]])if(len>0&&(!finite(d[key])||d[key]<0))errors.push(`${key}: 관입한 층의 단위 주면저항은 0 이상이어야 합니다.`);
  if(errors.length)return bad(errors);
  const perimeter=Math.PI*d.diameter,area=Math.PI*d.diameter**2/4,shaftUpper=upperLength?perimeter*upperLength*d.tau1:0,shaftLower=lowerLength?perimeter*lowerLength*d.tau2:0,shaftUltimate=shaftUpper+shaftLower,toeUltimate=area*d.toeStress,ultimate=shaftUltimate+toeUltimate;
  if(![perimeter,area,shaftUpper,shaftLower,toeUltimate,ultimate].every(finite))return bad(['계산 가능한 크기를 벗어났습니다.']);
  return {valid:true,errors:[],warnings:[],...d,upperLength,lowerLength,perimeter,area,shaftUpper,shaftLower,shaftUltimate,toeUltimate,ultimate,model:'specified-two-layer-pile-resistance-v1'};
 }
 function hyperbolic(relative,limit,half,compressionOnly=false){
  if(compressionOnly&&relative<=0)return {force:0,tangent:relative===0?limit/half:0};
  return {force:limit*relative/(half+Math.abs(relative)),tangent:limit*half/(half+Math.abs(relative))**2};
 }
 function tridiagonal(diagonal,off,rhs){
  const a=diagonal.slice(),b=rhs.slice();for(let i=1;i<a.length;i++){if(!finite(a[i-1])||a[i-1]<=0)return null;const ratio=off[i-1]/a[i-1];a[i]-=ratio*off[i-1];b[i]-=ratio*b[i-1];}if(a.at(-1)<=0)return null;const out=new Array(a.length);out[a.length-1]=b.at(-1)/a.at(-1);for(let i=a.length-2;i>=0;i--)out[i]=(b[i]-off[i]*out[i+1])/a[i];return out.every(finite)?out:null;
 }
 function axial(input={},options={}){
  const c=capacity(input);if(!c.valid)return c;const d=c,errors=[];const law=options.law??'hyperbolic',segments=options.segments??80,soilProfile=options.soilProfile??'linear';
  for(const f of ['modulus','shaft50','toe50','headLoad','groundSettlement','settlementDepth'])if(!finite(d[f]))errors.push(`${f}: 유한한 숫자를 입력하세요.`);
  if(errors.length)return bad(errors);
  if(d.modulus<=0||d.shaft50<=0||d.toe50<=0||d.headLoad<0||d.groundSettlement<0||d.settlementDepth<=0)errors.push('E·동원변위·침하영향깊이는 양수, Q·지반침하는 0 이상이어야 합니다.');
  if(!Number.isInteger(segments)||segments<8||segments>1280)errors.push('말뚝 분할 수는 8~1280의 정수입니다.');
  if(!['linear','hyperbolic'].includes(law)||!['linear','uniform'].includes(soilProfile))errors.push('지원하는 전달식·지반침하 형태를 선택하세요.');
  if(c.ultimate<=0)errors.push('주면 또는 선단 중 적어도 한 곳에 양의 저항이 필요합니다.');
  if(law==='hyperbolic'&&d.headLoad>=c.ultimate)errors.push(`쌍곡 전달식은 Q < Qs,u+Qb,u (${c.ultimate.toFixed(1)} kN)에서 유한한 침하 해를 갖습니다. Q를 낮추거나 저항 입력을 확인하세요.`);
  if(errors.length)return bad(errors);
  const z=Array.from({length:segments+1},(_,i)=>d.length*i/segments);for(const boundary of [d.layerDepth,d.settlementDepth])if(boundary>0&&boundary<d.length&&!z.some(v=>Math.abs(v-boundary)<1e-10*d.length))z.push(boundary);z.sort((a,b)=>a-b);
  const n=z.length,EA=d.modulus*1e6*c.area,shaftHalf=d.shaft50/1000,toeHalf=d.toe50/1000,soil=depth=>d.groundSettlement/1000*(soilProfile==='uniform'?1:Math.max(0,1-depth/d.settlementDepth));
  const spring=(relative,limit,half,toe=false)=>law==='linear'?{force:limit*relative/half,tangent:limit/half}:hyperbolic(relative,limit,half,toe);
  const gauss=[(1-1/Math.sqrt(3))/2,(1+1/Math.sqrt(3))/2];
  const elements=Array.from({length:n-1},(_,i)=>({i,z0:z[i],z1:z[i+1],h:z[i+1]-z[i],tau:(z[i]+z[i+1])/2<d.layerDepth?d.tau1:d.tau2}));
  function quadrature(e,u,fraction=1){const a=u[e.i]-soil(e.z0),b=u[e.i+1]-soil(e.z1),cuts=[0];if(a*b<0){const root=a/(a-b);if(root<fraction)cuts.push(root);}cuts.push(fraction);const out=[];for(let j=0;j<cuts.length-1;j++){const lo=cuts[j],span=cuts[j+1]-lo;for(const g of gauss)out.push({t:lo+span*g,weight:c.perimeter*e.h*span/2});}return out;}
  function evaluate(u,tangent=true){
   const residual=new Array(n).fill(0),diagonal=new Array(n).fill(0),off=new Array(n-1).fill(0),samples=[];let positive=0,negative=0;
   for(const e of elements){const i=e.i,k=EA/e.h,rod=k*(u[i]-u[i+1]);residual[i]+=rod;residual[i+1]-=rod;diagonal[i]+=k;diagonal[i+1]+=k;off[i]-=k;
    for(const {t,weight} of quadrature(e,u)){const a=1-t,b=t,depth=e.z0+t*e.h,pile=a*u[i]+b*u[i+1],ground=soil(depth),relative=pile-ground,lawValue=spring(relative,e.tau,shaftHalf),F=lawValue.force*weight;residual[i]+=a*F;residual[i+1]+=b*F;if(tangent){const K=lawValue.tangent*weight;diagonal[i]+=a*a*K;diagonal[i+1]+=b*b*K;off[i]+=a*b*K;}if(F>=0)positive+=F;else negative-=F;samples.push({z:depth,pile,soil:ground,relative,tau:lawValue.force,force:F});}
   }
   const toe=spring(u.at(-1)-soil(d.length),c.toeUltimate,toeHalf,true);residual[n-1]+=toe.force;diagonal[n-1]+=toe.tangent;residual[0]-=d.headLoad;
   return {residual,diagonal,off,samples,positive,negative,toeForce:toe.force,norm:Math.max(...residual.map(Math.abs))};
  }
  let u=new Array(n).fill(0),current=evaluate(u),iterations=0;const tolerance=1e-9*Math.max(1,d.headLoad,c.ultimate);
  while(current.norm>tolerance&&iterations<80){const step=tridiagonal(current.diagonal,current.off,current.residual.map(v=>-v));if(!step)return bad(['말뚝 접선행렬이 특이합니다. 저항과 강성 입력을 확인하세요.']);let scale=1,accepted=false;
   for(let backtrack=0;backtrack<24;backtrack++){const next=u.map((v,i)=>v+scale*step[i]),trial=evaluate(next);if(trial.norm<current.norm||trial.norm<=tolerance){u=next;current=trial;accepted=true;break;}scale/=2;}
   if(!accepted)return bad(['하중전달 반복이 수렴하지 않았습니다. Q를 낮추거나 동원변위·강성 입력을 확인하세요.']);iterations++;
  }
  if(current.norm>tolerance||!u.every(finite))return bad(['하중전달 평형 계산이 수렴하지 않았습니다.']);
  // Reconstruct axial force from cumulative signed shaft transfer, preserving head equilibrium.
  const profile=[{z:0,pile:u[0],soil:soil(0),relative:u[0]-soil(0),force:d.headLoad}],neutrals=[];let force=d.headLoad,maxForce=force,maxForceDepth=0;
  function partialTransfer(e,fraction){let result=0;for(const {t,weight} of quadrature(e,u,fraction)){const depth=e.z0+t*e.h,relative=(1-t)*u[e.i]+t*u[e.i+1]-soil(depth);result+=spring(relative,e.tau,shaftHalf).force*weight;}return result;}
  for(const e of elements){const a=u[e.i]-soil(e.z0),b=u[e.i+1]-soil(e.z1);if(a*b<0){const f=a/(a-b),depth=e.z0+f*e.h,localForce=force-partialTransfer(e,f);neutrals.push({z:depth,force:localForce});if(localForce>maxForce){maxForce=localForce;maxForceDepth=depth;}}
   if(Math.abs(a)<1e-12&&Math.abs(b)>1e-12&&!neutrals.some(v=>Math.abs(v.z-e.z0)<1e-9))neutrals.push({z:e.z0,force});
   force-=partialTransfer(e,1);profile.push({z:e.z1,pile:u[e.i+1],soil:soil(e.z1),relative:b,force});if(force>maxForce){maxForce=force;maxForceDepth=e.z1;}
  }
  const rodForces=elements.map(e=>({z:(e.z0+e.z1)/2,length:e.h,force:EA*(u[e.i]-u[e.i+1])/e.h})),balance=d.headLoad+current.negative-current.positive-current.toeForce,shortening=u[0]-u.at(-1),warnings=[];
  if(u[0]>.1*d.diameter)warnings.push('두부침하가 직경의 10%를 넘습니다. 이 예시 전달식의 큰 변위 결과를 현장 거동으로 외삽하지 마세요.');
  return {...c,valid:true,errors:[],warnings,EA,law,soilProfile,segments:n-1,iterations,residual:current.norm,tolerance,profile,samples:current.samples,rodForces,neutralPoints:neutrals,headSettlement:u[0],toeSettlement:u.at(-1),pileShortening:shortening,toeSoilSettlement:soil(d.length),toeForce:current.toeForce,shaftPositive:current.positive,dragLoad:current.negative,shaftNet:current.positive-current.negative,maxForce,maxForceDepth,balance,model:`elastic-rod-specified-${law}-transfer-v1`};
 }
 function experiment(input={},question='capacity'){
  if(!obj(input))return bad(['말뚝 입력값을 확인하세요.']);
  if(question==='capacity')return capacity(input);if(!['transfer','downdrag'].includes(question))return bad(['저항·하중전달·부주면마찰 질문을 선택하세요.']);
  const d={...defaults,...input,...(question==='transfer'?{groundSettlement:0,settlementDepth:defaults.settlementDepth}:{})},result=axial(d);if(!result.valid)return result;
  if(question==='transfer'){const curve=[],end=Math.min(.97*result.ultimate,Math.max(.75*result.ultimate,result.headLoad*1.08));for(let i=0;i<=12;i++){const r=axial({...d,headLoad:end*i/12},{segments:80});if(!r.valid)return bad(['Q–침하 곡선의 평형을 구하지 못했습니다.']);curve.push({load:r.headLoad,settlement:r.headSettlement});}return {...result,curve};}return result;
 }
 function group(input={}){
  if(!obj(input))return bad(['군말뚝 배열과 점토 강도를 입력하세요.']);const d={countSide:3,spacingRatio:3,length:20,diameter:.6,su:50,alpha:.7,...input},errors=[];
  for(const f of Object.keys(d))if(!finite(d[f]))errors.push(`${f}: 유한한 숫자를 입력하세요.`);
  if(errors.length)return bad(errors);
  if(!Number.isInteger(d.countSide)||d.countSide<2||d.countSide>8||d.spacingRatio<1.5||d.length<=0||d.diameter<=0||d.su<=0||d.alpha<0||d.alpha>1)errors.push('2~8열 정방형 배열, s/D≥1.5, L·D·su>0, 0≤α≤1 조건을 확인하세요.');
  if(d.length/d.diameter<5)errors.push('이 깊은기초 예제의 단일 말뚝 Nc=9 적용은 L/D≥5로 제한합니다.');if(errors.length)return bad(errors);
  const count=d.countSide**2,spacing=d.spacingRatio*d.diameter,width=(d.countSide-1)*spacing+d.diameter,area=Math.PI*d.diameter**2/4,singleShaft=Math.PI*d.diameter*d.length*d.alpha*d.su,singleToe=9*d.su*area,single=singleShaft+singleToe,sum=count*single,Nc=Math.min(9,5*(1+d.length/(5*width))*(1+1/5)),blockShaft=4*width*d.length*d.su,blockToe=width**2*Nc*d.su,block=blockShaft+blockToe,minimum=Math.min(sum,block);
  if(![sum,block,minimum].every(finite))return bad(['계산 가능한 크기를 벗어났습니다.']);
  return {valid:true,errors:[],warnings:[],...d,count,spacing,width,area,singleShaft,singleToe,single,sum,Nc,blockShaft,blockToe,block,minimum,mechanism:block<sum?'block':'sum',ratio:minimum/sum,model:'square-clay-group-mechanism-comparison-v1'};
 }
 return Object.freeze({defaults,capacity,hyperbolic,axial,experiment,group});
})();
