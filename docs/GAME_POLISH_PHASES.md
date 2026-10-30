# Toy raft improvement passes

22 October 2026. User asks for substantial graphics, mechanics and logic work throughout the game, with a beautiful uncluttered landing. Existing A/D station movement, giant Space-operated fans, four dividers and coast-to-rest remain the control contract.

## Roadmap

| Pass | Scope | Completion gate | State |
|---|---|---|---|
| P1 | Menu composition, readable toy crew, water/contact/wake treatment, owned-stroke feedback and hands-on practice lesson | Native phone/desktop captures, lesson/input/room regressions, bounded scene counters | LOCAL IMPLEMENTATION + QA; ART REVIEW OPEN |
| P2 | Complete first course: authored teaching/challenge/relief beats, additional physical obstacle families, safe seeded variants and checkpoints | Actual collision/clearance checks and measured four-human4–4.5 minute clean runs | PLANNED |
| P3 | Final fan/impact/checkpoint audio and animation, accessible controls, durable fan-world saves and Internet/rejoin quality | Sound/device checks, storage conflicts, latency/drop/long-session checks | PLANNED |
| P4 | Whole-game readability, performance and release review | Recorded named devices, human sessions, accepted course breadth and release package | PLANNED |

## Plan — P1

| # | File | Change | Risk / recovery |
|---|---|---|---|
| 1 | index.html, src/client/fan.css | Smaller cleaner wordmark, cream negative space, one primary action, quiet practice action; compact coherent lobby/HUD/controls | Check10 viewport layouts and keyboard/name flow |
| 2 | src/client/fan-scene.ts | Contained title water diorama; smooth expressive crew and distinct headwear; quieter water, contact shadow and directional half-wakes; owned station marker | Fit entire diorama; preserve gameplay camera, collider silhouettes and four divider corridors; sample counters |
| 3 | src/client/fan-feedback.ts, fan-main.ts | Stroke/recovery/coasting feedback from authority; ordered practice tasks for fan, scoot-turn and settling; reset safely on retry | Actual input/state tests; pause/menu/reconnect must not advance lessons or run hidden controls |
| 3a | src/shared/fan-simulation.ts, tests/fan.test.ts | Clear flap counters only on a new round, retain them on checkpoint retry; lesson tracks a per-retry baseline | Match existing round timer semantics; no force or protocol change |
| 4 | tests/fan-feedback.test.ts, fan-polish.mjs, existing native fixtures | Pure state transition checks plus actual browser practice/Ready/phone/gameplay verification and screenshots | Correct failures without weakening limits |
| 5 | Tracker/status/evidence | Track completed implementation separately from human art/feel acceptance | Keep older hashes/counts historical |

Decision: reuse Three.js meshes, the current shader/authority and native HTML. P1 changes presentation, local teaching and fresh-round statistics, not fan force, map collision or multiplayer protocol. No dependency, image download, second renderer or new input mode. The cream title scene should keep scenery out of the logo/action area, and the playable course keeps the agreed toy palette.

## P1 checklist

- [x] Clean title composition and restrained copy/actions
- [x] Entire title diorama fits its stage on narrow and short screens
- [x] Readable faces, clothing and distinct headwear
- [x] Soft raft contact and less noisy directional wakes
- [x] Four dividers remain outside player movement corridors
- [x] Owned station marker and server-derived stroke/recovery/glide feedback
- [x] Ordered hands-on solo lesson and completion state
- [x] Retry, pause, dialogs and reconnect retain their input guards
- [x] Build, focused state tests and affected native regressions
- [x] Final preview captures and tracker update

## Evidence

P1 removes scenery behind the title and contains the animated raft in one small water diorama. The menu has a smaller clear wordmark, one main friends action and a quiet practice action. Four original toy crew members now have smooth skin/clothing, smiles, bibs and distinct headwear. The course retains its collision shapes and palette; quieter water, a soft cosmetic contact patch and fading directional half-wakes improve separation. An owned station ring, owned-label flash and server-derived push/recovery/glide meter show what is happening without adding inputs. The practice lesson observes a real owned stroke, actual offset power and released horizontal rest. Its baseline resets on retry and waits for owned-seat assignment; menus, hidden tabs, pause and failure block progress. Fresh rounds clear timer/flap statistics; checkpoint retries retain current-run counts. The four existing dividers and force tuning are retained.

