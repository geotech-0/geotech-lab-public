/** Vertical stress increment from one/two uniformly loaded flexible rectangles.
 * Boussinesq elastic half-space; m, kPa, kN. No soil self-weight or pore-pressure model.
 * Signed-corner closed form is the exact area integral, not a 2:1 approximation.
 */
export const RectangularStress = (() => {
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const bad=errors=>({valid:false,errors,warnings:[]});
  const numeric=o=>Object.entries(o).filter(([,v])=>!finite(v)).map(([k])=>`${k}: 유한한 숫자를 입력하세요.`);

  // Integral over the signed rectangle [0,u]×[0,v]. Scale avoids squared-length overflow.
  function corner(u,v,z){
    if(u===0||v===0)return 0;
    const scale=Math.max(Math.abs(u),Math.abs(v),z),a=u/scale,b=v/scale,h=z/scale;
    const R=Math.hypot(a,b,h),aa=a*a+h*h,bb=b*b+h*h;
    if(h===0||aa===0||bb===0)return NaN;
    return (Math.atan2(a*b,h*R)+(a*h/aa)*(b/R)+(b*h/bb)*(a/R))/(2*Math.PI);
  }

  function rectangle(input={}){
    if(!object(input))return bad(['직사각형 크기·재하압·관찰좌표를 입력하세요.']);
    const {width=2,length=3,pressure=100,x=0,y=0,depth=3,centerX=0,centerY=0}=input;
    const errors=numeric({width,length,pressure,x,y,depth,centerX,centerY});
    if(errors.length)return bad(errors);
    if(width<=0||length<=0||pressure<0||depth<0)return bad(['B와 L은 0보다 크고, q와 깊이 z는 0 이상이어야 합니다.']);
    const dx=x-centerX,dy=y-centerY,x1=-width/2-dx,x2=width/2-dx,y1=-length/2-dy,y2=length/2-dy;
    const area=width*length,load=pressure*area;
    if(![dx,dy,x1,x2,y1,y2,area,load].every(finite)||area===0||x1===x2||y1===y2)return bad(['치수·좌표·하중 조합이 표현 가능한 계산 범위를 벗어났습니다.']);
    let influence,roundoffBound=0,surfacePosition=null;
    if(depth===0){
      const factor=(d,half)=>Math.abs(d)<half?1:Math.abs(d)===half?.5:0;
      influence=factor(dx,width/2)*factor(dy,length/2);
      surfacePosition=influence===1?'inside':influence===.5?'edge':influence===.25?'corner':'outside';
    }else{
      const terms=[corner(x2,y2,depth),-corner(x1,y2,depth),-corner(x2,y1,depth),corner(x1,y1,depth)];
      influence=terms.reduce((s,v)=>s+v,0);
      roundoffBound=32*Number.EPSILON*Math.max(1,...terms.map(Math.abs));
      if(!finite(influence)||influence < -roundoffBound||influence > 1+roundoffBound)return bad(['직사각형 영향계수를 안정적으로 계산할 수 없는 치수비입니다. 길이 단위와 관찰좌표를 확인하세요.']);
      // Only floating-point roundoff at exact physical bounds; never fixes an invalid input.
      if(influence<0)influence=0;
      if(influence>1)influence=1;
    }
    const stress=pressure*influence;
    if(!finite(stress))return bad(['계산 응력이 표현 범위를 초과했습니다.']);
    return {valid:true,errors:[],warnings:[],width,length,pressure,x,y,depth,centerX,centerY,area,load,
      influence,stress,roundoffBound,surfaceLimit:depth===0,surfacePosition,model:'boussinesq-rectangle-corner-integral-v1'};
  }

  function field(input={}){
    if(!object(input))return bad(['재하면과 관찰점을 입력하세요.']);
    const {width=2,length=3,pressure=100,depth=3,x=0,mode='single',spacing=4,ratio=1}=input;
    const errors=numeric({width,length,pressure,depth,x,...(mode==='double'?{spacing,ratio}:{})});
    if(!['single','double'].includes(mode))errors.push('한 개 또는 두 개의 재하면을 선택하세요.');
    if(width<.5||width>6||length<.5||length>10)errors.push('이 실험의 B는 0.5~6 m, L은 0.5~10 m입니다.');
    if(pressure<0||pressure>600)errors.push('이 실험의 q₁은 0~600 kPa입니다.');
    if(depth<0||depth>12||x< -4||x>16)errors.push('관찰 범위는 깊이 0~12 m, x=−4~16 m입니다.');
    if(mode==='double'&&(spacing<width||spacing>12))errors.push('별개의 두 재하면이 겹치지 않도록 중심간격 s는 B 이상, 12 m 이하로 입력하세요.');
    if(mode==='double'&&(ratio<0||ratio>2))errors.push('두 번째 재하압 비 q₂/q₁은 0~2입니다.');
    if(errors.length)return bad(errors);
    const patches=[{id:1,centerX:0,centerY:0,width,length,pressure},...(mode==='double'?[{id:2,centerX:spacing,centerY:0,width,length,pressure:pressure*ratio}]:[])];
    function at(observeX,z){
      const parts=patches.map(p=>rectangle({...p,x:observeX,y:0,depth:z}));
      if(parts.some(p=>!p.valid))return null;
      return {stress:parts.reduce((sum,p)=>sum+p.stress,0),parts:parts.map(p=>p.stress),influences:parts.map(p=>p.influence)};
    }
    const current=at(x,depth);if(!current)return bad(['관찰점의 응력 계산에 실패했습니다.']);
    const cells=[],profile=[];
    for(let iz=0;iz<24;iz++)for(let ix=0;ix<48;ix++){
      const cx=-6+(ix+.5)*.5,z=(iz+.5)*.5,p=at(cx,z);
      if(!p)return bad(['단면 응력 계산에 실패했습니다.']);
      cells.push({x:cx,z,...p});
    }
    // Nonuniform samples preserve the sharp but continuous near-surface transition.
    const depths=[0,.002,.005,.01,.025,.05,...Array.from({length:120},(_,i)=>(i+1)/10)];
    for(const z of depths){const p=at(x,z);if(!p)return bad(['깊이별 응력 계산에 실패했습니다.']);profile.push({z,...p});}
    return {valid:true,errors:[],warnings:[],kind:'rectangle',width,length,pressure,depth,x,y:0,mode,
      spacing:mode==='double'?spacing:null,ratio:mode==='double'?ratio:null,patches,...current,
      area:width*length,load:patches.reduce((sum,p)=>sum+p.pressure*width*length,0),
      surfaceLimit:depth===0,cells,profile,maxCell:Math.max(...cells.map(p=>p.stress)),
      plotExtent:{minX:-6,maxX:18,maxDepth:12,cellSize:.5},model:'boussinesq-rectangle-superposition-v1'};
  }
  return Object.freeze({rectangle,field});
})();
