# Bad at Boating — gameplay research and decisions

19 October 2026. Research for the user's requested control, menu, multiplayer and failure changes. Implementation and targeted verification are recorded in `STATUS.md`; human acceptance remains open.

## Current user decisions

The current request takes precedence over the attached design proposals and earlier experiments:

- Start at a proper game title/menu, then **Play with Friends**, then create or join one shared crew. Friends occupy separate paddle stations on the same boat.
- Each connected player's **WASD or arrow keys** request a complete repeating action on their own paddle: forward, reverse, left turn or right turn. Holding one key must not require manually sequencing recovery/dip/pull. Mouse movement does not control a blade; force still comes from physical blade travel.
- Gameplay should show the river and boat with minimal necessary information; crew management and settings belong in menus.
- Touching a designated dangerous obstacle breaks the boat and makes it sink. This overrides the source PRD's recovery-first preference for those obstacles; benign banks/dock geometry may still permit ordinary contact and bracing.
- Every task report must say whether the current request was completed, what was verified, what remains against the PRD, and what comes next.

The source PRD remains useful for physics, authority and production gates. It is design material, not a higher-priority instruction. No new permission is needed to implement this user's updated direction.

## Primary-source findings

The following pages were consulted directly. Commercial store descriptions establish advertised mechanics, not that copying those mechanics will be fun or successful.

