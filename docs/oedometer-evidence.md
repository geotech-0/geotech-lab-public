# 실제 압밀시험 기록에서 구간 정수 읽기

`compression/reading`에서 교육용 지정점과 구별되는 실제자료 모드를 제공한다. 공개 시험의 선택 종료점과 구간 계산을 연결한다.

## 자료의 정체와 확보 근거

[Garcia, Adrian V. and Waite, William F. (2025), *Compressibility and permeability data for kaolin: a comparison between 1-dimensional oedometers and a high-stress permeameter*](https://zenodo.org/records/15021308), DOI [10.5281/zenodo.15021308](https://doi.org/10.5281/zenodo.15021308)의 원본 Excel을 기관이 공개한 저장소에서 직접 받았다. USGS와 U.S. Department of Energy를 출처로 표시한다.

- [공식 원본 다운로드](https://zenodo.org/api/records/15021308/files/HighStressPermeameter_HSP_ComparisonWithOedometers.xlsx/content)
- [USGS 열 정의·시험 조건·재사용 메타데이터](https://cmgds.marine.usgs.gov/catalog/whcmsc/zenodo/ZEN_15021308/HSP-Consolidation-Permeability-Kaolin_meta.faq.html)
- 저장소 공개일: 2025-10-01. 확인·다운로드: 2026-09-22.
- 파일: `HighStressPermeameter_HSP_ComparisonWithOedometers.xlsx`, 1,312,465 bytes.
- SHA-256: `c77b7842e0667b59fed5f06584b753460b9a3956f9dcd8b0ac8ae770bc9eeeca`.
- MD5: `39a45dd1a10cf4b4b2f55f3d8a009322`. 저장소가 제공하는 체크섬과 일치한다.

Zenodo 레코드는 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)을 명시한다. USGS 메타데이터의 사용조건은 미국 정부의 공공영역 CC0 자료로 안내하면서 기관명·메타데이터·출처 표시를 요청한다. 양쪽 모두 재배포를 허용하며 앱은 저자·기관·DOI·라이선스 링크·가공 사항을 함께 표시한다. 임의로 하나의 표기를 숨기거나 원본의 라이선스를 변경하지 않는다. 이 앱에 대한 기관의 보증·승인을 의미하지 않는다.

공개 배포본은 원본 Excel을 포함하지 않는다. 화면의 원본 링크는 위의 Zenodo 제공기관 다운로드로 연결한다. 아래 파일은 선택 숫자와 출처 추적을 위해 포함한다.

- 원본 workbook의 파일명·체크섬·셀 주소는 추출 기록에 보존한다. 원본 다운로드에는 이 앱에서 사용하지 않는 시트도 있을 수 있다.
- [추출점·셀 주소·단위·가공 기록](../assets/data/oedometer-usgs-15021308-points.json).
- [Zenodo 레코드 메타데이터 원본 응답](../assets/data/oedometer-usgs-15021308-repository.json).

## 무엇을 실측이라고 부르는가

앱은 **공개된 실제 시험의 단계 종료점 표**를 읽는다. 그림에서 숫자를 판독한 자료가 아니고, 원 계측기의 연속 로그라고 부르지도 않는다. 간극비는 시험 관측에서 처리된 보고값이다. 출판된 종료점의 정밀도를 그대로 보존하지만 표시 자릿수가 측정 정확도를 뜻하지 않는다.

원본 `Overview`와 `Consolidation`, USGS 열 정의에서 다음을 확인했다.

- 같은 배치의 Peerless 2 air-floated kaolin, 탈이온수.
- 고정링 압밀시험, GeoTac Automated Load Frame 1.
- 초기 직경/높이 비 2.5: `Consolidation!G28`, `G38`.
- `N8:N19`: 단계 종료 시 무차원 간극비 e.
- `O8:O19`: 각 단계의 유효연직응력, 원단위 MPa. 앱에서는 ×1000 하여 kPa.
- `P8:P19`: 원문 MPa 기준 log10 응력. 앱은 이 열을 가져오는 대신 kPa 응력비의 로그를 직접 계산한다. 기울기는 응력 단위를 일관되게 바꾸어도 동일하다.

이 표만으로 단계별 유지시간·개별 시료의 정확한 직경/높이·배수 상세조건을 새로 확정하지 않는다. 조건을 명시하지 않은 흙이나 현장 시험의 대표값으로 외삽하지 않는다.

## 시험 순서와 구간

응력값으로 정렬하지 않고 원행 순서를 유지한다. 같은 응력에 다시 도달한 점도 다른 관측으로 남긴다. 예를 들어 원행 12와 14는 모두 약 1021.136 kPa지만 e는 각각 0.885400과 0.872769다.

| 경로 | 원본 행 | 앱 전체 기록번호 | 선택 의미 |
|---|---|---|---|
| 처음 재하 | 8–12 | 1–5 | 약 27.82→1021.14 kPa. 저자 Cc 결과표의 하한은 원행 9, 약 48.06 kPa |
| 짧은 제하 | 12–13 | 5–6 | 전체 그림에는 보존. 독립 구간 선택은 여러 점이 있는 마지막 제하를 사용 |
| 재재하 | 13–14 | 6–7 | 약 341.31→1021.14 kPa. 공개된 두 점 전체를 읽음 |
| 추가 재하 | 14–16 | 7–9 | 이전 최대응력에 도달한 뒤 약 5997.59 kPa까지 재하 |
| 마지막 제하 | 16–19 | 9–12 | 약 5997.59→140.46 kPa. 진행 방향이 오른쪽에서 왼쪽 |

사용자는 경로와 그 경로 안의 두 점을 선택한다. 처음 재하의 첫 저응력점을 포함하면 저자의 Cc 결과표 하한 밖이므로 `Csec`로 표시한다. 추가 재하의 재재하 종료점을 포함하는 할선도 `Csec`로 구별한다. 원문 처녀압축 판독 범위 안의 선택은 `Cc · 두 점 할선`, 짧은 재재하는 `Cr · 두 점 할선`, 마지막 제하는 `Cs · 두 점 할선`이다. 이 구분은 출판된 구간과 관측 순서를 사용하며, 선행압밀응력을 자동 판정한 것이 아니다.

저자가 보고한 Cc=0.421은 더 넓은 구간의 결과다(`B28:G28`). 앱의 두 점 할선과 계산 방식이 다르므로 그 값으로 강제로 맞추지 않는다. Cr=0.08734452701626332는 원행 13–14 두 점 계산과 일치한다(`B38:G38`). 제하 Cs를 재재하 Cr와 같다고 가정하지 않는다.

## 계산과 기본 결과

```text
Csec = (e1 − e2) / log10(σ′2 / σ′1)
Δε = (e1 − e2) / (1 + e1)
mv = Δε / (σ′2 − σ′1)
M = 1 / mv
```

변형률은 첫 점의 시료 높이를 기준으로 하는 유한 구간값이다. M은 일차원 구속계수이며 Young 계수 E가 아니다. 이 구간값을 다른 응력 수준에 일정하게 적용하는 구성모형을 생성하지 않는다. 정의의 근거는 [FHWA GEC 5, §5.4.2.2, p.126](https://www.fhwa.dot.gov/engineering/geotech/pubs/010549.pdf)과 기존 [교육용 읽기 문서](oedometer-reading.md)를 따른다.

기본은 처음 재하의 경로 2→5번, 원본 행 9→12다.

- σ′: 48.062362521877365→1021.1357838253685 kPa.
- e: 1.4667269742613758→0.8854001927542371.
- Cc(두 점)=0.43798406573453513, mv=0.00024218856720963883 /kPa, M=4.129014063386395 MPa.

마지막 제하 전체에서는 Δσ′와 Δε가 모두 음수이며 mv는 양수다. Cs=0.12203195833244851, M=46.54388614243908 MPa. 이 값도 선택 구간에 의존한다.

## 시간자료는 검증 보류

원본의 `Log Time Permeability Example` 시트에는 시간·응력·시료 높이 기록과 계산 예제가 있다. USGS 상위 시트 설명은 이를 GeoTac Frame 1의 0.05 MPa 단계(`Permeability!R9`)와 연결한다. 그러나 같은 메타데이터의 `Stress [kPa]` 열 설명은 시료가 없는 다공석 시험이라고 적고, `Height of Specimen [mm]` 열은 시료 높이라고 설명하여 서로 충돌한다.

현재는 이 불일치를 해소했다고 주장하지 않는다. 제공기관 원본에는 해당 자료가 있지만 학습 UI에서 실제 시료의 시간응답으로 확정해 표시하거나 t50·cv·k를 새로 계산하지 않는다. 특히 재하 도중 가압응력 기록을 시료 내부의 시간별 유효응력이라고 자동 해석하지 않는다. 이번 실측 보강의 제공 범위는 별도로 명확하게 정의된 `Consolidation!N8:O19` 종료점이다.

## 엔진·뷰 계약

`OedometerEvidence.read({evidenceBranch,evidenceFirst,evidenceLast})`.

- defaults: `{evidenceBranch:'loading', evidenceFirst:2, evidenceLast:5}`.
- 경로: `loading`, `reloading`, `continued`, `unloading`. 각 경로의 점 수는 5, 2, 3, 4.
- first/last는 경로 안의 1기반 정수. 순서 역전·동일점·소수·비유한·문자열·범위 밖은 실패한다. 임의 보간·정렬·반올림·클램프 없음.
- 반환: `valid,errors,model,source,points,branch,branchPoints,first,last,deltaStress,deltaE,logInterval,index,strain,mv,modulus,kind`와 선택 필드.
- `OedometerEvidenceView.controls(data)`, `.render({result,baseline})`, `.onFieldChange(data,field)`.
- `onFieldChange`는 사용자가 경로를 변경할 때만 해당 경로의 기본 두 점으로 선택을 바꾸며 설명을 표시한다. 숫자 입력 오류를 조용히 고치지 않는다.
- 모델 ID는 `usgs-geotac1-stage-end-v1`. 교육용 자료 등 다른 모델의 baseline은 그림·수치 비교에서 제외한다. 같은 기록의 다른 경로끼리는 동일 축에 저장된 할선을 표시한다.
- 공통 descriptor는 실제자료 모드에서 evidence 세 필드만 활성화하고 교육용 점 번호·응력이력 입력 오류를 격리한다.

## 검증 증거

`tests/oedometer-evidence.test.mjs`는 선택 JSON과 런타임 점의 일치, 단위·순서·중복응력 보존, 저자 Cr 재현, 별도 수치 기준값, 모든 허용 선택쌍의 시료 체적 관계, 제하 부호, 구간별 지수 구별, 입력 오류, 자료 불변성, 다른 모델 baseline 격리를 검사한다.

원본 workbook이 없는 명시적 공개 배포본에서는 원본 SHA/발행처 MD5 검사와 원본 XLSX ZIP/XML 셀 대조 검사 2개를 건너뛴다. 이 배포본의 테스트 통과만으로 제공기관 원본 바이트나 셀의 재대조를 수행했다고 볼 수 없다. [검증 범위](validation.md)를 참고한다.

재실행 명령은 `node --test tests/oedometer-evidence.test.mjs`다. 화면 변경 시에는 처음 재하와 제하, 좁은 화면의 표시, 경로·점 선택과 제공기관 원본 링크를 별도로 확인한다.

실제 학습자 검증·기관 검토·현장 정수 채택·전체 압밀시험 자동 분석의 완료를 뜻하지 않는다.
