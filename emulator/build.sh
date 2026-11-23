#!/bin/sh
# Builds the Area512 firmware sources for the browser.
#
# AREA512_SOURCE_PATH is a clone of area512 with its submodules. Nothing in it
# is edited by hand; emulator/port replaces only what needs the hardware.
#
# AREA512_BOARD picks the firmware: cardputer (the Cardputer ADV) or 2432s028
# (the ESP32-2432S028).
set -eu

emulator_path=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_path=${AREA512_SOURCE_PATH:?}
output_path=${AREA512_EMULATOR_OUTPUT_PATH:?}
board=${AREA512_BOARD:?}
picoruby_path="$source_path/R2P2-ESP32/components/picoruby-esp32/picoruby"
component_path="$source_path/components"
object_path="$output_path/objects"
picoruby_ti_database_generator_path="$component_path/area512/mrbgems/picoruby-ti/tidbgen/main.rb"

export AREA512_SOURCE_PATH="$source_path"
export AREA512_EMULATOR_PORT_PATH="$emulator_path/port"

mkdir -p "$object_path"

case "$board" in
cardputer)
  ruby "$picoruby_ti_database_generator_path" \
    --sig-dir "$component_path/area512/sig/picoruby" \
    --out "$component_path/area512/mrbgems/picoruby-ti/src/generated"
  ;;
2432s028)
  # The environment of components/area512/CMakeLists.txt for the 2432S028.
  # picoruby-area512-filer/mrbgem.rake reads AREA512_CYD to compile cyd/src.
  export AREA512_CYD=ON
  export AREA512_CYD_2432S028=ON
  export AREA512_CYD_TI_GENERATED_DIR="$output_path/cyd_ti_generated"

  # The gendb-cyd step of the firmware's Makefile, without its clang-format.
  ruby "$picoruby_ti_database_generator_path" \
    --sig-dir "$component_path/area512/sig/picoruby_cyd" \
    --out "$AREA512_CYD_TI_GENERATED_DIR/picoruby"
  python3 "$component_path/area512/mrbgems/micropython-ti/tidbgen/main.py" \
    --sig-dir "$component_path/area512/sig/micropython_cyd" \
    --out "$AREA512_CYD_TI_GENERATED_DIR/micropython"
  ;;
*)
  echo "unknown AREA512_BOARD: $board (cardputer or 2432s028)" >&2
  exit 1
  ;;
esac

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
  AREA512_BOARD="$board" \
  AREA512_SOURCE_PATH="$source_path" \
  AREA512_EMULATOR_PATH="$emulator_path" \
  AREA512_EMULATOR_OUTPUT_PATH="$output_path"
