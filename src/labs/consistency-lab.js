/* Definitions only; the application supplies HTML helpers and manages state. */
const ConsistencyLabs = [{
  key:'consistency',
  meta:{name:'함수비와 연경도',sub:'지수와 현재 상태',group:'흙의 성질 / 연경도',navGroup:'properties',words:'자연함수비 함수비 연경도 액성지수 연경지수 liquidity consistency w ll pl pi li ic 수축한계',questions:[['consistency','함수비와 한계']]},
  defaults:{w:35,ll:50,pl:20,np:false},
  bounds:{},
  labels:{w:['자연함수비 w','%'],ll:['액성한계 LL','%'],pl:['소성한계 PL','%'],np:['비소성 NP','']},
  compute(data){return SoilInputs.consistency(data);},
  controls(d){
    return '<p class="parameter-note">w는 지금의 물 함량, LL·PL은 시험으로 얻는 흙의 지수입니다. 세 값을 함께 바꾸며 상대 위치를 비교하세요.</p>'+
      fieldControl('w','자연함수비 w',d.w,0,100,1,'%','물 질량 / 건조토 질량 × 100 · 100%를 넘을 수도 있습니다.',1,true)+
      `<fieldset class="parameter-grid" style="border:0;padding:0;margin:0" ${d.np?'disabled':''}><legend class="sr-only">연경도 시험값</legend>`+
      fieldControl('ll','액성한계 LL',d.ll,0,100,1,'%','소성 상태에서 액체 상태로 넘어가는 지수시험 경계.',1,true)+
      fieldControl('pl','소성한계 PL',d.pl,0,100,1,'%','소성 상태의 아래 경계. LL보다 클 수 없습니다.',1,true)+
      '</fieldset>'+`<label class="check"><input type="checkbox" data-field="np" ${d.np?'checked':''}>비소성(NP) 시료</label>`;
  },
  render({data:d,result:r,baseline:b,baselineData}){
    let chart='';
    if(r.status==='nonplastic'){
      chart=svgWrap(`<rect x="65" y="60" width="520" height="210" rx="12" fill="#F2F4F7"/><text x="325" y="115" text-anchor="middle" fill="#243D45" font-size="22" font-weight="700">비소성(NP)</text><text x="325" y="157" text-anchor="middle" fill="#475467" font-size="15">자연함수비 w = ${fmt(d.w)}%</text><text x="325" y="195" text-anchor="middle" fill="#475467" font-size="14">소성 구간과 LI·Ic를 정의하지 않습니다.</text><text x="325" y="225" text-anchor="middle" fill="#475467" font-size="13">NP를 소성도표의 임의의 점으로 바꾸지 않습니다.</text>`,'비소성 시료: 액성지수와 연경지수는 정의하지 않음');
    }else if(r.status==='undefined'){
      chart=svgWrap(`<rect x="65" y="60" width="520" height="210" rx="12" fill="#FFF7E6"/><text x="325" y="118" text-anchor="middle" fill="#805600" font-size="21" font-weight="700">LL = PL · PI = 0</text><text x="325" y="164" text-anchor="middle" fill="#475467" font-size="15">LI = (w − PL) / PI</text><text x="325" y="202" text-anchor="middle" fill="#475467" font-size="14">분모가 0이므로 LI·Ic를 계산할 수 없습니다.</text><text x="325" y="235" text-anchor="middle" fill="#475467" font-size="13">시험 결과의 보고 방식과 NP 여부를 확인하세요.</text>`,'소성지수 0: 분모가 0이므로 연경도 지수를 계산할 수 없음');
    }else{
      const maximum=Math.max(80,d.w,d.ll,d.pl,...(b?.status==='computed'?[baselineData.w,baselineData.ll,baselineData.pl]:[]));
      const padded=maximum<Number.MAX_VALUE/1.2?maximum*1.2:maximum;
      const xmax=padded<1e10?Math.ceil(padded/20)*20:padded;
      const x=v=>60+530*(v/xmax), xp=x(d.pl),xl=x(d.ll),xw=x(d.w);
      let body='<text x="60" y="32" fill="#475467" font-size="14">함수비 축 · 시험 한계에 대한 현재 위치</text>';
      body+=`<rect x="60" y="105" width="${xp-60}" height="54" fill="#D0D5DD"/><rect x="${xp}" y="105" width="${xl-xp}" height="54" fill="#ADD8CD"/><rect x="${xl}" y="105" width="${590-xl}" height="54" fill="#D5E8F8"/>`;
      body+=`<path d="M${xp} 98V189M${xl} 98V224" stroke="#475467" stroke-width="1.5" stroke-dasharray="4 4"/><text x="${xp}" y="204" text-anchor="middle" fill="#344054" font-size="13">PL ${fmt(d.pl,0)}%</text><text x="${xl}" y="240" text-anchor="middle" fill="#344054" font-size="13">LL ${fmt(d.ll,0)}%</text>`;
      body+=`<path d="M${xw} 82V173" stroke="var(--color-action-primary)" stroke-width="3"/><circle cx="${xw}" cy="82" r="6" fill="var(--color-action-primary)"/><text x="${Math.max(106,Math.min(544,xw))}" y="63" text-anchor="middle" fill="var(--color-action-primary)" font-size="15" font-weight="700">w ${fmt(d.w)}%</text>`;
      for(let i=0;i<=4;i++){const v=xmax*i/4,xx=x(v);body+=`<path d="M${xx} 160v7" stroke="#98A2B3"/><text x="${xx}" y="183" fill="#667085" font-size="11" text-anchor="middle">${fmt(v,0)}</text>`;}
      if(b?.status==='computed'){
        const bx=x(baselineData.w);body+=`<path d="M${bx} 96V159" stroke="var(--color-text-muted)" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${bx}" cy="96" r="5" fill="white" stroke="var(--color-text-muted)" stroke-width="2"/>`;
        body+=`<text x="60" y="272" fill="var(--color-text-muted)" font-size="12">기준 w ${fmt(baselineData.w)}% · PL ${fmt(baselineData.pl)}% · LL ${fmt(baselineData.ll)}%</text>`;
      }
      body+='<rect x="60" y="292" width="12" height="12" rx="2" fill="#D0D5DD"/><text x="79" y="303" fill="#475467" font-size="12">PL 이하 · SL 없이는 세분 불가</text><rect x="293" y="292" width="12" height="12" rx="2" fill="#ADD8CD"/><text x="312" y="303" fill="#475467" font-size="12">소성 구간</text><rect x="454" y="292" width="12" height="12" rx="2" fill="#D5E8F8"/><text x="473" y="303" fill="#475467" font-size="12">LL 초과</text>';
      chart=svgWrap(body,`자연함수비 ${fmt(d.w)}%, 소성한계 ${fmt(d.pl)}%, 액성한계 ${fmt(d.ll)}%, ${r.stateLabel}`);
    }
    const defined=r.status==='computed';
    const results=metric('액성지수 LI',defined?r.li:'정의 불가','',b?.li??null,true,2)+metric('연경지수 Ic',defined?r.ic:'정의 불가','',b?.ic??null,false,2)+metric('소성지수 PI',r.pi??'NP',r.pi===null?'':'%p',b?.pi??null);
    const explanation=`<strong>${esc(r.stateLabel)}</strong><br>`+(defined?`LI는 PL에서 0, LL에서 1입니다. 현재 w는 소성 구간 길이의 ${fmt(r.li*100)}% 위치에 있습니다. LI + Ic = 1이며, 범위 밖에서는 음수나 1보다 큰 값도 의미가 있습니다.`:esc(r.notes.at(-1)))+'<span class="hint">자연함수비만 바꾸어도 상태는 달라지지만, 같은 입도·LL·PL을 가진 흙의 USCS 기호는 바뀌지 않습니다.</span>'+(r.state==='below-pl'?'<span class="notice">수축한계 SL을 입력하지 않았으므로 고체·반고체를 단정하지 않습니다.</span>':'');
    const theory=`<div class="theory-grid"><div><div class="theory-formula">PI = LL − PL<br>LI = (w − PL) / PI<br>Ic = (LL − w) / PI = 1 − LI</div><p>${defined?`PI = ${fmt(d.ll)} − ${fmt(d.pl)} = ${fmt(r.pi)}%p<br>LI = (${fmt(d.w)} − ${fmt(d.pl)}) / ${fmt(r.pi)} = ${fmt(r.li,2)}`:'NP 또는 PI=0에서는 LI·Ic의 수치 대입을 하지 않습니다.'}</p></div><div class="theory-meta"><strong>변수의 역할</strong><p>w 증가 → LI 증가, Ic 감소.<br>LL·PL을 바꾸면 기준 구간도 바뀌므로 w만 바꾼 경우와 구분합니다.</p><p>함수비의 %와 LI·Ic의 무차원을 구분하세요.</p></div></div>`;
    const method='<h3>시험값과 현재 상태를 분리해서 읽기</h3><p>w = 물 질량 / 건조토 질량 × 100입니다. 함수비 100%는 물과 건조토의 질량이 같다는 뜻이며, 포화도 100%와 다릅니다. LL·PL은 재성형한 No.40 체(0.425 mm) 통과분을 시험하여 구하는 지수입니다.</p><p>LI=0은 w=PL, LI=1은 w=LL입니다. 이 도구는 w의 상대 위치를 보여주며 LI를 강도·침하·압밀이력으로 직접 환산하지 않습니다. 조립분이 많은 시료에서는 전체 시료 함수비와 세립 성분의 상태가 동일하다고 단정할 수 없습니다.</p><h3>범위와 출처</h3><p>수축한계 SL, 액성한계 시험 회수별 유동곡선, 낙하콘법 간 환산은 이 실험에서 계산하지 않습니다. LI·Ic에는 %끼리의 차이를 사용하므로 백분율 단위는 약분됩니다.</p><p><a href="https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi16072.pdf" target="_blank" rel="noopener">FHWA GEC 5 · §4.8.4, 식 4.12–4.15</a><br><a href="https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05a.cfm" target="_blank" rel="noopener">FHWA · Atterberg 한계와 함수 상태</a></p>';
    return {title:'같은 흙도 물이 늘면 상태가 얼마나 달라질까요?',conditions:['자연함수비와 재성형 지수시험의 비교','수축한계 SL 미입력','강도·USCS 자동 환산 없음'],plotTitle:'현재 함수비와 소성 구간',legend:'<span class="legend-item"><i></i>현재 w</span>'+(b?.status==='computed'?'<span class="legend-item"><i class="dashed"></i>기준 w</span>':''),chart,results,explanation,theory,method};
  },
}];
