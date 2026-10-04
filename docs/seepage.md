# 침투·투수 학습 모형

이 묶음은 정상 포화 Darcy 흐름을 직접 계산하여 수두·유량·수압의 변화를 보여준다. 설계 계산서나 현장 침투해석의 대체물이 아니다. 수치해의 수렴과 유량 보존을 확인하며, 이 검증을 현장 적용성 또는 전문가 검증으로 표현하지 않는다.

## 구현된 실험

| 실험 key | 실제 입력과 결과 | 주요 구분 |
|---|---|---|
| `darcy`, flow | Δh, L, A, log₁₀k → Q, v, 전수두 직선 | 총유량 Q, Darcy 속도 v, 공극 평균속도 v/n |
| `darcy`, upward | Δh, L, γsat → i, ic, σ·u·σ′ | 한계 이후 음의 σ′는 선형식의 경고용 연장값 |
| `darcy`, constant | 채수량 V, t, L, A, Δh → k | 관측값에서 역산, k를 입력하는 순방향 유량과 다름 |
| `darcy`, falling | h₁, h₂, t, L, A, 관 면적 a → k | 감소 수두, 지수 곡선 및 질량수지 |
| `seepage` | 벽 깊이, 양쪽 h, kz, kx/kz → 실제 2D h·u·유선·유량 | 포화 영역 및 고정 수두 경계, 자유수면 제외 |
| `layered-seepage` | A·B 두께와 k, 층 순서, Δh, 면적 → Q, kv, 내부 h·u | 층 순서만 반전하면 Q·kv 불변, 같은 깊이의 내부 수압은 변함 |
| `capillary` | 수위 깊이, 지정 포화 모관대 높이, 관찰 깊이 → 부호 있는 u | 모관대 위 불포화 영역은 미해석이며 u=0으로 대체하지 않음 |

`SeepageLabs`는 위 네 개 navigation descriptor를 제공한다. `darcy.compute(data, question)`는 선택 질문에 맞는 모형만 계산한다. 각 입력의 물리적 부적합을 자동 보정하지 않는다. 저장 기준선이 실제 그려지는 Darcy와 모관 그림만 `comparisonPlot:true`를 반환한다. 층상 그림의 회색 점선은 **현재 층 순서의 반전 해**이며 저장 기준선이 아니다. 2D 그림은 현재 해만 표시하고 기준값은 수치 결과에서 비교한다.

## 단위·부호

- 길이 m, 시간 s, 투수계수 m/s, 응력·수압 kPa, 단위중량 kN/m³.
- x는 오른쪽 양수, z는 지표 아래 깊이 양수이다. 위치수두는 −z, 전수두 h=u/γw−z, 따라서 u=γw(h+z).
- γw=9.81 kN/m³. 속도수두를 무시한다.
- 2D 유량은 화면에 수직한 폭 1 m당 m³/s/m=m²/s이다. 화면에서는 L/min/m로 표시한다.
- v는 전체 단면 기준 Darcy 속도이다. 실제 공극 평균속도는 균일한 공극률 n을 가정할 때 v/n이다.

## 순수 엔진 API

`src/seepage.mjs`는 외부 의존성이 없는 `export const Seepage = (() => {...})();`이다. 아래 함수는 입력 오류 시 `{valid:false, errors:[...]}`를 반환한다.

### `darcy(input)`

기본값은 `headDifference=2,length=4,area=.2,logK=-4,porosity=.35,gammaSat=20,gammaW=9.81`이다.

`k=10^logK`, `i=Δh/L`, `v=ki`, `Q=kiA`. 반환값에 `k,gradient,velocity,poreVelocity,flow,flowLitresMinute,criticalGradient,stableSkeleton,profile,upwardBase`가 있다.

상향 침투 분포는 지표 h=0, 바닥 h=Δh인 균질한 포화토의 1D 해이다. `h(z)=iz`, `σ=γsat z`, `u=γw(1+i)z`, `σ′=[γsat−γw−iγw]z`, `ic=(γsat−γw)/γw`. `i≥ic`이면 `stableSkeleton=false`; 이때 음의 수식값을 안정적인 흙의 인장응력으로 해석하지 않는다. 입자 유실, 보일링 이후 변형, 파이핑 개시 또는 안전율을 예측하지 않는다.

### `constantHead(input)` / `fallingHead(input)`

정수위 기본값 `headDifference=1,time=600,length=.2,area=.01,volume=.0005`. `k=VL/(AtΔh)`와 일정 Q=V/t의 채수량 직선을 반환한다. V=0은 k=0의 시험 결과로 허용한다.

변수위 기본값 `initialHead=1,finalHead=.5,time=600,length=.2,area=.01,tubeArea=.0001`. `k=aL/(At) ln(h₁/h₂)`, `h(t)=h₁exp[−kAt/(aL)]`. h₁>h₂>0이 필요하다. 반환 `curve`는 입력한 양 끝 측정값과 일정 k로 복원한 해이며, 별도 측정 자료가 아니다. 온도·점성 보정, 장치 손실, 시료 변형은 계산하지 않는다.

