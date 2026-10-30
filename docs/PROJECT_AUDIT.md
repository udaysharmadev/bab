# Whole-project audit — 20 October 2026

The current project is a functioning authored multiplayer prototype. The owner's **2% baseline** applies to production acceptance. Existing regression coverage is useful engineering evidence; it does not make the full fourteen-region design, final art or release complete. The [production dashboard](PRODUCTION_TRACKER.html), [editable ledger](PRODUCTION_TRACKER.json) and [delivery plan](PRODUCTION_PLAN.md) cover the remaining work.

## Runtime and ownership

The browser uses Three.js/WebGL2 to draw a procedural boat, four articulated crew and a river. Each browser sends bounded held forward/turn intent for its assigned seat. Colyseus generates complete paddle strokes on a fixed authoritative 60Hz clock. Rapier integrates one dynamic hull, buoyancy, blade reactions and physical obstacle contact. Snapshots drive every client's pose, effects, audio, checkpoint, wreck and completion. SQLite stores canonical checkpoint indices, revisions and active-room leases. There is no client hull-position/damage authority and no artificial player filling an empty flagship seat.

The existing stack is appropriate for continuing this browser game. Replacing the engine would discard working networking, physics, tests and deployment without resolving the actual art, fairness or performance gaps. No runtime dependency was added in this batch.

## Source inspection

| Subsystem | Sources inspected | Current behavior / key gap |
|---|---|---|
| Map and hydrology | `src/shared/world.ts` | 1,400m straight centreline; eighteen authored sections; width25m down to13m; ten canonical checkpoints; rocks, pilings, iron teeth, five timber movers, two wheels, vortex and rapid fields. This is partial Headwaters/Gorge content, not fourteen completed regions. |
| Physics | `src/shared/simulation.ts`, `rowing.ts`, `protocol.ts` | Distributed sampled lift/drag and server-bounded blades, CCD and contact-driven wrecks. This batch adds normalized16/20/24 configurations, vertical wave-relative damping and actual-contact grounding detection. Rectangular hull collider, fixed gameplay payload and simplified height field remain. |
| Room and network | `src/server/BoatRoom.ts` | Four-ready countdown, majority checkpoint return, seat retention, shared pause and fixed-step snapshots. This batch bounds slow-socket output, avoids unacknowledged JOIN snapshot queues, counts discarded stall time and stops catch-up at finish. Multi-host authority and measured room capacity are open. |
| Persistence | `src/server/voyages.ts` | Transactional SQLite, hashed recovery credentials, compare-and-swap revisions and leases. Explicit canonical `basin-0.5`→`basin-0.6` migration preserves checkpoints/tokens and rejects active/incompatible saves. Production volume backup/restore/rollback still needs a hosting rehearsal. |
| Client/session/input | `src/client/main.ts`, `input.ts`, `index.html`, `style.css` | Clean title/four-person lobby/menu and four independent input sources. This batch adds saved unique key remapping, standard controller with neutral rearm, saved graphics/motion settings and native graphics-context recovery. Physical controller, accessibility and newcomer acceptance remain. |
| Rendering and environment | `src/client/scene.ts`, `nature.ts` | Procedural scene, batched static props and instanced vegetation. This batch lazily retains at most six vegetation chunks, recreates deterministic revisits and uses near/medium/far geometry. Static map CPU geometry and shared assets remain cached; full multi-region streaming is incomplete. |
| Water | `src/client/water.ts`, `riverbed.ts` | Shared geometric waves, planar reflection, local normal detail, bounded color/packed-depth capture, absorption, foam/wakes and hull-volume exclusion. Low skips expensive reflection/transmission. No breaking-wave volume simulation, production flow-map authoring or device-level frame certification. |
| Boat and crew | `src/client/hull.ts`, `crew.ts` | Closed tapered visual hull, clipped floor and detailed procedural rigs with shaft grips, bounded arms and stroke/wreck motion. Art direction, production assets/skinning, tapered collision agreement and final animation acceptance remain. |
| Camera and sound | `src/client/camera.ts`, `audio.ts` | Authored sight-line volumes, fixed horizon, reverse look-ahead, stereo catch/current/break/checkpoint cues and lifecycle silence. Human camera fairness, production recordings/music and final mix remain. |
| Delivery | `src/server/index.ts`, `app.js`, `app.cjs`, scripts, Docker/Compose, CI | Production static service and WS authority, health endpoint, headers, cPanel package tooling and CI configuration. Local tests do not certify remote CI, containers, Internet capacity or an owner-managed production rollout. |
| Verification | `tests/`, `evidence/`, source design/reference documents | Physics, hazards, route clearance, save/restart, lifecycle, impaired real sockets, four rendered clients and GPU fixtures exist. This batch adds hydrodynamic, transport-pressure, migration, input/context-recovery and tracker-integrity regressions. Human study remains NOT RUN. |

