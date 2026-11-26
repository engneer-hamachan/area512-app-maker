#!/bin/sh
# Starts a picoruby-ti MCP server: mcp-picoruby-ti.sh <compose service>
# In cloud sessions the SessionStart hook starts dockerd and builds the images
# while Claude Code is already starting this server, so wait for both first.
# MCP_TIMEOUT in .claude/settings.json gives Claude Code time to wait for this.
service=$1
cd "$(dirname "$0")/../.." || exit 1

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  limit=${AREA512_MCP_WAIT_SECONDS:-1500}
  waited=0
  until docker info >/dev/null 2>&1; do
    [ "$waited" -ge "$limit" ] && break
    sleep 2; waited=$((waited + 2))
  done
  image=$(docker compose config --images "$service" 2>/dev/null)
  # The hook builds every image; wait for it instead of building here.
  until [ -n "$image" ] && docker image inspect "$image" >/dev/null 2>&1; do
    [ "$waited" -ge "$limit" ] && break
    sleep 2; waited=$((waited + 2))
    [ -n "$image" ] || image=$(docker compose config --images "$service" 2>/dev/null)
  done
fi

exec docker compose --progress quiet run --rm -T "$service"
