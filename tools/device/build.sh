#!/bin/sh
# Rebuilds bin/area512-send-* after a change to main.go. Run from the project root.
set -eu

docker run --rm -v "$PWD:/project" -w /project/tools/device golang:1.26-trixie sh -c '
  set -eu
  go mod tidy
  for target in linux/amd64 linux/arm64 darwin/amd64 darwin/arm64 windows/amd64 windows/arm64; do
    goos=${target%/*}
    goarch=${target#*/}
    suffix=""
    [ "$goos" = windows ] && suffix=".exe"
    CGO_ENABLED=0 GOOS=$goos GOARCH=$goarch \
      go build -trimpath -buildvcs=false -o "/project/bin/area512-send-$goos-$goarch$suffix" .
  done
  chown -R "$(stat -c %u:%g /project/compose.yaml)" /project/bin go.mod go.sum
'
