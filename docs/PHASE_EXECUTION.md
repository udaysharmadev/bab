# Phased delivery — active implementation record

## Phase 1 — measurable, reliable foundation

Status: **ENGINEERING VERIFIED**. The full regression run reports85 passed /0 failed. Final measured evidence is in `evidence/phase-1.json`. Production acceptance remains open until its human/device evidence exists. Phase2 is the next active engineering focus.

| Step | Files | Deliverable and check | Risk / response |
|---|---|---|---|
| 1 | `tests/load.ts`, `package.json` | Reproducible several-room real-time exercise; validate room isolation, reset/reconnect, finite physics, fresh snapshots, disposal, bandwidth/heap/event-loop measurements | Keep the database in memory and use an isolated port; record actual duration and concurrency; never extrapolate Internet/hosting capacity |
| 2 | `tests/graphics.html`, `tests/performance.mjs` | Reuse the actual scene fixture for repeatable High/Low captures with frame interval, CPU render duration, optional asynchronous GPU timer, memory and renderer/device metadata | Bound outstanding queries; reject disjoint GPU samples; unsupported timers are unavailable, not zero; run GPU suites serially |
| 3 | `docs/PRODUCTION_TRACKER.json`, `scripts/tracker.mjs`, tracker tests | Visible five-phase execution board with implementation status separate from production acceptance; strict prerequisites/evidence and existing139-item ledger retained | Reject jumping phases or claiming production acceptance from local automation |
| 4 | `docs/STATUS.md`, subsystem audits, README/evidence | Record commands/results, budgets missed and next phase; update tracker | No universal frame-rate, leak-free, human or full-game completion claim |
| 5 | `src/shared/world.ts`, `src/client/water.ts`, hydrodynamic/presentation tests | Initial frozen-pose timing was corrected to advancing20Hz snapshots, exposing wave-update spikes. Use scalar height sampling, cached per-row rapid strength, a bounded32×192 grid and direct warped-grid normals | Compare210 captured full-field results bit-for-bit; bound between-vertex surface error below4cm, verify normal directions and actual GPU optics; rerun moving-clock profiles. Preserve force/version semantics. |

Decision: use the installed Colyseus/Rapier/Three/Playwright and Node/browser timing APIs. No dependencies or gameplay-force changes. Existing81-test/four-browser foundation evidence is retained; new tests close the missing measurement paths. If a benchmark fails, preserve its failing record and fix the concrete issue before rerunning. Frame-time targets are reported even when missed.

## Phase1 observed exit evidence

- Full regression: **85 passed /0 failed**; strict check and production build pass. Four-client built-game flow and seven input/High/Low context-recovery groups pass. Route graphics, water optics and both-quality dry-hull regressions pass without browser errors.
- **120.152 seconds /4 rooms /16 real WebSocket clients**:32 shared resets,4 isolated reconnects (one per room), stable body/collider counts, no invariant violations and all rooms disposed. Outbound application payload averages about19KB/client/second. Clients and authority share this local host; this is not a maximum-capacity or Internet result.
- Six1080p/90-frame High/Low profiles on the local Apple M4/Chrome/Metal host now advance20Hz snapshots, movers, waves and effects. GPU queries are bounded and disjoint/unsupported results remain explicit. Measurement success does not mean the hardware budgets passed.
- Water updates:15,729→6,369 vertices, shared height-only sampling and direct warped-grid normals. Across these six local cases, water-update CPU p95 changed from3.1–5.8ms to0.5–0.8ms. Sampled between-vertex height error is at most0.0149171m, vertex samples match the physical field, and normal direction/unit-length tests pass.210 captured full-field outputs remain exactly equal, so physics version stays0.6.
- The first timing fixture held a frozen snapshot and was unsuitable for live-wave profiling. That record is labelled historical in `performance-before-height-sampling.json`; the valid moving-clock pre-grid comparison is `performance-before-grid-optimization.json`. The updated fixture asserts that water geometry actually advances.
- The smaller grid exposed aliasing in the old every-seventh-vertex whirlpool test. The test now checks every vertex, retains its existing core-coverage requirement and passes. No threshold was relaxed.
- **Remaining budget gaps:** High crew/rapids render CPU p95 remains above4ms, and several GPU captures exceed10.5ms. RAF timestamps quantize to about16.7–16.8ms. These remain visible in the report and do not certify universal60FPS or a consumer-device matrix.

## Phase2 — active premium slice

The first batch implements hull/collision agreement; bends/rescue and near-field presentation follow. The tapered structural panels, water exclusion planes and convex Rapier collider now share one shape contract. Thin gunwale trim remains cosmetic. The map pass must transform bank/collider, water/current, hazards, checkpoint and camera coordinates together; a cosmetic river bend is insufficient. Human traversal and the twelve-newcomer study remain the production acceptance gate. No bend/rescue/presentation completion is claimed by the collision batch.

### M2-A implementation plan

| Step | Files | Change | Risk / verification |
|---|---|---|---|
| 1 | `src/shared/hull.ts`, client hull/scene/water | Share the structural outline and lower/upper rings between panels, water exclusion and collider vertices | Check finite closed geometry and transformed shape agreement; thin trim remains cosmetic |
| 2 | `src/shared/simulation.ts`, protocol | Use Rapier's convex hull with CCD; retain the loaded boat's mass/centre/inertia and existing buoyancy/rowing model; bump physics to0.7 | Real tip/shoulder/side impacts, tapered-corner near misses, all checkpoint phases and handling regressions |
| 3 | voyage store/save tests, deployment smoke/setup | Permit reviewed0.5/0.6 canonical checkpoints to resume under0.7; preserve world/checkpoint order and transactional lease checks | Test both versions, active/finished/stale/incompatible rejection and exact saved progress preservation |
| 4 | tests/evidence/tracker/status | Verify the batch with strict check, full regressions and real built browser/optics fixtures | Record only observed checks; keep M2 open for bends, rescue, presentation and human/device acceptance |

Decision: the rendered boat's structural panels provide the authored collision envelope. Use the installed convex-hull solver, one collider and the existing event path rather than a custom contact system. The existing260kg loaded-body mass properties describe the boat plus crew, so they remain explicit instead of being recalculated from the solid envelope. If handling or safe-checkpoint regressions fail, investigate the collision/mass change before altering their thresholds. This batch does not rewrite the buoyancy model or route.

### M2-A observed implementation and corrections

- `basin-0.7` uses the tapered structural hull with CCD, preserving260kg mass, centre and loaded-body inertia. Panels and the water mask use the same outward convex surfaces; anisotropically tapered corner quads choose the outward diagonal.
- New authority tests pass352 transformed panel/surface comparisons (maximum error0.000000718m),48,076 water-mask volume classifications and28 rotated real-contact/near-miss cases. A separated pair that later closes is tested explicitly.
- The first broad run exposed an old cone fixture sitting in the discarded rectangular corner. Its replacement proves that the high boat intersects an incorrectly full-width cylinder, clears the actual cone and hits the same cone at normal draft. The fixture's first replacement also touched a neighbouring spike; the final isolated pose preserves the original named-hazard assertion.
- A new separated-side regression reproduced premature wrecks from Rapier's predicted contact events. The authority now inspects live contact manifolds every tick and requires a gap≤1mm. This avoids premature wrecks and catches later real contact from an already-existing pair. The failing capture is retained with final command output.
- Both0.5 and0.6 canonical checkpoint saves migrate transactionally to0.7. The world/checkpoint array is unchanged; active, finished, stale, unknown-version and unknown-world records remain protected. No private database was migrated during QA.
- Final full authority/regression suite: **90 passed /0 failed**,75.36s. Existing checkpoint clock phases, CCD, banks/bracing, wheel/log encounters and buoyancy/heel/grounding regressions pass. Fresh built browser flow8 groups, input/context recovery7 groups,21 route views/3 titles, optics/dry-hull fixtures, six advancing-clock timing cases and local deployment smoke pass. Actual target misses remain open in `evidence/phase-2-hull.json`.


