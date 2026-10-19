# Bad at Boating — cPanel LiteSpeed setup

Target origin: **https://bab.validussentinel.com**. Public deployment has not been performed or tested from this workspace. The production browser build, HTTP routes, authoritative Colyseus rooms and WebSocket endpoint run in the same Node app. On HTTPS the browser automatically uses `wss://bab.validussentinel.com`; development-only `/game` proxying is not used in production. Protocol3 / basin-0.5 / waterworks-1.

## Hosting requirements

- CloudLinux **Node.js Selector / Setup Node.js App** with **Node 24**, `node:sqlite`, and LiteSpeed's Selector integration. If Node 24 is unavailable in the selector, this build cannot start because durable saves use the built-in `node:sqlite` module.
- HTTPS at the domain root (`/`). The frontend derives the WSS URL from the current page host; no separate API hostname or subdirectory rewrite is required.
- LiteSpeed Node.js Selector integration must forward WebSocket `Upgrade` requests. LiteSpeed documents automatic `ws://` proxying for Node Selector apps and `wss://` when accessed through its HTTPS proxy. This is a provider capability; confirm it with the real four-client smoke test below.
- One persistent application process/worker. Colyseus room state is held in memory; multiple workers/autoscaling can split crews. Enable long-lived WebSockets and avoid short idle timeouts.
- Writable local persistent disk for SQLite WAL, outside `public_html`. Do not put the voyage database in the repository or a network filesystem.

