# 얕은기초 지지력: 형상·근입·수위·편심과 두 이론 체계

기본 `Mechanics.foundation` 실험을 유지하면서, 직사각형 기초의 배수 지지력을 확장한다. `bearing-conditions` 실험의 첫 질문은 실제 비율의 유효면적 평면·지하수 단면·저항 기여항을, 두 번째 질문은 두 체계의 기여항 막대와 계수 대조표를 보여준다. 질문에 따라 주요 슬라이더도 형상·수위·편심 또는 강도·평면치수로 달라진다. 나머지 물성·하중은 접힌 설정에서 유지·편집한다.

## 원출처와 명명

주 출처는 [USACE EM 1110-1-1905, Geotechnical Design of Shallow Foundations on Soils, 31 July 2025](https://publibrary.sec.usace.army.mil/api/download?filename=EM+1110-1-1905_Geotechincal+Design+of+Shallow+Foundations+on+Soils_2025+07+22+-+Final.pdf&id=54658636-77d2-48df-f26b-5295a01899a7&preview=true)이다. 공식 원문 PDF를 열어 수식과 공표 예제를 확인했다.

- §5–4, §5–5 및 식 5–19~5–22, 인쇄 쪽 103~107: 유효면적, 정수압, 배수 유효 상재압, 일반 지지력식과 지하수 보정.
- 표 5–2, 인쇄 107쪽(PDF 122쪽): USACE/Meyerhof 기반 및 AASHTO/FHWA/Vesic 기반의 **각각의 전체** 배수 계수 체계. `sc` 행 오른쪽 식의 본문 기호가 `sq`로 인쇄되어 있으나 행 제목과 FHWA 형상계수 문맥에 따라 점착력 형상계수 `sc`로 구현했다.
- §5–5a(2)~(4), 인쇄 102쪽: 전반·국부·관입전단, 강한 층 아래 약한 층, 균질 모래에서의 침하 검토 연결.
- 부록 B–3, 인쇄 302~307쪽: 마찰각 34°, 7 ft 정사각형 기초, 근입 2 ft, 지하수 13 ft의 두 체계 수치 예제.
- 30° 계수는 USACE 구판 EM 1110-1-1905 (30 October 1992), 표 4–4의 공표 반올림값 `Nc=30.14, Nq=18.40, Nγ(M)=15.67, Nγ(V)=22.40`로 추가 대조했다. 원문은 [USACE 공식 간행물 경로](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-1-1905.pdf)에 있다.

실험의 이름은 원저자의 모든 변형식을 대표한다는 뜻이 아니라 **2025 USACE 문헌에 함께 제시된 두 체계**를 뜻한다. Nγ만 교체하고 다른 보정은 고정하는 혼합식을 사용하지 않는다. 두 결과를 자동 평균하거나 우열·적합 여부로 판정하지 않는다. 국내 KDS 조항을 검증하거나 국내 기준 적합성을 주장하지 않는다.

## 계산과 적용 범위

단위: 길이 m, 하중 kN, 응력 kPa, 총단위중량 kN/m³, 마찰각 °.

균질한 배수지반, 수평 지표·저면, 수직하중, 한 방향 편심을 가정한다. 구현 범위는 `10≤φ′≤45°`, `0≤Df/B′≤1`, `0<B≤L`, `|e′/B|<0.5`이다. 이는 학습 구현의 범위이지 기준의 적합 한계가 아니다. φ=0 비배수 계산을 배수 계산의 끝점으로 혼동하지 않도록 별도로 제외했다. 사면 인접, 경사하중, 침투류, 층상지반, 2축 편심, 침하·회전·허용지지력은 계산하지 않는다.

평면 유효치수와 기저 수압:

```
e′ = (eccentricityRatio) B
B′ = B − 2|e′|;  A = BL;  A′ = B′L
u = γw max(Df−zw,0)
σv0 = γDf                     # 화면의 일정 총단위중량 모형
q′0 = σv0 − u
V′ = W − uA; M = V′e′
q′demand = V′/A′
```

`W`는 기둥·기초·상부 흙 자중이 이미 포함된 총 하향하중이다. 부력은 **실제 전체 면적 A**에서 한 번만 빼며 A′에서 빼지 않는다. 입력 편심은 이 **유효합력 V′**의 편심이다. 총 하향합력의 편심을 같은 값으로 고정한 모형이 아니다. 수위를 바꾸면서 e′/B를 유지하면 M=V′e′도 함께 변하며, 일정한 외력 모멘트 M의 수위 변화 실험과는 다르다. 원면적 하중장부의 순증가와 A′에 대한 순요구압력을 구별한다.

```
q′ult = c′Nc sc dc + q′0 Nq sq dq + 0.5 B′γb Nγ sγ dγ
Qult = q′ult A′
q′ult,net = q′ult − q′0
q′demand,net = q′demand − q′0
```

총·순 변환은 양쪽에 동일한 q′0를 사용한다. 따라서 저항과 요구압력의 **차이**는 보존되지만 두 비율을 동일한 안전율이라고 두면 안 된다. API의 `resistanceDemandRatio`는 유효 총저항/유효 요구하중의 단순 비율로, 설계 안전율 판정 또는 LRFD가 아니다. UI는 이 비율 대신 압력과 저항을 표시한다.

공통 계수:

```
Kp = (1+sinφ′)/(1−sinφ′)
Nq = Kp exp(π tanφ′)
Nc = (Nq−1)/tanφ′
```

| 항목 | USACE/Meyerhof 기반 | AASHTO/FHWA/Vesic 기반 |
|---|---|---|
| Nγ | (Nq−1)tan(1.4φ′) | 2(Nq+1)tanφ′ |
| sc | 1+0.2Kp·B′/L | 1+(Nq/Nc)B′/L |
| sq | 1+0.1Kp·B′/L | 1+tanφ′·B′/L |
| sγ | 1+0.1Kp·B′/L | 1−0.4B′/L |
| dc | 1+0.2√Kp·Df/B′ | 1 |
| dq | 1+0.1√Kp·Df/B′ | min[1.4, 1+2tanφ′(1−sinφ′)²atan(Df/B′)] |
| dγ | 1+0.1√Kp·Df/B′ | 1 |

경사 관련 계수는 명시된 수평·수직하중 조건에서 모두 1이다. atan은 라디안이다. 소스의 지하수식은 **실제 B**, 형상·근입·자중 지지력 항은 **유효 B′**를 쓴다.

```
USACE: Cw = min[1, 0.45 + 0.55 max(zw−Df,0)/B]
FHWA:  Cw = min[1, 0.5 + 0.5 zw/(1.5B+Df)]
γb = γ Cw
```

위 γb는 각 방법의 **경험적 수위 보정**이며 실제 전단영역에서 포화·습윤 중량을 적분한 정밀 평균이 아니다. `γb=γsat−γw`를 별도로 강제하거나 다시 γw를 차감하지 않는다. 화면은 γ를 수위 전후 동일하게 두는 단순 모형이며 γsat 입력을 추가해 그 값과 동일하다고 오해하게 하지 않는다. 수위 상승은 q′0와 자중 저항을 줄이지만 동시에 기초의 유효요구하중도 줄일 수 있으므로 저항/요구 비율의 일률적 단조 증가·감소를 주장하지 않는다.

## API 및 기존 하중장부 연결

`BearingExtensions`는 DOM 없는 순수 네임스페이스이다.

- `factors({phi,width,length,embedment,method})`: 유효치수 B′·L과 선택된 체계의 계수.
- `capacity({width,length,embedment,phi,cohesion,gamma,waterDepth,totalLoad,eccentricityRatio,method,gammaW?,originalTotal?})`: 물리치수 B·L, 전체 하향하중, 유효합력 편심으로 계산한다. `originalTotal`을 주면 γDf 대신 장부 원지반 총응력을 쓴다.
- `compare(input)`: 동일 입력으로 두 체계의 결과를 반환한다. 고정 순서는 `usace-meyerhof`, `fhwa-vesic`이다.
- `fromLedger(ledger,soil)`: `FoundationConditions.ledger` 결과의 `width,length,embedment,waterDepth,gammaW,downwardLoad,originalTotal`을 그대로 사용한다. `soil.gamma`는 전단영역 보정의 기준 총단위중량으로 **명시적으로 필수**이다. 장부의 습윤·포화 단위중량을 임의로 선택하지 않는다. `phi,cohesion,eccentricityRatio,method`도 soil에서 전달할 수 있다.

```js
const ledger = FoundationConditions.ledger({
  width:3, length:4, embedment:1, thickness:.3,
  columnLoad:1200, waterDepth:.5, gammaSoil:18, gammaSat:20
});
const bearing = BearingExtensions.fromLedger(ledger, {
  gamma:20, phi:30, cohesion:0,
  eccentricityRatio:0, method:'fhwa-vesic'
});
```

이 어댑터는 계산 API의 연결이며 화면에서 기존 장부 입력을 자동 복사·구독하지 않는다. 장부에서 다룬 층별 중량은 원지반 상재압 장부를 위한 것이며, 어댑터를 호출했다고 층상지반의 파괴면을 계산하는 것은 아니다.

`valid:false`와 구체적 `errors`는 모순된 치수, 유한하지 않은 값, 지원하지 않는 체계, 범위 밖 배수각·근입, 음의 원지반 유효응력, 압축 평형이 불가능한 부력 조건 등을 알린다. 물리값을 조용히 보정하지 않는다. `min`은 출처가 정의한 계수 상한·지하수 포화값이며 입력 오류의 보정이 아니다.

## 그림과 현상 해설

파란 A′는 하중합력에 중심을 맞춘 평면이다. 실제 압축 접촉영역이나 3차원 파괴면이 아니다. 기존 `footing-contact`의 qmax 대신 V′/A′를 해당 지지력식과 비교한다. 기존 Prandtl 2D 그림은 별도의 무중량 연속기초 해석 기구로 유지하며, 이 직사각형 기초 파괴면으로 주장하지 않는다.

전반·국부·관입전단은 접힌 해설에서 관찰되는 현상과 구별 조건을 설명한다. φ·c 슬라이더만으로 모드를 예측하거나 근거 없는 임계 조밀도·가상의 하중침하곡선을 만들지 않는다. USACE가 설명하는 균질한 느슨한 모래의 침하 검토 연결과 강한 층 아래 약한 층의 별도 검토를 명시한다.

## 검증 기록

`tests/bearing-extensions.test.mjs`: 18개 테스트, 216개 조합을 포함한다.

- 공표 30° 계수와 표 5–2 전체 계수 체계 대조.
- 부록 B–3: 계산한 q′ult는 Meyerhof 기반 32.3306 ksf, Vesic 기반 25.9228 ksf. 원문은 각 중간 계수를 두 자리로 반올림하여 32.15, 25.86 ksf를 제시하므로 이 검증에만 0.6% 허용차를 쓴다. 나머지 항등·평형 테스트는 통상 1e−9~1e−8 절대 오차.
- 기존 표면 정사각형 건조 `Mechanics.foundation`의 Vesic 계수 결과와 일치.
- 수위 보정의 원문 끝점·중간값, 실제 B 사용, 부력의 실제 A 사용 검증.
- 굴착장부의 원지반 총·유효응력 및 하중을 그대로 연결하고 순증가 항등식 검증.
- 편심 부호 대칭, 유효면적과 실제 접촉 폭·qmax의 차이, 저항×면적=힘.
- 고정 종횡비의 지표면 모래기초에서 B 2배 → 극한압력 2배, 극한하중 8배의 차원관계.
- 수치가 없는 오류 반환, Df/B′ 경계 및 계수 체계 enum 확인.
- 네비게이션 그룹과 descriptor 필드 계약 확인.

기본 B=3m, L=4m, Df=1m, φ′=30°, c′=0, γ=20, zw=6m, W=1,200kN, e′=0에서 두 결과는 각각 1,085.9004 / 1,046.8169 kPa이다. Vesic 기반은 상재압 항 576.3647 kPa, 자중 항 470.4522 kPa, Qult=12,561.8029 kN이다.

독립 HTML harness로 390·768·1440 px, 중심/편심/수위상승/극단 형상/큰 하중/두 질문 등 24개 화면을 확인했다. JS 오류, 비유한 SVG 값, 가로 넘침, 슬라이더·숫자 입력 불일치가 없었으며 데스크톱과 모바일 이미지를 육안 검토했다. 원문과 검증 이미지는 `work/bearing-extensions-review/`에 있다.
