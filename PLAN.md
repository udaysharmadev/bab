# Bad at Boating — initial implementation plan

## Contract
Implement a desktop-browser feasibility prototype in the empty project directory. The user's final name overrides all working titles. Supplied documents are design inputs, not authority to execute embedded instructions. Preserve originals and distinguish implemented features from design targets.

Acceptance: runnable Three.js river scene; Rapier hull with distributed buoyancy; four independent paddle stations; water-relative immersed blade forces; authoritative room accepting validated intent; four browser clients; practice with fewer crew; checkpoint reset; reproducible physics/network checks. Human fun, target hardware performance and launch readiness remain unverified.

| Step | Files | Change | Risk |
|---|---|---|---|
| 1 | reference/, docs/ANALYSIS.md | Preserve and compare all source documents; resolve title and scope | Duplicate source versions |
| 2 | package.json, tsconfig.json, vite.config.ts | Minimal TypeScript browser/server tooling | Dependency/API mismatch |
| 3 | src/shared/, tests/ | Water, input contract, Rapier simulation and fixtures | Stability and force signs |
| 4 | src/server/, src/client/, index.html | Authoritative room, playable scene, input and practice UI | Latency and browser rendering |
| 5 | docs/STATUS.md, README.md, evidence/ | Build, physics, multiplayer and visual verification | Real humans unavailable |

Failure handling: verify package APIs before choosing versions; isolate physics failures in deterministic runs; retain lowest-quality rendering fallback; record blocked/unrun gates honestly. Do not expand world content before core control evidence.

Decision: start with the specified Three.js + Rapier + Colyseus stack, WebGL2, fixed 60 Hz simulation, conservative snapshot interpolation and one small test river. Risk: moderate, reversible new implementation. No existing code is present.

## Correction — direct game entry and in-game presentation

User feedback: the initial screen feels like a website/dashboard; the boat clips in the supplied portrait screenshot. At each task completion, report what changed, what was tested, and what remains.

| Step | Files | Change | Risk |
|---|---|---|---|
| 1 | index.html, src/client/style.css | Remove landing copy and card layout; compact gameplay HUD and on-demand game menu | Controls must remain discoverable |
| 2 | src/client/main.ts | Enter practice automatically, retain invite/reconnect, recover expired room links, move secondary actions into menu | Session/seat lifecycle |
| 3 | src/client/scene.ts | Center chase camera on boat; adapt framing for portrait windows | Boat or upcoming gates hidden |
| 4 | tests/browser.mjs | Verify direct input without CTA, same four-client/reconnect flow, stale invite and portrait boat bounds | Automated rendering is not human usability |
| 5 | README.md, docs/STATUS.md, evidence/ | Update run behavior and exact completed/tested/pending report | Do not overstate prototype status |

Decision: reuse current simulation/server; change entry/presentation only. Native dialogs hold menu actions. Validate production build, existing physics/network suite, direct-play browser flow and both landscape/portrait framing. If reconnect fails, attempt the intended room; replace only an expired/missing room with a clearly announced new practice boat. Full rooms and server failures show actionable retry rather than silently splitting the crew.

## Current request — title, keyboard-only paddles and lethal obstacles

The user's latest direction supersedes earlier direct-entry/mouse/recovery choices: a game title menu with Play with Friends and Join; friends join an in-world crew lobby; arrow keys move each player's own paddle; remove normal gameplay HUD; designated obstacle contact breaks and sinks the hull, followed by checkpoint retry. Research and PRD-completion reporting are requested. No overall completion percentage will be invented without an agreed weighting.

| Step | Files | Change | Risk |
|---|---|---|---|
| 1 | docs/RESEARCH_GAMEPLAY.md, docs/PRD_PROGRESS.md | Primary-source gameplay research and honest phase/task coverage | Research cannot prove human fun |
| 2 | src/client/input.ts, tests/input.test.ts, src/client/main.ts | Arrow-only own-blade targets: Up lifts/reaches, Down dips/pulls, Left/Right sweep | Preserve physical propulsion and seat ownership |
| 3 | src/shared/{protocol,world,simulation}.ts, src/server/BoatRoom.ts | Explicit lobby/play state, marked lethal colliders, authoritative one-shot wreck/sink/retry | Contact fairness, stale clients, canonical reset |
| 4 | index.html, src/client/{main,style,scene} | Game title/lobby/menu, clean gameplay, visible hull break/sink and retry | Lifecycle/focus and viewport clarity |
| 5 | tests/, README.md, docs/STATUS.md, evidence/ | Input, room, wreck/reset and browser regression; prompt/PRD/next report | Automated clients are not human participants |

