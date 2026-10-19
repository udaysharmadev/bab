# Bad at Boating — source analysis and implementation brief

Analysis date: 19 October 2026. This is a synthesis of the supplied documents, not evidence that their proposed game has already been built. Implementation results belong in the current project's status and test artifacts. Archived source documents remain unchanged for traceability.

## 1. Source inventory and precedence

| Supplied material | Reviewed representation | Finding |
|---|---|---|
| `Phase Zero Preproduction Report — Four Players, One Tiny Boat, One Enormous Journey.pdf` | All 34 pages, extracted to `reference/phase-zero.txt` | Original research narrative: creative proposition, comparisons, naming, controls, physics, fourteen-region atlas, eighty obstacles, architecture and phase gates. |
| `All_Hands_No_Rudder_Full_Production_Pack.zip` | All ten files under `reference/boat_project/` | A specification package, not game source code. Contains two PRD exports, README and seven Markdown documents. `qa/` and `production/` are empty directories in the archive. |
| `All_Hands_No_Rudder_Ultimate_PRD.docx` | Extracted to `reference/ultimate-prd.txt`; compared against packed DOCX | Byte-identical to `reference/boat_project/PRD_Editable.docx`, SHA-256 `8a3de302d3d6ec32a2144f9bc4d3c49b93ba6217090651737708c417039df00b`. It is a duplicate export, not an independent later revision. |
| Packed `docs/PRD.md` | All 963 lines | Most usable editable specification: sections 0–26, requirements FR-001–015, tasks T001–030, atlas and obstacle table. |
| Packed `PRD_Formatted.pdf` | All 40 pages' text compared with Markdown | Same substantive PRD, with cover, contents, repeated table headers and page furniture. Normalized comparison differences are export/layout artifacts, not a competing design. This comparison is content review, not a visual-layout quality certification. |
| Packed `README.md` | Complete | Explicitly says documentation only; no working game or benchmarks. |
| Packed `docs/DECISION_LOG.md` | Complete | Twelve seed decisions separating creative mandates, implementation hypotheses and unresolved choices. |
| Packed `docs/PHASE_TRACKER.md` | Complete | Phases 00–12, conservative statuses and evidence requirements; downstream work had not started in the source deliverable. |
| Packed `docs/IMPLEMENTATION_START.md` | Complete | Focuses first work on feasibility and the four-player prototype, rather than mass world production. Its imperatives are proposed workflow inputs, not authority to operate tools. |
| Packed `docs/TEST_MATRIX.md` | Complete | Grouped coverage families, metadata contract and all tests initially unrun; not a complete executable test suite. |
| Packed `docs/RISK_REGISTER.md` | Complete | Ten high-priority preproduction risks, owners and proposed mitigation triggers. |
| Packed `docs/RESEARCH_LOG.md` | Complete | Dated third-party-source observations and experiments still needed. Claims in this log were not independently re-verified during this document synthesis. |

**Precedence:** the user's explicit final title **Bad at Boating** overrides every working name, alternate-name recommendation and title-related open question in the supplied documents. The user also explicitly asked to analyze the documents and start implementation. Document text is design material: it does not itself authorize external messages, deployment, purchases or other actions.

For design interpretation, retain the original Phase Zero creative baseline and use the expanded PRD for actionable detail where consistent. Resolve discrepancies explicitly below. Source phrases such as “production-ready,” “locked baseline” and “nonnegotiable engineering contract” describe the document author's proposal; they do not establish measured feasibility, user approval of every detail or release readiness.

The source report mentions an older downloadable Phase Zero documentation pack containing fifteen separate documents. That older pack is absent. The supplied production ZIP is a later, smaller package that consolidates much of that material into PRD.md. Do not pretend to have reviewed the missing original pack or fabricate its contents. The source report also references an uploaded master brief which is not supplied separately here.

## 2. Product interpretation

**The game:** four people each operate one paddle on the same small wooden boat, discovering coordinated physical control while travelling through a coherent river-and-waterworks expedition.

