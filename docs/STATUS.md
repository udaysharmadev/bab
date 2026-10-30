# Bad at Boating — implementation status

**30 October deployment incident:** public Fan Club frontend is paired with the old protocol3 / basin-0.5 backend, causing `fan-raft` room-not-defined. Connection preflight, retry/reconnect-safe messages and a required post-restart four-seat deployment check are implemented and locally verified. **Public repair remains pending user push and cPanel build/restart.** [Exact repair steps and evidence](FAN_DEPLOYMENT_FIX.md).

> **Current default — fan raft R1:** a locally playable bright toy raft slice, four oversized funny hand fans, ±0.28 m A/D player movement and Space for server-timed fan strokes. Fan protocol1 / fan-raft-0.2 / toy-bend-1. The156 m course includes nonlethal bumper rocks, teeth rails, a real moving sweeper, checkpoint and finish. Four named clients explicitly Ready; shared pause/reconnect and actual fan ownership are checked. [Current phase tracker](FAN_RAFT_REBOOT.md) · [Implementation/check scope](FAN_RAFT_IMPLEMENTATION.md). Full4–4.5 minute course, owner art/fun review, durable fan saves, final audio/animation and target-device/Internet acceptance remain open. All older implementation/test counts below describe the legacy paddle prototype at `/legacy.html`.

22 October2026 presentation/teaching pass: harbour menu with a chunky wordmark, fan emblem, islands/dock/palm, richer title-only water and protected text/action zones, smooth expressive crew with distinct outfits/headwear, quieter water, contact shading and directional half-wakes. Owned fan feedback shows push/recovery/glide, solo practice teaches real offset strokes and settling, and new rounds reset flap statistics while checkpoint retries retain them. Portrait framing reserves room for controls. Full lesson/round regression157/157 passed; final native scope and remaining passes are in [GAME_POLISH_PHASES.md](GAME_POLISH_PHASES.md). Owner visual/feel review and device FPS acceptance remain open; old source hashes/counts are historical. Names still require confirmation on new crews.

Latest handling: Fan Camp uses still water; one stroke glides about0.66 m after release and settles in3.63 s in16 simulated seat/heading cases. Actual browser keyup records0.669 m coast and zero late drift. Four cardinal dividers leave each bounded player corridor clear. See [coasting scope and verification](FAN_COASTING.md). The revised synthetic course pilot takes145.43 s; the initial current-assisted83.55 s result is historical.

21 October 2026 · Local authored multiplayer prototype · **ITERATE**.

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

## Previous continuation — rounded blade contacts / basin-0.11

Protocol6 / basin-0.11 / waterworks-1. Rounded blade core volumes now detect held edge contacts and sweep across thin obstacles; conservative shaft contacts remain. Two convex pieces preserve the concave neck instead of adding an invisible filled shoulder. Full hull+paddle rotation matches the flat visible blade through yaw and heel. One horizontal reaction per seat retains actual leverage, moving-solid point velocity and the260N cap; paddle-only contact stays nonlethal.

Final full regression: **131 passed,0 failed** (89.467s). Blade-only48 passive and32 moving-frame/rest/release cases pass. Original rendered positions/normals are byte-identical;42 core vertices stay inside the bevelled mesh. Native High/Low288 poses/12,096 vertex comparisons agree within3.555e-16m. Twenty additional zero-length/vertical/near-antiparallel comparisons match the renderer after an independently reproduced fallback correction. Canonical0.5–0.10 checkpoint saves migrate transactionally with the existing active/finished/unknown-version guards. Runtime/browser/load/package evidence and precise scope are recorded in `evidence/phase-2-blade.json`.


Final0.11 workload passes4 rooms/16 clients for60.124s with zero recorded violations, zero dropped simulation steps and clean disposal. The runtime ZIP independently matches all4 built files plus4 entrypoint/documentation/check files; private data is excluded. This is local synthetic QA, not hosting capacity, Internet or named-device acceptance. See `evidence/load-phase-2-blade.json` and `evidence/blade-package.json`.

Translational casts approximate the current60Hz orientation; bevel rims, arbitrary rotational CCD, worst-case simultaneous contacts and human handling remain open. Shallow bathymetry/manual rescue, full-route human pacing, premium art and Internet/device acceptance remain pending. M2 stays3/5 engineering checks; accepted scope2/100 with0/14 production regions.

## Previous continuation — persistent shaft bracing / basin-0.10

Protocol6 / basin-0.10 / waterworks-1. Real conservative shaft capsules detect stationary and shaft-only bracing alongside the swept tip query. Reactions use actual contact points and moving-solid point velocities, stay horizontal, and retain the260N cap. Relative paddle velocity scales with distance from its handle. Hull-only lethal contacts, water, loaded hull, input/clock/checkpoint contracts remain.

48 real seat/heading/heel contact cases and32 moving-frame/impact cases pass; no vertical contact thrust, passive free energy or stale release force was observed. Full regression:125 passed,0 failed. Native High/Low shaft anchors/envelopes, normal browser flow and context recovery pass. Actual45-second reconnect and90.011-second expiry pass without shortened timers; same-seat/name/phase resume, no stale strokes, expired-token rejection and replacement four-ready launch are observed. A responsive-label regression also now reprojects immediately after resize/crew changes. Final0.022m-radius authority load passes4 rooms/16 clients over60.153s with no recorded violations and clean disposal. Exact native/load verification: `evidence/phase-2-contact.json`. Canonical0.5–0.9 saves migrate safely through existing lease/version guards. Refresh all crew browsers for the new physics authority.

M2 remains3/5 engineering checks. Full blade rigid contact, shallow-water/manual rescue, premium art, full-route human pacing and named-device/Internet acceptance remain open; production scope stays2/100 and0/14 regions.

## Previous continuation — M2-D7 performance evaluation and entry-flow verification

Required saved names are confirmed explicitly by the current built-game fixtures. A 20-codepoint non-BMP name is accepted; 21 is rejected. Unique lobby/settings control-note IDs keep remapped guidance unambiguous. Lambert and zero-specular Phong foliage experiments preserved geometry/appearance but regressed High-mode timing; production retains its original Standard materials. Equal display-frame warmup, rejected captures and exact final verification are recorded in `evidence/phase-2-foliage.json`. Final retained-renderer capture: all eight sampled CPU/GPU targets meet, while strict frame intervals still miss. M2-D/E remain pending; accepted scope stays 2/100 with no complete region.

## Previous continuation — readable danger and varied runs

Protocol6 / basin-0.9 / waterworks-1. Lethal rocks now have faceted silhouettes, red/ivory warning paint and pointed crowns; lethal pilings have red pointed tops, iron teeth have bright tips and moving timber has contrasting danger bands. A dock sign teaches red teeth versus green recovery markers. Crown vertices remain inside the existing rock collider. Three deterministic rock treatments reuse one material; no dependency or new texture pipeline.

Each crew receives a server-selected0–120s mover phase. Collider initialization, moving logs/wheels and client presentation use the same offset. Retry preserves it; new crews receive a new offset. Old clients are rejected by protocol6. Four-peer/network and24 native High/Low phase comparisons pass. Exact final regression/render/release scope: `evidence/danger-update.json`.

The route already spans1400m,18 sections and10 checkpoints. In a270-second isolated flat-water diagnostic, all four paddles travel323.7m; extrapolating that speed to1400m gives19.46min. This is not a full-route or fastest-run bound: rapids, steering, pauses and retries change duration. The requested minimum4–4.5-minute design goal does not justify adding empty distance; actual human full-route pacing remains open.

Verification: **120 tests passed, 0 failed**; 25 route views, 180 camera cases, eight High/Low danger views and 24 mover-phase comparisons passed. Local four-seat launch/drop/reconnect smoke passed on protocol 6. Exact scope and outstanding performance/human gates: `evidence/danger-update.json`.

## Previous continuation — external handoff integration review

Reviewed the supplied Claude conversation against the actual source. Fixed two observed regressions: NaN prevented the nearest-obstacle foam cache from ever initializing, and separating save conflicts from storage errors accidentally advertised a blocked voyage as available. Blocked crews now publish unavailable/blocked and stop stale save/heartbeat retries. Targeted real-store lease takeover and water-uniform tests pass; strict build,180 native camera cases and optical tests pass. Full suite: **116/116 tests pass**, including local WebSocket/network tests. Exact scope is recorded in `evidence/handoff-review.json`.

The handoff's blanket completion/60FPS/allocation claims are not adopted as measured evidence. Live HUD behavior, UTF-16 name-input limit and incomplete port validation remain follow-up work. The existing cPanel archive and build manifest describe the previous D6 package; they do not certify the externally modified tree. Full M2-D and production acceptance remain open.

## Previous continuation — boat finish and paddle detail / M2-D6

Hull wood fibres now follow the planks across their actual convex triangulation, with consistent coordinates at adjacent panels. The existing256px grain texture also supplies subtle varnish/bump detail and a textured gunwale. Rounded bevelled paddle blades keep the original attachment centres and envelope; all four share one geometry. A three-turn rope coil rests on the bow floor instead of floating at gunwale height. Structural hull vertices, physics and crew strength are unchanged.

