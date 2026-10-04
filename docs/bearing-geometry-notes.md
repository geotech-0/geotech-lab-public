# Bearing mechanism geometry: construction and limits

2026-09-22. Implementation: `outputs/geotech-lab/src/bearing-geometry.mjs`. Tests: `outputs/geotech-lab/tests/bearing-geometry.test.mjs`.

## Purpose and explicit separation

This helper draws an analytically parameterized **Prandtl-type two-dimensional strip-footing general-shear mechanism**. It does not compute bearing capacity, displacement, mobilized plastic strain, stress contours, local/punching failure or a square footing's three-dimensional collapse surface.

The existing numerical bearing calculation uses the complete FHWA square-footing formulation, including soil weight and shape factors. The diagram uses a distinct idealized weightless homogeneous Mohr–Coulomb mechanism. Sharing B and phi makes geometric exploration possible; it does not mean the diagram is the exact failure surface associated with the square numerical result or its Nγ term. Do not label this diagram “the FHWA computed failure surface”.

The complete mechanism is displayed as an ultimate-state theoretical construction even below the numerical ultimate load. Q must not enlarge its fan, narrow its wedge, or move its surface intersections. A Q arrow may change independently, alongside pressure and resistance numbers. B scales the mechanism; phi changes its angles and spiral growth. c and gamma are not inputs to the helper.

## Sources checked

1. **George Kouretzis, University of Newcastle, Fundamentals of Foundation Engineering and their Applications, §5.3, Figs. 5.27–5.28 and Eqs. 5.15–5.19.** [Original open textbook](https://newcastle.pressbooks.pub/fundamentals-of-foundation-engineering/chapter/5-3-some-fundamentals-of-the-bearing-capacity-of-shallow-foundations/) and [LibreTexts edition with university authorship](https://eng.libretexts.org/Bookshelves/Civil_Engineering/Fundamentals_of_Foundation_Engineering_and_their_Applications_2e/05%3A_BEARING_CAPACITY_OF_SHALLOW_FOUNDATIONS/5.03%3A_Some_fundamentals_of_the_bearing_capacity_of_shallow_foundations). The original appeared in indexed search; full text was read via the credited LibreTexts edition. It distinguishes Hill and Prandtl mechanisms, says Prandtl is also compatible with a rough footing, gives the weightless/associated-flow assumptions and states that phi-dependent logarithmic spirals reduce to circles at phi=0. The prose contains a typo stating Nq tends to zero; its Eq.5.18 and Fig.5.29 correctly give Nq=1. This typo is not reproduced.
2. **Jiang et al. (2022), Bearing Capacity Calculation of Soft Foundation of Waste Dumps—A Case of Open-Pit Mine, Frontiers in Earth Science 10:839659, §2.1, Fig.1.** [Primary research article](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2022.839659/full). Its review of the classic geometry explicitly gives the active plane angle 45+phi/2, passive plane angle 45−phi/2, footing-edge spiral poles, and the logarithmic spiral law. This implementation does not use the paper's later proposed waste-dump formulas.
3. **University of Pretoria thesis, literature review §2, p.2-25, Fig.2-13.** [University repository PDF](https://repository.up.ac.za/server/api/core/bitstreams/3f1b3fdb-5d22-40c5-8b27-8b627e39f714/content). The indexed extract explicitly describes the pi/2 fan for Hill and the overlapping central wedges of Prandtl; it distinguishes Terzaghi's different wedge angle. Used as cross-check, not for an implemented Terzaghi solver.

The coordinates below are our mathematical construction from those relationships, not copied coordinates from a published drawing. The named mechanism is **Prandtl-type**, not an exact 3D solution or an experimentally fitted contour. No independent expert review is claimed.

## Geometric construction

Coordinates are metres; ground is y=0, x increases rightward, y is depth downward. Let half-width b=B/2, beta=45+phi/2, alpha=45−phi/2. Angles in the equations below are radians. Right footing edge/pole is P=(b,0). Central apex A=(0,b tan beta). Initial spiral radius r0=b/cos beta.

For fan rotation t from 0 to pi/2:

```
r(t) = r0 exp(t tan phi)
theta(t) = pi - beta - t
x(t) = b + r(t) cos(theta(t))
y(t) =     r(t) sin(theta(t))
```

The first point is A. At t=pi/2, theta=alpha, giving the passive fan endpoint E. The final tangent rises towards the surface at angle alpha: dy/dx=−tan alpha. The surface intersection F is `(E.x+E.y/tan alpha, 0)`. Triangle P–E–F is the passive wedge. The left geometry is the x-reflection of the right. The central zone is the triangle joining both footing edges and A.

At t=beta, dy/dt=0, so the maximum depth is `r0 exp(beta tan phi) cos phi`. This exact point is included in sampling and used for bounds. Inner fan curves use fractions 0.30, 0.55 and 0.78 of r0; rays join the pole to the outer logarithmic spiral. These are mechanism line families, not finite-element stress contours.

The zero-friction limit is a quarter-circle fan, central depth B/2, maximum depth B/sqrt(2), total mechanism width 3B. At phi=30 degrees, the full width is about 9.579B, maximum depth about 1.585B. At phi=42 degrees the mechanism is considerably wider. Do not artificially shorten the spiral to make a compact drawing.

## Rendering contract

`BearingGeometry.prandtl({width:3,phi:30,samples:72})` returns physical point arrays, no SVG. One exported IIFE namespace supports the existing simple concatenation build.

- `zones`: `{id,kind,points,label,title}`, ids `central`, `fan-left`, `fan-right`, `passive-left`, `passive-right`. Labels are polygon centroids. Polygons omit a repeated final vertex; close them in the renderer.
- `slipBoundary`: continuous open line from the left surface exit through both fan arcs and the apex to the right surface exit. It does not include the two interior central-wedge sides; draw zone boundaries or footing-to-apex lines separately.
- `fanRays`, `fanCurves`: objects with `side` and `points`.
- `footing`, `poles`, `exits`: left/right points; `apex`: a point.
- `angles`: degree values `{active,passive,fan}`.
- `bounds`: `{minX,maxX,minY:0,maxY}`. `metrics`: `{wedgeDepth,maxDepth,totalWidth,halfWidth,r0,rEnd}`.
- `captions` and `sources`: short UI-ready descriptions and source links.

Use the same x/y scale if angle labels are displayed. Viewbox fitting should add padding around bounds. A fixed physical axis in A/B comparison preserves width-change intuition; if automatically fitting each state, label the current scale and do not imply equal drawing scales. At high phi, a full mechanism view makes the footing small; an explicit close-up or half-section is preferable to geometric distortion.

Do not translate or deform the footing using elastic settlement in this diagram: its purpose is the collapse mechanism. Keep pressure/settlement diagrams separate as the app already does. Limit information can be placed in the foldout, but “2D 띠기초 기구 · 정사각형 지지력 수치와 구분” must remain visible beside the drawing.

## Verification

Tests independently check the phi=0 known limit; phi=30 wedge angles and analytic radius; each sampled point against the logarithmic law; tangent continuity into the passive wedge; B scaling; phi-induced normalized shape change; reflection and common vertices; underground nonintersecting boundaries across B=1.5–6 m and phi=20–42 degrees; independence from Q; and invalid inputs. This verifies geometric construction, not field failure prediction or square-footing collapse behaviour.
