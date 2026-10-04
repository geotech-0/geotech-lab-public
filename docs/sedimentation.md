# 기존 흙의 분류 질문 안에 넣는 침강 입경 읽기

검토일: 2026-09-22. 이 구현은 학습용 물리 모형·화면·독립 수치 대조이며 실제 사용자 시험이나 외부 전문가 검토가 아니다.

## 선택한 최소 범위

`soil`의 네 번째 질문을 `sedimentation / 침강으로 입경 읽기`로 추가한다. 메뉴 수는 늘리지 않는다. 유효깊이 L, 경과시간 t, 고정 기준의 입자비중 Gs, 물 온도 T라는 4개 입력을 동시에 조작한다. 출력은 등가입경, L/t 속도, Reynolds 수이며 시간–입경 관계를 로그 축에 그린다. 통과질량 백분율이나 입도곡선은 원자료 없이 생성하지 않는다.

실험 수면에서 관찰점까지 종말속도로 가라앉는 구의 **등가입경**을 구한다. 실제 비중계의 읽음값에서 유효깊이 L을 자동 산정하는 기기 보정, 메니스커스·분산제·온도에 따른 농도 읽음 보정은 포함하지 않는다. 따라서 다른 질문의 체별 질량·LL·PL·USCS 결과를 침강 결과에 섞지 않는다.

## 원식과 단위

중력–부력–Stokes 항력 평형:

```
(πd³/6)(ρs−ρw)g = 3πμdv
v = (ρs−ρw)gd²/(18μ) = L/t
d = sqrt[18μL / ((ρs−ρw)gt)]
Re = ρwvd/μ
```

SI 계산: μ(Pa·s), L(m), t(s), ρ(kg/m³), g=9.80665 m/s². 입력의 cm를 100으로, 분을 60배로 환산한다. d(mm) = 1000d(m), d(μm) = 1000d(mm). 점성 지배 조건 확인은 Re≤0.1로 보수적으로 정하고, 초과 결과는 범위 밖 식의 참고 계산으로 표시한다. 이를 실측 또는 관성 보정 입경으로 부르지 않는다.

크리핑 조건은 다른 가정의 검증을 대신하지 않는다. 비구형·판상 입자, 응집, 입자 간 간섭과 고농도, 용기 벽, 온도 대류, 브라운 운동, 분산제의 물성 변화는 이 모형에 포함하지 않는다. 아주 작은 입경은 Re가 작더라도 단순 침강분석의 타당성이 자동으로 확보되지 않는다.

## 물의 온도별 물성

국제 물·증기 물성 협회의 **IAPWS SR6-08(2011)** 공식 상관식을 사용한다. 막연한 경험표 또는 출처가 불분명한 20°C 고정 점도를 쓰지 않는다.

- 밀도: 식 (2)의 비체적 v₀와 표 1의 계수, ρw = 1/v₀.
- 점도: 식 (7), 표 5, μ = 10⁻⁶Σaᵢ(T/300 K)^bᵢ Pa·s.
- 기준 압력: 0.1 MPa. 액체 물성 함수 자체의 발표 범위는 −20~110°C이지만 학습용 침강 입력은 안정된 일반 수온 **5~40°C**로 제한한다.
- Gs는 **4°C 물의 밀도**를 기준으로 고정하고 ρs=Gsρw(4°C)로 계산한다. 물 온도를 움직여도 입자 밀도 자체가 바뀌지 않는다. 4°C 기준밀도도 같은 물성식·0.1 MPa로 계산한다. 시험 성적서의 비중 기준온도와 다르면 실제 적용에서 변환해야 한다.

이 정의에서 ρw(4°C)=999.9742057544765 kg/m³, Gs2.65의 ρs=2649.9316452493626 kg/m³이다. 상수 1000 kg/m³의 통상 반올림과 매우 가깝지만 둘을 조용히 혼용하지 않는다. 원전의 물성식 정밀도와 시험 입경의 신뢰도를 동일시하지 않는다.

