# 토압·옹벽·단계굴착의 학습 모형

2026-09-30: 새 흙막이 실험은 [흙막이 시공과정](excavation-staged.md)을 따른다. 이 문서의 `Retaining.excavation`은 이전 저장 파일의 계산을 보존하는 선형 모델 설명이다. 두 모델의 결과·가정을 혼용하지 않는다.

이 묶음은 교육 계획 13~15의 기본 수치 거동과 D06 앵커 잠금력의 작용을 제공한다. 각 실험은 해석 범위를 화면에 명시하며, 기준에 따른 합격/불합격이나 현장 변형 예측을 제공하지 않는다. 아래 구현 범위를 해당 분야의 모든 세부 항목 완료와 혼동하지 않는다.

## 실제 제공 범위

| Navigation key | 질문 | 계산·그림 |
|---|---|---|
| `earth-pressure` | 토압·수압 분포 | Rankine Ka/Kp, K0–OCR, 수위·상재 분리, 합력·작용점 |
| `earth-pressure` | 벽 마찰·경사 | 수직벽의 Coulomb 주동계수, 임계 직선 쐐기, 힘 평형 다각형 |
| `gravity-wall` | 힘·접촉압 | 사다리꼴 중력벽의 자중·수평토압·수압·기저양압, 활동 저항비, 모멘트, 무인장 접촉압 |
| `excavation` | 벽 변위 / 모멘트 | 설치 전 굴착→긴장·잠금→추가굴착의 탄성 보–스프링 해, 설치 시점의 변위 기억 |
| `excavation-base` | 점토 히빙 | 넓고 긴 균질 점토 굴착의 하중/비배수 저항 비교 |
| `excavation-base` | 상향 침투 | 1D 상향 동수경사와 유효 자중의 균형 |
| `excavation-base` | 슬래브 부상 | 단위면적 슬래브 자중과 양압의 연직 힘 평형 |

토압 상태는 주동·정지·수동의 명시적 선택이다. 필요한 변위 크기나 세 상태 사이의 동원곡선을 만들지 않는다. Coulomb의 벽 마찰과 배면 경사는 별도 질문에서 계산하고, 수위·상재가 있는 Rankine 결과에 임의로 혼합하지 않는다.

## 단위·API

`src/retaining.mjs`는 무의존 ESM namespace `Retaining`이다. 길이 m, 힘 kN, 응력 kPa, 모멘트 kN·m를 사용한다. 구조물은 화면 밖 폭 1 m의 해석 띠이므로 표시 합력 kN/m, 모멘트 kN·m/m는 수치상 같다. `EI`는 **폭 1 m 해석 띠 전체**의 kN·m², `anchorK`는 그 띠의 kN/m이다. 지반 반력계수는 kN/m³이며 폭 1 m와 지배 길이를 곱해 절점 스프링 kN/m로 바꾼다.

모든 공개 모형은 입력 오류를 `{valid:false,errors:[...]}`로 반환한다. 일부 평형이 불가능한 중력벽은 입력 자체가 잘못된 것이 아니므로 `valid:true,equilibriumExists:false,contact:'lost'`를 반환하고 접촉압을 그리지 않는다.

### `earthPressure(input)`

기본값: `height=6,phi=30,gamma=18,gammaSat=20,waterDepth=6,surcharge=10,state='active',ocr=1,gammaW=9.81`.

- `Ka=(1−sinφ)/(1+sinφ)`, `Kp=1/Ka`.
- `K0=(1−sinφ) OCR^sinφ`. OCR=1은 NC Jaky 형태, OCR>1은 Mayne–Kulhawy 경험 관계다.
- 깊이 z의 `σ′v=γ min(z,zw)+(γsat−γw)max(0,z−zw)`.
- 흙+상재 `p′=K(σ′v+q)`와 수압 `u=γw max(0,z−zw)`를 따로 계산한다. **수압에 K를 곱하지 않는다.**
- 지표·수위·바닥으로 선형 구간을 나눠 정확 적분한다. 합력 `P=∫p dz`, 바닥에 대한 모멘트 `M=∫p(H−z) dz`, 작용높이 `M/P`.

반환값: `ka,kp,k0,k,profile,components:{soil,surcharge,water},force,moment,resultantHeight,base,failureAngle` 및 입력값. `components`마다 `force,moment,height`가 있다. `failureAngle`은 active=45+φ/2, passive=45−φ/2, rest=null이다. 정지 상태에 임의 파괴선을 표시하지 않는다.

