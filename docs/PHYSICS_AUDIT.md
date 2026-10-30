# Physics audit and implementation record

20 October 2026. This is an engineering evidence record, not a claim of complete naval realism or production acceptance.

## Plan

| File | Change | Risk / verification |
|---|---|---|
| `src/shared/simulation.ts` | Normalize 16/20/24 buoyancy layouts; retain 20 by default; damp relative to vertical water motion; detect grounded recovery from actual solid contacts | Wave response and handling may change; run all physics, rowing, route and hazard regressions |
| `src/shared/world.ts` | Return analytic vertical surface velocity without changing height, horizontal currents, map geometry or hazard clocks | Compare against numerical height derivatives across calm water, rapids and vortex |
| `tests/hydrodynamics.test.ts` | Compare sample counts, payloads, heel recovery, energy decay, sideways grounding and false recovery cases | Use deterministic physical assertions; timing is recorded evidence, not a noisy CI speed gate |
| `docs/PHYSICS_AUDIT.md` | Record decisions, measurements and unfinished acceptance | Do not infer human handling quality or device capacity from simulation tests |

If existing default-boat controls or collision checks regress, diagnose the force/contact change before accepting it. No dependency or engine replacement is needed.

```json
{
  "mode": "implement",
  "objective": "Close measurable buoyancy and grounded-recovery gaps",
  "acceptance_criteria": [
    "Existing default-boat physical and rowing regressions pass",
    "16/20/24 layouts preserve total lift and report stability/cost",
    "Vertical damping follows the same waves rendered by the client",
    "A sideways stuck hull recovers only with sustained input and real contact",
    "Ordinary coasting and open-water rowing do not trigger grounded recovery"
  ],
  "decision": {
    "reason": "The existing sampler returns zero vertical velocity and grounded detection uses center distance rather than contact.",
    "risk": "moderate: authoritative force and recovery behavior",
    "allowed_by_contract": true
  }
}
```

## Audit

- The authority integrates one dynamic 260 kg Rapier hull at 60 Hz with CCD. Four independently bounded blades apply forces; straight-row assistance is an intentional existing control rule.
- The previous 20 samples had fixed spring/drag coefficients. Alternative sample counts require normalization or a comparison changes total lift as well as sampling accuracy.
- Existing anisotropic horizontal drag is dissipative in the horizontal plane even when the boat is tilted. It should not be rewritten merely because vertical drag is handled separately.
- Vertical water motion was absent from damping, despite visible analytic waves.
- A boat rotated sideways can contact a bank while its center is farther from the edge than the old recovery threshold.
- At the foundation audit, the boat remained a sampled gameplay approximation with a rectangular collider, procedural water, simplified paddle area, fixed crew payload and canonical checkpoint recovery. The M2-A update below replaces that collider.

## Verification

Implemented. `npm run check` passed. The full regression run reported `tests 81 / pass 81 / fail 0`; the integrated final run is recorded in `docs/STATUS.md`.

- `tests/hydrodynamics.test.ts` runs6,240 accelerated ticks per configuration (18,720 total). All16/20/24 layouts preserve expected displacement at220/260/360kg, restore10/25/45° heel with final up-vector Y above0.99998, and dissipate free horizontal/yaw motion without reset or wreck. Twenty remains the production default; timing differences at this scale do not justify switching it.
- Analytic vertical surface velocity agrees with finite differences within1e-6 across calm water, current seams, vortex and rapids stations.
- Real Rapier contact regressions reproduce sideways and straight pinned hulls, recover once at the canonical checkpoint and reject idle/contact-free false recoveries.
- `evidence/physics-sweep.json` stores actual local timing, runtime, payload/heel and residual-speed measurements. These accelerated tests do not certify Internet handling, shallow-water dynamics or human quality.

The foundation physics identifier was `basin-0.6`. Canonical checkpoint migration from0.5 is explicit and independently covered by persistence tests; map indices and hazard clocks are preserved.

## Production gates still open

Full staged capsize/rescue interaction, shallow-water bathymetry and grounding friction, tapered collider/visible-hull acceptance, adjustable crew load/center of mass, field tuning with four humans, real Internet handling, and cross-browser/device performance remain separate work. Passing the simulation suite does not close these gates.

## Phase 2 collision batch — basin-0.7

The structural hull now shares22 convex vertices between Rapier and the visible panels. The water shader uses24 outward half-spaces of that same envelope. Corner quads choose their outward diagonal so the anisotropic taper does not leave rendering inside the collider. Thin trim remains cosmetic; independent human fairness review remains open.

