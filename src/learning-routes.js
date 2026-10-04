/* Routes express distinct learning questions, not a second copy of each experiment. */
const ChartViewModules=new Set(['seepage','layered-seepage','excavation']);
function isChartViewModule(key){return ChartViewModules.has(key)||modules[key]?.displayOnly===true;}
function renderPlotViews(){
 updateRelationshipAction();
 const key=state.active,views=isChartViewModule(key)?(labRegistry[key]?.questionsFor?.(state.data[key])??modules[key].questions):[];
 const tabs=$('plot-tabs'),signature=JSON.stringify([key,views]);
 tabs.hidden=views.length===0;
 // Keep tab nodes stable when numeric input commits on pointer blur.
 if(tabs.dataset.signature!==signature){tabs.innerHTML=views.length?'<span class="view-label">그림에서 볼 값</span>'+views.map(([id,label])=>`<button type="button" class="view-tab" data-question="${id}">${esc(label)}</button>`).join(''):'';tabs.dataset.signature=signature;}
 tabs.querySelectorAll('[data-question]').forEach(button=>button.setAttribute('aria-pressed',String(state.question[key]===button.dataset.question)));
}
const ScenarioRoutes=[
 {pattern:/기초.*(?:넓히|넓어|넓게|폭.*(?:늘|증가))/i,key:'foundation',question:'pressure'},
 {pattern:/초기.*(?:수평|횡).*응력|정지.*토압|\bk[₀0]\b/i,key:'earth-pressure',question:'pressure',preset:{state:'rest'}},
];
function scenarioRoute(key,query){return ScenarioRoutes.find(route=>route.key===key&&route.pattern.test(query));}
const QuestionRoutes={
 'compression':[[/시험|정수.*읽|기울기/i,'reading'],[/이력|제하|재재하|선행압밀/i,'history']],
 'drained-evidence':[[/응력경로|경로|p[′']?[-–]q/i,'path'],[/체적|수축|팽창|첨두|조밀|느슨/i,'strain']],
 'soil-response':[[/팽윤|팽창|붕괴|침수/i,'wetting'],[/재성형|예민|일축/i,'remolding']],
 'preloading':[[/이력|효과|배수 완료/i,'preload'],[/시간|단계/i,'staged']],
 'consolidation':[[/2차|이차|크리프/i,'secondary'],[/1차|일차|배수|압밀|cv/i,'primary']],
 'shear-strength':[[/강성|할선|탄성|esec/i,'stiffness'],[/mohr|모어|포락선|전단강도|마찰각/i,'mohr']],
 'triaxial-drainage':[[/\bcu\b/i,'CU'],[/\bcd\b/i,'CD'],[/\buu\b/i,'UU']],
 'darcy':[[/변수위/i,'falling'],[/정수위|투수시험/i,'constant'],[/상향|한계동수|보일링/i,'upward'],[/유량|darcy/i,'flow']],
 'seepage':[[/수압/i,'pressure'],[/유선|등수두/i,'flow']],
 'layered-seepage':[[/수압/i,'pressure'],[/수두|등가/i,'head']],
 'stress-spread':[[/직사각|사각|중첩|인접/i,'rectangle'],[/점하중/i,'point'],[/원형/i,'circular']],
 'earth-pressure':[[/점착|인장균열|균열|cohes/i,'cohesive'],[/coulomb|쐐기|벽면마찰|배면경사/i,'wedge'],[/rankine|주동|정지|수동|ocr|토압/i,'pressure']],
 'excavation':[[/모멘트/i,'moment'],[/변위|굴착|앵커/i,'displacement']],
 'excavation-base':[[/부상|양압|슬래브/i,'uplift'],[/히빙|heave/i,'heave']],
 'bearing-conditions':[[/비배수|\bsu\b|φu/i,'undrained'],[/이론|meyerhof|vesic/i,'theories'],[/편심|근입|수위|형상/i,'conditions']],
 'pile-group':[[/침하|등가|압축층/i,'settlement'],[/저항|블록|군말뚝/i,'group']],
 'pile-axial':[[/실제|실측|재하시험|하중시험/i,'evidence'],[/부주면|중립|상대변위/i,'downdrag'],[/침하|하중전달|t-z|q-z/i,'transfer']],
 'pile-lateral':[[/모멘트/i,'moment'],[/수평|횡하중|두부|변위/i,'displacement']],
 'dynamic-layer':[[/강성|변형|감소/i,'strain'],[/파속|주기|vs|gmax/i,'waves']],
 'layered-settlement':[[/기초|유한|중심선/i,'footing'],[/계측|역해석|관측|비유일/i,'observation'],[/침하|층별|기여/i,'contribution']],
 'slope':[[/원호|bishop|비숍|비샵|fellenius|ordinary|절편|분할법|해석법/i,'circular'],[/약층/i,'weak-layer'],[/급속|수위저하|저하/i,'drawdown'],[/무한|경사|사면/i,'infinite']],
};
