# Bad at Boating — PRD progress and remaining work

> **Current scope revision — 21 October 2026:** [FAN_RAFT_REBOOT.md](FAN_RAFT_REBOOT.md) governs the fan raft redesign. R1 now has a locally implemented round raft, giant fans, actual A/D offset torque, sampled buoyancy and a156 m feel course. The R0–R4 board tracks this redesign separately, with human/art and named-device gates still open. [Implementation scope](FAN_RAFT_IMPLEMENTATION.md). Earlier realism, paddle, lethal-rock and region assumptions below are legacy material; their tests do not establish fan-game acceptance. The complete4–4.5 minute course, durable new-world saves, final sound/animation and additional levels remain pending.

21 October 2026. Live project companion to the archived `reference/boat_project/docs/PRD.md` and its original phase tracker. That archive describes the documentation deliverable's state and is intentionally preserved.

**Current product state: a local networked prototype. No complete production phase is signed off.** Features can exist across phases while their exit gates remain open. The new owner-defined2/100 baseline and weighted acceptance ledger are planning scope points, not a measured quality percentage. Partial code is tracked separately from accepted production scope.

This inventory uses the implementation and observed verification summarized in `STATUS.md`. The earlier menu, arrow-only input, quiet run view and lethal-obstacle changes have scoped evidence. The latest iteration adds bounded water transmission, authored camera readability and a rerun multiplayer regression; AAA production quality and a finished region are still open. No full production phase or human acceptance gate is closed by those checks.

## Current continuation — cooperative capsize righting

Protocol7 / basin-0.13 / waterworks-1. A sustained inversion now opens a15-second simulation rescue window. A strict majority of active seats (3/4 in a full crew;1 in practice) must hold reverse with no turn command. The same validated row messages,owned seats,sequence checks and heartbeat expiry are reused. Capped2400Nm horizontal righting torque physically rolls/pitches the same hull upright;normal paddle forces stop during rescue. Success requires30 consecutive upright ticks,clears held input and preserves position/checkpoint/revision/reset. Actual lethal contact wins;timeout retains canonical checkpoint rescue. Disconnect pause freezes the window and clears all effort. Checkpoint capture/finish cannot advance during rescue.

A temporary prompt displays helpers/required count,countdown and the saved reverse binding/arrows. A native touch-hold button handles cancellation;other touch paddles hide during rescue. A small yellow surface ring marks the submerged hull's actual horizontal position using shared water height. It disappears on success/reset/wreck. Full swimmer/rope/crew rescue animation is not implemented. Protocol7 rejects stale6 clients;canonical0.5–0.12 saves migrate through unchanged lease/version/finished guards because checkpoint/world poses retain their identities.

Final full regression: **142 passed,0 failed** (111.994s,including the server neutral-rearm guard;before the final duplicate-toast removal).24 real-torque heading/roll/pitch cases,minority/wrong/stale/released input,practice,timeout and lethal priority pass. Actual4-seat local sockets verify majority ownership,forgery rejection,paused rescue time and same-hull reconnect;production heartbeat/stale-sequence and neutral-rearm checks pass. Both capsize entry and successful righting require a neutral packet before another held action can power movement. Final native5-group remapped-key/arrow/native-touch-hold/cancel/reload flow passes.27 route views/3 titles,180 camera cases,71 normal controls,context/reconnect,prior0.12 saved voyage,shallow escape,eddy rejoin and lobby/tracker checks pass with exact per-command scope recorded in `evidence/phase-2-capsize.json`.

A native eddy regression exposed an existing UI ordering bug:the snapshot instruction could be overwritten by a late duplicate "Checkpoint saved" toast. That duplicate is removed;durable save/error state remains,and the original instruction test plus600ms late-ack check pass.

Final protocol7/basin-0.13 local authority workload passes4 rooms/16 clients for60.007s with zero recorded violations and clean room disposal. This is short synthetic local WebSocket QA,not Internet/hosting/device/long-browser acceptance. Details: `evidence/load-phase-2-capsize.json`.

This is explicit bounded gameplay righting assistance,not a simulation of swimmer force,rope loading,trapped air or naval capsize stability. Initial600Nm assist could not overcome the stable inverted hull;that measured failure is preserved. Full human fairness/newcomer study,production rescue art/audio,regional map expansion,Internet/device/long-browser acceptance and the retained rendering budget misses remain open. M2 stays3/5 engineering checks,accepted production scope2/100 and0/14 regions.

## Previous continuation — shared bathymetry and shallow-water gameplay

Protocol6 / basin-0.12 / waterworks-1. The flat hidden floor is replaced by25 static bed meshes sharing the exact rendered triangles. Fern Dock has a nonlethal left-bank sandbar from240–280m,with a22–23cm submerged crest and a deep core beginning4m from the left bank. The centre/checkpoint lanes retain deep water. Exact triangle interpolation drives a smooth1–3x near-bed drag multiplier; actual bed contacts supply friction and bounded horizontal paddle slip resistance. The total solid reaction stays capped at260N,with no vertical paddle thrust or idle propulsion. High transmission captures the real bed; Low now tints from the shared bed-depth samples. Shared normals remove bed chunk shading seams. A shallow-water sign warns before entry; the old checkpoint board moves across the pool to leave the approach clear.