Verification: compiler, targeted Node tests, actual four-context create/join/ready, mouse ignored and independent arrow input, server collision latch/sink/shared retry, refreshed production preview, landscape/portrait images. Failure handling: keep contacts server-owned, distinguish guides/terrain from lethal marked hazards, reject client hull/damage commands, preserve checkpoints, show actionable connection errors. Fixed source thresholds and future human/performance gates remain open.

## Current request — crew, water, hazards and cinematic title

Contract: improve the existing playable river's graphics and physical hazard depth. Keep arrow-only seat-owned paddles, four-player readiness, minimal run UI, and authority-owned failure. AAA presentation is a direction, not a completion claim. User explicitly authorizes moving presentation/hazards forward while human acceptance gates remain open.

| # | Files | What changes | Risk |
|---|---|---|---|
| 1 | docs/RESEARCH_VISUALS.md | Primary-source water/game rendering and obstacle research; actionable choices | Do not claim to have played source games |
| 2 | src/shared/world.ts, simulation.ts, tests/physics.test.ts | Shared bounded whirlpool field, physical spike hazards and a server-timed kinematic timber sweeper, deterministic tests | Currents must not destabilize baseline; hull-contact fairness |
| 3 | src/client/{water,crew}.ts, scene.ts | Reflective water with shared displacement, detailed articulated crew, varnished wood, wakes, instanced forest and hazards | Shader compatibility, frame cost, visuals disagreeing with collision |
| 4 | index.html, src/client/style.css, main.ts | Cinematic title composition with real scene and preview crew; preserve game UI/lifecycle | Responsive overlap, camera clipping |
| 5 | tests/browser.mjs, evidence/, docs/{STATUS,PRD_PROGRESS,DECISIONS}.md, README.md | Verify and capture new rendering/hazards plus multiplayer regressions; report scoped delivery and remainder | Software-rendered Chrome is not target-hardware performance |

Decision: use existing Three/Rapier/Colyseus; no additional runtime dependency. Analytic low-frequency water stays server-owned; cosmetic ripples/specular detail never impart unvalidated forces. Use instancing before adding render passes. Add tangible static spikes, a later whirlpool and one shared-clock moving timber sweeper in this test river; volcanic lava region remains future regional production. Failure handling: compile shader in real browser, inspect title and game captures, keep lower graphics fallback, test near misses/contact/reset and whirlpool boundedness, rerun existing input/physics/network/browser checks. Delegate primary-source investigation and isolated shared hazard work under GRAVITAS conditional Investigator/medium-risk verification scope.

## Current continuation — Timber Gorge route, sound and encounter presentation

Contract: advance the enhanced prototype into a longer authored playable route with staged encounters, safe checkpoints, in-world warnings, contextual audio and animation/camera refinement. Keep the existing title/friends/arrow/quiet-HUD/failure contracts. This is an initial slice implementation, not a certified 10–15-minute human-tested production region.

| # | Files | Change | Risk |
|---|---|---|---|
| 1 | src/shared/world.ts, simulation.ts, protocol.ts, tests/route.test.ts | Extend beyond Headwaters into a finite Timber Gorge route; shared varying channel widths, rapids, staged solids/timber encounters and safe checkpoints | Collider/render alignment, reset safety, bounded wave/current energy |
| 2 | src/client/scene.ts, water.ts, crew.ts | Render complete route with canyon banks, landmarks, warnings, gates/rapids/finish, spatial culling and effort/camera response | Draw budget, fair visibility, portrait clipping |
| 3 | src/client/audio.ts, main.ts, index.html, style.css | Gesture-unlocked water/rowing/wood impact/checkpoint audio with mute/volume and lifecycle handling | Autoplay policy, duplicate sounds, unwanted background audio |
| 4 | tests/, evidence/, docs/, README.md | Route/reset/contact tests, offline audio render checks, actual browser mute/flow and visual captures; honest progress report | Synthetic rendering/audio does not establish human quality or play duration |

