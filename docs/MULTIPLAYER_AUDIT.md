# Multiplayer and persistence audit

20 October 2026. This is a scoped engineering audit of the existing prototype, not a production sign-off.

## Contract and implementation plan

Objective: preserve authoritative four-person play and durable checkpoints while bounding slow-connection resource use, reporting simulation overload accurately, and supporting the explicit physics upgrade.

| File | Planned change | Risk and verification |
|---|---|---|
| `src/server/BoatRoom.ts` | Disconnect WebSockets with more than 64 KiB queued output before adding snapshots; use existing drop/pause/reconnect lifecycle. Count all discarded fixed steps after long stalls and stop immediately at completion. | Reconnect must preserve seat and release blades; verify with real SDK/WebSocket clients and controlled output-buffer pressure. |
| `src/server/voyages.ts` | Permit only `basin-0.5` to `basin-0.6` canonical checkpoint migration in the existing claim transaction, after lease validation. | Never migrate an active crew, change checkpoint identity, replace the recovery token, or erase incompatible records. Verify database contents before/after successful and rejected claims. |
| `tests/server-reliability.test.ts`, `tests/saves.test.ts` | Regression tests for reconnect under pressure, bounded catch-up/finish behavior and version migration. | Test harness owns server instances; add no production debug command or endpoint. |
| `src/server/BoatRoom.ts`, raw-socket fixture | Require JOIN acknowledgement for game commands/sync and keep play paused until a reconnecting transport acknowledges JOIN. | Test the actual raw handshake, including deliberately withheld acknowledgement; normal SDK/browser joins must still work. |
| This document | Record audit findings, measured verification and remaining release gates. | Automated local checks cannot establish human fun, Internet capacity or zero glitches. |

Decision: reuse Colyseus lifecycle, the existing fixed-step loop and SQLite transactions. No new runtime dependency or networking protocol is required. If a migration check fails, its transaction must roll back with the old record intact; if transport pressure cannot be inspected, preserve the transport's normal behavior.

## Findings

- The authority owns hull, hazards, ready/countdown, checkpoints and finish. Client messages are bounded, checked for schema/sequence and associated with server-owned seats. Four-person launch, shared pause, majority checkpoint return and reconnect already have real network regressions.
- Before this change, snapshot broadcasts and `sync` replies could keep appending data to a blocked WebSocket. An input rate limit does not bound outbound transport memory.
- The existing loop ran at most five simulation steps per callback, but first truncated elapsed time to 250 ms. Its dropped-step counter therefore concealed most of a longer stall. It could also run remaining catch-up steps after reaching the finish in the first step.
- Checkpoints contain canonical indices rather than arbitrary hull state. The unchanged `waterworks-1` checkpoint layout permits a narrow, explicit migration from `basin-0.5`; unrelated physics/world versions still require a separate reviewed migration.
- Existing SQLite leases, compare-and-swap revisions and transactional claims prevent stale writers and concurrent live restores. Recovery credentials are shared only within a crew and stored hashed in the database.

## Verification

Implemented. Focused lifecycle/network/reliability checks reported6/6 passing before the expanded raw-reconnect fixture; the expanded fixture and final integrated counts are recorded in `docs/STATUS.md`.

- Controlled64KiB output pressure closes a real socket, releases blades, pauses the shared crew, retains the seat, reconnects and accepts subsequent fresh rowing.
- A2.05-second stall executes only5 steps while accounting for123 total step slots. A finish reached on the first catch-up step stops immediately and clears accumulated debt/input.
- Canonical old-version migration preserves token, checkpoint and revision; active-crew, wrong-physics and wrong-world claims leave the original database record unchanged.
- An additional raw-client regression **first failed with62 queued setup messages instead of2** after repeated `sync` before JOIN acknowledgement. State guards now reject pre-ack commands, and periodic snapshots cannot queue for a joining client. A reconnecting socket also cannot unpause play until its JOIN acknowledgement arrives.
- The first expanded test fixture incorrectly expected the HTTP reconnect reservation to repeat the credential. It was corrected to forward the original token into the WebSocket URL, matching the installed SDK. Closed/raw socket cleanup is explicit. Fixture failures and port contention were resolved before the final integrated run; they were not counted as passing game checks.

No protocol fields changed. All clients must refresh for the new `basin-0.6` physics identifier. The deployment smoke assertion and cPanel instructions were updated accordingly; no public deployment was performed here.

## Remaining production gates

