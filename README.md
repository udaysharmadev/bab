# Bad at Boating

Four friends, one shared wooden boat. Current build: a local multiplayer prototype with hold-to-row WASD/arrow paddles, a game title/crew flow, reflective water, articulated crew, varied lethal obstacles and a shared break/sink/checkpoint retry loop.

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

**Play with Friends** creates a private shared boat at a frozen safe dock. Copy the invite and let three other clients join. **Join Crew** accepts a room code or invite link; a valid invite URL joins directly. Once all four are present, every player chooses **Ready to Row**. A three-second countdown launches only while all four stay connected and ready; unready/disconnect cancels it. No simulated players fill empty seats.

Practice and Controls were removed from the title at the user’s request. The service retains a fewer-player mode for internal fixtures; it is not offered by the menu. Friends-mode lobby paddling is currently disabled until all four are ready; waiting-dock practice/tethering is a future onboarding refinement. The small menu button or Escape opens controls, invitation, graphics, checkpoint and leave actions. A local menu releases your blade while the shared room continues.

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

Ordinary banks/docks and blade-only contact do not destroy the hull. Canonical checkpoints at 0, 48, 100, 156, 260, 380, 500, 630, 760 and 1100 m are durably saved in SQLite (`BOAT_SAVE_DB`, default `data/voyages.sqlite`). Atomic revisions and active-room leases reject stale writes and duplicate live voyages. **Continue Voyage** appears after a saved checkpoint; **Copy Voyage Recovery Code** in the game menu gives a private credential for another device’s Join Crew form. Invite links never include it. After a server restart restore into a new four-ready crew; in-memory room IDs expire. Keep the database private and persistent. A disconnected Expedition member pauses server time while their seat is retained for 90 seconds. Reloading during a wreck restores the same failure state; it cannot resurrect one client. Deliberately leaving returns a friends crew to the dock to re-ready. The route now continues to 1400 m, through nineteen authored beats with calm bays, rock slalom, three rapids zones, two new moving timber gates and iron narrows. An afloat checkpoint return requires a strict majority within15 seconds (3/4); Agree/Withdraw controls appear only during a vote. A sunk retry remains immediate. Completion holds the boat until Row Again, which returns friends to the four-ready lobby; finishing duration and fun have not been established by human playtests.

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
npm run test:controls
npm run test:reconnect
```

`GAME_URL` selects another local endpoint, for example `http://localhost:2567` for a built server. `BROWSER_CHANNEL` defaults to `chrome`. The browser test uses four isolated automated crew clients and an extra client for error handling. It rows the actual shared boat into a rock with four key streams, checks sinking/reload/retry, and saves JSON/screenshots under `evidence/`. Automated clients are not human playtest participants.

`test:graphics` starts a temporary Vite fixture server on 5174, captures twenty-one crew/hull/obstacle/route/nature/waterwheel views plus three title sizes and offline audio, rejects page/shader console errors and checks moving-log and waterwheel pose consistency and High/Low foliage cost. `NATURE_ONLY=1` limits the view loop to four shore/tree/grass/Low close-ups. These labelled rendering fixtures are authored views, not a claim that real players completed the route.

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

This remains a1400m prototype route with improved procedural art. Human usability/fun/fairness, gamepad/remapping, full capsize/grounding recovery, production asset/audio pipelines, lava encounter and a human-validated, polished Timber Gorge slice are pending. Durable checkpoint restore now has crash/reopen and browser evidence. Streaming, the fourteen-region journey, public cPanel/WSS deployment, portal integration, hardware performance/long-soak/load studies and launch readiness remain unclosed. The real WebSocket impairment fixture covers delay/jitter, ordered application-message drops, blackout, reconnect races/expiry and forged bursts; it is not a real Internet/TCP packet-loss study. See [the human playtest kit](docs/PLAYTEST_KIT.md) for the unrun participant gate. CI and Docker configuration exist; remote CI/container execution were not performed. Same-runtime replay tests do not establish cross-platform determinism.

At each task end, report **current prompt delivered/pending**, **actual verification**, **PRD work remaining**, and **next concrete milestone**. Do not invent an overall game completion percentage or confuse prototype checks with a production gate.
