# Deployed fan room mismatch — 30 October 2026

Observed public origin: https://bab.validussentinel.com . `/` serves the Fan Club client, while `/health` returns protocol3 / basin-0.5 with no fan identity. The running legacy authority does not define `fan-raft`. Source already registers both rooms. The deployment must rebuild **both** outputs and restart the app; uploading only `dist/` cannot repair the live authority.

## Plan

| File | Change | Verification / risk |
|---|---|---|
| src/client/fan-connection.ts, fan-main.ts | No-cache bounded compatibility preflight before create/join/reconnect; understandable failure and retry with name preserved | Legacy/malformed/unavailable health cannot allocate a room; fresh healthy server permits retry |
| index.html | Announce the name form error as status and associate it with the field | Name and keyboard flow retained |
| scripts/check-deployment.mjs, deploy.sh | Wait briefly for the restarted server's matching identity, then require actual four-seat Ready/WSS/reconnect smoke before reporting deployment verified | A failed smoke after restart remains a failure; no claim that touching restart.txt succeeded |
| tests/fan-connection.test.ts, fan-connection.mjs | Pure compatibility/error checks; native stale server, HTTP failure, retry, invite and real create/join checks | Do not weaken existing authority version/name guards |
| docs/CPANEL_SETUP.md | Correct current health identity and explicit repair instructions | Explain local verification versus actual live rollout |

Decision: preserve server room registration and force/protocol contracts. Diagnose the stale running process, guard the client and make deployment success require live evidence. No new dependency, save deletion, public deployment, commit or push. User will push and run the hosting update.

## Hosting repair after push

Activate the **Node24 environment shown in cPanel → Setup Node.js App**, then run from its configured application root (the checkout containing app.js):

```sh
bash deploy.sh
```

The script pulls main, builds frontend plus authority, requests Passenger restart and verifies the configured public origin. If the stale version remains, use **Restart** in Setup Node.js App and confirm its startup file is `app.js` and application root is this checkout, then rerun:

```sh
node scripts/check-deployment.mjs https://bab.validussentinel.com --wait
```

Expected health contains `fan: {protocol:1, physics:"fan-raft-0.2", world:"toy-bend-1"}` plus `status:"ready"`. The legacy top-level identity is protocol7 / basin-0.13. Do not delete the save database. Restart ends existing in-memory crews; start a fresh fan crew afterward.

## Verification

- Public HTTP diagnosis on30 October:200 `/health`, protocol3 / basin-0.5, no fan identity;200 `/` Fan Club HTML. No public restart, push or deployment was performed.
- `npm run build`: strict TypeScript, both Vite entries and production authority PASS (`evidence/fan-deploy-build.txt`). Existing shared-engine size advisory remains.
- Affected automated suite: **tests5, pass5, fail0**, including compatibility/HTTP/error mapping and actual server sockets, Ready cancellation, owned controls, pause/reconnect and stale-input watchdog (`evidence/fan-deploy-tests.txt`). `bash -n deploy.sh` and `git diff --check` pass.
- Chrome156 native fixture: **six check groups PASS**, errors[], covering exact stale health with zero matchmaking attempts,503/malformed health, a stale worker between health/matchmaking, same-form recovery, real invite/solo joins and retained reconnect token across failed health (`evidence/fan-deploy-browser.json`, `evidence/fan-deploy-native.txt`). An initial fixture returned HTTP200 for a matchmaking error; corrected to an actual HTTP400 failure so the SDK error path is exercised.
- Existing four-native-client fixture: **eight check groups PASS**, errors[], including named seats, Ready, real touch/cancel and delayed reload (`evidence/fan-deploy-multiplayer.txt`).
- Actual production entrypoint `app.js` on local2571 passes `node scripts/check-deployment.mjs http://localhost:2571 --wait`: distinct four seats, countdown, ticking authority, pause and same-seat reconnect (`evidence/fan-deploy-local-smoke.json`).
- Deployment-gate fixture: stale health fails with restart guidance before matchmaking; `--wait` observes two stale responses then recovered health, then correctly fails the intentionally unavailable HTML route (`evidence/fan-deploy-gate.json`). This checks gate behavior, not the real hosting restart.

Transient health failures during same-seat reload retain the session token; reload after health recovers reclaims the reserved seat. The page does not silently create a duplicate crew. These changes do not alter physics, controls or storage. Full157-test physics suite was not repeated for a connection/deployment-only fix; affected source/socket/native/build checks ran as listed.

**VERDICT: PASS for local repair and regression checks. LIVE ROLLOUT PENDING user push, cPanel build/restart and public smoke.** The live backend cannot be updated by frontend error messaging alone.
