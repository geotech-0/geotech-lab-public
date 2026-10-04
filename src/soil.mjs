/** Learning model: dry-mass percentages of the soil fraction smaller than 75 mm. */
export const Soil = (() => {
  const EPS = 1e-10;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const missing = value => value === null || value === undefined || value === '';
  const fmt = value => Number(value.toFixed(2)).toString();
  const emptyAnalysis = () => ({ valid: false, errors: [], warnings: [], d10: null, d30: null, d60: null, cu: null, cc: null, fines: null, gravel: null, sand: null });
  const names = {
    GW: '입도가 좋은 자갈', GP: '입도가 나쁜 자갈', GM: '실트질 자갈', GC: '점토질 자갈',
    SW: '입도가 좋은 모래', SP: '입도가 나쁜 모래', SM: '실트질 모래', SC: '점토질 모래',
    CL: '저소성 점토', ML: '저소성 실트', CH: '고소성 점토', MH: '고소성 실트',
    'CL-ML': '실트질 점토', 'GC-GM': '실트·점토질 자갈', 'SC-SM': '실트·점토질 모래',
  };

  function generateCurve({ fines = 3, gradation = 'well' } = {}) {
    if (!finite(fines) || fines < 0 || fines > 60) throw new RangeError('세립분은 0~60%로 입력하세요.');
    if (!['well', 'uniform'].includes(gradation)) throw new RangeError('입도 예시는 well 또는 uniform이어야 합니다.');
    const sizes = [0.075, 0.15, 0.3, 0.6, 1.18, 2, 4.75, 9.5, 19];
    // Synthetic sand-fraction examples, not laboratory data or a classification shortcut.
    const fractions = gradation === 'well'
      ? [0, 0.08, 0.14, 0.35, 0.57, 0.8, 1, 1, 1]
      : [0, 0.005, 0.02, 0.1, 0.95, 1, 1, 1, 1];
    return sizes.map((size, index) => ({ size, passing: fines + (100 - fines) * fractions[index] }));
  }

  function passingAt(points, size) {
    const exact = points.find(point => point.size === size);
    if (exact) return exact.passing;
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      if (a.size < size && size < b.size) {
        return a.passing + (b.passing - a.passing) * Math.log(size / a.size) / Math.log(b.size / a.size);
      }
    }
    return null;
  }

  function diameterAt(points, passing, warnings) {
    const matches = points.filter(point => Math.abs(point.passing - passing) < EPS);
    if (matches.length > 1) {
      warnings.push(`D${passing}은 통과율 ${passing}%의 수평 구간에 있어 하나의 입경으로 정할 수 없습니다.`);
      return null;
    }
    if (matches.length === 1) return matches[0].size;
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      if (a.passing < passing && passing < b.passing) {
        return a.size * Math.exp((passing - a.passing) / (b.passing - a.passing) * Math.log(b.size / a.size));
      }
    }
    warnings.push(`D${passing}은 입력된 입도곡선 범위 밖이므로 계산하지 않았습니다.`);
    return null;
  }

  function analyzeCurve(points) {
    const result = emptyAnalysis();
    if (!Array.isArray(points) || points.length < 2) {
      result.errors.push('입경과 통과율을 두 점 이상 입력하세요.');
      return result;
    }
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (!point || !finite(point.size) || point.size <= 0 || point.size >= 75 || !finite(point.passing) || point.passing < 0 || point.passing > 100) {
        result.errors.push(`${index + 1}번째 점: 입경은 0 초과 75 mm 미만, 통과율은 0~100%의 숫자로 입력하세요. 이 분류는 75 mm 미만 흙의 건조질량을 기준으로 합니다.`);
        continue;
      }
      if (index > 0 && points[index - 1] && finite(points[index - 1].size) && point.size <= points[index - 1].size) {
        result.errors.push('입경은 중복 없이 작은 값부터 입력하세요.');
      }
      if (index > 0 && points[index - 1] && finite(points[index - 1].passing) && point.passing < points[index - 1].passing) {
        result.errors.push('입경이 커질수록 누적 통과율이 줄어들 수 없습니다.');
      }
    }
    if (result.errors.length) {
      result.errors = [...new Set(result.errors)];
      return result;
    }
    const fines = passingAt(points, 0.075);
    const p4 = passingAt(points, 4.75);
    if (fines === null) result.errors.push('0.075 mm 통과율을 입력하거나, 그 입경의 양쪽 자료를 추가하세요.');
    if (p4 === null) result.errors.push('4.75 mm 통과율을 입력하거나, 그 입경의 양쪽 자료를 추가하세요.');
    if (result.errors.length) return result;
    result.valid = true;
    result.fines = fines;
    result.gravel = 100 - p4;
    result.sand = p4 - fines;
    result.d10 = diameterAt(points, 10, result.warnings);
    result.d30 = diameterAt(points, 30, result.warnings);
    result.d60 = diameterAt(points, 60, result.warnings);
    if (result.d10 !== null && result.d60 !== null) result.cu = result.d60 / result.d10;
    if (result.d10 !== null && result.d30 !== null && result.d60 !== null) {
      result.cc = result.d30 ** 2 / (result.d10 * result.d60);
    }
    return result;
  }

  function plasticity({ ll, pl, np }, fineSoil) {
    const result = { errors: [], needs: [], pi: null, aLine: null, fineSymbol: null };
    if (!missing(ll) && (!finite(ll) || ll <= 0)) result.errors.push('액성한계 LL은 0보다 큰 숫자로 입력하세요.');
    if (!np && !missing(pl) && (!finite(pl) || pl < 0)) result.errors.push('소성한계 PL은 0 이상의 숫자로 입력하세요.');
    if (!np && finite(ll) && finite(pl) && pl > ll) result.errors.push('소성한계 PL은 액성한계 LL보다 클 수 없습니다.');
    if (result.errors.length) return result;
    if (missing(ll) && (fineSoil || !np)) result.needs.push('액성한계 LL');
    if (!np && missing(pl)) result.needs.push('소성한계 PL 또는 비소성(NP) 확인');
    if (result.needs.length) return result;
    result.pi = np ? 0 : ll - pl;
    result.aLine = finite(ll) ? 0.73 * (ll - 20) : null;
    if (np) {
      result.fineSymbol = fineSoil && ll >= 50 ? 'MH' : 'ML';
      return result;
    }
    const aboveA = result.pi >= result.aLine - EPS;
    if (ll >= 50) result.fineSymbol = aboveA ? 'CH' : 'MH';
    else if (result.pi < 4 - EPS || !aboveA) result.fineSymbol = 'ML';
    else if (result.pi <= 7 + EPS) result.fineSymbol = 'CL-ML';
    else result.fineSymbol = 'CL';
    return result;
  }

  function classify({ points, ll, pl, np = false, organic = false } = {}) {
    const analysis = analyzeCurve(points);
    const result = { ...analysis, status: analysis.valid ? 'needs-info' : 'invalid', symbol: null, name: '분류 확인 중', reason: '', steps: [], needs: [], pi: null, aLine: null, fineSymbol: null };
    if (!analysis.valid) {
      result.name = '입력 확인 필요';
      result.reason = result.errors.join(' ');
      return result;
    }
    if (organic) {
      result.status = 'unsupported';
      result.name = '유기질 여부 추가 검토';
      result.reason = '이 실험은 무기질 흙의 분류를 다룹니다. 유기질 흙은 건조 전후 액성한계 등 별도 자료가 필요합니다.';
      return result;
    }
    // Match the existing grading/PI tolerance at percentage boundaries after mass conversion.
    // This only absorbs floating-point noise; it is not measurement uncertainty.
    const fineSoil = analysis.fines >= 50 - EPS;
    const cleanCoarse = analysis.fines < 5 - EPS;
    const withinDualBand = analysis.fines <= 12 + EPS;
    const letter = analysis.gravel > analysis.sand + EPS ? 'G' : 'S';
    const material = letter === 'G' ? '자갈' : '모래';
    result.steps.push(`0.075 mm 통과율 ${fmt(analysis.fines)}% → ${fineSoil ? '세립토(50% 이상)' : '조립토(50% 미만)'}`);
    if (!fineSoil) result.steps.push(`조립분 중 자갈 ${fmt(analysis.gravel)}%, 모래 ${fmt(analysis.sand)}% (전체 건조질량 기준) → ${material}`);
    let grading = null;
    if (!fineSoil && withinDualBand) {
      if (analysis.cu === null || analysis.cc === null) {
        result.needs.push('D10·D30·D60을 정할 수 있는 추가 입도자료');
      } else {
        const threshold = letter === 'G' ? 4 : 6;
        grading = analysis.cu >= threshold - EPS && analysis.cc >= 1 - EPS && analysis.cc <= 3 + EPS ? 'W' : 'P';
        result.steps.push(`Cu=${fmt(analysis.cu)}, Cc=${fmt(analysis.cc)} → ${grading === 'W' ? `Cu≥${threshold}, 1≤Cc≤3 충족` : `Cu≥${threshold}, 1≤Cc≤3 중 미충족 항목 있음`}`);
      }
    }
    let plastic = null;
    if (!cleanCoarse) {
      plastic = plasticity({ ll, pl, np }, fineSoil);
      result.pi = plastic.pi;
      result.aLine = plastic.aLine;
      result.fineSymbol = plastic.fineSymbol;
      result.errors.push(...plastic.errors);
      result.needs.push(...plastic.needs);
      if (result.errors.length) {
        result.valid = false;
        result.status = 'invalid';
        result.name = '소성 입력 확인 필요';
        result.reason = result.errors.join(' ');
        return result;
      }
      if (plastic.fineSymbol) {
        result.steps.push(np
          ? `비소성(NP) 확인${fineSoil ? `, LL=${fmt(ll)}%` : ''} → ${plastic.fineSymbol}`
          : `LL=${fmt(ll)}%, PI=LL−PL=${fmt(plastic.pi)}% → ${plastic.fineSymbol}`);
      }
    }
    if (result.needs.length) {
      result.name = fineSoil ? '세립토 — 추가 자료 필요' : `${material} — 추가 자료 필요`;
      result.reason = `${result.needs.join(', ')}가 필요합니다. 없는 값을 추정해 분류하지 않습니다.`;
      return result;
    }
    if (fineSoil) result.symbol = plastic.fineSymbol;
    else if (cleanCoarse) result.symbol = letter + grading;
    else if (withinDualBand) {
      // The 5–12% dual band uses C for CL-ML fines; no invented three-part symbols.
      result.symbol = `${letter}${grading}-${letter}${plastic.fineSymbol.startsWith('M') ? 'M' : 'C'}`;
      result.steps.push('세립분 5~12% → 입도와 세립분 성상을 함께 나타내는 이중기호');
    } else {
      result.symbol = plastic.fineSymbol === 'CL-ML' ? `${letter}C-${letter}M` : `${letter}${plastic.fineSymbol.startsWith('M') ? 'M' : 'C'}`;
      result.steps.push('세립분 12% 초과 → 세립분 성상으로 M·C를 구분');
    }
    result.status = 'classified';
    result.name = names[result.symbol] || `${names[letter + grading]}, ${plastic.fineSymbol === 'CL-ML' ? '실트질 점토' : plastic.fineSymbol.startsWith('M') ? '실트' : '점토'} 함유`;
    result.reason = fineSoil
      ? '세립분이 절반 이상이므로 액성한계와 소성 특성으로 분류합니다.'
      : cleanCoarse
        ? `세립분이 5% 미만인 ${material}입니다. Cu와 Cc로 입도 조건을 확인합니다.`
        : withinDualBand
          ? '세립분이 5~12%이므로 입도와 소성 특성을 함께 표시합니다.'
          : '세립분이 12%를 넘지만 절반 미만이므로 조립토의 세립분 성상을 표시합니다.';
    return result;
  }

  return { generateCurve, analyzeCurve, classify };
})();