Latest current-physics load check: **120.128s,4 rooms/16 clients,32 shared resets and one reconnect per room**; no invariant violations and all rooms disposed. Event-loop delay p95=11.780ms. This remains a local synthetic workload, not Internet or maximum hosting capacity.

### M2-B implementation plan — bends, route staging and camera

| Step | Files | Change | Risk / verification |
|---|---|---|---|
| 1 | shared river/world, simulation | Five smooth bends between existing checkpoint bays; world-space hazards/movers, flow following the tangent, shared continuous bank faces and a floor covering the full route | Preserve all checkpoint identities/poses and clocks; verify bend seams, true bank contact, passability and bounded forces |
| 2 | scene, riverbed, water, camera | Position cliff faces, plants, props, water/depth/foam and camera around the same river coordinates | No cosmetic-only bends or double transforms; compare mesh/authority heights and banks, reverse/portrait/edge camera cases, revisits and GPU fixtures |
| 3 | protocol, voyage store/save tests, smoke/setup | Bump physics to0.8 and review0.5/0.6/0.7 canonical saves against unchanged checkpoint bays | No live/private database migration; retain transactional lease/finished/version protections; test every checkpoint at mover phases |
| 4 | route/bend tests, browser fixtures, evidence/tracker | Replace straight-coordinate test setup with authored lateral positions; add independent geometric/contact assertions and real browser bent-route captures | Preserve assertion limits; retain failures and fix underlying alignment issues; report engineering separately from human/device production acceptance |

Decision: retain longitudinal station `z` and store bend offsets in a shared curve. Offset authored lateral positions into world space and transform current velocity with its derivative. Use matching convex bank prisms and visible linear faces at five-metre seams. Keep the launch and every existing checkpoint bay straight, so canonical save identities and poses remain meaningful. No spline dependency, auto-steering, hidden boat constraint or checkpoint renumbering is introduced. Human traversal/fairness and premium art/rescue remain open.

### M2-B observed implementation and corrections

- Five bends are implemented between176–742m, with offsets of+6/+8/−8/+8/−9m. The launch, every checkpoint bay, finish and all mover schedules retain their identities/poses. Current physics is `basin-0.8`; reviewed0.5/0.6/0.7 canonical saves can resume transactionally.
- Initial flow shearing exceeded the existing2m/s bound. Flow now rotates in the unit tangent/normal frame instead of stretching velocity; the original limit passes.210 prior recorded fields agree with the translated/rotated result within2.23e-16, including unchanged horizontal speed.
- The authority uses continuous convex bank prisms; visible cliff faces, ledge strips, bed, water and foam match their corridor.6,688 visible bank samples agree with Rapier within0.0000818m;30 authority bank rays agree within0.0000112m. Bed-row and analytic curve/seam checks pass. The floor covers the entire bent footprint.
- Hazard/mover positions, props, vegetation and camera framing use world coordinates from the same curve. Passability now uses the full0.96×2.25m hull half-extents rotated at the local heading. All original checkpoint/mover-phase, real lethal-contact, bracing and handling checks pass.
- The first expanded camera run exposed a portrait failure at456m beside the gantry. Lateral look-ahead bias now decreases continuously on narrower screens; the existing frame limits remain. All132 camera poses pass, with no blocked sight lines.
- `npm run test:bends` passes with four real rendered clients at five authority-authored bend poses and subsequent repeated held rowing. The fixture is controlled only by parent IPC; no test/teleport endpoint or client command is shipped. It is not a continuous human traversal.
- Full regression output: `tests96 / pass96 / fail0`,77.02s. Strict production build,21 route views/3 title sizes, optics/dry-deck checks,8 built-game flow groups,7 input/native-context recovery groups and local deployment smoke pass. Three backtracking cycles return to174 geometries/11 textures. The six new timing captures retain GPU/High-rapids CPU target misses; production device acceptance remains open.

Current0.8 load: 120.063s,4 rooms/16 clients,32 resets and one reconnect per room; stable resources, no invariant violations and all rooms disposed. Current exit evidence is recorded in `evidence/phase-2-bends.json`; earlier collision-only build/load/timing records are preserved with the `-phase-2-hull` suffix. M2 remains active for recovery/onboarding, near-field art/audio and genuine human/device acceptance.

## M2-C1 plan — waiting-dock paddle rehearsal

This is the onboarding part of M2-C. The staged rescue encounter remains pending. The frozen authoritative dock, four-ready launch barrier, quiet playing HUD and lethal marked contacts remain the governing contracts.

| Step | Files | Change and verification |
|---|---|---|
| 1 | client rehearsal/input/main/scene | Reuse the real stroke cycle for a bounded, local-only animation of the assigned paddle while waiting. Do not send lobby row messages, advance authority time or mutate snapshots. Verify all four seats, reverse/turn, release and scheduling gaps. |
| 2 | lobby HTML/CSS | Explain ownership and that this rehearsal holds the boat still; enable existing touch/controller/remapped keys at the dock. Check portrait and short touch layouts. No title practice button or persistent playing tutorial. |
| 3 | browser regression/evidence/tracker | Prove own-paddle visual movement with unchanged server pose/tick/acks/strokes, keyboard/touch/controller release, countdown cancellation and fresh launch input. Run strict build, full regression and existing live browser/accessibility checks. Record the partial M2-C result without claiming human onboarding acceptance. |

Decision: use a local visual rehearsal instead of changing the server's frozen-lobby contract. It teaches hold/release, forward/reverse and which paddle belongs to the player; it does not simulate boat response or certify skill comprehension. Menus, blur, visibility loss, graphics loss, reconnect and countdown clear the rehearsal. Keyboard auto-repeat cannot restart an input cleared across these transitions; a controller must return to neutral.

### M2-C1 observed evidence

- Waiting players can rehearse only their assigned paddle using the shared stroke cycle and existing remapped keyboard, touch and standard controller input. The preview is local animation, with no lobby row traffic or changes to authoritative tick, hull, blades, acknowledgement or stroke counters. It does not teach actual boat response.
- Menu, blur, native graphics loss/restoration, countdown cancellation/restart and launch release are verified in the built client. Held keyboard repeats cannot reactivate a cleared input; a controller must return to neutral. Fresh play input produces a real authoritative stroke after launch.
- The first visual inspection found the lobby card covering the boat. Dock-only portrait/landscape projection framing now keeps the full boat/paddle envelope clear at480×900,390×700,907×510,640×400 and1440×960. The normal playing projection resumes at launch. Guidance has explicit binding/ownership elements so remapping cannot overwrite the wrong text.
- Full regression output: `tests99 / pass99 / fail0`,76.93s. Strict production build passes; known large-bundle advisory remains. Final built onboarding, four-browser flow, remapping/controller/native context recovery, native touch and camera results are recorded in `evidence/phase-2-onboarding.json` and its command log.
- M2-C stays **PENDING** because the staged rescue encounter remains unbuilt. G02 is **IN_TEST**, with real newcomer/physical-device acceptance open. M2 remains2/5 verified checks; accepted scope stays at the owner's2-point baseline. M2-B timing/load evidence is retained without making new FPS/host-capacity claims.

## M2-C2 plan — Stillwater recovery eddy

