# 교재·설계기준·시험자료 연결

이 도구의 식·단위·가정은 공개 원문으로 확인하며, 각 계산의 상세 근거는 해당 실험의 문서와 화면에 둔다. 개인이 가진 국내·해외 교재의 전문을 복제하거나 특정 판본을 읽었다고 전제하지 않는다. 공개 대학 교재, 공공 기술 매뉴얼, 공식 기준과 공개 시험자료를 구분한다.

## 국내 기준 안내

2026-09-22 국가건설기준센터의 공식 공개 문서 뷰어와 그 공개 조회 응답에서 다음 코드의 적용 분야·본문 존재를 확인했다. 뷰어는 개정 정보를 제공하므로, 앱에는 확인하지 않은 고정 최신판 연도를 붙이지 않는다. 아래 코드의 모든 식·안전계수·설계 절차를 현재 계산 엔진에 구현했다는 의미는 아니다.

| 연결 실험 | 공식 국내 기준 |
|---|---|
| 분류·SPT·CPT | [KDS 11 10 10 지반조사](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2010%2010) |
| 층별 침하와 계측 | [KDS 11 10 15 지반계측](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2010%2015) |
| 연직드레인·선행재하·복합지반 | [KDS 11 30 05 연약지반 설계 일반](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2030%2005) |
| 접지압·지지력·침하 | [KDS 11 50 05 얕은기초](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2050%2005) |
| 축·횡말뚝·군말뚝 | [KDS 11 50 15 깊은기초](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2050%2015) |
| 액상화 조건 비교 | [KDS 11 50 25 기초내진](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2050%2025) |
| 지정 사면 사례 | [KDS 11 70 05 쌓기·깎기](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2070%2005) |
| 토압·중력식 옹벽 | [KDS 11 80 05 콘크리트옹벽](https://www.kcsc.re.kr/standardCode/viewer/KDS%2011%2080%2005) |
| 흙막이·굴착 저면 | [KDS 21 30 00 가설흙막이](https://www.kcsc.re.kr/standardCode/viewer/KDS%2021%2030%2000) |

예를 들어 KDS 얕은기초는 지지력과 침하, 조사·설계조건을 함께 다루지만, 현재 단일 실험 하나를 수행했다고 국내 설계 검토를 마쳤다고 표시하지 않는다. 코드·시방서·시험표준은 서로 다른 문서이며 KS 시험 절차의 최신 수행 판본을 임의 추정하지 않는다.

## 계산의 직접 근거

- FHWA NHI-06-088/089, NHI-16-072: 토질 기본 관계·시험·기초. 각 식의 기호·단위·시험조건은 개별 docs에 기록한다.
- USACE 침투·압밀·사면·기초 매뉴얼: 경계조건과 해석 범위, 독립 예제 확인. 오래된 물리 원리의 설명을 현행 국내 설계기준과 혼동하지 않는다.
- University of Newcastle 공개 *Fundamentals of Foundation Engineering*: Prandtl 기구의 물리적 의미. 화면의 무중량 2D 기구와 별도 정사각형 지지력식은 구별한다.
- FHWA의 서로 다른 연도·계수 체계를 섞지 않는다. 예를 들어 보강재 인발은 FHWA-HIF-24-002 식을 사용하고 과거 식의 α를 임의 가산하지 않는다.

## 실제 자료와 가정값

- **원 계측자료:** LEAP-2017 GWU 동일 시료의 반복 삼축시험, ODC-BY 1.0. 원본 TSV·선택점 CSV·파일 SHA 보존. `docs/cyclic-evidence.md`.
- **원그림 수치화:** USACE 동일 CL 흙의 다짐 횟수별 시험점. 판독 오차·단위 변환·원문 링크와 페이지 번호 보존. 원문 PDF·발췌 페이지는 배포하지 않음. `docs/compaction-evidence.md`.
- **교육용 지정값:** 층별 관측침하, 일축강도, 침수 전후 간극비, 현장정수 등의 기본값. 실측 데이터라고 표시하지 않으며 입력 결과와 모델 예측을 구별한다.
- **공개 시험자료 편집본:** 4TU SandTriaxialDatabase v3의 Karlsruhe 배수삼축 TMD2/TMD22, CC BY 4.0. 원 연구는 Wichtmann·Triantafyllidis(2016)이며 저장된 응력·체적 기록을 사용한다. 수집·수치화된 편집본으로서 원 계측 로그와 구분한다. `docs/drained-evidence.md`.

원문은 저자·기관의 공개 링크로 제공하며, 앱이 재배포하는 자료는 해당 라이선스·공개정보 정책과 가공 사실을 기록한다. 단일 HTML에 선택 시험자료를 내장한다. USGS 원본 workbook과 USACE 발췌 PDF는 포함하지 않으며 원본은 제공기관 링크로 안내한다. [외부 자료 목록](third-party-materials.md)을 참고한다.
