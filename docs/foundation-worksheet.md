# 얕은기초 검토준비 계산서: 원전·범위·엔진 제안

2026-09-22. 기존 학습판 40개 메뉴와 별개인 계산서 화면을 위한 범위 검토다. 검토한 엔진·화면·시험을 정식 소스에 통합했다. 외부 전문가 심사·현장 승인·국내 기준 적합성 검증을 주장하지 않는다.

## 제공 가능한 첫 범위

**직사각형 기초의 사용하중 장부, 한 방향 편심 접촉, 균질 배수지반의 지지력 및 입력 FS 비교**를 기존 검증 엔진으로 연결할 수 있다. 사용자가 제공한 기둥 하향하중 P와 저면 기준 모멘트 M을 1~8개 조합으로 입력한다. 조합계수·하중계수를 자동 생성하지 않고, 기초·피복 자중은 장부에서 한 번만 가산한다. 계산서는 어떤 식과 조건을 적용했는지 숫자로 남기며 종합 적합 판정을 만들지 않는다.

- 하중·정수압 장부: `FoundationConditions.ledger`.
- 인장반력이 없는 한 방향 선형 접촉: `FoundationConditions.contact`.
- 2025 USACE 표 5-2에 수록된 두 가지 **완전한** 배수 계수 체계: `BearingExtensions.fromLedger`.
- 침하: 선택적 외부 검토값과 입력 한도의 대조. 현재 학습판의 표면 정사각형 탄성식을 근입 직사각형 기초의 총침하로 가져오지 않는다.

계산 가정은 균질 배수지반, 수평 지표·저면, B≤L, 10°≤φ′≤45°, Df/B′≤1, 한 방향 모멘트다. 횡하중·2축 모멘트·액상화·층상 강도·흙막이와의 상호작용·기초 구조설계는 지원하지 않는다. 피복 되메움은 전면 중량이며 기둥 점유 부피를 별도 차감하지 않는 기존 장부 모형이다.

## 출처와 판본

