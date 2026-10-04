/** Input shape only. Physics validation belongs to the selected excavation engine. */
export const ExcavationSchema = (() => {
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.prototype.toString.call(value)==='[object Object]';
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const numeric=value=>value===null||(typeof value==='number'&&Number.isFinite(value));
  const number={kind:'number'},boolean={kind:'boolean'},text={kind:'text'};
  const choice=(...values)=>({kind:'choice',values});
  const array=(items,max=64)=>({kind:'array',items,max});
  const object=(fields,optional={})=>({kind:'object',fields,optional});
  const soilFields={gamma:number,gammaSat:number,c:number,phi:number,kh:number,k0:number};
  const soil=object(soilFields);
  const legacyFields={height:number,embedment:number,EI:number,groundK:number,anchorK:number,preload:number,installDepth:number,anchorDepth:number,phi:number,gamma:number,stage:choice('before','locked','final')};
  const legacy=object(legacyFields);
  const support=object({id:text,type:choice('anchor','strut','raker','corner','nail','rock','slab'),z:number,stiffness:number,preload:number,angle:number,spacing:number},{length:number,preloadLoss:number,capacity:number,bondStiffness:number,baseStiffness:number,retained:boolean,installClearance:number,releaseClearance:number,activateAtBackfill:number});
  const plan=object({lx:number,ly:number,walerEI:number,stations:number,corners:array(choice(0,1,2,3),4),membersPerCorner:number,offset:number,spacing:number});
  const observation=object({phase:choice('excavation','backfill'),depth:number,eventSide:choice('before','installed','after'),mode:choice('history','shape')},{wallId:choice('A','B','C','D'),position:number,resultMode:choice('total','increment','envelope')});
  const staged=object({modelVersion:choice(2),height:number,embedment:number,EI:number,mesh:number,increment:number,soil,fill:object({...soilFields,initialPressure:number},{pressureModel:choice('soil','spring')}),water:object({retained:number,excavation:number,restore:number}),surcharge:number,clearance:number,releaseLinked:boolean,releaseClearance:number,supports:array(support,24),plan,observation});
  function safeTree(value,depth=0){
    if(depth>10)throw new Error('흙막이 입력 구조가 너무 깊습니다.');
    if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
      if(['__proto__','prototype','constructor'].includes(key))throw new Error('허용되지 않는 흙막이 입력 항목입니다.');
      safeTree(child,depth+1);
    }
  }
  function check(value,schema,path){
    if(schema.kind==='number'){if(!numeric(value))throw new Error(`${path}: 유한한 숫자 또는 미입력 값이 필요합니다.`);return;}
    if(schema.kind==='boolean'){if(typeof value!=='boolean')throw new Error(`${path}: 참/거짓 값이 필요합니다.`);return;}
    if(schema.kind==='text'){if(typeof value!=='string'||!value.trim()||value.length>80)throw new Error(`${path}: 1~80자의 식별자가 필요합니다.`);return;}
    if(schema.kind==='choice'){if(!schema.values.includes(value))throw new Error(`${path}: 현재 모형에 없는 선택값입니다.`);return;}
    if(schema.kind==='array'){
      if(!Array.isArray(value)||value.length>schema.max)throw new Error(`${path}: 최대 ${schema.max}개 항목의 배열이 필요합니다.`);
      value.forEach((item,index)=>check(item,schema.items,`${path}[${index+1}]`));return;
    }
    if(!plain(value))throw new Error(`${path}: 객체 형식이 필요합니다.`);
    const allowed={...schema.fields,...schema.optional};
    if(Object.keys(schema.fields).some(key=>!own(value,key))||Object.keys(value).some(key=>!own(allowed,key)))throw new Error(`${path}: 필요한 항목이 없거나 알 수 없는 항목이 있습니다.`);
    for(const [key,child]of Object.entries(value))check(child,allowed[key],`${path}.${key}`);
  }
  function validateData(data){
    try{
      safeTree(data);if(!plain(data))throw new Error('흙막이 입력 객체가 필요합니다.');
      check(data,own(data,'modelVersion')?staged:legacy,'흙막이');
      if(data.modelVersion===2){
        if(new Set(data.supports.map(s=>s.id)).size!==data.supports.length)throw new Error('지보재 식별자가 중복되었습니다.');
        if(new Set(data.plan.corners).size!==data.plan.corners.length)throw new Error('코너 선택이 중복되었습니다.');
      }
      return {valid:true,errors:[]};
    }catch(error){return {valid:false,errors:[error.message||'흙막이 입력 형식을 확인하세요.']};}
  }
  function validateLegacyData(data){
    try{safeTree(data);check(data,legacy,'이전 흙막이');return {valid:true,errors:[]};}
    catch(error){return {valid:false,errors:[error.message||'이전 흙막이 입력 형식을 확인하세요.']};}
  }
  // Never merge staged defaults into old inputs: that would silently change their engine.
  function restoreData(saved,defaults){
    const selected=saved===undefined?defaults:saved,result=validateData(selected);
    if(!result.valid)throw new Error(result.errors.join(' '));
    return JSON.parse(JSON.stringify(selected));
  }
  return {validateData,validateLegacyData,restoreData,legacyFields:Object.freeze(Object.keys(legacyFields))};
})();