The authority retains CCD and the loaded260kg body's original centre and inertia. Buoyancy probes, blade forces, checkpoint/world layout and mover clocks are preserved. Both0.5 and0.6 canonical saves can resume transactionally under0.7 after the usual lease/version/finished checks; private durable saves were not touched in QA.

New tests exercise352 transformed surface samples (maximum error0.000000718m),48,076 water-plane classifications and28 real contact/near-miss cases. A new test reproduced a premature wreck while a visible gap remained: Rapier had started a predicted contact pair. Lethal detection now examines manifolds every tick with a1mm tolerance, including pairs that later make real contact. The separated-to-touching regression passes. Original broad cone coverage is retained with a pose for the new tapered envelope and an incorrect full-width cylinder as a negative control.

The full regression reports `tests90 / pass90 / fail0`, including the existing payload/heel sweep, all checkpoint clock phases, high-speed CCD, shared wreck/sink/retry, bank/blade bracing, moving logs/wheels and persistence/transport cases. See `evidence/hull-collision.json` and `evidence/phase-2-hull.json`. This is a verified collision batch inside M2; bends, staged rescue, shallow-water forces, human/device acceptance and the complete game remain open.

## Phase 2 bends — basin-0.8

Five station-based offsets now move the authored corridor between existing straight checkpoint bays. Static hazards and timed timber are placed in that world frame. Bank colliders are continuous convex prisms sharing the same face/chord with rendered cliffs; the floor spans the full lateral extent. Checkpoint IDs/poses, mover phases and loaded hull properties remain unchanged. Reviewed0.5/0.6/0.7 canonical saves resume through the same transactional safeguards.

The first flow transform stretched velocity and failed the original2m/s limit. The corrected sampler rotates flow into a unit tangent/normal basis, preserving horizontal speed.210 independent baseline samples match the transformed field within2.23e-16. Curve derivatives/checkpoint seams,6,688 visual-bank surface projections,30 real authority bank rays and143 bed rows pass. The sampled corridor uses the full rotated hull extents; it remains necessary geometric evidence rather than proof of human turning/reaction time.

The full suite reports `tests96 / pass96 / fail0`; payload/heel, CCD, capsize/grounding, bank bracing, checkpoint phases, transport/save and hazard regressions pass. Four real rendered clients also receive five authored bend poses and repeat held rowing. See `evidence/river-bends.json`, `bends-browser.json` and `phase-2-bends.json`. Staged rescue, shallow bathymetry, human handling and production acceptance remain open.


## Stillwater recovery — basin-0.9

The shared water sampler adds a smooth compact elliptical curl only in the recovery pocket366–390m. Its horizontal circulation has no radial suction; velocity and its derivative vanish at the rim. The height and vertical velocity fields, immersed drag, buoyancy, loaded hull properties, paddle caps and all lethal contact rules remain unchanged. Every canonical hull/blade spawn lane is outside its support; reviewed0.5/0.6/0.7/0.8 checkpoint saves migrate through the existing transaction and lease/version/finished guards. No private database was used in QA.

The new field grid has11,076 samples with maximum horizontal speed1.562463m/s and numerical divergence below0.000000516. Checkpoint/hazard clearance checks total241. Nine30-second unpowered approaches slow/circulate upright with no wreck/recovery/reset; three automated four-paddle crews rejoin downstream in under60 simulated seconds, using only normal bounded actions. Automated steering is test-only. Full regression reports `tests104 / pass104 / fail0` (79.54s). Current load and built-client evidence are in `evidence/phase-2-rescue.json`; human handling, shallow bathymetry/manual capsize rescue and production device acceptance stay open.

## M2-D3 — bank scenery preserves physical contact

The new rendered profile keeps the exact bankEdge face from y−3 through3m. Upper ledges recede outward; neither terrain nor plants add a gameplay collider. Existing real Rapier face projections/rays and hull/bracing regressions remain, supplemented by all-chunk seam/normal/UV/colour comparisons and independent top-triangle ground rays. The finish scenery extends only as backdrop for the last vegetation tile; the authoritative finish and world/physics versions are unchanged. See `evidence/banks.json` and `phase-2-banks.json`. This is art/collision agreement evidence, not new bathymetry or human handling acceptance.

## Persistent shaft bracing — basin-0.10 / 21 October

The motion-only blade-tip ray could not observe a stationary paddle or a shaft-only contact. A native Rapier capsule now follows the same handle/tip anchors as the visible tapered shaft. Its 2.2cm radius and inset round ends stay inside the actual seven-sided visible 2.5–3cm shaft faces (minimum face radius is the circumradius times cos(π/7)). Actual shaft contact supplements the swept tip query; own hull and sensor volumes are excluded. Reaction is applied at the shaft contact point, scales commanded tip velocity by contact position along the shaft, subtracts moving-solid point velocity, remains horizontal and is capped at260N per seat. Marked hazards still break only on real hull contact.

