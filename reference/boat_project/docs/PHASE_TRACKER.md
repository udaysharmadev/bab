# Phase tracker — All Hands, No Rudder

**State as of 19 October 2026:** Phase Zero PRD/research expansion is **documented**. No implementation, test, frame capture, legal clearance, deployment or four-human playtest has been undertaken as part of this deliverable. Treat every downstream phase as `BACKLOG`. **Status is not a promise**; update only in commits with test artifacts.

## Official status and evidence schema

Every item uses: `Task ID | Phase | Status | Owner | Inputs | Acceptance gate | Evidence URL/path | Blocker | Updated UTC`. Status allowed: `BACKLOG`, `RESEARCHING`, `RESEARCHED`, `IMPLEMENTING`, `IN_TEST`, `BLOCKED`, `DONE`, `DEFERRED`, `CANCELLED`. Phase gate allowed: `NOT_STARTED`, `REVIEW`, `PASS`, `FAIL`, `BLOCKED`. No phase can be `PASS` on an AI assertion without test and review.

| Phase | Gate | Current factual state | Required evidence to close | Next action |
|---|---|---|---|---|
| 00 Discovery | REVIEW | User-supplied 34-page preproduction source + expanded PRD and research URLs; no legal clearance | Peer review, title search, chosen assumptions signed | Verify source pack not supplied, review this PRD, sign provisional ADRs |
| 01 Feasibility | NOT_STARTED | No game repo or benchmarks in this deliverable | Frame capture, physics traces, engine spike results | T002–T010 |
| 02 Four-player prototype | BLOCKED | Depends on Phase 01 | 4 independent clients, 12 newcomer study, 30-min run, impairment data | T011–T020 after Phase 01 |
| 03 Hydrology and physics | BLOCKED | Depends on Phase 02 gate | Deterministic physics regression | T021–T023 |
| 04 Vertical slice | BLOCKED | Depends on Phase 02 and 03 | 10–15 min playtested route, art and fps evidence | T024–T027 |
| 05 Multiplayer hardening | BLOCKED | Depends on stable real server workload | Loss/jitter/reconnect matrix, safe-save demo and rooms/host | T028 plus load test |
| 06 Continuous route tech | BLOCKED | Depends on slice and perf instrumentation | Streaming multi-region soak + stable memory | T029 |
| 07 Obstacle factory | BLOCKED | Depends on hydrology/control contract | Designer creates 5 families without code changes | Prefab tool spec and tests |
| 08 World content | BLOCKED | Depends on slice and world tech | Every region's full checklist + human playback | Ship coherent production batches |
| 09 Presentation polish | BLOCKED | Depends on content | Low/med/high art and audio/visibility pass | Whole-journey art bible sweep |
| 10 QA optimization | BLOCKED | Depends on content & real traffic | Browser, perf, accessibility, long-soak results | Fix P0/P1 bugs |
| 11 Release candidate | BLOCKED | Depends on QA and brand/portal approval | Rehearsal, rollback, QA portal, signed ship check | Launch gate |
| 12 Launch and tuning | BLOCKED | Depends on successful release | Cohort dashboard and incident log | Evidence-led live iteration |

## Immediate task board

| Ticket | Status | Responsible function | Evidence expectation | Prerequisite |
|---|---|---|---|---|
| T001 PRD review and freeze | IN_TEST | Game director | Accepted written PRD, diffs and change log | None |
| T002 TypeScript repo/CI | BACKLOG | Engineering | Builds, lint and test logs | T001 |
| T003 Three.js reference boat | BACKLOG | Rendering | Video of real scene | T002 |
| T004 Distributed buoyancy | BACKLOG | Physics | Equilibrium graph | T003 |
| T005 Shared water sampler | BACKLOG | Physics | Seam deterministic tests | T002 |
| T006 Direct blade workspace | BACKLOG | Input | Above/below water trace | T003–T005 |
| T007 Physical blade reaction | BACKLOG | Physics | Air vs water impulse trace | T006 |
| T008 Four force stations | BACKLOG | Physics | Unique torque trace each seat | T007 |
| T009 Inputs usability A/B | BACKLOG | UX | Recorded newcomer observations | T006 |
| T010 Auto camera | BACKLOG | Camera | Slalom/video safety test | T003 |
| T011–T020 Multiplayer + human core test | BLOCKED | Server / QA | Four-browser traces and signed gate | T003–T010 |
| T021–T030 Physics, slice and operations | BLOCKED | Mixed | Stage-level evidence | Phase 02 PASS |

## Gate checklist (paste for every phase)

- [ ] Research questions logged before implementation
- [ ] Relevant official sources linked and dated
- [ ] Alternatives considered and ADR entered
- [ ] Implementation scoped to testable tickets
- [ ] Functional tests pass on reproducible build
- [ ] Impairment/performance tests pass when relevant
- [ ] Four-person playtest evidence supplied when relevant
- [ ] No unresolved P0/P1 regressions introduced
- [ ] Risk register and open questions updated
- [ ] Phase owner and reviewer record explicit PASS/FAIL/ITERATE
- [ ] Tracker updated with timestamp and evidence paths

**Current next action:** Review and sign PRD hypotheses, then implement a simple test basin. Do not mark Phase 00 as fully `PASS` until review and provisional decisions are recorded.