Final25 route views/three titles retain maximum712 calls; maximum triangles are2,250,668 (+1,304). Three return visits retain172 geometries/11 textures, versus175/11 before. Full scoped verification, timing and remaining gates are recorded in `evidence/phase-2-boat.json`. This is a boat-detail batch: production crew assets, complete premium presentation and genuine human/device acceptance remain open. M2 stays3/5 engineering checks and accepted scope2/100 with0/14 regions.

114/114 regressions, strict build,180 camera cases, High/Low dry deck, native graphics recovery and normal four-browser flow pass. Latest isolated timing retains all High GPU, Low trees GPU, High crew/rapids/rescue CPU, Low rapids CPU and all strict frame-interval misses. The higher timing observations remain visible; performance acceptance is open.

## Previous continuation — exact camera bounds / M2-D5

Static camera occluders now build tight local bounding boxes after final authored merges/transforms. The existing Three.js raycaster rejects irrelevant geometry before testing triangles. Camera cadence, final triangle tests, rendering, physics and save contracts are unchanged. Native comparison rays check exact hit identities, distances, positions and face indices with and without bounds; every final occluder vertex is enclosed.180 camera cases retain existing framing/obstruction requirements. Evidence: `evidence/phase-2-camera.json`.

111/111 full regressions pass (86.84s);25 route views/three title sizes retain maximum712 calls /2,249,364 triangles and175 geometries/11 textures on three returns. Isolated180-frame1080p captures observe rescue camera CPU p95=0.5/0.6ms (High/Low), versus prior1.0/1.1ms; rapids=0.8/0.8ms versus0.9/1.0ms. Historical timing samples do not prove causation or named-device performance. High crew/rapids/rescue CPU, High crew/trees GPU and every strict16.67ms frame-interval target still miss. M2 remains3/5, full M2-D PENDING, accepted scope2/100 and0/14 regions. Native recovery/game/release results and exact per-command scope are in the evidence report.

## Previous continuation — lean transmission and physical wake feedback / M2-D4

High water now captures actual submerged colour and native depth in a single render target/pass. The separate packed-depth target/material/pass is removed while capture resolution, reflections, absorption and foreground rejection remain. Wake direction/strength follow horizontal boat velocity relative to the shared current, so reverse/sideways travel trails correctly and passive drift creates no powered wake. Softer advected crest froth replaces the orthogonal chequer pattern. Particle heights use the identical scalar field, and distant whirlpool tracers skip simulation and instance uploads.

The original optical checks pass with zero observed RGB-channel difference in the controlled baseline experiment. Instrumentation verifies one High capture render and zero Low renders, native depth resize, quality lifecycle and full touched-state restoration after an injected exception. Seven actual-scene wake/pause/offscreen/re-entry groups pass. Full regression, final route/native-context and timing scope are recorded in `evidence/phase-2-water.json`. Protocol5 / basin-0.9 and all authority/save rules remain unchanged. Complete M2-D art, performance and human/device gates stay open; accepted scope remains2/100 and0/14 regions.

**111/111 regressions pass** (86.65s). Final25 route views/three titles,180 cameras, High/Low dry-deck/optics/native recovery and normal multiplayer flow pass. Eight180-frame1080p captures observe all Low CPU cases within4ms (1.7–3.1ms) and all sampled GPU cases within10.5ms. High crew/rapids/rescue CPU and every strict16.67ms frame interval still miss; no device or universal60FPS acceptance. Nested camera/reflection timing now guides the remaining work.

## Previous continuation — continuous geological banks / M2-D3

Repeated cliff boxes/ledge strips are replaced by continuous sampled rock profiles. Shared chunk positions/UVs/colours/normals remove the five-metre height steps; receding upper ledges stay outside the navigable face. Sediment/wet/moss colouring and a small periodic rock texture replace the stretched crossed-sine pattern. Trees/grass sit on the actual top triangles. Rescue paint follows the wall rather than intersecting it; the finish backdrop supports the last vegetation tile. Protocol5 / basin-0.9, authoritative banks, water/boat physics, checkpoints and finish rules are unchanged.

Independent seam/contact/ground-ray and actual rendered vegetation/paint checks are in `evidence/banks.json` and `graphics.json`. Full regression, camera, native graphics recovery, water optics, dry-deck and fresh timing scopes are recorded in `evidence/phase-2-banks.json`. Complete near-field art, human quality/readability and device/frame-budget acceptance remain open. M2-D stays PENDING; M2 remains3/5 engineering checks, accepted scope2/100 and0/14 regions.

**110/110 regressions pass** (250.67s);25 route/close-up views,180 camera cases, seven native-context/input groups, eight normal multiplayer browser groups and local deployment smoke pass. Max712 calls /2,249,940 triangles; three returns retain175 geometries/11 textures. The final eight180-frame1080p captures retain High crew/rapids/rescue CPU, Low rescue CPU, High trees GPU and all strict frame-interval target misses. The noisier first capture is preserved. Human/device performance is not accepted.

## Previous continuation — current-relative stereo water/paddle sound / M2-D2

The second presentation batch adds quiet stereo dock/river ambience, hull wash driven by water-relative speed, smooth rapid intensity and four seat-panned immersed brace layers. Seven fixed sources share one two-channel noise buffer; up to24 temporary cue voices are explicitly disconnected at end. A native output guard fixes a full-volume correlated-transient clipping failure that compressor tuning alone did not solve. Physics, protocol, multiplayer behavior and save format are unchanged.

**107/107 regressions pass** (84.54s); strict build and seven dedicated audio groups pass. Actual offline PCM covers stereo/relative wash/rapids/panning/volume, silence after lifecycle transitions, and200 overlapping break requests with a24-voice ceiling and zero remaining temporary voices. The built game verifies actual native output for gesture unlock, saved preferences, menu fade/resume, a synthetic visibility transition and actual peer disconnect/reconnect without replay. Evidence: `evidence/audio.json` and `evidence/phase-2-audio.json`. Human listening, physical speaker/headphone/device performance and regional production sound remain open. M2-D is still PENDING; M2 remains3/5 engineering checks, production scope2/100 and0/14 accepted regions.

## Previous continuation — simple animated invite lobby / M2-D1

The owner's lobby revision is implemented as the first M2-D presentation batch. Invite links join the crew directly, then ask new players for a short name. The browser remembers the name; the authority validates it and retains it on reconnect. Own avatar labels say **You**, crewmates show their entered names, and Ready adds an avatar tick. Players can Ready before the crew is full; all four still have to be connected/ready for launch. The compact panel has Copy Invite/Ready and collapsed paddle guidance; Change Name is in the menu.

Water geometry and foam, crew idle motion and gentle boat heave/heel animate at the dock. The authoritative hull, physics tick, rowing force, strokes and save progress stay anchored until launch. A closer lobby framing and separate bow/stern labels keep the avatars readable on five tested viewport sizes. Lobby tags/panel leave the quiet playing view. This replaces the older intentionally frozen visual lobby; no physics migration or new dependency is introduced. Protocol5 / basin-0.9 / waterworks-1 remains current.

**106/106 regressions pass** (84.00s), including real-server name ownership, Unicode/invalid payloads, reconnect and early readiness. New direct-invite/name/Ready/visual-motion/layout checks and existing onboarding, normal four-client game flow, touch/controller/context recovery, reconnect,180 camera cases,23 route views and dry-hull checks have scoped evidence in `evidence/phase-2-lobby.json` and per-fixture command logs. Full M2-D art/audio and M2-E human/device acceptance remain open; M2 stays3/5 engineering checks with accepted production scope2/100 and0/14 regions.

Current16-client/4-room named-snapshot load and release-package provenance are recorded in the phase/build evidence. Prior0.9 load and rescue build records are preserved separately. Timing/device acceptance is retained from M2-C2 with its misses; no new lobby FPS or human acceptance is claimed. No public rollout or private database modification.

## Previous continuation — Stillwater rescue / M2-C verified

**M2 now has3/5 engineering checks verified.** Structural hull agreement, authored bends/camera and recovery/onboarding are verified locally. M2-D near-field presentation and M2-E human/device acceptance remain. Production gates stay open: accepted scope2/100,0/14 regions. Current client/authority: **protocol5 / basin-0.9 / waterworks-1**.

The green-marked Stillwater eddy after Whitewater slows and recirculates an unpowered hull through the ordinary shared current/drag model. Crews can regroup, turn toward the channel and row out. The compact field has a smooth zero rim, no suction/vertical lift and no synthetic steering or teleport. All marked obstacles remain lethal. Warning/rejoin boards, bank paint and48 current-driven foam streaks make it visible; a brief entry hint has priority over checkpoint notifications. The checkpoint board was moved across the pool after a screenshot exposed it covering the crew.