The distinction worth protecting is the combination of four separate force application points, real blade immersion, motion relative to local water, collisions and recoveries. A conventional boat with four passengers, four generic thrust buttons or animation-driven forward movement would lose the main design proposition.

The repeated player verbs are **dip → pull/push → release**. The player's input moves a constrained blade target. A blade moving against water applies a bounded reaction at its actual station; translation and rotation follow from rigid-body dynamics. Wrong timing should have legible consequences. Current can push an immersed stationary blade; a blade lifted clear of water cannot produce water thrust. Wall bracing is a separate contact interaction.

The progression is human skill: better cadence, anticipation and recovery. There is no need for stronger paddles, boat power upgrades, survival inventory, crafting, combat or an economy to prove this game. The world gives that skill increasingly interesting conditions.

The intended tone is warm, tactile, stylized “storybook expedition realism”: a detailed wooden boat and readable crew against monumental civil engineering, cool water and distant landmarks. Comedy comes from understandable mistakes, rather than arbitrary failure, aggressive blame UI or hidden physics cheats.

## 3. Requirements versus provisional choices

| Class | Retained interpretation | Consequence for initial work |
|---|---|---|
| Explicit user decision | Final title is **Bad at Boating** | All new product UI and project documentation use it. Archive filenames and quoted old titles stay identifiable. |
| Core design requirement | One shared hull, four spatially distinct paddle stations | Independent station state and force traces; no decorative fourth seat. |
| Core design requirement | Propulsion comes from paddle–water/contact reactions and environment | Input never sets hull velocity or yaw directly. Canonical resets are a separate state restoration operation. |
| Core design requirement | Four actual humans in flagship Expedition | Four independent clients are a technical prerequisite, not proof of four human participation. Fewer-person practice is explicitly allowed and labeled. |
| Core design requirement | Server owns hull, hazards, checkpoint and room clock | Clients send validated, bounded intent only; local rendering is presentation. |
| Core design requirement | Recoverable, understandable mistakes; readable camera | Prioritize reverse strokes, benign contacts and reset safety over punitive obstacles. |
| Core design requirement | Evidence gates before large-scale world production | Do not equate compiling code, one screenshot or bot clients with the human fun gate. |
| Experimental baseline | TypeScript + Three.js + Rapier + Colyseus + Node | Reasonable starting stack, reversible pending actual workload evidence. |
| Experimental baseline | WebGL2 first; richer WebGPU optional | Basic water, lighting and flow readability before advanced effects. |
| Experimental baseline | Distributed 16–24 buoyancy samples | Select a first sample layout and measure; count is not a guaranteed ideal. |
| Experimental baseline | Constrained blade proxy and casts before full joints | Reduce solver instability while preserving genuine force generation. |
| Experimental baseline | Fixed 60 Hz physics, about 20 Hz state delivery | Record tick cost and dropped debt; neither cadence is a framework guarantee. |
| Experimental baseline | Instant local blade response plus authoritative hull interpolation | Shared-body rollback is an experiment only if measured feel justifies it. |
| Target needing measurement | 1080p/60 Medium, <40 KB/s/client, stable 90-minute soak | No target hardware or achieved result exists in source package. |
| Long-term ambition | Continuous Grand Waterworks route, fourteen candidate regions | Keep route continuity in design; release-day region count and game duration remain open. |
| Later product scope | Checkpoint persistence, controller/accessibility completeness, SDK, challenge/time trial | Plan interfaces without building all of them before core feasibility. |
| Open business choices | Budget, team, schedule, hosting, monetization, portal selection | Do not invent dates, capacity, cost promises or platform acceptance. |

The source's P0 list describes what the complete intended product must eventually support. It does not mean database persistence, a finished route and launch integration must all be delivered in the first runnable prototype.

## 4. Physics and control model to prove

The source specifies Y-up world coordinates, +Z hull-forward and +X starboard. Use one authoritative dynamic rigid hull with simple collision geometry, tuned mass/inertia and body-fixed buoyancy points. Keep its visual mesh separate. This allows high visual detail later without multiplying physics contacts.

