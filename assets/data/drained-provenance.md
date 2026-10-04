# Karlsruhe 단조 배수 삼축시험 자료의 출처

이 파일과 선택 CSV는 흙의 감각의 `drained-evidence` 학습 화면에 사용한 공개 편찬 자료의 출처·가공 내역을 기록한다. 확인일: 2026-09-22.

## 원 실험과 편찬 자료

- 원 실험: Wichtmann, T. & Triantafyllidis, T. (2016). *An experimental database for the development, calibration and verification of constitutive models for sand with focus to cyclic loading: part I—tests with monotonic loading and stress cycles.* Acta Geotechnica 11, 739–761. [DOI 10.1007/s11440-015-0402-z](https://doi.org/10.1007/s11440-015-0402-z).
- 확인한 원문: [저자 공개 PDF](https://www.torsten-wichtmann.de/paper/journal/2016-AG-data-base-part1.pdf), §3.2, Table 3, Fig.4. 저자 PDF의 시험 설명과 편찬 파일을 교차 확인했다.
- 편찬: Huan Wang, Norwegian Geotechnical Institute. *Sand Triaxial Test Database*. [4TU.ResearchData DOI 10.4121/086847a6-ba39-4d66-973b-6b93028c7ad8](https://doi.org/10.4121/086847a6-ba39-4d66-973b-6b93028c7ad8).
- 가져온 버전: repository version 3, `triaxial test dataset_rev2.zip`. 자료 내부 형식 version 1.1, compilation date 2026-08-11.
- [확인한 배포 파일 URL](https://data.4tu.nl/file/086847a6-ba39-4d66-973b-6b93028c7ad8/23a296ac-afb1-436c-adb1-3761a4157bd9).
- 편찬 데이터의 라이선스: [Creative Commons Attribution 4.0 International, CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 저장소, 패키지 README 및 개별 재료 파일에 명시되어 있다. 편찬 데이터베이스와 원 실험 논문을 함께 인용한다. 이 라이선스 표시를 원 논문 전체·그림의 라이선스로 확대 해석하지 않는다. 논문 그림은 복제하지 않았다.

## 자료의 성격

이 파일은 **공개 실험자료의 편찬·수치화 곡선**이다. 계측기 원시 로그라고 주장하지 않는다. [편찬본 원 README](drained-source-readme.md)는 대부분의 곡선이 원 논문의 그림에서 디지타이즈되었고 변형률은 소수 4자리, 응력은 0.01 kPa로 반올림되었다고 밝힌다. Karlsruhe 파일은 개별 취득 방법을 별도 필드로 지정하지 않는다. 원 저자의 데이터 안내와 이 편찬본은 구분한다.

## 보존 파일과 변경 내역

- [원 재료 CSV](drained-karlsruhe-compilation.csv): `01_Karlsruhe_fine_sand.csv`를 이름만 바꾸어 바이트 그대로 복사했다. 25개 시험과 재료·시험 조건·인용정보를 보존한다. SHA-256 `f37920848e53c7baaa131912e691c42119906d586ba9ece6b5c8996078446c9f`.
- [앱 선택 CSV](drained-karlsruhe-selected.csv): 원 파일 `[6] TEST_DATA`에서 `TMD2`, `TMD22` 행만 추출했다. 각 201행, 총 402행. 열 순서 및 숫자 문자열을 보존했고 독립 CSV 헤더를 추가했다. SHA-256 `a0b724d7bd5c31985456172f96576bf5042c8506b86a24359a7f976402f625bd`.
- 앱 내장 자료: 위 선택 CSV의 네 수치 열을 JavaScript 숫자로 읽어 순서를 유지한 배열로 내장했다. 배열은 읽기 전용이다. `q=σv′−σr′`, `p′=(σv′+2σr′)/3`, `τmax=|q|/2`와 관측 최대 위치, 인접 εv 차이를 추가로 계산했다.
- 밀도 간 보간, 곡선 평활화, 다른 구속압으로 환산, 종료 이후 외삽, 첫 기록 영점 보정은 하지 않았다. 그래프는 인접한 제공 기록을 선분으로 연결한 표시다. 커서는 0.1% 기록만 선택한다.

## 시험 조건과 단위

Karlsruhe fine sand, 자연 규사, d50=0.14 mm, Cu=1.5. 원 논문에서 기본 공시체는 d≈100 mm, h≈100 mm, 윤활 단판, 공중낙사 성형, 등방압밀 후 축변위속도 0.1 mm/min의 단조 배수 삼축압축이다. 독립적으로 제공되지 않은 포화도·배압 값을 덧붙이지 않았다.

| 시험 | 편찬 초기 e0 | 편찬 초기 Dr | 기록 첫 σr′ | 기록 첫 σv′ |
|---|---:|---:|---:|---:|
| TMD2, 느슨 | 0.9753 | 20.9% | 100.18 kPa | 100.02 kPa |
| TMD22, 조밀 | 0.7351 | 84.6% | 99.20 kPa | 101.35 kPa |

초기 e0·Dr는 등방압밀을 마친 전단 시작 상태다. 원 Table 3는 더 적은 소수 자리로 조건을 제시하므로 정밀한 편찬 수치와 혼동하지 않는다. 두 시험의 공칭 구속압은 100 kPa지만 실제 각 기록의 유효 방사응력은 다르며 조금 변한다. 매 행의 σr′를 사용한다. 축변형률·체적변형률은 %, 유효응력은 kPa, 압축은 양수다. εv<0은 전단 시작보다 체적이 커진 상태다.

## 해석 한계

조밀한 시험의 기록 내 최대 q=410.51 kPa는 εa=6.2%에 있다. 느슨한 시험의 기록 내 최대 q=249.03 kPa는 20% 종료점이다. 후자의 내부 첨두를 확인했다고 표시하지 않는다. 느슨한 시험은 후반 εv가 감소하더라도 종점 εv=+0.6815%이므로 누적 체적은 시작보다 작다. 두 기록 모두 마지막 1% 구간에서 εv가 계속 변한다.

원 논문은 큰 변형률에서도 q가 계속 줄어 잔류값이 완전히 도달하지 않았다고 설명한다. 자료 종점을 임계상태·잔류강도로 선언하지 않는다. 임계 마찰각에 관한 원문의 별도 시험 해석을 이 두 곡선 종점의 계산값으로 대체하지 않는다. 이 두 시험은 다른 재료, 응력수준, 비배수 조건, 국부 전단대 및 대변형 잔류강도를 예측하는 모형이 아니다.
