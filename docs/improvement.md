# 선행재하·단계재하·연직드레인 학습 모형

이 묶음은 교육 계획 22의 **재하와 배수 촉진** 부분이다. 지반개량 전체를 완료한 것으로 표시하지 않는다. 사용자는 같은 최종 하중에서도 배수 경로가 시간을 바꾸는지, 하중 이력이 수압과 침하를 바꾸는지, 미리 압축한 흙에서 공사 후 추가 침하가 달라지는지를 구별해 볼 수 있다.

## 구현과 남은 범위

| 실험 | 실제 계산·도형 | 범위 밖 |
|---|---|---|
| `vertical-drains` | 정사각·정삼각 배열의 배분 면적, 동등 원형 셀, 수직·방사형·결합 압밀 곡선, 간격·투수 이방성·설치 교란 | 국부 3D 수두장, 부분 관입, 드레인 통수저항·막힘·접힘, 진공 경계 |
| `preloading` / `staged` | 영구하중→추가 성토→추가 성토 제거의 세 하중 증분과 시간 응답, 과잉수압·유효응력 평형 | 비선형 응력이력, 강도 증가에 따른 허용 성토, 현장 시공단계 해석 |
| `preloading` / `preload` | 완전 배수 선행재하→전량 제거→사용하중의 Cc/Cr 경로, 선행 침하·반발·공사 후 침하 분리 | 불완전 배수의 선행압밀응력 추정, 2차압축, 측방변형 |

계획 22 중 치환·동다짐·진동다짐, 모래/쇄석 다짐말뚝, 혼합처리·주입, 개량률과 응력분담, 보강재의 인장·인발, 복합지반 하중전달 등은 이 묶음에서 아직 구현하지 않았다. 드레인이 지반 강성·강도를 즉시 올리는 재료 요소인 것처럼 해석하지 않는다.

## 엔진 및 단위

`src/improvement.mjs`는 외부 import나 다른 엔진에 의존하지 않는 ESM namespace `Improvement`다. 공개 모형은 `{valid,errors,...}`를 반환하고 잘못된 입력을 묵시적으로 보정하지 않는다. 길이 m, 응력 kPa, 투수계수 m/s, 체적압축계수 1/kPa를 사용한다. 입력 시간은 일이며 내부에서 86400초/일을 적용한다. 기본 γw는 9.81 kN/m³다.

브라우저 descriptor는 `logKv`를 표시하고 `kv=10**logKv`로 엔진에 전달한다. mv 입력 숫자 3은 `3×10⁻⁴/kPa`다. 질문별 `activeFields`로 관련 입력만 검사한다. 각 질문에 기본 슬라이더 4개가 있고 나머지는 접은 세부 설정에 있다. 저장 조건의 실제 곡선을 그릴 때 `comparisonPlot:true`를 반환한다.

### 공통 수직 계단 응답

`averageDegree(Tv)`는 균일 초기 과잉수압, 배수면 과잉수압 0인 Terzaghi 1D 평균 응답이다.

```
cv = kv/(mv γw)
Hdr = H/2 (양면), H (상면만)
Tv = cv t/Hdr²
Uv = 1 − Σ[8/(π²n²)] exp(−n²π²Tv/4), n=1,3,5,…
```

Tv=0에서는 정확히 0, Tv<0.02에서는 초기 확산 경계층 표현 `2√(Tv/π)`를 사용한다. 이 범위의 생략 보정은 exp(−1/Tv) 차수다. 그 이후 급수항을 10⁻¹⁶ 미만까지 더한다. 음수·비유한 Tv는 NaN을 반환하는 저수준 보조 함수다. 사용자 모형은 호출 전에 유효성을 검사한다.

### `drains(input)`

주요 기본값: `spacing=1.5,pattern='triangle',drainDiameter=.066,khKv=2,kv=1e-9,mv=.0003,thickness=8,drainage='double',deltaStress=100,timeDays=100,smear='off'`. UI의 기본 관찰시간은 30일이다.

