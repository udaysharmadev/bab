# Graphics and environment audit — 21 October 2026

Status: implemented and locally verified. This is a subsystem report, not production sign-off.

## Contract

Improve lightweight browser rendering while preserving the same water surface, collision layout, crew controls and authored route. The present prototype is the user's 2% production baseline. Measure complete color/reflection/shadow work and inspect actual WebGL output. Do not infer hardware frame rate or AAA asset acceptance from screenshot fixtures.

## Findings

- Tree geometry is instanced, but every tree in a 60 m group receives full needle geometry while the group centre is within 80 m of the boat. Lateral distance is ignored. Existing captures report up to 6,033,248 triangles and 729 draws per complete frame.
- The complete 1,400 m forest and undergrowth is constructed eagerly. Visibility culling saves draw work but keeps every instance buffer and object resident.
- Main, reflection and shadow views repeat high-detail foliage. The renderer already counts nested reflection work correctly, so reducing only the transmission pass would miss the dominant cost.
- Water uses the authoritative sampled surface, planar reflections, bounded color/depth capture, absorption, hull exclusion and foam. It remains analytic water; it does not simulate volume or breaking-wave fluid dynamics.
- Procedural cliffs, trees, boat and crew need art direction and human review. The renderer has no production scanned/skinned asset pipeline. Hardware/browser acceptance remains open.

## Plan — bounded vegetation residency and distance detail

| # | File | What changes | Risk |
|---|---|---|---|
| 1 | `src/client/nature.ts` | Reusable medium/far foliage and low-cost distant trunk geometry | Thin silhouettes or conspicuous detail transitions |
| 2 | `src/client/scene.ts` | Deterministic lazy construction/disposal of vegetation near the crew, spatial distance LOD, bounded undergrowth and shadow detail | Missing scenery on reset/backtracking; resource leaks; popping |
| 3 | `tests/presentation.test.ts`, graphics fixtures | Asset bounds and detail checks, route/backtrack residency checks, measured render budgets | Tests must exercise GPU resources and preserve visual readability |
| 4 | `docs/GRAPHICS_AUDIT.md` | Record measured results, unresolved acceptance and next milestone | Avoid treating local automation as production proof |

Decision: reuse installed Three.js instancing and deterministic local geometry; no additional dependency or external asset fetch. Stream vegetation instances, retain shared source geometry/materials, and dispose only departing instance buffers. Maintain static hazard/bank art and physics unchanged. Reproduce original transforms on every revisit with a chunk-local seed. If the visual fixture reveals sparse distant silhouettes, adjust complete-leaf retention/scale; never relax collision or test correctness to obtain a smaller number.

## Observed verification

- `npm run test:graphics`:21 authored route/boat views,3 title sizes, synthesized offline audio and actual WebGL shader/console checks passed with `errors: []`.
- Complete-frame maxima: **723 draws /2,253,676 triangles**, including reflection/shadow/transmission, compared with the previous recorded729 /6,033,248. Peak triangle count is approximately63% lower; this is not a63% frame-rate claim. Low shore uses591,782 triangles versus1,993,252 High.
- A first30m-species batching attempt reached815 draws and failed the unchanged800-draw gate. Final60m-species batches preserve the draw budget. Regression gates now cap760 draws and2.6million triangles so the improvement cannot silently disappear.
- Actual repeated visits to310/870/1390/0m across three cycles retain at most6 vegetation groups. Every0m revisit rebuilds exactly the same instance matrices/colors; GPU counts return to174 geometries /11 textures each time. This is a bounded local fixture, not a90-minute leak guarantee.
- High/Low shore, trees, boat and title captures were visually inspected. Existing analytic water normals/shading were read and no unconfirmed channel-mapping edit was made.

Evidence: `evidence/graphics.json`, `render-*.png` and `title-*.png`. Existing water optics and92-case camera fixtures are rerun separately for integration. Remaining: named-device frame pacing, production art/animation, transition popping review with humans, full asset/audio streaming and long browser memory/endurance studies.

## Phase1 — live wave-update measurement and optimization

The initial fixed-pose timing fixture stopped advancing geometry after warmup. It is retained as historical static evidence, not a live-water before/after result. The final performance fixture delivers advancing20Hz snapshots and records actual wave/effect updates, frame intervals, render/water CPU, bounded/disjoint-safe asynchronous GPU queries and heap/DOM metadata.

The valid pre-grid comparison and final six90-frame1080p captures are `performance-before-grid-optimization.json` and `performance.json`. On this Apple M4/Chrome/Metal host, water-update CPU p95 is now0.5–0.8ms versus3.1–5.8ms. The mesh uses6,369 vertices and direct height-grid normals, with warp compensation, instead of15,729 vertices and full triangle-normal recomputation. Vertex heights retain shared physical truth; sampled interpolation error is0.0149171m maximum. Normal unit/direction tests and full optics/dry-deck GPU regressions pass.210 full-field outputs are exactly preserved.

