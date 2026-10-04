# 실제 축방향 말뚝 재하시험 기록

기존 `pile-axial` 안의 `evidence` 질문으로 통합한다. 고정된 한 말뚝의 기록을 읽으며, 기존 t–z/q–z 모형의 입력을 시험 결과처럼 변형하지 않는다.

## 자료와 재배포

- 저자: Kevin Duffy, Ken Gavin, Mandy Korff, Dirk de Lange, Alfred Roubos.
- 데이터: *Static load tests on three different pile types in very dense sand at Amaliahaven*, 4TU.ResearchData, v1, 2025-04-16.
- DOI: https://doi.org/10.4121/8a27f456-66f0-4e3b-a0ac-4f776926644d.v1
- 공식 API: https://data.4tu.nl/v2/articles/8a27f456-66f0-4e3b-a0ac-4f776926644d
- 원본 archive: https://data.4tu.nl/file/8a27f456-66f0-4e3b-a0ac-4f776926644d/f84af399-4e3c-4c26-937f-6e04b1a98399
- 라이선스: CC BY 4.0. 공식 API의 `license`와 압축파일 내부 README 모두 일치. 자료 선택·평균·할선 계산의 변경 내역을 화면 및 JSON에 표시한다.
- 원 archive 게시 MD5: `5b1ad8b9d4b7942766a58d6d9bae14cb`. 전체 434.9 MB 압축파일을 배포하지 않고, HTTP range로 필요한 세 CSV entry만 추출하였다. **이 MD5는 저장소 게시값이며 전체 archive 다운로드 검증값은 아니다.** 추출한 각 파일의 SHA-256을 별도로 계산해 기록한다.

시험방법의 설명에는 원저자 논문 *Influence of Installation Method on the Axial Capacity of Piles in Very Dense Sand* (2024), DOI https://doi.org/10.1061/JGGEFK.GTENG-12026 를 참조하였다. 논문 PDF는 데이터 라이선스와 구별하며 앱에 복제하지 않는다.

## 선택한 시험

- 원자료 ID P02 = 논문 DP1.
- 항타 기성 콘크리트 말뚝, 사각 400×400 mm.
- `pile-details.csv`: 두부 NAP +4.00 m, 선단 −27.74 m, 표고 차 31.74 m. 등가직경 0.45 m는 사각 폭이 아니다.
- 계측일 2019-12-03–04, Netherlands Rotterdam Amaliahaven.
- 축방향 압축, 6개 유압잭과 4개 두부 변위계. 설치 시 일부 구간 워터제팅을 사용했으며 주면 전체가 균질 모래라는 가정을 하지 않는다.
- 지반은 상부 모래, 모래·점토 호층, 하부 조밀한 모래. 논문의 표/조건은 원문 연결로 제공한다.

## 변환 계약

원본 CSV 3개는 바이트 그대로 보관한다.

1. `P02_topside.csv` 6,942개 관측을 원본 순서 그대로 읽는다. Date format은 `DD/MM/YYYY HH:MM`이다. 같은 분에 여러 행이 존재한다.
2. `P02_datums.csv`에 주어진 23개 구간 각각에서 `start ≤ timestamp ≤ end`에 속하는 **마지막 원본 행**을 고른다. 기준계측 `refSLT`와 5% 제하 단계도 남긴다.
3. Q = 저자가 공개한 `F_total` 열, kN. `F_total_uncorr`나 6개 센서 합으로 임의 대체하지 않는다. 저자 보정 열을 보존하고 추가 초기하중 차감은 하지 않는다.
4. s₀ = (`lvdt1`+`lvdt2`+`lvdt3`+`lvdt4`)/4, mm. 하향이 양수다. 초기 작은 음수 값도 그대로 유지한다. 센서 간 최대차도 관찰값으로 함께 표시한다. 그 차이의 원인을 자동 판정하지 않는다.
5. 구간 할선 k = ΔQ/Δs, kN/mm. 현재와 직전 **종료점** 사이 값이다. 첫 점은 계산하지 않는다. 재하·제하·재재하·이전 최대를 넘는 재재하를 구별한다.
6. 시간 평균·평활화·곡선 피팅·중간값 생성·외삽은 수행하지 않는다. 종료점 연결선은 계측 사이의 실제 경로를 복원하지 않는다.

23번 종료점은 2019-12-04 02:01이다. 전체 CSV는 03:30까지 이어지므로 23번을 전체 시험의 마지막 기록이라 부르지 않는다. `5%`는 원저자 단계 이름이며 Q=0을 의미하지 않는다. 따라서 제하 종료 변위를 무하중 잔류침하로 부르지 않는다.

## 확인 숫자

- 원 CSV SHA-256: `6bdb4447ce8e41fa090fe7c16560b38172e14a3115430666d244910cd7d2060c`
- 첫 점: CSV 158행, Q=223.1652609 kN, s₀=−0.00456521725 mm.
- 기본 12번: CSV 2912행, Q=344.1652609 kN, s₀=1.87293478275 mm, 제하.
- 18번: CSV 4966행, Q=316.1652609 kN, s₀=7.92543478375 mm, 센서차 9.391739135 mm.
- 23번: CSV 6412행, Q=7977.165261 kN, s₀=83.115434785 mm.

## API / 연결

```js
PileEvidence.defaults // {pileEvidencePoint: 12}
PileEvidence.read(data) // valid/error, points, number, current, previous,
                        // deltaLoad, deltaSettlement, stiffness, branch, source
PileEvidenceView.controls(data)
PileEvidenceView.render({data,result,baseline,baselineData,question})
```

등록부 `evidence` 질문의 활성 필드는 `['pileEvidencePoint']` 하나이다. bounds는 `[1,23,'시험 기록 순서','번']`, labels는 `['시험 기록 순서','번']`. 다른 모형의 오류 입력은 고정 기록 읽기에 영향을 주지 않는다. 저장 비교는 동일 `model`의 선택점만 겹쳐 보이며 서로 다른 이론 모형 결과는 합치지 않는다.

## 검증과 범위

전용 테스트는 원본 CSV를 독립적으로 다시 파싱하여 모든 23개 선택 행·단계 시각·하중·4개 변위계를 대조한다. 해시·순서·같은 분의 여러 관측·원본 끝시각·변환·제하 부호·이력 판별·입력 경계·모형 입력 격리를 확인한다. 브라우저에서는 통합 후 두 화면폭에서 원자료 다운로드와 현재/기준 마커를 검증한다.

순간 강성, 말뚝 재료 E, 주면 t–z 역산, 선단 분담, 극한/허용하중, 현장 합격판정은 이 화면의 출력이 아니다. 실제자료 읽기와 이론 모형의 역할을 구별하기 위한 좁은 사례이다.
