# Bad at Boating — first human crew study

Status: **NOT RUN**. This document is a test plan, not evidence that players participated or enjoyed the game. Existing automation does not fill these rows.

## Participants and setup

Recruit at least12 newcomers in three separate crews of four. Use participant IDs, never names in public evidence. Obtain consent before any recording; offer observation without recording. Each participant needs their own browser/keyboard/headphones and the same deployed build. Record the `/health` protocol/physics, browser version, device model, graphics setting and connection type. Verify the destination deployment smoke first. Do not coach the whole control sequence before observing first use.

## Session script

1. Show the title. Ask the organiser to create a crew and invite the other three. Observe whether each player can join, identify their character/paddle and get Ready. Record join errors and time to first intentional stroke. If stuck for60s, help and record exactly what was said.
2. Ask the crew to move forward, stop/reverse, turn each direction and approach a safe bank. Observe held-key use, blame/confusion, side effects and camera visibility. Ask each player to explain why the boat turned after one person's stroke.
3. Let the crew attempt the authored route without route instructions. Record each marked contact, warning visibility, checkpoint capture, retry, near miss, unintended action and occasion where a player could not tell what happened. A route attempt may end early; preserve that outcome rather than teleporting the crew forward.
4. If they reach Timber Works, observe whether the moving logs and red waterwheel/left bypass are understood before contact. Do not count the authored graphics fixture as this observation.
5. At a saved checkpoint, stop all rowing, have one player reload, then reconnect. Separately announce a server restart in a controlled QA session, restore using Continue Voyage/private recovery code, and have all four Ready. Record whether progress, ownership and expectations match. Never restart an unrelated live crew for this test.
6. Target30minutes per crew; allow people to stop at any time. Record actual duration, breaks, fatigue and failure reasons. A separate named-device90-minute performance soak remains required for the production gate.

## Record per crew

| Crew ID | Build | Device/browser IDs | Join/ready seconds | First intentional stroke seconds | Finish reached/time | Crashes/retries | Control/camera confusion | Drop/save outcome | Stopped early/reason |
|---|---|---|---|---|---|---|---|---|---|
| C01 | | | | | | | | | |
| C02 | | | | | | | | | |
| C03 | | | | | | | | | |

Use a timestamped incident log with: session/participant ID, observed action, expected result in the participant's words, actual result, reproduction/evidence reference, severity and follow-up. Do not store invite/recovery/reconnect credentials in recordings or reports.

## Individual questions after play

Ask each participant privately, recording answers without rewriting them into positive feedback:

- What did holding W, S, A and D do? Which paddle belonged to you?
- Describe one moment when the boat moved differently than you expected.
- Which obstacle was hard to see or understand? Did any collision feel unfair, and why?
- Rate control clarity, camera readability, physical believability, fatigue and desire to play again from1–5; explain the lowest rating.
- Would you choose to play another run with this crew? What would need to change first?

## Gate decision

Keep the recommendation **ITERATE** until a named reviewer evaluates genuine participant evidence against the original PRD gates. Record PASS/ITERATE/FAIL with observed facts, unresolved P0/P1 incidents and a concrete next change. Do not manufacture signoff, newcomer observations, duration or a production-ready region from this checklist. Use `PRD_PROGRESS.md` to track the remaining production gates.
