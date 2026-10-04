const DomesticReferenceMap={
 soil:[['KDS 11 10 10','지반조사 · 시험과 분류의 맥락']],consistency:[['KDS 11 10 10','지반조사 · 시험조건']],compaction:[['KDS 11 30 05','연약지반 설계 일반']],
 'spt-corrections':[['KDS 11 10 10','지반조사']], 'cpt-interpretation':[['KDS 11 10 10','지반조사']],
 'layered-settlement':[['KDS 11 10 15','지반계측'],['KDS 11 50 05','얕은기초']],
 'vertical-drains':[['KDS 11 30 05','연약지반 설계 일반']],preloading:[['KDS 11 30 05','연약지반 설계 일반']], 'composite-ground':[['KDS 11 30 05','연약지반 설계 일반']],
 foundation:[['KDS 11 50 05','얕은기초']], 'foundation-compatibility':[['KDS 11 50 05','얕은기초']], 'footing-ledger':[['KDS 11 50 05','얕은기초']], 'footing-contact':[['KDS 11 50 05','얕은기초']], 'bearing-conditions':[['KDS 11 50 05','얕은기초']],
 'pile-axial':[['KDS 11 50 15','깊은기초']], 'pile-group':[['KDS 11 50 15','깊은기초']], 'pile-lateral':[['KDS 11 50 15','깊은기초']],
 excavation:[['KDS 21 30 00','가설흙막이']], 'excavation-base':[['KDS 21 30 00','가설흙막이']], 'gravity-wall':[['KDS 11 80 05','콘크리트옹벽']], 'earth-pressure':[['KDS 11 80 05','콘크리트옹벽']], slope:[['KDS 11 70 05','쌓기·깎기']], 'liquefaction-ratio':[['KDS 11 50 25','기초내진']]
};
function renderReferenceGuide(){
 const links=DomesticReferenceMap[state.active];if(!links)return;
 $('method-content').insertAdjacentHTML('beforeend',`<section class="reference-context"><h3>국내 기준에서 이어보기</h3><p>${links.map(([code,label])=>`<a href="https://www.kcsc.re.kr/standardCode/viewer/${encodeURIComponent(code)}" target="_blank" rel="noopener">${code} · ${label}</a>`).join('<br>')}</p><p>위 계산의 직접 근거는 각 원문과 모형 설명입니다. 이 링크는 국내 기준의 관련 내용을 찾는 연결이며, 현재 화면이 해당 기준의 모든 설계 검토를 수행한다는 뜻은 아닙니다. 적용 판본·시설물 조건은 원문에서 확인할 수 있습니다.</p></section>`);
}
