#!/bin/sh
# Stages storage/ for the seed tar with the theme values of the built-in display.
set -eu

storage_path=$1
staging_path=$2
tar_path=$3

rm -rf "$staging_path"
cp -R "$storage_path" "$staging_path"

for theme_file in etc/theme etc/theme_default.bak etc/theme_blue.bak; do
  sed -i \
    -e 's|@AREA512_THEME_DEFAULT_BACKGROUND_IMAGE@|/share/backgrounds/emblem.rgb565|g' \
    -e 's|@AREA512_THEME_BLUE_BACKGROUND_IMAGE@|/share/backgrounds/space.rgb565|g' \
    "$staging_path/$theme_file"
done

cd "$staging_path"
tar cf "$tar_path" --format=gnu -- *
