#!/bin/sh
# Stages storage/ for the seed tar as components/area512_hal/CMakeLists.txt does:
# the theme's background images for the display, and the board's home folder.
#
#   seed.sh STORAGE_PATH builtin_display|tft HOME_PATH STAGING_PATH TAR_PATH
#
# builtin_display is the Cardputer's display and tft the 320x240 display.
set -eu

storage_path=$1
theme_background_kind=$2
home_path=$3
staging_path=$4
tar_path=$5

case "$theme_background_kind" in
builtin_display)
  default_background_image=/share/backgrounds/emblem.rgb565
  blue_background_image=/share/backgrounds/space.rgb565
  ;;
tft)
  default_background_image=/share/backgrounds/emblem_tft.rgb565
  blue_background_image=/share/backgrounds/space_tft.rgb565
  ;;
*)
  echo "unknown theme background kind: $theme_background_kind" >&2
  exit 1
  ;;
esac

rm -rf "$staging_path"
cp -R "$storage_path" "$staging_path"

for theme_file in etc/theme etc/theme_default.bak etc/theme_blue.bak; do
  sed -i \
    -e "s|@AREA512_THEME_DEFAULT_BACKGROUND_IMAGE@|$default_background_image|g" \
    -e "s|@AREA512_THEME_BLUE_BACKGROUND_IMAGE@|$blue_background_image|g" \
    "$staging_path/$theme_file"
done

rm -rf "$staging_path/home"
cp -R "$home_path" "$staging_path/home"

cd "$staging_path"
tar cf "$tar_path" --format=gnu -- *