Final regression: **137 passed,0 failed** (94.650s,after the board placement and stationary-depth cache). Independent rendering and actual authority rays cover3600 bed triangles,with maximum analytic height error0.000000306m and physics-ray error0.00000768m. Position/normal seams,150 canonical lane samples,2001 drag samples,High/Low water-depth attributes,passive energy/no-lift/rest/release and normal reverse handling pass. One actual grounded edge and three nearby shallow cases clear the entire keel in5.42–19.87 simulated seconds without wreck or recovery teleport. Four actual Chrome clients repeat the escape under normal current/waves; final native/runtime/timing/load scope is in `evidence/phase-2-bathymetry.json`.

Final local workload:4 rooms/16 clients over60.014s,zero recorded violations or dropped simulation steps,clean disposal. Eight180-frame High/Low timing captures observe water-update CPU p95=0.5–0.6ms after caching stationary bed depths. High rapids/rescue CPU,High trees GPU and every strict16.67ms frame-interval target still miss; performance acceptance stays open. Earlier slower timing is preserved without attributing the entire difference to the cache.

Canonical0.5–0.11 saves migrate transactionally after unchanged lease/version/finished checks; water height/current,mover clocks and checkpoint IDs/poses are retained. This is a bounded gameplay approximation,not a shallow-water fluid solver or articulated paddle/Coulomb-load model. Manual capsize rescue,regional map/art production,full-route human pacing and real Internet/device/long-browser acceptance remain open. M2 stays3/5 engineering checks,accepted production scope2/100 and0/14 regions.

## Previous continuation — rounded blade contacts

Protocol6 / basin-0.11 / waterworks-1. Rounded blade core volumes now detect held edge contacts and sweep across thin obstacles; conservative shaft contacts remain. Two convex pieces preserve the concave neck instead of adding an invisible filled shoulder. Full hull+paddle rotation matches the flat visible blade through yaw and heel. One horizontal reaction per seat retains actual leverage, moving-solid point velocity and the260N cap; paddle-only contact stays nonlethal.

Final full regression: **131 passed,0 failed** (89.467s). Blade-only48 passive and32 moving-frame/rest/release cases pass. Original rendered positions/normals are byte-identical;42 core vertices stay inside the bevelled mesh. Native High/Low288 poses/12,096 vertex comparisons agree within3.555e-16m. Twenty additional zero-length/vertical/near-antiparallel comparisons match the renderer after an independently reproduced fallback correction. Canonical0.5–0.10 checkpoint saves migrate transactionally with the existing active/finished/unknown-version guards. Runtime/browser/load/package evidence and precise scope are recorded in `evidence/phase-2-blade.json`.


Final0.11 workload passes4 rooms/16 clients for60.124s with zero recorded violations, zero dropped simulation steps and clean disposal. The runtime ZIP independently matches all4 built files plus4 entrypoint/documentation/check files; private data is excluded. This is local synthetic QA, not hosting capacity, Internet or named-device acceptance. See `evidence/load-phase-2-blade.json` and `evidence/blade-package.json`.

Translational casts approximate the current60Hz orientation; bevel rims, arbitrary rotational CCD, worst-case simultaneous contacts and human handling remain open. Shallow bathymetry/manual rescue, full-route human pacing, premium art and Internet/device acceptance remain pending. M2 stays3/5 engineering checks; accepted scope2/100 with0/14 production regions.

## Previous continuation — persistent shaft contact and production-grace verification

`basin-0.10` adds conservative shaft-volume contact to the existing tip sweep. Real contact-point leverage, contact-fraction paddle velocity and moving-solid relative velocity produce a horizontal reaction capped at260N.48 passive seat/heading/heel cases and32 moving-frame/impact cases cover no-lift/no-free-energy, release and nonlethal behavior. Full125 regressions pass. Canonical0.5–0.9 checkpoint saves migrate atomically after the existing safety checks. The opt-in actual45-second reconnect/90.011-second expiry passes without shortened timers; results are recorded in `evidence/phase-2-contact.json`; it does not substitute for Internet/TCP loss or physical network switching. P03/P05/N02 remain IN_TEST for their full production gates.

## Previous continuation — M2-D7 performance evaluation and complete entry-flow regression

The current batch fixes required saved-name confirmation across the browser fixtures, accepts the server's full 20-Unicode-codepoint handles, and gives lobby/settings guidance unique IDs so remapped controls update unambiguously. Both simpler foliage-lighting experiments preserved the observed appearance but produced High-mode timing regressions; the original Standard material is retained. The comparison fixture now uses equal display-frame warmup and preserves rejected captures. Exact verification and final retained-renderer timing: `evidence/phase-2-foliage.json`. The final retained-renderer capture meets all eight local CPU/GPU targets; strict frame intervals still miss. M2-D remains PENDING for complete art/performance acceptance and M2-E for genuine human/device evidence.

## Previous continuation — readable danger and varied runs

Lethal rocks have pointed crowns and red/ivory faces; pilings have sharp red tips, iron teeth are brighter and moving logs carry warning bands. Existing five collision families and the 1,400 m route remain. Protocol 6 shares a server-selected mover phase across all four peers; retries retain it. A 270-second four-paddle flat-water diagnostic covers 323.693 m, not a measured full-route finish time. 120 automated tests, 25 route views, 180 camera cases and eight High/Low danger views pass. Human readability, full-route pacing and device performance acceptance remain open. See `evidence/danger-update.json`.

