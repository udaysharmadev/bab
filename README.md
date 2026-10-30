# Bad at Boating

Current direction: **four friends, one round toy raft and four oversized folding hand fans**. The default entry is the new Fan Camp feel slice: A/D (or left/right arrows) scoots your player, Space repeats fan strokes. Outward air produces opposite raft reaction; moving the attachment creates actual turning torque. Smooth rocks/banks bump; visible toothed rails and the moving spiked sweeper fail the raft. Four named players explicitly Ready before a countdown launches. Invites use `?raft=…`; same-seat reload pauses/resumes the crew.

This is R1 of the redesign, not the complete 4–4.5 minute game. Crew checkpoints are in memory for now; durable fan-world saves, full-course expansion, final audio/animation, human playtests and target-device acceptance remain open. The first course is156 m with one checkpoint and a finish. Current physics `fan-raft-0.2` uses still-water drag: release glides and then settles, without an automatic downstream engine. [Current design/phase checklist](docs/FAN_RAFT_REBOOT.md) · [Implementation batch](docs/FAN_RAFT_IMPLEMENTATION.md) · [Landing](docs/FAN_LANDING.md) · [Coasting checks](docs/FAN_COASTING.md).

Run `npm run dev` and open http://localhost:5173, or `npm run build` followed by `npm run start:production` on port2567. `npm run test:fan` checks actual fan physics and local sockets; `GAME_URL=http://localhost:2567 npm run test:fan:browser` checks four native Chrome clients (Chrome installed). The new client uses the existing Three.js/Colyseus dependencies, with no new runtime package.

The previous wooden boat remains at **/legacy.html** with its own `boat` room and protocol7/basin-0.13 identity. Old saved voyages are untouched and are not imported into the fan world. The legacy notes and test counts below describe that previous build. Historical browser fixtures should target `GAME_URL=http://localhost:2567/legacy.html`. The existing deployment ZIP is historical until explicitly rebuilt; no new public deployment is implied.

## Legacy production history

The owner-defined starting baseline is **2/100 accepted scope points**. The [searchable production tracker](docs/PRODUCTION_TRACKER.html) tracks49 deliverables plus80 obstacle concepts and10 signature encounters, with14 region cards, acceptance gates, dependencies, evidence and remaining work. It separates partial code from accepted production scope. Read [the whole-project audit](docs/PROJECT_AUDIT.md) and [development plan](docs/PRODUCTION_PLAN.md). Regenerate the ledger/dashboard with `npm run tracker`; CI checks it with `npm run tracker:check`.

The tracker now has a five-phase execution board: **foundation → premium slice → connected world → release hardening → release/iteration**. [PHASE_EXECUTION.md](docs/PHASE_EXECUTION.md) records the current implementation checklist. Engineering verification and production acceptance have separate states; local automation cannot sign off human/device/release gates.

Phase1 adds real several-room load measurement and1080p High/Low frame/CPU/optional-GPU/heap captures. The performance fixture advances20Hz snapshots so water geometry/effects remain active. Its `PASS` means the capture ran correctly; inspect `targetComparison` for actual budget misses. Missing/disjoint GPU timings remain unavailable/discarded. The current water path uses shared scalar height sampling, cached per-row rapid strength,6,369 vertices and direct warped-grid normals. Tests retain exact authoritative fields and inspect mesh/normal error rather than hiding geometry differences.

```sh
LOAD_SECONDS=120 LOAD_ROOMS=4 npm run test:load
PERF_FRAMES=90 npm run test:performance
```

These opt-in fixtures write `evidence/load.json` and `evidence/performance.json`. The load fixture uses an isolated local port/in-memory database and real SDK/WebSocket clients. It records actual runtime, isolated pause/reconnect, shared resets, disposal, wire payload, event-loop and memory observations. Browser captures record local host/GPU/browser metadata and individual timing samples. They do not establish Internet/hosting capacity or the full consumer-device matrix.

