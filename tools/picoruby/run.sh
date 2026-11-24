#!/bin/sh
# Runs logic tests of an app with PicoRuby on this machine.
#   docker compose run --rm picoruby apps/<name> <test.rb> [<test.rb> ...]
# Loads prelude.rb, then the app's files in the order of its main.manifest,
# then the test files, as one program, and runs it. The last line of the app's
# last file, which starts the app (such as `MyGame.new.run`), is left out, so
# that the tests call the app's methods instead. The files are read, never
# changed.
set -e
app_directory=$1
shift
if [ -z "$app_directory" ] || [ $# -eq 0 ] || [ ! -f "$app_directory/main.manifest" ]; then
  echo "usage: docker compose run --rm picoruby apps/<name> <test.rb> [<test.rb> ...]" >&2
  exit 2
fi
program=/tmp/logic-test.rb
: > "$program"
line=1
add() {
  count=$(wc -l < "$1")
  echo "# $1: lines $line-$((line + count))" >&2
  cat "$1" >> "$program"
  echo >> "$program"
  line=$((line + count + 1))
}
add /opt/logic-test/prelude.rb
app_files=$(grep -v '^[[:space:]]*$' "$app_directory/main.manifest" | sed 's/\.mrb$/.rb/')
last_file=$(echo "$app_files" | tail -n 1)
for file in $app_files; do
  if [ "$file" = "$last_file" ]; then
    start_line=$(grep -n -v '^[[:space:]]*$' "$app_directory/$file" | tail -n 1 | cut -d: -f1)
    echo "# left out $app_directory/$file:$start_line: $(sed -n "${start_line}p" "$app_directory/$file")" >&2
    sed "${start_line}d" "$app_directory/$file" > /tmp/logic-test-last.rb
    add /tmp/logic-test-last.rb
  else
    add "$app_directory/$file"
  fi
done
for file in "$@"; do
  add "$file"
done
exec picoruby "$program"