- Named-host concurrent-room capacity, memory, event-loop delay, bandwidth and operating cost; a local single-room fixture is not a hosting capacity result.
- A 30-minute or longer four-browser Internet session, production reconnect-grace observation and real network changes/TCP loss.
- Human full-route fairness and cooperative gameplay studies.
- Backup/restore and rollback rehearsal on the deployed persistent volume, HTTPS/WSS/proxy-header configuration and production monitoring.
- Operational limits on idle rooms and multi-process hosting only after measured capacity requirements. The current architecture remains one authoritative Node process with local SQLite.

No “100% complete,” zero-glitch, or production-load claim follows from this audit.

## Phase1 — measured several-room baseline

`npm run test:load` now records real co-hosted SDK/WebSocket workloads with isolated pause/reconnect, shared resets, body/collider invariants, actual payload bytes, event-loop/heap samples and room disposal. The final120.152-second run used4 rooms/16 clients, exercised32 shared resets and a reconnect in every room, recorded no invariant violations and disposed every room. Outbound application payload averages18,955–18,962 bytes/client/second; the event-loop delay p95 was11.592ms. Payload counters exclude WS/TCP framing. Startup/reconnect traffic and local SDK clients share the host, so these figures are not an Internet or maximum-host-capacity result.

Evidence: `evidence/load.json`, `evidence/phase-1.json`. Long churn, named production-host saturation, real Internet/production grace,30-minute rendered-client and90-minute memory/thermal studies remain open. All85 final regressions and the fresh built four-browser flow pass for this phase.

## Phase 2 hull/contact integration

Current protocol5 / basin-0.7 passes all90 regressions, including real network impairment, save/lease protection and transport recovery, plus the fresh built four-client8-group game flow and8-check local deployment smoke.

Latest current-physics load check: **120.128s,4 rooms/16 clients,32 shared resets and one reconnect per room**; no invariant violations and all rooms disposed. Event-loop delay p95=11.780ms. This remains a local synthetic workload, not Internet or maximum hosting capacity.

Earlier M1 load measurements are preserved in `load-phase-1.json`; current details are in `load.json` and `phase-2-hull.json`. Human/Internet/hosting/long-soak gates remain open.

## Phase 2 bends integration — basin-0.8

All96 regressions, the fresh built8-group multiplayer flow and7 input/native-context recovery groups pass. Four real rendered clients additionally receive five parent-IPC-authored bend poses through the real authority snapshot path and repeat held rowing; no test endpoint or command is shipped. This is not a continuous human traversal.

Current0.8 workload: 120.063s,4 rooms/16 clients,32 shared resets and a reconnect per room; stable body/collider counts, no invariant violations, all rooms disposed. Event-loop delay p95=11.747ms. This local SDK/authority workload exercises launch rowing/resets; it does not certify Internet/hosting capacity or bent-route human play. `phase-2-bends.json` retains scope and observations; earlier hull-only measurements are preserved separately.


## Stillwater rescue integration — protocol5 / basin-0.9

No rescue authority message or client position/force control was added. All four clients receive the normal hull snapshots; shared water-relative forces move the hull. A parent-IPC-only QA fixture seeds one approach, then real held-key actions produce the exit. A delayed-script native reload verifies frozen authority ticks and local foam while the fourth member reconnects; the same seat resumes without checkpoint relocation. Ordinary three-seat voting still returns to the unchanged380m checkpoint.

Reviewed0.5–0.8 saves contain canonical indices only, so they migrate to0.9 during a successful new-crew claim. Active leases, incompatible worlds/physics, finished records, tokens and revisions remain protected by executed persistence tests. All QA saves use memory or disposable temporary files. No public rollout, private database mutation, Internet quality or production acceptance is inferred.


## M2-D1 — display names and direct invite readiness

Invite URLs still allocate the real room seat directly. New clients ask for a name after admission and send only their own validated display handle. The shared validator normalizes Unicode/spacing and bounds names to20 code points while rejecting markup/control payloads. Member names are retained by reconnect, never stored in canonical checkpoint saves or invite URLs. Text labels use textContent. The optional Crew.name field and name message are additive to protocol5; older clients/SDK fixtures receive PaddlerN fallback names. Physics0.9 and save layout remain unchanged.

The client no longer disables Ready until all four arrive; the existing server barrier still requires four connected/ready members. Actual tests cover early readiness, cancellation, name update ownership and reconnect; full106-test authority/transport/save regressions pass. Lobby animation is presentation only and cannot send propulsion or advance the authority. Fresh four-rendered-client admission/name/label/tick/layout checks supplement normal browser/reconnect and load evidence. M2-D and production gates remain open.
