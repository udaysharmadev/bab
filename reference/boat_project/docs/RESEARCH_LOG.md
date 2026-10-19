# Research log — 19 October 2026

**Source precedence:** Supplied 34-page *Phase Zero Preproduction Report* is the mandate and creative baseline. The following public official sources were checked for technical claims and current platform constraints. Research alone does not mean functionality has been implemented, benchmarked or playtested.

| Source / URL | Observed information | Implementation implication | Limit / next verification |
|---|---|---|---|
| Paddle Paddle Paddle — https://store.steampowered.com/app/3570070/ | One or two human paddlers, one giant level, checkpoints and physics comedy | Differentiate materially from a two-player paddle course | Steam description is marketing, not proof of fun |
| Fart Together — https://store.steampowered.com/app/5117550/Fart_Together/ | Listing says Coming Soon; 2–4 players already coordinate a shared raft | Four-person raft alone is not sufficient USP | Differentiator must be blade immersion, stations, water-relative torque and recovery |
| Rapier applied forces — https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/ | Forces/impulses can be applied at world points | Physical reaction and torque are technically expressible | Numerical/contact stability remains to be tested |
| Rapier determinism — https://rapier.rs/docs/user_guides/javascript/determinism/ | JS/WASM determinism under same initial state, math and insertion order | Versioned deterministic harness and test seeds | Custom water/math can break deterministic inputs |
| Colyseus netcode — https://docs.colyseus.io/netcode/ | Fixed step, client prediction/reconciliation including `predict.sim` concepts | Prototype authoritative snapshots and branch prediction | Shared-body prediction not automatically pleasant or cheap |
| Colyseus reconnection — https://docs.colyseus.io/room/reconnection | Server can retain seats and clients rejoin with state snapshot | Persistent seat identity; explicit reconnect state machine | Grace period and pause policy are game decisions |
| Three.js WebGPU — https://threejs.org/manual/pages/webgpurenderer | WebGPU backend with WebGL2 fallback and material compatibility caveats | Prefer measured WebGL2 parity; optional enhanced effects | Do benchmark before locking shader stack |
| Three.js glTF — https://threejs.org/docs/pages/GLTFLoader.html | Draco/Meshopt/KTX2 paths; bitmap disposal caution | Compressed streamable assets and explicit unload ownership | Budget memory/CPU uploads with real world scene |
| CrazyGames technical — https://docs.crazygames.com/requirements/technical/ | ≤50MB initial, ≤250MB total, ≤1500 files, browser/Chromebook requirements | Load dock early; stream world chunks; test 4 GB RAM device | Rules can change; recheck at submission |
| CrazyGames multiplayer — https://docs.crazygames.com/requirements/multiplayer/ | Update room/joinability, invite, instant multiplayer and room continuity | Portal adapter and immediately joinable practice dock | Test real SDK/QA portal, not inferred API name |
| CrazyGames introduction — https://docs.crazygames.com/requirements/intro/ | Different Basic/Full requirements, ad and account integration | No premature ad or login assumption | Full Launch approval not guaranteed |
| Glenn Fiedler physics netcode — https://gafferongames.com/categories/networked-physics/ | Snapshot interpolation and bandwidth/latency tradeoffs | Quantitative A/B rather than naive prediction ideology | Background engineering technique, not new product benchmarking |
| GPU Gems water — https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models | Visual wave layers can be separated by frequency | Keep authoritative low-frequency sampler and richer visuals | Historic graphics approach; browser implementation needs fresh profiles |

## Live evidence backlog

1. Which default paddle workspace produces first-input comprehension without camera interference?
2. Is 16/20/24 sample buoyancy sufficiently stable without upright cheating?
3. Does physically bounded blade contact yield satisfying prying and scraping?
4. Does authority-only shared hull remain readable at real four-client 100–200ms RTT?
5. Can source-wave and visual-wave systems stay aligned at every current seam?
6. Which hardware/browser pair validates 1080p/60 on Medium?
7. What is the measured 4-player room-per-host density under actual representative hazards?
8. Does the platform adapter satisfy portal instant join and live room update requirements?
9. Can a creative first-slice player cohort voluntarily replay after failure?
10. Is the working title legally clear and discoverable for release?

Each answered question should link its test result and ADR back to `PHASE_TRACKER.md`. The source PDF includes a larger original bibliography and competitor snapshot; this file is a concise verified follow-up, not a claim of exhaustive review of every paper in that source.