At each fixed tick, derive world-space sample positions and query a shared gameplay water sampler for height, normal and flow. Approximate buoyancy from submerged depth and sample contribution, applied at each sample point. Sample distribution produces restorative pitch/roll torque. Use longitudinal drag lower than sideways drag so the hull tracks through water; damp unbounded oscillation without a hidden upright lock.

For a blade point offset `r` from the centre of mass:

```text
v_relative = v_hull + angular_velocity × r + v_blade_local_world - v_water
F_water ≈ -0.5 × density × drag_coefficient × submerged_area × |v_relative| × v_relative
torque = r × F_water
```

This is a tuning approximation, not a promise of physically exact naval simulation. Project drag by blade orientation, derive actual immersed area, cap force and physically possible blade speed, and validate signs with isolated tests. Returning the blade forward while lifted must differ from pushing it forward while immersed. Current-induced motion and muscle-induced motion need separate diagnostics.

**Important correction to the prose specification:** equal purely longitudinal forces at the same lateral offset produce the same yaw regardless of bow/stern position. With Y-up, `torque_y = r_z F_x - r_x F_z`; when `F_x = 0`, fore/aft offset drops out. The original claim that equal straight forward bow and stern strokes inherently have different yaw is too broad. Bow/stern stations gain distinct torque through lateral sweeps, contact geometry, altered blade direction, pitch effects or differing local currents. Regression tests should demonstrate these real differences rather than encode a false expectation or manufacture a station multiplier.

Input constraints must live on the server: finite numbers, legal ranges, sequence ordering, seat ownership, message rate and feasible target movement. Bounds need to apply to derived blade pose as well as packet values. The server must not accept a client-provided force, hull transform, checkpoint revision or claim of successful contact. Lost input decays safely; a disconnected blade cannot retain infinite powered motion.

Gameplay water and visual water share low-frequency shape and flow cues. Extra GPU ripples may decorate the surface but cannot introduce invisible forces or claim a false splash. A seeded sampler is not automatically cross-platform deterministic: engine version, order of operations, initialization math and water math all matter. Same-process trace repeatability is useful evidence but weaker than cross-platform determinism.

Use reset state explicitly: canonical hull pose, zero motion, lifted/reset paddles, cleared forces and safe hazard phase. A checkpoint is not just a teleport into the same active collision or a write of arbitrary live velocities. Air-only propulsion tests must exclude solid contact and compare against a matched immersed stroke; legitimate bracing above water belongs in a separate contact test.

## 5. Multiplayer, session and recovery contract

One crew occupies one authoritative room. The host organizes invitations but never owns physics. Other players should survive host transport loss. Server snapshots need a tick, hull transform/velocities, four blade states, seat/connection state, checkpoint/reset revision, relevant world/hazard version and input acknowledgements. Keep a full-state resync path and version handshake.

Start with conservative snapshot interpolation and immediate local paddle presentation. Measure the actual visible relationship among blade, water and hull: a responsive cursor over a delayed boat is not automatically acceptable. Prediction of one shared hull requires estimating three other people's input and replaying contacts; rollback is not free correctness.

Invite/private-room entry should lead directly to playable water. First arrivals can practise with 1–3 people while waiting; launching a flagship Expedition requires all four humans ready. Do not implement bots and then describe them as real teammates. Duplicate tabs or four sockets can validate transport and station routing but not the flagship human criterion.

Disconnect policy remains provisional. The PRD proposes safe pause in dangerous water and roughly 90-second seat retention. These values must be tested for fairness, grief potential and resource cost. Rejoin requires token validation, same seat reclaim, full snapshot, completed assets and a readiness barrier. Expired/duplicate/stale tokens must not steal an occupied seat. Competitive timing must distinguish paused, resumed and assisted runs.

For the first feasibility build, an in-memory checkpoint is useful and should be labeled transient. Full adventure resume later needs transactional/idempotent persistence of checkpoint identity and versions, revision conflict handling, backups and failure UX. Never advertise durable save success before the storage commit.

## 6. Camera, onboarding and presentation priorities