| Step | Files | Change / evidence | Risk / response |
|---|---|---|---|
| 1 | shared rescue/world, physics version and voyage migration | A compact smooth elliptical current in the existing hazard-free Stillwater bay, after Whitewater. Preserve every checkpoint pose/identity, height field and marked lethal contact. Independently test field continuity/bounds and real passive/rowed hull traces. | Reject a trapping or energy-amplifying field; tune the authored eddy rather than add steering, teleports or change force caps. Keep canonical spawn lane outside its support. |
| 2 | scene/main and graphics/browser fixtures | Green shore markers, upstream warning and foam advected by the same sampled current; one brief recovery cue. Actual four-seat authoritative entry/rejoin and reset/reconnect checks. | No new permanent playing overlay, test endpoint or solid inside the safe lane. Bound visual resources and verify both quality levels/camera. |
| 3 | regression/save/deployment/evidence/tracker | Physics0.9 with reviewed0.5–0.8 canonical checkpoint migration; full regressions, built browser/input/optics/route checks and package provenance. | In-memory QA only; active/finished/incompatible saves retain their existing protections. Human fairness/comprehension and performance/device gates stay open. |

Decision: reuse the existing wide bay and immersed water-relative drag. A bounded, nonlethal recirculation pocket gives crews room to brake, regroup and row back toward the main stream; it is an authored rescue opportunity rather than automatic immunity after a lethal collision. There is no hull constraint, synthetic propulsion, route renumbering, new dependency or protocol message. M2-C can be engineering-verified only after the local dock rehearsal and this actual recovery/rejoin flow both have observed evidence.

### M2-C2 observed evidence

- The shared compact curl field and ordinary immersed drag produce a nonlethal recovery pocket366–390m.11,076 field samples,241 checkpoint/hazard clearance checks, nine passive30-second approaches and three ordinary four-paddle simulation exits pass. Maximum sampled current is1.562463m/s; no recovery teleport, steering constraint or lethal-contact exception is added. Physics is0.9; reviewed0.5–0.8 canonical saves migrate safely.
- Full regression: `tests104 / pass104 / fail0`,79.54s. Four real rendered clients coast into the pocket, row out using held keys, pause both physics/foam during delayed-script native reload, reconnect the same seat and use normal majority checkpoint return. Automation selects the test crew's keys; it is not a human study.
- Initial browser evidence exposed an overwritten rescue cue; encounter guidance now wins over same-update checkpoint notifications. An actual screenshot exposed the checkpoint sign covering the crew; its placement now clears the pocket.180 camera poses retain original bounds/ray checks. Final built onboarding, input/context recovery, eight-group normal browser flow,23 route views/three title sizes, High/Low optics/dry-deck and local deployment smoke pass.
- Current0.9 local load:120.059s,4 rooms/16 clients,32 resets,4 reconnects, stable bodies/colliders, no invariant violations and all rooms disposed. Eight90-frame1080p timing captures include rescue; High crew/rapids/rescue CPU and some GPU/frame targets miss. Performance acceptance remains open.
- **M2-C PASS for engineering; M2 now3/5 checks verified.** M2-D presentation and M2-E genuine human/device acceptance remain. Full evidence and actual per-fixture logs are in `evidence/phase-2-rescue.json`. Production scope remains the owner's2-point baseline, with no accepted region or public rollout.

## Delivery phases and transition

### M2-D1 plan — simple, animated invite lobby (owner revision)

| Step | Files | Change / verification |
|---|---|---|
| 1 | shared name validation, room, client entry | Invite URLs still join directly. Ask new players for a short display name inside the joined game; remember it locally, validate on the authority and retain it on reconnect. Render user text with textContent. Snapshot name is an additive optional field; old clients retain readable fallback names. |
| 2 | scene, lobby HTML/CSS and projected crew labels | Compact invite/Ready panel; names above actual avatars, own label You, ready tick above the avatar. Let each person ready before all seats fill, retaining the four-ready launch barrier. Animate lobby water, idle crew and gentle hull heave/heel without advancing authoritative gameplay or drifting out of the dock. |
| 3 | unit/network/browser, evidence/tracker | Verify Unicode/invalid names, seat ownership, reconnect, direct invite/name flow, early readiness, tick visibility, five viewport layouts, moving water/boat and unchanged authority. Recheck launch input release, playing camera/quiet HUD, normal browser flow and native context recovery. |

Decision: the owner's request supersedes the old frozen *visual* lobby and full-crew-disabled Ready button. Keep server gameplay frozen until launch; run a presentation clock and wave-relative bob at the dock. No new dependencies, physics-version change, lobby propulsion, public deployment or persistent playing name HUD. This is the first presentation batch inside M2-D; premium world/boat/water/audio and genuine human/device acceptance remain open.

### M2-D1 observed evidence

- Direct invite admission joins the actual crew, then prompts new clients for a short name. The authority validates Unicode/length, binds the name to the sender seat and retains it on reconnect. The browser remembers/re-syncs its profile after the handshake, including a previously undelivered rename. No name is written to checkpoint records or invite links. Optional snapshot names preserve protocol5 compatibility; physics0.9 is unchanged.
- The compact lobby presents Copy Invite/Ready and collapsed controls. Names appear above crewmates, own tag says You, and Ready adds the avatar tick even before all seats fill. Four connected/ready members still gate launch; tags/panel clear for gameplay.
- The former frozen visual clock is superseded by the owner's request. Lobby water/foam, crew idle posing and gentle wave-relative hull heave/heel now animate while the server tick/hull/rowing/save state stays anchored. Reduced motion damps the visual hull motion. Five viewport layouts test ordinary and maximum-length handles; a bow/stern label overlap was corrected without changing overlap assertions.
- Full regression: `tests106 / pass106 / fail0`,84.00s. New four-browser name/invite/ready/motion/layout cases pass, alongside existing onboarding, normal gameplay, touch/controller/native context recovery, reconnect,180 camera cases,23 route views/three title sizes, High/Low dry-deck and local deployment smoke.
- Current named-snapshot load:120.079s,4 rooms/16 clients,32 resets,4 reconnects, no invariant violations and all rooms disposed. This is local SDK/authority load, not human/Internet/hosting or animated-lobby FPS acceptance. Prior M2-C2 performance captures retain their CPU/GPU/frame target misses; no fresh performance claim is made.
- **M2-D1 verified as a scoped presentation batch; M2-D remains PENDING.** Premium boat/crew/water/audio and M2-E human/device gates remain. M2 stays3/5 engineering checks, accepted production scope2/100 and0/14 accepted regions. Evidence and actual command logs: `evidence/phase-2-lobby.json`.

### M2-D2 plan — current-relative water and spatial paddle audio

| Step | Files | Change / verification |
|---|---|---|
| 1 | client audio | Reuse native Web Audio and the shared water sampler for a quiet stereo dock/river bed, hull wash based on water-relative speed, smooth rapid intensity and four seat-panned brace layers. Keep a fixed ambient graph; disconnect ended one-shots and bound overlapping voices. No assets, dependencies or authority changes. |
| 2 | audio unit/offline/browser fixtures | Check drifting versus rowing, continuous rapid transitions, seat ownership/panning, no brace in air/lobby and silence for pause/wreck/finish. Render actual stereo PCM, test clipping/mute/volume, repeated lifecycle changes and one-shot cleanup. Verify saved preferences and menu/reconnect/visibility handling in the built game. |
| 3 | regression / tracker / release | Run strict build and full regressions, record scoped evidence, preserve previous provenance and refresh tracker/package. Keep full M2-D, human listening, device performance and production acceptance open. |