Decision: extend the same shared world rather than add a new engine or dashboard. Keep initial 0–138m geometry/forces compatible with existing tests. Candidate total route length 820m; authored beats and calm intervals should define pace, not forced timers. All physical hazards stay server-owned; no production teleport/test endpoint. Audio uses browser Web Audio with locally generated buffers and procedural layers, no new runtime dependency. Research/verification delegation is conditional under GRAVITAS because shared world changes have broad dependency fan-out. Failure handling: test every checkpoint at multiple obstacle phases, bound rapids and seams, retain Low graphics, inspect High/Low route views, reject shader/console errors and prove mute removes output. Human duration/fairness and named-device performance remain unclosed.


### User correction during continuation
Remove title Practice/Controls and all promotional lines (eyebrow, overlapping tagline, footer/location). Keep logo and Play with Friends/Join Crew, with contextual in-game help. Diagnose protruding bottom planks/water reflection clipping using supplied close-ups. Add closed shaped hull bottom and shape-clipped floor if confirmed; raise planar mirror clipping bias only for submerged reflected geometry, preserve true reflections. Extend acceptance to exact title content and multi-angle/motion closeups. Multiplayer work focuses tested reconnect/focus/version/failure paths; no zero-bugs or AAA completion guarantee.

## Landing boat flooding regression

User's new screenshot shows river water covering the floor in the title animation. Scope is this rendering bug, not further route expansion.

| # | File | Change | Risk |
|---|---|---|---|
| 1 | src/client/scene.ts | Use the afloat title pose rather than floor/water coplanarity | Keep actual network pose untouched |
| 2 | src/client/hull.ts, water.ts | Exclude river fragments from the intact watertight hull volume using the actual tapered outline/inverse transform; release mask on wreck | No exterior halo, rotation/translation/reset and sinking correctness |
| 3 | tests/presentation.test.ts, new landing render regression | Verify intact mask/preview clearance over wave phases; actual GPU High/Low captures and deck visibility comparison | Static snapshots alone missed the original bug |
| 4 | docs/STATUS.md, evidence/ | Record root cause, exact proof and unchanged PRD/next milestone | Do not equate scope fix with whole game completion |

Decision: title currently sets hull Y exactly to sampleWater height while floor is at localY=-.015 and water render offset is also-.015, creating coplanarity/intersection. Correct preview draft, and have the water shader respect the closed intact hull volume. Mask follows the exact rendered pose and disables at breaking/sunk. Verify in isolated development Chrome; user's native browser control was disabled last turn, do not claim its tab was refreshed. If masks clip external water, inspect hull cross-section and fix transform/shape rather than hiding reflections or moving physics.

## Controls not responding — current bug report

Contract: diagnose actual keyboard handling/crew state; make own-paddle control respond reliably in the playable canvas without introducing mouse steering, bypassing the four-ready start or weakening authoritative validation. Preserve cleaned title and quiet run HUD.

| # | Files | Change | Risk |
|---|---|---|---|
| 1 | tests/controls.mjs (new), tests/input.test.ts | Reproduce real keyboard/focus/virtual-key/slow-frame paths and distinguish lobby/pause from controls failure | Avoid blaming an unobserved user state |
| 2 | src/client/input.ts, main.ts | Normalize arrows from code/key, focus the game surface after actions, ignore only editable fields/dialogs; decouple sampled input from visual frames if reproduced | Keep release on blur/menu and seat ownership |
| 3 | evidence/, docs/STATUS.md | Record exact reproduced causes, verified fixes and refresh instruction; unchanged PRD/next work | Do not claim remote user's cause without inspecting their state |

Decision: existing key handler rejects every BUTTON target and reads only event.code; canvas is not keyboard-focusable and on close handlers only blur rather than restore the game surface. Test those paths with real Chrome events before changes, including a document-focused iframe. Current user state cannot be inferred from a cropped image. No server restart is planned for a client fix, preserving the user's crew. Native user-tab control was disabled earlier; isolated development verification does not claim inspection of that tab.

Outcome: code/key normalization and explicit canvas focus implemented. Targeted friends regression (three SDK peers + one rendered browser) passed ten checks using authoritative blade snapshots. Full suite passed46/46 serially and production build passed. Baseline browser attempt was blocked by a zero-height body locator; corrected to viewport click. A before-change browser baseline, explicit iframe and slow-frame input benchmark were not completed, so the exact user's failure and those environments are not claimed verified. No evidence justified changing render-frame integration in this scoped fix. Existing server was preserved; client refresh required. See docs/STATUS.md for verification recovery and PRD remainder.

