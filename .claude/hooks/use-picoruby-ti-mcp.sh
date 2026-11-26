#!/bin/sh
# PreToolUse hook: while the picoruby-ti MCP server is running, block reading
# the signature files (docs/reference/sig*/) and point to the MCP instead.
# The files are only the fallback for when the MCP is not connected.
input=$(cat)
one_line=$(printf '%s' "$input" | tr '\n' ' ')

case "$one_line" in
  *'"tool_name":"Bash"'*|*'"tool_name": "Bash"'*)
    # Only commands that read or search the files, not ones that mention them.
    printf '%s' "$one_line" | grep -Eq '(^|[^a-z])(cat|grep|rg|sed|head|tail|less|more|awk|find|ls|bat)[^|;&]*reference/sig' || exit 0 ;;
  *'"tool_name":"Read"'*|*'"tool_name": "Read"'*|*'"tool_name":"Grep"'*|*'"tool_name": "Grep"'*|*'"tool_name":"Glob"'*|*'"tool_name": "Glob"'*)
    printf '%s' "$one_line" | grep -q 'reference/sig' || exit 0 ;;
  *) exit 0 ;;
esac

case "$one_line" in
  *reference/sig-2432s028*) service=picoruby-ti-mcp-2432s028; mcp=picoruby-ti-2432s028 ;;
  *) service=picoruby-ti-mcp; mcp=picoruby-ti ;;
esac

running=$(docker ps -q --filter "label=com.docker.compose.service=$service" 2>/dev/null)
[ -n "$running" ] || exit 0

cat >&2 <<EOF
The $mcp MCP server is running: check classes and methods with it, not with the
signature files. Its tools may be deferred; load them first with
ToolSearch("select:mcp__${mcp}__classes,mcp__${mcp}__methods,mcp__${mcp}__hover,mcp__${mcp}__completion")
and then call, for example, mcp__${mcp}__methods(file_path: "apps/<name>/main.rb", class_name: "Sprite").
EOF
exit 2