Decision: procedural layers provide physical feedback using existing snapshots. They do not substitute for regional recordings, music, contact surface authoring or human mix review. Fixed ambient sources avoid creating audio nodes per snapshot; cue voices have an explicit concurrency ceiling and ended-node cleanup.

### M2-D2 observed evidence

- Seven fixed stereo/seat-panned ambient layers share one705600-byte procedural noise buffer at44100Hz. Hull wash uses horizontal water-relative speed; rapid intensity uses the shared smooth field. Only actually immersed BRACE blades contribute to the corresponding seat layer. Pause, wreck and completion fade ambience; dock rehearsal does not invent shared paddle sounds.
- Actual offline stereo PCM verifies dock/drift/rowing/rapids, both speaker sides, saved volume scaling and silence after pause/wreck/completion/mute/inaudible/clear. The full-volume200-request correlated-break stress fixture exposed clipping. Faster compression alone still peaked at1.360779; a native soft output guard fixed it with the original peak<1 assertion retained. Final peak0.944802,24 temporary voices maximum, zero remaining at end. Normal signals below0.8 stay linear through the guard.
- Seven audio groups pass, including actual native built-game gesture unlock, saved mute/volume across same-seat reload, playing/dock menu silence/resume, a synthetic visibility transition, real peer transport loss/pause and same-seat reconnect. Completed strokes do not replay. No human listening or physical speaker/headphone/device acceptance is claimed.
- Full regression:107/107 pass,84.54s. Strict build passes; eight normal four-browser gameplay groups, two tracker integrity tests/six dashboard groups, report freshness, diff whitespace and local in-memory deployment smoke pass. No graphics geometry, camera, authority, save format, protocol or physics change. Prior route/render/timing/load evidence is retained with its original scope; no fresh GPU/FPS/hosting claim.
- **M2-D2 verified as a scoped audio batch; M2-D stays PENDING.** M2 stays3/5 engineering checks, accepted scope2/100 and0/14 regions. Regional/contact audio, music/listening, boat/crew/hero water/cliff/material presentation and M2-E human/device acceptance remain. Evidence and per-command logs: `evidence/phase-2-audio.json`.

### M2-D3 plan — continuous geological banks and grounded vegetation

| Step | Files | Change / verification | Risk / response |
|---|---|---|---|
| 1 | client riverbed/scene | Replace repeated cliff boxes/ledge strips with one continuous sampled cross-section: exact vertical contact face, receding upper ledges and a varied ridge. World-scaled UVs and vertex-colour sediment/wet/moss bands reuse the stone texture. Ground plants/trees on the actual rendered triangles. | No upper ledge may extend into the channel; preserve bankEdge and authoritative geometry. Reject seam/grounding disagreement instead of moving colliders. |
| 2 | presentation/bank/camera/render fixtures | Independently check adjacent positions/UVs/colours/normals, exact contact face and triangle-ground queries. Inspect before/after gorge/rescue views, full route, both quality levels, camera rays and native graphics restoration. | Preserve existing camera, dry-deck and render limits; simplify geometry if extra cost or occlusion appears. |
| 3 | timing / regression / tracker / package | Strict build and full regression; fresh advancing-clock High/Low timing capture, scoped evidence, tracker and matching local release archive. | Performance capture PASS is separate from target acceptance. Human art/device/full-route acceptance and the rest of M2-D stay open. |

Decision: the observed five-metre stair steps come from independent BoxGeometry heights and stretched box UVs. A shared world-space profile removes those discontinuities without changing the river, hull, physics or save contracts. Use existing Three.js geometry/material batching and the existing texture; no asset service or dependency is needed.

### M2-D3 observed evidence

- Continuous1.25m cross-sections keep the physical y−3..3 contact face exact, then recede into varied upper ledges/ridges.52,074 shared seam/attribute comparisons have zero gap.3,696 independent top-triangle rays agree with vegetation queries within0.000006222m. The old crossed-sine pattern persisted with reused stone, so the final material uses one locally generated periodic256×256 colour/bump texture (262144bytes before mipmaps), mip filtering and sediment/wet/moss vertex colours.
- Tests exposed reversed cap normals, texture-byte overflow during contrast tuning and floating finish vegetation beyond the old1425m scenery. Winding and bounded texture amplitude were corrected; only the backdrop now reaches1460m to support the last1440m vegetation tile. Race finish/authority are unchanged. Close-up inspection also exposed intersecting recovery paint; its vertices now follow bankEdge at a2cm offset.
- Final full regression: `tests110 / pass110 / fail0`,250.67s. Strict production build passes with the existing large-bundle advisory.25 High/Low route/close-up views and three title sizes pass, including2,934 actual rendered vegetation rays and rescue-paint attachment. Maximum712 calls /2,249,940 triangles, versus prior727 /2,252,580. Three returns plateau at175 geometries/11 textures.180 camera cases, High/Low optics/dry deck, seven remapping/controller/native-context groups, eight normal four-browser gameplay groups and local in-memory deployment smoke pass.
- The first90-frame timing capture was noisy and overlapped the local deployment smoke; it is retained in `performance-phase-2-banks-first.json`. A fresh180-frame-per-case capture ran after the other workers finished: High CPU p95=4.3/3.5/5.5/5.7ms for crew/trees/rapids/rescue; Low=2.5/2.2/4.0/4.1ms. High trees GPU p95=11.676ms misses10.5ms; other GPU cases meet. High crew/rapids/rescue CPU and Low rescue CPU miss4ms, and all strict16.67ms frame-interval targets miss. Both observations remain visible; measurement PASS does not grant device/frame-budget acceptance.
- **M2-D3 verified as a scoped scenery batch; M2-D stays PENDING.** M2 remains3/5 engineering checks, accepted scope2/100 and0/14 regions. Premium boat/crew/hero water, full regional asset/material/lighting/weather and sound palette, genuine human art/readability and named-device/full-route gates remain open. Exact scope and command logs: `evidence/phase-2-banks.json`. No public deployment, private database edit, protocol/physics migration or new dependency.

### M2-D4 plan — lean transmission and current-relative wake

| Step | Files | Change / evidence | Risk / response |
|---|---|---|---|
| 1 | client water | Capture actual submerged colour and native depth in one WebGL2 render target instead of rendering a second packed-depth pass. Preserve absorption, foreground rejection, render-state restoration, High/Low release and context recovery. | Optical/resize/exception tests must pass unchanged; reject a depth format or lifecycle regression rather than soften the optics assertions. |
| 2 | client scene/water | Wake direction/strength follow horizontal hull velocity relative to the shared current, including reverse/sideways travel. Replace orthogonal checker froth with advected ripple noise. Skip whirlpool tracer simulation outside its visible region. | Keep shared physics and all input/save rules unchanged. Verify drift/reverse masks, pause/re-entry and actual source work. |
| 3 | fixtures / timing / tracker / release | Strict/unit/native browser and route checks, one-pass draw instrumentation, isolated before/after timing, honest remaining budgets and matching local package. | Do not equate a removed render pass with guaranteed FPS. Retain baseline and measured misses; full M2-D/human/device gates remain open. |

Decision: the local WebGL2 renderer supports sampled depth textures, so a second depth-only riverbed render is unnecessary. Existing depth rejection and absorption can read the attached depth texture directly. The wake currently uses GPS speed and hull heading, which creates stern wakes even in reverse or passive drift; use the same shared current as physics/audio for this cosmetic feedback. No new dependency, server change or resolution/quality reduction.

### M2-D4 observed evidence