- `npm test`: **tests104 / pass104 / fail0**,79.54s.11,076 field samples stay below1.563m/s; nine passive hull approaches and three four-paddle simulated exits pass without reset. Existing checkpoint/hazard/CCD/bracing, transport and save regressions pass. Reviewed0.5–0.8 canonical saves migrate transactionally; private databases are untouched.
- Four rendered clients use ordinary held inputs to exit the pocket, verify frozen physics/foam during native reload, resume the same seat and vote back to checkpoint380. This is automated steering from one authored approach, not a continuous human journey.180 camera poses, seven onboarding/input groups, normal eight-group browser flow and High/Low optics/dry-deck checks pass without errors.
-23 route views/three title sizes pass: maximum727 calls /2,252,580 triangles. Three revisits return to175 geometries/11 textures. Strict production build passes with the existing bundle-size advisory.
- Current0.9 load:120.059s,4 rooms/16 real clients,32 resets,4 reconnects; no invariant violations, stable8 bodies/817 colliders and all rooms disposed. Event-loop delay p95=11.575ms. This is local synthetic launch-area load, separate from the recovery-browser fixture.
- Eight moving-clock1080p High/Low captures now include the rescue bay. High crew/rapids/rescue render CPU p95 exceeds4ms; some GPU captures exceed10.5ms and frame-interval targets miss. Water-update CPU p95 is0.5–1.0ms locally. Performance/device acceptance remains open.

Evidence: `evidence/phase-2-rescue.json`, `rescue.json`, `rescue-browser.json`, per-fixture command logs and current `build.json`. Prior onboarding build and0.8 timing/load manifests are retained. No public rollout. **Next: M2-D boat/crew/water/audio and cliff/material polish**, followed by genuine four-human/newcomer/device evidence.

## Previous continuation — Phase 2 waiting-dock onboarding

**M2-C1 local paddle rehearsal is engineering verified; M2-C remains pending for staged rescue.** M2 stays active with2/5 checks verified and every production gate open. Current protocol5 / basin-0.8 / waterworks-1 is unchanged.

Waiting players can now see their own paddle catch, release, reverse and turn with existing keyboard/remapped keys, touch or a standard controller. This is a local visual preview: authoritative dock tick, hull pose, blades, acknowledgements and strokes stay frozen. Menu, blur, graphics recovery, countdown/cancel and launch clear the preview. A held keyboard repeat cannot restart cleared input; a controller must return to neutral. Real rowing needs a fresh input after launch.

The dock card and framing now leave the full boat/paddle envelope visible in five portrait/landscape viewports; playing framing resumes at launch.99/99 regression tests pass (76.93s), strict production build passes, and scoped browser/input/touch/camera evidence is in `evidence/phase-2-onboarding.json` with actual output in `phase-2-onboarding-checks.txt`. The existing bundle-size advisory and prior performance target misses remain.

G02 moves to IN_TEST. This rehearsal does not simulate hull response or establish newcomer understanding. Staged rescue, near-field art/audio, actual human traversal and consumer-device acceptance remain; accepted production scope is still2/100 and0/14 regions. The previous M2-B build manifest is preserved as `evidence/build-phase-2-bends.json`. No public rollout or private database change.

## Previous continuation — Phase 2 bends and camera

**M1 engineering verified; M2 active with2/5 engineering checks verified.** Current client/authority: **protocol5 / basin-0.8 / waterworks-1**. Five bends now run through Split Stone, Whitewater, Timber Works, Iron Narrows and Last Descent. Water/bed/foam, visible bank faces and convex colliders, hazards/movers, props/plants and camera share the same corridor. Launch/checkpoint identities and poses, finish and obstacle clocks remain unchanged; reviewed0.5/0.6/0.7 canonical saves can resume transactionally. QA used isolated in-memory saves.

- Corrected flow shearing after it exceeded the original2m/s limit: tangent/normal rotation now preserves speed.210 independent field samples agree within2.23e-16.6,688 visible bank samples agree with Rapier within0.0000818m;30 real bank rays within0.0000112m. The floor spans the whole curve and the connected-corridor check uses full rotated hull extents.
- Corrected a portrait gantry framing failure without relaxing screen limits. All132 camera poses pass without blocked sight lines. Four real rendered clients receive five authored authority poses and repeat held rowing; this is pose integration, not an uninterrupted human journey.
- Full regression: **tests96 / pass96 / fail0**,77.02s. Strict production build passes:832.51kB JS /231.74kB gzip, with the existing large-bundle advisory.8 built browser-flow groups,7 input/native graphics-recovery groups,21 route views/3 titles and optics/High/Low dry-deck checks pass without browser errors. Max723 calls /2,252,580 triangles; three revisits return to174 geometries/11 textures.
- Current-physics local load: **120.063s,4 rooms/16 clients,32 resets, one reconnect per room**, no invariant violations, stable body/collider counts and all rooms disposed. Event-loop delay p95=11.747ms. This is local synthetic launch-area load, separate from the bent-route browser fixture.
- Six new advancing-clock1080p captures retain GPU/High-rapids CPU target misses. Water-update CPU p95 is0.5–1.0ms on this host. Named consumer devices, human quality and production performance acceptance remain open.

Evidence: `evidence/phase-2-bends.json`, `phase-2-bends-checks.txt`, `river-bends.json`, `bends-browser.json`, updated camera/graphics/performance/load fixtures and `build.json`. cPanel ZIP matches the final bundle; no public rollout performed. Earlier hull-only build/load/timing records remain under the `-phase-2-hull` suffix.

**Next:** M2-C rescue/onboarding, then M2-D boat/crew/water/audio and cliff/material polish, followed by genuine traversal/newcomer/device acceptance. Production scope stays at the2-point baseline; no complete region or release gate is accepted.

VERDICT: PASS for M2-B engineering; production acceptance remains OPEN.

## Previous continuation — Phase 2 hull and collision batch

**M1 engineering is verified; M2 is active.** The first M2 batch replaces the invisible rectangular hull with a convex structural shell shared by the visible panels and water mask. Current client/authority: **protocol 5 / basin-0.7 / waterworks-1**. The loaded260kg mass, centre, inertia, rowing/buoyancy model, checkpoints and obstacle clocks are preserved. Thin gunwale trim remains cosmetic and needs human fairness review with the broader art pass.

The new near-miss fixture reproduced premature wrecks from Rapier's predicted contact pairs. Lethal detection now checks live manifolds every tick with a1mm tolerance, so separated pairs remain safe and later actual contact is still detected. Tests cover352 transformed panel samples (maximum surface error0.000000718m),48,076 volume classifications,28 rotated real-contact/near-miss cases and a separated pair closing on a later tick. Both0.5 and0.6 canonical saves migrate transactionally; rejected/finished records remain intact.

Final full regression: **tests90 / pass90 / fail0**,75.36s. Production build passes (830.81kB JS /231.19kB gzip; existing large-bundle advisory). Fresh built-game flow8 groups, input/context recovery7 groups,21 route views/3 titles, water optics and High/Low dry-floor fixtures pass with no browser errors. All checkpoint phases, CCD, moving hazards, bank/blade bracing and buoyancy/heel regressions pass. Latest timing captures retain CPU/GPU target misses; local automation does not certify production quality.

Evidence: `evidence/hull-collision.json`, `evidence/phase-2-hull.json` and `evidence/phase-2-checks.txt`. Earlier M1 measurements/provenance are preserved separately. M2's next work is coherent bends, staged rescue/onboarding and near-field art/audio, followed by genuine human/device acceptance. Whole-game production gates remain open and accepted scope stays at2 points.


Latest current-physics load check: **120.128s,4 rooms/16 clients,32 shared resets and one reconnect per room**; no invariant violations and all rooms disposed. Event-loop delay p95=11.780ms. This remains a local synthetic workload, not Internet or maximum hosting capacity.

## Completed phase — Phase1 engineering verified

**Phased delivery is active. M1 engineering checklist: VERIFIED. Production gate: OPEN. Next active focus: M2 premium playable slice.** The [five-phase board](PRODUCTION_TRACKER.html) now displays engineering checks separately from production acceptance and retains all139 original work items. It rejects phase skipping, unsigned production acceptance and verified phases with pending/evidence-free checks. See [PHASE_EXECUTION.md](PHASE_EXECUTION.md) and `evidence/phase-1.json`.

- Added `npm run test:load`: real co-hosted WebSocket rooms, independent shared pause/reconnect, resets, bounded physics, disposal, payload bandwidth, heap and event-loop measurements. Final run: **120.152s,4 rooms,16 clients,32 shared resets and one reconnect in each room**, no invariant violations, all rooms disposed. Outbound application payload averages18,955–18,962 bytes/client/second; event-loop delay p95=11.592ms. This is a local synthetic workload, not maximum hosting capacity or Internet acceptance.
- Added `npm run test:performance`: six1080p High/Low captures with90 frames each, CPU render/water timings, bounded asynchronous GPU queries, heap/DOM and actual Apple M4/Chrome/Metal metadata. The fixture now advances20Hz snapshots/waves/effects and asserts that geometry changes. Budget misses remain visible; measurement PASS does not certify60FPS.
- Optimized water rendering: shared scalar height sampling, per-row rapid strength,15,729→6,369 vertices and direct normals corrected for warped channel widths. **210 prior full height/velocity/zone outputs are bit-for-bit unchanged**. Sampled triangle-centroid height error≤0.0149171m; vertex truth and normal direction/unit length pass. Physics/version/save behavior stays basin-0.6.
- In the six moving-clock cases, water-update CPU p95 fell from**3.1–5.8ms to0.5–0.8ms**. Overall CPU/GPU budget gaps remain, especially High crew/rapids CPU and several GPU cases; they are recorded for later slice/performance work.