## Confirmed defects addressed

| Defect | Effect | Change / proof path |
|---|---|---|
| Wave damping assumed stationary surface | A rising/falling visible wave was damped relative to world zero | Analytic vertical wave velocity; finite-difference derivative regression and buoyancy sweep |
| Grounded detector checked centre proximity | Sideways pinned hull could fail to recover | Actual nonlethal contact plus sustained command, low speed and hysteresis; idle/open-water negative cases |
| Forest eagerly allocated for full route | Unnecessary residency and millions of repeated distant foliage triangles | Bounded vegetation instance lifecycle, simplified distant geometry and shadows, deterministic backtracking GPU checks |
| Slow output could accumulate snapshots | Growing latency/memory under blocked connection |64KiB transport-pressure policy enters normal disconnect/pause/reconnect; real socket regression |
| Long stalls were truncated before accounting | Dropped-step telemetry understated lost simulation time | Count entire stall while executing at most five fixed steps; stop immediately on finish |
| Controls/preferences lacked complete accessibility path | Fixed keys, no controller, forgotten visual settings | Persistent unique remapping, arrows, standard stick/D-pad/Start, safe neutral rearm and saved settings |
| WebGL context loss had no game-level recovery | Graphics loss could leave held rowing active | Release all sources, visible recovery action, skip rendering while lost and restore/rejoin path |

The initial graphics implementation split forest batches too finely and exceeded the draw budget. The final code keeps one species batch per60m cell and passes the existing draw limit while reducing triangle cost. The existing horizontal drag was audited and found dissipative; it was preserved rather than rewritten on an unconfirmed concern.

## Map and gameplay priorities

The map has a finite start/end and varied encounter beats, but a straight centreline and repeated procedural environment limit exploration and visual storytelling. The next slice work needs authored bends, previewable mechanical timings, a recoverable near-loss encounter, and four-human pacing evidence. Natural shallow grounding, world water-level changes, locks/lifts, weather, town/cave/glacier/aqueduct assets and transitions require real systems and complete region authoring. Appending more kilometres of repeated rocks will not close those tasks.

The current input assist deliberately lets any seat row straight with W/S while A/D causes visible turning; this follows the user's latest decisions and differs from the original unconstrained blade-workspace proposal. Keep it explicit in usability/agency tests. Marked physical hull contact is lethal; ordinary banks and blade-only contact remain usable. Human feedback must evaluate warning visibility, turning distance, fatigue, cooperation and whether recovery feels fair.

## Release priorities and uncertainty

1. Finish and verify foundation changes, then maintain the four-client control/contact/reconnect/persistence regressions.
2. Run a complete four-human slice and the existing twelve-newcomer study. Record failures and camera/route confusion; adjust actual encounters from evidence.
3. Benchmark named low/medium/high devices, browser compatibility, real Internet recovery and90-minute browser memory/frame behavior. Measured triangle reduction alone does not establish60FPS.
4. Close the production asset/audio and continuous-world pipeline, then author region batches with individual exit gates. Track the eighty candidate obstacles and ten signature scenes separately from implemented hazards.
5. Rehearse hosting backup/restore/rollback and capacity, then sign the release gate with no unresolved P0/P1 issues. Full-game completion and zero possible glitches are not claimed.