Final route captures: max723 calls /2,235,244 triangles, `errors: []`. Overall CPU/GPU headroom is still inadequate in several captured cases; `targetComparison` records misses. These local headless figures do not certify a consumer device matrix, thermal endurance or universal60FPS. See `evidence/phase-1.json` for the phase exit and next slice work.

## Phase 2 structural hull batch

The hull panels now use the same convex envelope as Rapier. The water shader excludes that volume using its24 outward planes, including when rolled/pitched.352 transformed panel samples agree with Rapier within0.000000718m and48,076 volume classifications agree. High/Low dry-deck captures retain zero interior difference across seven wave phases; exterior water remains visible. Route graphics/three title sizes and transmission/depth fixtures pass without shader/browser errors. The crew view was visually inspected after the hull update.

The latest six moving-clock1080p profiles in `performance.json` apply to this hull shader; the original M1 capture is preserved in `performance-phase-1.json`. CPU/GPU misses remain visible. These checks close structural consistency, not production boat/crew/water art, consumer-device or human readability acceptance. M2 presentation work remains open.

## Phase 2 authored bends

Water/bed and bank foam follow the continuous bank corridor; cliff/ledge vertices use the collider faces. Plants, signs, timber props and chase-camera targets follow the same river offsets. Normals account for both width and centre shifts. The new portrait gantry case initially clipped the crew; continuous aspect-based lateral aiming fixes it while retaining all frame limits.132 forward/reverse/portrait/edge camera poses pass without blocked rays.

Current route graphics pass21 views/3 title sizes with no shader/browser errors: maximum723 calls /2,252,580 triangles. Three route revisit cycles return to174 geometries/11 textures. High/Low water optics and seven-phase dry-deck checks pass. Four real rendered clients at five authority-authored bend poses agree with the route and frame the boat; the Whitewater capture was visually inspected.

Six updated moving-clock1080p profiles preserve timing target misses, including GPU limits; no consumer-device/FPS acceptance is inferred. Cliff silhouettes/material transitions, near-field art, hero water, crew polish and human readability remain M2 presentation work. The previous collision-only timings are in `performance-phase-2-hull.json`; current evidence is in `phase-2-bends.json`.


## M2-C1 — dock rehearsal framing

The waiting card originally obscured the boat on landscape screens. The dock now uses a side card and a projection offset; portrait framing places the boat above the card. An envelope including hull/crew/paddle reach is verified against the actual DOM panel at480×900,390×700,907×510,640×400 and1440×960. The offset clears at launch. Own-paddle animation is local, does not mutate shared blades or run physics, and creates no shared rowing effects. Native context recovery is exercised at the dock and in High/Low play. These are layout/lifecycle checks, not a new performance or production-art acceptance. See `evidence/onboarding.json`.


## M2-C2 — visible recovery current and crew readability

The Stillwater pocket adds48 instanced foam streaks advected by the same shared field as the authority, two green warning/rejoin boards and green paint on the safe bank. Foam freezes during an actual crew-disconnect pause and resumes after reconnect. The first approach screenshot exposed the existing checkpoint board covering the crew; moving it across the pool clears the recovery bank.48 extra near-bank/reverse cases bring the camera fixture to180 without relaxing its frame/ray limits.

Final23 route views/three title sizes pass without shader/browser errors: max727 calls /2,252,580 triangles. Three backtracking cycles plateau at175 geometries/11 textures. High/Low optics and dry-deck checks pass. Eight advancing-clock1080p profiles now include recovery: High rescue CPU p95=5.7ms, GPU p95=9.565ms; Low CPU p95=3.9ms, GPU p95=8.017ms. Other CPU/GPU/frame targets still miss. These are local measurements, not consumer-device, human-readability or production-art acceptance. Boat/crew/audio, cliff silhouettes/materials and hero water remain M2-D work.


## M2-D1 — animated dock and named avatar presentation

The old frozen visual lobby is replaced by a lobby presentation clock: waves/foam, crew idle posing and gentle wave-relative heave/heel animate while authoritative gameplay stays anchored. Reduced-motion preferences damp the hull motion. The water exclusion uses the actual displayed hull transform, retaining a dry deck. The closer dock framing, compact invite panel and projected labels/ticks are verified at1440×960,907×510,640×400,480×900 and390×700. Names use bounded text nodes, with responsive ellipsis/full accessible text and title. A short-screen bow/stern overlap was corrected without weakening overlap assertions. Labels are released with the lobby and hidden during graphics loss.

