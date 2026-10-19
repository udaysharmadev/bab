# Bad at Boating — implementation status

20 October 2026 · Local authored multiplayer prototype · **ITERATE**.

## Current continuation — crew animation and real-time endurance

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
| Route/title graphics | **21 views +3 title sizes PASS**, `errors: []`; max751 calls /6,035,068 triangles within unchanged fixture budgets |
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
