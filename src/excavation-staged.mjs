/** Staged educational beam / independent elastoplastic soil springs.
 * Units: m, kN, kPa; kh is kN/m³, EI is kN m² per metre of wall.
 * Positive wall displacement is toward the excavation. No design-code approval.
 */
export const ExcavationStaged = (() => {
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const eps = 1e-8, gw = 9.81, types = ['anchor', 'nail', 'strut', 'corner', 'raker', 'rock', 'slab'];
  const soilDefault = { gamma: 18, gammaSat: 20, c: 0, phi: 30, kh: 18000, k0: .5 };
  const defaults = {
    modelVersion: 2, height: 8, embedment: 4, EI: 300000, mesh: .5, increment: .25,
    soil: { ...soilDefault }, fill: { ...soilDefault, kh: 12000, initialPressure: 0, pressureModel: 'soil' },
    water: { retained: 8, excavation: 8, restore: 8 }, surcharge: 0,
    clearance: .5, releaseLinked: true, releaseClearance: .5,
    supports: [1.5, 3.5, 5.5].map((z, i) => ({ id: `support-${i + 1}`, type: 'anchor', z,
      stiffness: 50000, preload: 40, preloadLoss: 0, angle: 15, spacing: 2, length: 12,
      capacity: 1000, retained: false })),
    plan: { lx: 20, ly: 14, walerEI: 100000, stations: 3, corners: [0, 1, 2, 3], membersPerCorner: 1, offset: 2, spacing: 1.2 },
    observation: { phase: 'excavation', depth: 0, eventSide: 'after', mode: 'history', resultMode: 'total', wallId: 'A', position: .5 }
  };
  const invalid = errors => ({ valid: false, status: 'invalid', errors, profile: [], supportForces: [], events: [] });

  function normalize(input = {}) {
    if (!obj(input)) return { valid: false, errors: ['굴착 입력 객체가 필요합니다.'], value: null };
    for(const key of ['soil','fill','water','plan','observation'])if(input[key]!==undefined&&!obj(input[key]))return {valid:false,errors:[`${key}: 입력 객체 형식을 확인하세요.`],value:null};
    const d = { ...defaults, ...input, soil: { ...soilDefault, ...input.soil },
      fill: { ...defaults.fill, ...input.fill }, water: { ...defaults.water, ...input.water },
      plan: { ...defaults.plan, ...input.plan }, observation: { ...defaults.observation, ...input.observation } };
    const errors = [];
    for (const key of ['soil', 'fill', 'water', 'plan', 'observation']) if (input[key] !== undefined && !obj(input[key])) errors.push(`${key}: 입력 객체가 필요합니다.`);
    const range = (v, lo, hi, label) => { if (!finite(v) || v < lo || v > hi) errors.push(`${label}: ${lo}~${hi} 범위의 수가 필요합니다.`); };
    for (const [k, lo, hi] of [['height', .5, 30], ['embedment', .5, 20], ['EI', 100, 1e9], ['mesh', .1, 2], ['increment', .01, .25], ['surcharge', 0, 1000], ['clearance', 0, 5], ['releaseClearance', 0, 5]]) range(d[k], lo, hi, k);
    if (typeof d.releaseLinked !== 'boolean') errors.push('설치·해체 여유 연동은 참/거짓 값이어야 합니다.');
    for (const [name, s] of [['soil', d.soil], ['fill', d.fill]]) {
      if (s.k0 === null) s.k0 = 1 - Math.sin(s.phi * Math.PI / 180);
      for (const [k, lo, hi] of [['gamma', 1, 35], ['gammaSat', 10, 40], ['c', 0, 1000], ['phi', 0, 49.9], ['kh', 1, 1e7], ['k0', 0, 3]]) range(s[k], lo, hi, `${name}.${k}`);
      if (s.gammaSat < s.gamma || s.gammaSat <= gw) errors.push(`${name}: γsat≥γ, γsat>γw가 필요합니다.`);
      const ka = (1 - Math.sin(s.phi * Math.PI / 180)) / (1 + Math.sin(s.phi * Math.PI / 180));
      if (finite(s.k0) && (s.k0 < ka - eps || s.k0 > 1 / ka + eps)) errors.push(`${name}: K0는 이 모델의 주동·수동 토압계수 사이여야 합니다.`);
    }
    range(d.fill.initialPressure, 0, 1000, '되메움 초기 추가측압');
    if (!['soil', 'spring'].includes(d.fill.pressureModel)) errors.push('되메움 모델은 soil 또는 spring이어야 합니다.');
    for (const k of ['retained', 'excavation', 'restore']) range(d.water[k], 0, 100, `water.${k}`);
    if (!Array.isArray(d.supports) || d.supports.length > 12) errors.push('지보재는 0~12개 단으로 정의하세요.');
    const ids = new Set();
    d.supports = Array.isArray(d.supports) ? d.supports.map((raw, i) => {
      if (!obj(raw)) { errors.push(`지보재 ${i + 1} 객체가 필요합니다.`); return {}; }
      const s = { stiffness: 50000, preload: 0, preloadLoss: 0, angle: 0, spacing: 2, length: 12,
        capacity: 1e6, retained: ['nail', 'rock', 'slab'].includes(raw.type), ...raw };
      if (s.capacity === null) s.capacity = 1e7;
      if (typeof s.id !== 'string' || !s.id || s.id.length > 80 || ids.has(s.id)) errors.push('지보재 ID는 서로 다른 짧은 문자열이어야 합니다.');
      ids.add(s.id);
      if (!types.includes(s.type)) errors.push(`알 수 없는 지보 유형: ${s.type}`);
      for (const [k, lo, hi] of [['z', 0, d.height], ['stiffness', 1, 1e9], ['preload', 0, 1e5], ['preloadLoss', 0, 1], ['angle', -75, 75], ['spacing', .1, 30], ['length', .1, 100], ['capacity', 1, 1e7]]) range(s[k], lo, hi, `${s.id}.${k}`);
      for (const k of ['installClearance', 'releaseClearance']) if (s[k] !== undefined && s[k] !== null) range(s[k], 0, 5, `${s.id}.${k}`);
      for (const k of ['bondStiffness', 'baseStiffness']) if (s[k] !== undefined && s[k] !== null) range(s[k], 1, 1e9, `${s.id}.${k}`);
      if (['strut', 'corner'].includes(s.type) && s.angle !== 0) errors.push(`${s.id}: 수평 스트럿·코너스트럿의 수직 경사각은 0°이어야 합니다.`);
      if (s.preload * (1 - s.preloadLoss) > s.capacity + eps) errors.push(`${s.id}: 손실 후 긴장력은 부재 한계축력을 넘을 수 없습니다.`);
      if (typeof s.retained !== 'boolean') errors.push(`${s.id}: 잔존 여부가 필요합니다.`);
      s.installDepth = s.z + (s.installClearance ?? d.clearance);
      s.releaseDepth = s.z + (s.releaseClearance ?? (d.releaseLinked ? (s.installClearance ?? d.clearance) : d.releaseClearance));
      if (s.type === 'slab') { range(s.activateAtBackfill, 0, d.height, `${s.id}.activateAtBackfill`); s.retained = true; s.installDepth = s.activateAtBackfill; }
      if (s.installDepth > d.height + eps || s.releaseDepth > d.height + eps) errors.push(`${s.id}: 설치/해체 굴착깊이가 최대 굴착깊이를 넘습니다.`);
      return s;
    }) : [];
    return { valid: !errors.length, errors, value: d };
  }

  function events(input = {}) {
    const n = normalize(input); if (!n.valid) return [];
    const a = [];
    for (const s of n.value.supports) {
      a.push({ id: `install:${s.id}`, supportId: s.id, type: 'install', phase: s.type === 'slab' ? 'backfill' : 'excavation', depth: s.installDepth, z: s.z });
      if (!s.retained) a.push({ id: `release:${s.id}`, supportId: s.id, type: 'release', phase: 'backfill', depth: s.releaseDepth, z: s.z });
    }
    return a.sort((a, b) => a.phase.localeCompare(b.phase) || (a.phase === 'excavation' ? a.depth - b.depth : b.depth - a.depth) || a.id.localeCompare(b.id));
  }

  const shape = (t, L) => [1 - 3 * t * t + 2 * t ** 3, L * (t - 2 * t * t + t ** 3), 3 * t * t - 2 * t ** 3, L * (-t * t + t ** 3)];
  const beamK = (EI, L) => [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]].map(r => r.map(v => v * EI / L ** 3));
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  function denseSolve(A, b) {
    const a = A.map((r, i) => [...r, b[i]]), n = b.length;
    for (let k = 0; k < n; k++) {
      let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
      if (Math.abs(a[p][k]) < 1e-15) return null;
      [a[k], a[p]] = [a[p], a[k]];
      for (let i = k + 1; i < n; i++) { const f = a[i][k] / a[k][k]; for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j]; }
    }
    const u = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) { let v = a[i][n]; for (let j = i + 1; j < n; j++) v -= a[i][j] * u[j]; u[i] = v / a[i][i]; }
    return u;
  }
  function beamBenchmark(input = {}) {
    const { length = 6, EI = 300000, uniformLoad = 10, tipLoad = 0, elements = 12 } = input;
    if (![length, EI, uniformLoad, tipLoad].every(finite) || length <= 0 || EI <= 0 || !Number.isInteger(elements) || elements < 1 || elements > 100) return invalid(['보 검증 입력을 확인하세요.']);
    const L = length / elements, n = 2 * (elements + 1), K = Array.from({ length: n }, () => new Float64Array(n)), F = new Float64Array(n);
    for (let e = 0; e < elements; e++) {
      const k = beamK(EI, L), f = [uniformLoad * L / 2, uniformLoad * L ** 2 / 12, uniformLoad * L / 2, -uniformLoad * L ** 2 / 12];
      for (let a = 0; a < 4; a++) { F[2 * e + a] += f[a]; for (let b = 0; b < 4; b++) K[2 * e + a][2 * e + b] += k[a][b]; }
    }
    F[0] += tipLoad;
    const u0 = denseSolve(K.slice(0, -2).map(r => Array.from(r.slice(0, -2))), F.slice(0, -2));
    if (!u0) return invalid(['검증 보 평형을 풀 수 없습니다.']);
    const u = Float64Array.from([...u0, 0, 0]), profile = [];
    for (let e = 0; e < elements; e++) {
      const k = beamK(EI, L), ue = Array.from(u.slice(2 * e, 2 * e + 4)), f = [uniformLoad * L / 2, uniformLoad * L ** 2 / 12, uniformLoad * L / 2, -uniformLoad * L ** 2 / 12];
      const end = k.map((r, i) => dot(r, ue) - f[i]);
      for (let j = 0; j <= 4; j++) { const x = L * j / 4; profile.push({ z: e * L + x, displacement: dot(shape(j / 4, L), ue), shear: end[0] + uniformLoad * x, moment: -end[1] + end[0] * x + uniformLoad * x * x / 2 }); }
    }
    return { valid: true, status: 'stable', errors: [], profile, tipDisplacement: u[0], baseReaction: dot(K[n - 2], u) - F[n - 2], baseMoment: dot(K[n - 1], u) - F[n - 1] };
  }

  function effectiveIntegral(a, b, surface, water, soil) {
    if (b <= a) return 0;
    const antiderivative = z => .5 * soil.gamma * Math.max(0, z - surface) ** 2
      + .5 * (soil.gammaSat - gw - soil.gamma) * Math.max(0, z - Math.max(surface, water)) ** 2;
    return antiderivative(b) - antiderivative(a);
  }
  const waterIntegral = (a, b, w) => .5 * gw * (Math.max(0, b - w) ** 2 - Math.max(0, a - w) ** 2);
  const effectiveAt = (z, surface, water, soil) => soil.gamma * Math.max(0, z - surface)
    + (soil.gammaSat - gw - soil.gamma) * Math.max(0, z - Math.max(surface, water));
  function limits(soil, sigma, extra = 0) {
    const sin = Math.sin(soil.phi * Math.PI / 180), ka = (1 - sin) / (1 + sin), kp = 1 / ka;
    return { base: soil.k0 * sigma + extra, low: Math.max(0, ka * sigma - 2 * soil.c * Math.sqrt(ka)), high: Math.max(0, kp * sigma + 2 * soil.c * Math.sqrt(kp)) + extra };
  }
  // Return mapping from the last accepted state, never from an intermediate Newton iterate.
  function spring(previous, u, compressionSign, k, lim, elastic = false) {
    const trial = previous.pressure + (elastic ? 0 : previous.gap || 0) + k * compressionSign * (u - previous.u) + lim.base - previous.base;
    // A no-tension surface remembers its opening: reversal first closes the gap.
    const open = !elastic && trial < 0 && (lim.low === 0 || previous.gap < 0);
    const pressure = elastic ? trial : open ? 0 : clamp(trial, lim.low, lim.high);
    const tangent = elastic || !open && (trial >= lim.low - 1e-10 && trial <= lim.high + 1e-10) ? k : 0;
    return { pressure, tangent, u, base: lim.base, gap: open ? trial : 0,
      plastic: previous.plastic + (open ? 0 : trial - pressure) / k,
      state: open ? 'open' : trial < lim.low - 1e-8 ? 'active' : trial > lim.high + 1e-8 ? 'passive' : 'elastic' };
  }
  const freshSpring = (u = 0) => ({ pressure: 0, base: 0, u, plastic: 0, gap: 0, state: 'elastic' });

  function makeSystem(d, provider) {
    const L = d.height + d.embedment;
    if (!provider && d.supports.some(s => s.type === 'corner')) throw new Error('코너스트럿 해석에는 결합 평면 프레임 모듈이 필요합니다.');
    const z = [...new Set([0, L, d.height, ...Array.from({ length: Math.ceil(L / d.mesh) - 1 }, (_, i) => (i + 1) * d.mesh), ...d.supports.map(s => s.z)].filter(v => v >= 0 && v <= L).map(v => +v.toFixed(9)))].sort((a, b) => a - b);
    let prepared;
    if (provider) prepared = provider.prepare(d);
    if (prepared?.valid === false) throw new Error((prepared.errors || ['평면 배치가 유효하지 않습니다.']).join(' '));
    const strips = prepared?.strips?.length ? prepared.strips : [{ id: 'strip-0', wallId: 'A', position: .5, width: 1 }];
    const nn = z.length, nd = nn * 2, total = nd * strips.length;
    if (total > 7000) throw new Error('요소 수가 너무 많습니다. 요소 크기를 키우세요.');
    const cells = z.map((v, i) => ({ a: i ? (z[i - 1] + v) / 2 : 0, b: i < nn - 1 ? (v + z[i + 1]) / 2 : L }));
    const beams = [];
    for (let s = 0; s < strips.length; s++) for (let e = 0; e < nn - 1; e++) beams.push({ start: s * nd + 2 * e, k: beamK(d.EI * strips[s].width, z[e + 1] - z[e]), strip: s, e });
    return { d, provider, strips, z, cells, nn, nd, total, beams, index: new Map(strips.map((s, i) => [s.id, i])) };
  }
  function atDepth(sys, u, strip, depth) {
    const j = sys.z.findIndex(z => Math.abs(z - depth) < 1e-7);
    if (j >= 0) return u[strip * sys.nd + j * 2];
    let e = 0; while (e < sys.nn - 2 && sys.z[e + 1] < depth) e++;
    const L = sys.z[e + 1] - sys.z[e], N = shape((depth - sys.z[e]) / L, L), base = strip * sys.nd + e * 2;
    return N.reduce((v, n, i) => v + n * u[base + i], 0);
  }
  const nodeIndex = (sys, id, z) => { const s = sys.index.get(id), n = sys.z.findIndex(v => Math.abs(v - z) < 1e-7); return s === undefined || n < 0 ? -1 : s * sys.nd + 2 * n; };
  function copyState(s) {
    return { ...s, u: Float64Array.from(s.u), back: s.back.map(p => ({ ...p })), front: s.front.map(p => ({ ...p })),
      fill: s.fill.map(a => a.map(p => ({ ...p }))), supports: s.supports.map(p => ({ ...p, referenceByStrip: p.referenceByStrip?.map(r => ({ ...r })) })),
      envelope: s.envelope?.map(p => ({ ...p })), previousProfile: s.previousProfile?.map(p => ({ ...p })) };
  }
  function initialState(sys) {
    const n = sys.nn * sys.strips.length;
    return { u: new Float64Array(sys.total), back: Array.from({ length: n }, () => freshSpring()), front: Array.from({ length: n }, () => freshSpring()),
      fill: Array.from({ length: n }, () => []), supports: [], phase: 'excavation', depth: 0, steps: 0, iterations: 0 };
  }

  function scalarSupports(sys, u, active, mode) {
    const forces = [], tangent = [], supportForces = [];
    for (const s of active) {
      const cos = Math.cos(s.angle * Math.PI / 180), serial = s.type === 'raker' ? s.baseStiffness : ['anchor', 'nail', 'rock'].includes(s.type) ? s.bondStiffness : null;
      const axial = serial ? 1 / (1 / s.stiffness + 1 / serial) : s.stiffness;
      const factor = s.type === 'strut' ? 2 : 1;
      let maximum = 0;
      for (let i = 0; i < sys.strips.length; i++) {
        const strip = sys.strips[i], ref = mode === 'shape' ? 0 : s.referenceByStrip?.find(r => r.id === strip.id)?.displacementAtZ || 0;
        const du = atDepth(sys, u, i, s.z) - ref, preload = s.preloadActive === false ? 0 : s.preload * (1 - s.preloadLoss);
        const raw = preload + (s.forceControlled ? 0 : factor * axial * cos * du), force = clamp(raw, 0, s.capacity), k = !s.forceControlled && raw >= 0 && raw <= s.capacity ? factor * axial * cos * cos * strip.width / s.spacing : 0;
        const lineForce = force * cos / s.spacing;
        forces.push({ stripId: strip.id, z: s.z, force: lineForce * strip.width });
        tangent.push({ aStripId: strip.id, aZ: s.z, bStripId: strip.id, bZ: s.z, k });
        maximum = Math.max(maximum, force);
      }
      supportForces.push({ id: s.id, force: maximum, lineForce: maximum * cos / s.spacing });
    }
    return { valid: true, forces, tangent, supportForces };
  }

  function evaluate(sys, previous, u, target, mode) {
    const { d, nn, nd, strips, cells } = sys, R = new Float64Array(sys.total), diagonal = new Float64Array(sys.total), records = [], back = [], front = [], fill = [];
    for (const { start, k } of sys.beams) for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) R[start + a] += k[a][b] * u[start + b];
    const excavationDepth = target.phase === 'excavation' ? target.depth : d.height;
    const frontWater = target.phase === 'excavation' ? d.water.excavation : d.water.excavation + (d.water.restore - d.water.excavation) * (d.height - target.depth) / d.height;
    for (let s = 0; s < strips.length; s++) for (let i = 0; i < nn; i++) {
      const at = s * nn + i, dof = s * nd + 2 * i, { a, b } = cells[i], w = strips[s].width, area = b - a;
      const backLim = limits(d.soil, effectiveIntegral(a, b, 0, d.water.retained, d.soil) / area + d.surcharge);
      let bp, fp = { ...freshSpring(u[dof]), tangent: 0 }, fillForce = 0, fillTangent = 0;
      if (mode === 'shape') {
        // Prescribed active load is independent of kh; elastic resistance is a separate component.
        bp = { ...freshSpring(u[dof]), pressure: backLim.low, tangent: 0, base: backLim.low };
      } else bp = spring(previous.back[at], u[dof], -1, d.soil.kh, backLim);
      back.push(bp);
      const fa = Math.max(a, excavationDepth), frontArea = Math.max(0, b - fa);
      if (frontArea > eps) {
        const fillOverburden = target.phase === 'backfill' && d.fill.pressureModel === 'soil'
          ? effectiveAt(d.height, target.depth, frontWater, d.fill) : 0;
        const lim = limits(d.soil, effectiveIntegral(fa, b, excavationDepth, frontWater, d.soil) / frontArea + fillOverburden);
        fp = mode === 'shape' ? { ...freshSpring(u[dof]), pressure: d.soil.kh * u[dof], tangent: d.soil.kh } : spring(previous.front[at], u[dof], 1, d.soil.kh, lim);
      }
      front.push(fp);
      const fs = [];
      for (const old of previous.fill[at]) {
        const size = old.b - old.a;
        const lim = d.fill.pressureModel === 'spring' ? { base: 0, low: 0, high: 1e12 } : limits(d.fill, effectiveIntegral(old.a, old.b, target.depth, frontWater, d.fill) / size, d.fill.initialPressure);
        const p = mode === 'shape' ? { ...old, pressure: d.fill.kh * u[dof], tangent: d.fill.kh } : { ...old, ...spring(old, u[dof], 1, d.fill.kh, lim) };
        fs.push(p); fillForce += p.pressure * size; fillTangent += p.tangent * size;
      }
      fill.push(fs);
      const water = waterIntegral(a, b, d.water.retained) - waterIntegral(a, b, frontWater);
      const force = (bp.pressure * area - fp.pressure * frontArea - fillForce + water) * w;
      R[dof] -= force;
      diagonal[dof] += (bp.tangent * area + fp.tangent * frontArea + fillTangent) * w;
      records.push({ soilPressure: bp.pressure - (fp.pressure * frontArea + fillForce) / area,
        waterPressure: water / area, pressure: force / (area * w), retainedPressure: bp.pressure,
        retainedTotalPressure: bp.pressure + waterIntegral(a, b, d.water.retained) / area,
        excavationTotalPressure: (fp.pressure * frontArea + fillForce + waterIntegral(a, b, frontWater)) / area,
        excavationPressure: (fp.pressure * frontArea + fillForce) / area, activeLimit: backLim.low,
        passiveLimit: backLim.high, soilState: bp.state, soilForce: force, frontArea, fillArea: fs.reduce((v, x) => v + x.b - x.a, 0) });
    }
    const uByStrip = strips.map((s, i) => ({ id: s.id, uAt: z => atDepth(sys, u, i, z) }));
    const support = sys.provider ? sys.provider.evaluate({ input: d, uByStrip, activeSupports: previous.supports, mode }) : scalarSupports(sys, u, previous.supports, mode);
    if (support.valid === false) throw new Error((support.errors || ['지보 프레임 평형을 풀 수 없습니다.']).join(' '));
    const triplets = [];
    for (const f of support.forces || []) { const a = nodeIndex(sys, f.stripId, f.z); if (a < 0) throw new Error('평면 지보 접점이 벽체 절점과 일치하지 않습니다.'); R[a] += f.force; }
    for (const t of support.tangent || []) {
      const a = nodeIndex(sys, t.aStripId, t.aZ), b = nodeIndex(sys, t.bStripId, t.bZ);
      if (a < 0 || b < 0 || !finite(t.k)) throw new Error('평면 지보 접선강성 입력이 유효하지 않습니다.');
      triplets.push({ a, b, k: t.k });
    }
    return { R, diagonal, triplets, back, front, fill, records, support, appliedWater: { retained: d.water.retained, excavation: frontWater }, norm: Math.max(...R.map(Math.abs)) };
  }

  // Small-band strip factors are preconditioners only; the physical operator has no artificial springs.
  function factorStrip(sys, strip, diag, extraDiagonal) {
    const n = sys.nd, A = Array.from({ length: n }, () => new Float64Array(4));
    for (const b of sys.beams) if (b.strip === strip) for (let i = 0; i < 4; i++) for (let j = 0; j <= i; j++) A[2 * b.e + i][i - j] += b.k[i][j];
    let scale = 0;
    for (let i = 0; i < n; i++) { A[i][0] += diag[strip * n + i] + extraDiagonal[strip * n + i]; scale = Math.max(scale, A[i][0]); }
    for (let i = 0; i < n; i++) {
      for (let j = Math.max(0, i - 3); j <= i; j++) {
        let v = A[i][i - j];
        for (let k = Math.max(0, i - 3, j - 3); k < j; k++) v -= A[i][i - k] * A[j][j - k];
        if (j === i) A[i][0] = Math.sqrt(Math.max(v, scale * 1e-13));
        else A[i][i - j] = v / A[j][0];
      }
    }
    return A;
  }
  function linearSolve(sys, ev, rhs) {
    const extra = new Float64Array(sys.total);
    for (const t of ev.triplets) if (t.a === t.b) extra[t.a] += Math.max(0, t.k);
    const factors = sys.strips.map((_, i) => factorStrip(sys, i, ev.diagonal, extra));
    const applyM = r => {
      const z = Float64Array.from(r);
      for (let s = 0; s < factors.length; s++) {
        const A = factors[s], n = sys.nd, offset = s * n;
        for (let i = 0; i < n; i++) { let v = z[offset + i]; for (let j = Math.max(0, i - 3); j < i; j++) v -= A[i][i - j] * z[offset + j]; z[offset + i] = v / A[i][0]; }
        for (let i = n - 1; i >= 0; i--) { let v = z[offset + i]; for (let j = i + 1; j < Math.min(n, i + 4); j++) v -= A[j][j - i] * z[offset + j]; z[offset + i] = v / A[i][0]; }
      }
      return z;
    };
    const apply = x => {
      const y = Float64Array.from(x, (v, i) => v * ev.diagonal[i]);
      for (const { start, k } of sys.beams) for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) y[start + a] += k[a][b] * x[start + b];
      for (const t of ev.triplets) y[t.a] += t.k * x[t.b];
      return y;
    };
    const x = new Float64Array(sys.total), r = Float64Array.from(rhs), z = applyM(r), p = Float64Array.from(z);
    let rz = dot(r, z); const tolerance = Math.max(1e-9, Math.sqrt(dot(rhs, rhs)) * 1e-10);
    if (Math.sqrt(dot(r, r)) <= tolerance) return x;
    for (let it = 0; it < Math.max(100, sys.total * 2); it++) {
      const Ap = apply(p), pap = dot(p, Ap); if (!(pap > 0) || !finite(pap)) return null;
      const alpha = rz / pap;
      for (let i = 0; i < x.length; i++) { x[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; }
      if (Math.sqrt(dot(r, r)) <= tolerance) return x;
      const next = applyM(r), nrz = dot(r, next), beta = nrz / rz; rz = nrz;
      for (let i = 0; i < p.length; i++) p[i] = next[i] + beta * p[i];
    }
    return null;
  }

  function addFill(sys, state, top) {
    const oldTop = state.phase === 'backfill' ? state.depth : sys.d.height;
    if (top >= oldTop - eps) return;
    for (let s = 0; s < sys.strips.length; s++) for (let i = 0; i < sys.nn; i++) {
      const a = Math.max(top, sys.cells[i].a), b = Math.min(oldTop, sys.cells[i].b);
      if (b > a + eps) state.fill[s * sys.nn + i].push({ ...freshSpring(state.u[s * sys.nd + 2 * i]), a, b });
    }
  }
  function solveStep(sys, previous, target, mode = 'history') {
    const base = copyState(previous);
    if (target.phase === 'backfill') addFill(sys, base, target.depth);
    let u = Float64Array.from(base.u), ev, totalIterations = 0;
    const tolerance = 2e-6;
    for (let it = 0; it < 45; it++) {
      ev = evaluate(sys, base, u, target, mode); totalIterations++;
      if (ev.norm < tolerance) break;
      const delta = linearSolve(sys, ev, Float64Array.from(ev.R, v => -v));
      if (!delta || Math.max(...delta.map(Math.abs)) > 1e4) return { valid: false, status: 'nonconverged', errors: ['지반·지보의 접선강성으로 평형을 찾지 못했습니다. 지지 조건과 토압 한계를 확인하세요.'], last: previous };
      let alpha = 1, accepted = false;
      for (let ls = 0; ls < 14; ls++) {
        const trial = Float64Array.from(u, (v, i) => v + alpha * delta[i]);
        const candidate = evaluate(sys, base, trial, target, mode);
        if (candidate.norm < ev.norm * (1 - 1e-5 * alpha) || candidate.norm < tolerance) { u = trial; ev = candidate; accepted = true; break; }
        alpha /= 2;
      }
      if (!accepted) return { valid: false, status: 'nonconverged', errors: ['비선형 평형 반복이 수렴하지 않았습니다.'], last: previous };
    }
    if (!ev || ev.norm >= tolerance || u.some(v => !finite(v))) return { valid: false, status: 'nonconverged', errors: ['비선형 해석의 잔차가 허용치를 넘었습니다.'], last: previous };
    const state = { ...base, u, back: ev.back, front: ev.front, fill: ev.fill, phase: target.phase, depth: target.depth, eventSide: target.eventSide || 'after',
      steps: previous.steps + 1, iterations: previous.iterations + totalIterations, evaluation: ev };
    state.previousProfile = profileFor(sys, previous, 0);
    return { valid: true, state };
  }

  function profileFor(sys, state, strip) {
    if (!state.evaluation) return sys.z.map(z => ({ z, pressure: 0, soilPressure: 0, waterPressure: 0, displacement: 0, shear: 0, moment: 0 }));
    const profile = [], nd = sys.nd, width = sys.strips[strip].width, ev = state.evaluation;
    for (let e = 0; e < sys.nn - 1; e++) {
      const start = strip * nd + 2 * e, L = sys.z[e + 1] - sys.z[e], k = beamK(sys.d.EI * width, L), ue = Array.from(state.u.slice(start, start + 4)), end = k.map(r => dot(r, ue));
      for (let j = 0; j < 2; j++) {
        const n = e + j, r = ev.records[strip * sys.nn + n];
        profile.push({ z: sys.z[n], ...r, displacement: state.u[strip * nd + 2 * n], rotation: state.u[strip * nd + 2 * n + 1],
          shear: end[0] / width, moment: (-end[1] + end[0] * L * j) / width });
      }
    }
    return profile;
  }
  function install(sys, state, list, preloadActive = true) {
    const s = copyState(state);
    for (const p of list) if (!s.supports.some(a => a.id === p.id)) s.supports.push({ ...p, preloadActive,
      referenceByStrip: sys.strips.map((strip, i) => ({ id: strip.id, displacementAtZ: atDepth(sys, s.u, i, p.z) })) });
    return s;
  }
  function updateEnvelope(sys, state, envelopes) {
    for (let s = 0; s < sys.strips.length; s++) {
      const p = profileFor(sys, state, s);
      if (!envelopes[s]) envelopes[s] = p.map(v => ({ z: v.z, minPressure: v.pressure, maxPressure: v.pressure, minDisplacement: v.displacement, maxDisplacement: v.displacement, minShear: v.shear, maxShear: v.shear, minMoment: v.moment, maxMoment: v.moment }));
      else p.forEach((v, i) => { for (const key of ['Pressure', 'Displacement', 'Shear', 'Moment']) { const field = key[0].toLowerCase() + key.slice(1); envelopes[s][i][`min${key}`] = Math.min(envelopes[s][i][`min${key}`], v[field]); envelopes[s][i][`max${key}`] = Math.max(envelopes[s][i][`max${key}`], v[field]); } });
    }
  }

  const models = new Map(), providerIds = new WeakMap(); let nextProviderId = 1;
  function providerIdentity(p) { if (!p) return 0; if (!providerIds.has(p)) providerIds.set(p, nextProviderId++); return providerIds.get(p); }
  function clearCache() { models.clear(); }
  function analyze(input = {}, observation = input?.observation || {}, options = {}) {
    const n = normalize(input); if (!n.valid) return invalid(n.errors);
    const d = n.value, o = { ...defaults.observation, ...observation }, errors = [];
    if (!['excavation', 'backfill'].includes(o.phase) || !['history', 'shape'].includes(o.mode) || !['before', 'installed', 'after'].includes(o.eventSide) || !finite(o.depth) || o.depth < 0 || o.depth > d.height) return invalid(['관찰 공정·깊이·사건 순서를 확인하세요.']);
    const provider = options.planarProvider || (typeof ExcavationPlanar !== 'undefined' ? ExcavationPlanar : null);
    d.observation = o;
    const modelInput = { ...d }; delete modelInput.observation;
    const key = JSON.stringify(modelInput) + `|${providerIdentity(provider)}|${d.supports.some(s => s.type === 'corner') ? 'coupled' : `${o.wallId}|${o.position}`}`;
    let model = models.get(key);
    try {
      if (!model) { model = { sys: makeSystem(d, provider), results: new Map(), checkpoints: [] }; models.set(key, model); if (models.size > 3) models.delete(models.keys().next().value); }
      const resultKey = JSON.stringify(o), cached = model.results.get(resultKey); if (cached) return structuredClone(cached);
      const sys = model.sys; let envelopes = [], timeline = []; const record = s => { updateEnvelope(sys, s, envelopes); timeline.push({ phase: s.phase, depth: s.depth, maxDisplacement: Math.max(...s.u.filter((_, i) => i % 2 === 0).map(Math.abs)) }); };
      let state = initialState(sys), previousState = null, failure = null, reusedCheckpoint = false, adaptiveSteps = 0;
      const progress = s => s.phase === 'excavation' ? s.depth : 2 * d.height - s.depth;
      const canonical = (H, phase) => Math.abs((phase === 'excavation' ? H : d.height - H) / d.increment - Math.round((phase === 'excavation' ? H : d.height - H) / d.increment)) < 1e-7
        || Math.abs(H - d.height) < eps || Math.abs(H) < eps || d.supports.some(s => phase === 'excavation' ? s.type !== 'slab' && Math.abs(s.installDepth - H) < eps : s.type === 'slab' ? Math.abs(s.activateAtBackfill - H) < eps : !s.retained && Math.abs(s.releaseDepth - H) < eps);
      const saveCheckpoint = () => {
        if (o.mode !== 'history' || !canonical(state.depth, state.phase)) return;
        const p = progress(state), id = `${state.phase}:${state.depth}`;
        if (model.checkpoints.some(c => c.id === id)) return;
        model.checkpoints.push({ id, progress: p, state: copyState(state), previous: previousState ? copyState(previousState) : null,
          envelopes: structuredClone(envelopes), timeline: structuredClone(timeline) });
        if (model.checkpoints.length > 40) model.checkpoints.shift();
      };
      if (o.mode === 'history') {
        const targetProgress = progress(o), possible = model.checkpoints.filter(c => c.progress < targetProgress - eps);
        const best = possible.sort((a, b) => b.progress - a.progress)[0];
        if (best) { state = copyState(best.state); previousState = best.previous ? copyState(best.previous) : null; envelopes = structuredClone(best.envelopes); timeline = structuredClone(best.timeline); reusedCheckpoint = true; }
      }
      const step = (target, tentative = null, refinement = 0) => {
        const r = solveStep(sys, tentative || state, target, o.mode);
        if (!r.valid) {
          const start = target.phase === state.phase ? state.depth : d.height;
          if (!tentative && o.mode === 'history' && Math.abs(target.depth - start) > .015625 + eps && refinement < 5) {
            adaptiveSteps++;
            if (!step({ ...target, depth: (target.depth + start) / 2 }, null, refinement + 1)) return false;
            return step(target, null, refinement + 1);
          }
          failure = r; return false;
        }
        previousState = state; state = r.state; record(state); return true;
      };
      if (!reusedCheckpoint && !step({ phase: 'excavation', depth: 0 })) throw new Error(failure.errors.join(' '));
      const depths = (end, phase) => {
        const a = [end];
        if (phase === 'excavation') { for (let v = d.increment; v < end - eps; v += d.increment) a.push(+v.toFixed(9)); for (const s of d.supports) if (s.type !== 'slab' && s.installDepth <= end + eps) a.push(s.installDepth); return [...new Set(a)].sort((a, b) => a - b); }
        for (let v = d.height - d.increment; v > end + eps; v -= d.increment) a.push(+v.toFixed(9));
        for (const s of d.supports) if (!s.retained && s.releaseDepth >= end - eps) a.push(s.releaseDepth);
        for (const s of d.supports) if (s.type === 'slab' && s.activateAtBackfill >= end - eps) a.push(s.activateAtBackfill);
        return [...new Set(a)].sort((a, b) => b - a);
      };
      if (o.mode === 'shape') {
        state = initialState(sys);
        state.supports = d.supports.filter(s => s.type === 'slab'
          ? o.phase === 'backfill' && (s.activateAtBackfill > o.depth + eps || (Math.abs(s.activateAtBackfill - o.depth) < eps && o.eventSide !== 'before'))
          : o.phase === 'backfill' ? s.installDepth <= d.height + eps : s.installDepth < o.depth - eps || (s.installDepth <= o.depth + eps && o.eventSide !== 'before'))
          .filter(s => o.phase !== 'backfill' || s.retained || s.releaseDepth < o.depth - eps || (Math.abs(s.releaseDepth - o.depth) < eps && (o.eventSide === 'before' || o.eventSide === 'installed' && d.supports.some(t => t.type === 'slab' && Math.abs(t.activateAtBackfill - o.depth) < eps))))
          .map(s => ({ ...s, preloadActive: !(o.eventSide === 'installed' && o.phase === 'excavation' && Math.abs(s.installDepth - o.depth) < eps), referenceByStrip: sys.strips.map(t => ({ id: t.id, displacementAtZ: 0 })) }));
        if (!step({ phase: o.phase, depth: o.depth })) failure ||= { errors: ['현재 형상 모델 해석에 실패했습니다.'] };
      } else {
        const end = o.phase === 'backfill' ? d.height : o.depth;
        for (const H of state.phase === 'backfill' ? [] : depths(end, 'excavation')) {
          if (H < state.depth - eps || (reusedCheckpoint && Math.abs(H - state.depth) < eps)) continue;
          const hasEvent = d.supports.some(s => s.type !== 'slab' && Math.abs(s.installDepth - H) < eps);
          if (H > state.depth + eps && !step({ phase: 'excavation', depth: H, eventSide: hasEvent ? 'before' : 'after' })) break;
          const list = d.supports.filter(s => s.type !== 'slab' && Math.abs(s.installDepth - H) < eps && !state.supports.some(a => a.id === s.id));
          const here = o.phase === 'excavation' && Math.abs(H - o.depth) < eps;
          if (list.length && !(here && o.eventSide === 'before')) {
            if (!step({ phase: 'excavation', depth: H, eventSide: 'installed' }, install(sys, state, list, false))) break;
            if (!(here && o.eventSide === 'installed')) {
              const newIds = new Set(list.map(s => s.id));
              const tensioned = copyState(state);
              tensioned.supports.forEach(s => { if (newIds.has(s.id)) { s.preloadActive = true; s.forceControlled = true; } });
              if (!step({ phase: 'excavation', depth: H, eventSide: 'after' }, tensioned)) break;
              state.supports.forEach(s => { if (newIds.has(s.id)) {
                s.referenceByStrip = sys.strips.map((strip, i) => ({ id: strip.id, displacementAtZ: atDepth(sys, state.u, i, s.z) }));
                s.planarLock = state.evaluation.support.supportForces?.find(r => r.id === s.id)?.lock;
                s.forceControlled = false;
              } });
              // Locking changes the reference length, not the equilibrium configuration.
              state.evaluation = evaluate(sys, state, state.u, { phase: 'excavation', depth: H }, o.mode);
            }
          }
          if (!(here && o.eventSide !== 'after')) saveCheckpoint();
        }
        if (!failure && o.phase === 'backfill') {
          for (const H of depths(o.depth, 'backfill')) {
            if (state.phase === 'backfill' && (H > state.depth + eps || reusedCheckpoint && Math.abs(H - state.depth) < eps)) continue;
            const hasEvent = d.supports.some(s => Math.abs((s.type === 'slab' ? s.activateAtBackfill : s.retained ? -1 : s.releaseDepth) - H) < eps);
            if (!step({ phase: 'backfill', depth: H, eventSide: hasEvent ? 'before' : 'after' })) break;
            const here = Math.abs(H - o.depth) < eps;
            const replacement = d.supports.filter(s => s.type === 'slab' && Math.abs(s.activateAtBackfill - H) < eps && !state.supports.some(a => a.id === s.id));
            if (replacement.length && !(here && o.eventSide === 'before')) {
              if (!step({ phase: 'backfill', depth: H, eventSide: 'installed' }, install(sys, state, replacement, true))) break;
            }
            const ids = d.supports.filter(s => !s.retained && Math.abs(s.releaseDepth - H) < eps).map(s => s.id);
            if (ids.length && !(here && (o.eventSide === 'before' || (replacement.length && o.eventSide === 'installed')))) { const released = copyState(state); released.supports = released.supports.filter(s => !ids.includes(s.id)); if (!step({ phase: 'backfill', depth: H, eventSide: 'after' }, released)) break; }
            if (!(here && o.eventSide !== 'after')) saveCheckpoint();
          }
        }
      }
      let chosen = sys.strips.findIndex(s => s.wallId === o.wallId);
      const candidates = sys.strips.map((s, i) => ({ ...s, i })).filter(s => s.wallId === o.wallId);
      if (candidates.length && finite(o.position)) chosen = candidates.reduce((a, b) => Math.abs(a.position - o.position) <= Math.abs(b.position - o.position) ? a : b).i;
      if (chosen < 0) chosen = 0;
      const profile = profileFor(sys, state, chosen), prev = previousState ? profileFor(sys, previousState, chosen) : profile.map(p => ({ ...p, pressure: 0, soilPressure: 0, waterPressure: 0, displacement: 0, shear: 0, moment: 0 }));
      const incrementProfile = profile.map((p, i) => ({ ...p, ...Object.fromEntries(['pressure', 'soilPressure', 'waterPressure', 'displacement', 'shear', 'moment'].map(k => [k, p[k] - (prev[i]?.[k] || 0)])) }));
      const ev = state.evaluation; let forceResidual = 0, momentResidual = 0;
      for (let s = 0; s < sys.strips.length; s++) for (let i = 0; i < sys.nn; i++) { forceResidual += ev.R[s * sys.nd + 2 * i]; momentResidual += ev.R[s * sys.nd + 2 * i] * sys.z[i] + ev.R[s * sys.nd + 2 * i + 1]; }
      const supportForces = d.supports.map(s => {
        const active = state.supports.find(a => a.id === s.id), output = ev.support.supportForces?.find(a => a.id === s.id);
        const selectedReaction=output?.reactionByStrip?.find(v=>v.stripId===sys.strips[chosen].id)?.lineForce;
        return { ...s, ...(output || {}), force: output?.force || 0, reaction: selectedReaction??output?.lineForce??output?.reaction??0,
          state: active ? (active.preloadActive === false ? 'installed' : s.retained && state.phase === 'backfill' ? 'retained' : 'active') : state.phase === 'backfill' && s.type !== 'slab' ? 'released' : 'planned' };
      });
      const result = { valid: !failure, status: failure ? 'nonconverged' : 'stable', errors: failure?.errors || errors, mode: o.mode, phase: state.phase, depth: state.depth, eventSide: state.eventSide || 'after', requestedDepth: o.depth,
        profile, incrementProfile, supportForces, appliedWater: ev.appliedWater, events: events(d), strips: sys.strips, selectedStrip: sys.strips[chosen], envelope: { profile: envelopes[chosen] || [] }, timeline,
        maxDisplacement: Math.max(...profile.map(p => Math.abs(p.displacement))), maxMoment: Math.max(...profile.map(p => Math.abs(p.moment))), maxShear: Math.max(...profile.map(p => Math.abs(p.shear))),
        residuals: { force: forceResidual, moment: momentResidual, algebraic: ev.norm }, diagnostics: { adaptiveSteps, reusedCheckpoint, checkpoints: model.checkpoints.length, steps: state.steps, iterations: state.iterations, mesh: d.mesh, increment: d.increment,
          assumptions: [o.mode === 'history' ? '독립 탄소성 지반스프링·시공이력, 일정 재하/제하 강성' : '지정 주동외압·탄성 지반반력·무변형 지보 기준', '되메움 진행률에 따라 굴착측 수위를 목표까지 선형 복구; 정수압, 침투·압밀·동적 거동 제외', '벽체 휨과 선택한 지보 하중 전달; 독립 보강사면/절리암반 안정 해석 제외'], support: ev.support.diagnostics || { model: ev.support.model || '폭 1 m 독립 축지보' } } };
      model.results.set(resultKey, structuredClone(result)); if (model.results.size > 32) model.results.delete(model.results.keys().next().value);
      return result;
    } catch (error) { return invalid([error.message]); }
  }
  return { defaults, normalize, validateInput: normalize, events, analyze, beamBenchmark, constitutiveStep: spring, clearCache };
})();
