/** Boussinesq load increments and explicitly observed strength-test states.
 * Units: load kN, pressure/stress kPa, lengths m, angles degrees, axial strain percent.
 * No pore-pressure prediction and no constitutive stress-strain curve fitting.
 */
export const StrengthStress = (() => {
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const bad=errors=>({valid:false,errors,warnings:[]});
  const numeric=values=>Object.entries(values).filter(([,v])=>!finite(v)).map(([k])=>`${k}: 유한한 숫자를 입력하세요.`);
  const rad=a=>a*Math.PI/180;

  function pointStress(input={}) {
    if(!object(input))return bad(['하중·깊이·수평거리를 입력하세요.']);
    const {load=1000,z=3,r=0}=input,errors=numeric({load,z,r});
    if(errors.length)return bad(errors);
    if(load<0||z<0||r<0)return bad(['Q·깊이 z·수평거리 r은 0 이상이어야 합니다.']);
    if(load===0)return {valid:true,errors:[],warnings:[],load,z,r,stress:0,influence:null,surfaceLimit:z===0,model:'boussinesq-point-v1'};
    if(z===0&&r===0)return bad(['점하중 작용점(z=0, r=0)은 응력이 발산하는 특이점입니다. 깊이 또는 거리를 0보다 크게 하세요.']);
    const R=Math.hypot(r,z),stress=z===0?0:(3/(2*Math.PI))*load*(z/R)**3/(R*R);
    if(!finite(stress))return bad(['이 길이·하중 조합은 표현 가능한 계산 범위를 초과합니다.']);
    return {valid:true,errors:[],warnings:[],load,z,r,stress,influence:z>0?3/(2*Math.PI)*(z/R)**5:null,surfaceLimit:z===0,model:'boussinesq-point-v1'};
  }

  // Simpson integration returns an error estimate and does not silently accept a depth-limit failure.
  function integrate(fn,a,b,tol=1e-9,maxDepth=20) {
    let evaluations=0,converged=true,error=0;
    const f=x=>{evaluations++;return fn(x);};
    const fa=f(a),fb=f(b),m=(a+b)/2,fm=f(m),whole=(b-a)*(fa+4*fm+fb)/6;
    function rec(lo,hi,flo,fmid,fhi,prev,eps,remaining){
      const mid=(lo+hi)/2,leftMid=(lo+mid)/2,rightMid=(mid+hi)/2,fl=f(leftMid),fr=f(rightMid);
      const left=(mid-lo)*(flo+4*fl+fmid)/6,right=(hi-mid)*(fmid+4*fr+fhi)/6,difference=left+right-prev;
      if(Math.abs(difference)<=15*eps){error+=Math.abs(difference)/15;return left+right+difference/15;}
      if(remaining<=0){converged=false;error+=Math.abs(difference)/15;return left+right;}
      return rec(lo,mid,flo,fl,fmid,left,eps/2,remaining-1)+rec(mid,hi,fmid,fr,fhi,right,eps/2,remaining-1);
    }
    const value=rec(a,b,fa,fm,fb,whole,tol,maxDepth);
    return {value,error,evaluations,converged:converged&&finite(value)};
  }

  function circularStress(input={}) {
    if(!object(input))return bad(['원형 재하압·반지름·관찰점을 입력하세요.']);
    const {pressure=100,radius=2,z=3,r=0}=input,errors=numeric({pressure,radius,z,r});
    if(errors.length)return bad(errors);
    if(pressure<0||radius<=0||z<0||r<0)return bad(['q≥0, a>0, z≥0, r≥0 조건을 확인하세요.']);
    let influence,quadrature={error:0,evaluations:0,converged:true},surfaceLimit=z===0;
    if(z===0)influence=r<radius?1:r===radius?.5:0;
    else if(r===0)influence=-Math.expm1(-1.5*Math.log1p((radius/z)**2));
    else {
      const x=r/radius,y=z/radius;
      if(![x,y].every(finite))return bad(['반지름에 대한 관찰거리 비가 계산 범위를 초과합니다.']);
      if(x<1){
        // Polar coordinates about the observation projection; radial integration is exact.
        const fn=t=>{const ct=Math.cos(t),root=Math.sqrt(Math.max(0,1-x*x*Math.sin(t)**2));const high=ct<0?(1-x*x)/(root-x*ct):x*ct+root;return -Math.expm1(-1.5*Math.log1p((high/y)**2));};
        const a=integrate(fn,0,Math.PI,Math.PI*1e-9);quadrature=a;influence=a.value/Math.PI;
      }else{
        // psi=alpha*sin(t) regularizes the endpoint at the tangential ray.
        const alpha=Math.asin(1/x);
        const fn=t=>{const psi=alpha*Math.sin(t),ct=Math.cos(psi),root=Math.sqrt(Math.max(0,1-(x*Math.sin(psi))**2)),high=x*ct+root,low=x===1?0:(x*x-1)/high;const fLow=(y/Math.hypot(y,low))**3;const logRatio=Math.log1p((4*x*ct*root)/(y*y+low*low));return fLow*(-Math.expm1(-1.5*logRatio))*alpha*Math.cos(t);};
        const a=integrate(fn,0,Math.PI/2,Math.PI*1e-9);quadrature=a;influence=a.value/Math.PI;
      }
    }
    const stress=pressure*influence;
    if(!quadrature.converged||!finite(stress)||!finite(influence)||influence<0||influence>1+1e-8)return bad(['원형 재하의 적분이 수렴하지 않았습니다. 표면에 매우 가까운 경우 깊이를 늘리거나 z=0의 표면 극한을 사용하세요.']);
    return {valid:true,errors:[],warnings:[],pressure,radius,z,r,stress,influence,surfaceLimit,quadrature:{converged:true,errorBound:quadrature.error/Math.PI,evaluations:quadrature.evaluations},model:r===0?'boussinesq-circular-axis-closed-form-v1':'boussinesq-circular-area-integral-v1'};
  }

  function stressField(input={},kind='circular') {
    if(!object(input))return bad(['재하 조건을 입력하세요.']);
    const {load=1000,pressure=100,radius=2,depth=3,offset=0,loadMode='force'}=input;
    const errors=numeric({depth,offset});
    if(!['point','circular'].includes(kind))errors.push('점하중 또는 원형 재하를 선택하세요.');
    if(depth<0||depth>12||offset<0||offset>6)errors.push('이 단면의 관찰 범위는 깊이 0~12 m, 수평거리 0~6 m입니다.');
    if(kind==='point'){
      if(!finite(load)||load<0)errors.push('점하중 Q는 0 이상의 유한한 숫자여야 합니다.');
    }else{
      if(!finite(radius)||radius<.5||radius>3)errors.push('이 단면의 원형 반지름은 0.5~3 m입니다.');
      if(!['force','pressure'].includes(loadMode))errors.push('총하중 Q 고정 또는 재하압 q 고정을 선택하세요.');
      const selected=loadMode==='force'?load:pressure;if(!finite(selected)||selected<0)errors.push('선택한 하중은 0 이상의 유한한 숫자여야 합니다.');
    }
    if(errors.length)return bad(errors);
    const area=kind==='circular'?Math.PI*radius*radius:null;
    const actualLoad=kind==='point'?load:loadMode==='force'?load:pressure*area,actualPressure=kind==='point'?null:loadMode==='force'?load/area:pressure;
    const at=(r,z)=>kind==='point'?pointStress({load:actualLoad,r:Math.abs(r),z}):circularStress({pressure:actualPressure,radius,r:Math.abs(r),z});
    const current=at(offset,depth);if(!current.valid)return current;
    const cells=[],profile=[];let maxCell=0,maxIntegrationError=current.quadrature?.errorBound||0;
    for(let iz=0;iz<24;iz++)for(let ix=0;ix<24;ix++){
      const x=-6+(ix+.5)*.5,z=(iz+.5)*.5,value=at(x,z);
      if(!value.valid)return bad(['응력장 격자 계산이 수렴하지 않았습니다. 재하·관찰 조건을 확인하세요.']);
      cells.push({x,z,stress:value.stress});maxCell=Math.max(maxCell,value.stress);maxIntegrationError=Math.max(maxIntegrationError,value.quadrature?.errorBound||0);
    }
    for(let i=0;i<=80;i++){
      const z=12*i/80,v=at(offset,z);
      // The point-load origin is explicitly omitted, not replaced by a finite invented value.
      profile.push({z,stress:v.valid?v.stress:null,singular:!v.valid});
      if(v.valid)maxIntegrationError=Math.max(maxIntegrationError,v.quadrature?.errorBound||0);
    }
    return {valid:true,errors:[],warnings:[],kind,loadMode,load:actualLoad,pressure:actualPressure,area,radius:kind==='circular'?radius:null,depth,offset,stress:current.stress,influence:current.influence,surfaceLimit:current.surfaceLimit,cells,profile,maxCell,maxIntegrationError,plotExtent:{halfWidth:6,depth:12,cellSize:.5},model:current.model};
  }

  function mohrCoulomb(input={}) {
    if(!object(input))return bad(['유효응력과 강도정수를 입력하세요.']);
    const {cohesion=10,phi=30,sigma3=100,deviator=120,angle=60}=input,errors=numeric({cohesion,phi,sigma3,deviator,angle});
    if(errors.length)return bad(errors);
    if(cohesion<0||sigma3<0||deviator<0)errors.push('c′, σ3′, 삼축압축 편차응력은 0 이상이어야 합니다.');
    if(phi<0||phi>60)errors.push('이 모형은 0~60°의 유효마찰각을 지원합니다.');
    if(angle<0||angle>90)errors.push('관찰면 법선각 θ는 0~90°입니다.');
    if(errors.length)return bad(errors);
    const p=rad(phi),theta=rad(angle),sin=Math.sin(p),cos=Math.cos(p),tan=Math.tan(p);
    const sigma1=sigma3+deviator,center=(sigma1+sigma3)/2,radius=deviator/2;
    const distance=cohesion*cos+center*sin,normalMargin=distance-radius;
    const sigma1Failure=(sigma3*(1+sin)+2*cohesion*cos)/(1-sin),deviatorFailure=sigma1Failure-sigma3;
    const failureCenter=(sigma1Failure+sigma3)/2,failureRadius=deviatorFailure/2;
    const tangent={normal:failureCenter-failureRadius*sin,shear:failureRadius*cos};
    const normal=center+radius*Math.cos(2*theta),shear=radius*Math.sin(2*theta),strengthAtPlane=cohesion+normal*tan;
    const values={sigma1,center,radius,distance,normalMargin,sigma1Failure,deviatorFailure,failureCenter,failureRadius,normal,shear,strengthAtPlane};
    if(!Object.values(values).every(finite))return bad(['응력 크기가 계산 가능한 범위를 초과합니다.']);
    const tolerance=1e-9*Math.max(1,Math.abs(radius),Math.abs(distance));
    const state=normalMargin>tolerance?'inside':normalMargin < -tolerance?'outside':'tangent';
    return {valid:true,errors:[],warnings:state==='outside'?['입력 응력원이 지정 강도포락선을 넘습니다. 이 상태를 안정하게 유지하는 응력이나 파괴 후 거동으로 해석하지 않습니다.']:[],cohesion,phi,sigma3,deviator,angle,...values,tangent,failurePlaneAngle:45+phi/2,state,model:'effective-mohr-coulomb-state-v1'};
  }

  function secantPoint(input={}) {
    if(!object(input))return bad(['편차응력과 축변형률 관측값을 입력하세요.']);
    const {deviator=120,axialStrain=.5}=input,errors=numeric({deviator,axialStrain});
    if(errors.length)return bad(errors);
    if(deviator<0||axialStrain<=0)return bad(['편차응력은 0 이상, 축변형률은 0%보다 커야 할선계수를 계산할 수 있습니다.']);
    const strainFraction=axialStrain/100,secantModulus=deviator/strainFraction;
    if(!finite(secantModulus))return bad(['할선계수 계산 범위를 초과했습니다.']);
    return {valid:true,errors:[],warnings:[],deviator,axialStrain,strainFraction,secantModulus,model:'specified-triaxial-observation-secant-v1'};
  }

  function strengthLab(input={},question='mohr') {
    if(!object(input))return bad(['응력·강도정수·시험값을 입력하세요.']);
    if(!['mohr','stiffness'].includes(question))return bad(['응력원 또는 할선강성 질문을 선택하세요.']);
    const mohr=mohrCoulomb({...input,angle:question==='mohr'?(input.angle===undefined?60:input.angle):45});if(!mohr.valid)return mohr;
    const secant=question==='stiffness'?secantPoint(input):null;if(secant&&!secant.valid)return secant;
    return {...mohr,question,secant};
  }

  function triaxial(input={},test='CU') {
    if(!object(input))return bad(['같은 시험 시점의 측정값을 입력하세요.']);
    const {cell=200,deviator=180,pore=80,backPressure=50,atFailure=false}=input,errors=numeric({cell,deviator});
    if(!['UU','CU','CD'].includes(test))errors.push('UU, CU 또는 CD 시험을 선택하세요.');
    if(cell<0||deviator<0)errors.push('삼축압축의 구속압과 편차응력은 0 이상이어야 합니다.');
    if(typeof atFailure!=='boolean')errors.push('파괴 시점 여부를 선택하세요.');
    if(test==='CU'&&!finite(pore))errors.push('CU 해석에는 같은 시점에 측정한 간극수압 u가 필요합니다.');
    if(test==='CD'&&(!finite(backPressure)||backPressure<0))errors.push('CD 배수 경계의 역압은 0 이상의 숫자로 입력하세요.');
    if(errors.length)return bad(errors);
    const u=test==='UU'?null:test==='CU'?pore:backPressure;
    if(u!==null&&u>cell)return bad(['u가 구속압 σ3보다 커서 σ3′가 인장입니다. 현재 포화토 압축 해석 범위를 벗어납니다.']);
    const sigma3=cell,sigma1=cell+deviator,center=cell+deviator/2,radius=deviator/2,meanTotal=cell+deviator/3;
    const sigma3Effective=u===null?null:cell-u,sigma1Effective=u===null?null:sigma1-u,centerEffective=u===null?null:center-u,meanEffective=u===null?null:meanTotal-u;
    if(![sigma1,sigma3,center,radius,meanTotal,...(u===null?[]:[sigma3Effective,sigma1Effective,centerEffective,meanEffective])].every(finite))return bad(['응력 크기가 계산 가능한 범위를 초과합니다.']);
    const undrainedStrength=atFailure&&test!=='CD'?radius:null;
    return {valid:true,errors:[],warnings:[],test,cell,deviator,u,backPressure:test==='CD'?backPressure:null,atFailure,sigma1,sigma3,center,radius,meanTotal,sigma1Effective,sigma3Effective,centerEffective,meanEffective,undrainedStrength,excessPorePressure:test==='CD'?0:null,poreKnown:u!==null,model:'triaxial-observation-transform-v1'};
  }

  return Object.freeze({pointStress,circularStress,stressField,mohrCoulomb,secantPoint,strengthLab,triaxial});
})();
