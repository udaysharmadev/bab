# Fan raft R1 implementation batch

Subsequent updates: [landing redesign and four dividers](FAN_LANDING.md), and [still-water coast-to-rest physics0.2](FAN_COASTING.md), with separate post-change verification. Counts and hashes below describe the initial R1 batch.

21 October 2026. Confirmed controls: small A/D player movement; Space operates one giant funny hand fan. Scope: an authoritative multiplayer toy raft feel slice, not the complete 4–4.5 minute course.

## Plan

| Step | Files | Change | Risk / recovery |
|---|---|---|---|
| 1 | src/shared/fan.ts, fan-simulation.ts | Versioned input/course contract; round raft, sampled buoyancy, bounded fan strokes, off-centre forces, actual contacts | Verify directions, torque, cancellation, release, CCD and safe checkpoint placement in Rapier before tuning |
| 2 | src/server/FanRoom.ts, index.ts, BoatRoom.ts | Register isolated fan-world authority; reuse name validation/IP limit; four-ready, reconnect/pause, input freshness, reset voting | Preserve legacy room contract; reject old saves/versions; no old-world checkpoint reinterpretation |
| 3 | src/client/fan-scene.ts, fan-input.ts, fan-main.ts, fan.css | Original code-native toy raft/fans/course; stable camera, labels, touch, new onboarding | Inspect real desktop/phone frames; input clears on focus/menu/network/context transitions |
| 4 | index.html, legacy.html, vite.config.ts | Make new slice the default; retain old entry for historical regression/recovery | Build both entrypoints; do not silently migrate old crew IDs |
| 5 | tests/fan*.ts, tests/fan-browser.mjs | Actual physics/network/native-browser checks and captures | Correct failures without weakening acceptance; old tests stay historical |
| 6 | Reboot/status/tracker documents, scripts/tracker.mjs, tracker tests and evidence | Record observed R1 scope and remaining work; show current R0–R4 cards above the historical ledger | No full-course, human-fun or device-performance acceptance from local tests |
| 7 | README.md, package.json, scripts/check-deployment.mjs | Document the current entry/controls and add explicit fan check commands; smoke-check the new default authority | Keep legacy entry available; no public deployment or package publication |

Decision: use the installed Three.js, Rapier and Colyseus. A separate small fan-world room and entrypoint isolate the incompatible controls/world while the legacy prototype remains accessible. The new room uses in-memory crew checkpoints during R1; durable new-world voyages belong to R3. Existing stored voyages remain untouched. No public deployment or new dependency.

Acceptance for this batch: playable named four-person room, explicit Ready/countdown, animated toy scene, real opposing fan thrust and scoot torque, nonlethal bumps versus visible lethal spikes, shared checkpoint retry, no stale thrust after pause/rejoin, honest scope in the tracker. Human feel review, complete first course and additional levels remain separate gates.

## Delivered behaviour

The default entry is the new Fan Camp slice. Four diagonal stations on a round inflatable raft have original simple avatars and oversized pleated folding fans. A/D and left/right arrows move only the owned player, bounded to ±0.28 m. Space starts/repeats a server-owned0.7 s stroke cycle; its short sine-shaped force envelope acts at the moved attachment. Air and reaction oppose; centered opposing fans cancel; scooting changes the actual yaw moment. No forward boost, paddle simulator or direct yaw command powers this mode.

The loaded280 kg round body uses nine sampled vertical buoyancy forces, water-relative drag, yaw damping and actual Rapier contact/CCD. Fan force remains horizontal. Plain banks/rocks bump; visible toothed rails and the kinematic spiked sweeper fail the raft once. Predictive contact pairs alone are insufficient: a manifold separation at most1 mm is required, rechecked on every tick. Checkpoint capture at76 m precedes the156 m finish. Completion freezes authority until replay; active retry requires distinct majority votes, while a failed raft can retry directly.

Names are confirmed before joining even when prefilled. Own label is You; other labels use entered names. Empty stations offer a simple invite plus. Four explicit Ready states and a three-second countdown launch the room; unready/disconnect cancels countdown. Lobby water and raft bob animate while authority is anchored. Dropping a seat pauses the shared simulation; the90-second reconnect reservation retains its name and seat. Rejoining, retry, blur, dialogs, context loss and stale input clear fan effort. A550 ms wall-clock watchdog works even when a long authority stall discards simulation steps. Neutral rearm prevents held-key replay on resume.

