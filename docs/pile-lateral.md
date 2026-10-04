# 말뚝 횡하중과 두부 구속

`pile-lateral`은 유한 길이 단일 말뚝에 가한 수평력이 변위·휨모멘트·지반 반력으로 전달되는 기본 관계를 보여준다. 같은 계산에서 수평변위 또는 모멘트를 선택해 표시하며 두 질문을 별도 물리 모형처럼 중복시키지 않는다. `meta.displayOnly:true`, `questions=[displacement,moment]`를 사용한다.

기본 입력은 수평력·길이·EI·선형 지반계수의 슬라이더 4개와 두부 회전 선택이다. 선단 경계는 접힌 세부 설정이다. 기본 선단은 자유이며 임의의 깊이에 가상 고정점을 넣지 않는다.

## 실제 제공 범위

- 지표 두부 수평력 P, 회전 자유 또는 회전 0의 두부.
- 자유 또는 완전 고정 선단을 갖는 유한 길이 Euler–Bernoulli 보.
- 깊이 전체에서 같은 선형 Winkler 계수, 연속 지지의 일관된 적분.
- 변위·회전·전단력·모멘트 분포, 지반 힘, 두부 반력 모멘트, 선단 반력, 수치 수렴과 평형 잔차.
- 저장한 조건과 실제 동일 축 곡선 비교.

두부의 ‘구속’은 **회전만 0**이며 두부 수평변위는 허용한다. 선단 ‘고정’은 그 점의 수평변위와 회전이 모두 0인 별도의 이상 경계다. 단단한 층 접촉이나 긴 말뚝을 근거로 선단 고정을 자동 가정하지 않는다.

비선형 p–y·반복/지진 하중, 강도 상한, 지반과 말뚝 사이의 틈, 군말뚝, 층상지반, 지표 위 자유길이, 축력 P–Δ, 상부 구조물과의 연성, 균열·소성화에 따른 EI 변화를 구현하지 않았다. 실무 횡지지력·허용변위·구조 내력 계산서가 아니다.

## API와 단위

`src/pile-lateral.mjs`는 외부 import 없는 namespace `PileLateral`이다. 기존 `Retaining` 모형을 변경하거나 실행 시 의존하지 않는다.

```
PileLateral.solve({
  length: 12,           // m
  EI: 200000,           // kN·m², 말뚝 한 본의 휨강성
  soilModulus: 5000,    // kN/m², 길이당 지반 반력/변위
  load: 100,            // kN, 두부 수평력
  head: 'free',         // 'free' | 'fixed' (회전만 구속)
  tip: 'free',          // 'free' | 'fixed' (변위·회전 구속)
  elements: 64          // 정수 4~160; UI는 64 사용
})
```

길이·EI는 양수, 지반계수·하중은 0 이상이다. 지반계수 0 및 자유 선단은 수평 지지가 없어 오류다. 지반계수 0과 고정 선단은 독립 검증용 보의 극한으로 계산 가능하다. UI 지반계수 범위는 200~20000 kN/m²다.

`soilModulus`를 kℓ로 표기한다. 말뚝 둘레 작용을 적분한 길이당 힘 p는 kN/m, w는 m이므로 kℓ=p저항/w는 **kN/m²**다. 기초 바닥의 면적당 압력/침하인 kN/m³와 다르며, 말뚝 직경을 다시 곱하지 않는다. EI는 말뚝 단면 전체의 값이므로 1 m 폭 해석 띠의 값이 아니다.

정상 결과는 `{valid:true,errors:[],...}`이며 입력 오류·특이계·수렴 실패는 `{valid:false,errors:[...]}`다. 수치적으로 부족한 해를 정상 결과처럼 그리지 않는다.

주요 반환:

- `nodes`: z(m), displacement(m), rotation(rad), soilForcePerLength(kN/m).
- `profile`: 위 값과 `moment(kN·m)`, `shear(kN)`를 갖는 세밀한 깊이 분포.
- `headDisplacement`, `headDisplacementMm`, `headRotation`, `headInternalMoment`, `headReactionMoment`.
- `maxMoment`, `maxMomentDepth`, `maxDisplacement`, `maxRotation`.
- `soilForce`, `soilMoment`, `tipForce`, `tipMoment`.
- `forceResidual`, `momentResidual`, `relativeResidual`.
- `meshHeadRelative`, `meshMomentRelative`, `coarseElements`, `converged`.
- `characteristicLength=(4EI/kℓ)^(1/4)`, `beta=1/characteristicLength`, `lengthRatio=L/characteristicLength`.
- `elementResults`의 보간 계수·요소 끝 힘·정확 적분한 지반 힘은 독립 평형·에너지 검증에도 사용한다.

