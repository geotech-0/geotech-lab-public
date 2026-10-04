/** Unit-width retaining structure models; kN, m, kPa. */
export const Retaining = (() => {
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const bad=message=>({valid:false,errors:[message]});
  const rad=v=>v*Math.PI/180;
  // Exact area and first moment (about the wall base) of a linear pressure segment.
  function integrate(a,b,pa,pb,H){const L=b-a,F=L*(pa+pb)/2,depthMoment=a*F+L*L*(pa+2*pb)/6;return {force:F,moment:H*F-depthMoment};}
  function earthPressure(input={}){
    if(!object(input))return bad('토압 입력 객체가 필요합니다.');
    const {height=6,phi=30,gamma=18,gammaSat=20,waterDepth=6,surcharge=10,state='active',ocr=1,gammaW=9.81}=input;
    if(![height,phi,gamma,gammaSat,waterDepth,surcharge,ocr,gammaW].every(finite)||height<=0||height>30||phi<0||phi>=50||gamma<=0||gammaW<=0||gammaSat<=gammaW||gammaSat<gamma||waterDepth<0||surcharge<0||ocr<1||ocr>10||!['active','rest','passive'].includes(state))return bad('H>0, 0≤φ<50°, 양의 단위중량, γsat≥γ 및 γsat>γw, 수위 깊이·상재≥0, 1≤OCR≤10을 확인하세요.');
    const s=Math.sin(rad(phi)),ka=(1-s)/(1+s),kp=1/ka,k0=(1-s)*ocr**s,k=state==='active'?ka:state==='passive'?kp:k0;
    const at=z=>{const verticalEffective=gamma*Math.min(z,waterDepth)+(gammaSat-gammaW)*Math.max(0,z-waterDepth),soil=k*verticalEffective,extra=k*surcharge,water=gammaW*Math.max(0,z-waterDepth);return {z,verticalEffective,soil,surcharge:extra,water,total:soil+extra+water};};
    const breaks=[0,...(waterDepth>0&&waterDepth<height?[waterDepth]:[]),height],components={soil:{force:0,moment:0},surcharge:{force:0,moment:0},water:{force:0,moment:0}};
    for(let i=1;i<breaks.length;i++){const a=at(breaks[i-1]),b=at(breaks[i]);for(const key of Object.keys(components)){const v=integrate(a.z,b.z,a[key],b[key],height);components[key].force+=v.force;components[key].moment+=v.moment;}}
    for(const c of Object.values(components))c.height=c.force?c.moment/c.force:null;
    const force=Object.values(components).reduce((a,c)=>a+c.force,0),moment=Object.values(components).reduce((a,c)=>a+c.moment,0),profile=[...new Set([...breaks,...Array.from({length:61},(_,i)=>height*i/60)])].sort((a,b)=>a-b).map(at);
    return {valid:true,errors:[],height,phi,gamma,gammaSat,gammaW,waterDepth,surcharge,state,ocr,ka,kp,k0,k,force,moment,resultantHeight:force?moment/force:null,components,profile,base:at(height),failureAngle:state==='active'?45+phi/2:state==='passive'?45-phi/2:null};
  }
  function coulomb(input={}){
    if(!object(input))return bad('Coulomb 입력 객체가 필요합니다.');
    const {height=6,phi=30,delta=15,beta=10,gamma=18}=input;
    if(![height,phi,delta,beta,gamma].every(finite)||height<=0||phi<=0||phi>=50||delta<0||delta>phi||beta<0||beta>=phi||gamma<=0)return bad('수직벽·건조 배면: H,γ>0, 0<φ<50°, 0≤δ≤φ, 0≤β<φ를 확인하세요.');
    const f=rad(phi),d=rad(delta),b=rad(beta),k=Math.cos(f)**2/(Math.cos(d)*(1+Math.sqrt(Math.sin(f+d)*Math.sin(f-b)/(Math.cos(d)*Math.cos(b))))**2),force=.5*gamma*height*height*k;
    const trial=theta=>{const run=height/(Math.tan(theta)-Math.tan(b)),weight=.5*gamma*height*run,force=weight*Math.sin(theta-f)/Math.cos(theta-f-d);return {theta,run,weight,force};};
    let lo=Math.max(f,b)+1e-8,hi=Math.PI/2-1e-8;const g=(Math.sqrt(5)-1)/2;
    for(let i=0;i<90;i++){const c=hi-g*(hi-lo),e=lo+g*(hi-lo);if(trial(c).force>trial(e).force)hi=e;else lo=c;}
    const wedge=trial((lo+hi)/2),theta=wedge.theta;
    const horizontal=force*Math.cos(d),vertical=force*Math.sin(d),planeReaction=horizontal/Math.sin(theta-f);
    return {valid:true,errors:[],height,phi,delta,beta,gamma,k,force,horizontal,vertical,resultantHeight:height/3,wedge:{...wedge,theta:theta*180/Math.PI,topY:height+wedge.run*Math.tan(b),planeReaction,points:[{x:0,y:0},{x:0,y:height},{x:wedge.run,y:height+wedge.run*Math.tan(b)}]},forceResidual:Math.hypot(horizontal-planeReaction*Math.sin(theta-f),vertical+planeReaction*Math.cos(theta-f)-wedge.weight),rankineK:(1-Math.sin(f))/(1+Math.sin(f))};
  }
  function gravityWall(input={}){
    if(!object(input))return bad('중력벽 입력 객체가 필요합니다.');
    const {height=5,baseWidth=3,topWidth=.7,gammaConcrete=24,friction=.55,phi=30,gamma=18,gammaSat=20,waterDepth=5,surcharge=10,uplift=true}=input;
    if(![height,baseWidth,topWidth,gammaConcrete,friction].every(finite)||baseWidth<=0||topWidth<=0||topWidth>baseWidth||gammaConcrete<=0||friction<0||friction>1||typeof uplift!=='boolean')return bad('벽체의 B≥t>0, 양의 높이·단위중량, 0≤마찰계수≤1을 확인하세요.');
    const earth=earthPressure({height,phi,gamma,gammaSat,waterDepth,surcharge,state:'active'});if(!earth.valid)return earth;
    const rectangle=topWidth*height,triangle=(baseWidth-topWidth)*height/2,area=rectangle+triangle,centroidX=(rectangle*(baseWidth-topWidth/2)+triangle*2*(baseWidth-topWidth)/3)/area,weight=gammaConcrete*area,heelWaterPressure=9.81*Math.max(0,height-waterDepth),upliftForce=uplift?.5*heelWaterPressure*baseWidth:0,upliftX=2*baseWidth/3,normal=weight-upliftForce,resistingMoment=weight*centroidX,drivingMoment=earth.moment+upliftForce*upliftX,netMoment=resistingMoment-drivingMoment,resultantX=normal>0?netMoment/normal:null,eccentricity=resultantX===null?null:baseWidth/2-resultantX;
    let contact='lost',contactLength=0,pressureToe=null,pressureHeel=null,pressure=[];
    if(normal>0&&resultantX>0&&resultantX<baseWidth){
      if(Math.abs(eccentricity)<=baseWidth/6+1e-12){contact='full';contactLength=baseWidth;pressureToe=normal/baseWidth*(1+6*eccentricity/baseWidth);pressureHeel=normal/baseWidth*(1-6*eccentricity/baseWidth);pressure=[{x:0,p:Math.max(0,pressureToe)},{x:baseWidth,p:Math.max(0,pressureHeel)}];}
      else if(resultantX<baseWidth/2){contact='toe';contactLength=3*resultantX;pressureToe=2*normal/contactLength;pressureHeel=0;pressure=[{x:0,p:pressureToe},{x:contactLength,p:0},{x:baseWidth,p:0}];}
      else{contact='heel';contactLength=3*(baseWidth-resultantX);pressureToe=0;pressureHeel=2*normal/contactLength;pressure=[{x:0,p:0},{x:baseWidth-contactLength,p:0},{x:baseWidth,p:pressureHeel}];}
    }
    return {valid:true,errors:[],height,baseWidth,topWidth,gammaConcrete,friction,earth,area,centroidX,weight,heelWaterPressure,uplift,upliftForce,upliftX,normal,resistingMoment,drivingMoment,netMoment,resultantX,eccentricity,equilibriumExists:contact!=='lost',contact,contactLength,pressureToe,pressureHeel,pressure,slidingResistance:friction*Math.max(0,normal),slidingRatio:earth.force?friction*Math.max(0,normal)/earth.force:null,momentRatio:drivingMoment?resistingMoment/drivingMoment:null,vertices:[{x:0,y:0},{x:baseWidth,y:0},{x:baseWidth,y:height},{x:baseWidth-topWidth,y:height}]};
  }

  const matrix=n=>Array.from({length:n},()=>new Float64Array(n));
  function solve(A,b){
    const n=b.length,a=A.map((r,i)=>Float64Array.from([...r,b[i]]));
    for(let k=0;k<n;k++){
      let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
      if(Math.abs(a[pivot][k])<1e-12)return null;
      [a[k],a[pivot]]=[a[pivot],a[k]];
      for(let i=k+1;i<n;i++){const f=a[i][k]/a[k][k];a[i][k]=0;for(let j=k+1;j<=n;j++)a[i][j]-=f*a[k][j];}
    }
    const u=new Float64Array(n);for(let i=n-1;i>=0;i--){let v=a[i][n];for(let j=i+1;j<n;j++)v-=a[i][j]*u[j];u[i]=v/a[i][i];}return u;
  }
  const shape=(t,L)=>[1-3*t*t+2*t**3,L*(t-2*t*t+t**3),3*t*t-2*t**3,L*(-t*t+t**3)];
  const stiffness=(EI,L)=>[[12,6*L,-12,6*L],[6*L,4*L*L,-6*L,2*L*L],[-12,-6*L,12,-6*L],[6*L,2*L*L,-6*L,4*L*L]].map(row=>row.map(v=>EI*v/L**3));
  function beamRaw({length,EI,elements,qAt,soilFrom=length,groundK=0,anchor=null,pointLoads=[],fixedBase=false}){
    const L=length/elements,n=2*(elements+1),K=matrix(n),F=new Float64Array(n),elementData=[],soilK=new Float64Array(elements+1);
    // Three-point Gauss exactly integrates cubic shape × linear distributed load.
    const quadrature=[[-Math.sqrt(3/5),5/9],[0,8/9],[Math.sqrt(3/5),5/9]];
    for(let e=0;e<elements;e++){
      const ke=stiffness(EI,L),fe=new Float64Array(4),z=e*L;
      for(const [xi,w]of quadrature){const t=(xi+1)/2,N=shape(t,L),q=qAt(z+L*t);for(let a=0;a<4;a++)fe[a]+=N[a]*q*w*L/2;}
      for(let a=0;a<4;a++){F[2*e+a]+=fe[a];for(let b=0;b<4;b++)K[2*e+a][2*e+b]+=ke[a][b];}
      // Lump the distributed foundation only over the part below excavation.
      const activeLength=Math.max(0,z+L-Math.max(z,soilFrom));
      soilK[e]+=groundK*activeLength/2;soilK[e+1]+=groundK*activeLength/2;
      elementData.push({z,ke,fe,q0:qAt(z),q1:qAt(z+L)});
    }
    soilK.forEach((v,i)=>K[2*i][2*i]+=v);
    for(const {z,force}of pointLoads){const i=Math.round(z/L);if(Math.abs(z/L-i)>1e-8)return null;F[2*i]+=force;}
    if(anchor){const i=Math.round(anchor.z/L);K[2*i][2*i]+=anchor.stiffness;F[2*i]+=anchor.stiffness*anchor.reference-anchor.preload;}
    const originalK=K.map(r=>Float64Array.from(r)),originalF=Float64Array.from(F);
    if(fixedBase)for(const i of [n-2,n-1]){for(let j=0;j<n;j++){K[i][j]=0;K[j][i]=0;}K[i][i]=1;F[i]=0;}
    const u=solve(K,F);if(!u)return null;
    const nodes=Array.from({length:elements+1},(_,i)=>({z:i*L,displacement:u[2*i],rotation:u[2*i+1],soilReaction:soilK[i]*u[2*i]})),profile=[];
    for(let e=0;e<elements;e++){
      const {z,ke,fe,q0,q1}=elementData[e],ue=Array.from(u.slice(2*e,2*e+4)),endForce=ke.map((row,i)=>row.reduce((s,v,j)=>s+v*ue[j],0)-fe[i]);
      for(let j=0;j<=4;j++){const t=j/4,s=L*t,displacement=shape(t,L).reduce((sum,v,i)=>sum+v*ue[i],0),moment=-endForce[1]+endForce[0]*s+q0*s*s/2+(q1-q0)*s**3/(6*L),shear=endForce[0]+q0*s+(q1-q0)*s*s/(2*L);profile.push({z:z+s,displacement,moment,shear});}
    }
    const anchorDisplacement=anchor?nodes[Math.round(anchor.z/L)].displacement:null,anchorForce=anchor?anchor.preload+anchor.stiffness*(anchorDisplacement-anchor.reference):0;
    const appliedForce=originalF.reduce((s,f,i)=>s+(i%2===0?f:0),0),soilForce=nodes.reduce((s,p)=>s+p.soilReaction,0);
    let algebraicResidual=0;for(let i=0;i<n;i++)if(!fixedBase||i<n-2){let sum=0;for(let j=0;j<n;j++)sum+=originalK[i][j]*u[j];algebraicResidual=Math.max(algebraicResidual,Math.abs(sum-originalF[i]));}
    return {nodes,profile,anchorForce,anchorDisplacement,soilForce,appliedForce,algebraicResidual,maxDisplacement:Math.max(...profile.map(p=>Math.abs(p.displacement))),maxMoment:Math.max(...profile.map(p=>Math.abs(p.moment))),maxShear:Math.max(...profile.map(p=>Math.abs(p.shear))),baseReaction:fixedBase?originalK[n-2].reduce((s,v,j)=>s+v*u[j],0)-originalF[n-2]:0,baseMoment:fixedBase?originalK[n-1].reduce((s,v,j)=>s+v*u[j],0)-originalF[n-1]:0};
  }
  // Independent structural benchmark API, also used to test element formulation.
  function beamBenchmark(input={}){
    if(!object(input))return bad('보 검증 입력 객체가 필요합니다.');
    const {length=6,EI=500000,uniformLoad=10,tipLoad=0,elements=12}=input;
    if(![length,EI,uniformLoad,tipLoad].every(finite)||length<=0||EI<=0||!Number.isInteger(elements)||elements<2||elements>100)return bad('검증 보의 길이·EI와 요소 수를 확인하세요.');
    const r=beamRaw({length,EI,elements,qAt:()=>uniformLoad,pointLoads:[{z:0,force:tipLoad}],fixedBase:true});return r?{valid:true,errors:[],...r}:bad('보 평형을 풀 수 없습니다.');
  }
  function excavation(input={}){
    if(!object(input))return bad('굴착 입력 객체가 필요합니다.');
    const {height=6,embedment=3,EI=500000,groundK=20000,anchorK=50000,preload=100,installDepth=3,anchorDepth=2,phi=30,gamma=18,mesh=.5}=input;
    if(![height,embedment,EI,groundK,anchorK,preload,installDepth,anchorDepth,phi,gamma,mesh].every(finite)||height<4||height>12||embedment<1||embedment>8||EI<10000||groundK<=0||anchorK<=0||preload<0||installDepth<=anchorDepth||installDepth>=height||anchorDepth<=0||phi<0||phi>=50||gamma<=0||![.25,.5,1].includes(mesh))return bad('굴착 깊이·근입·양의 강성, 0<앵커 깊이<설치 굴착깊이<최종깊이, 잠금력≥0을 확인하세요.');
    const length=height+embedment,values=[length,height,installDepth,anchorDepth];if(values.some(v=>Math.abs(v/mesh-Math.round(v/mesh))>1e-8))return bad(`깊이들은 ${mesh} m 요소 경계와 일치해야 합니다.`);
    const elements=Math.round(length/mesh),k0=1-Math.sin(rad(phi)),stages=[];
    const run=(H,anchor,pointLoads=[])=>beamRaw({length,EI,elements,qAt:z=>k0*gamma*Math.min(z,H),soilFrom:H,groundK,anchor,pointLoads});
    const before=run(installDepth,null);if(!before)return bad('설치 전 보 해석을 풀 수 없습니다.');
    const locked=run(installDepth,null,[{z:anchorDepth,force:-preload}]);if(!locked)return bad('잠금 단계 보 해석을 풀 수 없습니다.');
    const reference=locked.nodes[Math.round(anchorDepth/mesh)].displacement,anchor={z:anchorDepth,stiffness:anchorK,reference,preload};
    let final=run(height,anchor);if(!final)return bad('최종 보 해석을 풀 수 없습니다.');
    const slack=final.anchorForce<0;if(slack){final=run(height,null);if(!final)return bad('인장재 이완 상태를 풀 수 없습니다.');}
    const finish=(r,H,T,key,label)=>{
      const lateralForce=k0*gamma*(H*H/2+H*(length-H)),lateralMoment=k0*gamma*(H**3/3+H*(length*length-H*H)/2),soilMoment=r.nodes.reduce((s,p)=>s+p.soilReaction*p.z,0);
      return {...r,key,label,excavationDepth:H,anchorForce:T,forceBalance:lateralForce-r.soilForce-T,momentBalance:lateralMoment-soilMoment-T*anchorDepth,lateralForce,lateralMoment,anchorAt:r.nodes[Math.round(anchorDepth/mesh)].displacement};
    };
    stages.push(finish(before,installDepth,0,'before','1 · 설치 전 굴착'),finish(locked,installDepth,preload,'locked','2 · 앵커 긴장·잠금'),finish(final,height,slack?0:final.anchorForce,'final','3 · 추가 굴착'));
    const valid=stages.every(s=>s.algebraicResidual<1e-4&&finite(s.maxDisplacement));
    return {valid,errors:valid?[]:['보 해석의 평형 잔차가 허용 범위를 넘었습니다.'],height,embedment,length,EI,groundK,anchorK,preload,installDepth,anchorDepth,phi,gamma,k0,mesh,stages,slack,reference,restDisplacement:reference-preload/anchorK};
  }
  function bottomModes(input={}){
    if(!object(input))return bad('굴착저면 입력 객체가 필요합니다.');
    const {height=6,gamma=18,surcharge=10,su=30,headDifference=3,flowLength=4,gammaSat=20,slabThickness=.8,gammaConcrete=24,slabHead=3}=input;
    if(![height,gamma,surcharge,su,headDifference,flowLength,gammaSat,slabThickness,gammaConcrete,slabHead].every(finite)||height<=0||gamma<=0||surcharge<0||su<=0||headDifference<0||flowLength<=0||gammaSat<=9.81||slabThickness<=0||gammaConcrete<=0||slabHead<0)return bad('양의 치수·강도·단위중량과 0 이상의 수두·상재를 확인하세요.');
    const heaveDemand=gamma*height+surcharge,Nc=2+Math.PI,heaveResistance=Nc*su,gradient=headDifference/flowLength,criticalGradient=(gammaSat-9.81)/9.81,slabWeight=gammaConcrete*slabThickness,upliftPressure=9.81*slabHead;
    return {valid:true,errors:[],height,gamma,surcharge,su,headDifference,flowLength,gammaSat,slabThickness,gammaConcrete,slabHead,Nc,heaveDemand,heaveResistance,heaveRatio:heaveResistance/heaveDemand,gradient,criticalGradient,boilingDemandRatio:gradient/criticalGradient,effectiveBase:(gammaSat-9.81)*flowLength-9.81*headDifference,slabWeight,upliftPressure,upliftNet:upliftPressure-slabWeight,slabRatio:upliftPressure?slabWeight/upliftPressure:null};
  }
  return {earthPressure,coulomb,gravityWall,beamBenchmark,excavation,bottomModes};
})();