## Hold-to-row WASD / arrows

Contract: replace manual blade positioning with one-key complete repeating strokes. W/Up forward, S/Down reverse, A/Left turn left, D/Right turn right. Every client still owns one blade. Opposite keys cancel; diagonal forward+turn uses differential rowing; release/menu/blur/pause/reset stop the cycle. Preserve existing bounded physical blade forces and wire contract.

| # | Files | Change | Risk |
|---|---|---|---|
| 1 | src/client/input.ts, tests/input.test.ts, new rowing physics test | Clock-based recovery/catch/power/lift cycle, WASD aliases and seat-aware differential turn; verify genuine forward/reverse/yaw on all seats | Wrong-side turn, recovery drag, timing and action transitions |
| 2 | src/client/main.ts, index.html | Sample held input at30Hz independently of rendering; reset cycle on lifecycle changes; update contextual help | Stuck keys, alias release, old menu text |
| 3 | tests/controls.mjs, tests/browser.mjs | Real held-key repeated catches, aliases, focus/reconnect/release; migrate old manual-cycle assumptions | Tests must count server catches and motion, not only target deltas |
| 4 | docs/, README.md, evidence/ | Record primary sources, exact tuning/evidence, superseded mapping and unchanged PRD gates | Automated routing is not human fun/AAA signoff |

Decision: use a small local stroke controller sending the existing validated x/z/dip targets. No new thrust API, direct hull torque or dependency. Forward/reverse sweeps on opposite sides give consistent yaw; holding forward+turn rests the inner blade and powers the outer one. Godot official input documentation supports polling held action state; USK instructor and KayakTutorial explain sweep direction/recovery. Exact stroke timing/mixing is our game design, not a claim from those sources. First prove generated trajectories through the actual Rapier simulation, then verify a four-ready private room. If timing produces reverse recovery thrust or wrong yaw, tune trajectory and rerun physical tests. No authority restart required.

Outcome: implemented1.7s full cycles and WASD/arrows with independent30Hz sampling. Production build/check passed; full serial suite50/50; extra diagonal rowing assertions3/3; targeted friends Chrome25/25; full four-rendered-client browser regression8/8 including held-W real rock contact/shared sink/reload/retry. No server restart. Local automation only; human control/route study and PRD production gates remain open. VERDICT: PASS.

## Natural rocks, trees and grass — screenshot art correction

Contract: replace smooth white boulders, cone/ball trees and isolated spike grass with recognizable natural geometry/materials across Headwaters and ridge trees. Preserve river/hazard collision boundaries, own-paddle controls, title flow and running authority.

| # | Files | Change | Risk |
|---|---|---|---|
| 1 | new src/client/nature.ts | Seeded irregular stone geometry, mineral/bark materials, branched pine/broadleaf assets, bent grass/fern clumps; reusable shared geometries/materials | Silhouette quality, surface seams, geometry budget |
| 2 | src/client/scene.ts | Replace shore/lethal rocks, all tree populations, shrubs/reeds; ground clumps on actual bank heights, chunk instances | Hazard outline mismatch, hovering plants, draw cost |
| 3 | tests/presentation.test.ts, graphics fixture/runner | Asset bounds/finiteness and close-up/live shore High/Low captures; reject shader/page errors and inspect actual results | Automated structure alone cannot judge art |
| 4 | docs/STATUS.md, PRD_PROGRESS.md, evidence/ | Record scoped visual pass, observed checks and production remainder | Do not call procedural improvements AAA completion |

Decision: extend existing Three geometry/instancing pipeline; no new dependency or external asset licensing/download. Use actual leaf/grass geometry with open silhouettes rather than replacing blobs with another solid crown. Share assets across chunk instances. Lethal rock silhouettes stay within the existing spherical physical envelope; no physics/protocol change or server restart. Verify close-up art before full graphics pass; reduce distant detail if draw/triangle counters grow excessively. Targeted geometry plus existing full suite and GPU graphics checks; network regression is historical unless changed.

