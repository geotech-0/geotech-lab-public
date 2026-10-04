/** Project worksheet files preserve incomplete drafts; calculation validation is separate. */
export const FoundationWorksheetFiles=(()=>{
 const format='soil-sense-foundation-worksheet',version=1,maxBytes=262144;
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
 const fail=message=>{throw new Error(message);};
 function keys(value,expected,label){if(!plain(value)||Object.keys(value).length!==expected.length||expected.some(k=>!Object.hasOwn(value,k)))fail(label+': 항목 구성을 확인하세요.');}
 function text(value,label,max=1000){if(typeof value!=='string'||value.length>max)fail(label+': '+max+'자 이하의 텍스트가 필요합니다.');}
 function nums(value,names,label){keys(value,names,label);for(const k of names)if(value[k]!==null&&(typeof value[k]!=='number'||!Number.isFinite(value[k])))fail(label+' '+k+': 유한한 숫자 또는 빈 값이 필요합니다.');}
 function inspect(input){
  keys(input,['meta','geometry','soil','method','requiredFS','combinations','settlement'],'계산서');
  const meta=['project','element','author','revision','date','criteriaReference','soilSource','loadSource','FSsource'];keys(input.meta,meta,'작성 정보');for(const k of meta)text(input.meta[k],k);
  keys(input.geometry,['width','length','embedment','thickness','cover'],'기초');const {cover,...geometry}=input.geometry;nums(geometry,['width','length','embedment','thickness'],'기초');if(!['backfilled','basement'].includes(cover))fail('피복 형식을 확인하세요.');
  nums(input.soil,['gammaSoil','gammaSat','gammaConcrete','waterDepth','gammaBearing','phi','cohesion'],'지반');
  if(!['fhwa-vesic','usace-meyerhof'].includes(input.method))fail('지원하는 지지력 계수 체계를 선택하세요.');if(input.requiredFS!==null&&(typeof input.requiredFS!=='number'||!Number.isFinite(input.requiredFS)))fail('안전율 숫자를 확인하세요.');
  if(!Array.isArray(input.combinations)||input.combinations.length<1||input.combinations.length>8)fail('하중 조합은 1~8개까지 저장할 수 있습니다.');const ids=new Set();
  for(const c of input.combinations){keys(c,['id','name','columnLoad','moment','loadNote'],'하중 조합');text(c.id,'조합 ID',80);if(!c.id.trim()||ids.has(c.id))fail('조합 ID가 없거나 중복되었습니다.');ids.add(c.id);text(c.name,'조합 이름');text(c.loadNote,'조합 기록');nums({columnLoad:c.columnLoad,moment:c.moment},['columnLoad','moment'],'하중');}
  keys(input.settlement,['adoptedSettlementMm','limitMm','source'],'침하');text(input.settlement.source,'침하 근거');nums({adoptedSettlementMm:input.settlement.adoptedSettlementMm,limitMm:input.settlement.limitMm},['adoptedSettlementMm','limitMm'],'침하');
  return structuredClone(input);
 }
 function serialize(input){const record={format,version,input:inspect(input)},text=JSON.stringify(record,null,2);if(new TextEncoder().encode(text).length>maxBytes)fail('계산서 파일은 256 KiB 이하여야 합니다.');return text;}
 function parse(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes)fail('256 KiB 이하의 계산서 JSON 파일을 선택하세요.');let record;try{record=JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('계산서 JSON 파일을 읽지 못했습니다.');}keys(record,['format','version','input'],'계산서 파일');if(record.format!==format||record.version!==version)fail('지원하지 않는 계산서 파일 형식 또는 버전입니다.');return inspect(record.input);}
 return {format,version,maxBytes,inspect,serialize,parse};
})();