### `layered(input)`

기본값 `thicknessA=2,thicknessB=2,logKA=-4,logKB=-6,headDifference=2,area=1,order='AB',gammaW=9.81`. `order`는 지표에서 아래로 AB 또는 BA이다. 모든 층은 같은 단면적의 포화토이고 상향 정상 흐름이다.

`v=Δh/(LA/kA+LB/kB)`, `Q=Av`, `kv=(LA+LB)/(LA/kA+LB/kB)`. 층별 `ij=v/kj`로 전수두를 연속 연결하고 `u=γw(h+z)`를 계산한다. `layers`, `reversedLayers`, `profile`, `reversedProfile`, `midpoint`, `reversedMidpoint`, `interface`를 반환한다. 그림은 정확한 경계값으로 꺾은선을 그려 층 경계를 가로지른 잘못된 보간을 피한다.

참고값 `parallelK=(kALA+kBLB)/(LA+LB)`도 반환하지만 현재 그림·Q는 직렬 흐름이다. 수평 등가값으로 현재 수직 유량을 계산하지 않는다. 각 층의 골격 응력·유효응력 안정성이나 침식을 판정하지 않는다.

### `capillary(input)`

기본값 `waterDepth=3,capillaryHeight=1,observationDepth=2.5,gammaW=9.81`. `0≤hc≤zw≤8`을 요구한다. 지표 깊이 `top=zw−hc` 이상에서만 `u=γw(z−zw)`를 계산한다. 상단보다 위의 `pore`와 `pressureHead`는 `null`, `region='unmodeled'`이다. 포화 모관대의 높이는 외부에서 지정한 조건이다. 입경으로 모관 높이를 예측하거나 SWCC·불포화 k·불포화 강도를 계산하지 않는다.

### `wall(input)` / `velocityAt(result,x,z)`

화면 기본값 `wallDepth=6,headUp=6,headDown=1,logK=-4,logAnisotropy=0,nx=48,nz=24,width=24,depth=12,boundaryMode='reservoir',tolerance=1e-10,maxIterations=12000,visuals=true`.

- `kz=10^logK`, `kx=kz·10^logAnisotropy`.
- `headUp`은 이름과 관계없이 **왼쪽**, `headDown`은 **오른쪽** 지정 수두다. 역전도 허용한다.
- x=−12~12, z=0~12 m. 지표 양쪽과 양쪽 수직 외곽에 해당 수두를 지정한다. h≥0이므로 모든 영역을 포화 상태로 유지한다.
- 바닥과 x=0의 z=0~D 차수벽 면은 무유량. 벽은 두께 0의 내부 경계다. D는 격자 행 경계와 일치해야 하며 자동 반올림하지 않는다.
- `boundaryMode='lateral'`는 상부도 무유량으로 두는 별도 검증 경계이며 UI에는 노출하지 않는다. 이 모드의 D=0은 정확한 1D 선형해와 비교할 수 있다.

반환값은 `heads,cells,faceX,faceZ,kx,kz,ratio,dx,dz,converged,iterations,residual,normalizedResidual,totalIn,totalOut,throughWall,massBalance,maxCellImbalance,exitGradientMax,exitGradient2m,contours,streamlines,arrows`를 포함한다. `faceX`는 오른쪽, `faceZ`는 아래쪽 유속이 양수다. `throughWall`은 중앙면 전체 적분으로 왼쪽→오른쪽이 양수다. 미수렴 시 `valid=false`이며 유선·등수두선을 생성하지 않는다.

## 2D 이산화·그림

셀 중심 유한체적 보존식으로 `kx hxx+kz hzz=0`을 푼다. 내부 수평·수직 면 conductance는 단위 폭당 `kx dz/dx`, `kz dx/dz`; 지정 수두 외곽은 셀 중심에서 면까지 반 간격이므로 conductance가 2배이다. 막힌 벽·바닥 면 conductance는 0이다. 같은 면을 공유하는 두 셀은 동일한 유량을 반대 부호로 사용한다.

형상과 이방성만으로 hL=1,hR=0의 해를 구해 캐시한다. 실제 h는 `hR+(hL−hR)hunit`. 따라서 양쪽 h의 동일 상수 이동과 k의 동일 배율 변경이 이론과 일치한다. SOR 완화계수 1.72, 최대 12000회. 10회마다 각 셀의 `|ΣCh−diag·h|/diag` 최대값이 10⁻¹⁰ 미만인지 확인한다. 화면에는 실제 수두 단위 잔차, 반복 횟수, 유입/유출 상대차를 접지 않은 상태로 표시한다.

등수두선은 셀 중심 h에 marching squares를 적용하며 차수벽을 가로지르는 보간을 건너뛴다. 유선은 면 유량으로 복원한 각 셀 내 속도장에서 중점법으로 적분한다. 시작점은 양의 유입 면 유량의 등분점이며 무작위 궤적이 아니다. 선분이 차수벽을 관통하면 중단하고 외곽을 벗어나면 경계까지 잘라낸다. 유속 화살표는 실제 유동 방향을 사용한다. 화면 단면 가로/세로는 동일한 21 px/m이다.

