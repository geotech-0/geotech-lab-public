# 조사값에서 정수로: SPT와 CPT

이 묶음은 계획 17의 핵심인 **측정 → 보정 → 정규화·상관식**을 다룬다. 조사계획·시추기록·시료 품질·기타 현장시험·통계적 대표값 선정 전체가 끝났다는 뜻은 아니다. 정수를 자동 추천하거나 실제 계산서의 지반정수를 확정하지 않는다.

등록 대상은 `spt-corrections`, `cpt-interpretation` 두 실험이며 `navGroup: practice`이다. 각 실험에는 질문이 하나만 있다. 입력값 종류 선택은 같은 숫자의 정의와 활성 계산 단계를 정한다. 같은 그림의 이름만 바꾸는 질문 탭을 만들지 않는다.

## 출처와 채택 범위

1. [FHWA-IF-02-034, Geotechnical Engineering Circular No. 5: Evaluation of Soil and Rock Properties (2002)](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/FHWA-IF-02-034.pdf), §4.4.2~4.4.3, 식 3, 인쇄 p.45. `N60 = Nmeas CE CB CS CR`의 곱셈 구조와 시험 N의 정의를 따른다. FHWA 공식 보관 문헌이며 현행 기준 적합성 판정이 아니다. 표의 조건별 계수 자동 선택은 구현하지 않는다.
2. [FHWA NHI-06-088, Soils and Foundations Reference Manual, Volume I (2006)](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06088.pdf), §3.7.1~3.7.2, 식 3-2~3-3, 인쇄 pp.3-55~3-57. 실측 에너지비의 60% 환산과 Peck et al. (1974) 상재 정규화식을 구별한다. 다른 정규화식이나 액상화용 세립분 보정은 추가하지 않는다.
3. [Robertson & Cabal, Guide to Cone Penetration Testing, 7th edition (2022)](https://www.cpt-robertson.com/PublicationsPDF/CPT-Guide-7th-Final-SMALL.pdf), p.23의 비등면적 수압 보정, pp.41~42의 비배수강도 상관식을 따른다. 저자의 공식 사이트에 공개된 원문을 확인했다. `Nkt=10~18`은 원문이 소개하는 전형적 범위를 학습 초깃값으로 사용한 것이며 특정 현장의 권장 범위가 아니다.

공식 문서와 저자 원문은 2026-09-22에 확인했다. N60의 절차 보정 구조와 CN의 상재 정규화는 별도로 출처를 표시한다. 서로 다른 이론의 같은 계수를 섞은 체계라고 표현하지 않는다.

## 순수 계산 API

`Investigation.spt(input)`

```js
{
  basis: 'raw', // 'raw' 측정 N 또는 'n60' 이미 시험 보정된 값
  reading: 20,
  energyRatio: 75, // %
  boreholeFactor: 1, rodFactor: 0.9, samplerFactor: 1,
  effectiveOverburden: 100 // kPa, 유효응력
}
```

- `raw`: 측정 N은 300 mm 완전 관입에 대한 정수. `energyOnly=N×ER/60`, `n60=energyOnly×CB×CR×CS`.
- `n60`: `n60=reading`. ER·CB·CR·CS의 값을 읽거나 다시 보정하지 않는다. 누락·null·NaN인 비활성 값도 해당 계산을 방해하지 않는다. `(N1)60` 입력은 지원하지 않는다.
- `p0=effectiveOverburden / 95.760517960678` (tsf).
- `CN=min[2, 0.77 log10(20/p0)]`, `n160=CN×n60`.
- `Investigation.overburdenFactor(σ′v0)`는 tsf 환산값, 상한 적용 전후 값, `capped`를 반환한다. CN 상한은 출처의 경험식에 포함된 제한이며 입력을 조용히 수정한 것이 아니다.
- 계산에 필요한 0<σ′v0<20 tsf를 검사한다. 화면 비교 범위는 5~1000 kPa이다. 이는 모형을 비교하기 위한 범위이며 지반 종류별 유효성 보증 범위가 아니다.
- ER을 변경하는 비교는 측정 N을 고정한다. 현장에서 같은 지반을 다른 에너지로 시험하면 측정 N도 달라질 수 있다. 그래프 상승을 실제 강도 증가로 해석하지 않는다.

`Investigation.cpt(input)`

```js
{
  basis: 'qc', // 'qc' 측정값 또는 'qt' 이미 수압 보정된 값
  tipResistanceMPa: 1, // MPa
  u2: 200, areaRatio: 0.8, // u2 kPa, a 무차원
  totalOverburden: 200, // kPa, 총응력
  nkt: 14, nktMin: 10, nktMax: 18
}
```

- 내부 압력 단위는 kPa. `inputKPa=tipResistanceMPa×1000`.
- `qc`: `qt=inputKPa+(1−a)u2`. u2는 콘 어깨에서 측정한 수압이며 초과수압 Δu나 정수압 u0로 바꾸어 쓰지 않는다. a는 기기의 교정값이다.
- `qt`: `qt=inputKPa`. 비활성 u2·a를 읽거나 보정을 다시 더하지 않는다.
- `qnet=qt−totalOverburden`: **총상재응력**을 한 번 뺀다. 유효응력으로 대체하지 않는다. qnet (kPa)와 정규화 저항 Qt (무차원)는 다르다.
- 비배수 관입이 성립하는 세립토를 전제로 `su=qnet/Nkt`. 지반 종류·배수조건은 이 입력들만으로 자동 판정할 수 없다.
- 지정 계수 범위의 강도는 `suMin=qnet/nktMax`, `suMax=qnet/nktMin`. 현재 Nkt가 범위 밖에 있어도 별개의 비교점으로 허용한다. 범위를 확률분포나 신뢰구간으로 표시하지 않는다.
- `qnet≤0`은 `valid:true`, `suApplicable:false`이며 qt·qnet는 유지하고 su·suMin·suMax는 null로 반환한다. 양의 강도로 환산할 수 없는 상태를 보여준다. 음의 qt, 0 이하 Nkt, 역전된 범위, 활성 값 누락·비수치·계산 오버플로는 `valid:false`.
- 음의 측정 u2는 0으로 조정하지 않는다. a는 0<a≤1이며, 이 입력범위 자체가 실제 장비·측정 적정성을 인증하지 않는다.

두 API 모두 `valid`, `errors`를 반환하고 호출자 객체를 변경하지 않는다. 숨겨진 자동 기본값으로 누락을 대신하지 않는다. 입력 종류를 바꾸는 UI는 숫자를 자동 재해석해 보정 결과를 덮어쓰지 않는다. 새 종류에 해당하는 기록값을 사용자가 확인해야 한다.

## UI 구성

- SPT: 측정 N·ER·σ′v0 세 슬라이더. CB·CR·CS는 현재 수치가 보이는 상세 요약 안에 둔다. 이미 보정된 N60 모드에서는 두 활성 슬라이더만 남는다.
- CPT: qc·u2·a·σv0·Nkt 다섯 슬라이더. 이미 보정된 qt 모드는 qt·σv0·Nkt 세 슬라이더. 범위의 숫자 입력은 현재 하한·상한이 보이는 작은 상세 영역에 둔다.
- SPT 막대는 실제 단계별 값을 그린다. CPT는 실제 qnet/Nkt 곡선, 지정 Nkt 구간, 현재 선택점을 그린다. 저장 기준은 같은 단계 또는 같은 순저항의 곡선으로 비교한다.
- 결과 아래에 현재 값의 대입식·단위·적용범위를 표시한다. 근거 문헌은 별도 상세에 연결한다.

## 독립 검증

- 손계산 SPT: N=20, ER=75%, CB=1, CR=0.9, CS=1 → 에너지 단계 25, N60=22.5. σ′v0=2 tsf에서 CN=0.77 → (N1)60=17.325.
- 상재응력을 0.2 tsf에서 2 tsf로 10배 바꾸면 CN은 1.54→0.77, N60은 동일하다. 1 tsf에서 CN≈1.001793이며 정확히 1로 보정하지 않는다. 낮은 응력에서 상한 2의 작동을 따로 검사한다.
- 손계산 CPT: qc=1 MPa, u2=200 kPa, a=0.8 → qt=1040 kPa. σv0=200 kPa → qnet=840 kPa. Nkt=14 → su=60 kPa. Nkt=10~18 → su=46.6667~84 kPa.
- Nkt를 14→28로 바꾸면 su가 절반이며 qc·qt·qnet는 그대로다. u2=-100 kPa에서는 qt=980 kPa. a=1에서는 수압 보정이 0이다.
- 이미 보정된 N60·qt 모드에는 읽기만 해도 예외를 내는 비활성 필드 getter를 넣어 중복 보정·숨은 값 검증을 방지했다.
- 정수 측정 N, 소수 N60, 영값, 음수·누락·무한대, 순저항 0·음수, 범위 역전·축소, 불변 입력 객체, descriptor의 활성 필드와 단일 질문 구조를 검증한다.
- `node --test tests/investigation.test.mjs`: 21/21 통과. 별도 로컬 렌더 점검은 390·768·1440 px에서 기본값·두 입력 종류·영값·극단값·순저항 비양수·계수 범위 축소 등 27개 조합을 확인했다. 페이지 오류, 가로 넘침, 비유한 SVG, SVG 글자 잘림, 슬라이더·숫자 입력 불일치가 없었다. 데스크톱·모바일 화면도 시각 확인했다.

## 범위 경계

SPT 관입거부 기록을 N으로 비례 환산하지 않는다. WOH/WOR 자중 관입도 일반 N=0의 계산 결과로 대신 해석하지 않는다. N→φ′·su·E 자동 결정, CPT 전 지반 자동 분류, SPT↔CPT 확정 변환은 포함하지 않는다. CPT의 강도 비교 폭은 선택한 Nkt만 반영한다. 공간 변동·표본 수·측정 오차를 함께 다루는 계획 27의 불확실성 실험으로 이어질 수 있지만 그 전체를 이미 계산한 것은 아니다.
