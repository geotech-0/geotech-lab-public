"""Independent read-only benchmark: quadrature geometry + fixed-point Bishop.

This does not import, translate or call the JavaScript engine. Areas are integrated
numerically, and Bishop is solved by damped fixed-point updates, independently of
the engine's circle antiderivative and pole-aware bisection.
"""
import json
import math


def integrate(f, a, b, eps=1e-11):
    def step(a, b, fa, fm, fb, whole, tol, depth):
        m = (a + b) / 2
        fl, fr = f((a + m) / 2), f((m + b) / 2)
        left = (m - a) * (fa + 4 * fl + fm) / 6
        right = (b - m) * (fm + 4 * fr + fb) / 6
        delta = left + right - whole
        if depth == 0 or abs(delta) < 15 * tol:
            return left + right + delta / 15
        return step(a, m, fa, fl, fm, left, tol / 2, depth - 1) + step(m, b, fm, fr, fb, right, tol / 2, depth - 1)
    fa, fm, fb = f(a), f((a + b) / 2), f(b)
    return step(a, b, fa, fm, fb, (b - a) * (fa + 4 * fm + fb) / 6, eps, 25)


def benchmark(c=0, ru=0, n=40, phi=28, entry=.6, center=1.5):
    height, beta, gamma = 8, math.radians(30), 19
    crest = height / math.tan(beta)
    exit_x = crest + entry * height
    cy = center * height
    cx = (exit_x ** 2 + height ** 2 - 2 * cy * height) / (2 * exit_x)
    radius = math.hypot(cx, cy)
    base = lambda x: cy - math.sqrt(radius ** 2 - (x - cx) ** 2)
    ground = lambda x: min(x * math.tan(beta), height)
    n1 = math.floor(n * crest / exit_x + .5)
    edges = [crest * i / n1 for i in range(n1 + 1)] + [crest + (exit_x - crest) * i / (n - n1) for i in range(1, n - n1 + 1)]
    rows = []
    for left, right in zip(edges, edges[1:]):
        width = right - left
        mid = (right + left) / 2
        weight = gamma * integrate(lambda x: ground(x) - base(x), left, right)
        if weight <= 0 or ground(mid) <= base(mid):
            raise ValueError('Circle does not enclose positive continuous slices')
        angle = math.atan((mid - cx) / math.sqrt(radius ** 2 - (mid - cx) ** 2))
        rows.append((width, weight, math.sin(angle), math.cos(angle), math.tan(angle)))
    friction = math.tan(math.radians(phi))
    driving = sum(weight * sn for width, weight, sn, cs, tn in rows)
    ordinary = sum(c * width / cs + (1 - ru) * weight * cs * friction for width, weight, sn, cs, tn in rows) / driving
    f = 2.0
    for iterations in range(1, 20001):
        calculated = sum((c * width + (1 - ru) * weight * friction) / (cs + sn * friction / f) for width, weight, sn, cs, tn in rows) / driving
        if abs(calculated - f) < 1e-13:
            break
        f = (f + calculated) / 2
    normals = [(weight * (1 - ru) - c * width * tn / f) / (cs + sn * friction / f) for width, weight, sn, cs, tn in rows]
    vertical_residual = [weight - ((normal + ru * weight / cs) * cs + (c * width / cs + normal * friction) / f * sn) for (width, weight, sn, cs, tn), normal in zip(rows, normals)]
    return {
        'inputs': {'c': c, 'ru': ru, 'n': n, 'phi': phi, 'entry': entry, 'center': center},
        'area': sum(weight for width, weight, sn, cs, tn in rows) / gamma,
        'weight': sum(weight for width, weight, sn, cs, tn in rows),
        'driving': driving,
        'ordinary': ordinary,
        'bishop_raw': f,
        'bishop_min_normal': min(normals),
        'bishop_negative_slices': [i + 1 for i, normal in enumerate(normals) if normal < -1e-10],
        'max_vertical_residual': max(abs(x) for x in vertical_residual),
        'fixed_point_residual': abs(calculated - f),
        'iterations': iterations,
    }


def grid(c=0, ru=0, n=40):
    valid, rejected = [], {}
    for i in range(13):
        for j in range(13):
            try:
                result = benchmark(c, ru, n, entry=.15 + (1.5 - .15) * i / 12, center=1.05 + (2.5 - 1.05) * j / 12)
                if result['bishop_negative_slices']:
                    status = 'tensile-normal'
                elif result['fixed_point_residual'] > 1e-9:
                    status = 'not-converged'
                else:
                    result['entry_index'], result['center_index'] = i, j
                    valid.append(result)
                    continue
            except ValueError:
                status = 'invalid-geometry'
            rejected[status] = rejected.get(status, 0) + 1
    best = min(valid, key=lambda result: result['bishop_raw']) if valid else None
    return {'inputs': {'c': c, 'ru': ru, 'n': n}, 'total': 169, 'valid_count': len(valid), 'rejected': rejected, 'best': best,
            'boundary_minimum': bool(best and (best['entry_index'] in (0, 12) or best['center_index'] in (0, 12)))}


if __name__ == '__main__':
    cases = [benchmark(c, ru) for c in [0, 3, 8] for ru in [0, .2]]
    cases.extend(benchmark(0, ru, n) for ru in [0, .2] for n in [20, 80, 160])
    cases.extend(benchmark(3, 0, n) for n in [20, 80, 160])
    cases.append(benchmark(3, 0, 40, phi=0))
    print(json.dumps({'approved_defaults': {'c': 0, 'ru': 0, 'n': 40}, 'cases': cases, 'grid_cases': [grid(0, 0), grid(0, .2), grid(3, 0)]}, indent=2))
