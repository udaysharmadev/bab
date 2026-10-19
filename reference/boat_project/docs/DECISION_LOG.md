# Architecture and product decision log (initial records)

**Rule:** Accepted a mandate ≠ verified an implementation. A decision describes what to try; a passed test describes what works.

| ADR | Decision | State | Why | Verification / reopen trigger |
|---|---|---|---|---|
| 001 | Every movement from physical paddle-water / paddle-solid reaction plus environment | ACCEPTED DESIGN MANDATE | Originality and legibility | Reopen only if foundational concept is reconceived |
| 002 | Start with 16–24 distributed hull buoyancy samples | PROVISIONAL | Cheap torque-generating float model | Equilibrium/stability vs CPU benchmark |
| 003 | Try constrained/kinematic blade contact before full joints | PROVISIONAL | Lower solver/netcode risk | Wall-brace and energy A/B |
| 004 | Server is sole authority over shared hull | PROVISIONAL BASELINE | Prevent cheating/desync | Four-client latency and load testing |
| 005 | Physics water and rich visual water share low-frequency sampler | PROVISIONAL | Readability and performance | Visual-physics congruency audits |
| 006 | WebGL2 is minimum baseline; WebGPU enhancements optional | PROVISIONAL | Browser compatibility | Three.js vs PlayCanvas reference benchmark |
| 007 | Four real humans required for flagship expedition | ACCEPTED DESIGN MANDATE | Four stations, shared destiny | Revisit only after explicit product-scope change |
| 008 | Recovery before instant fail | HYPOTHESIS | Emergent heroic saves / fair retries | 4-human playtests and actual drop-off |
| 009 | CrazyGames SDK adapter part of early interface | PROVISIONAL | Portal multiplayer/instant join requirements | Portal QA preview, SDK API audit |
| 010 | Working name All Hands, No Rudder | OPEN | Strong positioning, legal unknown | Professional trademark and domain clearance |
| 011 | Timber Gorge recommended vertical slice | PROVISIONAL | Dramatic but bounded current/log/camera mix | Evaluate after Phase 02 core fun |
| 012 | 14-region source atlas treated as long-term world ambition | PROVISIONAL | Scope cannot be committed without throughput | Slice completion time and staffing model |

## ADR template

`ADR-ID — Title` | Proposed date | Owner | Decision state | Context / problem | 2–3 realistic alternatives | Evidence (source and/or measured) | Decision | Impacted requirements/tests | Reversal condition | Review date.