## 지배식과 부호

지표부터 아래로 z, 수평력 방향의 변위를 +w로 둔다.

```
p(z) = −kℓ w(z)             // 말뚝에 작용하는 지반 힘
EI w'''' + kℓw = 0
M = EI w''
V = M'
V' = p
```

두부는 V(0)=P이다. 회전 자유일 때 M(0)=0, 회전 구속일 때 w′(0)=0이다. 회전 구속의 외부 반력 모멘트는 `−M(0)`로 내부 절단면 부호와 반대다. 자유 선단은 M(L)=V(L)=0, 고정 선단은 w(L)=w′(L)=0이다.

전체 평형:

```
P + ∫p dz + Rtip = 0
Rhead,moment + ∫zp dz + Rtip L + Rtip,moment = 0
```

작용 모멘트를 θ=w′의 가상회전에 공액인 부호로 정의한다. 화면에는 내부 두부 모멘트와 외부 반력 모멘트를 구분한다.

## 수치 방법

2절점 cubic Hermite 요소의 자유도는 `[w1,θ1,w2,θ2]`다. 각 요소의 국부 길이를 h, 무차원 위치를 t=zlocal/h로 두고 다음 보간을 사용한다.

```
N = [1−3t²+2t³, h(t−2t²+t³), 3t²−2t³, h(−t²+t³)]
Kb = ∫ EI N''ᵀN'' dz
Ks = ∫ kℓ NᵀN dz
```

두 행렬은 상수 EI·kℓ에서 정확 적분한 형태다. Ks는 절점에 스프링을 단순 분배한 lumped 모형이 아니라 회전 자유도와의 결합도 포함하는 **연속 지지의 일관된 강성**이다. 전체 Kb+Ks를 조립해 선택 경계를 직접 적용한다.

대칭 대각 스케일링과 대역폭 3 Cholesky로 선형계를 푼다. 강한 말뚝의 거의 강체인 운동에서는 큰 행렬 성분의 상쇄 오차가 커질 수 있어 곡률을 절점 변위 차이로 계산하고 잔차 반복 보정 3회를 수행한다. 물성을 바꾸거나 음의 반력을 자르는 보정은 하지 않는다.

요소 내부 w는 cubic 다항식이다. p=−kℓw를 정확 적분해 요소 끝 작용력으로부터 V·M를 회복한다. 보간 변위를 단순히 두 번 미분한 조각별 1차 모멘트와 달리, 회복 모멘트는 분포 지반 힘과 절단면 평형을 만족하고 요소 접점에서 연속이다. 최대 모멘트 후보는 요소 끝·표본점 및 전단력 부호가 바뀌는 구간에서 V=0을 이분법으로 찾은 점이다.

UI는 64개 요소와 32개 요소를 매번 비교한다. 수렴 기준은 두부 변위 차이 0.5% 미만, 최대 |M| 차이 1% 미만이다. 정규화 선형계 잔차와 힘·모멘트 평형 잔차는 해당 하중 척도의 10⁻⁶ 미만을 요구한다. 잔차를 해석된 실무 정확도로 표현하지 않는다. 진단 값은 접힌 설명이 아닌 차트 아래에 항상 표시한다.

## 독립해 및 검증

`node --test tests/pile-lateral.test.mjs`의 15개 테스트를 통과했다.

1. 지반계수 0·자유 두부·고정 선단은 모든 깊이에서 캔틸레버 해와 일치한다.

   `w(z)=P(2L³−3L²z+z³)/(6EI)`, `w0=PL³/(3EI)`, `θ0=−PL²/(2EI)`, `M(z)=Pz`.

