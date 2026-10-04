/** Plasticity-chart annotations for inorganic fines; not a whole-soil classifier. */
export const Plasticity = (() => {
  const EPS = 1e-10;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const missing = value => value === null || value === undefined || value === '';
  const aAt = ll => 0.73 * (ll - 20);
  const uAt = ll => 0.9 * (ll - 8);
  const boundaries = Object.freeze({ liquidLimit: 50, transitionPiMin: 4, transitionPiMax: 7, aSlope: 0.73, aInterceptLl: 20, uSlope: 0.9, uInterceptLl: 8 });
  const labels = { CL: '저소성 점토 영역', ML: '저소성 실트 영역', 'CL-ML': '실트질 점토 경계 영역', CH: '고소성 점토 영역', MH: '고액성한계 실트 영역' };
  const sources = Object.freeze([
    { title: 'USBR Engineering Geology Field Manual, Chapter 3, Figure 3-5', url: 'https://www.usbr.gov/tsc/techreferences/mands/geologyfieldmanual-vol1/chap03.pdf' },
    { title: 'USACE Wetlands Engineering Handbook, Appendix A, pp. A-11–A-12', url: 'https://www.csu.edu/cerc/researchreports/documents/WetlandsEngineeringHandbookUSACE2000.pdf' },
    { title: 'FHWA LTPP Laboratory Materials Testing and Handling Guide, Chapter 4', url: 'https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/07052/chapt4_3.cfm' },
  ]);

  function upperTick(value, minimum) {
    if (!finite(value) || value <= minimum / 1.15) return minimum;
    const padded = value <= Number.MAX_VALUE / 1.15 ? value * 1.15 : value;
    const step = 10 ** Math.max(1, Math.floor(Math.log10(padded)) - 1);
    const tick = Math.ceil(padded / step) * step;
    return Number.isFinite(tick) ? Math.max(minimum, tick) : value;
  }

  function analyze({ ll, pl, np = false, fines = null } = {}) {
    const result = {
      valid: false, status: 'invalid', errors: [], pi: null, point: null,
      aLine: null, uLine: null, zone: null, label: '소성 입력 확인 필요',
      scope: 'unknown', scopeNote: '', notes: [],
      plausibility: { aboveU: false, note: '' },
      displayDomain: { xMin: 0, xMax: 110, yMin: 0, yMax: 70 },
    };
    if (typeof np !== 'boolean') result.errors.push('비소성(NP) 여부를 확인하세요.');
    if (!missing(ll) && (!finite(ll) || ll <= 0)) result.errors.push('액성한계 LL은 0보다 큰 숫자로 입력하세요.');
    if (!np && (missing(ll) || missing(pl))) result.errors.push('소성도표에는 액성한계 LL과 소성한계 PL이 필요합니다.');
    if (!np && !missing(pl) && (!finite(pl) || pl < 0)) result.errors.push('소성한계 PL은 0 이상의 숫자로 입력하세요.');
    if (!np && finite(ll) && finite(pl) && pl > ll) result.errors.push('소성한계 PL은 액성한계 LL보다 클 수 없습니다.');
    if (!missing(fines) && (!finite(fines) || fines < 0 || fines > 100)) result.errors.push('세립분 함량은 0~100%로 입력하세요.');
    if (result.errors.length) return result;

    result.valid = true;
    result.scope = missing(fines) ? 'unknown' : fines >= 50 - EPS ? 'fine-soil' : fines < 5 - EPS ? 'clean-coarse' : 'coarse-fines';
    result.scopeNote = result.scope === 'fine-soil'
      ? '세립분이 50% 이상이므로 무기질 세립토의 분류 영역입니다.'
      : result.scope === 'clean-coarse'
        ? '세립분이 5% 미만이므로 이 도표의 위치는 현재 흙의 USCS 기호를 결정하지 않습니다.'
        : result.scope === 'coarse-fines'
          ? '조립토에 포함된 세립분의 성상을 읽는 도표입니다. 전체 흙의 기호는 입도자료와 함께 결정합니다.'
          : '세립토 또는 조립토에 포함된 세립분의 성상을 읽는 도표입니다. 전체 흙의 분류에는 입도자료가 필요합니다.';
    result.notes.push('LL·PL은 No.40 체(0.425 mm) 통과분으로 시험합니다. 세립분 함량은 No.200 체(0.075 mm) 통과율입니다.');
    result.notes.push('무기질 흙의 영역만 표시합니다. 유기질 여부는 이 도표만으로 판정할 수 없습니다.');
    if (finite(ll)) {
      result.aLine = aAt(ll);
      result.uLine = uAt(ll);
      result.displayDomain.xMax = upperTick(ll, 110);
    }
    if (np) {
      result.status = 'nonplastic';
      result.label = '비소성(NP) — 점을 표시하지 않음';
      result.notes.push('NP는 측정된 PI=0과 같지 않습니다. LL−PL을 계산하거나 임의의 점을 찍지 않습니다.');
      return result;
    }

    result.status = 'plotted';
    result.pi = ll - pl;
    result.point = { ll, pi: result.pi };
    result.displayDomain.yMax = upperTick(result.pi, 70);
    const aboveA = result.pi >= result.aLine - EPS;
    result.zone = ll >= 50 ? (aboveA ? 'CH' : 'MH')
      : result.pi < 4 - EPS || !aboveA ? 'ML'
        : result.pi <= 7 + EPS ? 'CL-ML' : 'CL';
    result.label = labels[result.zone];
    // U-line is an empirical plausibility envelope, never a classification boundary.
    result.plausibility.aboveU = result.pi > result.uLine + EPS;
    result.plausibility.note = result.plausibility.aboveU
      ? 'U선 위에 있습니다. 자연토의 경험적 상한을 벗어나므로 LL·PL 시험값을 확인하세요. U선은 분류 경계가 아닙니다.'
      : 'U선은 자연토의 경험적 상한을 살펴보는 참고선이며 분류 경계가 아닙니다.';
    result.notes.push('LL을 고정하고 PL을 낮추면 PI가 커져 점이 위로 이동합니다. PL을 고정하고 LL을 높이면 점이 오른쪽 위로 이동합니다.');
    return result;
  }

  return { analyze, aAt, uAt, boundaries, sources };
})();