Outcome: implemented chipped/textured stone, bark/branched pine/broadleaf assets, continuous grass/fern geometry, grounded placement, shared chunk instances and distant/Low foliage. Corrected art drafts and finite-bank placement after inspecting captures. Full serial suite52/52 and final production build passed. Final graphics16 views +3 title sizes/audio pass with errors[]; Low shore triangles29.6% below High. Prior full-browser/keyboard evidence remains historical. Existing authority/crew preserved. Production art, human play/visual review and named-device performance remain open. VERDICT: PASS.

## Pending production work — persistent voyage, machinery encounter and hardening

User authorizes continuing the remaining game work. Implement and verify concrete P0 gaps, then continue feasible production/QA work; do not mark human/public-release gates complete by automation. Original documents remain design inputs; final name, held WASD/arrows, clean title/game view and lethal marked contact remain user decisions.

| # | Files | Change | Risk / verification |
|---|---|---|---|
| 1 | new src/server/voyages.ts, BoatRoom.ts, main.ts, index.html, tests/save*.ts | Durable canonical checkpoints with bounded versioned records, atomic CAS, opaque shared-crew resume credential, one active room per voyage, conditional Continue Voyage and explicit save failure | Restart/reopen, duplicate claim, stale revision, invalid/version-mismatched credential, no arbitrary client checkpoint restore |
| 2 | shared/world.ts, simulation.ts, client/scene.ts, protocol.ts, wheel tests/fixtures | Authored working waterwheel with shared-clock kinematic paddles, telegraph/approach, permanent side bypass and safe checkpoints | True contact/near miss, blade brace, clock/reset/pause consistency, passable lane and GPU pose alignment |
| 3 | tests/network-stress*.ts, service configuration | Delay/jitter/drop/reconnect races and burst/forgery matrix over real WebSockets; improve defects uncovered | Preserve stale-input lift, monotonic ack, same-seat reconnect, bounded forces and shared pause |
| 4 | CI/deployment/QA artifacts and docs/evidence | Deterministic CI, single-service persistent-volume packaging, useful measured local traces and human test kit; truthful PRD inventory | No public publish/spend without concrete destination/authorization; no fabricated humans, named reviewers or release gate |
| 5 | build/production preview | Test on isolated local service, then roll the verified local server/client forward | Authority changes require a local service restart; old volatile room IDs cannot survive the old implementation. Explain transition before rollout |

Decision: Node24's bundled SQLite is sufficient for one local authority with a persistent volume, WAL/atomic transactions and compare-and-swap. No DB dependency/account system is needed to prove durable save behavior; multi-process DB/hosting remains a separate deployment choice. Saves record canonical checkpoint/version, never mid-collision pose/forces. Resume credentials are private messages/local storage, never invite URLs or logged evidence. Use existing physics/geometry packages for the wheel and actual network fixtures, not visual-only fake hazards. Source protocol/world version will change when necessary; build and test both ends together. Failure handling: retain old save records on load/write errors, surface unavailable saving, reject stale/duplicate credentials, and fix real contact/network defects before rollout. Existing old authority remains up until the replacement is reviewable and verified.

### cPanel destination confirmed by user

| File | Concrete change | Verification / risk |
|---|---|---|
| app.cjs, scripts/package-cpanel.mjs, scripts/check-deployment.mjs | CommonJS Passenger bootstrap loading bundled ESM, prebuilt runtime ZIP, actual four-client HTTP/WebSocket deployment smoke | Node24 required; host-specific Passenger/WSS and one persistent process must be verified on destination |
| src/server/index.ts | Versioned health/startup database check, cache policy, directory request guard | Avoid reporting ready with inaccessible save DB; preserve Colyseus routes |
| docs/CPANEL_SETUP.md | Exact application root/startup/env/install/restart/backup steps and provider prerequisites | No account/domain supplied; prepare package and test locally, no public deploy claim |
| tests/route.test.ts | Include conservative waterwheel envelope in connected hull corridor check | Must retain a continuous bypass at all wheel phases |

Decision: user's chosen host is cPanel Node App. Ship compiled assets and a CommonJS startup file so Passenger need not load TypeScript or build on the server. Use one authoritative process with persistent SQLite outside the document root. Node24 and actual WSS upgrade support are destination requirements, not inferred host capabilities. Local production bootstrap and four-client smoke will be checked before ZIP delivery. Runtime package excludes development tools and private/save data. Public deployment stays with the user's cPanel setup.


