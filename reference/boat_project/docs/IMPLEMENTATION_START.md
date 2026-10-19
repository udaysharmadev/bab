# Implement Phase 01 and 02 — nonnegotiable engineering contract

Act as technical game director, physics engineer, graphics engineer, multiplayer engineer and QA owner. Read `docs/PRD.md`, `docs/PHASE_TRACKER.md`, and `docs/DECISION_LOG.md` in full. Scope only the feasibility and four-human core prototype; do not produce 14 regions, monetization, inventory or cosmetic systems as a substitute for core play. Before coding, list hypotheses, source links, affected tests, design choices and experiment order, then update the decision log.

**Implementation requirements:** TypeScript workspace; minimal Three.js render; Rapier dynamic one-piece hull with distributed buoyancy and lateral drag; deterministic water sampler; constrained paddle targets; four force application points; realistic submersion and air miss; four independent browser clients connected to an authoritative Colyseus room; input sequence validation; basic camera collision; slalom/current/checkpoint. Establish a 60 Hz fixed-step *experimental baseline* and measure drift/tick cost. Every player manipulates a blade, never hull thrust. Backend receives bounded intention only.

**Test-first harness:** PHY-01..12, PROTO-01..14, server forgery attempts, resets, latency/jitter/loss, browser refresh. Make every test produce inspectable logs and videos where applicable. Implement client graphics at lowest reasonable quality until mechanics are proven. Benchmark a single server room before scaling; don't claim deterministic prediction without logged hashes and correction traces.

**Human gate:** recruit ≥12 genuine first-time testers across 3 or more four-human sessions; count first valid stroke within 30 seconds, explainability after each run, voluntary replay, and observed unfair failures. No developer guided demo substitutes for this gate.

**End-of-phase behavior:** regenerate exact docs, mark tracker accurately, include source links and artifact paths, write ADRs, provide one-line PASS/ITERATE/STOP recommendation. Never mark a task `DONE` without reproduction and reviewer evidence; never proceed to mass world production on an optimistic agent summary.
