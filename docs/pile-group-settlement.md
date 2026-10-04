# 군말뚝 등가기초 아래 지정층의 침하

기존 `pile-group` 메뉴에 `settlement` / ‘군의 침하’ 질문을 추가한다. 기존 `group` / ‘개별합계와 블록’은 유지한다. 침하와 저항은 서로 다른 입력·모형으로 계산한다. 새 메뉴를 만들지 않는다.

## 직접 확인한 원출처와 좁힌 범위

[FHWA GEC 8, Design and Construction of Continuous Flight Auger Piles (2007)](https://www.fhwa.dot.gov/engineering/geotech/pubs/gec8/gec8.pdf)의 §5.5.3.3, 인쇄 pp.99–101(PDF pp.122–124), Figs.5.19–5.20을 공식 PDF에서 직접 확인했다. 등가기초의 대표 깊이는 말뚝 선단보다 L/3 위, 면적은 군 외곽 B×Z다. 그 아래의 1H:2V 확산과 하부층별 압축 합산을 설명하며, 실제 위치는 지층·하중전달기구에 따라 조정하도록 명시한다. 문헌의 말뚝 근입 D를 앱에서는 길이 L로 쓰고 직경에 D를 사용한다.

이 화면은 수직 마찰말뚝의 정방형 배열과 강체에 가까운 캡의 대칭 하중 예제에서 등가기초 위치를 2L/3로 고정한다. 선단지지·경사말뚝·편심하중·다양한 층상 지반에 이를 자동 적용하지 않는다. 기존 NHI-06-089 본문의 30° 확산을 1H:2V와 같다고 바꾸지 않고, 이번 모형의 근거는 GEC 8로 분리했다.

FHWA의 일반 e–logσ′ 층별 압밀해석 전체를 구현한 것은 아니다. 앱의 추가 단순화는 **지정층의 일정한 1D 구속계수 M=Δσ′/εz**다. 배수가 끝난 응력 증가에서 지정층 압축 기여만 적분한다. 이 층 밖의 변형을 0이라고 판정하는 것이 아니며, 말뚝 자체·캡 압축까지 합한 총두부침하가 아니다.

## API와 단위

`PileGroupSettlement.solve({countSide,spacingRatio,length,diameter,groupLoad,layerTop,layerThickness,layerModulus})`

- n=`countSide`: 한 변의 정수 말뚝 수. 전체 개수 n².
- `spacingRatio`=s/D, `length`=L, `diameter`=D.
- Q=`groupLoad`: 군 전체의 추가 사용하중 kN. 극한저항·단일 말뚝 하중이 아니다.
- Zt=`layerTop`: 지표에서 잰 압축층 상면 깊이 m. L을 바꿔도 고정된다.
- H=`layerThickness`: 지정 압축층 두께 m.
- M=`layerModulus`: 내부 단위 kPa, 화면 MPa(1 MPa=1000 kPa). Young 탄성계수 E와 다르다.
- 길이는 모두 m. 응력 kPa=kN/m². 침하는 m와 `settlementMm`를 제공한다.

반환값은 `valid,errors,warnings`와 입력, `width,area,count,spacing,equivalentDepth,offset,layerBottom,spreadTop,spreadBottom,equivalentPressure,stressTop,stressBottom,averageStress,stressIntegral,settlement,settlementMm,maxVerticalStrain,averageVerticalStrain,profile,source,model`이다.

`profile`은 지정층 내 81개 표시점이다(H=0이면 1점). 각 점은 지표 깊이 `depth`, 층 상면 아래 거리 `withinLayer`, 등가기초 아래 거리 `z`, 확산 폭 `spreadWidth`, `stress`, `verticalStrain`, 층 상면부터의 `cumulativeSettlement`를 가진다. 결과 침하는 이 표시점들을 수치 적분한 값이 아니라 아래 해석해다.

## 계산식

```
s = (s/D) D
B = (n−1)s + D
ze = 2L/3
a = Zt−ze ≥ 0
Δσ′(z) = Q/(B+z)²
S층 = ∫[a,a+H] Δσ′(z)/M dz
     = (Q/M)[1/(B+a)−1/(B+a+H)]
     = QH/[M(B+a)(B+a+H)]
평균 Δσ′ = Q/[(B+a)(B+a+H)]
```

1H:2V는 양쪽으로 각각 z/2씩 넓어지므로 전체 폭이 B+z가 된다. 매 깊이에서 `(B+z)²Δσ′=Q`의 하중 보존을 확인한다. 얇은 층에서 두 역수의 차를 빼며 생기는 소실을 피하려고 마지막 식을 사용한다.

M을 두 배로 하면 응력은 그대로이고 S만 절반이다. 같은 Q에서 B를 넓히면 지정층 응력과 침하가 줄어든다. 개수 변화 때 Q를 n²에 비례해 자동 증대하지 않는다. 같은 B·L·Q·지층 조건이라면 서로 다른 배열 개수도 이 등가 모형에서는 같은 값이 나온다.

Zt가 고정된 상태에서 L이 늘면 등가기초가 층에 가까워져 a가 줄고 지정층 침하 기여가 커질 수 있다. 이 제한 모형의 기하학적 결과이며 실제 말뚝 길이 최적화 또는 긴 말뚝의 일반적 열등성을 뜻하지 않는다.

## 기본값과 독립 손계산

기본 n=3, s/D=3, L=20 m, D=0.6 m, Q=5000 kN, Zt=20 m, H=10 m, M=8000 kPa:

- B=4.2 m, ze=13.333333 m, a=6.666667 m.
- Δσ′top=42.342580 kPa, Δσ′bottom=11.483224 kPa, 평균=22.050609 kPa.
- 지정층 S=27.563261 mm, 평균 압축변형률 약 0.275633%.

독립 손계산 n=3, s/D=1.5, D=1, L=12, Zt=10, H=6, Q=6000, M=10000은 B=4, a=2가 되어 `S=0.6(1/6−1/12)=0.05 m=50 mm`다.

## 검증과 화면

독립 검사에는 손계산, 32,768개 중점 수치적분과 해석해 비교, 층 분할 후 합산 보존, 깊이별 하중 보존, Q/M 비율, 기하학적 상사, 같은 외곽 폭의 다른 배열, H=0·Q=0, 얇은 층, 응력·누적침하의 단조성, 잘못된 입력과 최대변형 범위가 포함된다. descriptor의 두 질문에 대해 비활성 입력 오류가 결과를 막지 않는지 검사한다.

구현 시점 새 독립 검사 21개가 통과했다. 실제 제공 앱의 1440 px·390 px 화면을 캡처하고 시각 확인했다. 기본 27.56 mm, 화면 M=8→16 MPa 편집 후 13.78 mm, 기준값 표시, Zt가 등가기초보다 얕을 때 오류 및 복구, 그 오류가 있는 상태에서 저항 질문은 정상 계산되는지, H=0 경계를 확인했다. 가로 넘침과 브라우저 오류는 없었다. 공통 파일은 수정하지 않았다.

저항 질문의 기존 `PileModels.group`은 넘겨받은 모든 필드를 검사하므로, descriptor에서 저항에 필요한 여섯 필드만 전달한다. 침하 질문은 별도 엔진의 여덟 필드만 읽는다. `activeFields`도 동일하게 분리했다.

주요 슬라이더 다섯 개는 n·s/D·Q·M·H다. L·D·Zt는 추가 조건에 있으며, 공유 기하값은 질문을 바꿔도 유지된다. 단면의 폭·깊이는 같은 실제 척도로 그리고, 우측은 지정층 상면을 0으로 하는 별도 응력–깊이 축이다. 우측 곡선 아래 면적/M이 S층이다. 기준값을 켜면 동일 척도의 기존 확산 경계와 응력분포를 표시한다.

## 한계

시간·초기 유효응력·선행압밀응력·Cc/Cr·2차압축·M의 응력 의존, 말뚝·캡의 탄성압축, 캡 접촉, 군 내 하중분배, 시공 변화 및 상세 상호작용을 계산하지 않는다. 일정 M·작은 변형 모형의 표시 범위는 지정층 상면 Δσ′/M≤10%로 제한한다. 10%는 설계 허용치나 정확도 보장선이 아니다. 현장 군 전체의 허용침하 또는 안전 판정은 제공하지 않는다.