| Final check | Observed result |
|---|---|
| Strict check / production build | PASS;68 modules,830.52kB JS /231.00kB gzip; existing large-bundle advisory remains |
| Full regression | `npm test`: **tests85 / pass85 / fail0**,75.25s |
| Built four-client game flow |8 groups PASS, `errors: []`; final production bundle |
| Input / native graphics recovery |7 groups PASS, High and Low water capture restores, `errors: []`; controller hardware remains simulated |
| Route graphics / water optics / dry hull |21 route views +3 title sizes, depth/transmission fixture and7 wave phases in each quality PASS; no shader/browser errors; dry-deck difference0 |
| Complete-frame geometry | Max723 calls /2,235,244 triangles; three revisit cycles return to174 geometries /11 textures |
| Phase tracker |139 records +5 execution phases; validator/unit checks and6 browser UI checks PASS |
| Packaging | cPanel ZIP rebuilt from final bundle; no public rollout performed |

Corrections preserved in evidence: the initial performance fixture froze the clock after warmup, so its static timing file is labelled historical and is not used as a live-wave comparison. The valid pre-grid comparison is `performance-before-grid-optimization.json`. Coarser mesh spacing exposed aliasing in an every-seventh-vertex test; that test now checks every vertex while retaining its original coverage requirement. Full suite passes after these corrections. No physics or image-accuracy threshold was weakened.

Evidence: `evidence/phase-1.json`, `phase-1-checks.txt`, `load.json`, `performance.json`, `performance-before-grid-optimization.json`, `water-field-before-height-sampling.json`, `water-field-parity.json`, updated rendering/browser fixtures and tracker preview. These are engineering observations, not human acceptance records.

**Remaining/next:** M2 starts with hull/collision agreement, followed by authored bends, rescue/onboarding and near-field boat/water/crew/audio work. Four-human/newcomer and named-device acceptance remain open; fourteen completed regions, full streaming, real Internet/long-soak/host capacity and release gates remain in later phases. Accepted production scope stays at the owner-defined2-point baseline until reviewed gates pass.

VERDICT: PASS for Phase1 engineering; production acceptance remains OPEN.

## Previous continuation — full production tracker and foundation implementation

**Prompt status: PARTIAL for the complete game; this foundation batch is implemented and locally verified.** The owner-defined starting baseline is2/100 accepted scope points. No production acceptance is fabricated. Current client/authority: **protocol5 / basin-0.6 / waterworks-1**. Entries below are historical batches; their protocols/counts are not the current release record.

- Added [whole-project audit](PROJECT_AUDIT.md), [production plan](PRODUCTION_PLAN.md), editable JSON ledger, generated Markdown and [searchable dashboard](PRODUCTION_TRACKER.html). All49 production deliverables,14 region cards,80 obstacle concepts and10 signature encounters have status, owner, dependencies, acceptance, evidence and remaining work. Validator/CI reject missing evidence, cycles, stale reports and unsupported acceptance claims. The baseline remains2 accepted points while partial implementation is tracked separately.
- Physics: analytic wave rise/fall velocity drives water-relative damping; normalized16/20/24 point layouts preserve displacement; actual solid contact catches sideways stuck hulls while idle/open-water boats avoid false recovery. Twenty remains the live default. Original map/checkpoint indices and obstacle clocks are preserved.
- Rendering: deterministic vegetation builds only near the crew, disposes departed instance buffers, uses three detail tiers and cheaper distant shadows/trunks. Static map CPU data and shared asset geometry remain cached. Full world/audio streaming and production art are still open.
- Multiplayer:64KiB outbound pressure enters normal release/pause/reconnect; unacknowledged JOIN clients cannot grow snapshot/sync queues or issue gameplay commands; returning transport does not unpause play before handshake acknowledgement. Catch-up accounts for all discarded stall time, executes at most5 steps, and stops on the first finish step. Canonical basin-0.5 saves migrate atomically only after successful lease/version validation.
- Controls/recovery: saved unique letter/number remapping, always-available arrows, standard controller stick/D-pad/Start, neutral rearm after interruption, saved graphics/motion preferences, native WebGL loss release and restore/rejoin UI. Physical controller testing and human accessibility acceptance remain open.
- Audit corrected the current map count to**18 authored sections**,1,400m,10 checkpoints,28 rocks,26 spikes,32 pilings,5 logs,2 wheels and6 rapid fields. Old statements of19 sections were a documentation count error.

Observed final evidence:

| Check | Actual result |
|---|---|
| Strict TypeScript / production build | PASS;68 modules,829.89kB client JS /230.71kB gzip; existing >500kB bundle advisory remains |
| Complete Node regression | `npm test`: **tests81 / pass81 / fail0**,74.83s |
| Hydrodynamic comparison |18,720 accelerated ticks; all3 sampling layouts,3 payloads and3 initial heels pass; vertical derivative error<1e-6 |
| Four independent rendered clients | **71/71 controls checks PASS**, including all-seat WASD/arrows, mixed input, reload, blur and offline recovery |
| Built-game browser flow | **8 groups PASS**, `errors: []`; real create/join/four-ready, own input, shared physical rock wreck/sink, reload/retry and invite errors |
| New controls/graphics recovery | **7 groups PASS**, `errors: []`; persisted remapping/settings, controller API neutral rearm, native High/Low context loss/restore, resumed water capture and subsequent rowing. Controller hardware is simulated through the actual browser API. |
| Touch / silent-socket reconnect | **5 /4 checks PASS**, `errors: []` |
| Graphics | **21 views +3 title sizes PASS**, `errors: []`; complete-frame max**723 calls /2,253,676 triangles**, versus previous729 /6,033,248. Approximately63% lower peak triangles does not certify frame rate. |
| GPU residency/backtracking |12 transitions over3 cycles; <=6 vegetation chunks; identical instance rebuilds. Every start revisit returns to**174 geometries /11 textures**. |
| Camera / water optics | **92 camera cases PASS**; depth/transmission/foreground/Low/texture-toggling GPU fixture PASS; `errors: []` |
| Tracker integrity / browser UI | **139 records validated**; unit guard checks and5 browser filter/search/empty-state checks PASS |
| Final local production smoke | **8 checks PASS** at `http://localhost:2571`, protocol5 /basin-0.6; four WS seats, countdown, advancing clock, pause and reconnect |
| cPanel artifact | Rebuilt `releases/Bad-at-Boating-cPanel.zip` from final local build and version-updated smoke/setup instructions. No new clean dependency install or public deployment is claimed. |

Evidence: `evidence/production-validation.json`, `production-checks.txt`, `physics-sweep.json`, `graphics.json`, `accessibility.json`, `controls-after.json`, `browser.json`, `touch.json`, `reconnect.json`, `camera.json`, `water-depth.json` and `tracker-browser.json`. Screenshots include `production-tracker.png` and the updated route/boat views. The isolated preview uses an in-memory QA database; it does not replace any existing private save database.

Failure recovery: the sandbox initially refused local listeners; verification was rerun with authorized loopback execution. First forest batching exceeded the draw gate (815 calls), then60m species batching passed with a stricter final regression budget. A raw pre-JOIN test reproduced queue growth (62 instead of2), then passed after state guards. An expanded raw-reconnect test initially forwarded a missing response token and retained closed fixture workers; it was corrected to follow the installed SDK and explicitly close raw clients. Failed fixtures/port collisions were not counted as passing game runs. The final81-test run passed cleanly.

**PRD remaining:**0 production phases/regions signed off; four-human full route and>=12 newcomer study; authored bends/rescue and remaining connected regions; production assets/rigs/audio; physical controller and browser/device matrix; named-device frame budgets; real Internet recovery/capacity;30-minute four-browser and90-minute memory/thermal studies; full streaming; release/backup/rollback acceptance. Automated clients do not close these gates, and no100%/AAA/zero-glitch claim is made.

**Next concrete milestone:** a complete four-human Headwaters/Timber Gorge traversal using this build, logging every unfair contact, camera issue, control confusion and fatigue event; pair that feedback with named-device captures to author the winding/rescue slice. The tracker identifies every later implementation and acceptance dependency.

VERDICT: PASS for this local foundation batch; full-game production acceptance remains open.

## Previous continuation — crew animation and real-time endurance

**20 October 2026: this bounded animation/stability batch is complete and locally verified.** Protocol5, physics, world layout, controls and server authority are unchanged. The entries below this section describe previous batches.