- A native depth attachment now provides actual colour and depth in one High capture render; Low invokes zero capture renders. Original controlled transmission/absorption/foreground checks retain zero observed RGB-channel difference against M2-D3. Resize, repeated quality toggles and an injected render failure verify native depth alignment, bounded resources and touched-state restoration. No capture resolution or reflection quality is reduced.
- Seven actual-scene groups verify passive drift, forward/reverse/sideways wake direction/strength, snapshot immutability, visible pause, offscreen whirlpool simulation/upload skip and finite re-entry. Advected crest froth replaces the old crossed-sine grid. Cosmetic foam/spray heights use the exact scalar shared sampler instead of calculating unused velocity fields. Shared physics, authority, input, saves and versions remain unchanged.
- Full regression: `tests111 / pass111 / fail0`,86.65s. The final crest refinement is covered by final built route/effects/optics/native recovery checks. Strict build passes with the known bundle advisory.25 route/close-up views/three titles,180 camera cases, High/Low dry deck, seven native-context/input groups, eight normal four-browser game groups and local in-memory deployment smoke pass. Preview/title smoke initially found the stopped local service; restarting port2571 with in-memory saves fixed that environment failure.
- Final route maximum712 calls /2,249,364 triangles; three revisits retain175 geometries/11 textures. Transmission draw calls halve for the same floor chunks; this is one fewer render pass, not a promised FPS multiplier. Eight180-frame1080p captures ran after the other workers finished. High CPU p95=4.2/3.0/5.5/5.1ms and Low=2.1/1.7/3.1/2.9ms for crew/trees/rapids/rescue. All sampled GPU cases meet10.5ms (High trees10.435ms); all Low CPU cases meet4ms. High crew/rapids/rescue CPU and every strict16.67ms frame interval still miss. Historical before/after samples are separate host observations, not a controlled causality/device study.
- New nested CPU observations identify camera work near0.9–1.1ms in rapids/rescue and High reflection callbacks near0.8–1.7ms. Percentiles are not additive. These guide the remaining work without lowering the budgets. **M2-D4 verified as a scoped water/render batch; full M2-D remains PENDING.** M2 stays3/5 engineering checks, accepted scope2/100 and0/14 regions. Exact logs/limits: `evidence/phase-2-water.json`. Premium art, real human water/readability/full-route and named-device/production acceptance remain open.


### M2-D5 plan — exact camera broad-phase bounds

| Step | Files | Change / evidence | Risk / response |
|---|---|---|---|
| 1 | client scene | Compute static occluder geometry bounds once after authored merging/transforms. Reuse Three.js local-space ray rejection without changing triangle tests, camera cadence or render quality. | Bounds must enclose final vertices; compare bounded/unbounded ray hits and camera poses. If work is not reduced, investigate the observed remaining path before adding acceleration. |
| 2 | native camera fixture | Compare the same rays with and without bounds across route, reverse, bank-edge and rescue poses; count actual narrow-phase mesh/triangle work and retain existing screen/occlusion assertions. | Restore test instrumentation/bounds after each comparison; fail on hit/pose disagreement, invalid bounds or no work reduction. |
| 3 | regression / timing / tracker / package | Strict build, affected route/native-context/game checks and isolated High/Low timing; preserve D4 baselines, update evidence/tracker and rebuild matching local archive. | Keep timing misses and human/device gates visible; no performance/device acceptance from one host capture. |

Decision: Three Mesh.raycast computes a sphere automatically but only performs its tighter local-box rejection when geometry.boundingBox already exists. Merged authored geometry lacks it. Use the installed renderer's existing exact broad phase first; no new dependency, reduced check frequency or collision proxy. Acceptance requires identical ray hits/clearance plus observed less triangle work. Full M2-D stays PENDING.

### M2-D5 observed evidence

- Tight local boxes are computed once for the final static camera geometry, including shared shore-rock geometry. Three.js keeps its original world/local transform and exact triangle-intersection path. No render geometry, material, camera frequency, proxy, authority, save or version changes.
-180 existing camera cases pass unchanged. Across two viewports,1,536 same-ray comparisons retain exact object/face, distance and point arrays, including1,200 real intersections.214,909 unique geometry vertices per viewport are enclosed. Instrumented actual Ray.intersectTriangle calls fall from5,525,984 to3,448,312 (37.60%); mesh narrow-phase entries fall9,395 to3,660. These are fixture work counts, not FPS. The initial clear-chase-only check failed its positive-hit requirement; independent lateral wall rays fixed coverage while retaining the requirement.
- `npm test`: **tests111 / pass111 / fail0**,86.84s. Strict production build passes with the existing bundle advisory.25 route views/three title sizes, seven native input/context-recovery groups, eight normal built-game four-browser groups and eight-check local in-memory deployment smoke pass. Max712 calls /2,249,364 triangles and three returns175 geometries/11 textures remain unchanged. Existing optical/dry-deck/audio/load evidence is retained with original scope; those unaffected fixtures are not claimed rerun.
- Eight isolated180-frame1080p captures observe camera CPU p95=0.8/0.8ms at rapids and0.5/0.6ms at rescue (High/Low), versus prior0.9/1.0ms and1.0/1.1ms. Overall High CPU=4.1/2.5/5.3/5.0ms and Low=1.9/1.7/3.1/2.6ms for crew/trees/rapids/rescue. High crew/rapids/rescue CPU, High crew/trees GPU and all strict16.67ms frame intervals still miss. GPU workload is unchanged and host variation is retained. Historical before/after timing is not a controlled causal/device study; nested percentiles are not additive.
- **M2-D5 verified as a scoped camera-performance batch; full M2-D stays PENDING.** M2 remains3/5, accepted production scope2/100 and0/14 regions. Real human camera/readability, premium boat/crew/water/regional art, named-device/Internet/full-route and production acceptance remain open. Exact command logs and packaging scope: `evidence/phase-2-camera.json`. No public deployment or private save modification.

1. **Foundation:** validated physics/input/session/save baseline plus reproducible local performance and room-load measurement. Human/device production gates remain explicit.
2. **Premium playable slice:** authored bends and rescue, collision/readability agreement, near-field boat/water/crew/audio, onboarding and actual four-human/newcomer evidence.
3. **Connected world:** full streaming/disposal, obstacle authoring pipeline, complete region batches and all fourteen region exit checklists.
4. **Release hardening:** named-device/browser matrix, real Internet and long browser soak, host capacity, backup/restore/rollback, accessibility/security/platform checks and no open P0/P1.
5. **Release and iteration:** explicit release acceptance, authorized deployment, incident/telemetry observation and evidence-led fixes.

Proceed through engineering phases in order and keep working within the authorized scope. An engineering milestone can be verified while its human/production gate is still open. That does not award production scope points or certify later phases. The dashboard must show both statuses so a locally passing batch cannot be mistaken for a complete game.


### M2-D6 plan — boat material and paddle detail

| Step | Files | Change / verification | Risk / response |
|---|---|---|---|
| 1 | hull/boat-detail/scene | Align hull/gunwale grain along wood, reuse existing texture for subtle bump/roughness, shape bevelled paddle blades and place a small rope coil on the actual floor. | Preserve structural vertices, paddle centres and gameplay rules; keep detail within existing envelopes. |
| 2 | geometry/native graphics | Geometry bounds/finite normals, hull collision suite, rendered close-ups, dry deck and existing route/camera/context/game checks. | Inspect actual images; reject protrusions, unreadable seat colours or resource growth. |
| 3 | tracker/evidence/package | Strict build and relevant regressions, measured render cost, scoped tracker and matching local ZIP. | Full premium boat/crew/art and human/device acceptance remain open; no unmeasured FPS claim. |

