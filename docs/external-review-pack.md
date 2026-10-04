# 지반공학 학습 도구 외부 검토 패킷

**상태: 검토 준비 · 실제 외부 검토 미실시.** 아래 숫자는 개발 검증용 대조값이다. 검토자 확인이나 현장 검증을 받은 값으로 표시하지 않는다. 파일 경로는 `geotech-lab/` 프로젝트 루트 기준이다.

| 검토 대상 고정 | 기록 |
|---|---|
| 배포 URL / HTML SHA-256 / 소스 commit | ____________________ |
| 전달일 / 검토자 / 전문분야 / 검토일 | ____________________ |
| 검토한 브라우저·기기 / 입력 JSON 이름 | ____________________ |
| 범위 | 아래 10개 대표 모형의 식·입력·그림·설명. 전체 지반공학·현장설계 적합 승인 제외 |

검토자는 각 사례를 원전과 독립 계산으로 확인한 뒤, 입력을 한 번 이상 바꾸어 그림·대입식·결과가 같은 상태를 가리키는지 확인한다. 개발 테스트가 통과했다는 사실만으로 확인란을 채우지 않는다. 상태 선택은 **미검토 / 해당 범위 확인 / 수정 요청 / 근거 추가 필요**다.

## 대표 사례 10개

| ID·화면 | 확인식·가정 / 재현할 핵심값 | 원전·코드·검증 위치 | 전문가 결과 |
|---|---|---|---|
| E01 흙의 분류·소성 | 무기질·75 mm 미만 건조질량. PI=LL−PL, A선=0.73(LL−20). 세립분 50%, LL30/PL20→CL; LL25/PL21의 세립토→CL-ML. 5·12·50% 및 G/S 동률에서 질량 배율만 바뀌어 기호가 바뀌지 않는가? NP와 측정 PI=0을 구별하는가? | S1. `src/soil.mjs`, `src/plasticity.mjs`; `docs/soil-spec.md`, `docs/soil-inputs.md`; `tests/soil.test.mjs`, `tests/soil-sieve-conversion.test.mjs` | **미검토** · 의견: ____ |
| E02 침강 등가입경 | d=√[18μL/((ρs−ρw)gt)]. 20°C·L10 cm·t10 min·Gs2.65→d0.0136198231 mm, Re0.00226235372. Gs의 4°C 기준, cm/min→SI, IAPWS 물성 검증점, t4배→d½ 확인. 등가입경에서 통과율·USCS를 만들어내지 않는가? Re≤0.1만으로 모든 실제 시험 가정을 보증하지 않는가? | S2. `src/sedimentation.mjs`, `src/learning-sedimentation.js`; `docs/sedimentation.md`; `tests/sedimentation.test.mjs` | **미검토** · 의견: ____ |
| E03 유효응력 | σ′=σ−u, u=9.81max(z−zw,0). 두 층: 경계3m·수위2m·z5m·q25kPa·γ상18/20·하19/21→σ123, u29.43, σ′93.57kPa. 같은 깊이에서 기준 비교, 층 경계 연속, q+50→배수 후 σ′+50 확인. | S3. `src/mechanics.mjs`; `docs/mechanics-spec.md`; `tests/mechanics.test.mjs`, `docs/verification/completion/numeric-audit.mjs` | **미검토** · 의견: ____ |
| E04 Darcy·차수벽 침투 | Q=kAΔh/L. Δh2,L4,A0.2,k10⁻⁴→Q10⁻⁵m³/s=0.6L/min. 2D h의 위치수두는 −z, u=γw(h+z). 24×12m·벽6m·h좌6/우1·k10⁻⁴, 48×24격자→Q0.0002649090m²/s. 벽·바닥 무유량, 수두 역전 시 유량 부호, 입출 유량보존, 24×12→48×24→96×48 수렴 확인. | S4. `src/seepage.mjs`; `docs/seepage.md`; `tests/seepage.test.mjs`. 국부 출구경사와 2m 평균 경사를 구별; 자유수면·파이핑 판정 제외 | **미검토** · 의견: ____ |
| E05 1차압밀 | cv=k/(mvγw), Tv=cvt/Hdr², S∞=mvΔσH. k10⁻⁹,mv3×10⁻⁴,H6m,Δσ100kPa,양면100일→S∞180mm,S114.74808mm,t90 259.99118일. 한면 배수는 같은 압밀도 시간4배, 최종침하 동일. Δσ0에서 실제 압밀도는 미정의인지 확인. | S3. `src/consolidation.mjs`; `docs/consolidation.md`; `tests/consolidation.test.mjs`. 급수/수압 적분/독립 확산해 대조 포함 | **미검토** · 의견: ____ |
| E06 점착성 주동토압 | p_raw=Ka(γz+q)−2c′√Ka, p접촉=max(0,p_raw). H6m,φ0°,γ20,c20kPa,q0→zc2m,P160kN/m,작용높이4/3m. 원식 음수 면적을 합력에서 빼지 않는가? 전 높이 비접촉이면 P0·작용점 미정의. 균열수압은 제외. | S5. `src/cohesive-pressure.mjs`; `docs/cohesive-pressure.md`; `tests/cohesive-pressure.test.mjs` | **미검토** · 의견: ____ |
| E07 원호 사면·해석법 | H8m,β30°,a0.6,k1.5,γ19,φ28°,c0,ru0.2,n40→Ordinary1.1509527232 / Bishop1.2975778513. 두 방법의 **동일 원호** 여부, 아래 설명의 수압 정의, 절편 수직평형·모멘트 잔차, 음수 N′ 거부를 확인. 169개 최소는 전역 최소가 아니다. | S6. `src/circular-slope.mjs`; `docs/circular-slope.md`; `tests/circular-slope.test.mjs`, `docs/verification/circular-slope-independent.py` | **미검토** · 의견: ____ |
| E08 얕은기초 계산서 | B3,L4,Df1,t0.3,P1200,γ토18,γ콘24,φ30,c0,저항γ20,zw6,FS3→W1437.6kN,q′d119.8kPa,q′u989.1804415kPa,gross비교값329.7268138kPa. 총/순·부력 1회 차감·모멘트평형·유효면적/실제 접촉폭 차이 확인. 외부 침하값의 출처 없으면 미검토. | S7. `src/foundation-worksheet.mjs`, `src/foundation-conditions.mjs`, `src/bearing-extensions.mjs`; `docs/bearing-extensions.md`, `docs/foundation-conditions.md`; `tests/foundation-worksheet.test.mjs` | **미검토** · 의견: ____ |
| E09 지정층 중심선 압축 | si=∫Δσ′/Mi dz. B2,L3,Q600,z₀1,H1=2,M1=10MPa,H2=4,M2=5MPa→9.133813+9.433191=18.567004mm. M1만2배이면 1층만½. q/Q 고정 변경, 하단 잔류응력, 독립 면적·깊이 적분 확인. 결과를 전체 평균침하로 표시하지 않는가? | S7·S8. `src/layered-footing.mjs`, `src/rectangular-stress.mjs`; `docs/layered-footing.md`; `tests/layered-footing.test.mjs` | **미검토** · 의견: ____ |
| E10 SPT·CPT 보정 | SPT: N20,ER75%,CB1,CR0.9,CS1→N60=22.5; σ′=2tsf→CN0.77,(N1)60=17.325. CPT: qc1MPa,u2 200kPa,a0.8,σ총200→qt1040,qnet840; Nkt14→su60kPa. qt/N60 입력 모드는 중복 보정 금지. 범위는 신뢰구간이 아님. | S9. `src/investigation.mjs`; `docs/investigation.md`; `tests/investigation.test.mjs` | **미검토** · 의견: ____ |