Current local upgrade: **protocol7 / basin-0.13**. Wave-relative buoyancy and contact-driven grounding, a16/20/24 sample sweep, bounded vegetation residency/LOD, slow-socket and pre-handshake guards, finish/catch-up fixes, explicit prior-physics checkpoint migration, saved remapping/controller and visual preferences, and native WebGL recovery are implemented. The Phase2 collision batch now shares the tapered structural shell between rendering, Rapier and the water mask. Contacts require an actual manifold gap of at most1mm, so predicted near misses do not wreck the boat; existing pairs are checked again when they later touch. The loaded260kg mass/centre/inertia and rowing model are retained. Refresh all crew browsers. Canonical basin-0.5/0.6/0.7/0.8/0.9/0.10/0.11/0.12 saves migrate only when safely claimed by a new crew; active or incompatible saves are retained and rejected.

Persistent paddle bracing now uses a conservative shaft capsule at the same visible handle/tip, with actual contact-point leverage and moving-solid relative velocity. Solid reaction remains horizontal and capped at260N per seat. Hull-only lethal contacts are preserved. Shared bed triangles,near-bed drag and bounded ground-paddle bracing are now implemented. Full articulated paddle contacts and human handling acceptance remain open. `npm run test:grace` measures actual45-second reconnect and90-second expiry on a local in-memory authority; allow about2.5 minutes. It never shortens the production timer.

Phase2 now includes five authored bends between the existing checkpoint bays. The same curve places water/bed, continuous bank faces and colliders, hazards, moving timber, props, vegetation and the chase camera. Currents rotate into a unit tangent frame to preserve speed. Checkpoint IDs, locations and obstacle clocks stay unchanged. `npm run test:bends` runs four rendered clients at five authored authority poses and checks real held rowing; it is not a continuous human traversal.

Waiting-dock onboarding now previews your own paddle with keyboard/remapped keys, touch or a standard controller while the shared simulation stays anchored. Water, crew idle motion and gentle boat bob now animate in the lobby. The preview is local and stops at countdown; release and press again after launch. `npm run test:onboarding` verifies the built client using an isolated in-memory authority. It is a visual rehearsal, not a boat-response or human-comprehension test. The Stillwater recovery eddy now follows Whitewater: green bank paint, warning/rejoin signs and48 current-driven foam streaks identify a nonlethal pocket. The crew slows, regroups and rows back into the main channel using normal controls. Marked obstacles remain lethal. Run `npm run test:rescue` for four real rendered clients with automated held-key steering; this is not human acceptance.

Rounded blade cores now detect edge contacts at rest and sweep across thin solids; the conservative shaft capsule remains. Core geometry stays within unchanged visible bevelled blades, including full hull tilt. Solid reaction is horizontal and capped at260N; only actual hull/hazard contact breaks the boat. Shape casts approximate translation at the current60Hz orientation, not arbitrary rotational rigid-body CCD. Scoped evidence: `evidence/phase-2-blade.json`.

Each new crew create/join requires name confirmation before Ready. A remembered name is prefilled; confirmed same-crew refresh/reconnect keeps the seat without asking again. Handles accept up to 20 Unicode codepoints, including non-BMP letters. Remapped controls update both waiting-dock and settings guidance.

Controls in the game menu now support unique letter/number remapping while arrows always work. Standard controllers use left stick/D-pad and Start for the menu; return to neutral after menus, focus loss or reconnect before rowing resumes. Keyboard, touch and controller ownership remain independent. Controller API behavior has an automated fixture; physical-device acceptance remains open. Graphics/motion preferences are saved. Native graphics-context loss releases the paddle and offers recovery/rejoin.

M2-D2 adds stereo dock/river ambience, hull wash driven by speed relative to the shared current, smoothly increasing rapids and immersed paddle-brace sound at each seat. Seven fixed procedural layers share one buffer; event voices stop/disconnect and are capped at24. A soft output guard covers compressor overshoot. No audio download or extra dependency is required. `GAME_URL=http://localhost:2571 npm run test:audio` checks actual stereo PCM plus built-game unlock, saved settings, silence and peer reconnect. `AUDIO_OFFLINE_ONLY=1` runs the rendering checks without a game server. Human listening, regional recordings/music and device acceptance remain open.