Native Three.js meshes/material batches, one shadowed sun and opaque cyan water replace the old realistic presentation in this entry. The camera follows course progress rather than raft yaw and adapts to portrait. The four-client fixture observes94–98 calls and49,970–50,162 triangles in its sampled final views. These are draw counters, not target-device timing or general FPS acceptance.

The legacy entry and room retain their separate protocol/physics/save identities. New invites use `?raft=…`; old `?crew=…` URLs offer the previous entry. A fan room rejects old save tokens rather than reusing checkpoint indices. Its current checkpoints live only within the crew; durable new-world storage remains R3. No public deployment or new release ZIP is part of this batch.

## Verification scope and iteration

- Final `npm test`: **153 tests passed, 0 failed**,109.503 s, after the watchdog/contact/phase-board changes. Log: `evidence/fan-complete-regression.txt`. Earlier151/152-test runs are preserved as historical iterations.
- Final `npm run build`: strict TypeScript check,83 Vite modules and bundled authority PASS. The existing shared-engine chunk advisory remains. Runtime-source fingerprint, nine artifact hashes and the exact check scopes are in [fan-r1.json](../evidence/fan-r1.json).
- `npm run test:fan`: **tests11, pass11, fail0**, including actual physics, sixteen seat/heading thrust cases, eight offset-torque cases, cancellation, cadence/packet-spam equality, stale/release guards, heel stability, fast and moving contacts, predicted near misses, actual sockets and a controlled long-stall watchdog. Log: `evidence/fan-targeted-final.txt`.
- Input-only pilot: **83.55 simulated seconds**, maximum sampled speed2.6085 m/s, one checkpoint, zero resets and no teleports. All four stations fan. This is synthetic reachability/pacing; it is not a human completion-time or fun study.
- Final four-native-client flow: **eight check groups, errors[]**, desktop plus real Chrome touch/cancel and delayed page-reload reconnect. Water-only crop pixels change and rendered raft bounds bob during the anchored lobby. Record: `evidence/fan-browser.json`; log: `evidence/fan-native-final.txt`.
- Route camera: **18 authored views**, six poses across1280×900,390×844 and907×510, plus a Low view, errors[]. Raft bounds stay inside the viewport. Four real socket seats share the same authority; one renderer captures the views. QA poses use parent IPC in a test-only server, never a shipped teleport endpoint. Record: `evidence/fan-route.json`.
- Local built-game smoke: four distinct fan seats, health/directory guard, actual countdown, clock advance, drop/pause and same-seat reconnect PASS. `evidence/fan-local-smoke.json`. This addresses localhost only.
- Current phase cards, legacy distinction, dependency/evidence guards and tracker filters pass their unit and native-browser checks. The accepted legacy scope counter remains unchanged; no fan-game production percentage is invented.

The first native menu fixture pressed Space while the native Back to the Raft button had focus, correctly activating that button. The fixture now clicks dialog text before checking that Space cannot fan through a menu. A low-speed near-contact fixture was stopped by the solver with4.6 mm still separating surfaces; it did not constitute actual touch. The replacement first proves an existing separated pair, then moves the QA wall into real contact. The1 mm production threshold was retained, and a separate real moving-sweeper strike is verified. Initial TypeScript transport/event listener errors were corrected before building.

Remaining gates: four-human participation and feel, owner art approval, complete4–4.5 minute course, curated random variants, final crew/fan/failure animations and sound, controller/remapping/accessibility migration, durable fan voyages, Internet impairment and long sessions, named-device CPU/GPU/frame budgets and additional accepted levels. R1 uses fixed loaded mass; avatar movement changes the force attachment rather than simulating each person's shifting body mass. It does not claim naval/aerodynamic accuracy or final game acceptance.

Local preview: http://localhost:2571/ . Start a fresh fan crew; previous crew IDs belong to the legacy world. Temporary port2572 preview was stopped. **VERDICT: PASS for the scoped R1 engineering checks; human/device/complete-game gates remain open.**
