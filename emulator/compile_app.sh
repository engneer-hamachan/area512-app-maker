#!/bin/sh
# Compiles each Ruby file of an app folder to the .mrb the device runs.
# Local variable names are left out, as the device's own compile does.
set -eu

for ruby_file in "$1"/*.rb; do
  bytecode_file="${ruby_file%.rb}.mrb"
  picorbc --remove-lv -o "$bytecode_file" "$ruby_file"
  chmod 666 "$bytecode_file"
done