등변형률 방사형 압밀의 간소화 식:

```
배분 면적 A = s² (정사각), √3 s²/2 (정삼각)
de = 2√(A/π), n = de/dw > 5
ch = kh/(mv γw) = cv × (kh/kv)
Fn = ln(n) − 0.75
Fs = (kh/ks−1) ln(ds/dw)  [교란을 켰을 때]
F = Fn+Fs                  [드레인 통수저항 Fr=0]
Th = ch t/de²
Uh = 1 − exp(−8Th/F)
U = 1 − (1−Uv)(1−Uh)
S∞ = mv Δσ H, S(t) = U S∞, 평균 uₑ = Δσ(1−U)
```

배열 환산의 면적 일치값은 de/s=1.128379…와 1.050075…로, FHWA의 반올림값 1.13·1.05에 해당한다. 그림은 같은 x/y 길이 축척을 유지하고 실제 배분 다각형과 동등 면적 원을 구별한다. 원형 경계는 실제 시공 구획이나 물리적으로 존재하는 벽이 아니다.

드레인 표면은 uₑ=0, 셀 외곽은 방사형 유출 0이다. 드레인이 층 전체를 관통하며 길이 방향 수압손실이 없는 이상 배출구를 가정한다. 수직 배수조건은 별도로 상면만 또는 양면을 선택한다. 수직 배수와 방사형 배수의 침하량을 더하지 않고 Carrillo의 잔류비 곱으로 결합한다. 동일한 mv를 두 흐름 방향에 적용하므로 ch/cv=kh/kv다.

smear 선택 시 `smearDiameterRatio=ds/dw`, `smearPermeabilityRatio=kh/ks`이며 1≤ds/dw<n, kh/ks≥1이다. Fn은 n>5에서 사용하는 Hansbo 근사다. Fs는 균일한 저투수 원환대의 근사이며 천이영역을 포함하지 않는다. `smear='off'`일 때 비활성 교란 입력은 결과를 방해하지 않는다. 반발·대변형·비선형 물성은 이 모형의 범위 밖이다.

`t90RadialDays = de² F ln(10)/(8ch)`이며, 수직·결합 t90은 응답 함수를 0.9에 대해 이분법으로 역산한다. 반환 `curve`의 각 점은 시간, Uv, Uh, U, 각 침하, 평균 과잉수압을 가진다. 주요 반환: `cv,ch,cvDays,chDays,hdr,cellArea,influenceDiameter,n,fn,fs,f,t90VerticalDays,t90RadialDays,t90CombinedDays,finalSettlementMm,settlementMm,averageExcess,degree,curve`.

Δσ=0일 때 실제 압밀도는 정의할 수 없어 `degree:null`이고 침하·과잉수압은 0이다. 그래프의 Uv/Uh/U는 단위 재하 응답비라고 화면에 명시한다. 구현의 고정 두께 소변형 범위는 mvΔσ≤0.10이며 이 값은 설계 허용 변형률이 아니다.

### `staged(input)`

기본값: `permanentLoad=80,surcharge=40,addDays=30,removeDays=180,timeDays=200`이며 층 물성 기본값은 위와 같다. 하중 이력은:

1. t=0에 영구하중 +qP.
2. t=addDays에 임시 추가 성토 +qS.
3. t=removeDays에 추가 성토만 제거 −qS. 영구하중은 남는다.

각 하중 증분의 독립적인 시간 원점으로 정확히 선형 중첩한다.

```
S(t) = mv H Σ Δqj U(t−tj)
ūe(t) = Σ Δqj [1−U(t−tj)]
Δσ′평균 = Σ Δqj U(t−tj)
q(t) = ūe(t) + Δσ′평균
```

