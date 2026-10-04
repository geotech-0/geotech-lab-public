# 압축성·응력이력·압밀 시간

2026-09-22 작성. 학습계획 v3의 D01(k–mv–cv 연결)과 D03(배수 완료 제하·재재하 경로)을 구현한다. 서로 다른 세 모형을 계산 단계와 화면에서 분리한다. 실무 계산서, 다층 압밀, 방사형 배수, 단계 재하, 대변형 수치해석을 완료했다는 뜻은 아니다.

## 입력과 계산 API

`Consolidation.stressHistory({sigma0,preconsolidation,sigmaUnload,sigmaFinal,e0,cc,cr,thickness,stage})`

- 응력 단위 kPa, 층두께 m, 간극비·Cc·Cr 무차원.
- stage는 `initial`, `unload`, `reload`. UI는 관찰 단계 선택으로 현재 점·OCR·변위를 바꾼다.
- 초기 선행압밀응력 ≥ 초기 유효응력, 0 < 제하 후 응력 ≤ 초기 응력, 재재하 후 응력 ≥ 제하 후 응력, 0 ≤ Cr ≤ Cc, Cc > 0을 요구한다.
- `stages[]`는 단계별 stress, e, preconsolidation, ocr, settlement, stepSettlement, thickness를 가진다. 두 settlement의 단위는 m이며 양수는 침하, 음수는 팽창이다.
- 반환 `settlementMm`, `stepSettlementMm`는 선택한 단계의 mm 표시값이다. `activePath`는 선택한 단계까지의 e–logσ′ 경로, `reference`는 같은 이선형 관계의 참조선이다.
- `tangentMv`(1/kPa)와 `constrainedModulus`(kPa)는 현재점에서 **추가 재하**할 때의 접선 강성이다. Cr=0인 이상화에서 reciprocal modulus를 Infinity 숫자로 전달하지 않고 null로 전달한다. 화면은 해당 경우만 무한 강성 이상화로 설명한다.

선행압밀응력을 p, 초기 응력을 σ₀, 제하 응력을 σu, 최종 응력을 σf라 할 때:

```
eᵤ = e₀ − Cr log10(σu/σ₀)
e𝒻 = e₀ − Cr log10(σf/σ₀)                         (σf ≤ p)
e𝒻 = e₀ − Cr log10(p/σ₀) − Cc log10(σf/p)         (σf > p)
S  = H₀(e₀ − e)/(1+e₀)
OCR = 현재까지 최대 유효응력 / 현재 유효응력
```

압력비는 수치상 `log10(a)−log10(b)`로 계산한다. 팽창은 Cr 경로로 계산하므로 Cc로 발생한 과거 처녀압축 침하의 단순 음수가 아니다. 동일 Cr로 제하·재재하하는 이선형 모형이므로 원래 응력으로 되돌아오면 간극비가 복원된다. 실제 이력곡선의 비선형·비가역 특성은 단순화했다. σf가 초기 p를 넘으면 최종 p를 σf로 갱신하여 OCR=1이 된다.

각 단계는 배수가 끝난 상태다. 굴착깊이·상재면적·기초 자중으로 실제 응력변화를 계산하지 않는다. 사용자 입력 σ는 별도 하중 모형 또는 해석에서 정한 대표층 유효응력이다. H/(1+e)의 보존을 이용해 단계별 층두께를 일관되게 계산한다. 음의 예측 간극비는 오류다.

`Consolidation.primary({k,mv,thickness,deltaStress,timeDays,drainage,gammaW=9.81})`

- k: m/s; mv: 1/kPa=m²/kN; H: m; Δσ: kPa; 시간: 일; γw: kN/m³.
- UI의 k 표시 숫자 1은 1×10⁻⁹ m/s, mv 표시 숫자 3은 3×10⁻⁴ /kPa다. 숫자와 슬라이더가 같은 표시 배율을 쓴다.
- `drainage:'single'`은 상면 배수·하면 불투수, `'double'`은 양면 배수다.
- cv는 **독립 입력이 아니다**: `cv=k/(mvγw)`(m²/s), `cvDays=cv×86400`(m²/일).
- Hdr=H 또는 H/2, `Tv=cvDays×timeDays/Hdr²`, `S∞=mvΔσH`, `S(t)=U(Tv)S∞`.
- 반환: cv, cvDays, hdr, tv, degree(0~1), settlement/settlementMm, finalSettlement/finalSettlementMm, averageExcess(kPa), t50Days, t90Days, profile[{depth,excess}], timeCurve[{days,degree,settlement,settlementMm}].
- Δσ=0은 허용한다. 이 경우 실제 압밀도 degree=null, 침하·과잉수압은 0이다. t50Days·t90Days는 물성으로 정해지는 응답 시간척도로 남지만, 사용자에게 실제 무재하 도달시간으로 표시하지 않는다.
- k,mv,H,γw는 양수, Δσ·시간은 음수가 아니어야 한다. NaN·무한·미입력·문자열을 물리값으로 강제 변환하지 않는다.
- 고정 H·소변형 비교 화면의 구현 범위는 `mvΔσ≤0.10`. 10%는 설계 허용치 또는 정확도 보장선이 아닌, 대변형 결과를 이 모형으로 표시하지 않기 위한 명시적 제공 범위다. 큰 변형 입력을 10%로 조용히 자르지 않고 오류로 반환한다.