## Previous continuation — M2-D6 boat finish and shaped paddles

Hull/gunwale wood direction now follows the planks; subtle material detail reuses the existing texture. Rounded bevelled paddle blades share one geometry and keep their original attachment/envelope. The bow rope is a compact coil placed on the floor. Structural hull geometry, authority and crew strength remain unchanged. V01 stays IN_TEST for complete authored boat/crew assets, animation/compression pipeline and human art review. Exact final verification and budget observations: `evidence/phase-2-boat.json`. No production points or completed regions are awarded.

## Previous continuation — M2-D5 exact camera broad phase

The camera now computes static geometry boxes once after final merges/transforms and reuses Three.js exact local-space rejection. Native same-ray bounded/unbounded hit comparisons and final vertex enclosure supplement180 unchanged camera/framing cases.111 regressions and25 route views pass. Exact verification, triangle-call work and latest isolated timings are in `evidence/phase-2-camera.json`. G06/F03 remain IN_TEST: human readability and named-device acceptance are open. Latest timings retain High crew/rapids/rescue CPU, High crew/trees GPU and all strict frame-interval misses. Full M2-D remains PENDING; no production points or completed regions are awarded.

## Previous continuation — M2-D4 single-pass transmission and current-relative wake

Water transmission now uses a native depth attachment to capture actual colour/depth once. Controlled optical pixels, foreground rejection, Low fallback, resize, exception-state restoration and quality release have scoped tests. Current-relative wakes handle forward/reverse/sideways motion and passive drift; advected crest froth replaces the old grid pattern. Scalar cosmetic height sampling and offscreen whirlpool skipping reduce unnecessary work. `evidence/phase-2-water.json` records exact final verification/timing. V02 and full M2-D remain IN_TEST/PENDING for premium art/water-truth, named-device/frame budgets and human acceptance. No production points, completed region or release gate is awarded.

## Previous continuation — M2-D3 continuous bank scenery

Cliff boxes/ledge strips are replaced by continuous receding profiles with world-scaled material coordinates, sediment/wet/moss colour and a small periodic texture. Independent geometry/ray checks cover seams, unchanged contact faces and actual triangular ground. Rendered vegetation and rescue-paint attachment are checked across25 authored views, including High/Low close-ups. The final vegetation tile now has supporting finish scenery. Physics, saves, obstacles, finish and checkpoint contracts remain. Exact final regression/render/timing scope is in `evidence/phase-2-banks.json`. V03/V04 and M2-D stay IN_TEST/PENDING for full production assets, human art/transition/readability and named-device acceptance. No production points are awarded.

## Previous continuation — M2-D2 physical water/paddle audio feedback

Stereo dock/river ambience, current-relative hull wash, smooth rapids and seat-panned immersed brace layers now supplement the existing one-shot palette. Seven fixed loops reuse one buffer. Temporary voices have a24-source ceiling and explicit ended-node disconnection. A soft output guard addresses observed correlated-transient clipping; normal low-level signals remain linear.107/107 regressions, strict build and seven actual-PCM/native-browser audio groups pass; see `evidence/phase-2-audio.json` for exact scope. Protocol5 / basin-0.9 remains unchanged. A01 stays IN_TEST and M2-D stays PENDING for regional/contact production sound, mix/listening, full near-field presentation and device evidence. Accepted scope stays2/100 and0/14 regions.

## Previous continuation — M2-D1 named, animated waiting lobby

The owner's requested invite flow now joins directly, collects/remembers a short validated display name and shows You/crewmate names above the actual avatars. Ready works while waiting, adds the avatar tick, and keeps the four-ready launch barrier. A smaller invite/Ready panel replaces the verbose card; water/foam, idle crew and wave-relative boat bob animate without advancing lobby gameplay. Name changes are available from the menu and survive reconnect.

106/106 unit/authority regressions pass. The first presentation batch has five-screen layout and real four-browser name/ready/motion evidence plus existing launch/input/reconnect/camera/route/optics regressions. See `evidence/phase-2-lobby.json`. This is partial M2-D, not completed premium boat/world/water/audio production; M2 remains3/5 engineering checks, with all human/device/release acceptance open.

## Previous continuation — recovery encounter /3 of5 M2 checks

M2-C is engineering verified: local waiting-dock own-paddle rehearsal plus a physical Stillwater recovery eddy after Whitewater. Green bank paint, two signs and48 current-driven foam streaks expose the nonlethal pocket. Crews slow/regroup and use ordinary paddles to rejoin; marked contacts stay lethal. Checkpoints and clocks remain, with reviewed0.5–0.8 canonical saves migrating to `basin-0.9` through existing transaction safeguards.

104/104 regressions, nine passive approaches/three simulated rowing exits, four actual rendered clients through entry/exit/reload/retry,180 camera cases,23 route views and current4-room/16-client load pass. Eight High/Low performance captures retain explicit CPU/GPU/frame-time misses. Details, corrections and limits are in `evidence/phase-2-rescue.json`. M2-D presentation and M2-E genuine human/device acceptance remain; no production scope points, full region or release gates are accepted.

