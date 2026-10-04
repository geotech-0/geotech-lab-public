/** Saturated Darcy flow models. SI units, coordinates x right / z depth down. */
export const Seepage = (() => {
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const bad = errors => ({valid:false,errors});
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const cache = new Map();
  function darcy(input={}) {
    if(!object(input))return bad(['숫자 입력 객체가 필요합니다.']);
    const {headDifference=2,length=4,area=.2,logK=-4,porosity=.35,gammaSat=20,gammaW=9.81}=input;
    if(![headDifference,length,area,logK,porosity,gammaSat,gammaW].every(finite))return bad(['모든 입력은 유한한 숫자여야 합니다.']);
    if(headDifference<0||length<=0||area<=0||porosity<=0||porosity>=1||gammaW<=0||gammaSat<=gammaW||logK< -12||logK>0)return bad(['수두차≥0, 길이·면적>0, 0<n<1, γsat>γw>0, −12≤log₁₀k≤0 범위를 확인하세요.']);
    const k=10**logK,gradient=headDifference/length,velocity=k*gradient,flow=velocity*area,criticalGradient=(gammaSat-gammaW)/gammaW;
    const profile=Array.from({length:41},(_,i)=>{const z=length*i/40,total=gammaSat*z,pore=gammaW*(1+gradient)*z;return {z,head:gradient*z,total,pore,effective:total-pore};});
    const base=profile.at(-1);
    if(![flow,velocity,base.total,base.pore,base.effective].every(finite))return bad(['입력이 계산 가능한 숫자 범위를 초과했습니다.']);
    return {valid:true,errors:[],headDifference,length,area,logK,k,porosity,gammaSat,gammaW,gradient,velocity,poreVelocity:velocity/porosity,flow,flowLitresMinute:flow*60000,criticalGradient,upwardBase:base,stableSkeleton:gradient<criticalGradient,profile};
  }
  function fallingHead(input={}) {
    if(!object(input))return bad(['시험 입력 객체가 필요합니다.']);
    const {initialHead=1,finalHead=.5,time=600,length=.2,area=.01,tubeArea=.0001}=input;
    if(![initialHead,finalHead,time,length,area,tubeArea].every(finite)||finalHead<=0||initialHead<=finalHead||time<=0||length<=0||area<=0||tubeArea<=0)return bad(['h₁>h₂>0이며 시간·시료 길이·시료/관 면적은 양수여야 합니다.']);
    const k=tubeArea*length/(area*time)*Math.log(initialHead/finalHead);
    const curve=Array.from({length:41},(_,i)=>{const t=time*i/40;return {time:t,head:initialHead*Math.exp(-k*area*t/(tubeArea*length))};});
    if(!finite(k)||!finite(tubeArea*(initialHead-finalHead)))return bad(['시험 입력이 계산 가능한 숫자 범위를 초과했습니다.']);
    return {valid:true,errors:[],initialHead,finalHead,time,length,area,tubeArea,k,curve,dischargedVolume:tubeArea*(initialHead-finalHead)};
  }
  function constantHead(input={}) {
    if(!object(input))return bad(['시험 입력 객체가 필요합니다.']);
    const {headDifference=1,time=600,length=.2,area=.01,volume=.0005}=input;
    if(![headDifference,time,length,area,volume].every(finite)||headDifference<=0||time<=0||length<=0||area<=0||volume<0)return bad(['정수위 시험의 수두차·시간·시료 치수는 양수, 채수량은 0 이상이어야 합니다.']);
    const flow=volume/time,k=flow*length/(area*headDifference);
    if(!finite(k)||!finite(flow))return bad(['시험 입력이 계산 가능한 숫자 범위를 초과했습니다.']);
    return {valid:true,errors:[],headDifference,time,length,area,volume,k,flow,curve:Array.from({length:41},(_,i)=>({time:time*i/40,volume:volume*i/40}))};
  }
  function layered(input={}) {
    if(!object(input))return bad(['두 층의 입력 객체가 필요합니다.']);
    const {thicknessA=2,thicknessB=2,logKA=-4,logKB=-6,headDifference=2,area=1,order='AB',gammaW=9.81}=input;
    if(![thicknessA,thicknessB,logKA,logKB,headDifference,area,gammaW].every(finite)||thicknessA<=0||thicknessB<=0||headDifference<0||area<=0||gammaW<=0||logKA< -12||logKA>0||logKB< -12||logKB>0||!['AB','BA'].includes(order))return bad(['양의 층 두께·면적, 수두차≥0, −12≤log₁₀k≤0, AB 또는 BA 순서를 확인하세요.']);
    const a={name:'A',thickness:thicknessA,k:10**logKA},b={name:'B',thickness:thicknessB,k:10**logKB},length=thicknessA+thicknessB,resistance=thicknessA/a.k+thicknessB/b.k,velocity=headDifference/resistance,flow=area*velocity,equivalentK=length/resistance,parallelK=(thicknessA*a.k+thicknessB*b.k)/length;
    const make=names=>{let z=0,h=0;return names.map(layer=>{const startZ=z,startHead=h,gradient=velocity/layer.k;z+=layer.thickness;h+=gradient*layer.thickness;return {...layer,startZ,endZ:z,startHead,endHead:h,gradient,startPressure:gammaW*(startHead+startZ),endPressure:gammaW*(h+z)};});};
    const layers=make(order==='AB'?[a,b]:[b,a]),reversedLayers=make(order==='AB'?[b,a]:[a,b]);
    const at=(z,ls=layers)=>{const l=ls.find(l=>z<=l.endZ)||ls.at(-1),head=l.startHead+l.gradient*(z-l.startZ);return {z,head,pressure:gammaW*(head+z)};};
    if(![flow,equivalentK,parallelK,...layers.flatMap(l=>[l.endHead,l.endPressure])].every(finite))return bad(['층상 입력이 계산 가능한 숫자 범위를 초과했습니다.']);
    return {valid:true,errors:[],length,headDifference,area,order,gammaW,velocity,flow,equivalentK,parallelK,layers,reversedLayers,interface:at(layers[0].endZ),midpoint:at(length/2),reversedMidpoint:at(length/2,reversedLayers),profile:Array.from({length:81},(_,i)=>at(length*i/80)),reversedProfile:Array.from({length:81},(_,i)=>at(length*i/80,reversedLayers))};
  }
  function capillary(input={}) {
    if(!object(input))return bad(['모관대 입력 객체가 필요합니다.']);
    const {waterDepth=3,capillaryHeight=1,observationDepth=2.5,gammaW=9.81}=input;
    if(![waterDepth,capillaryHeight,observationDepth,gammaW].every(finite)||waterDepth<0||waterDepth>8||capillaryHeight<0||capillaryHeight>waterDepth||observationDepth<0||observationDepth>8||gammaW<=0)return bad(['0≤모관대 높이≤수위 깊이≤8 m, 관찰 깊이 0~8 m를 확인하세요.']);
    const top=waterDepth-capillaryHeight;
    const at=z=>({z,pore:z>=top-1e-12?gammaW*(z-waterDepth):null,pressureHead:z>=top-1e-12?z-waterDepth:null,region:z<top?'unmodeled':z<waterDepth?'capillary':'below-water'});
    return {valid:true,errors:[],waterDepth,capillaryHeight,observationDepth,gammaW,top,observation:at(observationDepth),topPressure:-gammaW*capillaryHeight,profile:Array.from({length:81},(_,i)=>at(i/10))};
  }

  function unitSolution(nx,nz,width,depth,wallDepth,ratio,boundaryMode,tolerance,maxIterations) {
    const key=JSON.stringify([nx,nz,width,depth,wallDepth,ratio,boundaryMode,tolerance,maxIterations]);
    if(cache.has(key))return cache.get(key);
    const dx=width/nx,dz=depth/nz,n=nx*nz,mid=nx/2,wallRows=Math.round(wallDepth/dz);
    const west=new Float64Array(n),east=new Float64Array(n),north=new Float64Array(n),south=new Float64Array(n),diag=new Float64Array(n),rhs=new Float64Array(n),h=new Float64Array(n);
    const cx=ratio*dz/dx,cz=dx/dz;
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
      const p=j*nx+i;
      h[p]=boundaryMode==='lateral'?1-(i+.5)/nx:(i<mid?1:0);
      if(i===0){diag[p]+=2*cx;rhs[p]+=2*cx;}else if(!(i===mid&&j<wallRows)){west[p]=cx;diag[p]+=cx;}
      if(i===nx-1)diag[p]+=2*cx;else if(!(i===mid-1&&j<wallRows)){east[p]=cx;diag[p]+=cx;}
      if(j===0){if(boundaryMode==='reservoir'){diag[p]+=2*cz;rhs[p]+=i<mid?2*cz:0;}}else{north[p]=cz;diag[p]+=cz;}
      if(j<nz-1){south[p]=cz;diag[p]+=cz;}
    }
    let iterations=0,residual=Infinity;
    const weighted=p=>rhs[p]+(west[p]?west[p]*h[p-1]:0)+(east[p]?east[p]*h[p+1]:0)+(north[p]?north[p]*h[p-nx]:0)+(south[p]?south[p]*h[p+nx]:0);
    for(iterations=1;iterations<=maxIterations;iterations++){
      for(let p=0;p<n;p++)h[p]+=1.72*(weighted(p)/diag[p]-h[p]);
      if(iterations%10===0||iterations===maxIterations){residual=0;for(let p=0;p<n;p++)residual=Math.max(residual,Math.abs(weighted(p)-diag[p]*h[p])/diag[p]);if(residual<tolerance)break;}
    }
    const solution={h,nx,nz,dx,dz,mid,wallRows,iterations:Math.min(iterations,maxIterations),residual,converged:residual<tolerance};
    if(cache.size>=24)cache.delete(cache.keys().next().value);
    cache.set(key,solution);return solution;
  }

  function contours(r,levels=9) {
    const segments=[],{nx,nz,dx,dz,heads,headUp,headDown,wallDepth}=r;
    if(headUp===headDown)return segments;
    const lo=Math.min(headUp,headDown),hi=Math.max(headUp,headDown);
    for(let l=1;l<=levels;l++){
      const level=lo+(hi-lo)*l/(levels+1);
      for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){
        // Never interpolate a cell-centre square across a blocked wall face.
        if(i===nx/2-1&&(j+.5)*dz<wallDepth)continue;
        const ids=[j*nx+i,j*nx+i+1,(j+1)*nx+i+1,(j+1)*nx+i];
        const corners=[{x:-r.width/2+(i+.5)*dx,z:(j+.5)*dz},{x:-r.width/2+(i+1.5)*dx,z:(j+.5)*dz},{x:-r.width/2+(i+1.5)*dx,z:(j+1.5)*dz},{x:-r.width/2+(i+.5)*dx,z:(j+1.5)*dz}];
        const crossings=[];
        for(let edge=0;edge<4;edge++){
          const next=(edge+1)%4,a=heads[ids[edge]],b=heads[ids[next]];
          if((a<level&&b>=level)||(b<level&&a>=level)){
            const f=(level-a)/(b-a),pa=corners[edge],pb=corners[next];
            crossings.push({x:pa.x+f*(pb.x-pa.x),z:pa.z+f*(pb.z-pa.z)});
          }
        }
        if(crossings.length===2)segments.push({level,points:crossings});
        else if(crossings.length===4){ // Ambiguous saddle: centre-value topology.
          const centre=ids.reduce((s,p)=>s+heads[p],0)/4;
          const pairs=(heads[ids[0]]>=level)===(centre>=level)?[[0,1],[2,3]]:[[0,3],[1,2]];
          pairs.forEach(([a,b])=>segments.push({level,points:[crossings[a],crossings[b]]}));
        }
      }
    }
    return segments;
  }
  function velocityAt(r,x,z) {
    if(x< -r.width/2||x>r.width/2||z<0||z>r.depth)return null;
    const i=Math.min(r.nx-1,Math.max(0,Math.floor((x+r.width/2)/r.dx))),j=Math.min(r.nz-1,Math.max(0,Math.floor(z/r.dz)));
    const fx=(x+r.width/2-i*r.dx)/r.dx,fz=(z-j*r.dz)/r.dz;
    const vx=r.faceX[j*(r.nx+1)+i]*(1-fx)+r.faceX[j*(r.nx+1)+i+1]*fx;
    const vz=r.faceZ[j*r.nx+i]*(1-fz)+r.faceZ[(j+1)*r.nx+i]*fz;
    return {vx,vz};
  }
  function streamlines(r,count=12) {
    if(!r.converged||r.headUp===r.headDown||r.totalIn<1e-25)return [];
    const faces=[],eps=Math.min(r.dx,r.dz)*1e-4;
    for(let i=0;i<r.nx;i++){
      const q=r.faceZ[i]*r.dx;
      if(q>0)faces.push({x:-r.width/2+i*r.dx,z:eps,spanX:r.dx,spanZ:0,flux:q});
    }
    for(let j=0;j<r.nz;j++){
      const left=r.faceX[j*(r.nx+1)]*r.dz,right=-r.faceX[j*(r.nx+1)+r.nx]*r.dz;
      if(left>0)faces.push({x:-r.width/2+eps,z:j*r.dz,spanX:0,spanZ:r.dz,flux:left});
      if(right>0)faces.push({x:r.width/2-eps,z:j*r.dz,spanX:0,spanZ:r.dz,flux:right});
    }
    const total=faces.reduce((s,f)=>s+f.flux,0),lines=[],step=Math.min(r.dx,r.dz)*.18;
    for(let seed=0;seed<count;seed++){
      const target=total*(seed+.5)/count;let accumulated=0,previous=0,f=faces.at(-1);
      for(const candidate of faces){previous=accumulated;accumulated+=candidate.flux;if(accumulated>=target){f=candidate;break;}}
      if(!f)continue;
      const fraction=(target-previous)/f.flux;
      let p={x:f.x+f.spanX*fraction,z:f.z+f.spanZ*fraction};const line=[p];
      for(let n=0;n<3000;n++){
        const v=velocityAt(r,p.x,p.z),speed=v?Math.hypot(v.vx,v.vz):0;
        if(speed<1e-20)break;
        const mid={x:p.x+step*.5*v.vx/speed,z:p.z+step*.5*v.vz/speed};
        const vm=velocityAt(r,mid.x,mid.z)||v,sm=Math.hypot(vm.vx,vm.vz);if(sm<1e-20)break;
        const next={x:p.x+step*vm.vx/sm,z:p.z+step*vm.vz/sm};
        if(p.x*next.x<0){const zCross=p.z+(next.z-p.z)*(-p.x)/(next.x-p.x);if(zCross<r.wallDepth-1e-10)break;}
        if(next.x< -r.width/2||next.x>r.width/2||next.z<0||next.z>r.depth){
          // Clip the last integration segment to the first external boundary.
          let t=1;
          if(next.x< -r.width/2)t=Math.min(t,(-r.width/2-p.x)/(next.x-p.x));
          if(next.x>r.width/2)t=Math.min(t,(r.width/2-p.x)/(next.x-p.x));
          if(next.z<0)t=Math.min(t,-p.z/(next.z-p.z));
          if(next.z>r.depth)t=Math.min(t,(r.depth-p.z)/(next.z-p.z));
          line.push({x:p.x+t*(next.x-p.x),z:p.z+t*(next.z-p.z)});break;
        }
        line.push(next);p=next;
      }
      if(line.length>3)lines.push(line);
    }
    return lines;
  }

  function wall(input={}) {
    if(!object(input))return bad(['침투 조건을 객체로 입력하세요.']);
    const {wallDepth=6,headUp=6,headDown=1,logK=-4,logAnisotropy=0,nx=48,nz=24,width=24,depth=12,boundaryMode='reservoir',tolerance=1e-10,maxIterations=12000,visuals=true}=input;
    if(![wallDepth,headUp,headDown,logK,logAnisotropy,width,depth,tolerance].every(finite))return bad(['입력은 유한한 숫자여야 합니다.']);
    if(!Number.isInteger(nx)||nx<8||nx>128||nx%2||!Number.isInteger(nz)||nz<4||nz>64||nx*nz>8192)return bad(['격자는 짝수 nx=8~128, nz=4~64, 8192셀 이내여야 합니다.']);
    if(width<=0||depth<=0||wallDepth<0||wallDepth>depth||headUp<0||headDown<0||logK< -12||logK>0||logAnisotropy< -2||logAnisotropy>2||tolerance<=0||tolerance>1e-3||!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>50000||!['reservoir','lateral'].includes(boundaryMode))return bad(['양의 영역 크기, 0≤벽 깊이≤층 깊이, 지표 이상 수두, 지원 투수성·해석 범위를 확인하세요.']);
    const dz=depth/nz;if(Math.abs(wallDepth/dz-Math.round(wallDepth/dz))>1e-8)return bad([`벽 끝은 격자 경계와 일치해야 합니다. 현재 깊이 간격 ${dz} m입니다.`]);
    const kz=10**logK,kx=kz*10**logAnisotropy,ratio=kx/kz;
    const unit=unitSolution(nx,nz,width,depth,wallDepth,ratio,boundaryMode,tolerance,maxIterations),dx=unit.dx,delta=headUp-headDown;
    const heads=Array.from(unit.h,v=>headDown+delta*v),faceX=new Float64Array(nz*(nx+1)),faceZ=new Float64Array((nz+1)*nx);
    for(let j=0;j<nz;j++)for(let i=0;i<=nx;i++){
      const p=j*(nx+1)+i;
      faceX[p]=i===0?2*kx*(headUp-heads[j*nx])/dx:i===nx?2*kx*(heads[j*nx+nx-1]-headDown)/dx:i===nx/2&&j<unit.wallRows?0:kx*(heads[j*nx+i-1]-heads[j*nx+i])/dx;
    }
    for(let j=0;j<=nz;j++)for(let i=0;i<nx;i++)faceZ[j*nx+i]=j===nz?0:j===0?(boundaryMode==='reservoir'?2*kz*((i<nx/2?headUp:headDown)-heads[i])/dz:0):kz*(heads[(j-1)*nx+i]-heads[j*nx+i])/dz;
    let totalIn=0,totalOut=0,maxCellImbalance=0,throughWall=0,exitGradientMax=0,exitFlux2m=0;
    const addOut=q=>{if(q>0)totalOut+=q;else totalIn-=q;};
    for(let j=0;j<nz;j++){addOut(-faceX[j*(nx+1)]*dz);addOut(faceX[j*(nx+1)+nx]*dz);throughWall+=faceX[j*(nx+1)+nx/2]*dz;}
    for(let i=0;i<nx;i++){
      addOut(-faceZ[i]*dx);
      if(delta>=0?i>=nx/2:i<nx/2){
        exitGradientMax=Math.max(exitGradientMax,-faceZ[i]/kz);
        const x0=i*dx-width/2,x1=x0+dx,a=delta>=0?0:-Math.min(2,width/2),b=delta>=0?Math.min(2,width/2):0;
        exitFlux2m-=faceZ[i]*Math.max(0,Math.min(x1,b)-Math.max(x0,a));
      }
    }
    const cells=[];
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
      const p=j*nx+i,z=(j+.5)*dz,x=-width/2+(i+.5)*dx;
      const vx=(faceX[j*(nx+1)+i]+faceX[j*(nx+1)+i+1])/2,vz=(faceZ[j*nx+i]+faceZ[(j+1)*nx+i])/2;
      const imbalance=(faceX[j*(nx+1)+i+1]-faceX[j*(nx+1)+i])*dz+(faceZ[(j+1)*nx+i]-faceZ[j*nx+i])*dx;
      maxCellImbalance=Math.max(maxCellImbalance,Math.abs(imbalance));
      cells.push({x,z,head:heads[p],pressureHead:heads[p]+z,porePressure:9.81*(heads[p]+z),vx,vz});
    }
    const converged=delta===0||unit.converged;
    const r={valid:converged,errors:converged?[]:['반복 해석이 수렴하지 않았습니다. 입력 또는 격자 조건을 확인하세요.'],width,depth,wallDepth,headUp,headDown,logK,logAnisotropy,kx,kz,ratio,nx,nz,dx,dz,heads,cells,faceX,faceZ,boundaryMode,converged,iterations:delta===0?0:unit.iterations,residual:Math.abs(delta)*unit.residual,normalizedResidual:delta===0?0:unit.residual,totalIn,totalOut,throughWall,massBalance:totalIn+totalOut>1e-25?Math.abs(totalIn-totalOut)/Math.max(totalIn,totalOut):0,maxCellImbalance,exitGradientMax,exitGradient2m:exitFlux2m/(Math.min(2,width/2)*kz)};
    r.contours=visuals&&converged?contours(r):[];r.streamlines=visuals&&converged?streamlines(r):[];
    r.arrows=visuals?cells.filter((_,p)=>Math.floor(p/nx)%4===2&&p%nx%4===2):[];
    return r;
  }
  return {darcy,constantHead,fallingHead,layered,capillary,wall,velocityAt};
})();