- Crew rigs have staggered deterministic blinks, blade-focused head/shoulder effort, mirrored thumb grips and shaft-aligned wrists. A single two-bone solver now preserves both0.32m limb lengths for rowing and wreck reactions. Pose restoration after a wreck is deterministic; animation cannot move the physical hull.
- Stroke spray/ripples are gated on playing, afloat, fresh simulation snapshots (not paused/complete; emission stops after250ms without an update). Stale snapshots can no longer emit during lobby, pause, completion or sinking. A reset/new room/title clears transient effects. Ripple meshes share one retained geometry; their independently fading materials are disposed on removal.
- Added `npm run test:animation` for actual Chrome WebGL effect/resource and four-pose QA. Added opt-in `npm run test:soak` (default30 minutes; `SOAK_SECONDS=300` selects five minutes). The endurance fixture is a real-time in-process authority with four separate SDK/WebSocket connections and an isolated in-memory save database, not accelerated simulation or a public test endpoint.

Observed verification:

| Check | Actual result |
|---|---|
| TypeScript | `npm run check`: PASS |
| Complete Node regression | `npm test`: **tests71 / pass71 / fail0** |
| New rig checks | PASS across all seats and repeating forward/reverse/turn cycles; real shaft grip error<0.025m,0.32m arm lengths, wrist axes, blink cadence and wreck-to-pose restoration |
| Real-time four-client endurance | **300.169s PASS**:24,423 received snapshots,753 catches,12 shared resets and7 rotating-seat reconnects; no invariant violations; maximum observed snapshot gap91ms |
| Authority resource samples |21 samples with explicit GC; **8 bodies /817 colliders throughout**; heap33,615,760→35,905,784 bytes (+2.18MiB). Room disposed after all clients left. This bounded observation is not a leak-free guarantee. |
| Chrome effects/resource fixture | PASS over480 active rendered frames: one ripple geometry,206 GPU geometries at both active/steady samples, bounded24–28 ripples/84 particles; all transient effects drained or cleared in stale-snapshot/pause/reset/lobby/finish/sunk/title cases; `errors: []` |
| Crew pose screenshots | **4 PASS**, catch/pull/recovery/reverse; reviewed `evidence/crew-*.png`; `errors: []` |
| Route/title graphics | **21 views +3 title sizes PASS**, `errors: []`; final max729 calls /6,033,248 triangles within unchanged fixture budgets |
| Production build | PASS,68 modules,823.93kB JS /228.67kB gzip; existing large-bundle advisory remains |

Evidence: `evidence/soak.json`, `evidence/animation.json`, updated `graphics.json`/screenshots and `network-stress.json`. The full suite retains the existing actual networking, lifecycle, persistence and physics regressions. No new four-browser control run or public hosting run was needed/claimed for these client animation/effect changes. The existing preview on localhost:2569 serves the refreshed static build; no authority restart or crew invalidation was needed. The cPanel ZIP was regenerated.

**PRD remaining:** the actual30-minute Internet/browser soak, hosting capacity/room churn, hardware memory/frame budgets, human full-route/newcomer study, production skinned rigs/animation/audio, winding/rescue encounter, streaming, remaining regions and release acceptance. The five-minute SDK test does not close those gates.

**Next game milestone:** improve riverbank/obstacle composition and rescue readability using a four-human route recording, while completing the longer browser/network soak. Production art and human gate remain open; the full game is not declared finished.

VERDICT: PASS

## Previous handoff continuation — lifecycle and second-act review

**20 October 2026: this batch is implemented and locally verified. The full game/PRD and public release remain incomplete.** Claude's existing uncommitted work was preserved, audited and corrected. The current authority/client use **protocol5 / basin-0.5 / waterworks-1**. Sections below this one are historical snapshots; their older routes/protocols/counts are not the current release status.

- Four-ready launch has a real three-second countdown. Unready/disconnect cancels it; a returning lobby member must ready again. Countdown audio now runs during lobby snapshots and emits once per beat.
- Afloat checkpoint return requires a strict majority within15 seconds: **3/4**, with duplicate votes ignored and usable Agree/Withdraw actions. Drop, leave, recovery, reset and finish clear stale votes. Sunk retry remains immediate. Completed boats reject checkpoint-reset commands, preserve completion when a finisher leaves, and Row Again returns friends to the four-ready dock.
- Finish displays **crew session time** based on active simulation ticks, excluding lobby/disconnection pauses. This is not persisted total-voyage timing. Checkpoint/finish changes are saved immediately, while routine heartbeat/retry remains throttled.
- Keyboard and each touch pointer own independent held inputs. Four directional touch buttons replace ambiguous screen-half diagonals. Practice Solo and the permanent stroke HUD are removed; stroke count remains in the menu. Existing all-seat WASD/arrows and combined crew forces are retained.
- The inherited extension now has **1400m /19 beats /10 canonical checkpoints**, preserving the first nine checkpoint indices. Both wheels have real synchronized collision and marked clear bypasses. The first bypass is screen-right; the mirrored second wheel's bypass is screen-left. Its axle, warning text, Act2 camera volumes and final rapid warnings were corrected. Old Waterworks is no longer labelled as the finish.
- Same-tick checkpoint relocation now moves/resamples the water window immediately; screenshot review caught the previous stale mesh showing bare riverbed. Security headers and room-creation admission limits were checked; the per-IP limit uses the framework AuthContext before allocation. Trusted hosting must sanitize forwarding headers (see CPANEL_SETUP.md).

Observed verification for this batch:

| Check | Actual result |
|---|---|
| TypeScript and complete suite | `npm run check` PASS; final `npm test`: **tests69 / pass69 / fail0** |
| Four rendered multiplayer clients | **71/71 PASS**, `errors: []`; all-seat keys/arrows, simultaneous inputs, vote-backed fixture resets, every-seat reload, blur and offline recovery |
| Native touchscreen | **5 checks PASS**, `errors: []`; held forward/reverse/both turns, blade release and menu/lobby behaviour |
| Silent native socket recovery | **4 checks PASS**, `errors: []`; watchdog, no stale input replay, token-refresh reload, resumed rowing |
| Complete game-flow browser fixture | PASS, `errors: []`; title/join/ready, layouts, real obstacle wreck, shared retry and wreck reconnect |
| Graphics | **21 views +3 title sizes PASS**, `errors: []`; max751 calls /6,032,896 triangles within unchanged fixture budgets; both wheel phases checked |
| Authored camera fixture | **92 cases PASS**, `errors: []`; both viewport shapes, reverse/roll/edge cases, new Act2 views; screenshots reviewed after water fix |
| Production build | PASS,68 modules;821.19kB JS /227.64kB gzip. Existing >500kB bundle advisory remains. |
| Local deployment smoke | **8 checks PASS** on final preview `http://localhost:2569`, protocol5, including all four real WS seats and reconnect |

Evidence: `evidence/controls-after.json`, `touch.json`, `reconnect.json`, `browser.json`, `graphics.json`, `camera.json`, `network-stress.json` and checked screenshots. New lifecycle tests cover canceled launch, consent/withdrawal/expiry, immediate save acknowledgement, completed departure/restart and real HTTP room-admission limiting. These are automated local fixtures, not four-human traversal or hardware acceptance. Four simultaneous renderers increased final suite wall time; that is not a frame-rate or capacity certification.

The local preview was restarted with the existing private database. Transient crew links can expire; refresh all tabs and create/join a fresh crew, or Continue Voyage from a saved checkpoint. The cPanel ZIP was regenerated from the final build. No cPanel configuration/public rollout is claimed for protocol5; the owner can run `bash deploy.sh` and then the documented external smoke.

**PRD remaining:** production assets/animation/audio, full human navigation/balance and newcomer study, winding/rescue encounters, named-device frame/memory budgets, long Internet/load soak, streaming, additional regions and release gates. No phase/region acceptance gate is closed by this batch. See PRD_PROGRESS.md.

**Next concrete game milestone:** run a four-human traversal of the1400m prototype, then use observed unfair-contact, camera/input and pacing notes for the next environment/animation polish batch. Hosting remains owner-managed.

VERDICT: PASS

## Historical continuation — four-player WASD and connection recovery

**Current prompt: implementation and local verification COMPLETE; public rollout PENDING.** The public health endpoint still returned protocol 3 after this batch; the fixed repository and local preview use protocol 4. Run `bash deploy.sh` on cPanel, then refresh all four crew browsers. Checkpoint save layout/physics identifiers remain compatible.

- **Straight W/S from every seat:** requested straight-rowing assistance applies normal water-reaction force through the hull's centre of mass, avoiding unintended single-sided yaw. Deliberate steering and solid bracing retain the blade lever and existing force caps. Buoyancy, current, hazards, shared sinking and checkpoint ownership remain authoritative.
- **Correct visible steering:** A/Left turns left and D/Right turns right through the actual +Z-facing gameplay camera. The previous tests had mistaken numeric yaw signs for visible direction; camera-projected regressions first reproduced that inversion, then passed after correction.
- **All crew inputs count:** each member sends validated held axes on change plus a 10Hz heartbeat. Independent server-side controllers generate complete strokes at 60Hz. Two forward-rowing members and two steering members contribute simultaneously; no last-player-wins input replacement occurs. Stale commands lift the blade after one second without a heartbeat. Low-level bounded blade intent remains available for existing fixtures.
- **Connection recovery:** SDK reconnection now works during the first five seconds after joining. Resume/sync/token storage runs after the JOIN acknowledgement and token refresh, fixing the expired-token failure on a later reload. Five seconds without snapshots triggers a fresh connection attempt. Disconnected crews see a countdown and usable Main Menu; abandoned room callbacks cannot return a player to an old crew. Pre-drop held commands are released, not replayed.