## Previous continuation — safe waiting-dock paddle rehearsal

M2-C1 now gives waiting players a local preview of their assigned paddle with remapped keyboard/arrows, touch and standard controller input. Authority tick/pose/force/strokes remain frozen; release, countdown/cancel, graphics recovery and fresh launch input have built-game evidence. Dock-only framing keeps boat/paddles clear of the waiting card in five screen sizes.99/99 regressions and strict build pass. See `evidence/phase-2-onboarding.json` for scope and actual verification.

G02 is IN_TEST: actual boat-response teaching, genuine newcomer comprehension and physical-device acceptance remain. Staged rescue is still pending, so M2-C is not passed and M2 stays2/5 checks verified. No production points are awarded; near-field art/audio and human/device acceptance remain open.

## Previous continuation — five bends and camera integration

Phase2 now has2/5 engineering checks verified, with all production gates open. `basin-0.8` coordinates five Timber Gorge bends across physical/visible banks, water/current, hazards/movers, props/plants and camera. Every existing checkpoint identity/pose and obstacle clock remains; reviewed0.5/0.6/0.7 canonical saves migrate transactionally.96/96 regressions,132 camera cases, four rendered clients at five authored authority poses,8 built-game flow groups,7 context/input recovery groups and current local4-room/16-client load pass. GPU/High-rapids CPU budgets and genuine human/device acceptance remain open. Exact evidence and corrections are in `evidence/phase-2-bends.json`; rescue/onboarding and near-field presentation remain next.

## Previous continuation — Phase 2 collision batch

The active slice now uses `basin-0.7`: structural hull panels, convex collision and water masking share one envelope, while loaded-body mass/centre/inertia and the existing buoyancy/rowing model remain explicit. The authority distinguishes predicted near misses from real contact and detects later touch from an existing pair. New transformed-surface/volume and real-contact tests supplement the original physics/network/save checks. Both0.5 and0.6 canonical saves can resume safely; no private database was modified during QA.

The current full suite passes **90/90 tests**, fresh built four-client flow passes8 groups and native High/Low context recovery passes7 groups. Graphics/optics/dry-hull checks pass; performance target misses remain explicit. M2 is still active: this batch implements its structural collision check, with bends, rescue/onboarding, art/audio and human/device acceptance still open. See `evidence/phase-2-hull.json` and the phase board for exact scope.

## Completed engineering phase — measured foundation

The five-phase execution board is now live in the tracker: **M1 engineering VERIFIED / production OPEN; M2 active; M3–M5 pending**. All original139 work items and thirteen PRD categories remain. Phase checks cannot skip prerequisites or turn local measurements into production acceptance. Full Phase1 details are in `PHASE_EXECUTION.md` and `evidence/phase-1.json`.

New evidence:85/85 regression tests; a120.152-second four-room/16-client run with32 shared resets and a reconnect in every room; six advancing-clock1080p High/Low CPU/GPU/heap captures;210 bit-identical full-field samples; normalized warped-grid normals and sampled water error≤1.5cm. Water-update CPU p95 fell from3.1–5.8ms to0.5–0.8ms locally. Overall CPU/GPU target misses remain in the report. These close measurement paths for F03/N04, not their human/device/hosting acceptance. M2 next implements hull/collision agreement, bends/rescue and premium slice presentation.

## Previous continuation — complete production ledger and verified foundation

The [whole-project audit](PROJECT_AUDIT.md), [implementation plan](PRODUCTION_PLAN.md) and [searchable tracker](PRODUCTION_TRACKER.html) now cover49 weighted deliverables, all14 region design cards,80 candidate obstacle concepts and10 signature encounters. The owner's inherited2-point baseline is retained; no production acceptance is fabricated. The tracker validator rejects missing evidence, invalid/cyclic dependencies, premature acceptance and stale generated reports; CI runs it.

Implemented protocol5 / basin-0.6: wave-relative damping, normalized16/20/24 buoyancy experiments, actual-contact grounded recovery, bounded vegetation residency/LOD, slow-socket/pre-JOIN queue guards, handshake-safe reconnect pause, exact bounded catch-up/finish stop, explicit old canonical-save migration, saved remapping/controller/graphics/motion and native graphics-context recovery. Actual local verification:81/81 Node tests,71/71 four-rendered-client control checks,7 access/controller/context-recovery groups,5 touch checks,4 reconnect checks,8 browser flow groups,92 camera cases,21 graphics views/3 titles, water optics and139-record tracker UI. Graphics peaks fell from6.03m to2.25m triangles with steady resource counts across three revisits. Physical controller, human acceptance and named-device/Internet/long-soak evidence remain open. Full details and failure recovery are in STATUS.md.

Current map audit:1,400m,18 sections,10 checkpoints,28 rocks,26 spikes,32 pilings,5 moving logs,2 wheels and6 rapid fields. Historical entries below sometimes say19 route beats; the current source contains18. No fourteen-region or AAA/zero-glitch completion is claimed.

## Previous continuation — crew animation and endurance

