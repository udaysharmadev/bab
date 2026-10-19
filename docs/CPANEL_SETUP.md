# Bad at Boating — cPanel Node App setup

This is a prebuilt browser game plus its authoritative Node service. Public deployment has NOT been performed. Tested runtime: Node24.11.0. Protocol3 / basin-0.5 / waterworks-1. The package does not contain existing crew rooms, player credentials, saves or node_modules.

## Before upload

Use a dedicated HTTPS subdomain, such as `play.example.com`, at URL `/`. Subdirectory hosting is not supported by this build. The hosting account must provide:

- Node **24** with `node:sqlite` enabled and a writable local persistent disk. CloudLinux lists alt-nodejs24, but your provider must install/enable it. Older Node versions are not tested or supported by this package.
- Actual **WSS/WebSocket upgrade** forwarding to the Node app, alongside normal HTTP matchmaking. Ask the provider to confirm this on your selected subdomain. Passenger's Apache integration has documented issues; a compatible Nginx integration or Standalone behind a reverse proxy may be needed.
- **Exactly one application process**. No Node cluster, multiple Passenger workers or autoscaling. Current matchmaking/room physics live in memory; SQLite alone does not distribute rooms across workers. The provider must retain the process for active crews and allow long-lived WebSockets. Ask for one minimum and maximum instance for this application and suitable idle/request timeouts. Configure per-app settings with the provider; do not paste server-only Passenger directives into `.htaccess`.
- Persistent private save storage outside `public_html`, the Passenger document root and the extracted release directory. Disk must support SQLite locking/WAL; do not put this database on a shared network filesystem.

Provider message you can copy: “I need Node24 with node:sqlite, HTTPS+WSS upgrades for four simultaneous long-lived game connections, one persistent Node process per application with no worker autoscaling, and a private local writable directory for SQLite WAL. Can this subdomain run that configuration, and which Passenger/proxy mode will forward WebSockets?”

## Upload and configure

1. Extract `Bad-at-Boating-cPanel.zip` to an application directory, for example `/home/USER/bad-at-boating`. Keep the application files outside `public_html`. The archive contains `app.js`, `app.cjs`, `build/server.mjs`, `dist`, runtime package files and scripts.
2. In **Setup Node.js App** (CloudLinux), create an application: Node24, Production, application root `bad-at-boating`, application URL your HTTPS subdomain at `/`, startup file **`app.js`**. This ZIP deliberately uses CommonJS for Passenger's startup file; the bundled server is ESM. `app.cjs` is also provided if your panel uses that name. If you instead have cPanel **Application Manager**, register that root/domain in Production; ask the provider to map the document root to the included empty `public` directory and the Node startup to `app.js`.
3. Create `/home/USER/bad-at-boating-data` with permissions700 using File Manager or Terminal. Replace USER with your actual account name. Add environment variables:

   | Name | Value |
   |---|---|
   | NODE_ENV | production |
   | BOAT_SAVE_DB | /home/USER/bad-at-boating-data/voyages.sqlite |

   Leave `PORT` to the hosting platform. Set it only if your provider explicitly gives you a port for a standalone service. `BOAT_DIST_DIR` normally stays unset.
4. Activate the Node environment using the command shown by your panel. In the application directory run **`npm ci --omit=dev --ignore-scripts`**. The package is already built; no Vite/TypeScript/build step is needed on cPanel. Install dependencies on the host, not by uploading your Mac's node_modules. If the panel installs dependencies itself, verify that installation finished successfully.
5. Restart from the panel. Check the application log. A `node:sqlite` experimental warning is expected on the tested Node24 runtime; a startup error is not. A database permission error intentionally prevents startup rather than advertising a working service with broken saves.
6. Open `https://YOUR-SUBDOMAIN/health`. Expect `status:"ready"`, `protocol:3`, `physics:"basin-0.5"`. Then open the title, create a crew and join from other browsers/devices.
7. From the app's activated terminal run:

   ```sh
   npm run check:deployment -- https://YOUR-SUBDOMAIN
   ```

   This creates its own private automated four-player crew. It checks HTTP/title, four real WebSocket seats, four-ready launch, advancing simulation time, disconnect pause and same-seat reconnect. A PASS proves those paths for that run, not capacity, human fun or zero defects. This script may also be run from the developer machine against the public origin. Keep the output; it never prints save/reconnect credentials.

## Playing, saves and updates

Every player uses their own browser/keyboard. W/Up repeats forward strokes, S/Down reverse, A/Left left turn, D/Right right turn. Four connected players must each Ready before starting. Copy Invite shares the active room. **Copy Voyage Recovery Code** is separate: it is a private bearer credential for checkpoint progress; share only with the crew. The invite URL never contains that credential. Continue Voyage appears after a checkpoint is saved on that device; another device can paste `voyage:…` into Join Crew.

Progress saves at canonical checkpoints and finish, not at arbitrary midriver positions. A server restart ends in-memory room IDs. Resume saved progress into a new crew, then get all four Ready. Incompatible world/physics saves are retained and rejected rather than silently moved to a different map. Do not delete your save database during an update.

A finished voyage is retained as complete. Its old recovery code cannot reopen it as an unfinished checkpoint; use Play with Friends for a fresh run. Row Again in the active completed crew is an explicit shared restart.

Before an update, announce the restart to players, stop the app in the panel, and back up **the whole private save directory**. Stopping is important: SQLite WAL may contain recent commits, so copying only `voyages.sqlite` while the app is running is not a valid live backup procedure. Keep the old release ZIP. Extract the new release, reinstall dependencies if the lockfile changed, preserve BOAT_SAVE_DB, restart, and repeat the smoke test. Restore the old package and its matching backup to roll back an incompatible version. Never restore over a running app or put save backups in a public folder.

## Troubleshooting

| Symptom | Check |
|---|---|
| Cannot find node:sqlite / Node version error | Node24 selected in the app's actual environment, not only an SSH shell |
| Health works but crew join fails | WSS upgrade/proxy mode, single worker routing, correct root subdomain and TLS |
| Rooms intermittently disappear | Multiple workers, idle process recycling, provider resource limits or restarts |
| Save DB cannot open / read-only | Absolute BOAT_SAVE_DB, private directory ownership/write permission, available disk and local filesystem |
| Existing voyage already active | Join its active crew; close all its tabs and wait for room cleanup/reconnect grace before creating another |
| Version mismatch after update | Refresh cached tabs; HTML is revalidated while hashed assets are immutable. Old rooms cannot adopt new physics |
| Performance warnings / disconnects under load | Measure CPU/memory and provider limits. Local automated tests do not establish shared-host room capacity |

## Primary references

- [cPanel Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/): registration, environments and provider-controlled support.
- [CloudLinux Node.js Selector](https://docs.cloudlinux.com/cloudlinuxos/cloudlinux_os_components/#node-js-selector): available runtimes; actual account availability depends on the provider.
- [Passenger Apache WebSocket considerations](https://www.phusionpassenger.com/library/config/apache/tuning_sse_and_websockets/): integration/proxy requirements.
- [Passenger Apache configuration](https://www.phusionpassenger.com/docs/references/config_reference/apache/): process and idle settings have different allowed contexts and may require provider configuration.

No cPanel account/domain was accessed for this build. Provider configuration and actual public smoke testing remain to be completed on the destination.