Observed checks:

| Check | Actual result |
|---|---|
| TypeScript and complete authority suite | `npm run check` PASS; `npm test`: **63/63 PASS** |
| Four independent browser clients | **71/71 PASS**, `errors: []`; all-seat WASD, arrows, own-seat isolation, simultaneous crew actions, diagonals, aliases, dialogs, every-seat reload, blur, actual offline/reconnect and offline Main Menu |
| Straight-course browser traces | **15 W/S/Up/Down samples PASS**; maximum projected heading deviation 0.00005791, below the 0.02 regression bound |
| Silent native WebSocket recovery | **4/4 PASS**, `errors: []`; watchdog reconnect, no old input replay, refreshed-token reload and subsequent rowing |
| Updated real WS impairment fixture | PASS for 80±35ms/10%, 180±70ms/25%, 300±100ms/15% ordered application-message drops; each seat adds at least two catches per profile; blackout/reconnect race/expiry/forgery checks pass |
| Production build | **68 modules, 814.23kB JS / 225.76kB gzip, PASS**; existing chunk-size advisory remains |
| Updated local preview | `http://localhost:2569`, protocol 4; **8 deployment smoke checks PASS** |

Evidence: `evidence/controls-after.json`, `evidence/reconnect.json` and `evidence/network-stress.json`. Earlier four-renderer runs exposed unreliable wall-time stroke counting under local machine contention and then the real post-reconnect token failure. The final control fixture caps only test rendering near 15 FPS and measures held duration with server ticks, verifying the real input/network path at low frame rate. It is not a hardware frame-budget, long-soak, TCP packet-loss or human playtest result. The silent snapshot fixture preserves a real native socket and withholds application snapshots from the SDK; no browser offline/close event is injected for that check.

The local preview authority was restarted with the existing persistent database; transient crew links expire on restart. The cPanel ZIP was regenerated from the verified build. No cPanel account configuration was changed or public protocol-4 release claimed.

**PRD remaining:** T009/T013/T016 remain IN_TEST pending actual four-human usability/network-change observation and production acceptance. The wider PRD still needs the newcomer study, production assets/audio, hardware performance and long-soak/load evidence, streaming, further regions and release gates. No overall completion percentage or zero-glitch guarantee is inferred from automated tests.

**Next milestone:** deploy protocol 4 with `bash deploy.sh`, rerun the public deployment smoke, then play one complete route with four humans and record input fairness, disconnect recovery and pacing issues.

VERDICT: PASS for this local controls/recovery batch; public rollout and human production gates remain open.

## Latest continuation — gameplay water depth, camera readability and multiplayer regression

**Current request: COMPLETE for this verified implementation batch.** Hosting remains with the user; this work changes only the playable client and its local verification.

- **Water:** High graphics now captures a bounded underwater riverbed color pass plus packed depth pass, then applies screen-space displacement, depth absorption and contact foam. Foreground samples are rejected so crew, hull and banks do not bleed into water. The title keeps reflective analytic water before a playable river exists; Lower Graphics skips both transmission passes. The riverbed is visual-only and stays below the physical lane.
- **Camera:** authored smooth volumes cover Whitewater, Timber Works, Iron Narrows and Last Descent. Reverse travel looks upstream, portrait framing stays inside the channel, and two collision rays prevent a gantry or cliff from hiding the boat.
- **Rendering recovery:** High route capture originally exposed a WebGL sampler warning. The underwater capture now excludes shadow samplers; all graphics fixture views reran with `GL_INVALID_*` treated as a failure and ended with `errors: []`.
- **Multiplayer regression:** create/join/four-ready, own-seat continuous controls, mouse ignore, full crew rejection, shared physical break/sink, refresh during failure, checkpoint retry, reconnect, input forgery and the authoritative save/network suites were rerun. The two deliberately requested full/expired invite URLs return handled 522 responses in the title UI; those expected protocol checks are not JavaScript or WebGL failures.

Observed final checks:

| Check | Actual result |
|---|---|
| TypeScript + authority suite | `npm run check` PASS; `npm test` **60/60 pass** |
| Water GPU fixture | PASS; distinct shallow/deep transmission, foreground guard, Low fallback, bounded 1280×960 target, `errors: []` |
| Camera route matrix | **68/68 PASS**, `errors: []` |
| Graphics/title/audio | **17 route views + 3 title sizes PASS**, `errors: []`; High capture 2–8 calls / 288–1,152 triangles, Low 0 |
| Landing hull/water regression | High and Low PASS across seven wave phases; dry deck difference 0 |
| Held controls | **25/25 PASS**, `errors: []` |
| Four rendered clients | **8 groups PASS**, `errors: []`; real create/join/ready/input/collision/sink/refresh/retry/invite paths |

Evidence: `evidence/water-depth.json`, `camera.json`, `graphics.json`, `landing.json`, `controls-after.json` and `browser.json`. These are isolated local Chrome and simulation checks, not human playtests or named-device performance proof.

**Local rollout:** the existing authority on `127.0.0.1:2569` serves the rebuilt `index-B63RKdDq.js` client with no-cache HTML. No authority restart or room reset was needed; refresh the game page to load this client.

**PRD:** 9 phases have partial/review material, 4 remain NOT_STARTED, 0 are signed off and 0/14 regions are production-ready. Human route study, 16/20/24 buoyancy comparison, full capsize/grounding recovery, production assets/audio, named-device/soak testing, streaming and launch gates remain open. Next game work should be an evidence-led grounded/capsize recovery pass, followed by genuine four-human route feedback.

VERDICT: PASS for water/camera/multiplayer regression batch; whole-game production completion remains open.

## Latest continuation — durable voyages, working waterwheel, network hardening and cPanel

**Current broad request: PARTIAL.** Implemented and verified the concrete save/encounter/network/deployment-preparation batch. The whole production PRD and public release are not complete. The user selected cPanel Node App for their deployment; no hosting account/domain was accessed.

- **Durable voyage:** Node24 SQLite WAL/FULL transactions save server-owned canonical checkpoint/finish records. Private43-character recovery credentials are hashed in storage and sent only within the crew; invite URLs never contain them. Atomic revision checks and live-room leases reject stale writes/duplicate live restores. Continue Voyage, private recovery-code copy and Join Crew recovery support are implemented. Four-ready launch preserves the loaded checkpoint. Version-incompatible/damaged saves are rejected and retained; write failures are surfaced. Completed recovery codes cannot reopen a finished record as an unfinished checkpoint; active-crew Row Again remains explicit, with regression coverage. This is single-authority checkpoint persistence, not arbitrary pose restoration, accounts or distributed matchmaking.
- **Working waterwheel:** eight rotating paddles, spokes and rims at465m have real Rapier kinematic colliders. Rendering shares the authoritative18-second clock; retry preserves phase. Red moving parts/warnings and a permanent left bypass are present. Actual hull contact breaks/sinks once; blade-only contact retains normal brace rules. The sampled full-route hull corridor includes the conservative wheel envelope.
- **Network hardening:** real WebSocket relay profiles80±35ms/10%,180±70ms/25%,300±100ms/15% application-message drops, plus uplink blackout, duplicate reconnect race, two simultaneous reconnects, real2-second test grace expiry (production90s), replacement seat and200-message forged burst. ACKs remain monotonic, state finite and blade force bounded in these runs. Disconnect releases all pre-pause blade intents. Graceful shutdown now catches expected reconnection rejection instead of leaving an unhandled promise. This is ordered application-message impairment, not TCP packet-loss emulation, long soak or host capacity proof.
- **cPanel package:** `releases/Bad-at-Boating-cPanel.zip`, `docs/CPANEL_SETUP.md`, CommonJS app.js/app.cjs bootstrap, bundled ESM authority and prebuilt client, production-only package manifest/lockfile and a four-client deployment smoke script. Clean extracted-package dependency installation and startup passed locally. Requirements are Node24, actual HTTPS/WSS forwarding, one persistent process and private local save storage. Provider capabilities/public WSS are unverified. Optional Docker/Compose and GitHub Actions definitions exist; Docker is unavailable here and remote CI was not run.
- **Human QA preparation:** `docs/PLAYTEST_KIT.md` provides the unrun12-newcomer/three-crew study script, observations and questions. No synthetic clients are counted as humans.

Observed final checks:

