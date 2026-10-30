# Bad at Boating — production plan

> **Direction changed, 21 October 2026:** the current game is a bright toy-like round raft slice with oversized hand fans, small A/D player movement and Space to fan. R1 is locally implemented; its human/art and timing gates remain open. Read [FAN_RAFT_REBOOT.md](FAN_RAFT_REBOOT.md) for the current design and R0–R4 tracker, and [FAN_RAFT_IMPLEMENTATION.md](FAN_RAFT_IMPLEMENTATION.md) for scoped engineering work. The plan and milestone evidence below describe the legacy wooden-boat/paddle build; they do not certify the new game.

20 October 2026. Scope: the complete browser game described by the original PRD, with the user's latest controls, lethal-contact and four-human crew decisions taking precedence.

## Contract and completion

The inherited map, physics, logic and graphics are a **2% starting baseline**, as requested by the owner. This is a planning baseline, not a measured quality score. The remaining 98 scope points are assigned to 49 explicit deliverables in `PRODUCTION_TRACKER.json`. The same ledger individually tracks all eighty candidate obstacle concepts, ten signature encounters and fourteen region design cards from the source PRD. Content tasks are unweighted children of the production scope. Points represent accepted scope rather than time, art quality or likelihood of bugs. An item earns its two points only when its entire acceptance gate has evidence and a reviewer. Partial code and automated checks are reported separately. No amount of test passing establishes zero possible glitches.

100% requires every deliverable accepted, a complete connected journey, signed human playtests and device/performance gates, no open P0/P1 issues, and a rehearsed release. The target is physically grounded, authored browser realism: excellent near-field boat/water, readable hazards and strong lighting within a measured frame budget. Full fluid simulation and film assets are unsuitable substitutes for a playable, lightweight game.

## Audit and current implementation plan

| # | Files | Change / observed reason | Risk and recovery |
|---|---|---|---|
| 1 | docs/PRODUCTION_*, scripts/tracker.mjs | Trace all 13 production phases, 14 regions, dependencies, gates and evidence; preserve original references | Reject duplicate IDs, missing evidence, cycles and invalid completion claims |
| 2 | src/shared/simulation.ts, world.ts, tests/physics*.ts | Audit moving-water damping, compare normalized 16/20/24 buoyancy samples, improve actual grounded recovery | Preserve force caps; run still-water, heel, waves, all-seat and hazard regressions |
| 3 | src/client/scene.ts, nature.ts, water.ts, rendering tests | Reduce forest geometry over multiple passes with distance LOD; correct confirmed water shading issues | Compare High/Low captures and bounds; keep simulation geometry unchanged |
| 4 | src/server/BoatRoom.ts, voyages.ts, network/persistence tests | Bound slow-socket queues, account for simulation stalls, stop on finish, migrate canonical checkpoint saves safely | Close slow sockets through reconnect path; reject incompatible/active saves |
| 5 | src/client/input.ts, main.ts, index.html, style.css, input/browser tests | Add keyboard remapping, standard controller input, saved accessibility/graphics settings and graphics-context recovery | Every input source releases on menu, focus loss, pause and reconnect; real browser regressions |
| 6 | src/shared/protocol.ts, README.md, STATUS.md, PRD_PROGRESS.md | Version changed physics and document exact verified behavior and remaining production work | Preserve route/checkpoint indices and explicit previous-version migration |

Decision: reuse Three.js, Rapier, Colyseus and native browser APIs. Add no runtime dependencies. Existing code is a capable prototype with substantial local regression evidence, but broad production acceptance remains unclosed. Each subsystem audit records confirmed issues and rejects speculative fixes. Agents have disjoint file ownership; integrated tests run after all changes land. Browser GPU suites run sequentially to avoid contention.

## Delivery sequence and exit gates