Decision: use existing Three.js geometry and the existing256px wood texture. Correct visible grain orientation and block-like paddle silhouettes without new assets/dependencies or altered structural collision. This is a scoped boat-detail batch within M2-D, not full production-art acceptance.


### M2-D6 observed evidence

- Hull grain follows each structural panel and its actual diagonal, with consistent adjacent coordinates. Gunwale grain follows its arc; existing256px texture supplies restrained bump/finish. Four rounded bevelled paddles share one148-triangle geometry within their original attachment envelope. A960-triangle three-turn rope coil rests on the bow floor. No structural vertex, physics, save, protocol or crew-strength change.
- The new blade bevel initially exceeded its envelope by68 micrometres; the tip was moved inward without loosening the assertion. Native close-up inspection then caught the neck pointing away from the handle. Its local orientation was corrected and neck-versus-bowl ray checks added. Final images were re-inspected and all affected native checks rerun.
- Full regression: **tests114 / pass114 / fail0**,87.71s. Strict production build passes with the existing bundle advisory.25 route views/three titles,180 camera cases, fourteen High/Low dry-deck phases, seven native input/context-recovery groups, eight normal four-browser game groups and eight-check local in-memory smoke pass. Maximum712 calls /2,250,668 triangles (+1,304); three returns retain172 geometries/11 textures versus175/11. No added texture or dependency.
- Eight isolated180-frame1080p captures observe High CPU p95=4.1/4.0/4.5/4.9ms and Low=3.4/3.3/4.2/3.9ms for crew/trees/rapids/rescue. High GPU=13.605/13.766/13.775/12.994ms; Low trees GPU=12.188ms. All High GPU, Low trees GPU, High crew/rapids/rescue CPU, Low rapids CPU and every strict16.67ms interval miss. These less favourable observations are retained; historical runs do not isolate material cost from host variation. No performance/device acceptance is granted.
- **M2-D6 scoped boat-detail engineering verified; full M2-D stays PENDING.** Existing crew assets, complete premium boat/world art, performance optimization and human/device/full-route gates remain open. M2 remains3/5 and production scope2/100,0/14 regions. Exact scope/logs/package: `evidence/phase-2-boat.json`. No public deployment or private-save modification.


### External handoff integration — foam initialization and save conflict

| File | Change | Verification / risk |
|---|---|---|
| client/water.ts | Initialize nearest-obstacle cache on first update, then retain movement caching. | Assert first update, stationary reuse and moved refresh against independently sorted authored obstacles. |
| server/BoatRoom.ts | Publish blocked voyages as unavailable while keeping storage-error state separate. Stop stale-owner persistence after conflict. | Test outbound message and repeated persistence attempts; full authority regression. |
| tracker/status/evidence | Record externally supplied work as reviewed scope, not blanket certification. | Preserve existing phase/production gates; unrelated HUD/port/name changes still need review. |

Decision: NaN movement comparisons are always false, leaving foam points at sentinel positions forever. Separating saveConflict from saveUnavailable also changed the wire contract: the existing client only warns/disables recovery for unavailable messages. Fix both at their sources without reverting the useful allocation changes.

Observed handoff integration evidence: 116/116 full tests pass including network tests,2 targeted cache/lease tests, strict build,180 native camera cases, water optics and tracker integrity/freshness pass. Only the two scoped fixes are verified; external HUD/name/port and performance claims remain review items. Existing D6 archive/provenance is retained as historical and no new release certification is granted. VERDICT: PASS for scoped fixes.


### Readable danger and varied runs — implementation plan

| File scope | Work | Evidence / risk |
|---|---|---|
| client danger geometry/scene | Consistent red/ivory hazard markings, sharp rock crowns, pointed lethal pilings, distinct iron/log silhouettes and dock warning. Shared materials, bounded meshes. | Geometry envelope tests, High/Low route images, collider regressions; cosmetic details must not enlarge lethal volumes. |
| simulation/room/protocol/client | Server chooses one mover phase per crew, includes it in snapshots; initialize/move collider and render from the same phase. Protocol6 rejects old clients. | Multi-phase checkpoint safety, pause/reset retention and real-client snapshot agreement. Static routes/save checkpoints remain compatible. |
| pacing fixture | Measure270 seconds of actual four-paddle rowing in isolated flat water; retain1400m route unless measured pacing requires extension. | Diagnostic removes hazards and uses flat water; report distance/speed, not human completion certification. |
| docs/tracker/release | Track requirements, observations, remaining human pacing/art gates and build matching package. | No blanket AAA/zero-glitch/performance claim. |

Decision: readable stylized danger and bounded per-crew mover variation provide gameplay variety without a procedural map generator, new physics engine or new dependency. Preserve safe bays and authored obstacle spacing; gameplay randomness never changes within a crew or appears independently on clients.

### Observed implementation result

Implemented crowned rocks, pointed pilings, marked iron teeth/logs and a dock warning. Protocol 6 carries one server-chosen phase for all moving logs/wheels, retained on retry. Full suite: 120 passed, 0 failed. Native danger fixture: eight High/Low views, 24 phase comparisons; route fixture: 25 views; camera: 180 cases; game-flow and deployment smoke pass. The first network test incorrectly filled the room before asserting version rejection; moving that assertion before capacity was reached fixed the fixture. The 270 s flat-water diagnostic travelled 323.693 m; keep the existing 1,400 m route and require a real full-route pacing playtest. Exact performance/package results are recorded in `evidence/danger-update.json`.

## Name confirmation before Ready — 21 October

Plan: separate remembered profile text from confirmation for the current crew in `src/client/main.ts`. Require confirmation on new joins/creates, persist confirmation only for that room in session storage, and preserve confirmed reconnects. Extend `tests/lobby.mjs` with saved-name host/invite cases and blocked dismissal. Verify strict build and native four-player lobby fixture. Risk: a stored name must not silently enable Ready; refresh after confirmation must preserve the seat.

Observed result: strict build passed; native four-player lobby fixture passed eight groups with zero browser errors, including saved-name host/invite confirmation, Escape prevention, disabled Ready, names, ticks, five layouts and confirmed reconnect. Other browser fixtures that seed only a profile name need explicit name-form submission before readiness assertions; they were not rerun for this fix.

## M2-D7 — foliage lighting cost and current-flow verification

Decision: near foliage has rough, untextured, vertex-coloured surfaces, but currently pays MeshStandardMaterial lighting per fragment across colour/reflection passes. Compare built-in MeshLambertMaterial for leaves/undergrowth, retaining geometry, instance colours, two-sided faces, shadows and fog. Use native baseline/current screenshots and identical geometry counters; measure all eight existing frame cases. Reject if the look loses readable forms or lighting. No dependencies or new rendering subsystem.

