#!/bin/sh
# Builds the Area512 firmware sources for the browser.
#
# AREA512_SOURCE_PATH is a clone of area512 with its submodules. Nothing in it
# is edited by hand; emulator/port replaces only what needs the hardware.
set -eu

emulator_path=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_path=${AREA512_SOURCE_PATH:?}
output_path=${AREA512_EMULATOR_OUTPUT_PATH:?}
picoruby_path="$source_path/R2P2-ESP32/components/picoruby-esp32/picoruby"
component_path="$source_path/components"
object_path="$output_path/objects"

export AREA512_SOURCE_PATH="$source_path"
export AREA512_EMULATOR_PORT_PATH="$emulator_path/port"

mkdir -p "$object_path"

ruby "$component_path/area512/mrbgems/picoruby-ti/tidbgen/main.rb" \
  --sig-dir "$component_path/area512/sig/picoruby" \
  --out "$component_path/area512/mrbgems/picoruby-ti/src/generated"

make -C "$component_path/area512_micropython" -f micropython_embed.mk

(
  cd "$picoruby_path"
  MRUBY_CONFIG="$emulator_path/build_config/area512_wasm.rb" rake
)

# The picorbc step of components/area512/CMakeLists.txt.
mkdir -p "$output_path/generated/mrb"
for ruby_task in environment_task irb_task; do
  "$picoruby_path/bin/picorbc" -B"$ruby_task" \
    -o"$output_path/generated/mrb/$ruby_task.c" \
    "$component_path/area512/mrblib/$ruby_task.rb"
done

make -j"$(nproc)" -f "$emulator_path/Makefile" \
  AREA512_SOURCE_PATH="$source_path" \
  AREA512_EMULATOR_PATH="$emulator_path" \
  AREA512_EMULATOR_OUTPUT_PATH="$output_path"
