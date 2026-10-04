/** Same prescribed toe circle; force quantities are per metre out of plane. */
export const CircularSlope = (() => {
  const defaults = Object.freeze({
    circularHeight: 8, circularBeta: 30, circularEntry: .6, circularCenter: 1.5,
    circularCohesion: 0, circularPhi: 28, circularGamma: 19, circularRu: 0,
    circularSlices: 40,
  });
  const rad = x => x * Math.PI / 180;
  const sum = (items, fn) => items.reduce((s, x) => s + fn(x), 0);
  const unsupported = (status, error, extra = {}) => ({
    valid: false, status, factor: null, errors: [error], ...extra,
  });
  function prescribed(input = {}) {
    const d = { ...defaults, ...input };
    const errors = [];
    for (const key of Object.keys(defaults)) if (typeof d[key] !== 'number' || !Number.isFinite(d[key])) errors.push(`${key}: 유한한 숫자가 필요합니다.`);
    if (errors.length) return { valid: false, errors, inputs: d };
    const H = d.circularHeight, beta = rad(d.circularBeta), entryRatio = d.circularEntry;
    const c = d.circularCohesion, phi = rad(d.circularPhi), gamma = d.circularGamma, ru = d.circularRu;
    const n = d.circularSlices;
    if (!(H > 0 && H <= 100)) errors.push('사면 높이는 0 초과 100 m 이하여야 합니다.');
    if (!(d.circularBeta > 0 && d.circularBeta < 80)) errors.push('사면 경사는 0° 초과 80° 미만이어야 합니다.');
    if (!(entryRatio > 0 && entryRatio <= 5)) errors.push('진입점의 정상 뒤 거리는 사면 높이의 0 초과 5배 이하여야 합니다.');
    if (!(d.circularCenter > 1 && d.circularCenter <= 10)) errors.push('원 중심 높이는 사면 높이보다 높고 10배 이하여야 합니다.');
    if (!(c >= 0 && gamma > 0 && d.circularPhi >= 0 && d.circularPhi < 60)) errors.push('점착력은 0 이상, 단위중량은 0 초과, 마찰각은 0° 이상 60° 미만이어야 합니다.');
    if (!(ru >= 0 && ru <= 1)) errors.push('간극수압비 rᵤ는 0 이상 1 이하여야 합니다.');
    if (!(Number.isInteger(n) && n >= 4 && n <= 400)) errors.push('절편 수는 4~400 사이의 정수여야 합니다.');
    if (errors.length) return { valid: false, errors, inputs: d };
    const crestX = H / Math.tan(beta), xe = crestX + entryRatio * H, cy = d.circularCenter * H;
    const cx = (xe * xe + H * H - 2 * cy * H) / (2 * xe), radius = Math.hypot(cx, cy);
    const ground = x => Math.min(x * Math.tan(beta), H);
    const base = x => cy - Math.sqrt(Math.max(0, radius * radius - (x - cx) ** 2));
    const arcPrimitive = x => {
      const t = x - cx, ratio = Math.max(-1, Math.min(1, t / radius));
      return cy * x - .5 * (t * Math.sqrt(Math.max(0, radius * radius - t * t)) + radius * radius * Math.asin(ratio));
    };
    const groundPrimitive = x => x <= crestX ? .5 * Math.tan(beta) * x * x : .5 * H * crestX + H * (x - crestX);
    // Split at the ground kink, retaining exactly the requested slice count.
    const slopeCount = Math.max(1, Math.min(n - 1, Math.round(n * crestX / xe)));
    const boundaries = Array.from({ length: slopeCount + 1 }, (_, i) => crestX * i / slopeCount)
      .concat(Array.from({ length: n - slopeCount }, (_, i) => crestX + (xe - crestX) * (i + 1) / (n - slopeCount)));
    const slices = [];
    for (let i = 0; i < n; i++) {
      const xLeft = boundaries[i], xRight = boundaries[i + 1], x = (xLeft + xRight) / 2, b = xRight - xLeft;
      const area = groundPrimitive(xRight) - groundPrimitive(xLeft) - arcPrimitive(xRight) + arcPrimitive(xLeft);
      const baseY = base(x), topY = ground(x), alphaRadians = Math.asin((x - cx) / radius);
      if (!(area > 0 && topY > baseY && Number.isFinite(area))) {
        return { valid: false, errors: ['이 원호는 지표면 아래의 연속된 활동 토체를 만들지 못합니다.'], inputs: d };
      }
      const weight = gamma * area, cos = Math.cos(alphaRadians), baseLength = b / cos;
      const poreVerticalForce = ru * weight, u = poreVerticalForce / b, poreForce = u * baseLength;
      const ordinaryEffectiveNormal = (weight - poreVerticalForce) * cos;
      slices.push({ index: i + 1, xLeft, xRight, x, b, width: b, area, weight,
        alphaRadians, alphaDegrees: alphaRadians * 180 / Math.PI, baseLength, baseY, topY,
        u, poreForce, poreVerticalForce, ordinaryEffectiveNormal,
        ordinaryResistance: c * baseLength + ordinaryEffectiveNormal * Math.tan(phi),
        bishopEffectiveNormal: null, bishopResistance: null, bishopM: null });
    }
    const geometry = {
      height: H, betaDegrees: d.circularBeta, toe: { x: 0, y: 0 }, crest: { x: crestX, y: H },
      entry: { x: xe, y: H }, center: { x: cx, y: cy }, radius,
      points: Array.from({ length: 161 }, (_, i) => { const x = xe * i / 160; return { x, y: base(x), top: ground(x) }; }),
      boundaries,
    };
    const driving = sum(slices, s => s.weight * Math.sin(s.alphaRadians));
    const totalWeight = sum(slices, s => s.weight), totalArea = sum(slices, s => s.area);
    const totals = { area: totalArea, weight: totalWeight, driving, baseLength: sum(slices, s => s.baseLength), poreVerticalForce: sum(slices, s => s.poreVerticalForce) };
    const result = { valid: true, errors: [], model: 'prescribed-toe-circle-ordinary-usace-and-simplified-bishop', inputs: d, geometry, slices, totals, comparisonValid: false };
    if (!(driving > totalWeight * 1e-12)) {
      result.ordinary = unsupported('nonpositive-driving', '이 원호에서는 가정한 회전 방향의 활동력이 양수가 아닙니다.', { driving });
      result.bishop = unsupported('nonpositive-driving', '이 원호에서는 가정한 회전 방향의 활동력이 양수가 아닙니다.', { driving });
      return result;
    }
    const normalTolerance = Math.max(1, totalWeight) * 1e-11;
    const ordinaryMin = Math.min(...slices.map(s => s.ordinaryEffectiveNormal));
    const ordinaryResistance = sum(slices, s => s.ordinaryResistance);
    result.ordinary = ordinaryMin < -normalTolerance
      ? unsupported('tensile-normal', '일반 절편법의 유효 법선력이 음수인 절편이 있습니다. 인장균열 모델이 필요합니다.', { driving, minEffectiveNormal: ordinaryMin })
      : { valid: true, status: ordinaryResistance === 0 ? 'zero-strength' : 'ok', errors: [], factor: ordinaryResistance / driving,
        resistance: ordinaryResistance, driving, minEffectiveNormal: ordinaryMin,
        porePressureTreatment: 'USACE EM 1110-2-1902 C-12/C-14: (W−ub)cosα' };
    const tanPhi = Math.tan(phi);
    const terms = slices.map(s => ({ s, A: c * s.b + (s.weight - s.poreVerticalForce) * tanPhi,
      cos: Math.cos(s.alphaRadians), sinTan: Math.sin(s.alphaRadians) * tanPhi }));
    let factor, iterations = 0;
    const totalA = sum(terms, t => t.A);
    if (totalA === 0) {
      // F=0 is a zero-resistance limit, not a solution of the singular Bishop F-in-denominator equation.
      result.bishop = { valid: true, status: 'zero-strength', errors: [], factor: 0,
        resistance: 0, driving, iterations: 0, residual: null, minEffectiveNormal: null, minM: null };
      result.comparisonValid = result.ordinary.valid;
      return result;
    }
    else if (tanPhi === 0) factor = sum(terms, t => t.A / t.cos) / driving;
    else {
      // For positive denominators this transformed equation is strictly decreasing:
      // Σ Aᵢ/(F cosαᵢ + sinαᵢ tanφ′) = Σ Wᵢ sinαᵢ.
      // Bracketing avoids a false or singular fixed-point iteration branch.
      const lowerLimit = Math.max(0, ...terms.map(t => -t.sinTan / t.cos));
      const equation = F => sum(terms, t => t.A / (F * t.cos + t.sinTan)) - driving;
      let low = lowerLimit + Math.max(1, lowerLimit) * 1e-12;
      let high = Math.max(1, low * 2, result.ordinary.factor || 0);
      if (!(equation(low) > 0)) {
        result.bishop = unsupported('no-admissible-root', '양의 mα 조건을 만족하는 Bishop 해를 찾을 수 없습니다.', { driving, iterations, residual: null });
        return result;
      }
      while (equation(high) > 0 && high < 1e12) high *= 2;
      if (!(equation(high) <= 0)) {
        result.bishop = unsupported('unbracketed-root', 'Bishop 반복 계산의 해 범위를 찾을 수 없습니다.', { driving, iterations, residual: null });
        return result;
      }
      for (; iterations < 120; iterations++) {
        const mid = (low + high) / 2, value = equation(mid);
        if (value > 0) low = mid; else high = mid;
        if (high - low <= 1e-12 * Math.max(1, mid)) { iterations++; break; }
      }
      factor = (low + high) / 2;
    }
    for (const { s, A, cos, sinTan } of terms) {
      const m = factor === 0 ? cos : cos + sinTan / factor;
      s.bishopM = m;
      s.bishopEffectiveNormal = factor === 0 ? (s.weight - s.poreVerticalForce) / cos
        : (s.weight - s.poreVerticalForce - c * s.b * Math.tan(s.alphaRadians) / factor) / m;
      s.bishopResistance = c * s.baseLength + s.bishopEffectiveNormal * tanPhi;
      s.bishopNumeratorTerm = factor === 0 ? 0 : A / m;
    }
    const bishopMin = Math.min(...slices.map(s => s.bishopEffectiveNormal));
    const minM = Math.min(...slices.map(s => s.bishopM));
    const resistance = sum(slices, s => s.bishopResistance);
    const residual = Math.abs(factor - resistance / driving) / Math.max(1, factor);
    const extra = { driving, resistance, iterations, residual, minEffectiveNormal: bishopMin, minM };
    if (!(minM > 0) || !Number.isFinite(factor) || residual > 1e-9) {
      result.bishop = unsupported('not-converged', 'Bishop 평형식이 허용 오차 안에서 수렴하지 않았습니다.', extra);
    } else if (bishopMin < -normalTolerance) {
      result.bishop = unsupported('tensile-normal', 'Bishop 해에서 유효 법선력이 음수인 절편이 있습니다. 음수 법선력을 잘라내지 않았으며 인장균열 모델이 필요합니다.', extra);
    } else {
      result.bishop = { valid: true, status: factor === 0 ? 'zero-strength' : 'ok', errors: [], factor, ...extra };
    }
    result.comparisonValid = result.ordinary.valid && result.bishop.valid;
    return result;
  }
  function search(input = {}) {
    const entry = { min: .15, max: 1.5, count: 13 }, center = { min: 1.05, max: 2.5, count: 13 };
    const candidates = [], rejected = {}, total = entry.count * center.count;
    let best = null;
    for (let i = 0; i < entry.count; i++) for (let j = 0; j < center.count; j++) {
      const circularEntry = entry.min + (entry.max - entry.min) * i / (entry.count - 1);
      const circularCenter = center.min + (center.max - center.min) * j / (center.count - 1);
      const result = prescribed({ ...input, circularEntry, circularCenter });
      const status = result.valid ? result.bishop.status : 'invalid-geometry';
      const candidate = { circularEntry, circularCenter, valid: !!(result.valid && result.bishop.valid), status,
        bishopFactor: result.valid ? result.bishop.factor : null, ordinaryFactor: result.valid ? result.ordinary.factor : null };
      candidates.push(candidate);
      if (candidate.valid && (!best || candidate.bishopFactor < best.result.bishop.factor)) {
        best = { inputs: result.inputs, result, entryIndex: i, centerIndex: j };
      } else if (!candidate.valid) rejected[status] = (rejected[status] || 0) + 1;
    }
    return { valid: !!best, errors: best ? [] : ['이 탐색 범위에서는 유효한 Bishop 해를 찾지 못했습니다.'],
      model: 'finite-prescribed-toe-circle-grid', ranges: { entry, center }, total,
      validCount: candidates.filter(c => c.valid).length, rejected, candidates, best,
      boundaryMinimum: !!best && (best.entryIndex === 0 || best.entryIndex === entry.count - 1 || best.centerIndex === 0 || best.centerIndex === center.count - 1),
      isGlobalMinimum: false };
  }
  return { defaults, prescribed, search };
})();