| File | Change | Risk |
|---|---|---|
| src/client/nature.ts | Use simpler native diffuse foliage lighting after controlled comparison | Colour/shadow differences require WebGL inspection |
| tests/performance.mjs and dedicated native fixture | Reproducible prior-material comparison and measured timing | Timings are host observations, not consumer-device acceptance |
| tests/* built-game fixtures | Explicitly confirm name before existing control/game assertions | Do not bypass the user flow or break reconnect assertions |
| docs/tracker + evidence | Record exact verification, retained evidence and remaining gates | M2-D/E must stay pending until their full acceptance |

Verification: strict build, full unit/authority suite, affected native name/game/input/audio/save fixtures, full route/camera and native recovery, sequential isolated performance captures, tracker freshness and runtime ZIP provenance. If built-game fixtures fail, correct the actual flow or fixture expectation before claiming it verified.

D7 validation follow-ups: name confirmation had invalidated the built-game fixtures that previously relied on localStorage to bypass entry. They now submit the actual form. The onboarding fixture found duplicate lobby/settings help IDs; settings now has its own ID and both notes update on remapping. The native lobby fixture also accepts 20 non-BMP letters and rejects 21; the input's raw bound now matches the shared validator rather than prematurely truncating valid UTF-16 pairs. Full suite observed: 120 passed, 0 failed (88.854 s); complete per-command scope and comparison results are recorded in the D7 evidence report.

D7 final decision: reject Lambert and zero-specular Phong material substitutions. Controlled pixels stayed close, but observed High-mode timings regressed. Restore original production Standard shading; keep the opt-in experiment fixture and equal 60-display-frame warmup for reproducible evaluation. No renderer speedup is claimed. Ship the required name-confirmation regression coverage, full Unicode handle acceptance and unique remapped-guidance IDs. Full production acceptance stays open.

Final retained-Standard capture: eight cases meet sampled CPU and GPU targets, strict frame intervals still miss. This is a local observation after equal warmup, not evidence that the rejected experiments improved rendering or that named-device/human acceptance passed.

## M2 physics continuation — persistent shaft bracing and bounded solid response

Contract: preserve the loaded hull, water sampler, row assistance, canonical checkpoints, hazard clocks and lethal hull-only rule. Close the concrete T022 gap: motion-only tip rays miss stationary/shaft-only contacts. Use one native Rapier capsule matching the visible shaft and actual contact normals, retain swept tip detection for fast tip motion, apply horizontal reaction at the real contact point, subtract moving-solid velocity and cap per-seat force at 260 N. No vertical contact thrust or passive motor force.

| File | Change | Risk / verification |
|---|---|---|
| src/shared/protocol.ts + client/scene.ts | Share the existing handle anchor; bump physics identifier to basin-0.10 | Verify visual anchor unchanged and reject stale physics clients |
| src/shared/paddle-contact.ts + simulation.ts | Real shaft capsule contact, moving-solid relative velocity, existing bounded tip sweep | Real static/kinematic geometry, all seats/headings, idle/release and energy/force matrix |
| server/voyages.ts + saves tests | Review canonical 0.5–0.9 checkpoint-only migration to 0.10 | No private DB; real temporary-store transaction/lease/version tests |
| tests/contact.test.ts + native fixture | Reproduce held/shaft-only contacts, nonlethal bracing, no lift, impulse/energy limits | Fix a failing case rather than loosening bounds |
| docs/tracker/evidence | Record measured outcomes and remaining human/shallow-water gates | No whole-physics or whole-game sign-off |

Decision: native shape queries reuse the existing engine and authored shaft envelope; this is smaller than adding four jointed rigid bodies and a new collision subsystem. Full rounded-blade rigid contact and shallow bathymetry remain separate production requirements. If handling regressions appear, isolate the solid contact response before accepting this batch.

Additional code-verifiable N02 gate in this batch: run an opt-in real-wall-clock test of the unchanged production90-second reconnect grace (no shortened subclass timer). Observe a45-second absence, same-seat/name/phase resume and no stale stroke; then observe actual90-second expiry, token rejection, freed-seat rejoin and four-ready relaunch. Use isolated in-memory authority/local sockets; this does not substitute for real Internet/TCP loss or physical network switching.

Native regression finding: maximum-length lobby labels overlapped after390→1440 viewport resize because CSS width changed before the throttled animation callback reprojected their old390px anchors. Update labels synchronously after crew DOM replacement and after the scene resize listener, with current camera/world matrices. Keep all viewport/bounds/overlap assertions unchanged and rerun the real lobby fixture; this is a root-cause UI fix, not a relaxed test.

Envelope refinement before acceptance: the visible shaft is a seven-sided tapered cylinder, so its face clearance is smaller than its circumradius. Use2.2cm capsule radius (below2.5cm*cos(π/7)), inset endcaps, and independently sample all native polygon face planes in both quality modes. Cache the unchanged handle anchors so client posing does not allocate a new anchor each frame. Re-run contact/force regressions after this conservative-radius correction.

Observed final physics regression:125 passed,0 failed (112.592s). Native8 shaft envelopes/45,696 face comparisons pass with minimum analytic clearance0.524mm. Original long-name lobby assertions pass after synchronous label projection. Actual production grace:45-second pause/reconnect and90.011-second expiry/replacement pass; expected expired-token rejection is logged by the SDK. Prior0.9 checkpoint recovery migrates through the built authority/browser. Exact final load/package scope is in `evidence/phase-2-contact.json`.

Final0.022m authority workload passes4 rooms/16 clients for60.153s, with zero recorded violations and clean room disposal. This is a short local synthetic run, not maximum hosting capacity or a long browser/Internet acceptance result. Immutable workload snapshot: `evidence/load-phase-2-contact.json`.

## Full rounded-blade contact continuation — implementation plan

Use the existing four-segment rounded outline as shared plain data. Preserve bevelled rendering and split the concave neck/body at their shared seam into two exact convex core prisms, rather than filling the neck shoulder with a single hull or adding jointed paddle rigid bodies. Their thickness stays within the visible bevel. Match full body+local paddle rotation (including twist), query persistent actual blade volume, and replace centre-ray sweep with native convex translational casts. Keep shaft contact,260N horizontal reaction, contact-point lever, no hull damage from paddle-only hits and safe checkpoint rules.

| Files | Changes | Risk / evidence |
|---|---|---|
| shared/paddle-blade.ts + client/boat-detail.ts | Shared sampled outline, convex cores and physical pose math | Compare original geometry/rays and native mesh inclusion/orientation |
| shared/paddle-contact.ts + simulation.ts | Blade-edge contact plus native part casts and actual hit points | Edge-only hits, concave-shoulder misses, sensors, passivity, moving solids, sweep and original controls |
| protocol/voyages + version/save checks | basin-0.11 with reviewed canonical0.5–0.10 migration | Existing world/checkpoints unchanged; temp-store and stale-client tests |
| tests + docs/tracker/evidence | Deterministic physical/native regressions, fresh built multiplayer/load checks | No human/device or perfect fluid/rotational-CCD claim |

Failure handling: preserve actual failures; fix geometry/normal/pose issues before accepting. Rotating shape casts are translational approximations at60Hz, not a claim of exact arbitrary-speed rigid-body continuous collision. Human handling, shallow-water/manual rescue, production art and full Internet/device gates remain separate.

Observed implementation: two convex core prisms preserve byte-identical blade positions/normals. Native288 High/Low poses/12,096 core transforms agree within3.555e-16m. Real blade-only48 passive and32 moving/rest/release cases pass; force/energy/vertical/hull-damage limits remain. Final full suite reports130 passed,0 failed (112.351s). First failing interior-ball fixture is retained; corrected exterior-edge fixture preserves all physical bounds. Final native/load/package scope: `evidence/phase-2-blade.json`.

Final pose audit adds20 degenerate/vertical direction comparisons. It reproduced and fixed zero-length copying and the exact antiparallel rotation axis to match Three. Final131 tests pass,0 fail (89.467s); native288-pose matrices and strict build/deployment rerun pass. Earlier130-test/load results are explicitly historical snapshots; final load/package details remain in the phase report.

Final0.11 workload passes4 rooms/16 clients for60.124s with zero recorded violations, zero dropped simulation steps and clean disposal. The runtime ZIP independently matches all4 built files plus4 entrypoint/documentation/check files; private data is excluded. This is local synthetic QA, not hosting capacity, Internet or named-device acceptance. See `evidence/load-phase-2-blade.json` and `evidence/blade-package.json`.

## Shared bathymetry and shallow-water contact — plan

Decision: replace the flat hidden floor with the same static triangle bed used by rendering. Reuse Rapier and existing20 buoyancy probes, without new bodies, fluid solver or dependencies. Author one nonlethal left-bank sandbar at Fern Dock240–280m, preserving deep centre/checkpoint lanes. Exact triangle interpolation supplies positive, bounded near-bed drag and Low-quality water depth cues; ground friction comes from actual contact. Keep water height/current, mover clocks, hull mass and canonical checkpoint IDs/poses.

| Files | Change | Risk / verification |
|---|---|---|
| shared/bathymetry.ts + client/riverbed.ts | Canonical7-column/5m triangle surface, exact height sampling, continuous vertex normals | Independent rendered/native triangle rays, chunk seams, deep lane safety |
| simulation.ts + water.ts + scene.ts | Static bed mesh/friction, bounded near-bed drag, same depth tint in Low, readable shallow sign | Real ground/rest/reverse/recovery, dissipation, High/Low optics/route views and CPU timing |
| protocol/voyages + save/version tests | basin-0.12; reviewed canonical0.5–0.11 compatibility | Explicit current/prior browser saves, stale-client rejection, safe spawn checks |
| tests + docs/tracker/evidence | Deterministic depth/contact/handling tests, native crew/route and local load | Retain failures; no human, long Internet/device or full-game sign-off |

Failure handling: fix mesh winding/triangle sampling or false recovery before acceptance. If drag causes free energy or obstructs the safe centre, correct its bounds/authoring rather than relax tests. Manual capsize rescue and physical-device/human acceptance remain separate requirements.

Shallow-water corrections: a higher/wider first shoal grounded crews too firmly and spread the ramp toward centre. Final22–23cm crest and a deep-core vertex4m from the left bank preserve all150 canonical lane samples. Real bed paddle contact now has bounded tangential slip resistance,so pressing reverse can push off; static/passive/no-lift/release assertions pass. Escape is measured by clearance under the whole keel,not an arbitrary20m upstream destination. One actually grounded case and three nearby shallow cases are reported separately.137 regressions pass; native four-client normal-current escape passes. A screenshot exposed the existing checkpoint board in the approach; final cosmetic relocation is verified separately.

Measured shallow-water verification before the final board-only relocation:137 tests pass,0 fail (94.827s).3600 independent rendered/authority triangle comparisons observe maximum analytic-height error0.306µm and Rapier-ray error7.68µm. Exact position/normal chunk seams,150 safe spawn-lane samples,2001 drag bounds and14,560 High/Low depth-attribute checks pass. One settled ground-contact case and three nearby shallow cases escape using only normal reverse PaddleStroke commands in5.42–19.87 simulated seconds. Passive/no-lift/zero-rest/release assertions pass. Four native rendered clients escape under real authority current/waves in18.149 wall seconds; initial QA pose is set once via parent IPC and no test endpoint ships. Initial27-view capture passes with705 max calls/2,249,368 max triangles and no observed graphics errors. Final board placement, native reruns and timing/load/package scope are recorded in the phase report.

Timing follow-up: initial8-case capture records High CPU/GPU and Low rapids/rescue CPU misses; it is retained as `performance-bathymetry-first.json`. Camera/reflection and depth update were all slower. A definite redundant path was removed: static bed samples/uploads now reuse the buffer while the water window is stationary,while waves still update. Same-tick relocation invalidation is explicit and tested. This client-only cache does not change the authority load configuration. Final measurements determine remaining misses; no universal60FPS claim.

Final cache build and137 regressions pass (94.650s). Post-cache water optics,wakes,four-browser shallow handling and local built deployment pass.27-route graphics,180-camera,71-control and remaining native suite scopes are recorded precisely in the phase report. Final4-room/16-client authority load runs60.014s with zero violations/dropped steps and clean disposal. Final8×180-frame capture records water CPU p95=0.5–0.6ms; High rapids/rescue CPU,High trees GPU and all strict frame-interval misses remain open. Both captures are retained; machine-wide changes in camera/reflection timing prevent attributing all improvement to the client cache.

## Cooperative capsize righting — implementation plan

Decision: reuse validated reverse row actions and their existing sequence/expiry/neutral lifecycle instead of another client command. A sustained roll enters a bounded15-second rescue window; ordinary paddle forces stop while crew physically rights the same hull with capped torque. Strict majority of active seats (3/4;1 in practice) must hold reverse together. Actual lethal contacts retain priority. Upright completion clears all held input without changing position/checkpoint/reset; timeout retains canonical fallback. Network pause freezes simulation and clears effort.

| Files | Change | Risk / verification |
|---|---|---|
| shared/simulation.ts + protocol.ts | Latched rescue window,majority effort,capped angular response,completion/fallback snapshot fields | Upright/manual/no-input/release/timeout/lethal/energy and finite-pose tests |
| server/BoatRoom.ts | Broadcast state and clear member row controllers on entry/success | No stale input,reconnect pause,forged command/seat/sequence rejection |
| client/main.ts + index.html + style.css | Temporary reverse-hold prompt/effort/countdown,touch control,transition release | Remapping,keyboard/touch release,menu/blur/reconnect,mobile layouts |
| versions/save tests + native fixtures/docs | Reviewed0.5–0.12 canonical saves under0.13/protocol7 and exact evidence | Same checkpoint/world layout; isolated QA data,no human/device/complete-game claim |

Failure handling: correct torque direction/overshoot or lifecycle before accepting; preserve failed checks and do not replace real righting with a hidden position/rotation reset. Full swimmer/rescue animation and human fairness remain separate presentation gates.

Observed capsize implementation:142 regressions pass (103.392s);24 roll/pitch/heading cases physically right the same hull with3/4 active reverse effort and2400Nm torque cap,without pose setters during rescue or reset/checkpoint/revision changes. Initial600Nm assist failed against stable inverted buoyancy and is retained. Wrong/minority/stale/released effort,practice,timeout and lethal priority pass. Real socket disconnect freezes the15-second simulation window and clears effort;production heartbeat expiry and stale sequence checks pass in the strengthened network fixture. First native timeout was a fixture unpause race;wait for all4 unpaused peers and observed helper count before requiring success. A surface ring locates the submerged hull;production swimmer/rope/crew rescue art remains open.

Native regression found an existing asynchronous guidance race: the snapshot displays the recovery-eddy instruction,then a durable-save acknowledgement can replace it with redundant "Checkpoint saved." The normal snapshot already announces checkpoint progress. Remove the duplicate acknowledgement toast while retaining actual save status/error reporting. Keep the original eddy instruction assertion and add a600ms late-ack persistence check;do not relax timeout or physics assertions. Original failed native log is retained.

Final cooperative rescue verification:142 full regressions pass (111.994s) after the explicit server neutral-rearm guard on entry/success. Four native clients pass5 key/arrow/touch-hold/cancel/reload groups;24 actual-torque cases right in1.47–3.65 simulated seconds after entering rescue. Final duplicate-toast removal passes the original eddy scenario plus a600ms late-ack persistence assertion. Final27 route/3 title views,180 camera cases,context/reconnect/save/shallow/lobby/tracker and local deployment checks pass. Exact pre/final guard/UI scope and local load/package results are in the phase evidence;human/swimmer/art/Internet/device gates remain open.

Final protocol7/basin-0.13 local authority workload passes4 rooms/16 clients for60.007s with zero recorded violations and clean room disposal. This is short synthetic local WebSocket QA,not Internet/hosting/device/long-browser acceptance. Details: `evidence/load-phase-2-capsize.json`.

