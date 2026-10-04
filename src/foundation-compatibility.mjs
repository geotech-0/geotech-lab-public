/** Rigid, weightless strip per metre length on two uncoupled Winkler zones. */
export const FoundationCompatibility=(()=>{
 const bad=errors=>({valid:false,errors});
 function solve(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return bad(['입력 객체가 필요합니다.']);
  const {width=4,pressure=100,leftK=5000,rightK=15000}=input;
  if(![width,pressure,leftK,rightK].every(x=>typeof x==='number'&&Number.isFinite(x))||width<=0||pressure<0||leftK<=0||rightK<=0)return bad(['폭·두 지반계수는 양수, 평균압력은 0 이상이어야 합니다.']);
  const contrast=Math.max(leftK,rightK)/Math.min(leftK,rightK);
  if(contrast>5+1e-12)return bad(['현재 전면 압축접촉 해는 좌우 지반계수 비 5 이하에 한정됩니다. 이보다 크면 일부 접촉 분리를 별도로 풀어야 합니다.']);
  const a0=(leftK+rightK)*width/2,a1=(rightK-leftK)*width**2/8,a2=(leftK+rightK)*width**3/24,load=pressure*width;
  const determinant=a0*a2-a1*a1;
  const center=load*a2/determinant,rotation=-load*a1/determinant;
  const edgeLeft=center-rotation*width/2,edgeRight=center+rotation*width/2;
  const forceLeft=leftK*(center*width/2-rotation*width**2/8),forceRight=rightK*(center*width/2+rotation*width**2/8);
  const momentLeft=leftK*(-center*width**2/8+rotation*width**3/24),momentRight=rightK*(center*width**2/8+rotation*width**3/24);
  const flexibleLeft=pressure/leftK,flexibleRight=pressure/rightK;
  const profile=[];
  for(const [k,start,end,zone] of [[leftK,-width/2,0,'left'],[rightK,0,width/2,'right']])for(let i=0;i<=24;i++){const x=start+(end-start)*i/24,settlement=center+rotation*x;profile.push({x,zone,settlement,contactPressure:k*settlement,flexibleSettlement:pressure/k});}
  const r={valid:true,errors:[],width,pressure,leftK,rightK,contrast,load,a0,a1,a2,determinant,center,rotation,edgeLeft,edgeRight,forceLeft,forceRight,momentLeft,momentRight,flexibleLeft,flexibleRight,flexibleMean:(flexibleLeft+flexibleRight)/2,centerDifference:rotation*width/2,independentDifference:flexibleRight-flexibleLeft,profile,model:'two-zone-full-contact-rigid-strip-winkler'};
  if(!Object.values(r).filter(v=>typeof v==='number').every(Number.isFinite))return bad(['입력이 계산 범위를 넘었습니다.']);
  return r;
 }
 return {solve};
})();