## 깊이별 수압과 평균 압밀도

균일 초기 과잉수압 u₀=Δσ, 일정 물성, 일시 재하를 사용한다. 수압은 정수압을 제외한 추가분이다. z는 상면으로부터의 깊이, n=1,3,5,…이며 다음 확산방정식 해를 쓴다.

```
∂uₑ/∂t = cv ∂²uₑ/∂z²
uₑ/Δσ = Σ [4/(nπ)] sin[nπz/(2Hdr)] exp[−n²π²Tv/4]
U       = 1 − Σ [8/(n²π²)] exp[−n²π²Tv/4]
```

양면은 0≤z/Hdr≤2, 상면만 배수는 0≤z/Hdr≤1인 대칭해의 절반을 사용한다. 배수면 uₑ=0, 한면 배수의 바닥은 ∂uₑ/∂z=0이다. t=0 표시는 이상적인 일시재하 직후의 극한으로 내부 uₑ=Δσ, 배수 경계 uₑ=0이다. 실제 유한 재하속도는 구현하지 않았다.

Tv≥0.02에서는 Fourier 급수의 잔여 진폭이 1e−16 미만일 때 중단한다. Tv<0.02에서는 동일한 확산해의 짧은 시간 경계층 표현을 사용한다.

```
U = 2√(Tv/π)
uₑ/Δσ = 1 − erfc[(z/Hdr)/(2√Tv)] − erfc[(2−z/Hdr)/(2√Tv)]
```

첫 생략 영상항은 exp(−1/Tv) 차수이며 전환점에서 2e−22 이하 규모다. erfc(x≥6)는 2.2e−17보다 작아 0으로 평가한다. 0·1 경계의 1e−12 미만 부동소수 잡음만 반올림하며, 비물리 입력을 보정하는 용도로 clamp하지 않는다. 표시용 profile은 초기 얇은 배수 경계층에도 점을 추가한다.

`averageDegree(Tv)`, `excessRatio(zOverHdr,Tv)`, `timeFactorForDegree(U)`를 공개한다. 마지막 함수의 정의역은 0≤U<1이다. 이론상 U=100%에 유한한 시간을 부여하지 않는다. T50=0.196730739524, T90=0.848085408046이며 교재의 0.197·0.848은 반올림 근사다.

## 2차압축

`Consolidation.secondary({cAlpha,eAtStart,thicknessAtStart,startDays,endDays})`

- 독립 입력 Cα, 기준시점 간극비 e₁, 같은 시점 층두께 H₁(m), 재하 시작 이후 기준시점 t₁과 관찰시점 t₂(일).
- Cα≥0, e₁≥0, H₁>0, 0<t₁≤t₂를 요구한다.
- Δe=Cα log10(t₂/t₁), Sα=H₁Δe/(1+e₁), e₂=e₁−Δe.
- 반환 settlement(m), settlementMm, endE, deltaE, logCycles, modifiedIndex=Cα/(1+e₁), curve.
- 1차압밀 후 관찰한 장기 구간을 별도로 비교한다. primary 탭의 t90을 자동 t₁로 대입하거나 S∞와 자동 합산하지 않는다. 실제 1차·2차 변형은 중첩될 수 있으므로 실제 전 과정을 분리된 로그식이 재현한다고 설명하지 않는다.
- 기준시점에 대한 H₁/(1+e₁)를 사용한다. FHWA 식 7-10의 원표기는 Hc, e₀이나, 모형의 기준을 혼용하지 않도록 같은 시점의 H·e로 명시했다.

## 화면

`ConsolidationLabs`는 `compression`과 `consolidation`을 제공한다. 전자는 단계 선택과 실제 e–logσ′ 경로를, 후자는 1차압밀/2차압축 탭을 제공한다. 두 탭은 입력·모형·도표가 모두 바뀐다. `activeFields(data,question)`로 해당 질문의 입력만 활성 범위 검사·비교에 포함할 수 있다.