2. 지반계수 0·양단 회전 구속·고정 선단은 `w0=PL³/(12EI)`, `M0=−PL/2`, `ML=PL/2`와 일치한다.
3. 충분히 긴 균질 말뚝의 독립 지수해를 대조했다. β=(kℓ/4EI)^(1/4)일 때:

   - 자유 두부: `w(z)=P/(2EIβ³) exp(−βz) cos(βz)`.
   - 회전 구속 두부: `w(z)=P/(4EIβ³) exp(−βz)[cos(βz)+sin(βz)]`.
   - 자유 두부 최대 모멘트는 z=π/(4β)에서 `P/β · exp(−π/4)/√2`.
   - 회전 구속 두부 모멘트는 `−P/(2β)`.

   βL=16, 128개 요소에서 두부 변위를 지수해의 2×10⁻⁶ 상대 오차 이내로 대조한다. 유한 선단의 영향과 유한요소 근사 오차를 0이라고 주장하지 않는다.

4. 두부·선단 4개 경계 조합의 변위·회전·M·V 경계값, 지반 반력 적분과 힘·모멘트 평형.
5. 모든 요소 접점의 M·V·w·θ 연속.
6. 요소별 굽힘 및 지반 스프링 변형에너지를 별도로 적분해 외부 일 `Pw0/2`와 대조.
7. 하중 2배에서 w·M·반력 2배, 에너지 4배. EI와 kℓ를 함께 2배하면 w 절반, M 불변.
8. 두부 회전 구속의 이동 감소와 모멘트 변화, 32→64→128 요소의 독립해 수렴.
9. 무하중 0 해, 입력 범위 양 끝의 EI·kℓ·길이·두부·선단 32개 조합, 부적절한 경계·음수·비유한 값 거절.

선형 지반은 반력 상한 없이 계산하므로 매우 약한 지반·큰 하중 조합은 큰 회전을 줄 수 있다. 최대 회전 0.1 rad를 넘으면 화면에 큰 회전의 선형 외삽임을 표시한다. 0.1은 학습 UI의 알림 기준이며 지반·구조 설계 허용값이 아니다.

두 표시를 실제 CSS로 렌더하고 390px에서 가로 넘침이 없음을 확인했다. 왼쪽은 경계조건 도식이며 실제 직경·변형 형상을 뜻하지 않는다. 오른쪽은 w 또는 M 대 깊이의 수치 축이다. 변위의 mm축과 깊이의 m축으로 보이는 선의 기울기를 실제 말뚝 회전으로 읽지 않도록 표시한다.

## 원출처 대조

- [FHWA-HRT-04-043, Chapter 8](https://www.fhwa.dot.gov/publications/research/infrastructure/structures/04043/08.cfm), §8.2의 보 지배식·선형 반력 가정, §8.3.1.1의 p(kN/m) 및 반력 계수(kN/m²) 구분을 확인했다. 원문이 실제 p–y가 비선형이고 깊이에 따라 달라짐을 설명하는 만큼, 본 일정 선형 모델을 그 전체 해석으로 표현하지 않는다.
- [TU Delft, Euler–Bernoulli beam elements](https://interactivetextbooks.citg.tudelft.nl/computational-modelling/structural_linear/euler_bernouilli.html), 식 4.19–4.29 및 정확 적분한 강성행렬을 확인했다. 지반 강성은 같은 보간에 `∫kℓNᵀN dz`를 적용해 직접 구성했다. 문헌의 내부력 부호와 화면의 지표 아래 z 기준 부호는 위 절에서 정의했다.
- [Bahrami & Nikraz, Initial Soil Springs Stiffness for Laterally Loaded Piles, ANZ 2012](https://curate.curtin.edu.au/articles/conference_contribution/Initial_Soil_Springs_Stiffness_for_laterally_loaded_Piles/31518106), 탄성 지지의 특성계수 및 자유 두부 장말뚝 지수해. 원문 검색 색인에서 식을 대조하고 대학 저장소의 서지사항을 확인했다. 직접 PDF 재열기는 저장소 403으로 제한되어, 검증식은 지배방정식과 경계조건에 직접 대입하는 독립 확인도 수행했다. 본 앱은 해당 연구의 3D 지반에서 kℓ를 역산하는 경험식까지 구현하지 않는다.

국내 설계기준의 적용 판본·허용치·하중 조합을 이 모형에 포함하지 않았다. 이 단계는 횡방향 기구 학습이고 지반조사·시험·설계 계산서를 대체하지 않는다.