## 독립 검증값

IAPWS 공식 Table 8의 값으로 물성 구현을 확인했다. 아래 자릿수는 프로그램 검증용이며 원전도 실제 불확실성보다 많은 자릿수라고 명시한다.

| 온도 | 밀도 kg/m³ | 점도 μPa·s |
| --- | ---: | ---: |
| 260 K | 997.068360 | 3058.360750 |
| 298.15 K | 997.047013 | 889.996774 |
| 375 K | 957.009710 | 276.207245 |

양끝 온도는 **물성 함수만의 시험**이며 침강 화면에는 허용하지 않는다.

별도 Python Decimal 계산: 25°C의 위 표 값, 입자밀도 2650 kg/m³, L=0.1 m, t=600 s를 직접 대입하면 d=0.012834065605100473 mm, v=0.1666666666666667 mm/s, Re=0.0023962945990430194이다. 이 값과 엔진을 대조했다. 엔진 기본 20°C·L10 cm·t10 min·Gs2.65는 d=0.013619823082599602 mm, Re=0.0022623537201265104이다.

추가 자동 검증 15개: 공식 물성 검증점, 20°C ISO 점도 대조, 위 독립 대입값, 시간·깊이·Gs의 정확한 비율, 같은 L/t 불변성, 온도에 따른 고체밀도 불변성, 항력–수중중량 평형, Re 범위 초과 표시와 경계, 로그 곡선 단조성, 입력 범위 모든 모서리, 오류·무분포·원입력 불변성.

## 구현 접점

정식 파일: `src/sedimentation.mjs`, `src/learning-sedimentation.js`, `tests/sedimentation.test.mjs`. 공통 입력 이벤트·기준 비교·복원·JSON 버전 4에 통합했다.

```
Sedimentation.defaults = {
  sedimentDepthCm: 10,
  sedimentTimeMinutes: 10,
  sedimentGs: 2.65,
  sedimentTemperature: 20
}
Sedimentation.bounds // UI 범위 및 단위
Sedimentation.fields // 위 네 필드의 이름
Sedimentation.water(temperatureC)
Sedimentation.analyze(soilState)
SedimentationView.labels
SedimentationView.controls(soilState)
SedimentationView.render({data, result, baseline})
```

`analyze`의 `valid`는 입력·계산의 유효성이다. 별도 `creepingFlow`, `status`, `reynolds`가 Stokes 점성 지배 조건을 나타낸다. 따라서 Re 초과를 입력 오류로 지워 버리지 않고 어떤 가정이 벗어났는지 관계를 보여 준다. 결과는 `massDistributionAvailable:false`이며 통과율/분류기호 필드는 없다.

새 필드는 정식 soil 상태·저장 기준·undo·파일 버전 4에 포함한다. 기존 버전 1~3 soil 파일의 정확한 기존 스키마를 확인한 뒤 이 4개 기본값만 마이그레이션한다. 이미 분류에 필요한 값이 부족하거나 잘못돼도 `sedimentation` 질문의 계산은 그 비활성 값을 검사하지 않아야 한다. 반대로 다른 soil 질문에서 침강 입력 오류가 분류를 막지 않아야 한다.

### 로그 시간 슬라이더

시간은 상태·파일·숫자 입력 모두 **실제 분**으로 유지한다. 전용 range만 `data-mapping="log10"`, min=−1, max=log10(1440), `data-step="0.02"`를 갖는다.

- range 입력→실제 값: `10 ** Number(range.value)`.
- 숫자/저장값→range 위치: `Math.log10(timeMinutes)`.
- aria-valuetext는 로그 지수 대신 실제 분을 말한다.
- 앱의 `input`, `change`, `keydown`, `renderOutputs`에 이미 있는 값 동기화가 모두 같은 매핑을 거쳐야 한다.
- 범위 끝 정렬 시 먼저 로그 위치를 스텝 정렬하고 마지막에 범위를 제한한다. 끝에서 1440분을 초과하는 반올림 값을 저장하지 않는다.
- 빈 값이나 0은 로그를 계산하지 않고 입력 오류·비활성 range로 처리한다.

