/**
 * Prandtl-type strip-footing collapse-mechanism geometry, not a load solver.
 * Physical coordinates in metres: x rightward, y downward; ground is y=0.
 * See docs/bearing-geometry-notes.md for construction, sources and limitations.
 */
export const BearingGeometry = (() => {
  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const point = (x, y) => ({ x, y });
  const mirror = (p) => point(-p.x, p.y);
  function centroid(points) {
    let twiceArea = 0, xSum = 0, ySum = 0;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index], b = points[(index + 1) % points.length];
      const cross = a.x * b.y - b.x * a.y;
      twiceArea += cross;
      xSum += (a.x + b.x) * cross;
      ySum += (a.y + b.y) * cross;
    }
    return point(xSum / (3 * twiceArea), ySum / (3 * twiceArea));
  }

  function prandtl(input = {}) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return { valid: false, errors: ['기초 폭과 마찰각을 객체로 입력하세요.'] };
    }
    const { width = 3, phi = 30, samples = 72 } = input;
    const errors = [];
    if (!finite(width) || width <= 0) errors.push('기초 폭은 0보다 큰 유한한 숫자여야 합니다.');
    if (!finite(phi) || phi < 0 || phi > 45) errors.push('현재 기구의 지원 마찰각은 0~45°입니다.');
    if (!Number.isInteger(samples) || samples < 16 || samples > 720) errors.push('곡선 분할 수는 16~720의 정수여야 합니다.');
    if (errors.length) return { valid: false, errors };

    const rad = Math.PI / 180;
    const active = 45 + phi / 2;
    const passive = 45 - phi / 2;
    const beta = active * rad;
    const alpha = passive * rad;
    const tanPhi = Math.tan(phi * rad);
    const half = width / 2;
    const wedgeDepth = half * Math.tan(beta);
    const apex = point(0, wedgeDepth);
    const rightPole = point(half, 0);
    const leftPole = point(-half, 0);
    const r0 = half / Math.cos(beta);
    const fanRotation = Math.PI / 2;
    const rEnd = r0 * Math.exp(fanRotation * tanPhi);
    const theta0 = Math.PI - beta;

    // Rotation t increases clockwise in the mathematical x/y-up frame,
    // equivalently the downward-positive polar angle theta0-t decreases.
    const spiralAt = (t, fraction = 1) => {
      const radius = fraction * r0 * Math.exp(t * tanPhi);
      const angle = theta0 - t;
      return point(half + radius * Math.cos(angle), radius * Math.sin(angle));
    };
    const rotations = Array.from({ length: samples + 1 }, (_, i) => fanRotation * i / samples);
    // dy/dt=0 at t=beta. Include that exact point, not a sampled approximation.
    rotations.push(beta);
    const sampledRotations = [...new Set(rotations)].sort((a, b) => a - b);
    const rightSpiral = sampledRotations.map((t) => spiralAt(t));
    rightSpiral[0] = apex; // Exact common vertex, avoiding floating-point seams.
    const leftSpiral = rightSpiral.map(mirror);
    const rightFanEnd = rightSpiral.at(-1);
    // At the end the spiral tangent rises at alpha; its ground intersection is
    // the exterior vertex of the Rankine passive wedge.
    const rightExit = point(rightFanEnd.x + rightFanEnd.y / Math.tan(alpha), 0);
    const leftExit = mirror(rightExit);
    const maxDepth = spiralAt(beta).y;
    const central = [leftPole, rightPole, apex];
    const rightFan = [rightPole, ...rightSpiral];
    const leftFan = rightFan.map(mirror);
    const rightPassive = [rightPole, rightFanEnd, rightExit];
    const leftPassive = rightPassive.map(mirror);
    const zone = (id, kind, points, title) => ({ id, kind, points, label: centroid(points), title });
    const zones = [
      zone('central', 'central', central, 'Ⅰ 중앙 쐐기'),
      zone('fan-left', 'fan', leftFan, 'Ⅱ 방사 전단 영역'),
      zone('fan-right', 'fan', rightFan, 'Ⅱ 방사 전단 영역'),
      zone('passive-left', 'passive', leftPassive, 'Ⅲ 수동 쐐기'),
      zone('passive-right', 'passive', rightPassive, 'Ⅲ 수동 쐐기'),
    ];
    const fanRays = [];
    for (let index = 1; index < 9; index += 1) {
      const tip = spiralAt(fanRotation * index / 9);
      fanRays.push({ side: 'right', points: [rightPole, tip] });
      fanRays.push({ side: 'left', points: [leftPole, mirror(tip)] });
    }
    const fanCurves = [];
    for (const fraction of [0.3, 0.55, 0.78]) {
      const curve = sampledRotations.map((t) => spiralAt(t, fraction));
      fanCurves.push({ side: 'right', points: curve });
      fanCurves.push({ side: 'left', points: curve.map(mirror) });
    }
    const slipBoundary = [leftExit, ...[...leftSpiral].reverse(), ...rightSpiral.slice(1), rightExit];
    const totalWidth = 2 * rightExit.x;
    if (![wedgeDepth, r0, rEnd, maxDepth, totalWidth].every(Number.isFinite)
      || zones.some((z) => !finite(z.label.x) || !finite(z.label.y))) {
      return { valid: false, errors: ['입력 크기가 계산 가능한 숫자 범위를 초과했습니다.'] };
    }
    return {
      valid: true, errors: [], width, phi,
      model: 'prandtl-strip-geometry-v1', coordinates: 'metres; x right; y down; ground y=0',
      angles: { active, passive, fan: 90 },
      footing: { left: leftPole, right: rightPole }, apex,
      poles: { left: leftPole, right: rightPole },
      exits: { left: leftExit, right: rightExit },
      spirals: { left: leftSpiral, right: rightSpiral },
      zones, slipBoundary, fanRays, fanCurves,
      bounds: { minX: leftExit.x, maxX: rightExit.x, minY: 0, maxY: maxDepth },
      metrics: { wedgeDepth, maxDepth, totalWidth, halfWidth: rightExit.x, r0, rEnd },
      captions: {
        title: 'Prandtl형 전반전단 기구',
        scope: '2D 띠기초의 이상화된 극한 기구입니다. 정사각형 기초의 FHWA 지지력 수치와 구분해 읽습니다.',
        dynamics: '폭 B는 전체 크기를, 마찰각 φ는 쐐기 각도와 로그나선 형상을 바꿉니다. 하중 Q는 이 기구의 형상을 바꾸지 않습니다.',
        assumptions: '균질·등방·무게 없는 Mohr–Coulomb 매질과 관련 흐름법칙의 고전 기구. 실제 3D 파괴면·침하량·파괴 진행의 계산은 아닙니다.',
      },
      sources: [
        { title: 'University of Newcastle — Foundations §5.3, Figs. 5.27–5.28', url: 'https://newcastle.pressbooks.pub/fundamentals-of-foundation-engineering/chapter/5-3-some-fundamentals-of-the-bearing-capacity-of-shallow-foundations/' },
        { title: 'University of Newcastle open textbook, LibreTexts edition §5.3', url: 'https://eng.libretexts.org/Bookshelves/Civil_Engineering/Fundamentals_of_Foundation_Engineering_and_their_Applications_2e/05%3A_BEARING_CAPACITY_OF_SHALLOW_FOUNDATIONS/5.03%3A_Some_fundamentals_of_the_bearing_capacity_of_shallow_foundations' },
        { title: 'Jiang et al. (2022), §2.1 and Fig.1 — Prandtl geometry', url: 'https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2022.839659/full' },
      ],
    };
  }
  return { prandtl };
})();