M2-D3 replaces the repeated cliff boxes with continuous rock profiles, receding ledges, world-scaled UVs, sediment/wet/moss vertex colours and one locally generated256×256 periodic rock texture. Trees/grass query the actual surface triangles; rescue paint follows the bank chord. The finish backdrop now supports the final vegetation tile. The navigable contact face, physics, checkpoint/finish rules and save versions are unchanged. Independent seam/contact/ground-ray tests and rendered vegetation checks are recorded in `evidence/banks.json` and `graphics.json`; human art and named-device acceptance remain open.

M2-D4 uses one native-depth transmission target/render instead of separate colour and packed-depth passes. High retains actual floor colour, depth absorption and foreground rejection; Low still skips capture. Wake strength/direction follow boat motion relative to the shared current, including reverse/sideways motion; passive drift has no powered wake. Advected crest froth replaces the old chequer pattern. Cosmetic heights use the exact scalar sampler, and distant whirlpool tracers skip simulation/uploads. `npm run test:water` checks actual scene effects; `node tests/water-depth.mjs` checks pixels, one-pass instrumentation, resize, failure-state restoration and resource release. Timing still requires named-device acceptance; see `evidence/phase-2-water.json`.

```sh
npm run tracker:check
GAME_URL=http://localhost:2571 npm run test:accessibility
```

M2-D5 computes tight static camera bounds once after final scenery transforms/merges. Native rays compare exact bounded/unbounded hits and count actual triangle intersection calls while retaining the180 camera/framing cases. The current local1080p capture observes lower camera CPU at rapids/rescue; High crew/rapids/rescue CPU, High crew/trees GPU and all strict frame-interval targets remain open. Run `node tests/camera.mjs`; exact scope is in `evidence/phase-2-camera.json`. No rendering quality, camera check frequency or physics is reduced.

M2-D6 aligns hull/gunwale grain with the planks, adds subtle finish using the existing texture, rounds/bevels paddle blades and seats a compact rope coil on the bow floor. All four blades share geometry and preserve their attachment/envelope. Final route maximum remains712 calls with1,304 additional triangles; revisits retain172 geometries/11 textures. See `evidence/phase-2-boat.json` for exact verification and timing scope. Complete production boat/crew art remains open.

This batch does not certify the whole game as complete, AAA art quality, universal60FPS or zero possible glitches. Human full-route/newcomer studies, production assets/audio, fourteen completed regions, named-device/Internet/long-soak evidence and release acceptance remain in the tracker.

Danger update: red/ivory pointed rocks, sharp pilings, iron teeth and marked timber communicate lethal contact. Each new crew gets a server-controlled log/wheel timing offset shared by all peers and retained across retries. Refresh all browsers for protocol6. Existing1400m route remains; the270s flat-water rowing diagnostic and remaining human pacing scope are in `evidence/danger-update.json`.

## Run

Node.js 24 is the tested runtime.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. The title menu offers **Play with Friends** and **Join Crew**. Development starts Vite on 5173 and the authoritative service on 2567; Ctrl+C stops both.

For the built game:

```sh
npm run build
npm run start:production
```

Open **http://localhost:2567**. `PORT` overrides the default; `/health` gives the service health response.

For cPanel Node.js Selector / LiteSpeed deployment at `bab.validussentinel.com`, follow [the deployment guide](docs/CPANEL_SETUP.md). The same-origin client automatically connects with WSS under HTTPS; the domain passed a four-client deployment smoke test on 2026-10-20.

For **cPanel Node App**, use [the setup guide](docs/CPANEL_SETUP.md) and `releases/Bad-at-Boating-cPanel.zip`. The prebuilt package includes a CommonJS `app.js` startup and runtime lockfile. Select Node24, install with `npm ci --omit=dev --ignore-scripts`, configure one persistent process/HTTPS/WSS and a private `BOAT_SAVE_DB`. The public domain passed a four-client HTTPS/WSS deployment smoke test on 2026-10-20; the cPanel account's Node version and configuration still need to be confirmed by its owner. `node scripts/check-deployment.mjs https://YOUR-SUBDOMAIN` verifies a private four-client room after deployment. Rebuild the ZIP with `node scripts/package-cpanel.mjs` after a successful production build.

## Start a crew