| Check | Actual result |
|---|---|
| `npm run check`, `npm test` serial | **tests58, pass58, fail0** |
| Actual crash/SIGKILL database restore | CP4 restored atz260 in a fresh lobby; duplicate active restore rejected |
| Held-key browser regression | **25/25, errors[]**; all WASD/arrows, physical direction, own-seat and lifecycle release |
| Four-rendered-browser flow | **8 groups PASS, errors[]**; create/join/ready, real held strokes, rock contact/shared sink/reload/retry and responsive menu |
| Graphics/audio | **17 authored views +3 title sizes PASS, errors[]**; wheel/timber quaternion/pose agreement; bounded audio and mute |
| Durable save browser | **6 checks PASS, errors[]**; real seeded server save/recovery/launch/copy/continue/reload/duplicate rejection |
| Clean cPanel runtime | **98 production packages installed**, CommonJS startup and eight four-client deployment checks PASS on2571 |
| Production build | **65 modules;806.65kB JS /223.42kB gzip; PASS**; existing large-bundle advisory remains |

Evidence: `evidence/network-stress.json`, `save-browser.json`, `controls-after.json`, `browser.json`, `graphics.json`, `cpanel-package-smoke.json`, `deployment-local.json`, `build.json`, `render-waterwheel.png`, `voyage-continue.png` and `voyage-restored.png`. Browser evidence uses isolated development Chrome155, not the user's disabled native browser surface. Graphics fixtures are authored views, not human traversal or target-hardware profiling.

Verification recovery: the initial sandboxed full run could not bind localhost and was stopped; the authorized network-enabled run proceeded. One full run then recorded57passes/1failure because the reconnect fixture closed its replacement socket before the JOIN acknowledgement, checking only the server's earlier onReconnect state. It now waits for a snapshot received over that replacement socket before testing the next completed reconnect; the final full run passed58/58. Earlier relay per-message timers reordered frames; the relay now preserves FIFO order, matching WebSocket transport. These fixture corrections are not represented as a product ACK fix. A genuine expected-shutdown reconnection rejection was separately fixed in BoatRoom. Offline package install missed a cached dependency; exact production dependencies then installed successfully from the registry. No failed attempt is counted as verification success.

**Local rollout:** protocol3 / basin-0.5 authority and matching client now serve http://localhost:2569. The previous protocol2 volatile crew was ended for this authorized update; refresh and create a new crew. Only future checkpoints saved by this version can survive restarts; old transient progress cannot be retroactively recovered. Destination cPanel deployment remains with the user; use the included smoke test after setup.

**PRD:**9 phases now contain partial implementation/review material,4 remain NOT_STARTED,0 signed off,0/14 production-ready regions. Phase11 gains deployment preparation, not a release-candidate signoff. Still open: genuine four-human route and12-newcomer study, natural bends/rescue/camera volumes,16/20/24 buoyancy comparison, full capsize/grounding, production rigs/audio/water refraction, measured named-device frame/memory and30/90-minute soak/load, streaming, regional production/lava, public hosting/portal/security and launch gates. Next operational step: cPanel deployment + actual WSS smoke, followed by genuine crew study and evidence-led route/camera tuning. Implementation-only work can continue on the explicit technical backlog; this batch does not claim all pending game work is finished.

VERDICT: PASS for this verified implementation batch; whole-game production completion remains open.

## Prior request — recognizable rocks, trees and grass

Replaced smooth pale shore boulders with seeded chipped/uneven stone shapes, mineral grain/bump detail and wet/moss vertex coloration. Lethal river rocks use the same material/detail pass inside their existing spherical physical envelope. Pines now have branched bark trunks, boughs and needles; broadleaf trees have forks/twigs and individual leaves instead of cone/ball crowns. The ridge forest shares these assets. Grass uses continuous curved/tapering blades and fern fronds, replacing isolated reed cones and shrub blobs. Bank materials are tiled at a sensible world scale, plants avoid shore-rock roots, and start/transition placement uses actual bank heights. Background mountain bases were moved outside the river.

Assets share geometry/materials and trees/undergrowth are instanced per route chunk. Distant trees use a subset of complete leaves; Lower Graphics uses lighter foliage and55% undergrowth density as well as the existing reflection/shadow/DPR reductions. This is a procedural art pass, not scanned vegetation, production art signoff or a named-device frame-rate guarantee. The collision/physics/protocol and WASD controls were unchanged; the live authority was preserved and the current crew page needs a refresh to load the rebuilt client.

Observed: production build PASS,65 modules, JS803.83kB /222.44kB gzip; the existing bundle-size advisory remains. Full serial suite: **tests52, pass52, fail0**. New geometry checks cover finite normals/positions, plant bounds, asset budgets, reduced foliage and lethal stone containment. Final GPU regression: **PASS,16 views,3 title sizes,errors[]**, including shore/tree/grass High/Low close-ups, route game cameras and offline audio/mute. Shore counters: High1,937,708 triangles /139 calls; Low1,363,896 triangles /95 calls, a29.6% recorded triangle reduction. Exact final results are in `evidence/graphics.json`. Prior four-browser/25-keyboard checks are historical to the immediately preceding controls change and were not repeated for this art-only pass. The current complete Node authority/input/physics suite passed.

Visual iteration caught repetitive stone rings, thin pine boughs, segmented grass, plants rooted in boulders and plants outside the finite launch bank; these were corrected. The first distant-foliage fallback reduced recorded shore triangles by19.7%, below the test's20% threshold. Low undergrowth density was then reduced as well, and the full render regression was rerun. Counters are finite fixture observations, not p95 CPU/GPU/memory profiling. Audio output/mute checks remain part of the render harness; human art/fun/mix review is still open.

Evidence: `evidence/render-shore.png`, `render-trees.png`, `render-grass.png`, `render-shore-low.png`, `graphics.json`, `build.json`. PRD remains **8 partial/review phases,5 NOT_STARTED,0 signed-off phases and0/14 production-ready regions**. Next: actual four-human route/control/readability feedback, waterwheel/rescue encounter, durable checkpoint saves and network impairment tests; production environment assets/biome variation/wind and measured performance remain open.

## Prior request — one held key repeats a complete stroke

Implemented the user's replacement for manual paddle positioning: W/Up forward, S/Down reverse, A/Left left turn, D/Right right turn. A held action repeats dry reach → catch → power → lift every1.7s; release lifts the blade. Opposite keys cancel; aliases do not double effort or cancel each other on one alias release. Forward+turn rests the inner blade and rows the outer blade. Turn direction accounts for paddle side at both bow and stern. Each browser still owns one paddle, so unbalanced individual forward strokes can turn the shared boat; crew coordination remains part of play.

Held input is sampled at30Hz independently of rendering/OS key repeat. Menus, blur, hidden tabs, pause, completion, reset and reconnect stop/restart the cycle dry; long scheduling gaps restart recovery. Existing server blade speed/acceleration/immersion/force validation is unchanged. No direct hull steering or new protocol fields were added, and the live authority was preserved. Refresh the current crew page on2569 to load the rebuilt client.

Observed verification for this request:

- `npm run build`: PASS,64 modules, JS797.35kB /219.87kB gzip. Existing chunk-size advisory remains.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: **tests50, pass50, fail0**. New generated-trajectory tests run through actual Rapier at30Hz input/60Hz physics. Coordinated W advances6.984m in6.8s, S reverses6.984m, each paddle records five catches, balanced yaw is effectively zero. Every individual seat has correct forward/reverse surge and left/right yaw. Additional targeted rowing rerun after adding diagonal assertions: **tests3, pass3, fail0**; forward+turn advances/turns correctly and the inner side has zero catches.
- `node tests/controls.mjs`: **PASS,25 checks, errors[]**. Three SDK peers plus one rendered Chrome client form a private four-ready friends crew. All eight WASD/arrow keys repeat2–3 server-confirmed catches during a3.8s hold; snapshot motion/yaw agrees with requested direction. Other blades remain unchanged. Key-only uppercase W, alias release, opposite-key cancellation, button focus, menu/resume, same-seat reload and blur/release also pass.
- `GAME_URL=http://localhost:2569 node tests/browser.mjs`: **PASS,eight groups, errors[]**. Four independent rendered clients hold W continuously into the physical rock; first failure observed is breaking, shared sinking/reload/retry restores all four afloat. Clean title, private join/four-ready, own-seat repeated Up, ignored mouse, menu audio and landscape/portrait framing remain verified. The two HTTP522 console entries are deliberate full/expired-invite requests handled by the title UI.

Evidence: `evidence/controls-after.json`, `browser.json`, `controls-fixed.png`, `game-playing.png`, `build.json`. Primary sources and design inferences are in `RESEARCH_GAMEPLAY.md`. These are local automated tests, not four-human usability, Internet impairment, target-hardware performance or AAA acceptance. Prior graphics/audio/landing fixtures below are historical; this request did not change those render systems. PRD remains **8 partial/review phases,5 NOT_STARTED,0 signed-off phases,0/14 production-ready regions**. Next: four-human control/route feedback, waterwheel/rescue encounter, durable checkpoint saves and network stress.

## Prior fix — paddle does not respond to arrows