Procedural crew now have deterministic staggered blinks, effort/gaze/shoulder motion, shaft-aligned wrists and mirrored thumb grips. A shared two-bone solver retains arm lengths during rowing and wreck reactions. Paused/lobby/completed/sunk snapshots cannot keep emitting stroke spray/ripples; resets and title transitions clear stale effects. Shared ripple geometry removes repeated GPU geometry churn. New rig-cycle tests and real Chrome effects/pose QA supplement the existing grip/workspace checks. The opt-in four-client real-time soak records actual duration, reconnects, authority memory and collider counts; the current result and scope are in STATUS.md.

This is an animation/reliability batch. Production modelling/skinning/audio, human feedback and long Internet/browser/hosting load studies remain open. No phase or human acceptance gate is closed.

## Previous continuation — reviewed Claude handoff

The inherited uncommitted additions have been reviewed and completed as a bounded prototype batch: 1400m/19 route beats/10 compatible checkpoint indices, a second physical wheel, Act 2 camera volumes and rapid warnings, cancellable four-ready countdown, strict-majority checkpoint consent with Agree/Withdraw/expiry, independent keyboard/touch ownership, immediate durable checkpoint writes and finish/departure/replay handling. Permanent stroke HUD and title Practice were removed to preserve the user's clean-screen preference. Same-tick recovery now relocates the water mesh immediately. Protocol5 requires all clients to refresh after deployment; the save layout/physics identifiers are retained. Current verification and limitations are recorded at the top of STATUS.md; older figures below are historical.

These changes do not close human acceptance, production art, long-run memory/network load, streaming, winding/rescue encounters or the remaining regions. No AAA/zero-glitch claim or whole-game percentage is made.

## Latest continuation — water transmission, camera readability and multiplayer regression

High graphics now captures bounded underwater riverbed color and packed depth for screen-space transmission, depth absorption and foreground-safe refraction; Lower Graphics keeps its analytic no-extra-pass fallback. Camera volumes cover the main readability-sensitive route sections, including reverse and portrait views with camera collision clearance. The High graphics capture excludes shadow samplers after a detected WebGL warning, and the final graphics regression treats `GL_INVALID_*` as a failure. Current observed verification is **60/60 Node tests, 25 held-control checks, 8 four-browser groups, 68 camera cases, a water GPU fixture, landing High/Low fixture, and 17 graphics views + 3 titles**, each final browser fixture reporting `errors: []`. These are local automated results, not human navigation or performance acceptance.

## Latest continuation — persistence, machinery, networking and cPanel

Implemented durable canonical checkpoint/finish SQLite records, private recovery credentials, atomic revisions/live-room leases and Continue Voyage. A real eight-paddle shared-clock waterwheel at465m has matching physical/visual motion, lethal marked hull contact and an open left bypass. Network fixtures now cover three real-WebSocket delay/jitter/application-message-drop profiles, blackout, duplicate/simultaneous reconnect, short real expiry and forged bursts. The cPanel Node24 runtime ZIP, CommonJS startup, exact setup guide and deployment smoke were verified locally from a clean production-only install. Public hosting, remote CI and Docker execution remain unverified. A12-newcomer study kit is prepared; no human sessions occurred.

Current verification: **58/58 Node tests,25 control checks,8 broad browser groups,6 save-browser checks,17 graphics views +3 titles**, plus clean-package/local deployment smoke. Protocol3 / basin-0.5. See `STATUS.md` for exact scope, observed failed attempts and recovery. This is a substantial verified batch, not completion of all requested production work.

## Prior art correction — rocks, trees and grass

Smooth white boulders and cone/ball crowns were replaced by chipped mineral stone, bark/branch/leaf tree assets, curved grass blades and fern clumps. Headwaters and ridge trees share instanced assets in route chunks; distant/Low foliage and Low undergrowth density reduce geometry cost. Lethal rocks retain the same spherical physical envelope. This is a procedural environment art pass with close-up and game-camera verification; production art direction, varied biomes, wind/seasonal animation, asset streaming and named-device performance remain open. Historical full suite at that iteration:52 tests passed. Current continuation evidence is above.

## Prior controls — hold-to-row WASD and arrows

The user's feedback replaces manual blade positioning with complete repeating strokes: W/Up forward, S/Down reverse, A/Left left turn, D/Right right turn. Hold repeats; release lifts. Differential sweeps account for seat side; forward+turn rests the inner blade. Sampling runs at30Hz outside render frames. Own-seat routing, menu/blur/reconnect release and existing server force limits remain. Full serial suite:50 tests passed; targeted friends-browser check:25 passed. Exact evidence and production limits are in `STATUS.md`. Human learning/fun gates remain open.

## Earlier continuation — title cleanup, hull fix, route and audio

- Title now contains the logo and Play with Friends / Join Crew; Practice, Controls, eyebrow, tagline, location copy and footer were removed. Contextual in-game help remains in the menu/lobby.
- Protruding rectangular floor planks were replaced by shape-clipped planks; the bottom is closed and lower strakes follow the taper. Geometry containment and close-up rendering have targeted evidence.
- Initial route now covers 820m / thirteen beats, nine checkpoint positions, variable-width gorge banks, three rapids zones, rock/spike sequences and three shared-clock timber logs in total. Warning boards, green checkpoint pennants, timber works, entrance/final bridges and local rendering chunks are implemented.
- Procedural stereo rowing/water/break/checkpoint/finish sound, gesture unlock, mute/volume persistence and lifecycle silencing are implemented. Offline audio checks are separate from human mix acceptance.
- Production slice duration, four-human traversal/fairness, true streamed content, public Internet hosting and zero-defect/AAA acceptance remain unclosed. A sampled connected geometric corridor is not proof that a human crew can navigate the whole route.

