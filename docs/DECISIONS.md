# Bad at Boating — implementation decisions

19 October 2026. These are reversible prototype choices, not claims of production validation. The archived source decision log is unchanged in `reference/boat_project/docs/DECISION_LOG.md`.

| ID | Decision | Evidence and reason | Reopen condition |
|---|---|---|---|
| ADR-001 | Final game name: **Bad at Boating** | Explicit user decision supersedes all supplied working names | Only a new user naming decision |
| ADR-002 | TypeScript, Three.js 0.186.1, Rapier 0.21.0, Colyseus 0.18 | Specified experimental stack; installed APIs inspected; package-lock pins exact dependencies | Reference hardware or measured networking makes another stack preferable |
| ADR-003 | One 260 kg cuboid collider, twenty buoyancy samples and anisotropic hull drag | Floating/stroke/heel fixtures; visual hull independent from simplified collider | Contact realism, measured stability or CPU cost requires refinement |
| ADR-004 | Constrained blade target with bounded velocity/acceleration and real immersion | Air/water, yaw, lateral bow/stern, rotated stroke and stale-input tests | Human input fatigue or physically misleading contact |
| ADR-005 | Server alone integrates hull at fixed 1/60 s; 20 Hz full snapshots | Four-client authority/reconnect tests; catch-up capped at five steps, dropped debt counted | Measured ordinary RTT readability or tick deadlines fail |
| ADR-006 | Exponential pose smoothing; local cursor responds immediately | Simple initial presentation with no guessed teammate input | Real four-human latency A/B justifies timestamp buffers or prediction |
| ADR-007 | Fewer-person practice; four connected ready seats before Expedition | Explicit practice allowance and implemented four-client barrier | User changes flagship scope; transport cannot verify actual human presence |
| ADR-008 | Expedition freezes on transport drop; 90-second token seat retention | Drop/resume and browser refresh fixtures | Human fairness, grief, background-tab or resource studies |
| ADR-009 | Transient server checkpoints at 48/100 m; canonical reset | Repeated reset and capture revision fixtures | Adventure resume becomes milestone scope; add transactional storage |
| ADR-010 | Shared low-frequency sampler; same-runtime repeatability only | Renderer samples the physics water function; repeat trace and seam tests | Cross-platform playback requires approved deterministic math |
| ADR-011 | One procedural test river; no mass world/art production | No original game code; core human study remains unrun | Genuine human core gate passes and slice scope is selected |
| ADR-012 | Bank bracing uses a swept point ray and a 260 N bounded horizontal reaction | One bank-contact fixture proves bounded reaction; inexpensive experiment | Persistent contact/shaft geometry or energy tests require shape sweeps/constraints |

## Physics clarification

Pure longitudinal strokes at equal lateral offsets do not acquire different yaw solely from fore/aft placement. With Y-up, `torque_y = r_z F_x - r_x F_z`. Bow/stern differentiation is tested using lateral sweeps; there is no invented station multiplier. Paddle drag is computed in the hull frame and rotated into the world, so turning the hull also turns its force axes.

## Technical sources checked for this implementation