무점착·단층·수평 배면·매끈한 수직벽·배수토 조건이다. 점착력·인장균열 및 균열 수압, 층상 토압, 띠/선 하중, 아칭·겉보기 토압, 지진토압은 포함하지 않는다.

### `coulomb(input)`

기본값: `height=6,phi=30,delta=15,beta=10,gamma=18`. δ는 벽면마찰각, β는 수평에서 위로 향하는 배면 경사. 0≤δ≤φ, 0≤β<φ, 수직벽·건조·무점착·상재 없음이다.

수직벽의 계수:

`Ka = cos²φ / {cosδ [1+√(sin(φ+δ)sin(φ−β)/(cosδ cosβ))]²}`

벽 합력 `P=½γH²Ka`, 벽에 작용하는 수평 성분 `P cosδ`와 하향 성분 `P sinδ`를 반환한다. 삼각분포를 가정한 작용높이는 H/3이다.

그림의 직선 파괴쐐기는 별도로 계산한다. 파괴면 수평각 θ에 대해 `x=H/(tanθ−tanβ)`, `W=½γHx`, `P(θ)=W sin(θ−φ)/cos(θ−φ−δ)`. 최대 P를 golden-section으로 찾고 닫힌 식과 대조한다. θ는 FHWA 원문에서 벽 배터를 뜻하는 θwall과 다른 변수이므로 화면·문서에서 구분한다.

반환값: `k,force,horizontal,vertical,wedge:{theta,run,weight,force,topY,planeReaction,points},forceResidual,rankineK`. 오른쪽 힘 다각형은 쐐기 위의 세 힘을 정확한 크기·방향으로 그린다. 벽이 받는 P와 쐐기가 받는 P의 방향은 반대다. 원문 Coulomb 수동해나 벽 배터를 추가한 모형으로 확대하지 않는다.

### `gravityWall(input)`

기본값: `height=5,baseWidth=3,topWidth=.7,gammaConcrete=24,friction=.55,phi=30,gamma=18,gammaSat=20,waterDepth=5,surcharge=10,uplift=true`.

앞굽을 x=0, 뒤굽을 x=B, 바닥을 y=0으로 한다. 단면 꼭짓점은 `(0,0),(B,0),(B,H),(B−t,H)`이다. 수직 배면을 가진 사다리꼴이며 배면 상재는 벽체 상부에 직접 재하되지 않는다. 사각형·삼각형의 면적과 도심으로 W와 xG를 계산한다.

횡력은 `earthPressure(state:'active')`의 합력·모멘트다. 선택한 기저 양압은 **뒤굽 수압 uH, 앞굽 수압 0의 선형분포라는 별도 가정**이다. `U=½uH B`, `xU=2B/3`. 실제 배수시설 성능이나 2D 기초 침투해석을 계산한 값이 아니다.

`N=W−U`, `Mnet=WxG−UxU−M횡력`, `xR=Mnet/N`. `μN/P`와 `WxG/(UxU+M횡력)`를 비교 지표로 반환한다. 토사 점착력·전면 수동저항을 저항에 더하지 않는다.

접촉압은 인장 저항 0인 강체 기저의 선형 압축분포다.

- 중앙 1/3: `e=B/2−xR`, `p앞/뒤=N/B(1±6e/B)`.
- 앞굽 쪽 부분접촉: `Lc=3xR`, `p앞=2N/Lc`, 뒤쪽 이격부 p=0.
- 뒤굽 쪽 부분접촉: 대칭적으로 `Lc=3(B−xR)`, `p뒤=2N/Lc`.
- N≤0 또는 xR가 0~B 밖이면 압축 접촉으로 평형 불가. 압력을 음수로 유지하거나 잘라서 부정확한 힘 평형을 만들지 않는다.

반환 `pressure`의 구간별 적분은 N과 Mnet을 모두 만족한다. 지지력·침하·전체 활동면·벽체 배근 검토는 별도이며, 위 저항비만으로 구조물 합격을 판정하지 않는다.

### `excavation(input)` — D06 포함

기본값: `height=6,embedment=3,EI=500000,groundK=20000,anchorK=50000,preload=100,installDepth=3,anchorDepth=2,phi=30,gamma=18,mesh=.5`.