## 반드시 함께 볼 정의 3가지

1. **사면 Ordinary:** 이 화면은 USACE C-12/C-14의 `N′=(W−ub)cosα`를 사용한다. `Wcosα−uℓ`를 쓰는 다른 Fellenius 구현과 습윤 결과가 다를 수 있다. Bishop은 수직 절편평형과 전체 모멘트만 맞추며 완전 평형법이 아니다. F=0에서 1/F가 있는 항·수렴 잔차를 만들어내지 않는다.
2. **계산서 침수+편심:** 기존 장부는 실제 A에서 U=uA를 뺀 V′로 e′=M/V′를 계산한다. USACE 2025 식5-2·5-5의 V/A′−u 및 e=M/V와 침수 편심 조건에서는 같지 않다. 계산서는 이때 접촉 장부는 표시하되 지지력 허용 비교는 보류한다. gross 허용 비교에서 `qu/FS−q0`를 `(qu−q0)/FS`로 바꾸지 않는다.
3. **침강 자료:** 물 온도를 바꿔도 4°C 기준 Gs로 정한 입자 밀도는 일정하다. 점도·밀도 표의 수치 일치는 원시 비중계 읽음·유효깊이 검정·분산제 보정의 검증이 아니다. 출처 없는 질량분포를 생성하지 않는다.