| Milestone | Deliverables | Required exit evidence |
|---|---|---|
| M1 — reliable, measurable foundation | F02; baseline P01–P04, G01/G03/G04/G06, N01–N03, V03/Q01; measurement paths for F03/N04 | Reproducible build; physics/input/session/save regressions; four rendered clients; controlled impairment; repeatable local several-room and High/Low frame measurements. Wider human/device production acceptance stays open. |
| M2 — a complete premium slice | P05 and staged P04 rescue, G02/G05, V01/V02/V04, A01/A02, R01/R02, Q02 | Four-human full route recording; at least 12 newcomer observations; authored bends/rescue and boat/crew/water/audio review; collision/readability agreement; stable frame pacing on named devices |
| M3 — connected world pipeline | P06, V05, R03–R14 | Streaming/unload memory proof first, obstacle authoring, then coherent region batches. Every region has teach/remix/climax/relief, safe checkpoint, low-quality parity and multiplayer/recovery validation |
| M4 — release candidate | F03/N04/N05 production acceptance, Q03/Q04, L01–L03 | Browser/hardware matrix, real Internet and90-minute browser soak, host capacity and bandwidth measurements, backup/restore/rollback rehearsal, security/asset/platform reviews |
| M5 — accepted complete game | L04 and every earlier item | No unresolved P0/P1; accepted end-to-end journey; signed release checklist; real post-release incident and cohort review |

Engineering work can advance while human gates remain open. Regional content is accepted only after the slice and streaming evidence support it; relabelling the current straight river as fourteen regions does not complete the journey.

The live five-phase execution board and checklists are generated from `deliveryPhases` in the tracker JSON. `VERIFIED` there means a specific engineering checklist has observed evidence. Its separate production gate stays `OPEN` until the complete human/device/release acceptance applies. See [PHASE_EXECUTION.md](PHASE_EXECUTION.md) for the current batch plan. The original thirteen PRD phase categories remain in every work item.

## Quality targets to measure

- Medium: 1080p/60 FPS target, p95 frame <=16.67ms, main-thread work <=4ms and GPU <=10.5ms on an explicitly named reference device. Low must preserve every warning, collider, current and obstacle clock. High spends additional budget on near water/boat before distant scenery.
- Authority: fixed 60Hz, bounded catch-up and outbound queues; input freshness, finite forces, shared checkpoints and one-shot wrecks enforced. Four clients must retain seat ownership across disconnect/rejoin and process restart save restore.
- Water: one authoritative low-frequency surface/current sampler; visual normals, wakes and foam add detail without inventing propulsion. Compare calm/waves/rapids/vortex, immersed/air strokes, all four seats and recovery at obstacle phases.
- Stability: meaningful regression traces; controlled network impairment; named-device browser/GPU/JS/WASM memory over 90 minutes; measured rooms/host. Thresholds are targets until a run records the actual result.
- Play: all four people can explain their paddle, turn/brake/reverse and recognize lethal surfaces. The newcomer gate uses the original PRD thresholds and the existing `PLAYTEST_KIT.md`; bots never count as participants.

## Tracker maintenance

`PRODUCTION_TRACKER.json` is the editable source of truth. `npm run tracker` validates it and regenerates `PRODUCTION_TRACKER.md` and the searchable `PRODUCTION_TRACKER.html` dashboard; `npm run tracker:check` validates without writing and rejects stale reports. Every record has an owner function, source requirement, dependencies, status, acceptance, evidence and remaining work. The fourteen region records carry their individual design card and full common region gate. Existing T001–T030 remain traceable through `PRD_PROGRESS.md`; historical status entries are retained rather than silently rewritten into success.

For each change: reproduce/measure, read callers and fixtures, write the scoped plan, implement, run affected tests, inspect actual browser output where relevant, update evidence and tracker. Reopen any item invalidated by later changes. Incident severity: P0 crash/data loss/security; P1 broken control/desync/unfair progression or release-blocking performance; P2 localized visual/UX issue; P3 polish. No P0/P1 can remain at release.