Independent real-geometry regressions cover48 seat/heading/heel passive cases and32 moving-frame/impact cases. They verify nonlethal bracing, no added vertical thrust, dissipative stationary-paddle response, no free force at rest, release/inactive/sensor behavior, moving-frame equivalence and a4.333Ns per-seat tick impulse ceiling. The first moving test wrongly assumed a horizontal capsule normal; corrected tests compare actual equal-relative-speed frames and bounded response without changing the force implementation. Four existing physics/rowing/hazard groups plus the full125-test suite pass; final native/network/load scope is in `evidence/phase-2-contact.json`.

The hull, mass/inertia, water sampler, four-stroke controller, checkpoints and mover clocks retain their definitions. Reviewed canonical0.5–0.9 saves migrate to0.10 transactionally; active/finished/unknown/incompatible saves remain protected. No private database was modified. Full rounded-blade rigid contacts, shallow bathymetry, worst-case contact/energy coverage and human handling remain open.

Final envelope review uses2.2cm rather than2.5cm contact radius because the visible seven-sided cylinder has an apothem below its circumradius. Eight native High/Low shafts retain handle/tip errors below1e−7;45,696 sampled face comparisons and the analytic minimum clearance0.524mm keep the query capsule inside every face. The final125-test rerun passes after this refinement. The earlier load candidate is preserved separately; final load configuration records the actual shaft radius.

## Rounded blade contact — basin-0.11 / 21 October

The rounded blade now has two conservative convex core prisms following its existing four-sample outline. Splitting the neck from the body preserves the empty concave shoulder; a single convex hull would create false hits there. The bevel rim remains cosmetic. Shared profile sampling produces byte-identical visible positions/normals, with no new assets, rigid bodies or dependencies. The authority composes local paddle rotation with full hull rotation, preserving the flat blade's twist through heel/yaw. Native convex queries detect held blade-edge contacts; translational part casts replace the zero-width centre ray. Conservative shaft bracing remains the first contact choice, and one horizontal reaction per seat retains actual leverage, moving-solid point velocity and the260N cap. Paddle-only contacts do not break the hull.

Independent geometry checks cover42 physical core vertices and exact baseline mesh equality. Native High/Low checks cover288 poses/12,096 vertex transforms with maximum error3.555e-16m; a world-Y-only rotation is an explicit failing negative control. Real Rapier fixtures cover48 blade-only seat/heading/heel passive cases and32 moving-frame/rest/release cases, plus edge-only contact, thin-obstacle sweep, concave-shoulder misses, sensor and own-hull exclusions. Static bracing adds no vertical thrust and dissipates energy against an independent unpowered control. The initial fixture placed a ball inside the flat core; its separating normal did not match the assumed closing direction. The final fixture uses an actual outer edge without relaxing bounds; failed output is preserved.

Final full regression: `tests131 / pass131 / fail0` (89.467s). Reviewed canonical0.5–0.10 saves migrate transactionally into0.11 after the same lease/version/finished checks. World geometry, checkpoints, mass/inertia, water field and mover clocks remain compatible. Native/runtime/load/package scope is in `evidence/phase-2-blade.json`.

These are bounded gameplay contact queries, not articulated rigid-body paddles. Casts hold the current blade orientation over one60Hz translational segment; arbitrary rotational CCD, worst-case simultaneous contacts, shallow bathymetry/manual capsize rescue and human handling remain open. The preceding90-second real-grace result is retained historical evidence; transport/grace code was not changed by this batch.

Final pose refinement:20 zero-length/vertical/near-antiparallel comparisons exposed a different fallback axis and a prototype-backed quaternion copy. Explicit component copying and the same +Y antiparallel convention as Three now pass. Final131-test suite and native288-pose alignment rerun pass; the130-test and failed-edge outputs are retained.

## Shared bathymetry and shallow-water gameplay — basin-0.12

Protocol6 / basin-0.12 / waterworks-1. The flat hidden floor is replaced by25 static bed meshes sharing the exact rendered triangles. Fern Dock has a nonlethal left-bank sandbar from240–280m,with a22–23cm submerged crest and a deep core beginning4m from the left bank. The centre/checkpoint lanes retain deep water. Exact triangle interpolation drives a smooth1–3x near-bed drag multiplier; actual bed contacts supply friction and bounded horizontal paddle slip resistance. The total solid reaction stays capped at260N,with no vertical paddle thrust or idle propulsion. High transmission captures the real bed; Low now tints from the shared bed-depth samples. Shared normals remove bed chunk shading seams. A shallow-water sign warns before entry; the old checkpoint board moves across the pool to leave the approach clear.