## 원전 링크

- S1: [FHWA 토질 분류, Table4-13](https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/04c.cfm), [USBR 분류·소성도표](https://www.usbr.gov/tsc/techreferences/mands/geologyfieldmanual-vol1/chap03.pdf).
- S2: [IAPWS SR6-08(2011), 식2·7 및 표8](https://iapws.org/technical-guidance/release/LiquidWater), [IODP 비중계 분석 원리](https://publications.iodp.org/proceedings/308/205/205_4.htm).
- S3: [FHWA NHI-06-088, 유효응력·압밀](https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06088.pdf).
- S4: [USACE EM1110-2-1901, 침투 경계·Darcy](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-2-1901.pdf).
- S5: [Caltrans Trenching and Shoring, Chapter4(2025), 식4-4-4·10·13](https://dot.ca.gov/-/media/dot-media/programs/engineering/documents/structureconstruction/ts/ts-chpt-4-a11y.pdf).
- S6: [USACE EM1110-2-1902(2003), Appendix C·F](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-2-1902.pdf).
- S7: [USACE EM1110-1-1905(2025), 표5-2·식5-23·§7-10](https://publibrary.sec.usace.army.mil/api/download?filename=EM+1110-1-1905_Geotechincal+Design+of+Shallow+Foundations+on+Soils_2025+07+22+-+Final.pdf&id=54658636-77d2-48df-f26b-5295a01899a7&preview=true).
- S8: [FHWA-HRT-15-080, §3.5 점하중 응력 면적적분](https://www.fhwa.dot.gov/publications/research/infrastructure/structures/bridge/15080/003.cfm).
- S9: [FHWA-IF-02-034 SPT 보정](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/FHWA-IF-02-034.pdf), [Robertson & Cabal CPT Guide7(2022)](https://www.cpt-robertson.com/PublicationsPDF/CPT-Guide-7th-Final-SMALL.pdf).

## 검토 기록 한 건당 작성

| 항목 | 기록 |
|---|---|
| 사례 ID / 검토자 / 일시 | ____ / ____ / ____ |
| 원전 판본·쪽·식 / 독립 계산 방법 | ____________________ |
| 입력 파일 / 예상값·단위 / 실제값·차이 | ____________________ |
| 식·부호·단위·평형·수렴·경계조건 확인 | 미검토 / 해당 범위 확인 / 수정 요청 / 근거 추가 필요 |
| 화면 설명과 적용범위의 오해 가능성 | ____________________ |
| 수정 요청·우선도 / 반영 commit / 재확인 | ____________________ |

공통 확인: 빈 입력·지원 밖 값에서 옛 결과가 남지 않는지, 현재/기준이 같은 축과 같은 관찰점인지, 자료 출처·예제/실측 구분이 보이는지, 수치 수렴을 현장 오차나 기준 준수로 설명하지 않는지. 식·단위·부호 오류 또는 지원 범위 밖 적합 표시는 해당 사례의 수정 요청으로 남기고 재검토 전 ‘확인’으로 바꾸지 않는다.