t<tj 항은 합에 포함하지 않는다. 재하·제하 모두 동일한 일정 mv·cv, 동일한 배수경계를 가정한다. 따라서 시간에 따라 변하는 Cc/Cr 소성 이력 모형이 아니며, 충분히 긴 시간 후 침하는 영구하중에 해당하는 `mv H qP`로 돌아간다. 이 제한을 결과 바로 아래에 표시한다.

각 하중 변화 직전·직후를 같은 시간 좌표에 넣어 하중과 수압의 점프를 그린다. U(0)=0이므로 침하는 연속이다. 음의 과잉수압은 정수압 대비 증분이며 절대 수압이나 불포화 흡입력을 예측하지 않는다. 포화 상태와 공동화 여부를 이 평균 모형으로 검토하지 않는다.

주요 반환: `increments,phase,load,averageExcess,effectiveIncrement,settlementMm,withoutSurchargeMm,finalSettlementMm,t90Days,curve`. `contributions`에는 각 증분이 현재 수압·유효응력에 기여하는 양이 있다. 단일 압밀도 하나를 산출하지 않아 제거 직후 분모가 바뀌는 혼란을 피한다. mv(qP+qS)≤0.10, 0≤addDays<removeDays를 검사한다.

### `preload(input)`

기본값: `sigma0=80,preloadLoad=120,serviceLoad=100,e0=1,cc=.3,cr=.05,thickness=8`. 초기 정규압밀 층의 대표 유효응력 하나를 사용한다. 모든 상태는 충분히 배수된 극한 상태이며, `staged`의 경과시간에서 불완전 배수 상태의 σ′p를 가져오지 않는다.

```
σ′p = σ′0 + Δqpre
e1 = e0 − Cc log10(σ′p/σ′0)            [선행재하 완료]
e2 = e1 + Cr log10(σ′p/σ′0)            [선행재하 전량 제거 완료]
σ′s = σ′0 + Δqservice
Δepost = Cr log10[min(σ′s,σ′p)/σ′0]
         + Cc max[0,log10(σ′s/σ′p)]    [사용하중에 의한 추가 압축]
e3 = e2 − Δepost
S = H0 Δe/(1+e0)
```

미시행 조건의 공사 후 침하는 `H0 Cc log10(σ′s/σ′0)/(1+e0)`다. 선행재하 중 침하, 제거 후 반발, 제거 후에도 남는 선행 침하, 공사 후 추가 침하를 모두 같은 `H0/(1+e0)` 기준으로 계산한다. 층두께 변화를 두 번 적용하지 않는다.

선행재하가 사용하중보다 작으면 재재하 중 새 σ′p를 지나 다시 Cc 구간으로 진입한다. 선행재하가 사용하중 이상이면 재재하가 Cr 구간에만 있으므로, **이 일정 Cr 모형에서는 더 큰 선행재하가 공사 후 추가 침하를 계속 감소시키지 않는다.** 이 점을 결과에 표시한다. 선행재하 효과를 입력에 비례하여 임의로 과장하지 않는다.

주요 반환: `path,peak,serviceStress,preloadE,unloadedE,serviceE,preSettlementMm,reboundMm,retainedSettlementMm,postServiceSettlementMm,withoutPreloadSettlementMm,reductionMm,finalSettlementMm,preconsolidationAfterRemoval,finalOCR`. 0≤Cr≤Cc, 양의 초기 응력·층두께, 음이 아닌 모든 상태의 간극비를 검사한다. Cc/Cr와 e0는 교육용 입력이며 시험으로 추정한 값이라는 주장을 하지 않는다.

## 검증

`node --test tests/improvement.test.mjs`에 독립 검증 18개가 있다.