## Earlier request — graphics and physical hazard depth

| Requested result | Current implementation | Still open |
|---|---|---|
| Better players and modelling | Four distinct procedural crew, faces/headwear/vests/boots, two-link arms following actual shaft grips, stroke lean and wreck reactions; wood grain/varnish/fasteners | Production glTF/sculpted models, skinning, animation library and human art review |
| Shine and depth in water | Real planar scene reflection, fine animated normal detail, Fresnel/sun highlight, artistic shallow/deep tint, shared physical displacement, foam/wake/spray | Refraction/underwater rendering, authored rapids/waves, weather, long GPU/memory and water-readability gates |
| Physics and varied dangerous obstacles | Actual cone spike colliders, shared-clock moving timber capsule, bounded current/depression whirlpool and central contact hazard | Human escape/readability balance, reusable obstacle authoring, lava encounter and full regional pacing |
| Better landing/title | Live crew/boat composition, compact game navigation, responsive title logo and direct create/join | Further art direction, portraits/short-window review and human first-entry feedback |
| AAA feel and depth | A substantive prototype upgrade; no AAA/production completion claim | Production asset/audio pipeline, polished 10–15-minute slice, named-device frame budgets and actual player acceptance |

Research: `RESEARCH_VISUALS.md` records nine primary sources and the distinction between documented techniques, implementation inference and unplayed commercial games. Rendering fixtures are labelled synthetic views, not actual route traversal.

## Earlier request — controls, flow and shared failure

| Requested result | State when this inventory was written | Evidence needed to close |
|---|---|---|
| Proper title → Play with Friends → create/join → shared in-game crew | IMPLEMENTED / scoped verification passed | Production-browser title, join form/invite, four clients, full/expired error, four-ready start |
| Every player's WASD/arrows request repeating complete strokes on their own blade; remove mouse paddle motion | IMPLEMENTED / scoped verification passed | All-seat forward/reverse/turn physics; actual held-key catches, aliases, focus/menu/reconnect/release; human usability remains open |
| Remove unnecessary permanent game overlays | IMPLEMENTED / visually checked | Ordinary gameplay has one small menu button; landscape/portrait captures inspected |
| Dangerous hull contact breaks and sinks the boat; shared retry | IMPLEMENTED / scoped verification passed | Actual-contact/near-miss/blade-only/fast CCD tests; shared break/sink, input lockout, retry and reconnect during failure |
| Research game flow, controls, HUD and failure | RESEARCHED | Eight primary sources and explicit design inferences in `RESEARCH_GAMEPLAY.md`; no claim of human validation |
| Report this request, PRD remaining work and next action after every task | RECORDED | Follow the report contract below in each final response |

The latest user decisions supersede the older pointer-first, automatic direct-entry and recovery-first defaults. **Bad at Boating** is the final name. Source filenames and historical working titles do not rename the game.

## Phase 00–12 inventory

| Phase | Current factual progress | Gate | Still required |
|---|---|---|---|
| 00 Discovery | Supplied report/ZIP/PRD analyzed; final name chosen; live decisions and research exist | REVIEW | Named review/signoff, provisional assumptions accepted, title clearance before commercial release; missing earlier source pack is disclosed |
| 01 Feasibility | TS/Three.js/Rapier prototype, sampled buoyancy/current, blade workspace, local authoritative room, targeted tests | REVIEW | Renderer/engine comparison or explicit decision to forgo, named-device frame/60 Hz trace, broader physical measurements |
| 02 Four-player magic | Four independent clients/seats, snapshot hull, ready barrier, local reconnect and slalom/current river | REVIEW | ≥12 newcomers in three genuine human crews, first-stroke/explainability data, recorded session,30-minute run and real Internet impairment; local WS matrix now exists |
| 03 Advanced hydrology | Twenty samples, anisotropic drag, shared waves/cross-current/0.55m whirlpool, swept blade brace and reset fallback | REVIEW | 16/20/24 sweep, complete capsize/grounding states, current/wave library, exploit/energy matrix, 30-minute stress and full PHY coverage |
| 04 Vertical slice | Initial 820m Headwaters→Timber Gorge route, thirteen beats, durable checkpoints, warning signs, rapids/timber/waterwheel/narrows, procedural audio | REVIEW | Full human traversal and pacing, production boat/crew/animation/audio, public durable-save validation, camera/hardware/memory gates |
| 05 Multiplayer hardening | Authority/schema validation, safe pause/input lift, WS impairment/blackout/races/test-grace expiry/burst checks, durable checkpoint records | REVIEW | Real Internet/TCP behavior,90-second production-grace observation, long soak, smoothing A/B, load/capacity/cost and operational security |
| 06 Seamless-world technology | Shared sampler seam tests exist; local draw chunks/culling; no loading/eviction streaming | NOT_STARTED | Route chunks/LOD/prefetch/eviction, multi-region path, memory soak and contact stability |
| 07 Obstacle factory | Pylons/rocks, tapered spike contacts, server-timed moving timber/waterwheel and whirlpool field; timing/contact fixtures | REVIEW | Reusable prefab schema, designer tools/validation, production hazard families and human fairness/pacing |
| 08 Regional production | One short prototype environment; fourteen-region specification remains design | NOT_STARTED | Fully playable/paced region batches, waterworks transitions, checkpoints, hazards, art/audio/streaming and each exit checklist |
| 09 Premium presentation | Detailed procedural crew/grip animation, varnished boat, reflective water/foam/wake/spray, instanced forest and cinematic title | REVIEW | Production models/rigs/animation/materials, production audio/music mix, weather/lighting, vistas and Low/Medium/High readability reviews |
| 10 Optimization / QA | Targeted local tests/browser checks only | NOT_STARTED | Named hardware/browser matrix, p95 CPU/GPU/memory, 90-minute soak, accessibility/remapping/controller support, full save/reconnect stress and P0/P1 gate |
| 11 Release candidate | cPanel chosen; prebuilt runtime/guide, clean-package local4-client smoke, local rollout, CI/container definitions | REVIEW | Actual public cPanel/WSS validation, portal SDK, executed remote CI/container if used, backup/rollback rehearsal, security/privacy/brand/launch review and approved marketing assets |
| 12 Launch / iteration | No public launch | NOT_STARTED | Release, meaningful telemetry/incident handling, 7/30-day cohorts, evidence-led patches |