주 출처는 [USACE EM 1110-1-1905 공식 PDF](https://publibrary.sec.usace.army.mil/api/download?filename=EM+1110-1-1905_Geotechincal+Design+of+Shallow+Foundations+on+Soils_2025+07+22+-+Final.pdf&id=54658636-77d2-48df-f26b-5295a01899a7&preview=true)다. PDF의 표제·쪽머리는 **31 July 2025**다. [공식 간행물 목록](https://www.publications.usace.army.mil/USACE-Publications/Engineer-Manuals/u43544q/31393932/)은 2025-07-22로 게시하며 같은 제목의 문서를 연결한다. 계산서 판본은 PDF 자체 날짜를 사용하고 목록 날짜와 혼동하지 않는다. 공식 PDF는 1992판 EM 1110-1-1905와 1990판 침하 매뉴얼을 대체한다고 밝힌다. 새 계산서에서 1992판의 계수를 2025판 근거인 것처럼 표시하지 않는다.

이번 확인은 공식 검색 결과와 프로젝트에 앞서 내려받아 보관한 원본 `work/bearing-extensions-review/usace2025.pdf` / 해당 텍스트를 함께 사용했다. 웹 도구의 전체 PDF 열기는 크기 제한에 걸렸지만 공식 검색 결과가 해당 판본과 식 5-15 등을 확인했고, 수식 본문은 보관 원본에서 대조했다.

- 인쇄 93~96쪽, §5-2·§5-4: 하중, 기저 수압, gross equivalent pressure, 편심과 유효면적.
- 인쇄 99쪽, §5-5: 극한 **gross** 지지력의 정의.
- 인쇄 103쪽, 식 5-19~5-20: 두 체계의 지하수 영향 계수.
- 인쇄 107쪽, 표 5-2: Nq, Nc, Nγ 및 형상·근입 계수. 현재 BearingExtensions와 대조했다. 표의 Vesic sc 행 오른쪽 수식에 sq라고 인쇄된 기호가 있으나 행 제목과 기존 FHWA sc 체계에 따라 sc로 구현한 기존 주석을 유지한다.
- 인쇄 113쪽, 식 5-23: 극한 gross 지지력 / gross equivalent 요구압력의 안전율.
- 인쇄 146쪽, §7-2·§7-3: 강도와 별개인 침하 검토 및 즉시·1차·2차 성분의 구분.

접촉·장부의 보조 근거는 [FHWA GEC6 Shallow Foundations(2002)](https://www.fhwa.dot.gov/engineering/geotech/pubs/010943.pdf)이며, 이 보고서의 2002 판본과 링크는 [FHWA Geotechnical TGM의 공식 문헌 목록](https://highways.dot.gov/federal-lands/pddm/geotechnical-tgm.pdf)에서도 확인했다. 접촉 결과는 별도로 정역학 적분으로 검증했다.

**국내 KDS 조항은 이번 계산서 엔진에 구현하지 않는다.** 프로젝트 적용 기준·판본은 사용자가 기록하는 메타정보이며 해당 텍스트가 입력됐다고 자동 준수 판정하지 않는다. 국내 기준을 실제 판정 규칙으로 추가할 때에는 해당 시점의 공식 원문과 적용 대상을 별도 확인해야 한다.

## gross/net와 허용 비교

현재 채택하는 2025 USACE의 gross 안전율 정의에 따라:

- q′allow,gross = q′ult,gross / FS_required.
- 비교 요구값 q′d,gross는 같은 유효 총압력 기준이다.
- net 표시값은 양쪽에서 같은 q′0를 뺀다: q′allow,net=q′allow,gross−q′0, q′d,net=q′d,gross−q′0.
- 이 net 표시값을 `(q′ult,gross−q′0)/FS_required`로 바꾸면 다른 허용 관례를 섞는 것이다. 계산서에는 gross 기준을 고정하고 net은 변환 표시로만 둔다.
- qmax는 접촉 분포 최대값이고 V′/A′는 지지력식용 등가 압력이다. qmax를 유효면적 지지력식에 자동 대입하지 않는다.

FS=3은 예제값으로만 제공하고 FS 출처 입력란을 비워 둔다. USACE 표 2-1의 3.0은 해당 문헌의 조건과 추가 주석이 붙은 값이며, 국가·프로젝트를 초월한 자동 기준이 아니다. 이 엔진은 선택한 FS와의 수치 비교만 수행한다. 기준 이하의 요구압력이어도 별도 필수 검토를 완료했다는 의미가 아니다.

## 침수 + 편심의 중요한 정의 차이

기존 교육 엔진은 실제 전체 면적 A에서 U=uA를 빼고 V′=W−U를 만든 후 e′=M/V′, A′=(B−2|e′|)L, q′d=V′/A′로 계산한다. 이는 전체 기초의 힘·모멘트 장부와 일관된 명시적 모델이다.

하지만 **USACE 본문 식 5-2는 q_eq=V/A′−u, 식 5-5는 e=M/V(총 하향 V)**를 사용한다. 건조 편심 또는 수압이 있는 중심재하에서는 두 정의가 일치하지만, 침수와 편심이 동시에 존재하면 동일하지 않다. 따라서 단순히 기존 엔진 결과를 USACE 전체 절차와 동일하다고 주장할 수 없다.

첫 계산서에서는 `u>0 && M!==0`이면 **지지력 허용 비교를 보류**한다. 실제 전면 부력 후 합력과 접촉 분포는 계속 제공하고, 보류 이유를 식 번호와 함께 출력한다. 향후 이 조합을 실무 계산 대상으로 확장하려면 채택할 전체 절차와 요구압력·편심 정의를 별도로 검토해야 한다. 현재 값에 임의의 보정계수나 더 작은 압력을 붙이지 않는다.

## 침하를 별도로 두는 이유

Mechanics의 탄성침하는 건조·지표·정사각형·중심 재하의 유연한 재하면 **중심점** 값이다. 이번 장부는 Df≥t>0인 근입기초이므로 그대로 연결하면 적용범위가 서로 충돌한다. LayeredFooting은 균질 Boussinesq 응력장과 지정 두 층의 일정 M을 쓰는 부분 압축량이며 총침하·강체 평균침하가 아니다.

첫판은 `adoptedSettlementMm`, `limitMm`, `source`가 모두 있을 때만 외부 채택값을 입력 한도와 비교한다. 입력하지 않으면 **미검토**다. 해당 검토가 어떤 하중조합·수위·지층·장기 성분을 포함했는지는 외부 문서 출처에 기록해야 하며, 이 숫자 하나로 부등침하까지 검토한 것으로 표시하지 않는다.

## 엔진 contract

`FoundationWorksheet.evaluate(input, {FoundationConditions, BearingExtensions})`는 DOM·추가 import가 없는 순수 조합기다. 의존 주입을 생략하면 빌드의 동일 이름 전역 네임스페이스를 사용한다. `example()`은 숫자를 포함한 예제를 반환하되 주요 정수/하중/FS 출처를 빈칸으로 둔다.

입력: `meta`, `geometry`, `soil`, `method`, `requiredFS`, `combinations[]`, `settlement`. 자세한 키는 src/foundation-worksheet.mjs의 `example()`을 참조한다. 저장 JSON은 결과를 신뢰해 불러오는 방식이 아니라 입력·출처만 version 1로 보관하고 매번 evaluate로 재계산하는 것이 적절하다. draft 저장의 shape 검증은 계산 유효성 검증과 분리한다.

출력:
- `valid:false,errors`는 공통 형식/입력 오류.
- `cases[].valid:false`는 압축 평형 등을 만들 수 없는 조합. 가능한 ledger는 남기되 contact/bearing/판정을 만들어내지 않는다.
- `bearingCheck.status`: `within-user-limit`, `exceeds-user-limit`, `not-evaluated`. 마지막 상태는 reason을 동반한다.
- `contactCheck.status`: `full-compression`, `partial-contact`. 이는 인장 없는 선형 접촉 분포이며 구조물 전도 종합판정이 아니다. 핵 경계에서는 한쪽 접지압이 정확히 0이다.
- `formulas[]`: 식 이름·표현·숫자 대입문·같은 계산 결과·단위.
- `settlement`: 외부 채택값의 별도 상태.
- `provenance`: 비어 있는 출처·메타정보 목록.
- `overallStatus`: 항상 `no-overall-design-approval`.

## 독립 대표 수치와 시험

B=3m, L=4m, Df=1m, t=0.3m, P=1,200kN, 건조 되메움 γ18, 콘크리트 γ24, φ′30°, c′0, 저항용 γ20, 깊은 수위6m, FS3:

| 항목 | 손계산/대조값 |
|---|---:|
| A | 12 m² |
| Wf | 86.4 kN |
| Wcover | 151.2 kN |
| W=V′ | 1,437.6 kN |
| 원지반 σv0 | 18 kPa |
| q′d,gross | 119.8 kPa |
| Δq | 101.8 kPa |
| Vesic 표 체계 Nq / Nγ | 18.4011222187 / 22.4024862711 |
| 상재 항 / 자중 항 | 518.7282297787 / 470.4522116932 kPa |
| q′ult,gross | 989.1804414719 kPa |
| q′allow,gross / net 표시 | 329.7268138240 / 311.7268138240 kPa |
| 달성 gross 안전율 | 8.2569318988 |

M=180kN·m를 추가한 건조 조합은 e′=180/1437.6m이다. 접지압 분포를 독립 적분하여 ΣV=1437.6kN 및 ΣM=180kN·m를 확인한다. 수위0.5m, M=0 조합은 W1442.4kN, U58.86kN, V′1383.54kN, q′d115.295kPa, q′0=14.095kPa, Δq101.2kPa다. 동일 수위에 M180을 더하면 지지력 비교가 보류된다.

`tests/foundation-worksheet.test.mjs`에 13개 시험을 작성했다. 손 장부, gross/net 차이 보존, 접촉력·모멘트 적분, 수압 1회 차감, 침수+편심 보류, 편심 부호 대칭, 정확 FS 경계와 실제 초과, 근입 범위 이탈, 기초 밖 합력, 외부 침하 출처 미입력, 누락·비유한 입력, 불변성을 포함한다. 이는 개발 검증이며 외부 전문가 승인이나 실증 자료가 아니다.
