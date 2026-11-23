#!/bin/bash
# Cloud sessions: start Docker, build the Area512 images and start the emulator.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
log=/tmp/area512-session-start.log
exec 3>&1 >>"$log" 2>&1

if ! docker info >/dev/null 2>&1; then
  nohup dockerd >/var/log/dockerd.log 2>&1 3>&- &
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi

# Build only if the hook, compose.yaml or an image's files changed since the last build.
hashes=/var/lib/docker/.area512-session-start.sha256
files() { git ls-files .claude/hooks compose.yaml docker emulator tools; }
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  work=$(mktemp -d)
  ca=/root/.ccr/ca-bundle.crt; [ -f "$ca" ] || ca=/etc/ssl/certs/ca-certificates.crt
  cp "$ca" "$work/ccr-ca.crt"
  cp .claude/hooks/base-images/*.Dockerfile "$work/"

  # Docker Hub rate-limits these hosts, so base images come from mirror.gcr.io.
  for img in debian:trixie-slim emscripten/emsdk:6.0.5 python:3.13-slim; do
    src=mirror.gcr.io/$([[ $img == */* ]] && echo "$img" || echo "library/$img")
    docker pull -q "$src"
    docker build -q --build-arg BASE="$src" -t "$img" -f "$work/ca.Dockerfile" "$work"
  done
  docker pull -q mcr.microsoft.com/playwright:v1.56.1-noble
  docker tag mcr.microsoft.com/playwright:v1.56.1-noble area512-playwright-orig
  docker build -q --build-arg BASE=area512-playwright-orig \
    -t mcr.microsoft.com/playwright:v1.56.1-noble -f "$work/ca.Dockerfile" "$work"
  docker pull -q mirror.gcr.io/library/golang:1.26-trixie
  docker pull -q mirror.gcr.io/library/ubuntu:noble
  docker build -q -t golang:1.26-trixie -f "$work/go.Dockerfile" "$work"
  rm -rf "$work"

  docker compose build
  files | xargs sha256sum > "$hashes" || rm -f "$hashes"
fi

docker compose up -d emulator-browser
echo "Area512: Docker is running and the emulator is up (log: $log)." >&3