The camera is control infrastructure. Start with a horizon-stable third-person chase view, velocity look-ahead and occlusion clearance. Test reversing, yawing, roll and reset before cinematic effects. The player's blade and waterline must remain readable at small embed dimensions; `907×510` is the source's portal test viewport, not a current independently verified platform requirement.

The opening experience should show the live boat on water, compact invite/practice/settings controls and a short dip/pull/release instruction. During play, keep seat label/icon/color and connection state clear. A temporary diagnostics overlay is appropriate for a feasibility build but is not the final HUD design.

Pointer workspace with hold-to-immerse and an automatic camera is the recommended first experiment. Keyboard keys can move the same blade target, never become hull throttle. Pointer capture must follow an actual user gesture and recover clearly on Escape/focus loss. Controller mapping, remapping, left-handed settings and hold/toggle alternatives remain part of broader UX work. The source conflicts on which analog stick operates the blade; select one mapping provisionally and validate it rather than treat both as fixed requirements.

Early feedback should distinguish air swing, water entry, immersed pull and solid contact. Minimal sound/splash can make physical causality clearer than a power meter. Seat identity must have text or shape in addition to color. Voice chat is optional; internal public text/voice chat is excluded from initial scope.

High-detail characters, inverse kinematics, wet materials, advanced foam/refraction and large vistas belong after core behavior is usable. A simple attractive basin can establish tone without creating the fourteen-region asset backlog.

## 7. World and obstacle synthesis

The Grand Waterworks makes ascent believable through locks, lifts, pumps and moving channels. Preserve visible hydrological cause and effect when expanding beyond the basin. World continuity means route streaming and prefetched landmarks, not keeping an entire continent in memory.

| Route order | Region | Principal skill/identity |
|---|---|---|
| 01 | Willow Headwaters | Safe catches, straight runs, basic turning; cedar river. |
| 02 | Timber Gorge | Current seams, logs, wall brace; proposed first polished slice. |
| 03 | Flooded Old Town | Braking, tight corners, low arches and alternate alleys. |
| 04 | Storm Reservoir | Waves, wind, open-water heading and sheltered coves. |
| 05 | Dam Apron | Heavy flow, timed sluice approach, commitment and catch basins. |
| 06 | Turbine Underworks | Backwash and machinery timing inside large industrial spaces. |
| 07 | Treatment Labyrinth | Precision pivots and multi-gate flow routing. |
| 08 | Lock Stair & Boat Lift | Docking, bracing and coherent vertical transport. |
| 09 | Cave Siphon | Visibility, silhouettes, eddies and pressure/current changes. |
| 10 | Geothermal Pumpworks | Pulsed flow, pump rhythm and uphill flumes. |
| 11 | Glacier Spillways | Ice contacts, wakes, drag and current seams. |
| 12 | High Aqueduct | Long-line discipline, exposure and crosswind. |
| 13 | Suspended Maintenance Channels | Moving water frames, transfers and synchronized braking. |
| 14 | Great Cascade | Synthesis of learned forces, staged recoveries and ocean arrival. |

Each region's intended pattern is read → rehearse → combine → perform → release. A new hazard needs a low-risk introduction and visible recovery before high stakes. The source's eighty concepts fall into hydrology, machinery, debris, weather, terrain, vertical transport, precision and comedy. The table is an idea catalogue, not eighty approved implementation tickets.

Early useful primitives: current seam, eddy, slalom/narrow gate, shallow grounding, reverse-brake dock, basic solid brace and perhaps one drifting log or waterwheel after stability. Deferred high-risk systems: articulated networks of logs, deforming nets, boats on moving/rotating water frames, complex ice collisions and large hydraulic jumps. Reusable tests and clear telegraphs matter more initially than count.

Later authoring should provide IDs/versions, physics parameters, deterministic clocks, warnings, recovery/failure volumes, assets, activation distances and regression fixtures. World chunks need explicit ownership/disposal and a recovery corridor kept resident. Client visual unloading must never delete server collision or halt physical time during a hazard.

## 8. Source inconsistencies and resolutions

