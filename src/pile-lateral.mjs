/* Finite single pile: Euler–Bernoulli beam + continuous, linear Winkler support. */
export const PileLateral = (() => {
  const bad = message => ({ valid: false, errors: [message] });
  const matrix = n => Array.from({ length: n }, () => new Float64Array(n));
  // Symmetric diagonal scaling and bandwidth-3 Cholesky; Hermite assembly has this bandwidth.
  const linearSolve = (a, b) => {
    const n = b.length, d = Float64Array.from(a, (r, i) => Math.sqrt(r[i])), l = matrix(n);
    if ([...d].some(v => !Number.isFinite(v) || v <= 0)) return null;
    for (let i = 0; i < n; i++) for (let j = Math.max(0, i - 3); j <= i; j++) {
      let sum = a[i][j] / (d[i] * d[j]);
      for (let k = Math.max(0, i - 3); k < j; k++) sum -= l[i][k] * l[j][k];
      if (i === j) { if (sum <= 1e-15 || !Number.isFinite(sum)) return null; l[i][j] = Math.sqrt(sum); }
      else l[i][j] = sum / l[j][j];
    }
    const v = new Float64Array(n), x = new Float64Array(n);
    for (let i = 0; i < n; i++) { let sum = b[i] / d[i]; for (let j = Math.max(0, i - 3); j < i; j++) sum -= l[i][j] * v[j]; v[i] = sum / l[i][i]; }
    for (let i = n - 1; i >= 0; i--) { let sum = v[i]; for (let j = i + 1; j <= Math.min(n - 1, i + 3); j++) sum -= l[j][i] * x[j]; x[i] = sum / l[i][i]; }
    return Float64Array.from(x, (value, i) => value / d[i]);
  };
  const beam = (EI, h) => [[12, 6*h, -12, 6*h], [6*h, 4*h*h, -6*h, 2*h*h], [-12, -6*h, 12, -6*h], [6*h, 2*h*h, -6*h, 4*h*h]].map(row => row.map(v => v * EI / h**3));
  // Exact integral k ∫ NᵀN dz of cubic Hermite interpolation (consistent support).
  const foundation = (k, h) => [[156,22*h,54,-13*h],[22*h,4*h*h,13*h,-3*h*h],[54,13*h,156,-22*h],[-13*h,-3*h*h,-22*h,4*h*h]].map(row => row.map(v => v*k*h/420));
  const raw = p => {
    const h=p.length/p.elements,n=2*(p.elements+1),K=matrix(n),F=new Float64Array(n),kb=beam(p.EI,h),ks=foundation(p.soilModulus,h);
    const ke=kb.map((row,i)=>row.map((v,j)=>v+ks[i][j]));
    for(let e=0;e<p.elements;e++)for(let i=0;i<4;i++)for(let j=0;j<4;j++)K[2*e+i][2*e+j]+=ke[i][j];
    F[0]=p.load;
    const fixed=new Set([...(p.head==='fixed'?[1]:[]),...(p.tip==='fixed'?[n-2,n-1]:[])]);
    for(const i of fixed){for(let j=0;j<n;j++){K[i][j]=0;K[j][i]=0;}K[i][i]=1;F[i]=0;}
    const u=linearSolve(K,F);if(!u || [...u].some(v=>!Number.isFinite(v)))return null;
    const coefficients=ue=>[ue[0],h*ue[1],3*(ue[2]-ue[0])-h*(2*ue[1]+ue[3]),2*(ue[0]-ue[2])+h*(ue[1]+ue[3])];
    const endActions=ue=>{
      const a=coefficients(ue),v=6*p.EI*a[3]/h**3,m0=2*p.EI*a[2]/h**2,m1=p.EI*(2*a[2]+6*a[3])/h**2;
      return [v,-m0,-v,m1].map((force,i)=>force+ks[i].reduce((s,value,j)=>s+value*ue[j],0));
    };
    // Difference-based curvature avoids cancellation of almost rigid motion in stiff, short piles.
    const assembledResidual=()=>{
      const r=new Float64Array(n);r[0]=-p.load;
      for(let e=0;e<p.elements;e++){const f=endActions(Array.from(u.slice(2*e,2*e+4)));for(let i=0;i<4;i++)r[2*e+i]+=f[i];}
      return r;
    };
    for(let pass=0;pass<3;pass++){
      const rhs=Float64Array.from(assembledResidual(),(v,i)=>fixed.has(i)?0:-v),du=linearSolve(K,rhs);
      if(!du)return null;for(let i=0;i<n;i++)u[i]+=du[i];
    }
    const residual=assembledResidual();
    const nodes=Array.from({length:p.elements+1},(_,i)=>({z:i*h,displacement:u[2*i],rotation:u[2*i+1],soilForcePerLength:-p.soilModulus*u[2*i]}));
    const profile=[],elements=[];let soilForce=0,soilMoment=0,maxMoment=0,maxMomentDepth=0;
    for(let e=0;e<p.elements;e++){
      const z=e*h,ue=Array.from(u.slice(2*e,2*e+4)),end=endActions(ue),a=coefficients(ue);
      const at=t=>{
        const displacement=a.reduce((s,v,i)=>s+v*t**i,0),rotation=a.reduce((s,v,i)=>s+(i?v*i*t**(i-1)/h:0),0);
        const shear=end[0]-p.soilModulus*h*a.reduce((s,v,i)=>s+v*t**(i+1)/(i+1),0);
        const moment=-end[1]+end[0]*h*t-p.soilModulus*h*h*a.reduce((s,v,i)=>s+v*t**(i+2)/((i+1)*(i+2)),0);
        return {z:z+h*t,displacement,rotation,shear,moment,soilForcePerLength:-p.soilModulus*displacement};
      };
      // Equilibrium recovery integrates the actual cubic support load, including endpoint actions.
      const samples=Array.from({length:9},(_,i)=>at(i/8));
      const extrema=[...samples];
      for(let i=0;i<8;i++)if(samples[i].shear*samples[i+1].shear<0){
        let lo=i/8,hi=(i+1)/8,sign=at(lo).shear;
        for(let j=0;j<40;j++){const mid=(lo+hi)/2;if(at(mid).shear*sign>0)lo=mid;else hi=mid;}
        extrema.push(at((lo+hi)/2));
      }
      for(const v of extrema)if(Math.abs(v.moment)>maxMoment){maxMoment=Math.abs(v.moment);maxMomentDepth=v.z;}
      profile.push(...samples);
      const force=-p.soilModulus*h*a.reduce((s,v,i)=>s+v/(i+1),0);
      const moment=-p.soilModulus*h*a.reduce((s,v,i)=>s+v*(z/(i+1)+h/(i+2)),0);
      soilForce+=force;soilMoment+=moment;
      elements.push({z,length:h,coefficients:a,endActions:end,soilForce:force,soilMoment:moment});
    }
    const headReactionMoment=p.head==='fixed'?residual[1]:0,tipForce=p.tip==='fixed'?residual[n-2]:0,tipMoment=p.tip==='fixed'?residual[n-1]:0;
    const forceResidual=p.load+soilForce+tipForce,momentResidual=headReactionMoment+soilMoment+tipForce*p.length+tipMoment;
    let relativeResidual=0;
    for(let i=0;i<n;i++)if(!fixed.has(i))relativeResidual=Math.max(relativeResidual,Math.abs(residual[i])/Math.max(1,Math.abs(p.load)*(i%2?p.length:1)));
    const headDisplacement=nodes[0].displacement,headRotation=nodes[0].rotation;
    return {nodes,profile,elementResults:elements,headDisplacement,headDisplacementMm:headDisplacement*1000,headRotation,headReactionMoment,headInternalMoment:profile[0].moment,tipForce,tipMoment,soilForce,soilMoment,forceResidual,momentResidual,relativeResidual,maxMoment,maxMomentDepth,maxDisplacement:Math.max(...profile.map(v=>Math.abs(v.displacement))),maxRotation:Math.max(...profile.map(v=>Math.abs(v.rotation))),strainEnergy:.5*p.load*headDisplacement};
  };
  const solve = (data={}) => {
    if(data===null||typeof data!=='object'||Array.isArray(data))return bad('횡말뚝 입력 객체가 필요합니다.');
    const p={length:12,EI:200000,soilModulus:5000,load:100,head:'free',tip:'free',elements:64,...data};
    if(![p.length,p.EI,p.soilModulus,p.load].every(Number.isFinite)||p.length<=0||p.EI<=0||p.soilModulus<0||p.load<0)return bad('길이·EI는 양수, 지반 반력계수와 수평력은 0 이상의 유한한 값이어야 합니다.');
    if(!['free','fixed'].includes(p.head)||!['free','fixed'].includes(p.tip))return bad('두부와 선단 조건은 free 또는 fixed이어야 합니다.');
    if(!Number.isInteger(p.elements)||p.elements<4||p.elements>160)return bad('요소 수는 4~160의 정수여야 합니다.');
    if(p.soilModulus===0&&p.tip==='free')return bad('지반 지지 없이 자유 선단이면 수평 평형을 유지할 수 없습니다. 선단 고정이 필요합니다.');
    const fine=raw(p),coarse=raw({...p,elements:Math.floor(p.elements/2)});
    if(!fine||!coarse)return bad('강성행렬이 특이하거나 수치적으로 불안정합니다. 입력 강성과 경계를 확인하세요.');
    const meshHeadRelative=p.load===0?0:Math.abs(fine.headDisplacement-coarse.headDisplacement)/Math.max(1e-12,Math.abs(fine.headDisplacement));
    const meshMomentRelative=p.load===0?0:Math.abs(fine.maxMoment-coarse.maxMoment)/Math.max(1e-10,fine.maxMoment);
    const converged=meshHeadRelative<.005&&meshMomentRelative<.01&&fine.relativeResidual<1e-6&&Math.abs(fine.forceResidual)<1e-6*Math.max(1,p.load)&&Math.abs(fine.momentResidual)<1e-6*Math.max(1,p.load*p.length);
    if(!converged)return {valid:false,errors:['현재 요소 수의 수렴·평형 검사가 충족되지 않았습니다. 입력 강성비와 요소 수를 확인해야 합니다.'],meshHeadRelative,meshMomentRelative,relativeResidual:fine.relativeResidual,forceResidual:fine.forceResidual,momentResidual:fine.momentResidual};
    const characteristicLength=p.soilModulus>0?(4*p.EI/p.soilModulus)**.25:null;
    return {...p,...fine,valid:true,errors:[],converged,meshHeadRelative,meshMomentRelative,coarseElements:Math.floor(p.elements/2),characteristicLength,beta:characteristicLength===null?0:1/characteristicLength,lengthRatio:characteristicLength===null?null:p.length/characteristicLength};
  };
  return {solve};
})();
