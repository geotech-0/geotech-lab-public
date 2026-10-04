/** Horizontal walers and axial braces condensed onto vertical wall strips.
 * Displacements are positive into the excavation. Forces resist that motion.
 * This is a structural strip/frame model, not a 3-D soil continuum model.
 */
export const ExcavationPlanar = (() => {
  const finite = Number.isFinite;
  const cache = new Map();
  const defaults = {lx:20,ly:14,walerEI:100000,stations:3,corners:[0,1,2,3],membersPerCorner:1,offset:2,spacing:1.2};
  const planOf = input => ({...defaults,...input.plan});
  const wallsOf = p => [
    {id:'A',a:{x:0,y:0},b:{x:p.lx,y:0},length:p.lx,normal:{x:0,y:1}},
    {id:'B',a:{x:p.lx,y:0},b:{x:p.lx,y:p.ly},length:p.ly,normal:{x:-1,y:0}},
    {id:'C',a:{x:p.lx,y:p.ly},b:{x:0,y:p.ly},length:p.lx,normal:{x:0,y:-1}},
    {id:'D',a:{x:0,y:p.ly},b:{x:0,y:0},length:p.ly,normal:{x:1,y:0}},
  ];
  const point = (wall,s) => ({wallId:wall.id,s,x:wall.a.x+(wall.b.x-wall.a.x)*s/wall.length,y:wall.a.y+(wall.b.y-wall.a.y)*s/wall.length});
  const cornerPairs = [[0,false,3,true],[0,true,1,false],[1,true,2,false],[2,true,3,false]];
  function validate(input) {
    const p=planOf(input),errors=[],hasCorner=(input.supports||[]).some(s=>s.type==='corner');
    if(![p.lx,p.ly,p.walerEI].every(finite)||p.lx<=0||p.ly<=0||p.walerEI<=0)errors.push('평면 길이·띠장 EI는 양수여야 합니다.');
    if(hasCorner&&(![p.offset,p.spacing].every(finite)||p.offset<=0||p.spacing<=0))errors.push('코너 이격·간격은 양수여야 합니다.');
    if(!Number.isInteger(p.stations)||p.stations<2||p.stations>5)errors.push('벽별 해석 위치는 2~5개여야 합니다.');
    if(!Array.isArray(p.corners)||p.corners.some(c=>!Number.isInteger(c)||c<0||c>3)||new Set(p.corners).size!==p.corners.length)errors.push('코너 선택 형식을 확인하세요.');
    else if(hasCorner&&!p.corners.length)errors.push('서로 다른 코너를 1개 이상 선택하세요.');
    if(hasCorner&&(!Number.isInteger(p.membersPerCorner)||p.membersPerCorner<1||p.membersPerCorner>3))errors.push('코너당 본수는 1~3본이어야 합니다.');
    if(hasCorner&&p.offset+(p.membersPerCorner-1)*p.spacing>=Math.min(p.lx,p.ly)/2)errors.push('코너 지보 접점은 각 벽의 절반 길이 안에 배치하세요. 서로 반대 코너의 부재가 겹칠 수 없습니다.');
    if((input.supports||[]).some(s=>['corner','strut'].includes(s.type)&&Math.abs(s.angle||0)>1e-9))errors.push('이 평면 스트럿 모형은 양단이 같은 높이인 수평 부재입니다. 수직 경사는 0°로 설정하세요.');
    if((input.supports||[]).some(s=>s.type==='strut'&&Math.max(p.lx,p.ly)/(s.spacing||2)>80))errors.push('각 방향의 스트럿은 최대 80본까지 정의할 수 있습니다.');
    if((input.supports||[]).some(s=>finite(s.capacity)&&(s.preload||0)*(1-(s.preloadLoss||0))>s.capacity))errors.push('유효 초기작용력은 입력한 1본 축력 한계를 넘을 수 없습니다.');
    return {valid:!errors.length,errors};
  }
  function geometry(input={},support) {
    const p=planOf(input),walls=wallsOf(p),strips=walls.flatMap(w=>Array.from({length:p.stations},(_,i)=>({id:`${w.id}:${i}`,wallId:w.id,position:(i+.5)/p.stations,width:w.length/p.stations,...point(w,w.length*(i+.5)/p.stations)})));
    const members=[];
    for(const s of support?[support]:(input.supports||[])) {
      const append=(a,b,index)=>{
        const length=Math.hypot(b.x-a.x,b.y-a.y),ea=s.stiffness*(s.length||length);
        members.push({id:`${s.id}:${index}`,supportId:s.id,type:s.type,a,b,length,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,axialStiffness:ea/length});
      };
      if(s.type==='corner')for(const c of p.corners){const [wa,ae,wb,be]=cornerPairs[c];for(let j=0;j<p.membersPerCorner;j++){const d=p.offset+j*p.spacing;append(point(walls[wa],ae?walls[wa].length-d:d),point(walls[wb],be?walls[wb].length-d:d),`${c}:${j}`);}}
      if(s.type==='strut')for(const [wa,wb] of [[0,2],[1,3]]){const n=Math.max(1,Math.round(walls[wa].length/(s.spacing||2)));if(n>80)continue;for(let j=0;j<n;j++){const a=walls[wa].length*(j+.5)/n;append(point(walls[wa],a),point(walls[wb],walls[wb].length-a),`${wa}:${j}`);}}
    }
    return {walls,strips,members};
  }
  function prepare(input={}) {
    const check=validate(input);if(!check.valid)return {...check,strips:[]};
    const coupled=(input.supports||[]).some(s=>s.type==='corner');
    if(coupled)return {...check,...geometry(input),coupled:true};
    const wallId=input.observation?.wallId||'A',position=input.observation?.position??.5;
    return {...check,strips:[{id:`${wallId}:0`,wallId,position,width:1}],coupled:false};
  }
  const matrix=n=>Array.from({length:n},()=>new Float64Array(n));
  function factor(a) {
    const n=a.length,L=matrix(n),scale=Math.max(1,...a.map((r,i)=>Math.abs(r[i])));
    for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let v=a[i][j];for(let k=0;k<j;k++)v-=L[i][k]*L[j][k];if(i===j){if(v<=scale*1e-13)return null;L[i][j]=Math.sqrt(v);}else L[i][j]=v/L[j][j];}
    return L;
  }
  function solve(L,b) {
    const x=Float64Array.from(b),n=x.length;
    for(let i=0;i<n;i++){for(let j=0;j<i;j++)x[i]-=L[i][j]*x[j];x[i]/=L[i][i];}
    for(let i=n-1;i>=0;i--){for(let j=i+1;j<n;j++)x[i]-=L[j][i]*x[j];x[i]/=L[i][i];}return x;
  }
  const beam=(EI,L)=>[[12,6*L,-12,6*L],[6*L,4*L*L,-6*L,2*L*L],[-12,-6*L,12,-6*L],[6*L,2*L*L,-6*L,4*L*L]].map(r=>r.map(v=>v*EI/L**3));
  function frame(input,s) {
    const p=planOf(input),key=JSON.stringify([p,s.id,s.type,s.spacing,s.stiffness,s.length]);
    if(cache.has(key))return cache.get(key);
    const g=geometry(input,s),nodes=[],byWall=new Map();
    for(const w of g.walls){const positions=[0,w.length,...g.strips.filter(t=>t.wallId===w.id).map(t=>t.s),...g.members.flatMap(m=>[m.a,m.b].filter(t=>t.wallId===w.id).map(t=>t.s))];const unique=[...new Set(positions.map(v=>Math.round(v*1e8)/1e8))].sort((a,b)=>a-b);const list=unique.map(v=>{const n={...point(w,v),dof:2*nodes.length};nodes.push(n);return n;});byWall.set(w.id,list);}
    const n=nodes.length*2,K=matrix(n);
    for(const list of byWall.values())for(let j=1;j<list.length;j++){const a=list[j-1],b=list[j],ke=beam(p.walerEI,b.s-a.s),d=[a.dof,a.dof+1,b.dof,b.dof+1];for(let r=0;r<4;r++)for(let c=0;c<4;c++)K[d[r]][d[c]]+=ke[r][c];}
    const nodeAt=t=>byWall.get(t.wallId).find(n=>Math.abs(n.s-t.s)<1e-6);
    const boundary=g.strips.map(t=>nodeAt(t).dof),fixed=new Set(boundary),free=Array.from({length:n},(_,i)=>i).filter(i=>!fixed.has(i));
    const members=g.members.map(m=>{const a=nodeAt(m.a),b=nodeAt(m.b),e={x:(m.b.x-m.a.x)/m.length,y:(m.b.y-m.a.y)/m.length},na=g.walls.find(w=>w.id===a.wallId).normal,nb=g.walls.find(w=>w.id===b.wallId).normal;return {...m,dofs:[a.dof,b.dof],v:[na.x*e.x+na.y*e.y,-nb.x*e.x-nb.y*e.y]};});
    const f={...g,n,K,boundary,free,members,factors:new Map()};cache.set(key,f);if(cache.size>32)cache.delete(cache.keys().next().value);return f;
  }
  function system(f,states) {
    const key=states.join(',');if(f.factors.has(key))return f.factors.get(key);
    const K=f.K.map(r=>Float64Array.from(r));
    f.members.forEach((m,i)=>{if(states[i]!==1)return;for(let a=0;a<2;a++)for(let b=0;b<2;b++)K[m.dofs[a]][m.dofs[b]]+=m.axialStiffness*m.v[a]*m.v[b];});
    const L=factor(f.free.map(i=>Float64Array.from(f.free.map(j=>K[i][j]))));if(!L)return null;
    const influence=f.boundary.map(b=>solve(L,Float64Array.from(f.free.map(i=>K[i][b]))));
    const condensed=f.boundary.map((a,i)=>Float64Array.from(f.boundary.map((b,j)=>K[a][b]-f.free.reduce((v,k,l)=>v+K[a][k]*influence[j][l],0))));
    const result={K,L,influence,condensed};f.factors.set(key,result);if(f.factors.size>24)f.factors.delete(f.factors.keys().next().value);return result;
  }
  const reference=(s,id)=>s.referenceByStrip?.find(r=>r.id===id)?.displacementAtZ??0;
  const at=(rows,id,z)=>rows.find(r=>r.id===id)?.uAt(z)??0;
  const bound=(value,cap)=>Math.max(0,Math.min(cap??Infinity,value));
  function axial(s,delta,symmetric=false) {
    const cosine=Math.cos((s.angle||0)*Math.PI/180),k=s.stiffness*(symmetric?2:1);
    let axialK=k;
    if(['anchor','nail','rock'].includes(s.type)&&s.bondStiffness>0)axialK=1/(1/k+1/s.bondStiffness);
    if(s.type==='raker'&&s.baseStiffness>0)axialK=1/(1/k+1/s.baseStiffness);
    const preload=s.preloadActive===false?0:(s.preload||0)*(1-(s.preloadLoss||0));
    const trial=preload+(s.forceControlled?0:axialK*cosine*delta),force=bound(trial,s.capacity);
    return {force,horizontal:force*cosine,tangent:!s.forceControlled&&trial>=0&&trial<(s.capacity??Infinity)?axialK*cosine*cosine:0,mobilized:s.capacity>0?force/s.capacity:null,slack:trial<=0,capped:finite(s.capacity)&&trial>=s.capacity};
  }
  function evaluate({input,uByStrip=[],activeSupports=[],mode='history'}) {
    const prep=prepare(input),forces=[],tangent=[],supportForces=[];
    if(!prep.valid)return {...prep,forces,tangent,supportForces};
    const add=(strip,z,force,k)=>{forces.push({stripId:strip.id,z,force});if(k)tangent.push({aStripId:strip.id,aZ:z,bStripId:strip.id,bZ:z,k});};
    for(const s of activeSupports){
      if(!prep.coupled||!['strut','corner'].includes(s.type)){
        const memberResults=[];
        for(const strip of prep.strips){
          const delta=at(uByStrip,strip.id,s.z)-(mode==='shape'?0:reference(s,strip.id));
          const p=planOf(input),along=['A','C'].includes(strip.wallId)?p.lx:p.ly,span=['A','C'].includes(strip.wallId)?p.ly:p.lx;
          const actualSpacing=s.type==='strut'?along/Math.max(1,Math.round(along/s.spacing)):s.spacing;
          const member=s.type==='strut'?{...s,stiffness:s.stiffness*(s.length||span)/span}:s;
          const r=axial(member,delta,s.type==='strut'),count=strip.width/actualSpacing;
          add(strip,s.z,r.horizontal*count,r.tangent*count);memberResults.push({stripId:strip.id,...r,lineForce:r.horizontal/actualSpacing});
        }
        supportForces.push({id:s.id,type:s.type,z:s.z,force:Math.max(0,...memberResults.map(r=>r.force)),lineForce:Math.max(0,...memberResults.map(r=>r.lineForce)),members:memberResults,capped:memberResults.some(r=>r.capped),slack:memberResults.every(r=>r.slack)});continue;
      }
      const f=frame(input,s),ub=Float64Array.from(f.strips.map(t=>at(uByStrip,t.id,s.z)-(mode==='shape'?0:reference(s,t.id))));
      let states=f.members.map(()=>s.forceControlled?2:1),solution=null;
      const preload=s.preloadActive===false?0:(s.preload||0)*(1-(s.preloadLoss||0));
      const lock=mode==='shape'?null:s.planarLock;
      for(let iteration=0;iteration<30;iteration++){
        const sys=system(f,states);if(!sys)return {valid:false,errors:['띠장–평면 지보 강성행렬을 풀 수 없습니다.'],forces:[],tangent:[],supportForces:[]};
        const p=new Float64Array(f.n);
        if(lock)f.strips.forEach((strip,i)=>p[f.boundary[i]]=lock.boundaryForces.find(v=>v.stripId===strip.id)?.force||0);
        f.members.forEach((m,i)=>{const base=(s.forceControlled?preload:states[i]===2?s.capacity:states[i]===1?preload:0)-(lock?.preload||0);for(let a=0;a<2;a++)p[m.dofs[a]]+=base*m.v[a];});
        const rhs=Float64Array.from(f.free.map(i=>-p[i]-f.boundary.reduce((v,b,j)=>v+sys.K[i][b]*ub[j],0))),uf=solve(sys.L,rhs),u=new Float64Array(f.n);f.boundary.forEach((b,i)=>u[b]=ub[i]);f.free.forEach((b,i)=>u[b]=uf[i]);
        const trials=f.members.map(m=>preload+(s.forceControlled?0:m.axialStiffness*m.dofs.reduce((v,d,j)=>v+m.v[j]*u[d],0)));
        const next=s.forceControlled?states:trials.map(v=>v< -1e-8?0:v>(s.capacity??Infinity)+1e-8?2:1);
        if(next.every((v,i)=>v===states[i])){solution={...sys,u,p,trials};break;}states=next;
      }
      if(!solution)return {valid:false,errors:['코너 지보의 압축 접촉 상태가 수렴하지 않았습니다.'],forces:[],tangent:[],supportForces:[]};
      const boundaryForces=[];
      f.strips.forEach((strip,i)=>{const dof=f.boundary[i],force=solution.K[dof].reduce((v,k,j)=>v+k*solution.u[j],solution.p[dof]);forces.push({stripId:strip.id,z:s.z,force});boundaryForces.push({stripId:strip.id,force});f.strips.forEach((other,j)=>{const k=solution.condensed[i][j];if(Math.abs(k)>1e-9)tangent.push({aStripId:strip.id,aZ:s.z,bStripId:other.id,bZ:s.z,k});});});
      const members=f.members.map((m,i)=>({id:m.id,a:m.a,b:m.b,length:m.length,force:bound(solution.trials[i],s.capacity),slack:states[i]===0,capped:!s.forceControlled&&states[i]===2}));
      supportForces.push({id:s.id,type:s.type,z:s.z,force:Math.max(0,...members.map(m=>m.force)),members,reactionByStrip:boundaryForces.map((v,i)=>({...v,lineForce:v.force/f.strips[i].width})),capped:!s.forceControlled&&members.some(m=>m.capped),slack:members.every(m=>m.slack),lock:{boundaryForces,preload}});
    }
    return {valid:true,errors:[],forces,tangent,supportForces,model:prep.coupled?'수직 벽체 스트립–수평 띠장–축력 지보 결합':'폭 1 m 벽체 · 스트럿은 대칭 맞은편 벽 조건'};
  }
  return {defaults,validate,geometry,prepare,evaluate,clearCache:()=>cache.clear()};
})();