| Issue | Evidence and practical resolution |
|---|---|
| Naming | Every source uses an obsolete working name. **Resolved by user:** Bad at Boating; do not ask them to choose again. Earlier research is not commercial clearance for this final name. |
| “Exactly four” versus practice | Both report and PRD explicitly allow fewer-person practice/development. Require four humans for the flagship and label practice honestly. |
| “Locked” stack versus engine comparison | The snapshot calls the stack locked for experiments; architecture tables still permit alternatives. Treat it as a starting baseline, not an irreversible engine choice. |
| Immediate start versus four-person launch barrier | Let arrivals meaningfully practise while the room is joinable. Validate portal-specific behavior only when doing actual portal integration. |
| Bow/stern yaw claim | Pure straight-force yaw depends on lateral offset, not fore/aft offset. Use lateral force/contact cases for differentiated station tests. See section 4. |
| Eighty obstacles differ between versions | Many entries are reworded or substituted: source #61 four-stroke sprint becomes PRD OB-061 Brake line; #63 one-side feather squeeze becomes Dead-stop berth; #64 reverse-brake dock becomes Offset pilings; #79 loose furniture becomes Duck parade. Use stable current PRD IDs for new tickets, retain source ideas as alternates and never assume ordinal identity across versions. |
| Region timings differ | Several PRD durations expand or change the report's estimates. The expanded atlas totals roughly 248–357 minutes (4h08–5h57), which does not exactly match its stated 4–5.5-hour aggregate. Treat all as unvalidated pacing hypotheses and re-estimate from traversal data. |
| Controller mapping | Phase Zero mentions right-stick blade control; PRD leaves stick side generic and camera on the other stick. No final mapping exists. |
| P0 bracing/reconnect versus later hardening phases | Baseline versions must be explored early enough to test the core; robust contact energy, impairment and lifecycle coverage continue later. A small first build can report those as incomplete without claiming the phase passed. |
| Phase status uses BLOCKED for dependencies | In archived tracker this means unstarted downstream design dependency. It does not mean implementation is currently impossible or requires new user permission. |
| Test matrix versus test definitions | The grouped matrix does not define every individual NET/UX/PERF case; `CREW-01` appears in traceability without a detailed definition. Turn necessary first-build checks into explicit fixtures before claiming coverage. |
| Evidence rules versus absent artifacts | No provided source includes actual test runs, game screenshots, server code, benchmarks or human results. Archive statements remain historical; new status must point to observed artifacts. |
| Proposed SDK names | PRD calls its adapter methods an internal sketch. Verify installed API rather than copying them as real platform calls. |
| Citation confidence | Public competitor, SDK, pricing, legal and browser claims are dated source claims. They are not independently verified facts of this analysis and need fresh primary-source checks when used for implementation/release decisions. |

## 9. Practical milestones and requirement traceability

### Milestone A — a runnable physical feasibility build

Build the desktop-browser scene, server room and a shared simulation with one hull, a small bounded test river/basin, four visible station proxies, water/current sampling, constrained dip/pull/release, slalom/gate and reset. Start from Three.js/Rapier/Colyseus/TypeScript. Provide simple local run commands and an obvious practice entry so the user can inspect progress immediately.

Automated acceptance should cover force signs, water-relative behavior, real immersion, bounded targets, floating stability, station agency, deterministic repeat traces, canonical reset, server input rejection and independently connected clients. Manual browser inspection should check that the scene renders, controls are discoverable and all four paddles remain legible. This proves an engineering start; it does not close the complete Phase 01 or 02 gates by itself.

### Milestone B — four-person core usability and network experiment

Complete missing bracing/recovery and reconnect behavior before evaluating those promises. Run four independent browser clients, then at least three genuine four-human newcomer sessions (≥12 fresh people). Freeze build, tuning and acceptance thresholds first. Record failures and stop/iterate honestly when causality or replay desire is weak.

Candidate source thresholds: ≥75% perform a valid stroke within 30 seconds (at least 9 of 12), ≥80% rate motion explainability 4/5 or better (at least 10 of 12), matched air impulse ≤5% immersed impulse, and no hard desync/solver explosion in a 30-minute four-client session. Voluntary replay is qualitative evidence, not a fabricated numeric KPI. Test nominal and impaired networks; bot traffic can support reliability evidence but cannot supply human ratings.

