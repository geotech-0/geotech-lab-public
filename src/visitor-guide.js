/* The introduction has its own preference; experiment and cloud data stay separate. */
const VISITOR_LANGUAGE_KEY='geotech-lab-intro-language-v1';
const VisitorExamples=Object.freeze({
 excavation:Object.freeze({module:'excavation',question:'construction'}),
 settlement:Object.freeze({module:'layered-settlement',question:'observation'})
});
function visitorLanguagePreference(storage){
 let language='en';
 try{if(storage?.getItem(VISITOR_LANGUAGE_KEY)==='ko')language='ko';}catch{}
 return {get:()=>language,set(value){
  if(!['en','ko'].includes(value))return language;
  language=value;try{storage?.setItem(VISITOR_LANGUAGE_KEY,value);}catch{}
  return language;
 }};
}
function visitorGuideMarkup(language){
 const ko=language==='ko';
 return `<div class="visitor-heading"><p class="visitor-kicker">GEOTECH LAB <span>흙의 감각</span></p><h1 id="visitor-title">${ko?'입력에서 지반의 반응까지':'From inputs to ground response'}</h1><p class="visitor-lead">${ko?'지반공학의 가정을 바꾸고, 계산 결과를 비교하며, 계측으로 알 수 있는 것과 없는 것을 살펴보는 학습 도구입니다.':'An interactive learning tool for geotechnical engineering. Change assumptions, compare model responses, and explore what monitoring can—and cannot—tell us.'}</p><p class="visitor-language-note">${ko?'상세 실험·입력·계산 근거는 기존 한국어 화면으로 제공됩니다.':'The introduction is in English. Detailed labs, controls and calculation notes are in Korean.'}</p></div>
 <div class="visitor-examples" aria-label="${ko?'대표 실험':'Featured examples'}">
  <article class="visitor-example visitor-example-primary"><div class="visitor-example-top"><span>01 / ${ko?'시공과정':'CONSTRUCTION SEQUENCE'}</span><span class="visitor-chip">${ko?'대표 예제':'Main example'}</span></div><h2>${ko?'단계별 굴착과 지보':'Staged excavation and support'}</h2><p>${ko?'굴착, 지보 설치, 긴장과 제거 순서에 따라 벽의 변위·모멘트·지보력이 어떻게 달라지는지 비교하세요.':'Compare wall displacement, bending moment and support force as excavation, support installation, prestressing and removal proceed.'}</p><div class="visitor-sequence" aria-label="${ko?'시공단계 예시':'Example construction sequence'}"><span>${ko?'굴착':'Excavate'}</span><b aria-hidden="true">→</b><span>${ko?'지보 설치':'Install support'}</span><b aria-hidden="true">→</b><span>${ko?'추가 굴착':'Excavate further'}</span></div><p class="visitor-limit">${ko?'보·스프링 학습 모형 · 시공 이력 반영 · 현장 검증 아님':'Beam–spring learning model · construction history · not field validation'}</p><button type="button" data-visitor-example="excavation">${ko?'흙막이 실험 열기':'Explore excavation'} <span aria-hidden="true">↗</span></button></article>
  <article class="visitor-example"><div class="visitor-example-top"><span>02 / ${ko?'역산의 비유일성':'INVERSE NON-UNIQUENESS'}</span><span class="visitor-chip">${ko?'두 번째 예제':'Second example'}</span></div><h2>${ko?'층별 침하와 역산':'Layered settlement inverse problem'}</h2><p>${ko?'한 개의 지표 침하값으로 두 층의 강성을 정할 수 있을까요? 관측값과 일치하는 여러 구속계수 조합을 살펴보세요.':'Can one surface settlement measurement determine two layer stiffnesses? Explore different constrained-modulus pairs that reproduce the same observation.'}</p><div class="visitor-formula" aria-label="${ko?'침하식':'Settlement equation'}">s = Δσ′ (H₁/M₁ + H₂/M₂)</div><p class="visitor-limit">${ko?'넓은 재하 · 배수 완료 · 층별 일정 M · 비유일한 역산':'Wide loading · drained response · constant M in each layer · non-unique inverse solution'}</p><button type="button" data-visitor-example="settlement">${ko?'층별 침하 실험 열기':'Explore settlement'} <span aria-hidden="true">↗</span></button></article>
 </div>
 <div class="visitor-bottom"><div><h2>${ko?'가정을 확인하고 직접 비교하세요':'Inspect the assumptions, then experiment'}</h2><p>${ko?'대표 예제의 기본 입력은 학습용 가정입니다. 각 실험의 계산 과정과 근거에서 식·제약·출처를 확인하세요. 저장한 입력이 있으면 그대로 이어집니다.':'Featured examples start with assumed learning inputs. Each lab includes equations, limitations and sources. Existing saved inputs are preserved when opening a lab.'}</p><p>${ko?'언어 선택은 이 브라우저에 저장됩니다.':'Your introduction language is remembered in this browser.'}</p></div><button type="button" data-visitor-continue>${ko?'한국어 실험실 계속하기':'Open all labs · 한국어'}</button></div>`;
}
function installVisitorGuide({openExample,document:doc=document,storage,location:route=globalThis.location}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 const preference=visitorLanguagePreference(storage),guide=doc.getElementById('visitor-guide'),workspace=doc.getElementById('lab-workspace'),languages=doc.getElementById('visitor-language'),guideButton=doc.getElementById('visitor-guide-open'),note=doc.getElementById('visitor-lab-note'),main=doc.getElementById('main'),skip=doc.querySelector('.skip');
 let open=false;
 const paint=()=>{
  const language=preference.get();guide.lang=language;guide.innerHTML=visitorGuideMarkup(language);
  for(const button of languages.querySelectorAll('[data-visitor-language]'))button.setAttribute('aria-pressed',String(button.dataset.visitorLanguage===language));
  guideButton.textContent=language==='ko'?'소개':'Guide';guideButton.lang=language;
 };
 const show=(visible,focus=false,showLabs=false)=>{
  // Keep a worksheet route intact while reading the guide; examples explicitly open labs.
  if(showLabs&&route?.hash==='#worksheet')route.hash='learn';
  const worksheet=doc.getElementById('worksheet-root'),inWorksheet=!!worksheet&&route?.hash==='#worksheet',content=inWorksheet?worksheet:main;
  open=visible;guide.hidden=!visible;workspace.hidden=visible||inWorksheet;note.hidden=visible||preference.get()==='ko';
  if(worksheet)worksheet.hidden=visible||!inWorksheet;
  doc.documentElement.lang=visible?preference.get():'ko';
  doc.documentElement.dataset.visitorView=visible?'guide':'lab';
  doc.title=visible?(preference.get()==='ko'?'흙의 감각 — 지반공학 실험실':'Geotech Lab — Interactive geotechnical models'):'흙의 감각 — 지반공학 실험실';
  skip.href=visible?'#visitor-guide':inWorksheet?'#worksheet-root':'#main';skip.textContent=visible&&preference.get()==='en'?'Skip to introduction':inWorksheet?'계산서로 바로가기':'실험으로 바로가기';
  if(focus)(visible?guide:content).focus({preventScroll:true});
 };
 languages.addEventListener('click',event=>{
  const button=event.target.closest('[data-visitor-language]');if(!button)return;
  preference.set(button.dataset.visitorLanguage);paint();show(preference.get()==='en',true);
 });
 guide.addEventListener('click',event=>{
  const example=event.target.closest('[data-visitor-example]');
  if(example&&VisitorExamples[example.dataset.visitorExample]){show(false,false,true);openExample(VisitorExamples[example.dataset.visitorExample]);main.focus({preventScroll:true});return;}
  if(event.target.closest('[data-visitor-continue]'))show(false,true,true);
 });
 guideButton.addEventListener('click',()=>show(true,true));
 note.addEventListener('click',event=>{if(event.target.closest('[data-visitor-guide]'))show(true,true);});
 paint();languages.hidden=false;guideButton.hidden=false;show(preference.get()==='en');
 return {isOpen:()=>open,showGuide:()=>show(true,true)};
}