This is the first M2-D presentation batch. Existing full route, camera, High/Low graphics recovery and dry-hull regressions are rerun; the earlier CPU/GPU timing misses remain open. Full near-field boat/crew/hero water, cliff/material and audio acceptance is not inferred from the lobby work. See `evidence/phase-2-lobby.json`.

## M2-D2 — water and paddle audio

Procedural stereo dock/river, current-relative hull wash, smooth rapids and four spatial brace layers now supply near-field feedback. Native Web Audio reuses one stereo buffer across seven fixed loops; one-shots are bounded and disconnected. The actual PCM stress fixture exposed compressor overshoot above full scale; a soft guard now leaves normal signals linear and bounds the stress peak below1. Seven audio groups include native built-game output/persistence/menu/visibility/peer reconnect checks. This batch changes no geometry, shaders, camera or physics, so prior graphics/performance records retain their original execution scope. Human listening, regional recordings, material/contact palette and complete presentation/device acceptance remain open.

## M2-D3 — continuous rock profiles and grounded scenery

Independent five-metre cliff boxes and separate ledge strips are replaced by a shared world-space cross-section sampled every1.25m. The exact contact face remains at bankEdge from y−3..3m; upper ledges recede outward. Shared positions/UVs/colours/normals eliminate the old chunk steps. Wet/sediment/moss colouring and a262144-byte periodic rock colour/bump texture (before mipmaps) replace the stretched crossed-sine surface. This is a procedural geology foundation; premium authored rock assets and regional art review remain open.

The actual terrain triangles now ground trees/grass, including curved-bank offsets. New rendered ray checks caught floating scenery after the old1425m backdrop; extending only scenic banks to1460m supports the final1440m vegetation tile. Race finish and authoritative banks remain unchanged. Recovery paint vertices now follow the actual bank chord with a2cm offset. Independent cap-normal checks caught reversed caps; texture tests caught byte overflow during contrast tuning. Both were fixed before final verification.

52,074 seam/attribute comparisons have zero gap.3,696 independent top rays have maximum error0.000006222m.25 authored High/Low route/close-up views and three title sizes pass, with2,934 rendered vegetation samples (max0.000009602m) and attached-paint error below0.000000458m. Maximum712 calls /2,249,940 triangles, versus prior727 /2,252,580. Three revisits return to175 geometries/11 textures. These are bounded fixture observations, not90-minute/device/AAA acceptance.180 camera cases, High/Low native context restoration, optics and dry-deck checks also pass. Fresh timing targets and exact final scope are recorded in `evidence/phase-2-banks.json`; complete M2-D and human/device gates remain open.

After the regression workers finished, eight180-frame1080p captures observed High CPU p95=4.3/3.5/5.5/5.7ms and Low=2.5/2.2/4.0/4.1ms (crew/trees/rapids/rescue). High trees GPU p95=11.676ms misses10.5ms; other GPU cases meet. High crew/rapids/rescue and Low rescue miss the4ms CPU target; every strict16.67ms frame-interval target misses. A noisier initial90-frame capture overlapping local deployment smoke is also retained. These captures do not establish causation, named-device performance or universal60FPS.

## M2-D4 — single-pass optical depth and current-relative wake

Native WebGL2 depth capture removes the second packed-depth riverbed pass/target/material without changing capture resolution or reflection quality. Instrumentation verifies exactly one High render and zero Low renders. Controlled optical channels match the prior baseline exactly, retaining actual floor transmission, depth absorption, foreground rejection, resize/quality release and exception-state restoration. Final High/Low native context recovery and dry-deck checks pass.

Horizontal water-relative boat motion now controls wake heading/strength: reverse/sideways trails follow travel, while a passive current drift has no powered wake. Advected crest froth removes the orthogonal checker pattern. Scalar cosmetic heights retain the exact shared surface; offscreen whirlpool advection/uploads are skipped and resume finitely on re-entry. Seven actual-scene groups verify those contracts without mutating snapshots. This remains a procedural wake rather than a full fluid solver or persistent wave-history system.

Final25 route/close-up views/three titles,180 cameras,111 regressions and normal multiplayer flow pass. Maximum712 calls /2,249,364 triangles; three returns retain175 geometries/11 textures. Fresh180-frame1080p High CPU p95=4.2/3.0/5.5/5.1ms; Low=2.1/1.7/3.1/2.9ms. All sampled GPU cases meet10.5ms; High trees is10.435ms, close to the budget. High crew/rapids/rescue CPU and all strict frame intervals still miss. Nested camera CPU reaches0.9–1.1ms at rapids/rescue and High reflection callbacks0.8–1.7ms; these wall-time percentile observations are not additive. Prior capture is retained in `performance-phase-2-banks.json`; host variability prevents a causal/device claim. Full M2-D, human water-truth/art and named-device/frame acceptance remain open.

## M2-D5 — exact static camera bounds

