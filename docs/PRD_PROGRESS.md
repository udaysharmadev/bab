# Bad at Boating — PRD progress and remaining work

19 October 2026. Live project companion to the archived `reference/boat_project/docs/PRD.md` and its original phase tracker. That archive describes the documentation deliverable's state and is intentionally preserved.

**Current product state: a local networked prototype. No complete production phase is signed off.** Features can exist across phases while their exit gates remain open. No honest percentage of the whole game can be calculated from these unequal tasks; counting scaffolding, a polished region and a release gate as equal units would mislead.

This inventory uses the implementation and observed verification summarized in `STATUS.md`. The earlier menu, arrow-only input, quiet run view and lethal-obstacle changes have scoped evidence. The latest iteration adds bounded water transmission, authored camera readability and a rerun multiplayer regression; AAA production quality and a finished region are still open. No full production phase or human acceptance gate is closed by those checks.

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
| T009 | Input usability | IN_TEST | Server-clock held WASD/arrows, any-seat straight W/S assist, corrected camera-relative A/D and simultaneous mixed crew inputs have automated fixtures. Four-browser control/recovery evidence is in STATUS.md. Controller/remapping and newcomer usability clips remain. |
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
| T021 | 16/20/24 sample sweep | BACKLOG | Current implementation uses twenty points; no alternatives/cost comparison. |
| T022 | Kinetic brace/contact caps | IN_TEST | Swept blade contact and 260 N cap fixture exist; persistent shaft contacts and worst-contact energy matrix remain. |
| T023 | Capsize/grounded recovery | IMPLEMENTING | Old inversion/reset fallback is partial; lethal break/sink is a new user rule, not full capsize/grounding recovery completion. |
| T024 | Timber Gorge route/checkpoints | IN_TEST | Initial 820m route/thirteen beats/nine safe checkpoint positions with geometry, contacts, rapids and phase checks. Durable crash/restore and waterwheel physical/bypass fixtures pass; human navigation/duration, winding/rescue/camera and full slice gate remain open. |
| T025 | Production boat/four crew rigs | IN_TEST | Distinct procedural crew, faces/headwear, grip-driven arms, stroke/wreck motion and textured varnished boat; production assets/skinning/animation review still open. |
| T026 | Visual/gameplay water, spray/wake | IN_TEST | Shared displaced/reflective water, bounded High screen-space riverbed color/packed-depth transmission, normal detail, foam, hull-speed wake and immersion/force-triggered spray exist; human water-truth and production art acceptance remain. |
| T027 | Camera volumes/readability | IN_TEST | Authored Whitewater/Timber/Iron Narrows/Last Descent volumes, reverse framing and geometric clearance pass 68 local route cases; blind four-human movement audits remain. |
| T028 | Latency/reconnect/load A/B | IN_TEST | Three real WS delay/jitter/application-message-drop profiles, blackout, reconnect races/expiry and forged burst pass. No TCP packet-loss study, smoothing A/B, long soak or room capacity model. |
| T029 | Streaming/disposal benchmark | BLOCKED | Streaming not implemented; no long-run multi-region memory trend. |
| T030 | Vote slice gate/next batch | BLOCKED | No finished slice, signed evidence-backed gate or real production throughput. |

## Remaining work in useful production order

1. Maintain title/crew entry, held WASD/arrow individual blades, clean play view, real lethal contact and synchronized break/sink/retry. Current full suite:58 tests passing; targeted held-action browser check:25 checks passing; broad multiplayer evidence is recorded separately in `STATUS.md` and `evidence/browser.json`.
2. Run the same controls with four real people and then the source's ≥12-newcomer study. Diagnose learning, fatigue, blade/hull causality, camera fairness and obstacle readability before adding world size.
3. Close network/recovery risks: real Internet latency/TCP loss,30-minute four-client run, production-grace/network-change observation, contact/energy stress, complete capsize/grounding states and structured telemetry.
4. Take the initial 820m route through actual four-human traversal and pacing, then finish production boat/crew assets, animation/audio, public save/rejoin validation and measured frame/memory budgets.
5. Prove streaming and authoring tools, then produce the remaining world in complete region batches. Finish platform integration, broad QA, release rehearsal and launch gates.

## Phase count after this iteration

**9 phases have partial implementation/review material;4 remain NOT_STARTED;0 phases signed off;0/14 production-ready regions.** Phase11 now includes deployment preparation with local package evidence, not public release acceptance. Human gates remain open.

## Required end-of-task report

Every final task response should include these four concise facts, in the user's language:

- **Is prompt ka:** complete/partial/blocked, with the exact delivered behavior and any unfinished request.
- **Test:** commands/checks actually observed this turn and their result; distinguish automated clients from humans.
- **PRD mein baaki:** current phase and the next unclosed gates; link this inventory. Never invent a whole-game completion percentage.
- **Agla kaam:** the concrete next milestone and what evidence will close it.

This file records scope and evidence needs. It does not certify the current implementation or close a production gate.