벽 총길이=최종 굴착깊이+근입이며 **벽 선단은 자유**다. 지표부터 아래로 z, 굴착측으로의 벽 변위를 +w로 정의한다. 초기에는 양쪽 `K0γz`가 균형이라고 두고, 굴착측 흙을 깊이 Hs까지 제거하면 증분 횡하중 `p(z)=K0γ min(z,Hs)`를 준다. 굴착한 구간의 스프링은 제거하고 남은 근입부에는 양방향 선형 증분 스프링을 둔다. p는 모델링한 제거 응력이며 자동 동원된 극한토압이 아니다.

Euler–Bernoulli cubic Hermite 2절점 보 요소(절점 w, 회전 각 1개)의 표준 4×4 강성행렬을 사용한다. 선형 분포하중×cubic 형상함수는 3점 Gauss로 정확 적분한다. 지반 스프링은 요소의 남은 길이에 대해 양 끝에 절반씩 분배한다. 굴착·지보 깊이는 요소 경계와 일치시켜 자동 위치 보정을 하지 않는다. 선형계는 부분 피벗 Gaussian 소거로 푼다.

반환 `stages`의 실제 계산 순서:

1. **before:** installDepth까지 굴착, 지보 없음. 변위 wbefore 계산.
2. **locked:** 같은 지반·하중 상태에서 지보 깊이에 정확히 −T₀를 외력으로 가한다. 평형 변위 wlocked를 계산한다. 이 단계의 지보 힘은 입력한 T₀와 정확히 같다.
3. **final:** height까지 더 굴착하고 해당 지반 스프링을 제거한다. `T=T₀+ka(wanchor−wlocked)`로 추가 힘을 계산한다. T<0이면 인장재 이완으로 보고 지보를 제거해 T=0 상태를 다시 푼다.

이렇게 해야 단순 스프링 초기절편을 T₀로 두어 실제 잠금 단계 힘이 T₀와 달라지는 오류를 피할 수 있다. 설치 기준 변위를 보존하므로 설치 시점이 바뀌면 같은 최종단면도 다른 해를 갖는다.

각 단계는 `nodes,profile,anchorForce,anchorAt,maxDisplacement,maxMoment,maxShear,soilForce,forceBalance,momentBalance,algebraicResidual`를 가진다. 모멘트·전단력은 요소 끝단력과 요소 분포하중의 평형으로 복원한다. 변위·모멘트는 mm 또는 kN·m/m 축에 직접 표시하며 임의 변형 곡선을 만들지 않는다.

이것은 **지보 설치 이력이 있는 구조 이상화**다. 지반 스프링에 주동·수동 상한이 없고, 비선형 p–y·토사 소성·물·시간·주변 지반 침하가 없다. 수평 지보 하나만 모델링한다. 실제 앵커의 경사·자유장·정착장·인발·강연선 시험을 대신하지 않는다. field-calibrated 해석이나 FHWA 전체 설계 절차를 구현했다고 표현하지 않는다.

`beamBenchmark({length,EI,uniformLoad,tipLoad,elements})`는 독립 검증용 자유단–고정단 보를 푸는 공개 보조 API다. 앱에 실무 보 계산기로 노출하지 않는다.

### `bottomModes(input)`

기본값: `height=6,gamma=18,surcharge=10,su=30,headDifference=3,flowLength=4,gammaSat=20,slabThickness=.8,gammaConcrete=24,slabHead=3`.

- **히빙:** 넓고 긴 균질 점토 굴착의 단순 극한을 선택한다. 측면전단을 제외한 하중 γH+q와 φu=0 평면변형 한계 `Nc su=(π+2)su`를 비교한다. 유한 폭·깊이 굴착에서는 Nc와 측면전단이 달라지므로 현재 지표를 일반 굴착 안전율로 제시하지 않는다.
- **보일링:** `i=Δh/L`, `ic=(γsat−γw)/γw`, `σ′바닥=(γsat−γw)L−γwΔh`. 한계 이상에서 음의 값은 안정된 흙의 인장응력이 아니라 평형 상실의 수식 연장이다. 입도·필터·경로에 따른 내부침식·파이핑 개시를 예측하지 않는다.
- **부상:** 상부 수압이 0인 슬래브의 단위면적 자중 γc t와 하부 압력 γw slabHead를 비교한다. 순상향 하중 u−γc t를 반환한다. 상부 구조물 하중·앵커·슬래브 휨·펀칭은 제외한다.

세 질문은 실제 계산이 다른 모형이며 각기 필요한 입력만 검사한다. 강도를 바꿨을 때 수리 경사나 슬래브 중량이 함께 변하는 잘못된 연동을 하지 않는다.

## 검증

`node --test tests/retaining.test.mjs`의 14개 테스트가 통과했다.

