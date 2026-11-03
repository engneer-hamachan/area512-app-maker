// The SD card is a directory in the Emscripten file system. The firmware
// restores the seed on its first boot and the card keeps it after that, so the
// first mount here restores the seed for the theme load that follows it.
#include "area512_hal.h"

#include <stdio.h>
#include <sys/stat.h>

#define SD_ROOT_PATH "/sdcard"
#define PROJECT_APPS_PATH "/project_apps"
#define CARD_APPS_PATH AREA512_ROOT_PATH "/home/apps"

static int s_mount_reference_count = 0;

int
area512_sd_mounted(void) {
  return s_mount_reference_count > 0 ? 1 : 0;
}

int
area512_sd_mount(const char *base_path) {
  (void)base_path;

  if (s_mount_reference_count == 0) {
    struct stat card_stat;

    if (stat(CARD_APPS_PATH, &card_stat) != 0) {
      if (!area512_ensure_directory(SD_ROOT_PATH))
        return -1;

      if (area512_seed_restore() != 0)
        return -2;

      // The page fetched the project's apps/ here before boot.
      if (rename(PROJECT_APPS_PATH, CARD_APPS_PATH) != 0)
        return -2;
    }
  }

  s_mount_reference_count++;

  return 0;
}

int
area512_sd_unmount(void) {
  if (s_mount_reference_count > 0)
    s_mount_reference_count--;

  return 0;
}