Full `npm test`: **157 tests,157 pass,0 fail**,111.800 s, after lesson/round logic (`evidence/fan-polish-regression-final.txt`). Focused feedback/state checks pass. Subsequent final build/native checks cover the final camera spacing and keyboard/screen-reader menu refinements. Final native scope:10 title layouts, eight four-client check groups and18 authored course views pass, errors[]. Actual Space/keyup retains about0.66 m coast and zero late drift. Native practice completes the ordered lesson, retries without skipping steps and exercises Low graphics. Touch-enabled1280×900,390×844 and907×510 layout checks prove the feedback does not overlap the conservative projected raft bounds or HUD. The first phone and wide-touch overlap failures were corrected by camera spacing and separate short-landscape placement, not by weakening the checks. Sampled gameplay stays under150 calls /250k triangles; these are not device FPS certification. Actual batched geometry still contains4 dividers, with0.258 m minimum body-envelope clearance over1,604 station samples. Initial/final scoped logs and captures are retained under `evidence/fan-polish-*`.

The final preview is available at http://localhost:2571/ . Its built menu was reloaded and visually inspected in the app. Local version/health/four-seat/countdown/pause/reconnect smoke passes. Source/build fingerprints and exact check references are in `evidence/fan-polish.json`. Old `fan-r1.json` / `fan-coast-release.json` describe historical builds; their hashes do not certify this pass. The force model/protocol remain fan-raft-0.2 / protocol1; the round counter correction is compatible with the snapshot schema. No public deployment or new dependency.

## Next course pass — tracked work

- [ ] Author six linked teaching/challenge/relief beats; use actual clean-run timing instead of empty distance.
- [ ] Add physical sliding gates, padded moving arms and visible side-wind challenges with their own safe teaching pockets.
- [ ] Keep plain surfaces nonlethal and tooth silhouettes aligned with actual collider reach at attainable speeds.
- [ ] Build curated safe variants, a shared room seed and stable retry/reconnect variant identity.
- [ ] Place checkpoints before difficult combinations, with verified safe reset and approach corridors.
- [ ] Observe all four roles contributing; revise bends/timing if the forward-facing pair dominates.
- [ ] Measure coordinated4–4.5 minute clean runs and separate newcomer/retry times with human crews.

Full course, final sound/persistence and human/device acceptance remain open. P1 does not certify the whole game complete. **VERDICT: PASS for the scoped local implementation and checks.**

## Visual revision — more personality

Owner feedback: the cream diorama menu became too simple. Keep the two-action layout, but add a richer toy-game identity.

| File | Revision | Check |
|---|---|---|
| index.html, fan.css | Chunky outlined wordmark and fan emblem, seafoam backdrop, tactile play button and compact practice pill | Ten sizes, readable actions and keyboard/name flow |
| fan-scene.ts | Full harbour, palm/islets, dock, buoy and rock dressing; richer title-only water highlights | Raft fits its stage; background protected under menu gradients; unchanged gameplay shader path and physics |

Decision: restore a full toy-harbour backdrop instead of the isolated presentation disc. Frame the raft inside its hero area, with soft opaque gradients protecting the logo/action zones from background scenery. Add detail to the existing original scene, with no extra renderer, downloaded art or new gameplay input. Build and inspect native captures before accepting the revision.

Implemented and visually inspected in the app. Strict build PASS; native10 title layouts/name/return/reduced-motion checks PASS, errors[];18 authored gameplay views PASS, errors[]. `evidence/fan-personality-build.txt`, `fan-personality-landing.txt`, `fan-personality-world.txt` and `fan-personality.json` record this revision. Prior P1 captures/hashes are historical. No physics or multiplayer authority changes; full logic regression was not repeated for title-only art.