`REVIEW` means partial implementation/evidence exists and must be assessed; it does not mean the source's gate passed. Later phases remain dependent on the human core-fun and vertical-slice gates. A lethal static rock does not complete the obstacle factory or regional production.

## First 30 task inventory

Statuses retain the source meanings: `IN_TEST` = implementation exists but the full ticket acceptance is unclosed; `IMPLEMENTING` = current work underway; `BACKLOG` = not implemented; `BLOCKED` = required prior gate missing. No ticket below is labeled `DONE` without its required review and exit evidence.

| ID | Deliverable | Status | Existing evidence / remaining acceptance |
|---|---|---|---|
| T001 | Freeze PRD and assumptions | IN_TEST | Source synthesis/decision log exists; user decisions updated. Full peer review/freeze/signoff still open. |
| T002 | TS workspace and deterministic CI | IN_TEST | Local strict type/build/test pass; deterministic Node24 GitHub Actions definition added. Remote CI and lint pipeline evidence remain open. |
| T003 | Render boat in basin | IN_TEST | Three.js river screenshots exist; review/video acceptance and named-device record remain. |
| T004 | Sampled hull buoyancy | IN_TEST | Still-water/heel/idle tests exist; full upright/wave and multiple-payload traces remain. |
| T005 | Water sampler | IN_TEST | Shared deterministic low-frequency height/current and seam continuity fixture; full discontinuity/version coverage open. |
| T006 | Constrained blade target/immersion | IN_TEST | Server-bounded proxy/immersion and complete held-action stroke fixtures exist; human acceptance open. |
| T007 | Water-relative blade reaction | IN_TEST | Air-vs-immersed reaction fixtures exist; broader direction/energy and reviewer evidence remain. |
| T008 | Four distributed stations | IN_TEST | Four-seat/yaw/rotation fixtures exist; full station geometry/torque coverage and review remain. |
| T009 | Input usability | IN_TEST | Server-clock held WASD/arrows, any-seat straight W/S assist, corrected camera-relative A/D and simultaneous mixed crew inputs have automated fixtures. Four-browser control/recovery evidence is in STATUS.md. Saved remapping and standard controller API fixtures now pass; physical controller/accessibility and newcomer usability clips remain. |
| T010 | Camera follow/contact clearance | IN_TEST | Follow, ray occlusion and landscape/portrait framing exist; narrow/reverse/rolling/tunnel fairness matrix incomplete. |
| T011 | Authoritative Colyseus room | IN_TEST | Running service and short local SDK/browser transport evidence; acceptance review/trace bundle open. |
| T012 | Versioned schema/validator | IN_TEST | Finite/bounds/sequence/extra-fields/seat ownership checks exist; broad malicious-input fuzz/rate abuse suite remains. |
| T013 | Four independent clients | IN_TEST | Current automated four-context create/join/ready/input/reconnect/wreck/retry regression passes; human gate remains separate. |
| T014 | Server hull snapshots | IN_TEST | Server owns body/force/checkpoint; forgery and intent checks exist; independent acceptance trace remains. |
| T015 | Blade/hull smoothing | IN_TEST | Snapshot presentation exists; controlled video latency/correction measurement not done. |
| T016 | Safe seat reconnect | IN_TEST | Early-join reconnect enabled; handshake/token race fixed; silent-snapshot watchdog, same-seat resume, subsequent refresh and offline Main Menu have browser fixtures. Two-second grace expiry and reconnect races pass; production 90-second observation, duplicate-tab UI and real network changes remain. |
| T017 | Slalom, narrow gate, cross-current | IN_TEST | Fixed pylons and cross-current river exist; genuine four-human traversal sessions and new lethal obstacle balance remain. |
| T018 | Diagnostics/evidence | IN_TEST | Tick/ack/force/stroke/reset metrics and browser artifacts exist; structured RTT/correction/bandwidth/replay run bundle incomplete. |
| T019 | ≥12 newcomer test | BACKLOG | Not run. Requires actual newcomers, consented unedited observations and survey. Automated clients do not count. |
| T020 | Evaluate human gate | BLOCKED | Current recommendation is ITERATE; no ≥12-person evidence or signed PASS/FAIL gate decision. |
| T021 | 16/20/24 sample sweep | IN_TEST | Normalized16/20/24 layouts,220/260/360kg payloads,10/25/45° heel restoration and measured cost/decay pass18,720 ticks; independent acceptance review remains. |
| T022 | Kinetic brace/contact caps | IN_TEST | Persistent shaft/tip contacts, contact-point leverage, moving-solid relative velocity and260N cap pass80 real contact cases; full rounded blade/worst-case energy and human handling remain. |
| T023 | Capsize/grounded recovery | IMPLEMENTING | Old inversion/reset fallback is partial; lethal break/sink is a new user rule, not full capsize/grounding recovery completion. |
| T024 | Timber Gorge route/checkpoints | IN_TEST | 1400m prototype route/18 authored sections/ten safe checkpoint positions with geometry, contacts, rapids and phase checks. Durable crash/restore and waterwheel physical/bypass fixtures pass; human navigation/duration, winding/rescue/camera and full slice gate remain open. |
| T025 | Production boat/four crew rigs | IN_TEST | Distinct procedural crew, faces/headwear, grip-driven arms, stroke/wreck motion and textured varnished boat; production assets/skinning/animation review still open. |
| T026 | Visual/gameplay water, spray/wake | IN_TEST | Shared displaced/reflective water, bounded High single-pass riverbed colour/native-depth transmission, normal detail, foam, water-relative wake and immersion/force-triggered spray exist; human water-truth and production art acceptance remain. |
| T027 | Camera volumes/readability | IN_TEST | Authored Whitewater/Timber/Iron Narrows/Last Descent volumes, reverse framing and geometric clearance pass 180 local route cases; blind four-human movement audits remain. |
| T028 | Latency/reconnect/load A/B | IN_TEST | Three real WS delay/jitter/application-message-drop profiles, blackout, reconnect races/expiry and forged burst pass. No TCP packet-loss study, smoothing A/B, long soak or room capacity model. |
| T029 | Streaming/disposal benchmark | IN_TEST | Bounded vegetation loading/disposal and three repeated GPU route/backtrack cycles pass; full asset/audio/multi-region streaming and90-minute memory trend remain. |
| T030 | Vote slice gate/next batch | BLOCKED | No finished slice, signed evidence-backed gate or real production throughput. |