If your account only offers cPanel Application Manager using Apache Passenger (without LiteSpeed's CloudLinux Selector integration), ask the provider to confirm WebSocket upgrades first. cPanel's generic Node app setup does not itself prove WSS is proxied for this domain.

## Initial setup

1. In cPanel **Git Version Control**, clone `https://github.com/udaysharmadev/bab.git` into a private application root such as `/home/USER/bad-at-boating` (outside `public_html`). Select branch `main`. Replace `USER` below with the cPanel account name.
2. In **Setup Node.js App**, create the app with these values:

   | Setting | Value |
   |---|---|
   | Node.js version | 24.x |
   | Application mode | Production |
   | Application root | `bad-at-boating` |
   | Application URL | `bab.validussentinel.com` at `/` |
   | Application startup file | `app.js` |
   | Environment variable | `NODE_ENV=production` |
   | Environment variable | `PRODUCTION_BRANCH=main` |
   | Environment variable | `BOAT_SAVE_DB=/home/USER/private/bad-at-boating/voyages.sqlite` |

   Create the private database directory before starting:

   ```sh
   mkdir -p /home/USER/private/bad-at-boating
   chmod 700 /home/USER/private/bad-at-boating
   ```

   Do not set `PORT`; cPanel/Passenger supplies it. `.env.example` documents the variable names but contains no credentials. Prefer entering values in the Node App environment UI.
3. Open cPanel's **Run JS script** or **Terminal**, activate the environment command shown by Setup Node.js App, then build and install runtime dependencies from the repository root:

   ```sh
   cd /home/USER/bad-at-boating
   npm ci --include=dev
   npm run build
   npm prune --omit=dev
   mkdir -p tmp
   touch tmp/restart.txt
   ```

   Vite produces `dist/`; esbuild produces `build/server.mjs`; `app.js` is the Passenger entrypoint. Do not upload `node_modules` from another computer. The Node app serves `/`, `/health`, and Colyseus matchmaking/WebSocket routes from this same origin.
4. Check `https://bab.validussentinel.com/health`. Expect JSON with `status:"ready"`, `protocol:3`, `physics:"basin-0.5"`. Then run the external multiplayer smoke test:

   ```sh
   npm run check:deployment -- https://bab.validussentinel.com
   ```

   It opens four real WebSocket clients, checks distinct seats, the four-ready launch barrier, advancing server ticks, disconnect pause and same-seat reconnect. A pass confirms that run's routing and WSS behavior; it does not prove load capacity or human play quality.

## Updates

Activate the cPanel Node environment and run from the application root:

```sh
cd /home/USER/bad-at-boating
bash deploy.sh
```

The script requires a clean checkout on the selected branch, fast-forward pulls `origin/main` by default (or `PRODUCTION_BRANCH`), installs the locked dependencies, builds into a staging directory, prunes development dependencies, publishes the frontend/server artifacts, and touches `tmp/restart.txt` only after a successful build. On a build or publish failure before the restart request, it restores the previous `dist/` and `build/server.mjs`. It never resets local commits or deletes save data. After each update, verify `/health` and run the deployment smoke test.

For release version changes, take a stopped-app backup of the entire private save directory first. Protocol/world-incompatible saves are retained and rejected instead of being silently migrated. Restarting Passenger ends active in-memory rooms; players must rejoin and resume from the saved checkpoint.

## Playing, saves and updates

Every player uses their own browser/keyboard. W/Up repeats forward strokes, S/Down reverse, A/Left left turn, D/Right right turn. Four connected players must each Ready before starting. Copy Invite shares the active room. **Copy Voyage Recovery Code** is separate: it is a private bearer credential for checkpoint progress; share only with the crew. The invite URL never contains that credential. Continue Voyage appears after a checkpoint is saved on that device; another device can paste `voyage:…` into Join Crew.

Progress saves at canonical checkpoints and finish, not at arbitrary midriver positions. A server restart ends in-memory room IDs. Resume saved progress into a new crew, then get all four Ready. Incompatible world/physics saves are retained and rejected rather than silently moved to a different map. Do not delete your save database during an update.

A finished voyage is retained as complete. Its old recovery code cannot reopen it as an unfinished checkpoint; use Play with Friends for a fresh run. Row Again in the active completed crew is an explicit shared restart.

Before an update, announce the restart to players, stop the app in the panel, and back up **the whole private save directory**. Stopping is important: SQLite WAL may contain recent commits, so copying only `voyages.sqlite` while the app is running is not a valid live backup procedure. Keep the old release ZIP. Extract the new release, reinstall dependencies if the lockfile changed, preserve BOAT_SAVE_DB, restart, and repeat the smoke test. Restore the old package and its matching backup to roll back an incompatible version. Never restore over a running app or put save backups in a public folder.

## Troubleshooting

| Symptom | Check |
|---|---|
| Cannot find node:sqlite / Node version error | Node24 selected in the app's actual environment, not only an SSH shell |
| Health works but crew join fails | LiteSpeed Node Selector WSS Upgrade forwarding, single worker routing, root-domain mapping and TLS |
| Rooms intermittently disappear | Multiple workers, idle process recycling, provider resource limits or restarts |
| Save DB cannot open / read-only | Absolute BOAT_SAVE_DB, private directory ownership/write permission, available disk and local filesystem |
| Existing voyage already active | Join its active crew; close all its tabs and wait for room cleanup/reconnect grace before creating another |
| Version mismatch after update | Refresh cached tabs; HTML is revalidated while hashed assets are immutable. Old rooms cannot adopt new physics |
| Performance warnings / disconnects under load | Measure CPU/memory and provider limits. Local automated tests do not establish shared-host room capacity |

## Primary references

- [cPanel: install a Node.js application](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/): `app.js`, platform-provided port and `tmp/restart.txt` behavior.
- [LiteSpeed: CloudLinux Selector and WebSockets](https://docs.litespeedtech.com/lsws/cp/cpanel/cloudlinux/): automatic WebSocket proxying for Selector apps and HTTPS `wss://` behavior.
- [cPanel Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/): provider-controlled Passenger features and environment variables.

This workspace can verify a local Node process, but cannot verify your cPanel account's selected Node version, DNS/TLS mapping, LiteSpeed Selector integration, WSS upgrades or public four-client behavior. Complete the smoke test on the destination before treating it as deployed.
