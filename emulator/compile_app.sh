#!/bin/sh
# Compiles each Ruby file of an app folder to the .mrb the device runs.
set -eu

for ruby_file in "$1"/*.rb; do
  bytecode_file="${ruby_file%.rb}.mrb"
  picorbc -o "$bytecode_file" "$ruby_file"
  chmod 666 "$bytecode_file"
done