### Milestone C — advanced physical reliability, then the vertical slice

Sweep buoyancy layouts, improve anisotropic drag and wave/current behavior, prove bounded wall-brace energy and capsize/grounded recovery. Then produce one 10–15-minute Timber Gorge or Headwaters-to-Gorge slice with production-quality input feedback, art/audio, fair camera, one real save, join/rejoin and measured frame/memory budgets. Slice choice remains provisional after human testing.

### Milestone D — production systems and coherent content batches

Only after core and slice gates: harden shared-room networking/persistence; benchmark rooms per host; validate SDK if chosen; build streaming and obstacle authoring; complete small coherent regions one at a time. Finish launch QA/accessibility/operations and a release rehearsal before public deployment. Fourteen regions, monetization, leaderboard security and a multi-hour route are not the first milestone.

| Source requirement | First evidence to collect | Later evidence still needed |
|---|---|---|
| FR-001 Four human players | Four distinct client/seat logs and independent intent | Genuine four-human readiness/traversal sessions. |
| FR-002 No fake thrust | Force-path audit and matched isolated physics fixtures | Contact exploit and full-route audit. |
| FR-003 Water-relative blades | Current/still-water/air comparison | Human perception in waves/current seams. |
| FR-004 Distributed force points | Per-seat impulses and correct torque signs | Fore/aft lateral contact and varied local flow agency. |
| FR-005 Buoyancy/drag/recovery | Idle and stroke traces, bounded contacts | Capsize states, grounding, 30-minute stress and sample sweep. |
| FR-006 Server authority | Forged-state rejection and input validation | Impairment, CPU/bandwidth and correction traces. |
| FR-007 Join/retention/rejoin | Unique seat assignment and safe input expiry | Refresh, host loss, duplicate tokens, grace expiry and races. |
| FR-008 Canonical checkpoint | Repeated reset fixture | Durable revision CAS, restart and corruption recovery. |
| FR-009 Camera/input clarity | Actual browser rendering and controls review | Newcomer tests, controller/accessibility, minimum viewport. |
| FR-010 Scalable presentation | Minimal WebGL2 scene and observed frame data | Defined hardware tiers, art parity and p95 captures. |
| FR-011 World continuity | Versioned sampler and continuous field test | Multi-region stream/unload and long soak. |
| FR-012 Obstacle authoring | Stable simple hazard IDs | Five dissimilar authorable hazards with no core-code edits. |
| FR-013 Platform compatibility | Standalone joinable-room design | Actual current SDK and portal QA tests before portal launch. |
| FR-014 Human gate | Honest unrun status until people participate | Recorded ≥12 newcomer program and explicit review. |
| FR-015 Evidence tracking | Current status with reproduction and artifact paths | Reviewer sign-off before milestone/launch completion. |

## 10. Risks, unknowns and honest completion boundaries

The critical unknowns are whether direct paddle control is understandable and physically pleasant, whether all four seats feel consequential, and whether a shared authoritative body remains readable at realistic latency. Physics contact energy and camera fairness follow closely. These can invalidate the design before graphics, world size or business systems matter.

Questions to answer through experiments: best workspace/range/sensitivity; actual hull mass/inertia and buoyancy sample layout; allowable blade/contact impulse; suitable interpolation delay and correction policy; dangerous-water disconnect behavior; fatigue; viable reference hardware; server room density; sensible first route length; and enough joinable practice to solve the four-friend gathering problem. These are not reasons to delay a reversible prototype.

Human fun, target-device performance, broad cross-platform determinism, hosting economics, durable save recovery, portal compliance, commercial name availability and release readiness require their respective real evidence. An agent must not replace these with a confident summary, simulated participants or a single local benchmark.

**Recommended next action:** implement and inspect Milestone A now, report measured successes and remaining gaps, then use the first playable build to schedule the genuine four-person learning gate. Preserve the final name and the physical-control premise throughout.