물리적 이방성 좌표에서 유선과 등수두선이 반드시 직교하지 않는다. 국부 출구경사 최대값은 0.5 m 경계 셀의 값이며 격자 의존성이 있다. 별도 주요 결과로 벽 바로 옆 저수두 지표 2 m 구간의 평균 수직 경사를 표시한다. 두 값 모두 파이핑 안전율이 아니다.

D=0의 `reservoir` 경계는 지표 중앙에서 지정 수두가 불연속이어서 국부 특이점을 포함한다. D=12는 양쪽 영역을 완전히 분리하며 Q=0이다. 외곽 경계는 유한한 24×12 m 영역에 지정되어 있으므로 반무한 지반·굴착 자유수면·현장 양수량 해석으로 해석하지 않는다.

## 검증 결과

`node --test tests/seepage.test.mjs`로 검증한다. 손계산 및 경계조건에 독립적인 비교를 포함한다.

- Darcy 기준: Δh=2 m, L=4 m, A=.2 m², k=10⁻⁴ m/s → i=.5, Q=10⁻⁵ m³/s=.6 L/min. n=.4이면 v공극=.000125 m/s.
- 상향 임계 i에서 σ′=0; 더 큰 i에서 골격 유지 불가 표시.
- 정수위 기본 시험 → k=1/60000 m/s. 변수위 기본 시험 → k=ln(2)/300000 m/s; 시간 중간 수두는 √.5 m.
- 층상 기본 두 층 → kv=4/2020000 m/s, v=2/2020000 m/s. 순서 반전 시 Q·kv 같고 내부 수압 변화. 각 층 ki 동일, 경계 h·u 연속. 동일 k 및 수두차 0의 극한도 확인.
- 모관대: 상단 u=−9.81 kPa, zw=3 m에서 z=2.5 m의 u=−4.905 kPa, 수위 u=0, 미해석 영역 null.
- 2D 동일 수두 → 모든 유속·유량 0, 정수압; 전체 깊이 벽 → 양쪽 고정 h, 통과유량 0.
- 벽 없는 lateral 해: h가 정확한 직선, Q=kΔh·depth/width=0.00025 m²/s.
- k 10배 → 모든 h 동일, Q 10배, 유선 좌표 동일. 공통 h 상수 이동 → Q 동일·u 이동. 역방향 수두 → Q 부호 반전.
- 벽 면과 바닥 면 유량 정확히 0. 전 셀 최대 수두 원리, 지역 셀 유량 보존, 전체 외곽 유량 보존. 이방성 변화, 형상 크기 2배의 유사성, 선의 벽 비관통을 확인.
- 강제 1회 반복의 미수렴 및 잘못된 격자·벽 깊이·물리 입력을 명시적으로 거부.

기본 D=6 m, hL=6 m,hR=1 m,kx=kz=10⁻⁴ m/s의 격자 비교:

| 격자 | 중앙 통과유량 (m²/s) | 출구 2 m 평균 경사 | 유입/유출 상대차 |
|---|---:|---:|---:|
| 24×12 | 0.0002594139747 | 0.2160476 | 3.31×10⁻⁸ |
| 48×24 | 0.0002649090269 | 0.2233688 | 1.45×10⁻⁷ |
| 96×48 | 0.0002677136560 | 0.2272282 | 6.33×10⁻⁷ |

유량의 연속 격자 상대차는 약 2.1%→1.05%로 감소한다. 잔차 허용오차가 동일하면 격자가 늘 때 전체 유량 상대차가 같지 않을 수 있다. 위 유입/유출 차이는 모두 2×10⁻⁶보다 작다. 기본 48×24는 학습 중 조작성을 위한 선택이며 특정 출구경사의 설계 정밀도를 보증하지 않는다.

## 원출처와 적용

1. [USACE EM 1110-2-1901, Seepage Analysis and Control for Dams](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-2-1901.pdf), §2-1 Darcy 법칙, Chapter 4 경계조건·Laplace 식·이방성과 수두경사·침투력. 위 1D 층상식은 Darcy와 각 층 유량 연속식에서 직접 유도한 해석해이다.
2. [USBR Research Report No.3, Soils Tests Computer Programs](https://www.usbr.gov/tsc/techreferences/research/R03.pdf), 정수위·변수위 투수시험 계산식. SI 환산을 별도로 명시한다.
3. [USGS TM 6-A46, MODFLOW 6 Groundwater Flow Model](https://pubs.usgs.gov/tm/6a46/tm6-a46.pdf), 셀 중심 수두와 면 conductance를 이용한 보존 계산 원리. 이 도구는 자체 소형 solver이며 MODFLOW 실행 결과가 아니다.
4. [FHWA NHI-06-088, Soils and Foundations Vol. I](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06088.pdf), §2.10: 모관상승과 음의 간극수압, 불포화 거동의 구분. 본 실험은 지정된 포화 모관대의 정수압만 사용한다.
