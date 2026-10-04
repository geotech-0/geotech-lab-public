# 분류 입력과 함수 상태의 연결

작성: 2026-09-22. 이 모듈은 분류 1장의 입력·물리적 의미를 연결한다. USCS 판정 자체는 기존 `Soil` 모듈에 남긴다. AASHTO·유기질 판정·체가름 시험 전처리 전체를 구현했다고 해석하지 않는다.

## 1. API

`SoilInputs.generateCurve({fines,gravelShare,gradation})`는 작은 입경부터 정렬된 `{size,passing}[]`를 반환한다. 입경 단위는 mm, 통과율은 건조질량 %다. `fines`는 0.075 mm 통과율 0~100%, `gravelShare`는 **조립분 중** 4.75 mm에 남는 자갈의 비율 0~100%다. 전체 시료의 자갈 함량이 아니다.

- 전체 자갈 % = `(100 − fines) × gravelShare / 100`
- 전체 모래 % = `(100 − fines) × (1 − gravelShare / 100)`
- `gradation`: `broad`(넓은 분포), `uniform`(좁은 분포), `gap`(일부 구간 결손)
- 분포 이름은 생성 방식이다. `broad`를 USCS의 W, `uniform`을 P로 강제하지 않는다. 최종 분류는 계산된 Cu·Cc와 세립분 정보로 따로 정한다.
- 합성 점은 0.075–63 mm에만 존재한다. #200보다 작은 입경은 만들어 넣지 않는다. 세립분 10% 초과 시 D10 정보가 없을 수 있으며 외삽하지 않는다.
- 75 mm 미만 시료를 100%로 정규화한 교육용 자료다. 63–75 mm의 상단 구간 질량은 생성 예제에서 0이며, 사용자가 실제 잔류질량을 입력할 수 있다.
- 기존 기본 모래 예제(fines=8, gravelShare=0, broad)는 기존 0.075–19 mm 통과율을 보존하며 LL=32, PL=22일 때 SW-SC다.

`retainedToPassing(rows)`의 입력은 큰 체부터 작은 체 순서의 `{size,mass}`와 마지막 `{size:null,mass}` 받침접시(pan)다. 질량은 모두 같은 단위를 써야 한다. 반환값: `{valid,errors,totalMass,rows,points,panOpening,panPercent}`. 반환 rows에는 `retainedPercent`, `cumulativeRetained`, `passing`을 추가한다. 받침접시의 `passing`은 null이다. **pan 자체를 0 mm 입경의 점으로 그리지 않는다.** `panOpening`은 실제 최소 체눈이다. 0.05 mm 체 아래 팬의 비율을 0.075 mm 통과 세립분과 같다고 표시하지 않는다.

계산식은 `M = Σmᵢ`, `Rᵢ = 100 mᵢ/M`, `Pᵢ = 100 − Σⱼ≤ᵢRⱼ`다. 질량 미입력은 0이 아니다. 0 잔류질량은 허용하되 총 질량 0, 음수·비수치·무한 값, 순서 오류·중복 체·pan 누락은 오류다. 시료손실 보정은 하지 않으며, 계량 질량과 별도의 시험 전 총질량을 비교하는 기능은 후속 범위다. 세립분을 정량할 실제 세척·분산·체가름 시험 절차를 대체하지 않는다.

`passingToRetained(points,totalMass=1000)`는 오름차순 누적 통과율을 질량으로 역환산하여 같은 반환 형식으로 제공한다. 최대 체의 통과율이 100 미만이어도 허용하며 상단 체 잔류질량에 보존한다. 예제에서 역환산한 질량도 **합성 자료**이며 측정값이 되지 않는다. 최소 체 아래의 질량은 pan으로 모이며 더 작은 입경 분포를 추정하지 않는다.

화면의 체분석 환산은 `sieveMassFromPassing(points,totalMass=1000)`를 사용한다. 전체 원자료의 유효성을 먼저 확인하고 0.075 mm 이상 체와 팬으로 변환한다. 해당 입경의 점이 없으면 양쪽 점의 로그 입경으로 보간하며 외삽하지 않는다. 반환값 `boundaryInterpolated`, `boundarySources`, `discardedFinePointCount`로 보간 여부와 팬으로 합쳐지는 자료를 밝힌다. 원자료 모드의 선택 입력 옆과 환산 미리보기에서 이를 설명하며, 미리보기만 열어서는 원자료를 바꾸지 않는다. 질량 편집이나 모드 변경 후 되돌리기는 원래 세부점을 복구한다.

예를 들어 0.05 mm 통과 5%, 0.1 mm 통과 10%이면 0.075 mm 통과율은 `5 + 5 ln(0.075/0.05)/ln(0.1/0.05) = 7.9248125…%`다. 환산 후에도 이 비율을 유지한다. 0.075 mm 미만의 분포 세부는 팬 질량만으로 보존할 수 없으므로 해당 구간의 D10이나 입도계수가 필요한 분류는 정보 부족으로 바뀔 수 있다. 세립분 비율 보존과 모든 입도정보 보존을 구별한다.