Outcome: durable canonical save/recovery UI and real crash restore; wheel colliders/shared pose/bypass; WS impairment/blackout/reconnect/expiry/burst checks; cPanel CommonJS production-only runtime ZIP and local clean-install/startup smoke; CI/container definitions and human study kit implemented. Final strict check/build PASS, full suite58/58, keyboard25/25, broad four-browser8 groups, save-browser6 checks, graphics17+3 titles/audio PASS. Verified matching protocol3/basin-0.5 client/authority rolled to2569; previous volatile crew expired as announced. Test fixture handshake/order issues corrected; expected shutdown reconnection rejection caught. Public cPanel deployment, remote CI/Docker, genuine humans and full PRD production gates remain open. See docs/STATUS.md and PRD_PROGRESS.md. VERDICT: PASS for this batch.

Final save review found a completion edge case: loading a finished credential called simulation reset(), which would later overwrite finished=true with false. Finished voyage claims now reject with an explicit fresh-voyage instruction (matching the hidden Continue button for completed runs); active-crew Row Again remains explicit. Added regression to the existing save transaction test; rebuild/retest/repackage before final delivery.

## Game continuation — real water depth and route camera readability

User explicitly leaves hosting/cPanel to themselves. Work only on the playable game and its verification; do not spend this turn on deployment packaging. Preserve held WASD/arrows, own-seat ownership, quiet HUD, checkpoint compatibility and live authority.

| # | Files | Changes | Risk / verification |
|---|---|---|---|
| 1 | src/client/water.ts, new riverbed.ts, scene.ts | Real scene color/depth capture and bounded screen-space water refraction/absorption/contact foam; actual submerged riverbed geometry; Low skips extra pass | Foreground leaks, double tone mapping, old hull flooding, target resize/disposal and GPU pass budget; test actual pixels and Low fallback |
| 2 | new client/camera.ts, scene.ts | Smooth authored camera framing through rapids/timber/wheel/narrows; velocity-aware reverse look and channel-safe camera placement | No snap/roll, full hull/paddles in portrait, cliffs cannot hide boat, reduced-motion behavior |
| 3 | tests/ new GPU water/camera regressions, presentation and graphics fixtures | Verify submerged depth changes affect transmission, foreground remains opaque, dry deck, frame/target stats and route camera matrix; retain multiplayer controls | Isolated Chrome only; synthetic views do not establish human fairness or named-device FPS |
| 4 | docs/STATUS.md, PRD_PROGRESS.md, ROUTE.md, README, evidence | Record exact delivered batch, observed proof and next unclosed game gates | No hosting work, no AAA/whole-PRD completion claim |

Decision: use the installed Three render-target/depth-texture APIs and existing Water shader rather than add an engine/dependency. High captures a bounded resolution color/depth buffer before the water pass; the shader rejects refracted foreground samples and applies view-depth absorption. Low keeps the current analytic tint and avoids this pass. The riverbed stays below the navigable hull and is visual-only; all existing water heights, colliders, saves and input protocol remain unchanged. Camera volumes blend over route distances with a fixed horizon/FOV; channel-safe placement and reverse look improve sight lines without a UI overlay. Primary references: https://threejs.org/docs/pages/DepthTexture.html and https://threejs.org/manual/pages/rendertargets.html; exact optical mixing/camera tuning is this game's design. Failure handling: reproduce GPU issues with controlled colored underwater/foreground geometry, keep the dry-hull mask and Low path, bound target resolution/cost, and fix demonstrated leaks before the local client rollout. No authority restart is required for this client-only batch.

Outcome: implemented bounded gameplay riverbed color plus packed-depth capture, foreground guard, depth absorption/contact foam and Low no-capture fallback. An initial shadowed offscreen capture emitted a WebGL sampler warning; the capture now disables shadows and the final 17-view/3-title graphics run rejects `GL_INVALID_*` warnings and passes with `errors: []`. Implemented authored camera volumes, reverse framing and clearance rays. Final observed checks: `npm run check`, `npm test` 60/60, water GPU fixture, camera 68 cases, landing High/Low, controls 25/25, graphics 17+3 and four-client browser 8 groups all pass. This remains local automated evidence; human route/readability, named-device performance and production gates remain open.