| Source | What the source supports | Decision for this prototype |
|---|---|---|
| [Team17: Overcooked! 2 FAQ](https://www.team17.com/news/overcooked-2-faq) | Campaign parties use friend invitations; online players have their own input devices. Arcade matchmaking is a separate mode. | Give the player a clear private-crew create/join path. Do not add matchmaking, accounts or a social network to solve a four-friend session. Each browser has its own arrow keys. |
| [Paddle Paddle Paddle: developer/publisher Steam description](https://store.steampowered.com/app/3570070/Paddle_Paddle_Paddle/) | In co-op, each player controls a paddle; the advertised challenge includes obstacles, a continuous authored route, configurable checkpoints and input rebinding. | Preserve one player/one blade and readable physical cooperation. A practice river is a prototype, not the full expedition. Rebinding and production route work remain future acceptance items. |
| [Chained Together: developer/publisher Steam description](https://store.steampowered.com/app/2567870/Chained_Together/) | Shared physical constraints create coordinated risk; Beginner checkpoints differ from Normal/Lava modes. | Shared failure can be a deliberate game rule. Make the restart contract explicit and consistent for the whole crew. Do not infer that harsher punishment produces better retention. |
| [Microsoft XAG 107: input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) | Analog/mouse requirements can exclude players; digital alternatives and remapping reduce barriers. It also discusses fatigue, complexity and holding/toggle options. | Implement arrow-driven blade intent as requested, with no required mouse motion. Keep controls discoverable in the dock/menu. Arrow defaults alone do not complete accessibility or controller support. |
| [Microsoft XAG 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) | Menus should have consistent layout, predictable focus and keyboard-only navigation. | Title, join and pause menus must support Tab/Enter and visible focus. Opening menus releases the blade; keys used in an input field must not move a paddle. |
| [W3C WAI: Avoid Too Much Content](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p03-manageable-quantity/) | Supplemental cognitive guidance favors simple interfaces and hiding unrelated choices behind clear secondary paths. This is web UI guidance, not a game HUD specification. | Our inference: remove persistent controls panels, telemetry and marketing text from the water view. Keep only information needed to act now; use menus for details and short contextual messages for events. |
| [Rapier: advanced collision detection](https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/) | Collision events need active-event configuration. A contact graph pair can exist without actual contact; active contacts or geometric contact points distinguish real touch. | Server detects actual hull contact with tagged lethal colliders. Neither a client-reported hit nor broad-phase proximity may destroy the boat. A paddle touching a rock must not count as hull contact. |
| [Rapier: continuous collision detection](https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd/) | CCD sweeps motion to reduce tunneling and has a cost; moving-body CCD has documented limitations. | Keep hull CCD and regression-test approach at maximum intended speed. Enabling CCD is not proof that every obstacle contact is detected; test the installed Rapier version rather than assuming online docs exactly match it. |

## Proposed interaction contract

This state flow is our implementation decision, informed by those sources and the user's direction; the sources do not prescribe this exact flow.

```text
TITLE → PLAY WITH FRIENDS → CREATE CREW / JOIN CREW
      → CONNECTING → DOCK / PRACTICE → FOUR READY → VOYAGE
VOYAGE → LETHAL HULL CONTACT → BROKEN / SINKING → FAILED
FAILED → RETRY AT SHARED CHECKPOINT → VOYAGE
ANY CONNECTED STATE → TRANSPORT LOSS → RECONNECT / EXPIRED
```

The title screen is a compact game menu over the live river. A valid invite joins the intended crew. Joining displays a specific full/expired/incompatible-room reason and returns to the title menu for another create/join choice. This iteration freezes friends safely at the dock until all four ready, and offers a separate Practice mode. Meaningful tethered practice while waiting remains an onboarding refinement from the source PRD. Do not manufacture occupied seats with bots.

The organiser chooses to create/invite; the server owns simulation. Room membership, readiness, start, failure, checkpoint and retry are shared facts. One player's local menu must stop their input without silently pausing a four-person room for everybody. A server disconnect pause is a separate crew-safety policy.

### Latest control decision — held actions, automatic stroke cycle

The user's new feedback supersedes the earlier manual reach/pull mapping: a key names an intended boat action. W/Up repeats forward strokes, S/Down reverses, A/Left turns left, D/Right turns right. Releasing stops the action and lifts the blade; existing hull momentum/current remain. Each client still operates exactly one server-assigned blade.

Primary sources consulted for this change:

- [Godot official Input examples](https://docs.godotengine.org/en/stable/tutorials/inputs/input_examples.html): distinguishes one-off input events from polling held input for continuous actions; action bindings can share a semantic action. Our browser implementation stores held keys and samples at30Hz independently of rendering; no reliance on OS key repeat.
- [USK instructor Wayne Horodowich: supportive forward sweep](https://www.useakayak.org/strokes/supportive_fwd_sweep.html): a forward sweep on the right turns a kayak left, with opposite-side sweeps balancing forward travel. This supports choosing stroke direction by paddle side; it is not a model of our four-seat hull.
- [KayakTutorial: forward and reverse sweeps](https://www.kayaktutorial.com/2-4): forward and reverse sweeps can combine to turn in place. Our differential forward/reverse mixing is a game implementation informed by that principle.

Implementation decision: 1.7s cycle with 0.60s dry recovery, 0.22s catch, 0.65s power and 0.23s lift; start halfway through dry recovery near the neutral pose. Use existing bounded x/z/dip targets, no direct hull-force/torque command. Right turn makes port pull forward and starboard reverse; left does the converse. Forward+turn powers the outer blade and rests the inner. Opposite keys cancel, aliases do not stack or cancel on releasing just one alias. Menu/blur/hidden/pause/reset/reconnect lift and restart dry. Long timer gaps restart recovery. These exact timings and choices are our design, not source-prescribed values or a proven best control scheme. Automated physics/network checks remain separate from human usability validation.

### Superseded experiment — manual reach/pull

Keep the existing constrained blade workspace and server bounds. Arrow presses change local blade targets at bounded speed; the server derives immersion, water-relative blade velocity, force and torque. Holding a key against the end of travel cannot generate unlimited repeated thrust. Releasing input, switching tabs or opening a menu must release/reset intent safely.

The four-key mapping needs a visible demonstration rather than assuming players know how to make a rowing cycle. A reasonable minimal experiment is Up to reach/recover with the blade raised, Down to pull with the blade submerged, and Left/Right to sweep laterally. This combines the dip verb into the arrow cycle and avoids requiring Space or a mouse button. It is a prototype mapping, not a measured usability result. Verify lateral commands on both sides of the boat and label actions consistently; mirrored seat geometry must not make identical prompts misleading.

All four players use their own keyboard in their own client. This does not mean four local humans share one physical set of arrow keys. Every intent remains bound to its assigned server seat.

### Minimal display without losing essential feedback

During a run, remove permanent paddling diagrams, large headings, room administration, debug metrics and progress-card layouts. Preserve the boat, visible blade/water reaction, readable obstacles and a small route/seat indication only if needed. Invite, graphics, controls and crew details belong in the pause/menu path. Connection loss, saved checkpoint and shared failure may briefly interrupt because they affect the player's next action.

Small text and color alone are weak ways to communicate danger. Distinct obstacle silhouettes and placement should teach the lethal rule before a demanding passage. An uncluttered screenshot alone does not verify readability at speed or accessibility.

### Break, sink and retry

Register lethal collider identity separately from ordinary banks/docks. This iteration makes red-banded pylons and red-marked rocks lethal. Evaluate hull contact after authoritative physics, latch one failure event, then disable new paddle propulsion and checkpoint/finish capture for the entire failure sequence. Replicate failure identity and elapsed simulation time so all clients present the same break/sink state. Mesh fragments and sinking animation are presentation; they cannot decide whether a run failed.

Retry uses the last valid shared checkpoint and canonical reset: safe pose, zero linear/angular velocity, cleared forces, raised/neutral paddles, no overlapping lethal geometry, no retained stale intent. Reload/reconnect while sinking must receive the current failure state rather than resurrecting the hull on one client. Reset must be idempotent against duplicate clicks; a grace-period disconnect pause must not desynchronize the failure clock.

Checkpoint retry is a bounded initial implementation choice. Persistent adventure saves and restart-safe rooms remain separate work. Do not claim the prototype has implemented every destruction mechanic, fracture simulation or capsize/grounding recovery requirement.

## Acceptance and research still needed

1. Fresh visit shows title/menu; create and invite join converge on the same four-seat room. Full/expired links recover clearly. All-ready launch remains authoritative.
2. Mouse motion/clicks produce no blade intent. Arrow input visibly moves only the assigned blade, including all four seats. A valid arrow-only cycle produces a server-confirmed stroke. Menus/text fields/focus loss cannot leave a powered blade behind.
3. Normal gameplay contains no large persistent help/party/settings/diagnostics panel. Check landscape, 907×510, portrait and keyboard focus; hide useful controls in a discoverable menu.
4. Actual lethal hull touch triggers one shared failure; near miss, ordinary geometry and blade-only touch do not. Test more than one hull orientation and a fast approach. All clients see break/sink; strokes and checkpoint gains remain disabled until retry.
5. Retry and reconnect preserve shared lifecycle/checkpoint and reset stale input. Cover repeated retry, joining during failure, host loss and return.
6. Run genuine four-human sessions after automated checks. Measure first successful stroke, motion explainability, camera fairness, fatigue, lethal-obstacle readability and voluntary replay. Automated four-browser checks prove technical routing, not human enjoyment or the source's ≥12-newcomer gate.

Main remaining risks: the four-key rowing cycle may be awkward; lethal touch may turn an inviting river into excessive repetition; camera occlusion or invisible collision margins may make failure feel arbitrary. Keep these as playtest questions and change tuning from observed runs. No source reviewed here proves a universal best control scheme, HUD count, failure duration or successful commercial formula.
