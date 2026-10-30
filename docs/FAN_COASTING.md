# Fan release and coasting

User report: one stroke followed by release keeps the raft moving indefinitely.

Observed cause: the production simulation defaults to a0.95 m/s downstream water current. Drag acts relative to that moving water, so releasing a fan correctly approaches the current speed instead of stopping. The toy training course needs still-water handling.

## Plan
| # | File | Change | Risk |
|---|------|--------|------|
| 1 | src/shared/fan-simulation.ts | Default Fan Camp to still water; tune passive linear/quadratic drag and low-speed settling | Preserve momentum, thrust direction, torque, collisions and buoyancy |
| 2 | src/shared/fan.ts | Bump physics identity for changed handling | Old/new clients must not share mismatched physics |
| 3 | tests/fan.test.ts | Measured one-stroke/held-release stopping, idle and turning cases; retime synthetic pilot honestly | Keep no-input propulsion and actual course reachability checks |
| 4 | tests/fan-route.mjs and scripts/check-deployment.mjs | Use current physics identity in native/local smoke | Verify staging before replacing localhost authority |
| 5 | Build/evidence/status/tracker | Record measured coast distance/time; apply preview update | In-memory preview crews need a fresh room after authority restart |

Decision: resistance slows the same rigid body. No distance cap, position clamp, fake tween or instant key-release brake. Current remains available only when explicitly selected by a future course. A tiny rest threshold may remove the final imperceptible exponential tail while preserving heave and roll.

Acceptance: a stroke still produces visible glide; no-input raft stays put; release settles to rest within a short bounded interval; stronger/multiple strokes coast farther; repeated input, torque, hazards and sockets still work. Stage before applying the local authority restart. No public deployment.

## Results
Current physics identity: `fan-raft-0.2`. Default current is zero, passive horizontal resistance is `(185 +70×speed)×velocity`, and yaw damping also increases. Only the final horizontal tail below0.04 m/s and yaw below0.015 rad/s settles to exact rest while no fan is applying force. Vertical heave/roll remain physical. These are stylized game tuning choices, not measured real-raft coefficients.

Actual Rapier tests:16 seat/heading cases retain0.525 m/s release speed, glide about0.660 m after release and settle in3.633 s. Two synchronized fans coast0.919 m after one stroke versus1.209 m after a2-second hold. A20-second idle case at an off-centre course position stays at the same horizontal coordinates; offset-stroke spin also settles. Real-browser300 ms Space/keyup test records0.669 m coast and zero further displacement in its late-rest window, one owned stroke, errors[]. `evidence/fan-coast-targeted.txt`, `evidence/fan-coast-browser.json` and `evidence/fan-coast-native.txt`.

The original coast-based2 m/s hazard fixture safely stops short under the stronger drag. The replacement continues the low-speed approach with two genuine fan inputs until actual contact; the20 m/s CCD case, near misses and real moving-sweeper strike are retained. The same input pilot still reaches the checkpoint/finish without reset or teleport in145.433 simulated seconds, maximum1.487 m/s. Its old83.55-second timing relied on the removed current and is historical; the revised assertion explicitly targets the still-water slice rather than pretending the earlier pacing still holds. This is synthetic reachability, not human full-game duration.

Staged and final builds and10 physics tests PASS. Native four-client flow: eight groups PASS, errors[]. Course camera:18 authored views PASS, errors[]. Full `npm test`: **154 tests,154 pass,0 fail**,110.657 s (`evidence/fan-coast-regression.txt`). Stage health/version/four-seat/countdown/pause/reconnect smoke PASS on2572. Tracker regeneration, dependency/evidence checks and both tracker tests pass.

The final built preview is running at http://localhost:2571/ withphysics0.2. Main-origin smoke, actual browser Space-release coast and all10 landing layouts/name/reduced-motion checks pass after restart (`evidence/fan-coast-local-smoke.json`, `evidence/fan-coast-native-final.txt`, `evidence/fan-landing-native-final.txt`). A fresh root menu was opened and visually inspected in the app. Earlier in-memory preview crews ended on restart; start a fresh crew. Temporary2572 staging was stopped. No public deployment. Artifact/source hashes and verification scopes: `evidence/fan-coast-release.json`.

VERDICT: PASS for the tested coasting, landing, divider and affected multiplayer/camera scope. Human feel/art/device acceptance remains open.
