/* Field identities, not symbol matching, keep q, gamma and stiffness meanings local. */
const LearningTerms={
 waterDepth:['수위의 깊이','지표에서 지하수면까지 아래 방향으로 잰 거리(m)입니다. 숫자가 작아질수록 수면은 높아집니다. 정수압 상태에서는 수면 아래의 물기둥 높이로 수압을 계산합니다.'],
 gammaMoist:['습윤 단위중량','흙입자와 현재 포함된 물의 총 무게를 흙 전체 부피로 나눈 값(kN/m³)입니다. 지하수면 위 자중 응력을 계산할 때 사용합니다.'],
 gammaSat:['포화 단위중량','간극이 모두 물로 찬 흙의 전체 단위중량(kN/m³)입니다. 유효응력의 자중 증가에는 물의 단위중량을 뺀 수중 단위중량 γ′=γsat−γw가 나타납니다.'],
 ll:['액성한계 LL','정해진 시험으로 정하는 소성 상태와 액성 상태의 경계 함수비(%)입니다. 실제 현장 함수비 w와 다릅니다. LL과 PL은 독립 시험값이며 PI=LL−PL입니다.'],
 pl:['소성한계 PL','정해진 시험에서 소성 상태의 아래 경계를 정하는 함수비(%)입니다. 숫자 0과 비소성(NP)은 같은 뜻이 아닙니다.'],
 phi:['유효마찰각 φ′','유효수직응력이 증가할 때 Mohr–Coulomb 전단저항이 커지는 비율을 tanφ′로 나타내는 각도(°)입니다. 흙의 현재 사면각이나 파괴면 각도 자체가 아닙니다.'],
 cohesion:['유효점착력 c′','Mohr–Coulomb 유효응력 포락선의 전단응력축 절편(kPa)입니다. 지정한 응력 범위의 강도정수이며 비배수강도 su와 서로 바꾸어 쓰지 않습니다.'],
 mv:['체적압축계수 mv','횡변형을 구속한 1D 조건의 압축변형률 증가를 유효응력 증가로 나눈 값(1/kPa)입니다. 값이 클수록 같은 하중에서 많이 눌립니다. cv=k/(mvγw)이므로 압밀 속도에도 연결됩니다.'],
 cc:['압축지수 Cc','간극비 e–log₁₀σ′ 곡선의 처녀압축 구간 기울기 크기입니다. 무차원이며 압축변형률을 바로 뜻하지 않습니다. 간극비 변화와 층두께로 침하량을 환산합니다.'],
 cr:['재압축·팽창지수 Cr','선행압밀응력 안에서 제하·재재하할 때 e–log₁₀σ′ 경로의 기울기 크기입니다. 현재 실험에서는 같은 Cr로 제하와 재재하를 나타내는 단순화를 씁니다.'],
 e0:['초기 간극비 e₀','간극 부피를 흙입자 부피로 나눈 비입니다. 전체 부피로 나눈 공극률 n과 다릅니다. n=e/(1+e)이며 포화 여부 자체를 나타내지 않습니다.'],
 velocity:['전단파속도 Vs','작은 변형에서 전단파가 전파되는 속도(m/s)입니다. 질량밀도 ρ와 Gmax=ρVs²로 연결되며 큰 변형에서의 강성이나 강도와 동일하지 않습니다.'],
 nkt:['콘 상관계수 Nkt','su=(qt−σv0)/Nkt에서 콘 순저항을 비배수강도로 환산하는 경험계수입니다. 시험의 보정값이 아니며 지반과 선택한 강도 정의에 따라 달라집니다.'],
 ocr:['과압밀비 OCR','과거 최대 유효응력인 선행압밀응력을 현재 유효응력으로 나눈 비입니다. 현재 응력이력의 지표이며, 단순히 오래된 흙이라는 뜻은 아닙니다.']
};
const ModuleTerms={
 slope:{circularPhi:['유효마찰각 φ′','유효 법선력이 전단저항으로 기여하는 비율을 tanφ′로 나타냅니다. 사면각 β와 활동면 접선각 α는 별개의 값입니다.'],circularCohesion:['유효점착력 c′','Mohr–Coulomb 저항의 절편(kPa)입니다. 여기서는 각 절편 저면 길이 ℓ에 곱해 c′ℓ의 저항을 더합니다. 크기를 키울수록 얇은 끝 절편에서 인장 법선력이 발생할 수 있어 인장균열 모형이 필요해집니다.'],circularRu:['지정 간극수압비 rᵤ','현재 모형은 절편의 평균 연직 자중응력 W/b에 rᵤ를 곱해 바닥 수압 u를 정합니다. 0은 수압 없음입니다. 지하수위나 침투 해석 결과를 자동 환산한 값이 아닙니다.'],circularSlices:['수직 절편의 개수','활동 토체를 수직 띠로 나누는 개수입니다. 사면 어깨를 반드시 절편 경계로 두고 각 면적에서 중량을 계산합니다. 값을 늘려 수치 변화를 확인할 수 있지만 인장력 등 모형의 한계를 해소하지는 않습니다.']},
 soil:{fines:['세립분 함량','건조질량 중 0.075 mm 체를 통과하는 비율입니다. 점토 입자 함량이나 소성을 곧바로 뜻하지 않습니다.'],gravelShare:['조립분 중 자갈','세립분을 제외한 조립분 중 4.75 mm 이상 입자의 비율입니다. 전체 시료 중 자갈 비율과 분모가 다릅니다.']},
 stress:{surcharge:['넓은 상재압 q','지표에 넓게 작용하는 추가 압력(kPa)입니다. 여기서는 깊이에 따라 일정하게 전응력에 더하고, 배수 완료 정수압을 적용합니다. 재하 직후의 과잉수압은 압밀 실험에서 봅니다.'],depth:['관찰 깊이 z','현재 분포를 읽는 지표 아래 깊이(m)입니다. 관찰 위치를 바꾸며 같은 지층을 탐색합니다. 비교할 때도 두 상태의 같은 깊이를 읽습니다.']},
 foundation:{modulus:['Young 탄성계수 E','선형 탄성 반공간 모형의 변형 강성(kPa)입니다. 같은 접지압에서는 E가 커질수록 계산 침하가 작아집니다. 전단강도·극한지지력·1D 구속계수 M과 구별합니다.'],pressure:['접지압 q','현재 기초 저면의 평균 작용압력 Q/A(kPa)입니다. q 고정과 총하중 Q 고정은 폭을 바꿀 때 서로 다른 비교가 됩니다.'],load:['총하중 Q','기초 저면으로 전달되는 전체 연직하중(kN)입니다. 이 실험의 입력은 이미 기초에 전달된 값으로, 자중을 자동 가산하지 않습니다.'],gamma:['흙의 단위중량 γ','흙의 단위 부피당 무게(kN/m³)입니다. 이 건조 지표기초의 지지력식에서 자중 기여 항 ½γBNγsγ에 쓰입니다.']},
 'layered-settlement':{m1:['상부층 구속계수 M₁','횡방향 변형을 구속한 1D 조건에서 유효응력 증가/연직변형률입니다. M=1/mv. 화면은 MPa로 입력하며 계산 시 1 MPa=1000 kPa로 환산합니다.'],m2:['하부층 구속계수 M₂','상부층과 같은 정의의 1D 구속계수입니다. Young 탄성계수 E를 그대로 대신 입력하는 계수가 아닙니다. 하나의 총침하로 M₁과 M₂를 동시에 유일하게 정할 수 없습니다.']},
 'pile-lateral':{soilModulus:['말뚝 길이당 지반계수 kℓ','말뚝 단위 길이당 횡반력 p(kN/m)를 횡변위 w(m)로 나눈 값(kN/m²)입니다. 면적당 반력을 쓰는 기초 지반반력계수 kN/m³와 단위가 다릅니다.'],EI:['휨강성 EI','말뚝 재료의 탄성계수 E와 단면2차모멘트 I의 곱입니다. 재료만 아니라 단면 형상도 함께 반영합니다. 화면의 MN·m²를 내부에서 kN·m²로 환산합니다.']},
 'dynamic-layer':{strain:['전단변형률 γ','전단변형의 크기를 백분율로 입력합니다. 0.05%=0.0005이며 흙의 단위중량에도 사용하는 기호 γ와 문맥·단위가 다릅니다.'],density:['질량밀도 ρ','전체 부피당 질량(kg/m³)입니다. 단위중량 γ(kN/m³)와 다릅니다. G=ρVs²는 SI로 Pa를 얻은 뒤 kPa로 변환합니다.']},
 'triaxial-drainage':{deviator:['편차응력 q','삼축시험에서 축방향과 구속방향 주응력의 차 σ₁−σ₃(kPa)입니다. 기초의 평균 접지압 기호 q와 뜻이 다릅니다.']},
};
function learningTerm(field){return ModuleTerms[state.active]?.[field]||LearningTerms[field]||null;}
function glossaryButton(field){const term=learningTerm(field);return term?`<button type="button" class="term-help" data-glossary="${esc(field)}" aria-label="${esc(term[0])} 뜻 보기">?</button>`:'';}
function installLearningHelp(){
 const dialog=document.createElement('dialog');dialog.id='term-dialog';dialog.className='term-dialog';dialog.setAttribute('aria-labelledby','term-title');dialog.innerHTML='<header><h2 id="term-title"></h2><button type="button" data-close-term aria-label="용어 도움 닫기">닫기</button></header><p id="term-definition"></p><p class="term-unit-note">단위 확인: 1 kPa = 1 kN/m² · 1 MPa = 1000 kPa</p>';document.body.append(dialog);let trigger=null;
 document.addEventListener('click',e=>{const button=e.target.closest('[data-glossary]');if(!button)return;const term=learningTerm(button.dataset.glossary);if(!term)return;trigger=button;$('term-title').textContent=term[0];$('term-definition').textContent=term[1];dialog.showModal();});
 dialog.querySelector('[data-close-term]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus();});
}