## Remaining work in useful production order

1. Maintain title/crew entry, held WASD/arrow individual blades, clean play view, real lethal contact and synchronized break/sink/retry. Current full suite:125 tests passing; the current physics/browser/network regression scope is recorded in `evidence/phase-2-contact.json`.
2. Run the same controls with four real people and then the source's ≥12-newcomer study. Diagnose learning, fatigue, blade/hull causality, camera fairness and obstacle readability before adding world size.
3. Close network/recovery risks: real Internet latency/TCP loss,30-minute four-client run, production-grace/network-change observation, contact/energy stress, complete capsize/grounding states and structured telemetry.
4. Take the current 1400m prototype route through actual four-human traversal and pacing, then finish production boat/crew assets, animation/audio, public save/rejoin validation and measured frame/memory budgets.
5. Prove streaming and authoring tools, then produce the remaining world in complete region batches. Finish platform integration, broad QA, release rehearsal and launch gates.

### Next acceptance tasks

| Order | Tracker IDs | Concrete next work | Evidence still required |
|---|---|---|---|
| 1 | F03, V02–V04, G06 | Resolve remaining frame costs and review lighting/water/near-field art | Named-device High/Low measurements and genuine visual/readability review |
| 2 | G02, G05, M2-E | Traverse the full route with four people; tune encounter spacing and learning | Recorded finish duration, failures, fatigue and ≥12-newcomer comprehension results |
| 3 | N01–N02, M4-B | Observe production-grace reconnect and real Internet/network changes | Actual client/host traces; no stale input or seat/progress loss |
| 4 | V01, M2-D | Finish crew/boat animation and production art/audio review | Reviewed assets, closeups and listening/play evidence |
| 5 | V05, M3-A–C | Extend full asset/audio streaming and obstacle-authoring validation before region batches | Long memory plateau and each of the 14 region exit gates |

## Phase count after this iteration

**9 phases have partial implementation/review material;4 remain NOT_STARTED;0 phases signed off;0/14 production-ready regions.** Phase11 now includes deployment preparation with local package evidence, not public release acceptance. Human gates remain open.

## Required end-of-task report

Every final task response should include these four concise facts, in the user's language:

- **Is prompt ka:** complete/partial/blocked, with the exact delivered behavior and any unfinished request.
- **Test:** commands/checks actually observed this turn and their result; distinguish automated clients from humans.
- **PRD mein baaki:** current phase and the next unclosed gates; link this inventory. Never invent a whole-game completion percentage.
- **Agla kaam:** the concrete next milestone and what evidence will close it.

This file records scope and evidence needs. It does not certify the current implementation or close a production gate.