1차압밀은 왼쪽의 깊이별 uₑ와 오른쪽 시간–침하를 함께 표시한다. 왼쪽 깊이와 오른쪽 침하량은 모두 아래 방향 증가이며 각 단위를 명시한다. A/B 비교는 같은 축 범위에서 두 결과를 보여준다. 결과 카드와 주요 수식·현재 수치 대입을 기본 화면에, 전체 급수·가정·출처를 상세에 둔다.

## 직접 확인한 원출처

1. [FHWA NHI-06-088, Soils and Foundations Volume I](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06088.pdf): 공식 PDF를 내려받아 §7.5.1–7.5.4, 식 7-2·7-4·7-8·7-9·7-10, 표 7-3·7-4를 대조했다. e–log 관계, 응력이력, 배수거리, 시간계수, 2차압축의 근거다. 본 구현의 제하·재재하 동일 Cr 및 일정 물성은 명시한 학습 근사다.
2. [University of Hawaiʻi, Stephen J. Martel, GG454, Consolidation Mechanics Review (2018)](https://www.soest.hawaii.edu/martel/Courses/GG454/Lec_41_2018.pptx.pdf): 슬라이드 8의 cv 단위·관계, 10의 배수거리, 16–17의 Fourier 수압 해를 확인했다. 일부 슬라이드 문장의 Tv 표기는 오타가 있으므로 차원해석·코드·FHWA 식 7-8과 일치하는 `Tv=cv t/Hdr²`를 사용했다. 슬라이드의 약 92% 같은 간이 수치는 기준값으로 사용하지 않는다.
3. [FHWA/IN/JTRP-2015/11, Engineering Properties of Marls](https://rosap.ntl.bts.gov/view/dot/29538/dot_29538_DS1.pdf), Appendix A.4.3.5: cv=k/(mvγw)와 실제 물성의 응력 의존을 교차 확인했다. 보고서의 특정 marl 시험 정수를 기본 예제에 사용하지 않았다.

## 독립 검증

`tests/consolidation.test.mjs`는 다음을 포함한다.

- H₀=6m, e₀=0.8, σ′₀=100kPa, 초기 σ′p=200kPa, σ′u=50kPa, σ′f=300kPa, Cc=0.3, Cr=0.05: 제하 −50.171666mm, 재재하 순변위 +226.262925mm, 직전 제하 상태 대비 +276.434591mm. 층별 고체부피 보존.
- k=1e−9m/s, mv=3e−4/kPa, H=6m, Δσ=100kPa, 양면배수, 100일: cv=3.39789330615e−7m²/s, U=0.637489331516, S∞=180mm, S(100일)=114.748079673mm, t90=259.991182904일.
- k 두 배 → S∞ 불변·동일 U 시간 절반. mv 두 배 → S∞·동일 U 시간 각각 두 배. 양면→한면 → 동일 U 시간 네 배·S∞ 불변. H 두 배 → S∞ 두 배·시간 네 배.
- 깊이별 uₑ 수치 적분과 U의 일치, 초기·경계·장기 조건, 짧은 시간 표현과 독립 긴 급수의 일치.
- 별도 명시적 유한차분법으로 확산 PDE를 풀어 profile 및 평균 U를 확인. 급수 함수의 코드를 그대로 복제한 검사에 의존하지 않는다.
- 2차압축 Cα=0.01, e₁=0.8, H₁=6m, t₁=365일, t₂=3650일 → Δe=0.01, Sα=33.333333mm, e₂=0.79.
- 시간·응력·계수의 영점·음수·누락·역전·0하중·변형범위 초과를 확인한다.

모형과 소프트웨어의 정확성을 확인하는 검사이며 현장 적용성·실험실 재현성·사용자 학습효과 검증을 대신하지 않는다.

구현 시점 결과: 모델 검사 26개 통과. 공통 스타일·입력 도우미를 사용하는 독립 렌더 하네스에서 390/768/1440px × 11가지 조건의 33개 조합을 확인했다. 기본·제하·동일점·Cr=0·t=0·한면배수·k/mv 배율·무재하·2차압축·동일시점 조건에서 가로 넘침, 비유한 SVG 값, 스크립트 오류, 슬라이더/숫자 입력값 불일치가 없었다. 데스크톱·모바일 결과를 직접 보며 겹침을 수정했다. 전체 앱의 탐색·저장·되돌리기 검사는 통합 후 별도 수행 대상이다.
