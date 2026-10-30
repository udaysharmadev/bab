# Bad at Boating — initial Timber Gorge route card

20 October 2026. Local authored implementation, not a production acceptance record. Final name and latest lethal-contact/title decisions come from the user. Archived PRD §§8/19.2 supplies the slice direction; its recovery-first policy does not override the user's marked-hazard rule.

21 October update: protocol6 publishes a server-selected mover phase per crew. Five logs/two wheels keep their authored paths/periods and share the same phase offset across physics and all peers; checkpoint retries retain it. Static layout and saved checkpoint indices remain unchanged. Red/ivory sharp danger treatments identify lethal obstacles, green markers identify recovery bays.

Physics continuation: basin-0.10 retains route/checkpoint/clock placement and adds persistent nonlethal shaft bracing; only marked hull contacts break the boat.

Duration target: at least4–4.5 minutes of gameplay. Existing1400m retained pending human pacing. Actual270s four-paddle isolated flat-water test travels323.7m (1.199m/s average); naive1400m flat-water extrapolation19.46min. This is not full-route timing or a fastest-run bound. See `evidence/route-pacing.json`.

| Distance | Encounter | Intended player decision | Recovery/reading space |
|---|---|---|---|
| 0–138m | Willow Headwaters: pylons, rocks, first spikes/log and whirlpool | Learn held WASD/arrows for repeating forward/reverse/turn strokes; read current and gaps | Checkpoints0/48/100; ordinary banks braceable |
| 138–176m | Gorge entrance bridge / Landing | Regroup and read upcoming gorge | Checkpoint156; wide channel |
| 176–244m | Split Stone Slalom | Alternate safe rock gaps, early steering | No moving hazard; next quiet bay |
| 244–278m | Fern Dock | Reset crew cadence | Checkpoint260; green pennants |
| 278–364m | Whitewater Steps | Choose a gap before the current; bounded waves/side flow | Warning before entry; channel widens on exit |
| 364–398m | Stillwater Pool / recovery eddy | Green bank: brake/regroup in a recirculation pocket, turn toward the main channel and row out | Nonlethal pocket366–390m; checkpoint380 spawn lane clear; bank paint, foam and recovery/rejoin boards |
| 398–482m | Timber Works | Read two moving logs, then pass the shared-clock waterwheel at465m using the screen-right bypass | Raised gantries and moving-timber sign; banks remain usable |
| 482–520m | Sawyer Dock | Reassemble before precision passage | Checkpoint500; wide quiet bay |
| 520–612m | Iron Narrows | Keep the hull clear of tapered teeth; brace on plain rock banks | Iron warning, low rapid field, widening exit |
| 612–650m | Cedar Pool | Restage the final line | Checkpoint630; quiet wide water |
| 650–742m | Last Descent | Commit early through rocks and gates in faster water | Fast-water sign before field; no moving log surprise |
| 742–782m | Home Reach | Re-establish rhythm, line up final bridge | Checkpoint760; wide quiet water |
| 782–830m | Old Waterworks | Regroup before Act 2 | Calm reach; not the final gate |
| 830–920m | Millstone Gorge | Thread bank teeth with early steering | Raised camera and warning board |
| 920–1000m | Boulder Garden | Pick alternating rock gaps | Wide view before fast water |
| 1000–1100m | Devil’s Staircase | Pass the mirrored wheel at1040m on screen-left | Shared-clock blades, marked bypass |
| 1100–1140m | Calm Haven | Regroup at checkpoint1100 | Quiet wide recovery bay |
| 1140–1400m | Finish Straight | Read final rocks, teeth and two rapid fields | Fast-water signs; finish pennants at1400 |


## Authored constraints

- The launch and checkpoint bays remain straight; five bends now run through Split Stone (+6m), Whitewater (+8m), Timber Works (−8m), Iron Narrows (+8m) and Last Descent (−9m). Offsets are smooth between each encounter boundary; longitudinal station/checkpoint IDs remain unchanged. Width ranges from25m to13m. A real eight-paddle waterwheel is implemented; the full near-loss rescue set-piece remains open.
- The same constant hazard shapes and water sampler drive physical and visual placement. Five-metre convex bank prisms and visible cliff faces share continuous end vertices; water/bed, bank foam, props and plants follow their corridor. Ordinary banks never trigger marked-hazard destruction.
- Ten checkpoint poses are canonical, remain clear of moving timber at eight tested clock phases, and preserve global obstacle phase on retry. Canonical checkpoint progress is now durable in SQLite and restores into a fresh crew after shutdown; room IDs remain in memory.
- Rapids change visible height and water-relative force through the existing buoyancy/drag system. They do not inject a client steering/thrust shortcut.
- Camera framing blends through Whitewater, Timber Works, Iron Narrows Last Descent, Millstone Gorge, Devil’s Staircase and final rapids; reverse travel looks upstream and camera clearance rays keep scenery from obscuring the hull. This has local fixture evidence, not four-human fairness acceptance.
- Geometric corridor checks expand solids by the complete0.96×2.25m half-extents, rotated by the local river heading, at sampled phases. This proves necessary static clearance; it does not prove human reaction time, turning radius, dynamic maneuverability or full-route completion.
- Warning boards and checkpoint flags are in-world. No route dashboard or permanent instructional overlay is added.
- Audio is an initial generated water/rowing/break/arrival palette with stereo catches. Timber chain/creak ambience, echo treatment, recordings, score and human mix review remain.

## Unclosed slice acceptance

Actual four-human traversal and duration; ≥12-newcomer learning/fatigue/fairness evidence; 10–15-minute target paced from observations; human acceptance of bends/camera and the full near-loss rescue encounter; production rigs/animation/audio; public save/rejoin validation; low/high reference-hardware profile; real Internet network behavior, capacity and long memory soak. Local WebSocket delay/jitter/application-message-drop checks now exist. Zero production-ready regions are claimed.

## M2-B local engineering evidence

`tests/bends.test.ts` verifies curve/checkpoint seams,210 independent recorded water fields,6,688 rendered bank samples against Rapier,30 actual bank rays and143 bed rows. All original checkpoint phases and sampled connected-corridor checks pass. `tests/camera.mjs` passes132 authored forward/reverse/portrait/edge poses. The initial portrait gantry failure was fixed by reducing lateral look-ahead bias on narrow screens, retaining frame limits.

`npm run test:bends` uses a parent-owned IPC fixture to position the real authority at five bend midpoints; four real rendered clients receive each pose and one client completes repeated held strokes. This is deliberately labelled authored pose integration, not an uninterrupted four-human traversal. See `evidence/phase-2-bends.json` and `bends-browser.json`. Phase2 remains active for staged rescue, near-field presentation and genuine acceptance.


## Stillwater recovery encounter — basin-0.9

The left lateral bank after Whitewater contains a compact elliptical curl centred at(-6m,378m), with4.5m lateral and12m longitudinal radii. It adds only bounded horizontal current; existing immersed drag moves the boat. There is no suction core, vertical rescue lift, steering constraint, teleport or immunity after a marked collision. Green wall paint, upstream/rejoin boards and48 foam streaks show the pocket. Its current is zero in every canonical hull/blade spawn lane; lethal obstacles lie beyond the recovery pool.

Nine unpowered physical approaches slow/circulate without reset; three automated four-paddle simulation crews rejoin downstream. Four real rendered clients exercise a single authored approach, ordinary held-key exit, actual reload/pause and majority checkpoint return. These are automated controllability/lifecycle checks, not human route fairness, teaching success or a continuous human journey. See `evidence/phase-2-rescue.json`.