**Play with Friends** creates a private shared boat at an animated safe dock. Copy the invite and let three other clients join. **Join Crew** accepts a room code or invite link; a valid invite URL joins directly, then asks new players for a short display name. Names are remembered locally, validated by the authority and retained on reconnect. Your avatar says **You**; other avatars show their entered names. Each player can choose **Ready** while waiting; a tick appears above that avatar. A three-second countdown launches only while all four stay connected and ready; unready/disconnect cancels it. No simulated players fill empty seats.

Practice and Controls were removed from the title at the user’s request. The service retains a fewer-player mode for internal fixtures; it is not offered by the menu. The lobby supports local own-paddle rehearsal while the authority stays anchored until launch. A compact panel holds Copy Invite/Ready; optional paddle guidance is collapsed. `npm run test:lobby` covers actual new-name/direct-invite flow, early readiness, animated water/boat and five screen layouts. The small menu button or Escape opens controls, invitation, graphics, checkpoint and leave actions. A local menu releases your blade while the shared room continues.

Localhost invites work on the same machine. For friends on the same network, open using the host computer's LAN address before copying the invite. Internet play requires hosting and HTTPS/WSS; `bab.validussentinel.com` passed a four-client connection smoke test, while hosting capacity and human play quality still need validation. Full/expired rooms show a specific error in the title menu; they never silently put someone in a different crew.

## Hold-to-row controls

Each player uses **their own keyboard in their own browser**, controlling only their server-assigned paddle:

| Key | Blade action |
|---|---|
| W / ↑ | Repeat complete forward strokes |
| S / ↓ | Repeat reverse strokes; brake forward drift first |
| A / ← | Repeat strokes to turn the boat left |
| D / → | Repeat strokes to turn the boat right |
| Release | Lift the blade and stop rowing; hull momentum remains |
| Escape | Release and open the game menu |

Hold one key: dry reach, catch, submerged pull and lift repeat automatically every 1.7s. W/S use straight-rowing assistance, so any seat can drive forward/reverse without unintended one-sided steering. A/Left and D/Right turn in the visible requested direction from every seat. All four players' inputs contribute simultaneously: one can row forward while another steers. Combine forward and turn to curve: the outer blade rows while the inner blade rests. Opposite directions cancel; WASD/arrow aliases do not double power. Key changes send immediately, with a 10Hz heartbeat; the authority generates complete strokes at 60Hz, independent of browser frame rate and packet arrival cadence. Movement and bracing retain their force caps. Mouse movement, mouse buttons and Space do not operate a paddle. On touch devices four directional buttons provide the same held actions, with independent pointer/key ownership. Stroke counts stay in the menu. Desktop gameplay shows only the small menu button; help stays in menus/lobby.

Connection drops release held commands and pause the crew safely. Reconnect is enabled from the moment a seat joins, with a visible countdown and an accessible Main Menu action. A five-second snapshot silence forces a fresh connection attempt; stale rowing expires after one second without a heartbeat. Reconnecting never replays buffered old rowing commands. Protocol 5 requires refreshing all crew browsers after this update; canonical checkpoint saves remain compatible.

## Obstacles and shared failure

Red-banded pilings, red-marked rocks, tapered iron spikes and the moving timber log are lethal on actual **hull contact**. The authoritative server latches a single collision, disables paddles, removes buoyancy and replicates the break/sink clock. Hull panels separate and the body sinks. After about 2.5 simulation seconds, the crew can choose **Retry Checkpoint**; one retry restores the same canonical checkpoint for everyone.

The later whirlpool changes actual current and surface height; its central rock is lethal on contact. Moving logs and the working waterwheel at465m use the same authoritative clock for collision and rendering; retry preserves their phase. The wheel has real kinematic paddles, spokes and rims; a marked screen-right bypass remains open. The mirrored second wheel at1040m has an open screen-left bypass; both render the authoritative phase.

