# 소성도표 보완 메모

확인일: 2026-09-22. 본 메모는 학습 화면을 위한 범위 검토이며 현행 ASTM 원문 전 조항에 대한 적합성 인증이 아니다.

## 구현·통합

`outputs/geotech-lab/src/plasticity.mjs`는 `export const Plasticity = (() => { ... })();` 형식이다. 기존 빌드의 소스 순서에 `plasticity.mjs`를 `app.js` 앞에 추가한다. `Soil.classify`가 전체 흙의 USCS 기호를 계속 결정하며 이 보조기는 소성도표 점·주석만 제공한다.

- `Plasticity.analyze({ll,pl,np=false,fines=null})` → `valid`, `status`, `errors`, `pi`, `point:{ll,pi}|null`, `aLine`, `uLine`, `zone`, `label`, `scope`, `scopeNote`, `notes`, `plausibility:{aboveU,note}`, `displayDomain:{xMin,xMax,yMin,yMax}`.
- `status`: `invalid`, `nonplastic`, `plotted`. `scope`: `unknown`, `fine-soil`, `clean-coarse`, `coarse-fines`.
- `aAt(ll)`, `uAt(ll)`와 `boundaries`, `sources`를 함께 내보낸다.
- `displayDomain`은 기본 LL 0–110, PI 0–70. 높은 LL/PI 입력에는 확장하며 값에 임의의 100% 상한을 두지 않는다. SVG의 도표 영역에 선을 클리핑할 것.
- NP이면 PI 및 점을 null로 반환한다. 측정된 `LL=PL`이면 PI=0인 실제 점을 표시할 수 있으므로 두 경우를 구별한다.
- U선 위의 입력은 유효한 점으로 표시하면서 시험값 확인 안내를 제공한다. U선을 넘었다는 이유로 수치를 수정하거나 별도의 토질 기호로 바꾸지 않는다.
- `node --test tests/plasticity.test.mjs` 8개 통과. LL50, PI4·7, A선 경계, U선 안내, NP, 큰 LL, 잘못된 입력, 전체 흙/세립분 구분을 확인했다.

## 도표의 이론적 의미

소성도표에서 사용되는 실험시료는 No.40 체(0.425 mm) 통과분이다. 흙 전체의 세립분 함량은 No.200 체(0.075 mm) 통과율이라는 점을 화면에서 구분해야 한다. 전체 시료가 조립토일 때 CL 등 영역표시는 포함된 세립분의 성상을 뜻하며 최종 전체 흙 기호와 동일하지 않다. [FHWA 시험·분류 안내](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/07052/chapt4_3.cfm)

A선 사선은 `PI=0.73(LL−20)`, L/H 경계는 LL50이다. CL-ML은 LL50 미만, A선 이상, PI4–7 범위이다. A선의 낮은 끝은 PI4 수평선과 함께 표시하고 PI7을 경계영역 상단으로 보이면 된다. 유기질 분류는 이 도표만으로 끝낼 수 없어 무기질 도표임을 명시한다. [USBR 현장 지질 매뉴얼, 3장 그림 3-5 및 표 3-1·3-2](https://www.usbr.gov/tsc/techreferences/mands/geologyfieldmanual-vol1/chap03.pdf)

U선은 자연토 시험자료의 경험적 상한으로 제시된 참고선이다. 기울기 부분은 `PI=0.9(LL−8)`이다. LL16 근처의 수직 부분은 교재 그림에서 도식적으로 PI7까지 그려지며 본 보조기의 `uAt`는 사선식을 반환한다. U선 초과는 시험 재확인 안내의 근거로 쓰며 분류 경계로 취급하지 않는다. [USACE Wetlands Engineering Handbook, Appendix A, A-11–A-12; USACE 저작물의 CSU 보관본](https://www.csu.edu/cerc/researchreports/documents/WetlandsEngineeringHandbookUSACE2000.pdf)

## 1장에 실제로 빠진 핵심과 타이트한 확장 순서

현재 입도곡선만 보면 분류를 거의 배웠다고 오해하기 쉽다. 이번 소성도표 추가는 핵심 누락을 메우며, 우선순위는 다음과 같다.

1. **지금:** 입도곡선 ↔ 소성도표 전환, LL·PL·세립분 동시 조절, 변화에 따라 전체 USCS 기호와 현재 판정경로를 함께 보여주기. 기본 모래 예제 외 자갈 우세·세립토 예제가 있어야 G/S와 조립/세립 경계를 자연스럽게 이해한다. 분류기 계산에 포함되더라도 기본 실험 시나리오에 없으면 학습 접근성이 부족하다.
2. **다음 작은 확장:** 체잔류 질량 → 누적통과율 변환의 짧은 예제, D10/30/60 보간의 직접 표시, 균등·양호·결손 입도 비교. 각 항목을 별도 메뉴로 흩뜨리지 말고 입도 실험의 예시/설명에 통합한다.
3. **연결 개념:** 함수비와 LL·PL의 위치, 액성지수 `LI=(w−PL)/(LL−PL)`를 3상·함수비 또는 소성 실험에서 다룰 수 있다. 이는 분류 기호와 현재 상태의 차이를 익히게 한다. NP 또는 PI=0에서는 LI를 계산하지 않으며 수축한계 없이 고체/반고체 경계를 임의로 만들지 않는다.
4. **접어서 둘 내용:** 입도에 의한 점토 크기와 소성에 의한 점토 성상은 다름, 분류가 투수계수·강도·압축성을 확정하지 않는 이유, 유기질/이탄의 별도 관찰·시험. 토질 기호만으로 단정적 지반정수를 생성하지 않는다.
5. **후속 선택:** AASHTO/GI는 포장 연결 경로로 두면 유용하나 이번 USCS 화면에 상시 노출하지 않는다. 비중계 상세 보정·모든 시험규격 절차·광물 구조는 시험/점토 특성 챕터로 연결하면 1장이 불필요하게 커지지 않는다.

이 순서는 기능 수를 늘리는 기준보다 ‘입력 관계를 바꾸어야 이해가 좋아지는가’를 우선한 제품 판단이다. 즉 지금 완료된 것은 첫 실험 뼈대이며, 첫 장 전체의 학습 완결로 표현하기에는 부족했다.