공통 입력 이벤트에 로그 매핑을 통합했다. 시간은 소수 4자리로 낭독해 최솟값 부근의 키보드 변화도 구별한다.

## 국내외 근거

1. **IAPWS 공식** [SR6-08(2011) 안내](https://iapws.org/technical-guidance/release/LiquidWater), [다운로드 PDF](https://iapws.org/technical-guidance/release/LiquidWater.download). 식 2·7, 표 1·5·8을 직접 읽고 검증값 확인. 문서 첫 쪽은 IAPWS 출처 표시 시 전체 또는 일부 재출판을 허용한다. 본 구현은 계수·식과 출처만 사용한다.
2. **USGS 공식** [TWRI 5-C1, Stokes law 및 Drag–Reynolds number](https://pubs.usgs.gov/twri/twri5c1/pdf/twri_5-C1_a.pdf), [Federal Interagency Sedimentation Project Report 4](https://water.usgs.gov/fisp/docs/Report_4.pdf). 공식 검색 색인의 원문에서 Re 약 0.1 이하 조건과 침강 등가지름·형상 한계를 확인. 직접 PDF 재요청은 도구에서 403이므로 전체 문서를 새로 열람했다고 주장하지 않는다.
3. **IODP 원 연구 보고서** [Principles of hydrometer analysis, DOI 10.2204/iodp.proc.308.205.2008](https://publications.iodp.org/proceedings/308/205/205_4.htm). 실제 페이지를 열어 입경과 잔류질량 비율이 별도 계산이라는 점, 구형·희박·비간섭 및 브라운 운동 가정, L과 교정 읽음의 뜻을 직접 확인했다. 이 보고서는 Re<1의 일반 설명이며 현재 화면은 위 USGS의 더 엄격한 Re≤0.1을 채택한다.
4. **USBR 공식** [R-90-4](https://www.usbr.gov/tsc/techreferences/rec/R9004.pdf), 1405 비중계 검정 및 5330 입도분석. 공식 검색 색인에서 보정이 비중계·분산제·농도·온도별로 고유하다는 설명을 확인. [Earth Manual](https://www.usbr.gov/tsc/techreferences/mands/mands-pdfs/earth.pdf)의 공식 검색 원문에서 비중 기준 물의 온도 4°C를 확인했다.
5. **국내 표준 공식 안내** [e나라 표준인증 KS F 2302 흙의 입도 시험방법](https://www.standard.go.kr/KSCI/standardIntro/getStandardSearchView.do?ksNo=KSF2302&menuId=919&reformNo=11&tmprKsNo=KSF2302&topMenuId=502&upperMenuId=503). 공개 기본정보·적용범위와 관련 KS F 2308 흙입자 밀도 시험방법 안내를 확인했다. KS 원문 전체의 시험 절차·보정·판정을 구현하거나 적합성을 검증한 것으로 표시하지 않는다.

## 실제 질량분포를 추가할 때의 최소 데이터 조건

추가 확장을 한다면 측정된 시간별 비중계 읽음과 온도, 시료 건조질량, 현탁액 체적, 비중계 유효깊이 검정, 분산제 blank·메니스커스 보정, 입자밀도, 침강에 쓴 분취분과 전체 체분석의 질량 관계를 한 묶음으로 확보해야 한다. IODP 보고서의 원 시험지와 시료별 입도 결과는 후보 자료이나 실제 읽음표의 이용 조건·단위·검정 이력을 확인한 다음 채택한다. 결과 그림을 읽어 역으로 만든 가짜 비중계 원자료는 사용하지 않는다.

현재 질문은 이 데이터가 없어도 정당하게 제공할 수 있는 **입경 축의 물리**를 완결한다. 질량 백분율까지 구현하지 않았다는 이유로 임의 분포를 붙이거나 큰 새 메뉴를 만들지 않는다.