Ordinary banks/docks and blade-only contact do not destroy the hull. Canonical checkpoints at 0, 48, 100, 156, 260, 380, 500, 630, 760 and 1100 m are durably saved in SQLite (`BOAT_SAVE_DB`, default `data/voyages.sqlite`). Atomic revisions and active-room leases reject stale writes and duplicate live voyages. **Continue Voyage** appears after a saved checkpoint; **Copy Voyage Recovery Code** in the game menu gives a private credential for another device’s Join Crew form. Invite links never include it. After a server restart restore into a new four-ready crew; in-memory room IDs expire. Keep the database private and persistent. A disconnected Expedition member pauses server time while their seat is retained for 90 seconds. Reloading during a wreck restores the same failure state; it cannot resurrect one client. Deliberately leaving returns a friends crew to the dock to re-ready. The route now continues to 1400 m, through eighteen authored beats with calm bays, rock slalom, three rapids zones, two new moving timber gates and iron narrows. An afloat checkpoint return requires a strict majority within15 seconds (3/4); Agree/Withdraw controls appear only during a vote. A sunk retry remains immediate. Completion holds the boat until Row Again, which returns friends to the four-ready lobby; finishing duration and fun have not been established by human playtests.

## Route and sound

Headwaters leads under the gorge entrance bridge into Split Stone Slalom, Whitewater Steps, Timber Works, Iron Narrows and the Last Descent, followed by Old Waterworks, Millstone Gorge, Boulder Garden, Devil’s Staircase, Calm Haven and the final Grand Waterworks gate. Width changes from 25m to 13m at the narrowest sections; banks use the same conservative five-metre pieces as the physical collision layout. Marked hazards are lethal; ordinary cliffs remain braceable. Green pennants mark checkpoint bays. In-world signs warn of fast water, iron teeth and moving trunks. No persistent route panel covers gameplay.

Procedural water wash, stereo paddle catches, wood break and checkpoint/finish tones use Web Audio, unlocked by the first click/key. Sound effects and volume are in the game menu and preferences are saved locally. Dialogs, hidden tabs and disconnections silence output. Rejoining never replays old accumulated sounds. These are an initial synthesized palette, not a production recording/music mix.

## Graphics

The title shows a live boat and four preview crew; joining replaces preview occupants with connected players. Crew have distinct faces/headwear/vests/boots, hands connected to real paddle grips and procedural rowing/wreck reactions. Boat wood uses local procedural grain, varnish and metal details. Floor planks are clipped to the tapered hull and the underside is closed; low strakes follow the actual hull taper rather than floating outside it. Scene reflection, Fresnel/sun response, fine moving normals and shared mesh waves give the water depth; gameplay High also samples bounded riverbed color and packed depth for underwater transmission/absorption while rejecting foreground hull, crew and bank samples. Blade effort emits spray/ripples and hull speed drives wake shading.

Rocks now have chipped planes, mineral grain/bump detail and wet/moss coloration. Pines and broadleaf trees use bark-covered branched trunks and individual foliage instead of solid cone/ball crowns; grass uses curved tapered blades and fern fronds. Shared assets are instanced in route chunks, with lighter distant foliage. These are procedural art assets, not scanned production vegetation.

Lower Graphics disables planar reflections/shadows, reduces pixel density, skips the gameplay transmission pass, uses lighter foliage and reduces undergrowth density. It preserves all physical flow/colliders. This is analytic sampled water, not volumetric fluid simulation; procedural rigs are not production skinned assets.

## Verification

```sh
npm run check
npm test
GAME_URL=http://localhost:2569 npm run test:touch
npm run build
```

With the game running and Google Chrome installed:

```sh
npm run test:browser
npm run test:graphics
npm run test:water
npm run test:audio
npm run test:controls
npm run test:reconnect
```

`GAME_URL` selects another local endpoint, for example `http://localhost:2567` for a built server. `BROWSER_CHANNEL` defaults to `chrome`. The browser test uses four isolated automated crew clients and an extra client for error handling. It rows the actual shared boat into a rock with four key streams, checks sinking/reload/retry, and saves JSON/screenshots under `evidence/`. Automated clients are not human playtest participants.

`test:graphics` starts a temporary Vite fixture server on 5174, captures25 crew/hull/obstacle/route/nature/waterwheel/bank views plus three title sizes and offline audio, rejects page/shader console errors and checks moving-log/waterwheel poses, rendered vegetation grounding, rescue paint attachment and High/Low foliage cost. `NATURE_ONLY=1` limits the view loop to four shore/tree/grass/Low close-ups. These labelled rendering fixtures are authored views, not a claim that real players completed the route.

## Crew animation and endurance checks

