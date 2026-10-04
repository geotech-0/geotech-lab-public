# 흙의 분류 실험: 계산 명세와 근거

2026-09-21. 첫 제품의 무기질 USCS 분류 학습 모형. 이 문서는 학습용 구현 범위를 정의하며 최신 ASTM 시험절차 전체를 구현했다는 뜻이 아니다.

## 입력과 예시

- `generateCurve({fines, gradation})`: 세립분 0~60%, `well`(넓은 모래 입도), `uniform`(좁은 모래 입도). 입경 mm `[0.075,0.15,0.3,0.6,1.18,2,4.75,9.5,19]`와 누적 건조질량 통과율 %를 반환한다. 4.75 mm 이상은 모두 100%로 자갈이 없는 합성 예시다. 실측 자료가 아니다.
- 조작은 세립분 비율과 모래 입도 예시를 먼저 제공하고, 세립분이 5% 이상일 때 소성 자료 또는 NP 선택을 이어 제공한다. 선택한 입도 예시명이 USCS 결과를 결정하지 않는다. 모든 분류는 실제 생성된 곡선으로 계산한다.
- 분류 입력은 75 mm보다 작은 흙을 100%로 정규화한 시료를 가정한다. 자갈·모래·세립분 합은 100%이다. 입경 범위와 단조성을 강제로 고치지 않고 오류를 반환한다.

## API

```js
import { Soil } from './src/soil.mjs';
const points = Soil.generateCurve({fines: 3, gradation: 'well'});
const analysis = Soil.analyzeCurve(points);
const result = Soil.classify({points, ll: 35, pl: 20, np: false, organic: false});
```

`analyzeCurve`는 `{valid,errors,warnings,d10,d30,d60,cu,cc,fines,gravel,sand}`를 반환한다. 입경은 양수·증가순·중복 없음, 통과율은 0~100%·비감소이며 0.075/4.75 mm 값이 직접 존재하거나 자료로 둘러싸여야 한다. 체 사이 통과율과 Dp는 log(입경)–통과율 직선 보간이다. 외삽하지 않는다. 목표 통과율이 수평 구간이면 Dp가 유일하지 않아 null로 반환한다.

`classify`는 위 필드에 `{status,symbol,name,reason,steps,needs,pi,aLine,fineSymbol}`을 추가한다.

- `status=classified`: 필요한 분류 자료가 갖춰졌다.
- `status=needs-info`: 입력된 자료는 유효하지만 분류 자료가 부족하다. `valid=true`, `symbol=null`, `needs`에 직접 해결할 항목을 제공한다.
- `status=invalid`: 입력 범위·단조성·LL/PL 관계가 잘못되었다. `valid=false`, `symbol=null`이다.
- `status=unsupported`: 유기질 조건이며 별도 자료·모형이 필요하다. 입도 자료는 유효할 수 있지만 무기질 분류기호를 내지 않는다.

`name`은 학습용 기본 그룹명이다. USCS의 모든 상세 접미사(with sand/gravel 등)는 이 버전에서 출력하지 않는다. 함수들은 DOM이나 다른 전역상태를 사용하지 않는다.

## 중요한 경계

- 세립분 `≥50%`는 세립토. 그 미만의 조립토는 자갈 질량이 모래 질량보다 클 때 G, 같거나 작으면 S이다. 전체 시료 50%와 조립분 내 50%를 혼동하지 않는다.
- 세립분 `<5%`는 입도 분류. `5~12%`(양끝 포함)는 입도·세립분 성상을 함께 표시. `>12%`는 세립분 성상으로 분류한다.
- D10·D30·D60이 있을 때 `Cu=D60/D10`, `Cc=D30²/(D10·D60)`을 사용한다. G는 Cu≥4, S는 Cu≥6이며 둘 다 1≤Cc≤3이어야 W다.
- 예시 곡선은 0.075 mm에서 시작한다. 세립분이 10%를 넘으면 D10을 알 수 없으므로 10~12% 구간에서 W/P를 만들어내지 않는다. '더 작은 입경의 자료가 필요'라는 결과가 이 학습 내용의 일부다. >12%에서는 W/P가 분류에 필요 없으므로 소성 자료만 있으면 결과를 낸다.
- `A-line = 0.73(LL−20)`. LL<50에서는 A선 아래 또는 PI<4 → ML, A선 위/선상이며 4≤PI≤7 → CL-ML, 그보다 큰 PI → CL. LL≥50에서는 A선 위/선상 → CH, 아래 → MH.
- 세립분 >12%의 CL-ML 성상은 GC-GM 또는 SC-SM이다. 세립분 5~12%의 CL-ML 성상은 GW-GC/GP-GC/SW-SC/SP-SC로 표현하고 이름에 실트질 점토 함유를 표시한다. 세 기호를 이어 붙이지 않는다.
- NP는 사용자에게 확인받은 관측 상태다. 조립토는 M 성상으로 분류할 수 있다. 세립토의 L/H 구분에는 LL을 여전히 요구한다. NP 선택 시 PL을 사용하지 않으며 UI에서 PL 입력이 적용되지 않음을 표시한다. NP와 미입력을 같은 것으로 취급하지 않는다.
- LL/PL은 물성 시험값의 %이며 임의의 100% 상한을 두지 않는다. LL>0, PL≥0, PL≤LL을 검증한다. 유기질 여부가 참이면 OL/OH를 추정하지 않는다.

## 근거와 검증

공식 자료를 2026-09-21에 확인했다. 최신 국내 설계기준 적합성 검사나 전문 시험성적서 작성 도구로 제시하지 않는다.

1. [FHWA NHI-05-037, Chapter 4.6, Table 4-13 및 주석](https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/04c.cfm): USCS 실내 분류의 주요 경계, Cu/Cc, 이중기호. HTML 표의 SAND 'retained'와 GP 부등식에는 전사 오류가 있어 해당 문자열을 그대로 구현하지 않고 아래 USBR/USACE와 대조했다.
2. [USBR Engineering Geology Field Manual, Volume I Chapter 3, p.26 Table 3-2](https://www.usbr.gov/tsc/techreferences/mands/geologyfieldmanual-vol1/chap03.pdf): 5~12% 세립분에서 CL-ML일 때 C를 포함한 이중기호를 쓰는 상세 처리, 건조질량 기준과 75 mm 이하 시료 범위. 시각분류와 실내분류의 수치 경계가 다르므로 시각분류의 반올림값은 사용하지 않는다.
3. [USACE ERDC/CRREL TR-15-4, Table 4, p.15](https://usace.contentdm.oclc.org/digital/api/collection/p266001coll1/id/3757/download): PI 4~7 포함 경계, Cu/Cc 부등식, LL 50 경계를 교차 확인한다.

자동 검증은 Node 기본 `node:test`와 `node:assert/strict`만 사용한다. 독립 기하평균 보간 예제, 5/12/50% 및 PI4/7·LL50 경계, gravel/sand 동률, 잘못된 누적질량, 미측정 Dp, NP/유기질/입력누락을 확인한다. 범위 안에서 공식을 구현했다는 검증이며 실제 시료의 대표성이나 시험오차를 검증하지 않는다.