- Terzaghi 표의 Tv≈0.19673(U50), 0.84809(U90) 및 0·장기 극한.
- 방사형 Th=F ln2/8에서 Uh=0.5가 되는 독립 닫힌 해.
- 정삼각 배분 면적과 원형 영향 셀 면적의 일치.
- kv 2배·시간 절반의 응답 일치, mv 2배·시간 2배의 응답 일치 및 최종침하 2배.
- 양면→일면의 수직 t90 4배, 방사형 t90와 최종량 불변.
- 간격 감소·kh 증가·교란 저항의 영향과 교란 없는 극한.
- kv·간격·배수경계 조합에서 0≤Uv,Uh,U≤1, 시간 단조성 및 U≥max(Uv,Uh).
- 추가 성토 0과 동시 재하의 독립 단일 계단 해 일치.
- 추가·제거 순간 수압 점프와 침하 연속, 각 시간의 q=Δσ′+u 평형, 장기 반발.
- 선행재하의 손계산, 선행재하 0, 부분 선행재하에서 재압축·처녀압축 분리, Cr=Cc의 효과 0, 서비스 하중 이상에서 일정 Cr의 한계.
- 부적절한 기하·물성·시간 순서·음의 간극비를 명시적으로 거절.

두 descriptor의 3개 질문을 실제 CSS로 렌더하고 저장 조건 곡선·한글 배치·390px 가로 넘침을 확인했다. 390px에서 가로 넘침이 없었다. 각 독립 입력의 양 끝과 간격·투수계수·교란·배열 및 선행/사용하중 조합의 렌더 70건에 비유한 값이 없었고, 물리적으로 맞지 않는 조합 4건은 입력 오류로 반환했다. 학습 엔진의 수학적 검증이며 현장 또는 전문가 검증 완료를 뜻하지 않는다.

## 대조한 1차 출처

1. [FHWA NHI-16-027, Ground Modification Methods Reference Manual, Volume I](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi16027.pdf), 제2장 인쇄 p.2-32–33, 식 2-1·2-2. 원문 PDF를 내려받아 시간식·Fn·1.05/1.13 배열 환산을 대조했다. 원문은 해당 방사형 시간식이 수직 배수를 포함하지 않는다고 구분한다.
2. [Abuel-Naga 등 (2012), Design curves of prefabricated vertical drains including smear and transition zones effects](https://doi.org/10.1016/j.geotexmem.2011.10.007), “The proposed modified Hansbo theory”에 제시된 **기본** Hansbo 식. 여기서는 논문의 천이영역 확장식을 구현하지 않고 n>5의 Fn 및 균일 교란 Fs만 사용한다.
3. [Oshima, Takada & Nomura (2005), Efficiency of plastic board drain on self-weight consolidation of soft clay](https://www.issmge.org/uploads/publications/1/22/STAL9781614996569-1231.pdf), §4.1 식 2의 Carrillo 결합 관계를 확인했다. 해당 연구의 비선형 자중압밀 전체를 구현했다는 뜻이 아니다. 원 논문의 서지사항: [Carrillo (1942)](https://doi.org/10.1002/sapm19422111).
4. [FHWA/IN/JTRP-2015/11](https://rosap.ntl.bts.gov/view/dot/29538/dot_29538_DS1.pdf), A.4.3.5의 k–mv–cv 관계.
5. [Schiffman (1958), Consolidation of Soil Under Time-Dependent Loading and Varying Permeability](https://onlinepubs.trb.org/Onlinepubs/hrbproceedings/37/37-039.pdf), 일정 물성·소변형에서 시간 재하를 다루는 이론적 근거. 본 구현의 유한한 세 계단 중첩은 일정 계수 선형식에 대한 직접 적용이며 논문의 비선형 투수계수 확장까지 포함하지 않는다.
6. [FHWA NHI-06-088, Soils and Foundations Reference Manual Volume I](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06088.pdf), §7.5.1–7.5.3의 응력 구간별 압축·재압축 및 Terzaghi 압밀. 선행재하 경로의 구간식을 이 관계에서 직접 구성했다.

이 문서는 최신 국내 설계기준의 적합 판정이나 실무 계산서가 아니다. 현장 설계를 위한 적용 판본·국내 기준 대응·시험 및 계측 보정은 후속 범위다.