1. φ=30° → Ka=1/3, Kp=3, K0(NC)=.5. H=6, γ=18, q=10 → 자중 합력108, 상재20, 합계128 kN/m, 모멘트276 kN·m/m, 작용높이2.15625 m.
2. 수압에 K를 곱하지 않음, 수위 경계와 φ=0 극한, OCR 효과, 독립적인 100000구간 중점 적분의 합력·모멘트 대조.
3. Coulomb δ=β=0에서 Rankine과 일치. θ=45+φ/2. 마찰·경사 조합에서 쐐기 최대력과 닫힌 식 및 두 방향 힘 평형 대조.
4. 중력벽의 사각형 극한 자중·도심·모멘트 손계산. 전체·부분접촉압을 다시 적분해 N과 M 확인. 양압과 측압의 분리, 압축 접촉 불능 상태의 명시.
5. 표준 캔틸레버 균등하중: 자유단 `w=qL⁴/(8EI)`, 고정단 `M=qL²/2`, 반력 qL. 끝단 집중력: `w=PL³/(3EI)`, 고정단 M=PL. EI 배율 법칙.
6. 굴착 각 단계의 전역 힘·모멘트 평형, T₀의 정확한 도입, 잠금 변위와 힘 적합, 설치 시점 변경, .5→.25 m 요소 세분화.
7. 히빙·보일링·부상의 서로 다른 입력 의존성과 하중/저항 손계산.

기본 단계해의 예: 설치 전 최대변위 약5.702 mm, 잠금 직후 약4.981 mm, 최종 약5.648 mm. 잠금 T=100, 최종 T≈108.362 kN/m. 최종 최대 |M|≈137.755 kN·m/m. 이는 위 이상화에 대한 재현값이며 현장 예상값이 아니다. 기본 힘·모멘트 평형 잔차는 약10⁻¹⁰ 수준이다.

자체 HTML 렌더 검수에서 8개 질문이 기본값·기준값과 함께 오류 없이 그려졌고 390px 뷰포트의 수평 넘침이 없었다. 공통 앱 통합 검증은 root가 수행한다.

## 원출처

- [FHWA GEC 6, Shallow Foundations](https://www.fhwa.dot.gov/engineering/geotech/pubs/010943.pdf), Eqs.6-2~6-4, Fig.6-2: Coulomb 수직벽 제한식, Rankine, K0–OCR. 본 구현의 파괴쐐기 최적화는 힘 평형에서 직접 유도해 닫힌 식과 독립 대조했다.
- [USACE EM 1110-2-2502, Retaining and Flood Walls](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-2-2502.pdf), Chapter4: 합력 위치·활동·기초 힘 평형. 본 화면에 해당 문서의 허용기준·안전율을 임의 적용하지 않는다.
- [TU Delft, Euler–Bernoulli beam elements](https://teachbooks.tudelft.nl/computational-modelling/structural_linear/euler_bernouilli.html): cubic Hermite 보의 강성·일관 하중 정식화.
- [FHWA GEC 4, Ground Anchors and Anchored Systems](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/FHWA-IF-99-015.pdf), §§5.8.2,7.5: 히빙의 물리적 구분 및 앵커 잠금력이 벽에 전달되는 과정. [Idaho DOT 보관본](https://apps.itd.idaho.gov/apps/manuals/Materials/Materials%20References/FHWA-IF-99-015.pdf)에서도 원문을 확인했다. 위 작은 보–스프링 모형 자체가 해당 매뉴얼의 현장 설계법이라는 주장은 하지 않는다.
- [USACE EM 1110-1-1905, Bearing Capacity of Soils](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-1-1905.pdf), §2-7: 굴착 저면의 비배수 지지력과 형상에 따른 Nc. 현재는 넓고 긴 굴착 극한만 선택했다.

## 계획에서 남는 세부 항목

13: 점착력·인장균열, 층상 토압, 비등분포 하중, 아칭·겉보기 토압, 지진토압 및 곡면 수동파괴의 수치 비교.

14: 역T/L형 벽의 실제 힘 경로, 기초 지지력·침하 및 전체 활동면과의 연결 계산, 배수·필터 성능의 별도 현상.

15: 자유/고정지지법의 극한근입 비교, 다단 버팀보·비선형 지반 동원, 주변 지반침하, 실제 앵커 자유장·정착장·인발·시험, 계측 기반 사례. 이 항목들을 단순 참고 링크만으로 구현 완료 처리하지 않는다.
