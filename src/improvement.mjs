/* Independent, small-strain teaching models. Units: m, kPa, s; public time in days. */
export const Improvement = (() => {
  const DAY = 86400;
  const invalid = errors => ({ valid: false, errors });
  const number = (errors, value, label, positive = false) => {
    if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0)) errors.push(`${label}: ${positive ? '0보다 큰' : '0 이상의'} 유한한 수가 필요합니다.`);
  };
  const averageDegree = tv => {
    if (!Number.isFinite(tv) || tv < 0) return NaN;
    if (tv === 0) return 0;
    if (tv < .02) return 2 * Math.sqrt(tv / Math.PI);
    let remaining = 0;
    for (let m = 0; m < 10000; m++) {
      const n = 2 * m + 1;
      const term = 8 / (Math.PI * Math.PI * n * n) * Math.exp(-n * n * Math.PI * Math.PI * tv / 4);
      remaining += term;
      if (term < 1e-16) break;
    }
    return 1 - remaining;
  };
  const base = data => {
    const p = { kv: 1e-9, mv: .0003, thickness: 8, drainage: 'double', gammaW: 9.81, ...data };
    const errors = [];
    for (const [key, label] of [['kv', '수직 투수계수 kv'], ['mv', '체적압축계수 mv'], ['thickness', '층두께 H'], ['gammaW', '물의 단위중량']]) number(errors, p[key], label, true);
    if (!['single', 'double'].includes(p.drainage)) errors.push('배수조건은 single 또는 double이어야 합니다.');
    if (errors.length) return invalid(errors);
    const cv = p.kv / (p.mv * p.gammaW), hdr = p.thickness / (p.drainage === 'double' ? 2 : 1);
    if (![cv, hdr, cv * DAY / (hdr * hdr)].every(v => Number.isFinite(v) && v > 0)) return invalid(['입력으로 계산한 압밀 시간척도를 표현할 수 없습니다.']);
    return { valid: true, errors, ...p, cv, cvDays: cv * DAY, hdr };
  };
  const inverse = (response, target = .9) => {
    let hi = 1, lo = 0;
    while (response(hi) < target && hi < 1e100) hi *= 2;
    for (let j = 0; j < 85; j++) { const mid = (lo + hi) / 2; if (response(mid) < target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const drains = (data = {}) => {
    const p = base({ spacing: 1.5, pattern: 'triangle', drainDiameter: .066, khKv: 2, smear: 'off', smearDiameterRatio: 3, smearPermeabilityRatio: 3, deltaStress: 100, timeDays: 100, ...data });
    if (!p.valid) return p;
    const errors = [];
    for (const [key, label] of [['spacing', '드레인 간격'], ['drainDiameter', '환산 드레인 지름'], ['khKv', 'kh/kv']]) number(errors, p[key], label, true);
    for (const [key, label] of [['deltaStress', '재하 증가량'], ['timeDays', '경과시간']]) number(errors, p[key], label);
    if (!['square', 'triangle'].includes(p.pattern)) errors.push('배열은 square 또는 triangle이어야 합니다.');
    if (!['off', 'on'].includes(p.smear)) errors.push('교란 모형은 off 또는 on이어야 합니다.');
    if (p.smear === 'on') {
      number(errors, p.smearDiameterRatio, '교란 지름비 ds/dw', true);
      number(errors, p.smearPermeabilityRatio, '투수 저하비 kh/ks', true);
      if (p.smearDiameterRatio < 1 || p.smearPermeabilityRatio < 1) errors.push('ds/dw와 kh/ks는 각각 1 이상이어야 합니다.');
    }
    if (p.mv * p.deltaStress > .10) errors.push('이 고정 두께 소변형 모형은 mvΔσ ≤ 0.10 범위로 제한합니다.');
    if (errors.length) return invalid(errors);
    const cellArea = p.spacing ** 2 * (p.pattern === 'triangle' ? Math.sqrt(3) / 2 : 1);
    const influenceDiameter = 2 * Math.sqrt(cellArea / Math.PI), n = influenceDiameter / p.drainDiameter;
    if (!(n > 5)) return invalid(['ln(n)−0.75 근사에는 de/dw > 5가 필요합니다.']);
    if (p.smear === 'on' && p.smearDiameterRatio >= n) return invalid(['교란 지름 ds는 영향 지름 de보다 작아야 합니다.']);
    const fn = Math.log(n) - .75;
    const fs = p.smear === 'on' ? (p.smearPermeabilityRatio - 1) * Math.log(p.smearDiameterRatio) : 0;
    const f = fn + fs, ch = p.cv * p.khKv, chDays = ch * DAY;
    if (![f, chDays, influenceDiameter ** 2].every(v => Number.isFinite(v) && v > 0)) return invalid(['방사형 시간척도를 표현할 수 없습니다.']);
    const finalSettlementMm = p.mv * p.deltaStress * p.thickness * 1000;
    const at = days => {
      const tv = p.cvDays * days / p.hdr ** 2, th = chDays * days / influenceDiameter ** 2;
      const vertical = averageDegree(tv), radial = -Math.expm1(-8 * th / f);
      const combined = 1 - (1 - vertical) * (1 - radial);
      return { days, tv, th, vertical, radial, combined, verticalSettlementMm: vertical * finalSettlementMm, radialSettlementMm: radial * finalSettlementMm, settlementMm: combined * finalSettlementMm, averageExcess: p.deltaStress * (1 - combined) };
    };
    const t90VerticalDays = inverse(t => averageDegree(p.cvDays * t / p.hdr ** 2));
    const t90RadialDays = influenceDiameter ** 2 * f * Math.log(10) / (8 * chDays);
    const t90CombinedDays = inverse(t => at(t).combined);
    const curveEndDays = Math.max(1, p.timeDays * 1.1, t90CombinedDays * 1.5);
    const curve = Array.from({ length: 121 }, (_, i) => at(curveEndDays * (i / 120) ** 2));
    const current = at(p.timeDays);
    return { ...p, ...current, valid: true, errors: [], cellArea, influenceDiameter, n, fn, fs, f, ch, chDays, finalSettlementMm, t90VerticalDays, t90RadialDays, t90CombinedDays, curveEndDays, curve, degree: p.deltaStress === 0 ? null : current.combined };
  };
  const staged = (data = {}) => {
    const p = base({ permanentLoad: 80, surcharge: 40, addDays: 30, removeDays: 180, timeDays: 200, ...data });
    if (!p.valid) return p;
    const errors = [];
    for (const [key, label] of [['permanentLoad', '영구하중'], ['surcharge', '추가 성토하중'], ['addDays', '추가 시점'], ['removeDays', '제거 시점'], ['timeDays', '관찰 시점']]) number(errors, p[key], label);
    if (p.removeDays <= p.addDays) errors.push('추가 성토를 제거하는 시점은 추가 시점보다 늦어야 합니다.');
    if (p.mv * (p.permanentLoad + p.surcharge) > .10) errors.push('이 고정 두께 소변형 모형은 mv(q영구+q추가) ≤ 0.10 범위로 제한합니다.');
    if (errors.length) return invalid(errors);
    const increments = [{ days: 0, load: p.permanentLoad }, { days: p.addDays, load: p.surcharge }, { days: p.removeDays, load: -p.surcharge }];
    const at = (days, before = false) => {
      let load = 0, averageExcess = 0, effectiveIncrement = 0;
      const contributions = increments.map(step => {
        const active = before ? days > step.days : days >= step.days;
        const degree = active ? averageDegree(p.cvDays * (days - step.days) / p.hdr ** 2) : 0;
        const excess = active ? step.load * (1 - degree) : 0;
        const effective = active ? step.load * degree : 0;
        if (active) { load += step.load; averageExcess += excess; effectiveIncrement += effective; }
        return { ...step, active, degree, excess, effective };
      });
      const settlementMm = p.mv * p.thickness * effectiveIncrement * 1000;
      const withoutSurchargeMm = p.mv * p.thickness * p.permanentLoad * averageDegree(p.cvDays * days / p.hdr ** 2) * 1000;
      return { days, load, averageExcess, effectiveIncrement, settlementMm, withoutSurchargeMm, contributions };
    };
    const t90Days = inverse(t => averageDegree(p.cvDays * t / p.hdr ** 2));
    const curveEndDays = Math.max(1, p.timeDays * 1.1, p.removeDays * 1.3);
    const times = [...new Set([...Array.from({ length: 151 }, (_, i) => curveEndDays * i / 150), p.addDays, p.removeDays, p.timeDays])].sort((a, b) => a - b);
    const curve = times.flatMap(t => increments.some(step => step.days === t) ? [{ ...at(t, true), side: 'before' }, { ...at(t), side: 'after' }] : [at(t)]);
    return { ...p, ...at(p.timeDays), valid: true, errors: [], increments, curve, curveEndDays, t90Days, finalSettlementMm: p.mv * p.permanentLoad * p.thickness * 1000, phase: p.timeDays < p.addDays ? 'permanent' : p.timeDays < p.removeDays ? 'surcharge' : 'removed' };
  };
  const preload = (data = {}) => {
    const p = { sigma0: 80, preloadLoad: 120, serviceLoad: 100, e0: 1, cc: .3, cr: .05, thickness: 8, ...data };
    const errors = [];
    for (const [key, label] of [['sigma0', '초기 유효응력'], ['thickness', '초기 층두께']]) number(errors, p[key], label, true);
    for (const [key, label] of [['preloadLoad', '선행재하 하중'], ['serviceLoad', '사용하중'], ['e0', '초기 간극비'], ['cc', '압축지수 Cc'], ['cr', '재압축지수 Cr']]) number(errors, p[key], label);
    if (p.cr > p.cc) errors.push('이 이선형 모형은 0 ≤ Cr ≤ Cc 범위입니다.');
    if (errors.length) return invalid(errors);
    const peak = p.sigma0 + p.preloadLoad, serviceStress = p.sigma0 + p.serviceLoad;
    const preloadDeltaE = p.cc * Math.log10(peak / p.sigma0);
    const reboundDeltaE = p.cr * Math.log10(peak / p.sigma0);
    const preloadE = p.e0 - preloadDeltaE, unloadedE = preloadE + reboundDeltaE;
    const reloadingDeltaE = p.cr * Math.log10(Math.min(serviceStress, peak) / p.sigma0);
    const virginDeltaE = serviceStress > peak ? p.cc * Math.log10(serviceStress / peak) : 0;
    const serviceE = unloadedE - reloadingDeltaE - virginDeltaE;
    const withoutE = p.e0 - p.cc * Math.log10(serviceStress / p.sigma0);
    if (![peak, serviceStress, preloadE, unloadedE, serviceE, withoutE].every(Number.isFinite) || Math.min(preloadE, serviceE, withoutE) < 0) return invalid(['입력 응력·압축지수가 음의 간극비 또는 표현 불가능한 상태를 만듭니다.']);
    const solidHeight = p.thickness / (1 + p.e0), mm = deltaE => 1000 * solidHeight * deltaE;
    const postServiceSettlementMm = mm(reloadingDeltaE + virginDeltaE), withoutPreloadSettlementMm = mm(p.e0 - withoutE);
    const path = [{ stress: p.sigma0, e: p.e0, stage: 0 }, { stress: peak, e: preloadE, stage: 1 }, { stress: p.sigma0, e: unloadedE, stage: 2 }];
    if (serviceStress > peak && peak > p.sigma0) path.push({ stress: peak, e: unloadedE - reloadingDeltaE, stage: null });
    path.push({ stress: serviceStress, e: serviceE, stage: 3 });
    return { ...p, valid: true, errors: [], peak, serviceStress, preloadE, unloadedE, serviceE, withoutE, solidHeight, preSettlementMm: mm(preloadDeltaE), reboundMm: mm(reboundDeltaE), retainedSettlementMm: mm(preloadDeltaE - reboundDeltaE), postServiceSettlementMm, withoutPreloadSettlementMm, reductionMm: withoutPreloadSettlementMm - postServiceSettlementMm, finalSettlementMm: mm(p.e0 - serviceE), preconsolidationAfterRemoval: peak, finalPreconsolidation: Math.max(peak, serviceStress), finalOCR: Math.max(peak, serviceStress) / serviceStress, path };
  };
  return { averageDegree, drains, staged, preload };
})();