The user confirmed the paddle itself stayed still. The keyboard handler rejected events targeting any button and read only `event.code`; the canvas could not receive focus. Arrows now normalize from `code` or `key`, button focus no longer blocks rowing, and the canvas receives focus after join, four-ready launch, resume and retry. Editable fields and open dialogs still block rowing; blur/hidden state still release the blade. Mouse steering and authority rules are unchanged. These are verified failure paths in the handler; the exact cause in the user's tab was not inspected because native browser control is disabled.

Observed: `npm run build` passed (64 modules, JS796.49kB /219.58kB gzip). The full suite run serially reports **tests46, pass46, fail0**. Targeted Chrome friends-room regression records ten passing checks: four-ready focus, Up/Down/Left/Right, button focus, key-only events, dialog blocking/resume, same-seat reload and blur release. Server blade snapshots confirm only the assigned seat moves. Evidence: `evidence/controls-after.json` and `controls-fixed.png`. Three fixture SDK peers plus one real rendered browser form an isolated private crew; this is not a four-human playtest.

The first regression attempt failed because its body-click locator targeted a zero-height body; a viewport click corrected the test harness. The first concurrent full suite had45 passes and one network test timeout waiting five seconds for its test server to boot under browser/physics load. The unchanged full suite passed46/46 serially. No product network timeout or physics setting was relaxed. The prior broad four-browser/render regressions were not repeated in this focused fix.

The rebuilt client is served on2569 by the existing authority; refresh the current crew page to load it. No server restart was needed. PRD counts remain **8 partial/review phases, 5 NOT_STARTED, 0 full phases signed off and 0/14 production-ready regions**. Next work remains waterwheel/rescue encounter, durable checkpoint saves, network impairment tests and genuine four-human full-route validation.

## Prior fix — landing floor covered by water

The new screenshot exposed a separate cause from the earlier plank protrusion: title preview hull Y equalled the sampled water height, while floor and rendered river both used a −0.015m offset. Waves crossed/coplanared the floor. Corrected the title draft to +0.08m and excluded river fragments within the actual tapered intact hull volume using the rendered pose's inverse matrix. The exclusion switches off immediately for breaking/sunk and restores on reset, including at an unchanged water tick. Server physics/protocol/layout were not changed.

Observed this fix: `npm run build` passed (64 modules, JS796.19kB /219.40kB gzip); `npm test` reports **tests45, pass45, fail0**. `node tests/landing.mjs` passed a real-GPU pixel comparison across seven animation phases on High and Low. Old behavior is reproduced with maximum deck difference131/130; corrected deck difference is0 at every phase, including the old intersecting draft with the mask enabled. Exterior water remains visible (difference229–248 against a water-hidden reference). No page/shader errors. This is a finite sampled regression, not an all-camera/all-wave proof.

Evidence: `evidence/landing.json`, `landing-dry-high.png`, `landing-dry-low.png`. Local production server on2569 serves the rebuilt client; refresh required. No authority restart or crew invalidation was needed. Earlier twelve-view/four-browser checks below are historical to the route iteration; they were not repeated for this client-only fix. Current full Node/network suite and targeted rendering regression passed. PRD phase counts and next milestone are unchanged.

## Prior request — screenshot fixes and continued game work

| Request | Delivered | Boundary |
|---|---|---|
| Boat-bottom glitch | Rectangular planks were crossing the tapered hull; floor polygons now fit inside it, underside is closed, lower strakes follow the cross-section and benches are trimmed | Physical hull is still a simplified cuboid; natural water reflections remain |
| Remove logo-overlap text and extra title entries | Title contains logo, Play with Friends and Join Crew; Practice, Controls, eyebrow, subtitle, footer and location copy removed | Controls remain contextual in the game menu/lobby; there are no floating crew-name labels |
| Continue major game work | 820m initial authored Headwaters→Timber Gorge route; thirteen beats, nine checkpoint positions, three rapids fields, slalom/iron narrows, two extra moving timber logs, in-world warnings, checkpoint bays, timber works and final bridge | Straight centerline and procedural art remain initial slice work; no full human traversal or promised duration |
| Water/graphics | Shared rapids height/current, following water window, twelve nearest foam obstacles, merged/cullable static draw chunks, grounded ridge foliage and camera look-ahead | Draw culling is not loading/eviction streaming; no named-hardware frame claim |
| Game sound | Generated water wash, stereo catches, wood break and checkpoint/finish tones; gesture unlock; saved mute/volume; menu/background/disconnect silence | Initial synthesized palette; no production music, recording mix or human listening review |
| Multiplayer reliability | Existing create/join/four-ready, arrow-only seat ownership, pause/reconnect, one-shot wreck and shared retry preserved; completed room now holds pose/input until restart/reset | Real Internet latency/loss/long-soak/load and duplicate-token expiry matrix remain open; zero defects/AAA quality are not certified |

The user's requested name remains **Bad at Boating**. User instructions supersede attached design text. This continuation begins the vertical slice; it does not close a production region.

## Verification observed this session

- Final production build: TypeScript/Vite passed; **64 modules**, JS **794.84 kB / 218.92 kB gzip**. Existing >500kB chunk advisory remains.
- Final full suite: **`tests 44`, `pass 44`, `fail 0`**. Eight route cases include bounded/continuous current and width; 72 checkpoint×clock phase placements; real rock/spike/timber contacts; narrows-bank brace; sampled connected hull corridor; final objective/reset. Hull containment and water-window/physics consistency also pass.
- Additional actual-authority integration: **`tests 1`, `pass 1`, `fail 0`**. A local real Colyseus room is positioned at the finish by the test owning its server instance; simulation/pose/ack stay frozen, and the ordinary restart command restores play. No test teleport endpoint is added to production.
- `npm run check`: `tsc --noEmit`, exit0.
- Production four-browser regression: **`result: PASS`**, eight groups, seats0/1/2/3, **`errors: []`**. Actual arrow streams reach a marked rock, first observed condition is **breaking**, all clients share sink/crash, refreshed seat retains wreck, and retry produces **`[ 'afloat', 'afloat', 'afloat', 'afloat' ]`**. Menu mute/unmute and audio unlock pass. Companion clients use 640×400/Lower Graphics to limit one-machine GPU contention; first-client layout checks cover907×510,700×982,480×900.
- Final graphics/audio run: **`result: PASS`**, twelve labelled render views (crew, underside, spikes, log, vortex, lower-graphics vortex, wreck, gorge, rapids, timber, narrows, finish), three title sizes and **`errors: []`**. All three visible timber poses match the shared clock. Fixtures are authored views, not full route traversal.
- Offline stereo audio: audible peak **0.171093**, RMS **0.012793**; muted peak/RMS **0**; finite samples and intended port-side pan pass. This validates output/envelopes/mute, not human sound quality.
- Final diagnostic draw counters: High319–463 calls across recorded views; Lower Graphics vortex219. Reflection adds a mirror pass; counters are not a target-hardware frame profiler. No performance percentage or 60fps certification.
- Final underside and route captures inspected. Floor/low strake protrusions no longer appear in inspected close-ups; grounded ridge trees and gantry clearance were corrected after visual review.

The full suite including the finish integration passed: **44 tests, 44 passed, 0 failed**. Machine-readable records: `evidence/browser.json`, `evidence/graphics.json`, `evidence/build.json`.

## Verification failures and practical limits

The first graphics run caught nonzero initial mute output caused by a gain fade at offline time0; initial gain is now set immediately, then ordinary live changes use a short smoothing envelope. Its rerun records silence. A deprecated Three shadow setting was replaced by PCFShadowMap.

One concurrent four-browser run lost a readable blade snapshot under machine load; a later run missed its transient breaking wait while the boat had already sunk. Companion viewports were reduced, disconnect codes exposed only in DOM diagnostics, and collision waiting now accepts the persistent sunk state as well as breaking. Final regression observed breaking and passed. These checks do not prove capacity or erase the need for network/hardware stress. The intentional full/expired invite requests produce handled HTTP522 console entries; no game page exception is claimed from those deliberate error paths. Expected SDK4002 warning comes from the deliberate network interruption fixture.

## Local preview

Updated production client and `basin-0.4` authority serve **http://localhost:2569**. Refresh to load the cleaned menu. Existing transient crew links from the earlier service may expire after restart. Direct control of the user's in-app browser was unavailable because local browser use is disabled in Work settings; automated development checks used isolated test Chrome instances. No claim is made that the user's tab was refreshed by the agent.

## PRD remainder and next milestone

**8 phases have partial implementation/review material; 5 remain NOT_STARTED; no full phase is signed off; 0/14 production-ready regions.** See `PRD_PROGRESS.md` and `ROUTE.md`.

Next: actual four-human full-route traversal with unfair-contact/learning/pacing notes; tighten natural bends/camera volumes and add the working waterwheel/rescue set-piece; then production animation/recorded audio, durable checkpoint save/rejoin, measured High/Low frame/memory budgets and latency/loss/jitter tests. Lava region, streaming, broader regions, public hosting and release gates remain pending. No AAA or zero-glitch guarantee is claimed.

VERDICT: PASS