Final regression: **137 passed,0 failed** (94.650s,after the board placement and stationary-depth cache). Independent rendering and actual authority rays cover3600 bed triangles,with maximum analytic height error0.000000306m and physics-ray error0.00000768m. Position/normal seams,150 canonical lane samples,2001 drag samples,High/Low water-depth attributes,passive energy/no-lift/rest/release and normal reverse handling pass. One actual grounded edge and three nearby shallow cases clear the entire keel in5.42–19.87 simulated seconds without wreck or recovery teleport. Four actual Chrome clients repeat the escape under normal current/waves; final native/runtime/timing/load scope is in `evidence/phase-2-bathymetry.json`.

Final local workload:4 rooms/16 clients over60.014s,zero recorded violations or dropped simulation steps,clean disposal. Eight180-frame High/Low timing captures observe water-update CPU p95=0.5–0.6ms after caching stationary bed depths. High rapids/rescue CPU,High trees GPU and every strict16.67ms frame-interval target still miss; performance acceptance stays open. Earlier slower timing is preserved without attributing the entire difference to the cache.

Canonical0.5–0.11 saves migrate transactionally after unchanged lease/version/finished checks; water height/current,mover clocks and checkpoint IDs/poses are retained. This is a bounded gameplay approximation,not a shallow-water fluid solver or articulated paddle/Coulomb-load model. Manual capsize rescue,regional map/art production,full-route human pacing and real Internet/device/long-browser acceptance remain open. M2 stays3/5 engineering checks,accepted production scope2/100 and0/14 regions.

## Cooperative capsize righting — basin-0.13

Protocol7 / basin-0.13 / waterworks-1. A sustained inversion now opens a15-second simulation rescue window. A strict majority of active seats (3/4 in a full crew;1 in practice) must hold reverse with no turn command. The same validated row messages,owned seats,sequence checks and heartbeat expiry are reused. Capped2400Nm horizontal righting torque physically rolls/pitches the same hull upright;normal paddle forces stop during rescue. Success requires30 consecutive upright ticks,clears held input and preserves position/checkpoint/revision/reset. Actual lethal contact wins;timeout retains canonical checkpoint rescue. Disconnect pause freezes the window and clears all effort. Checkpoint capture/finish cannot advance during rescue.

A temporary prompt displays helpers/required count,countdown and the saved reverse binding/arrows. A native touch-hold button handles cancellation;other touch paddles hide during rescue. A small yellow surface ring marks the submerged hull's actual horizontal position using shared water height. It disappears on success/reset/wreck. Full swimmer/rope/crew rescue animation is not implemented. Protocol7 rejects stale6 clients;canonical0.5–0.12 saves migrate through unchanged lease/version/finished guards because checkpoint/world poses retain their identities.

Final full regression: **142 passed,0 failed** (111.994s,including the server neutral-rearm guard;before the final duplicate-toast removal).24 real-torque heading/roll/pitch cases,minority/wrong/stale/released input,practice,timeout and lethal priority pass. Actual4-seat local sockets verify majority ownership,forgery rejection,paused rescue time and same-hull reconnect;production heartbeat/stale-sequence and neutral-rearm checks pass. Both capsize entry and successful righting require a neutral packet before another held action can power movement. Final native5-group remapped-key/arrow/native-touch-hold/cancel/reload flow passes.27 route views/3 titles,180 camera cases,71 normal controls,context/reconnect,prior0.12 saved voyage,shallow escape,eddy rejoin and lobby/tracker checks pass with exact per-command scope recorded in `evidence/phase-2-capsize.json`.

A native eddy regression exposed an existing UI ordering bug:the snapshot instruction could be overwritten by a late duplicate "Checkpoint saved" toast. That duplicate is removed;durable save/error state remains,and the original instruction test plus600ms late-ack check pass.

Final protocol7/basin-0.13 local authority workload passes4 rooms/16 clients for60.007s with zero recorded violations and clean room disposal. This is short synthetic local WebSocket QA,not Internet/hosting/device/long-browser acceptance. Details: `evidence/load-phase-2-capsize.json`.

This is explicit bounded gameplay righting assistance,not a simulation of swimmer force,rope loading,trapped air or naval capsize stability. Initial600Nm assist could not overcome the stable inverted hull;that measured failure is preserved. Full human fairness/newcomer study,production rescue art/audio,regional map expansion,Internet/device/long-browser acceptance and the retained rendering budget misses remain open. M2 stays3/5 engineering checks,accepted production scope2/100 and0/14 regions.