Crew posture follows the actual blade shaft: both wrists align to it, hands have mirrored thumb grips, and shoulder/head effort complements repeating strokes. Staggered blinks use absolute scene time. The same fixed-length arm solver handles rowing and wreck reactions. These are procedural rigs; production skinned assets and animation acceptance remain open.

Stroke spray/ripples emit only during active afloat play with fresh snapshots; after250ms of silence emission stops. Reset/new-room/title transitions clear old effects. Ripples reuse one geometry while keeping independent disposable fade materials.

```sh
npm run test:animation
SOAK_SECONDS=300 npm run test:soak
# Omit SOAK_SECONDS for the default 30-minute run.
```

The opt-in soak opens an isolated in-memory authority on port2598 with four real SDK/WebSocket clients. It rows continuously, exercises consent resets and rotates dropped/reconnected seats, checking authority invariants, snapshot delivery and body/collider counts. Node's exposed GC enables comparable heap samples. The JSON evidence records actual elapsed time; a shorter run does not certify30 minutes, Internet performance, browser GPU memory or hosting capacity.

## Files

- `src/shared/`: protocol, water/world layout and Rapier authoritative simulation.
- `src/server/BoatRoom.ts`: room, seats, readiness, fixed-step lifecycle and reconnect.
- `src/client/input.ts`: keyboard and arrow-key normalization.
- `src/shared/rowing.ts`: held actions and server-clock repeating stroke controller.
- `src/client/main.ts`: title, crew joining, gameplay, wreck/retry and menus.
- `src/client/scene.ts`: procedural boat/world, split hull presentation and camera.
- `src/client/nature.ts`: chipped stone, branched tree/foliage, grass/fern geometry, surface materials and lighter foliage assets.
- `src/client/crew.ts`, `water.ts`: articulated procedural crew and layered reflective water.
- `docs/RESEARCH_VISUALS.md`: nine primary sources for water, hero assets and hazard readability.
- `docs/RESEARCH_GAMEPLAY.md`: eight consulted primary sources and concrete gameplay decisions.
- `docs/PRD_PROGRESS.md`: all 13 phases and T001–T030, with remaining acceptance work.
- `docs/STATUS.md`: this iteration's prompt completion, observed evidence and next steps.
- `reference/`: preserved original production documents.

## Production limits

This remains a1400m prototype route with improved procedural art. Human usability/fun/fairness, physical-controller/accessibility acceptance, full capsize/grounding recovery, production asset/audio pipelines, lava encounter and a human-validated, polished Timber Gorge slice are pending. Durable checkpoint restore now has crash/reopen and browser evidence. Full world/audio streaming (bounded vegetation residency is implemented), the fourteen-region journey, current-release public cPanel/WSS deployment, portal integration, hardware performance/long-soak/load studies and launch readiness remain unclosed. The real WebSocket impairment fixture covers delay/jitter, ordered application-message drops, blackout, reconnect races/expiry and forged bursts; it is not a real Internet/TCP packet-loss study. See [the human playtest kit](docs/PLAYTEST_KIT.md) for the unrun participant gate. CI and Docker configuration exist; remote CI/container execution were not performed. Same-runtime replay tests do not establish cross-platform determinism.

At each task end, report **current prompt delivered/pending**, **actual verification**, **PRD work remaining**, and **next concrete milestone**. Do not invent an overall game completion percentage or confuse prototype checks with a production gate.

Shallow-water continuation: the rendered and physical riverbed now share triangle geometry and normals. A readable nonlethal Fern Dock sandbar teaches reverse/push-off recovery. High/Low depth cues share bed samples; ground contact retains the260N cap/no-lift/no-idle-propulsion rule. Detailed checks and remaining manual-capsize/human/device gates: `evidence/phase-2-bathymetry.json`.

Cooperative capsize rescue:hold reverse together (3/4 crew,or1 in practice) during the temporary prompt. Validated reverse effort applies capped physical torque to the same hull;release after righting before normal rowing. A15-second simulation timeout returns to the checkpoint and pauses during network interruptions. This is gameplay assistance;swimmer/rope animation and human/device fairness remain open. `evidence/phase-2-capsize.json` records scope and actual verification.
