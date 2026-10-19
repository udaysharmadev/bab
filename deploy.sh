#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_ROOT"

fail() { printf 'deploy: %s\n' "$*" >&2; exit 1; }
command -v git >/dev/null || fail 'git is required.'
command -v npm >/dev/null || fail 'npm is required; activate the cPanel Node.js environment first.'

git rev-parse --show-toplevel >/dev/null 2>&1 || fail 'run this from inside the checked-out application repository.'
[[ "$(git rev-parse --show-toplevel)" == "$APP_ROOT" ]] || fail 'deploy.sh must be run from the application root.'

branch="${PRODUCTION_BRANCH:-main}"
[[ "$branch" =~ ^[A-Za-z0-9._/-]+$ ]] || fail 'PRODUCTION_BRANCH contains unsupported characters.'
[[ "$(git branch --show-current)" == "$branch" ]] || fail "checkout '$branch' before deploying (current: $(git branch --show-current))."
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || fail 'working tree has local changes; commit or stash them before deploy.'

git pull --ff-only origin "$branch"

stage="$(mktemp -d "$APP_ROOT/.deploy.XXXXXXXX")"
original_dist=0
original_server=0
original_map=0
published_dist=0
published_server=0
published_map=0
restart_done=0
cleanup() {
  result=$?
  if (( result != 0 && restart_done == 0 )); then
    if (( published_map == 1 )); then mv -- "$APP_ROOT/build/server.mjs.map" "$stage/failed-server.mjs.map"; fi
    if (( original_map == 1 )); then mv -- "$stage/old-server.mjs.map" "$APP_ROOT/build/server.mjs.map"; fi
    if (( published_server == 1 )); then mv -- "$APP_ROOT/build/server.mjs" "$stage/failed-server.mjs"; fi
    if (( original_server == 1 )); then mv -- "$stage/old-server.mjs" "$APP_ROOT/build/server.mjs"; fi
    if (( published_dist == 1 )); then mv -- "$APP_ROOT/dist" "$stage/failed-dist"; fi
    if (( original_dist == 1 )); then mv -- "$stage/old-dist" "$APP_ROOT/dist"; fi
  fi
  rm -rf -- "$stage"
  exit "$result"
}
trap cleanup EXIT

mkdir -p "$stage/build"
npm ci --include=dev
BOAT_CLIENT_OUT="$stage/dist" BOAT_SERVER_OUT="$stage/build/server.mjs" npm run build
npm prune --omit=dev

mkdir -p "$APP_ROOT/build"
if [[ -d "$APP_ROOT/dist" ]]; then mv -- "$APP_ROOT/dist" "$stage/old-dist"; original_dist=1; fi
if [[ -f "$APP_ROOT/build/server.mjs" ]]; then mv -- "$APP_ROOT/build/server.mjs" "$stage/old-server.mjs"; original_server=1; fi
if [[ -f "$APP_ROOT/build/server.mjs.map" ]]; then mv -- "$APP_ROOT/build/server.mjs.map" "$stage/old-server.mjs.map"; original_map=1; fi
mv -- "$stage/dist" "$APP_ROOT/dist"
published_dist=1
mv -- "$stage/build/server.mjs" "$APP_ROOT/build/server.mjs"
published_server=1
mv -- "$stage/build/server.mjs.map" "$APP_ROOT/build/server.mjs.map"
published_map=1

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"
restart_done=1
printf 'deploy: updated %s from origin/%s and requested Passenger restart.\n' "$(git rev-parse --short HEAD)" "$branch"
printf 'deploy: verify https://bab.validussentinel.com/health and run npm run check:deployment -- https://bab.validussentinel.com\n'
