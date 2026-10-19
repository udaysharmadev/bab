# Initial executable acceptance matrix

**All unexecuted at creation**. Mark `PASS` only with test runner, build SHA, deterministic seed, environment, fixture/log/video and reviewer.

| Case IDs | Coverage | Test fixtures / artifacts | Acceptance | Current state |
|---|---|---|---|---|
| PHY-01..05 | Buoyancy, four forces, reverse and yaw | Recorded isolated paddle/hull runs | Signs and damping match pre-registered physically grounded expectation | NOT RUN |
| PHY-06..09 | Air stroke, currents, wall and ground | 4 snapshots and impulse traces | Air force ≲5% of immersed paired test; no contact explosion | NOT RUN |
| PHY-10..12 | Capsize, reset, no unbounded energy | Multi-minute physics trace | State-machine transitions and canonical idle stability | NOT RUN |
| NET-01..04 | 4 clients, authority, stale input, sequence | 4 real browser instances and server packet log | No remote state spoof or client-authoritative physics | NOT RUN |
| NET-05..08 | 50–200ms, jitter, loss and corrections | Network impairment script and A/B rating | Human-readable state and logged limit breaches | NOT RUN |
| NET-09..15 | Reconnect/host loss/duplicate tab/idle | Browser reload and chaos script | Seat intact, no phantom thrust, full snapshot | NOT RUN |
| SAVE-01..04 | Checkpoint CAS, corruption, recovery, reset | DB transaction/restart tests | Idempotent writes and canonical safe return | NOT RUN |
| UX-01..08 | First 30s learning, input remap, auto camera | ≥12 human testers and clips | ≥75% valid stroke; ≥80% explainability score 4/5 | NOT RUN |
| WORLD-01..06 | Water seams, streaming, recovery geography | Multi-region automated traverse | No topology or force discontinuity and leak | NOT RUN |
| TOOL-01..06 | Prefab schemas, determinism and editor | 5 prefabs across families | Author without changing core game code | NOT RUN |
| PERF-01..09 | Browser load, frame, heap, quality parity | Hardware/browser perf captures | Written target p95 and stable memory | NOT RUN |
| PORTAL-01..08 | CrazyGames size and instant multiplayer | Platform QA mode/browser screenshots | SDK integration, room joinability, UX compliance | NOT RUN |
| ACCESS-01..08 | Remapping, contrast, reduced motion, captions | Keyboard/controller/accessibility review | Core flows usable and telegraphs equivalent | NOT RUN |
| HUMAN-01..05 | Recovery, fun, replay and unfairness | Four-human session recordings + survey | Explicit core-fun gate vote, no cherry picking | NOT RUN |

## Regression metadata contract

Every case output includes `caseId`, `buildSha`, `physicsVersion`, `seed`, `serverTicks`, `referenceHardware`, `browserVersion`, `roomCount`, `RTT/jitter/loss`, `expected`, `observed`, `logPath`, `capturePath`, `author`, `reviewer`, `date`, `result`. All floating point tolerances must be committed next to the fixture and justified; avoid retroactively moving thresholds to pass a failing build.
