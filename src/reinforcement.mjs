/** Unit-width reinforcement, specified pullout factor, uniform effective stress. */
export const Reinforcement=(()=>{
 function solve(input={}){
  const bad=errors=>({valid:false,errors});if(!input||typeof input!=='object'||Array.isArray(input))return bad(['입력 객체가 필요합니다.']);
  const {embedment=2,normalStress=50,pulloutFactor=.5,tensileResistance=80}=input;
  if(![embedment,normalStress,pulloutFactor,tensileResistance].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))return bad(['정착길이·유효수직응력·인발계수·인장저항은 0 이상이어야 합니다.']);
  const gradient=2*normalStress*pulloutFactor,pullout=gradient*embedment,resistance=Math.min(pullout,tensileResistance),transitionLength=gradient>0?tensileResistance/gradient:null,tol=1e-9*Math.max(pullout,tensileResistance,1),governing=Math.abs(pullout-tensileResistance)<tol?'equal':pullout<tensileResistance?'pullout':'tensile';
  if(![gradient,pullout,resistance,...(transitionLength===null?[]:[transitionLength])].every(Number.isFinite))return bad(['계산 범위를 넘는 입력입니다.']);
  const maxLength=Math.max(5,embedment),curve=Array.from({length:61},(_,i)=>{const length=maxLength*i/60;return {length,pullout:gradient*length,resistance:Math.min(gradient*length,tensileResistance)};});
  return {valid:true,errors:[],embedment,normalStress,pulloutFactor,tensileResistance,gradient,pullout,resistance,transitionLength,governing,curve,model:'unit-width-uniform-stress-pullout-tensile-comparison'};
 }
 return {solve};
})();
