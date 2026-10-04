/** Stokes-equivalent diameter from a prescribed settling distance and elapsed time.
 * Pure-water properties: IAPWS SR6-08(2011), Eqs. (2), (7), Tables 1 and 5.
 * All particle sizes are equivalent settling diameters, never mass percentages.
 */
export const Sedimentation = (() => {
  const gravity = 9.80665, pressurePa = 100000, reynoldsLimit = .1;
  const defaults = Object.freeze({ sedimentDepthCm: 10, sedimentTimeMinutes: 10, sedimentGs: 2.65, sedimentTemperature: 20 });
  const bounds = Object.freeze({
    sedimentDepthCm: [1, 30, '유효깊이 L', 'cm'],
    sedimentTimeMinutes: [.1, 1440, '경과시간 t', '분'],
    sedimentGs: [1.5, 3.5, '입자 비중 Gs', ''],
    sedimentTemperature: [5, 40, '물 온도 T', '°C'],
  });
  const fields = Object.freeze(Object.keys(defaults));
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  function water(temperatureC) {
    if (!finite(temperatureC) || temperatureC < -20 || temperatureC > 110) return { valid: false, errors: ['IAPWS 물성식 범위는 −20~110°C입니다.'] };
    const kelvin = temperatureC + 273.15, alpha = 10 / (593 - kelvin), beta = 10 / (kelvin - 232);
    const a = [1.93763157e-2, 6.74458446e3, -2.22521604e5, 1.00231247e8, -1.63552118e9, 8.32299658e9];
    const b = [5.78545292e-3, -1.53195665e-2, 3.11337859e-2, -4.23546241e-2, 3.38713507e-2, -1.19946761e-2];
    const powers = [0, 4, 5, 7, 8, 9];
    let volumeTerms = a[0];
    for (let i = 1; i < a.length; i++) volumeTerms += a[i] * alpha ** powers[i];
    for (let i = 0; i < b.length; i++) volumeTerms += b[i] * beta ** (i + 1);
    const specificVolume = 461.51805 * 10 / pressurePa * volumeTerms;
    const density = 1 / specificVolume;
    const tStar = kelvin / 300;
    const viscosity = 1e-6 * (280.68 * tStar ** -1.9 + 511.45 * tStar ** -7.7 + 61.131 * tStar ** -19.6 + .45903 * tStar ** -40);
    return { valid: true, errors: [], temperatureC, kelvin, pressurePa, density, specificVolume, viscosity, kinematicViscosity: viscosity / density };
  }
  // Gs uses a fixed 4°C water reference; changing bath temperature must not change particle density.
  const referenceDensity = water(4).density;
  function analyze(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['침강 조건을 입력하세요.'] };
    const d = { ...defaults, ...input }, errors = [];
    for (const [field, [min, max, label, unit]] of Object.entries(bounds)) {
      if (!finite(d[field]) || d[field] < min || d[field] > max) errors.push(`${label}: ${min}~${max} ${unit} 범위의 숫자를 입력하세요.`);
    }
    if (errors.length) return { valid: false, errors };
    const properties = water(d.sedimentTemperature), particleDensity = d.sedimentGs * referenceDensity;
    const densityDifference = particleDensity - properties.density;
    if (!(densityDifference > 0)) return { valid: false, errors: ['중력 침강을 보려면 입자 밀도가 물 밀도보다 커야 합니다.'] };
    const depthMetres = d.sedimentDepthCm / 100;
    const at = timeMinutes => {
      const timeSeconds = timeMinutes * 60, velocity = depthMetres / timeSeconds;
      const diameterMetres = Math.sqrt(18 * properties.viscosity * velocity / (densityDifference * gravity));
      const reynolds = properties.density * velocity * diameterMetres / properties.viscosity;
      return { timeMinutes, timeSeconds, velocity, velocityMmPerSecond: velocity * 1000, diameterMetres,
        diameterMm: diameterMetres * 1000, diameterMicrons: diameterMetres * 1e6, reynolds,
        creepingFlow: reynolds <= reynoldsLimit * (1 + 2e-12) };
    };
    const current = at(d.sedimentTimeMinutes);
    const maxCreepingDiameterMetres = Math.cbrt(18 * properties.viscosity ** 2 * reynoldsLimit / (properties.density * densityDifference * gravity));
    const limitingVelocity = densityDifference * gravity * maxCreepingDiameterMetres ** 2 / (18 * properties.viscosity);
    const minCreepingTimeMinutes = depthMetres / limitingVelocity / 60;
    const timeMin = bounds.sedimentTimeMinutes[0], timeMax = bounds.sedimentTimeMinutes[1];
    const logMin = Math.log10(timeMin), logSpan = Math.log10(timeMax) - logMin;
    const curve = Array.from({ length: 121 }, (_, i) => at(i === 0 ? timeMin : i === 120 ? timeMax : 10 ** (logMin + logSpan * i / 120)));
    if (minCreepingTimeMinutes > timeMin && minCreepingTimeMinutes < timeMax) curve.push(at(minCreepingTimeMinutes));
    curve.sort((a, b) => a.timeMinutes - b.timeMinutes);
    return { valid: true, errors: [], model: 'stokes-equivalent-settling-diameter-pure-water',
      inputs: Object.fromEntries(fields.map(k => [k, d[k]])), ...current, depthMetres, gravity, properties,
      particleDensity, referenceDensity, densityDifference, reynoldsLimit,
      status: current.creepingFlow ? 'creeping-flow' : 'outside-creeping-flow',
      maxCreepingDiameterMm: maxCreepingDiameterMetres * 1000, minCreepingTimeMinutes, curve,
      timeBounds: { min: timeMin, max: timeMax },
      massDistributionAvailable: false,
    };
  }
  return Object.freeze({ defaults, bounds, fields, gravity, reynoldsLimit, referenceDensity, water, analyze });
})();