통과율 직접 입력·질량 입력 모두 `0 < 입경 < 75 mm`를 적용한다. 범위 밖 시료를 조용히 제외하거나 재정규화하지 않는다. 5·12·50% 경계와 자갈/모래 동률에는 기존 계수·소성 판정과 같은 `1e-10` 수치 허용오차를 적용한다. 질량 단위를 바꿀 때 생기는 부동소수점 흔들림만 흡수하며, 시험 오차나 공학적 허용 범위를 뜻하지 않는다. 소성도표의 전체 흙/세립분 표시도 같은 경계를 사용한다.

`consistency({w,ll,pl,np=false})`는 `{valid,errors,status,pi,li,ic,state,stateLabel,notes,w,ll,pl}`를 반환한다. 함수비 w·LL·PL은 건조토 질량 기준 %다. LI·Ic는 무차원이며 PI는 함수비의 차(%p)다. 유효 비소성 입력에서 NP는 `status:'nonplastic'`, 지수 null을 반환한다. `LL=PL`이면 PI=0이나 LI·Ic는 `status:'undefined'`, null이다. `PL>LL`은 오류다.

## 2. 학습 화면

`ConsistencyLabs`는 `consistency` 한 개 실험을 제공한다. w·LL·PL 슬라이더를 함께 보여주고, 가로 함수비 축에서 현재 w와 PL·LL 위치를 표시한다. 질문 문구만 달라지는 탭은 만들지 않는다.

- w 변화: 현재 상태만 변화. 입도·LL·PL·유기질 상태가 같다면 USCS는 동일.
- LL·PL 변화: 지수 구간과 PI가 바뀜. w 변화와 같은 실험이 아님.
- w=PL: LI=0, Ic=1. w=LL: LI=1, Ic=0.
- w<PL: **소성한계 이하**. SL이 없으므로 고체·반고체를 구분하지 않음.
- PL<w<LL: 소성 범위. w>LL: 액성한계 초과.
- LI를 0~1로 자르지 않음. 함수비와 LL·PL은 100% 상한을 두지 않음.
- 지수시험은 재성형 No.40 통과분에 관한 것이다. 자연 구조, 응력이력, 포화도, 강도와 동일시하지 않음.
- 비교선은 기준 w만 표시하고 기준 PL·LL을 함께 기재한다. 기준 LI는 기준 자신의 한계로 계산한다.

## 3. 근거

1. [USBR R-90-4, Gradation Analysis of Soils Tests](https://www.usbr.gov/tsc/techreferences/rec/R9004.pdf), USBR 5325 §12.15–12.17: 개별 잔류질량과 누적질량에서 체별 통과질량·통과율을 계산하는 질량 보존 관계. 본 도구는 이 관계를 모든 입력 체에 동일하게 적용한다. 특정 표준의 모든 시험 절차를 구현하지는 않는다.
2. [FHWA NHI-16-072, GEC 5 Geotechnical Site Characterization](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi16072.pdf), §4.8.4, 식 4.12–4.15: PI, LI, consistency index 정의 및 PL·LL에서의 LI 경계. 원문 CI를 화면에서는 국내에서 사용하는 Ic 표기로 썼다.
3. [FHWA NHI-05-037 Chapter 5](https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05a.cfm), Table 5-21: LL·PL·SL의 구분, No.40 체 통과분 지수시험. 해당 페이지의 Commentary 중 PL을 solid의 upper bound로 단순 서술한 문장보다 같은 표의 명시적인 plastic/semi-solid 경계 및 SL solid/semi-solid 경계를 따른다.

공식 자료의 식과 정의를 재서술했으며 교재 그림이나 유료 기준 원문을 복제하지 않았다. 합성 입도 수치와 시각화는 본 도구에서 구성했다.

## 4. 검증 근거

`tests/soil-inputs.test.mjs`는 독립 손계산 예제, 경계, 무효 입력, 질량 보존을 검사한다.

- 500 g 시료의 19/4.75/0.425/0.075 mm/pan 잔류질량 50/100/200/100/50 g → 통과율 90/70/30/10%.
- 세립분 20%, 조립분 중 자갈 50% → 전체 세립분/모래/자갈 20/40/40%, #4 통과율 60%.
- w=35%, LL=50%, PL=20% → PI=30%p, LI=0.5, Ic=0.5.
- w=10/20/30/40/60, LL=40, PL=20 → LI=−0.5/0/0.5/1/2, Ic=1.5/1/0.5/0/−1.
- 합성 3종·혼합비 전역 조합, 질량 단위 변경, 역환산 왕복, 입력 불변성, NP·PI=0·누락·역전·이상값을 검사한다.

자동 검사는 위 수학 관계를 검증한다. 실제 실험실 시험 재현성이나 사용자 학습 효과를 검증한 것은 아니다.

최종 보강은 `tests/soil-sieve-conversion.test.mjs`에서 보간·자료 손실 고지·복원·범위 밖 파일 거부·팬 경계·질량 비례와 분류 경계 보존을 확인한다. 별도 300개 경계 왕복 대조는 `docs/verification/completion/soil-boundary-final.mjs`에 보존했다.
