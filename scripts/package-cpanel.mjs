import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// Package already built, verified assets; never ship saves or node_modules.
const target = resolve('releases/bad-at-boating-cpanel');
await rm(target, { recursive: true, force: true });
await mkdir(`${target}/public`, { recursive: true });
await cp(process.env.BOAT_CLIENT_OUT ?? 'dist', `${target}/dist`, { recursive: true });
await mkdir(`${target}/build`);
await cp(process.env.BOAT_SERVER_OUT ?? 'build/server.mjs', `${target}/build/server.mjs`);
await cp('app.cjs', `${target}/app.cjs`);
// Classic cPanel defaults to app.js. This package is CommonJS, so both work.
await cp('app.cjs', `${target}/app.js`);
await cp('docs/CPANEL_SETUP.md', `${target}/CPANEL_SETUP.md`);
await mkdir(`${target}/scripts`);
await cp('scripts/check-deployment.mjs', `${target}/scripts/check-deployment.mjs`);
await writeFile(`${target}/public/.keep`, 'Passenger document root. The Node authority serves dist/.\n');
const original = JSON.parse(await readFile('package.json', 'utf8'));
const pkg = { name: original.name, version: original.version, private: true, type: 'commonjs', main: 'app.js', engines: { node: '>=24' }, scripts: { start: 'node app.js', 'check:deployment': 'node scripts/check-deployment.mjs' }, dependencies: original.dependencies };
await writeFile(`${target}/package.json`, JSON.stringify(pkg, null, 2) + '\n');
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
lock.packages[''] = { name: pkg.name, version: pkg.version, dependencies: pkg.dependencies, engines: pkg.engines };
await writeFile(`${target}/package-lock.json`, JSON.stringify(lock, null, 2) + '\n');
const archive = resolve('releases/Bad-at-Boating-cPanel.zip');
await rm(archive, { force: true });
execFileSync('zip', ['-q', '-r', archive, '.'], { cwd: target });
console.log(`cPanel runtime package: ${archive}`);