Merged static occluders lacked local boxes, so Three.js often entered full triangle traversal after only a loose sphere test. Boxes are now computed once after final transforms/merges, including the shared shore-rock geometry. Existing triangle intersections, every-frame clearance, rendering and geometry remain unchanged. The native fixture verifies enclosure of all214,909 unique geometry vertices per viewport and exact bounded/unbounded hit identity/distance/position/face parity across chase and independent lateral wall rays. Its initial clear-ray-only fixture correctly failed positive-hit coverage; lateral rays add actual bank intersections without relaxing the assertion.

Final180 camera and25 route views/three titles retain the same framing/occlusion and rendering limits.111 regressions pass. Route max712 calls /2,249,364 triangles and three returns175 geometries/11 textures are unchanged. Isolated eight180-frame1080p captures observe camera p95=0.8/0.8ms at rapids and0.5/0.6ms at rescue (High/Low), compared with prior0.9/1.0ms and1.0/1.1ms. Overall High CPU=4.1/2.5/5.3/5.0ms and Low=1.9/1.7/3.1/2.6ms for crew/trees/rapids/rescue. High crew/rapids/rescue CPU, High crew/trees GPU and all strict frame intervals miss. GPU workload is unchanged; host variation remains visible rather than discarding unfavourable samples. Deterministic ray-work reduction and historical frame observations have different scopes. Full M2-D, human camera/art review and named-device acceptance stay open; see `evidence/phase-2-camera.json`.


## M2-D6 — boat finish and shaped paddle detail

- Hull grain follows each structural panel and its actual diagonal, with consistent adjacent coordinates. Gunwale grain follows its arc; existing256px texture supplies restrained bump/finish. Four rounded bevelled paddles share one148-triangle geometry within their original attachment envelope. A960-triangle three-turn rope coil rests on the bow floor. No structural vertex, physics, save, protocol or crew-strength change.
- The new blade bevel initially exceeded its envelope by68 micrometres; the tip was moved inward without loosening the assertion. Native close-up inspection then caught the neck pointing away from the handle. Its local orientation was corrected and neck-versus-bowl ray checks added. Final images were re-inspected and all affected native checks rerun.
- Full regression: **tests114 / pass114 / fail0**,87.71s. Strict production build passes with the existing bundle advisory.25 route views/three titles,180 camera cases, fourteen High/Low dry-deck phases, seven native input/context-recovery groups, eight normal four-browser game groups and eight-check local in-memory smoke pass. Maximum712 calls /2,250,668 triangles (+1,304); three returns retain172 geometries/11 textures versus175/11. No added texture or dependency.
- Eight isolated180-frame1080p captures observe High CPU p95=4.1/4.0/4.5/4.9ms and Low=3.4/3.3/4.2/3.9ms for crew/trees/rapids/rescue. High GPU=13.605/13.766/13.775/12.994ms; Low trees GPU=12.188ms. All High GPU, Low trees GPU, High crew/rapids/rescue CPU, Low rapids CPU and every strict16.67ms interval miss. These less favourable observations are retained; historical runs do not isolate material cost from host variation. No performance/device acceptance is granted.
- **M2-D6 scoped boat-detail engineering verified; full M2-D stays PENDING.** Existing crew assets, complete premium boat/world art, performance optimization and human/device/full-route gates remain open. M2 remains3/5 and production scope2/100,0/14 regions. Exact scope/logs/package: `evidence/phase-2-boat.json`. No public deployment or private-save modification.

## Readable danger — 21 October continuation

Five existing hazard families now use clearer danger silhouettes and red/ivory markings. Three deterministic crowned-rock variants stay within the existing spherical collider; pointed pilings retain their cylindrical envelope. Native High/Low captures cover eight views and 24 mover-phase comparisons. Full route and camera regressions pass; performance measurements are observations, not production acceptance. See `evidence/danger-update.json` and its referenced logs.

## M2-D7 — evaluated foliage alternatives, retained production shading

Two native alternatives were tested: vertex-lit Lambert and zero-specular fragment-lit Phong. Both retain geometry/instance colours, two-sided faces, fog and shadows; eight controlled High/Low poses bound colour differences. Actual frame captures showed High-mode regressions, so neither material change ships. The production Standard materials remain. The native experiment is reproducible with `node tests/foliage.mjs`; optional timing modes use `PERF_FOLIAGE_EXPERIMENT=lambert` or `phong` with `tests/performance.mjs`. The normal performance command measures production Standard.

The fixture freezes pose/time and clears transient strokes before comparison. Frame timing separately advances snapshots/waves/effects and now gives each selected material 60 display frames of warmup. First noisy captures and corrected warmup captures are retained. Exact final timing and remaining budget misses are in `evidence/phase-2-foliage.json`; no performance improvement, human art approval or consumer-device FPS guarantee is claimed.