- [Rapier forces and impulses](https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/): point-applied reactions and clearing persistent forces.
- [Colyseus room lifecycle](https://docs.colyseus.io/room/lifecycle): current drop/reconnect hooks.
- [Colyseus reconnection](https://docs.colyseus.io/room/reconnection): seat retention and stored-token refresh flow.
- [Three.js API](https://threejs.org/docs/): WebGL renderer and scene primitives.

Installed TypeScript declarations were used to verify actual package signatures. Marketing, launch platform rules, legal availability and competitor claims were not needed to implement the basin and are not represented as newly verified facts.

## Latest user-directed changes

- **ADR-013 — Arrow-only own-blade control.** Up lifts/reaches, Down dips/pulls, Left/Right sweep, release lifts. Mouse and Space bindings removed. Sideways targets account for mirrored seat geometry. Pure input fixtures and four-context browser behavior verify the mapping; human usability remains open.
- **ADR-014 — Title and friends dock.** Title → Play with Friends / Join Crew / Practice. Friends wait in a frozen shared dock, then all four ready. Separate Practice supports fewer players. This supersedes direct-entry defaults; meaningful tethered practice while waiting remains future UX work.
- **ADR-015 — Lethal marked obstacle contacts.** Server Rapier collision events involving the hull and tagged red-marked pylons/rocks latch one shared break. Blades and checkpoint capture stop; buoyancy is removed; hull sinks and panels separate. After 2.5 simulation seconds the crew retries the canonical checkpoint. This user's decision overrides recovery-first for these obstacles. Ordinary banks and blade-only contact are nonlethal.
- **ADR-016 — Quiet run view.** Normal gameplay has one small menu button. Controls, crew management and settings belong in title/lobby/menu. Wreck, disconnect and checkpoint messages are contextual, not permanent HUD.
- **ADR-017 — Honest production reporting.** Every final report names prompt completion, observed checks, PRD remainder and next concrete work. All 13 phases and T001–T030 are tracked in `PRD_PROGRESS.md`; no arbitrary whole-game completion percentage.

The wire/physics version is now 2 / `basin-0.3`; prior transient prototype rooms are not compatible. Current primary-source gameplay research is in `RESEARCH_GAMEPLAY.md`.


## Graphics and hazard iteration

- **ADR-018 — Layered water.** Three WebGL Water provides real planar reflection; the same physical sampler displaces a grid at 20 Hz. Fine normals, sun response, artistic depth tint and wake shading are cosmetic. Planar reflection approximates a nearly horizontal surface; depth tint is not optical refraction. High uses a 768×768 reflection target; Lower Graphics skips that pass and shadows while preserving currents/collisions.
- **ADR-019 — Hero detail with a budget.** Procedural crew have distinct headwear/faces, padded vests and boots; two-link arms reach actual paddle-shaft grip targets. Static rig geometry is merged per material; trunks/crowns/shore stones/shrubs/reeds use instancing. These are custom procedural rigs, not production skinned assets or ragdolls.
- **ADR-020 — Shared physical obstacle shapes and clock.** Iron cones share radius/height/base with Rapier. The 4.84m timber capsule follows a 14-second shared-clock path; reset preserves phase. The later whirlpool has a smooth bounded inward/rotating current and 0.55m depression, and a real central rock contact hazard. Flow alone does not invent a break command; actual marked hull contact remains authoritative.
- **ADR-021 — Visual flow communicates real flow.** Foam tracers advect with the shared sampler; they do not rotate against the water's physical direction. Fine surface shading cannot change forces. Physical integration remains 60 Hz.
- **ADR-022 — Scope and AAA direction.** The user authorized graphics/hazard development before the human study. This extends the test river, not all fourteen regions. Lava is a future encounter needing authored geometry, warning, route and failure logic. No AAA quality, finished region, target-hardware frame rate or human fun gate is claimed.

## Timber Gorge continuation and screenshot correction

- **ADR-023 — Minimal title.** User screenshots/request remove Practice, Controls, promotional subtitle/eyebrow/footer/location. Logo plus Play with Friends and Join Crew remain; contextual in-game controls are retained. The user's decision overrides prior title copy and public practice entry.
- **ADR-024 — Shape-contained floor.** Rectangular floor pieces and unscaled lower strakes crossed the taper. Floor polygons are now clipped to the inner hull, a closed underside is added, benches are trimmed and strakes follow interpolated hull cross-sections. True water reflections remain; visual reflection itself is not classified as a glitch.
- **ADR-025 — One authored route, not mass region production.** Extend 138m Headwaters to 820m with thirteen beats, nine checkpoint positions, variable-width gorge, three rapid fields and two further timber gates. Five-metre conservative bank pieces match rendering at the waterline and remain nonlethal for bracing. Initial 0–138m forces/layout remain compatible with existing checks. Physical version is `basin-0.4`, protocol schema remains2.
- **ADR-026 — Procedural feedback audio.** Reuse browser Web Audio for water, stereo catches, wood break and checkpoint/finish cues; gesture unlock, saved mute/volume and background/dialog/disconnect silence. Events derive from server stroke/crash/checkpoint/finish changes. Joining/reconnecting never replays accumulated events. Offline output/mute tests are not a human mix review.
- **ADR-027 — Bounded local rendering.** A boat-following water window samples real world coordinates; closest twelve static foam obstacles bound fragment work. Static props are merged per material inside distance-culled route chunks; foliage is instanced. This is local render culling, not asynchronous world streaming or a named-hardware 60fps claim.
- **ADR-028 — Stable finish and test observations.** A completed room holds simulation/input until replay/reset so players cannot drift into a post-finish crash. Test clients observe either breaking or the persistent sunk state rather than requiring one transient frame under a shared-machine GPU load. Human controls and server contact rules are unchanged.

- **ADR-029 — Hold-to-row actions supersede manual reach/pull.** User feedback requests one key for one complete repeating action. WASD/arrows map to forward/reverse/left turn/right turn. A 1.7s dry-recovery/catch/power/lift cycle generates existing bounded blade targets;30Hz held-key sampling is independent of render frames and OS repeat. Differential sweeps use assigned paddle side, so turn direction agrees at bow and stern; forward+turn rests the inner blade. Opposite keys cancel and aliases never double power. Release/menu/blur/hidden/pause/reset/reconnect stop and restart dry. Rapier continues to own force/torque; protocol2/physics basin-0.4 is unchanged. This supersedes ADR-013's manual stroke sequencing, with human usability still to validate.


## Durable voyage and cPanel continuation

- **ADR-030 — Canonical durable saves.** Use Node24 built-in SQLite/WAL/FULL, server-only checkpoint/finish records, version checks, atomic revisions and45-second active-room leases. A private32-byte random recovery credential is hashed in DB, shared only inside the crew/local storage and never included in invitations. Restore creates a fresh room at a safe checkpoint and requires four-ready; incompatible/corrupt records are retained/rejected. This supersedes ADR-009’s transient-only limit. Accounts, distributed room routing and arbitrary pose restore are outside this implementation.
- **ADR-031 — Actual rotating wheel.** Shared465m wheel constants and18-second quaternion feed rendering and kinematic Rapier paddles/spokes/rims. Marked hull contact is lethal; left bypass always exists. No fake damage command, unmarked instant kill or client-owned phase. Protocol3/physics basin-0.5 supersedes the earlier versions above.
- **ADR-032 — Transport-accurate impairment fixture.** Keep WS message ordering while injecting application-message delay/jitter/drop, and distinguish that from TCP loss. A completed reconnect test waits for a snapshot on the replacement socket after JOIN; onReconnect alone occurs earlier. Production gracefully handles expected reconnection rejection at disposal and drops all stale intents before shared pause. No zero-defect/capacity claim.
- **ADR-033 — cPanel deployment preparation.** User chooses cPanel Node App. Provide prebuilt client + ESM authority with CommonJS Passenger bootstrap, production-only package/lock, Node24, one persistent authority, private local save path, HTTPS/WSS and actual four-client destination smoke. Clean package is verified locally; account/domain/provider capabilities are not available and public deployment is not claimed. Optional Docker/CI definitions are unexecuted configurations.
- **ADR-034 — Bounded gameplay transmission.** High gameplay captures only the submerged riverbed into bounded color and packed-depth targets, then applies screen-space displacement/absorption after rejecting foreground depth. The title keeps reflective analytic water before a playable snapshot; Low skips capture. Capture disables shadows because underwater bed color does not need them and a local WebGL sampler-warning regression proved the shadowed offscreen path unsuitable. Bed geometry is visual-only; water sampler, colliders, saves and protocol do not change.
- **ADR-035 — Authored camera clearance.** Blend camera distances through Whitewater, Timber Works, Iron Narrows and Last Descent; use velocity-aware reverse look, channel clamping and two geometric clearance rays. Keep a fixed horizon/FOV and no persistent gameplay overlay. Reopen after real crews report readability/fairness issues.
