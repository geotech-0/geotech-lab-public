/**
 * Small, dependency-free educational models. Units: m, kN, kPa; settlement: mm.
 * Model boundaries and sources are recorded in docs/mechanics-spec.md.
 * Each result belongs to its submitted input; invalid inputs never use fallback results.
 */
export const Mechanics = (() => {
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  const invalid = (errors) => ({ valid: false, errors, warnings: [] });
  const objectInput = (input) => input !== null && typeof input === 'object' && !Array.isArray(input);

  function effectiveStress(input = {}) {
    if (!objectInput(input)) return invalid(['입력은 값과 단위를 갖는 객체여야 합니다.']);
    const {
      waterDepth = 2, surcharge = 0, depth = 5,
      gammaMoist = 18, gammaSat = 20, gammaW = 9.81,
      soilProfile = 'homogeneous', layerDepth = 3, gammaMoist2 = 19, gammaSat2 = 21,
    } = input;
    const errors = [];
    for (const [name, value] of Object.entries({ waterDepth, surcharge, depth, gammaMoist, gammaSat, gammaW })) {
      if (!finite(value)) errors.push(`${name}: 유한한 숫자를 입력하세요.`);
    }
    if (errors.length) return invalid(errors);
    if (waterDepth < 0) errors.push('수위 깊이는 지표 아래 0 m 이상입니다. 지표 침수는 이 모형의 범위 밖입니다.');
    if (depth < 0) errors.push('관찰 깊이는 지표 아래 0 m 이상이어야 합니다.');
    if (surcharge < 0) errors.push('상재하중은 0 kPa 이상이어야 합니다. 굴착·제하는 별도 모형이 필요합니다.');
    if (gammaMoist <= 0 || gammaW <= 0 || gammaSat <= gammaW) {
      errors.push('습윤·물의 단위중량은 양수이고 포화단위중량은 물의 단위중량보다 커야 합니다.');
    }
    if (gammaSat < gammaMoist) errors.push('같은 흙의 포화단위중량은 습윤단위중량 이상이어야 합니다.');
    if (errors.length) return invalid(errors);
    if (!['homogeneous','layered'].includes(soilProfile)) return invalid(['지층 구성은 균질 또는 두 층을 선택하세요.']);
    if(soilProfile==='layered'){
      if(![layerDepth,gammaMoist2,gammaSat2].every(finite))return invalid(['두 번째 층의 깊이·단위중량은 유한한 숫자로 입력하세요.']);
      if(layerDepth<0||gammaMoist2<=0||gammaSat2<gammaMoist2||gammaSat2<=gammaW)return invalid(['층 경계는 0 m 이상, 하부층은 0 < 습윤 ≤ 포화 및 포화 > 물 단위중량이어야 합니다.']);
    }
    const maxDepth = Math.max(8, depth);
    const layers=soilProfile==='layered'?[{top:0,bottom:layerDepth,gammaMoist,gammaSat},{top:layerDepth,bottom:Math.max(maxDepth,layerDepth),gammaMoist:gammaMoist2,gammaSat:gammaSat2}]:[{top:0,bottom:maxDepth,gammaMoist,gammaSat}];
    const atDepth = (z) => {
      const contributions=layers.map((layer,index)=>{
        const bottom=Math.min(z,layer.bottom),thickness=Math.max(0,bottom-layer.top);
        const moistThickness=Math.max(0,Math.min(bottom,waterDepth)-layer.top);
        const saturatedThickness=thickness-moistThickness;
        return {layer:index+1,thickness,moistThickness,saturatedThickness,moistStress:layer.gammaMoist*moistThickness,saturatedStress:layer.gammaSat*saturatedThickness};
      });
      const total=surcharge+contributions.reduce((v,c)=>v+c.moistStress+c.saturatedStress,0);
      const pore=gammaW*Math.max(0,z-waterDepth);
      return {depth:z,total,pore,effective:total-pore,contributions};
    };
    const depths = Array.from({ length: 81 }, (_, index) => (index / 80) * maxDepth);
    depths.push(depth);
    if(soilProfile==='layered'&&layerDepth<=maxDepth)depths.push(layerDepth);
    if (waterDepth <= maxDepth) depths.push(waterDepth);
    const profile = [...new Set(depths)].sort((a, b) => a - b).map(atDepth);
    const observation = atDepth(depth);
    if (profile.some((row) => ![row.total, row.pore, row.effective].every(Number.isFinite))) {
      return invalid(['입력 크기가 계산 가능한 숫자 범위를 초과했습니다.']);
    }
    return {
      valid: true, errors: [], warnings: [], ...observation,
      waterDepth, surcharge, gammaMoist, gammaSat, gammaW, maxDepth, profile, soilProfile,layerDepth,layers,
      model: 'hydrostatic-drained-no-suction-v1',
      conditions: [soilProfile==='layered'?'수평 두 층':'균질 지반', '정수압', '배수 완료', '지표 위 침수 없음', '모관흡수 제외', '무한히 넓은 균등 상재'],
    };
  }

  // Shared loading geometry is evaluated before any soil property is read.
  // A question must not inherit validation failures from another question's inputs.
  function foundationForQuestion(input = {}, question = 'pressure') {
    if (!objectInput(input)) return invalid(['입력은 값과 단위를 갖는 객체여야 합니다.']);
    if (!['pressure', 'bearing', 'settlement'].includes(question)) {
      return invalid(['기초 질문은 pressure, bearing 또는 settlement여야 합니다.']);
    }
    const {
      width = 3, length = width, load = 1200, pressure = 1200 / 9,
      loadMode = 'force', embedment = 0, waterDepth,
    } = input;
    const errors = [];
    for (const [name, value] of Object.entries({ width, length, embedment })) {
      if (!finite(value)) errors.push(`${name}: 유한한 숫자를 입력하세요.`);
    }
    if (!['force', 'pressure'].includes(loadMode)) errors.push('loadMode는 force 또는 pressure여야 합니다.');
    const selectedLoad = loadMode === 'pressure' ? pressure : load;
    if (!finite(selectedLoad) || selectedLoad < 0) errors.push('선택한 하중 또는 접지압은 0 이상의 유한한 숫자여야 합니다.');
    if (waterDepth !== undefined) errors.push('이 기초 예제는 건조 지반만 지원합니다. 수위 입력은 지원하지 않습니다.');
    if (errors.length) return invalid(errors);
    if (width <= 0 || length <= 0) errors.push('기초 폭과 길이는 0 m보다 커야 합니다.');
    if (length !== width) errors.push('현재 예제는 정사각형(B=L)만 지원합니다.');
    if (embedment !== 0) errors.push('현재 예제는 지표기초(Df=0)만 지원합니다.');
    if (errors.length) return invalid(errors);

    const area = width * length;
    const appliedPressure = loadMode === 'force' ? load / area : pressure;
    const appliedLoad = loadMode === 'force' ? load : pressure * area;
    if (area === 0 || ![area, appliedPressure, appliedLoad].every(Number.isFinite)) {
      return invalid(['입력 크기가 계산 가능한 숫자 범위를 초과했습니다.']);
    }
    const result = {
      valid: true, errors: [], warnings: [], width, length, embedment, area,
      loadMode, load: appliedLoad, pressure: appliedPressure, netPressure: appliedPressure,
      pressureBasis: 'gross=net (Df=0)',
      model: 'surface-square-contact-pressure-v1',
      conditions: ['정사각형 지표기초', '건조·균질 지반', '수평 지표·수평 기초저면', '연직 중심하중'],
    };
    if (question === 'pressure') return result;

    const { phi = 30, cohesion = 0, gamma = 18 } = input;
    for (const [name, value] of Object.entries({ phi, cohesion, gamma })) {
      if (!finite(value)) errors.push(`${name}: 유한한 숫자를 입력하세요.`);
    }
    if (errors.length) return invalid(errors);
    if (phi < 0 || phi > 45) errors.push('현재 학습 예제의 마찰각 지원 범위는 0~45°입니다.');
    if (cohesion < 0) errors.push('점착력은 0 kPa 이상이어야 합니다.');
    if (gamma <= 0) errors.push('단위중량은 0보다 커야 합니다.');
    if (errors.length) return invalid(errors);

    const phiRad = phi * Math.PI / 180;
    const tangent = Math.tan(phiRad);
    const sine = Math.sin(phiRad);
    // log form and expm1 avoid cancellation in Nc for very small positive phi.
    const logNq = Math.PI * tangent + Math.log1p(sine) - Math.log1p(-sine);
    const nq = Math.exp(logNq);
    const nc = phi === 0 ? Math.PI + 2 : Math.expm1(logNq) / tangent;
    const ngamma = 2 * (nq + 1) * tangent;
    // FHWA NHI-06-089, Table 8-4. The phi=0 row is explicit in that source.
    const shapeFactors = phi === 0
      ? { cohesion: 1 + width / (5 * length), surcharge: 1, weight: 1 }
      : { cohesion: 1 + (width / length) * (nq / nc), surcharge: 1 + (width / length) * tangent, weight: 1 - 0.4 * width / length };
    const overburden = 0; // Df=0 is validated above; no unmodelled embedment correction.
    const bearingTerms = {
      cohesion: cohesion * nc * shapeFactors.cohesion,
      surcharge: overburden * nq * shapeFactors.surcharge,
      weight: 0.5 * gamma * width * ngamma * shapeFactors.weight,
    };
    const ultimateGross = bearingTerms.cohesion + bearingTerms.surcharge + bearingTerms.weight;
    const ultimateNet = ultimateGross - overburden;
    if (![nq, nc, ngamma, ...Object.values(shapeFactors), ...Object.values(bearingTerms), ultimateGross, ultimateNet].every(Number.isFinite)) {
      return invalid(['입력 크기가 계산 가능한 숫자 범위를 초과했습니다.']);
    }
    const bearingExceeded = appliedPressure > 0 && appliedPressure >= ultimateGross;
    Object.assign(result, {
      phi, cohesion, gamma, nq, nc, ngamma, shapeFactors, bearingTerms,
      overburden, ultimateGross, ultimateNet, bearingExceeded,
      model: 'fhwa-nhi-06-089-surface-square-v1',
      bearingSource: 'https://www.fhwa.dot.gov/engineering/geotech/pubs/nhi06089.pdf',
    });
    result.conditions.push('일반전단 지지력 모형');
    if (question === 'bearing') {
      result.warnings = bearingExceeded ? ['접지압이 이 모형의 극한저항에 도달했거나 초과했습니다.'] : [];
      return result;
    }

    const { modulus = 20000, poisson = 0.3 } = input;
    for (const [name, value] of Object.entries({ modulus, poisson })) {
      if (!finite(value)) errors.push(`${name}: 유한한 숫자를 입력하세요.`);
    }
    if (errors.length) return invalid(errors);
    if (modulus <= 0) errors.push('탄성계수는 0보다 커야 합니다.');
    if (poisson < 0 || poisson >= 0.5) errors.push('이 건조 탄성 모형의 포아송비는 0 이상, 0.5 미만이어야 합니다.');
    if (errors.length) return invalid(errors);
    // Exact Boussinesq surface integral for the CENTER of a flexible uniformly
    // loaded square on a homogeneous, isotropic, semi-infinite elastic solid.
    const influenceFactor = 4 * Math.log1p(Math.SQRT2) / Math.PI;
    const settlementMm = appliedPressure * width * (1 - poisson ** 2) * influenceFactor / modulus * 1000;
    if (!Number.isFinite(settlementMm)) return invalid(['입력 크기가 계산 가능한 숫자 범위를 초과했습니다.']);
    const settlementApplicable = !bearingExceeded;
    Object.assign(result, { modulus, poisson, influenceFactor, settlementMm, settlementApplicable, settlementLocation: 'center' });
    result.warnings = settlementApplicable ? [] : ['접지압이 이 모형의 극한지지력 이상입니다. 탄성식 계산값을 실제 침하 예측으로 해석할 수 없습니다.'];
    result.conditions.push('침하는 유연 등분포 재하면 중심점 탄성값');
    return result;
  }

  // Compatibility entry point: retain the original full bearing + settlement model.
  function foundation(input = {}) {
    return foundationForQuestion(input, 'settlement');
  }

  return { effectiveStress, foundation, foundationForQuestion };
})();
