# Bad at Boating — initial Timber Gorge route card

20 October 2026. Local authored implementation, not a production acceptance record. Final name and latest lethal-contact/title decisions come from the user. Archived PRD §§8/19.2 supplies the slice direction; its recovery-first policy does not override the user's marked-hazard rule.

| Distance | Encounter | Intended player decision | Recovery/reading space |
|---|---|---|---|
| 0–138m | Willow Headwaters: pylons, rocks, first spikes/log and whirlpool | Learn held WASD/arrows for repeating forward/reverse/turn strokes; read current and gaps | Checkpoints0/48/100; ordinary banks braceable |
| 138–176m | Gorge entrance bridge / Landing | Regroup and read upcoming gorge | Checkpoint156; wide channel |
| 176–244m | Split Stone Slalom | Alternate safe rock gaps, early steering | No moving hazard; next quiet bay |
| 244–278m | Fern Dock | Reset crew cadence | Checkpoint260; green pennants |
| 278–364m | Whitewater Steps | Choose a gap before the current; bounded waves/side flow | Warning before entry; channel widens on exit |
| 364–398m | Stillwater Pool | Slow down and preview timber gate | Checkpoint380; no rapid field |
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

- Centerline is straight in this initial route. Width is eased from25m to13m across authored beats. A real eight-paddle waterwheel is implemented; natural winding basalt bends and the full near-loss rescue set-piece remain open.
- The same constant hazard shapes and water sampler drive physical and visual placement. Five-metre bank pieces conservatively follow width; ordinary banks never trigger marked-hazard destruction.
- Ten checkpoint poses are canonical, remain clear of moving timber at eight tested clock phases, and preserve global obstacle phase on retry. Canonical checkpoint progress is now durable in SQLite and restores into a fresh crew after shutdown; room IDs remain in memory.
- Rapids change visible height and water-relative force through the existing buoyancy/drag system. They do not inject a client steering/thrust shortcut.
- Camera framing blends through Whitewater, Timber Works, Iron Narrows Last Descent, Millstone Gorge, Devil’s Staircase and final rapids; reverse travel looks upstream and camera clearance rays keep scenery from obscuring the hull. This has local fixture evidence, not four-human fairness acceptance.
- Geometric corridor checks expand solids by hull extents at sampled phases. This proves necessary static clearance; it does not prove human reaction time, turning radius, dynamic maneuverability or full-route completion.
- Warning boards and checkpoint flags are in-world. No route dashboard or permanent instructional overlay is added.
- Audio is an initial generated water/rowing/break/arrival palette with stereo catches. Timber chain/creak ambience, echo treatment, recordings, score and human mix review remain.

## Unclosed slice acceptance

Actual four-human traversal and duration; ≥12-newcomer learning/fatigue/fairness evidence; 10–15-minute target paced from observations; bends/camera volumes and full near-loss rescue encounter; production rigs/animation/audio; public save/rejoin validation; low/high reference-hardware profile; real Internet network behavior, capacity and long memory soak. Local WebSocket delay/jitter/application-message-drop checks now exist. Zero production-ready regions are claimed.
